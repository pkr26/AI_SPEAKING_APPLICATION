import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMutationLaneManifest, codeMutationLaneNames, codeMutationLanes } from './mutation-lanes.mjs';
import { mergeMutationReports } from './merge-mutation-reports.mjs';
import { acquireMutationCampaignLock } from './mutation-campaign-lock.mjs';
import { mutationTerminationIsUnsafe, MutationChildSignaledError, runMutationProcess } from './mutation-process.mjs';
import {
  assertMutationExecutionIdentityUnchanged,
  createMutationExecutionIdentity,
  createMutationReportProvenance,
  writeMutationReportProvenance,
} from './mutation-provenance.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');

async function runStrykerLane({ laneName, reportDir, serverDir, environment }) {
  const strykerEntrypoint = path.join(serverDir, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
  return runMutationProcess(process.execPath, [strykerEntrypoint, 'run', 'stryker.config.mjs'], {
    cwd: serverDir,
    env: {
      ...environment,
      MUTATION_LANE: laneName,
      MUTATION_REPORT_DIR: reportDir,
    },
  });
}

async function removeExpectedReports(reportDir) {
  await fs.mkdir(reportDir, { recursive: true });
  const fileNames = [
    ...codeMutationLaneNames.flatMap((laneName) => [
      `${laneName}.json`,
      `${laneName}.html`,
      `${laneName}.provenance.json`,
    ]),
    'code.json',
    'code.html',
    'code-summary.json',
  ];
  await Promise.all(fileNames.map((fileName) => fs.rm(path.join(reportDir, fileName), { force: true })));
}

/**
 * Execute every disjoint code lane even when an earlier lane is below its
 * mutation threshold. The final status stays nonzero, and strict report
 * merging prevents a stale or missing lane from looking complete.
 */
export async function runMutationCode({
  serverDir = defaultServerDirectory,
  reportDir = process.env.MUTATION_REPORT_DIR || path.join(defaultServerDirectory, 'reports', 'mutation', 'code'),
  environment = process.env,
  laneNames = codeMutationLaneNames,
  validateManifest = assertMutationLaneManifest,
  runLane = runStrykerLane,
  mergeReports = mergeMutationReports,
  runtime,
  stableInputFiles,
} = {}) {
  if (!Array.isArray(laneNames) || laneNames.length === 0) {
    throw new Error('Mutation campaign must request at least one configured lane');
  }
  const repeatedLaneNames = laneNames.filter((laneName, index) => laneNames.indexOf(laneName) !== index);
  if (repeatedLaneNames.length) {
    throw new Error(`Mutation lanes requested more than once: ${[...new Set(repeatedLaneNames)].join(', ')}`);
  }
  for (const laneName of laneNames) {
    if (!Object.hasOwn(codeMutationLanes, laneName)) throw new Error(`Unknown mutation lane requested: ${laneName}`);
  }
  await validateManifest({ serverDir });

  const releaseCampaignLock = await acquireMutationCampaignLock({
    serverDir,
    reportDir,
    campaign: `code lanes: ${laneNames.join(', ')}`,
  });
  let preserveCampaignLock = false;
  try {
    // Always remove every lane artifact. A programmatic subset run must never
    // merge retained reports from lanes it did not execute in this campaign.
    await removeExpectedReports(reportDir);

    const failedLanes = [];
    for (const laneName of laneNames) {
      console.log(`\n=== Backend mutation lane: ${laneName} ===`);
      let exitCode;
      try {
        const executionBefore = await createMutationExecutionIdentity({
          serverDir,
          environment,
          ...(runtime === undefined ? {} : { runtime }),
          ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
        });
        exitCode = await runLane({ laneName, reportDir, serverDir, environment });
        if (mutationTerminationIsUnsafe(exitCode)) {
          preserveCampaignLock = true;
        } else {
          const executionAfter = await assertMutationExecutionIdentityUnchanged({
            expected: executionBefore,
            serverDir,
            environment,
            ...(runtime === undefined ? {} : { runtime }),
            ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
          });
          const provenance = await createMutationReportProvenance({
            campaign: 'code',
            laneName,
            reportPath: path.join(reportDir, `${laneName}.json`),
            executionIdentity: executionAfter,
          });
          await writeMutationReportProvenance({ reportDir, provenance });
        }
      } catch (error) {
        console.error(`Mutation lane ${laneName} could not complete`, error);
        if (error instanceof MutationChildSignaledError) {
          preserveCampaignLock = true;
          exitCode = error.exitCode;
        } else {
          exitCode = 1;
        }
      }
      if (exitCode !== 0) {
        failedLanes.push({ laneName, exitCode });
        console.error(
          `Mutation lane ${laneName} exited with status ${exitCode}; ` +
            (preserveCampaignLock ? 'the campaign is stopping.' : 'continuing with the remaining lanes.'),
        );
      }
      if (preserveCampaignLock) {
        console.error(
          `Mutation lane ${laneName} ended unsafely; preserving the workspace lock and stopping before another lane starts.`,
        );
        break;
      }
    }

    let mergeError;
    let strictGateError;
    if (preserveCampaignLock) {
      mergeError = new Error('Backend mutation merge skipped after an unsafe child termination');
    } else {
      try {
        const merged = await mergeReports({
          reportDir,
          serverDir,
          environment,
          ...(runtime === undefined ? {} : { runtime }),
          ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
        });
        if (merged.summary.strictMutationGatePassed !== true) {
          const unresolved = Object.entries(merged.summary.statusCounts)
            .filter(([status, count]) => !['Killed', 'Timeout', 'Ignored'].includes(status) && count > 0)
            .map(([status, count]) => `${status}=${count}`)
            .join(', ');
          strictGateError = new Error(`Backend mutation strict gate failed: ${unresolved || 'invalid summary'}`);
          console.error(strictGateError.message);
        }
      } catch (error) {
        mergeError = error;
        console.error('Mutation lane reports could not be consolidated', error);
      }
    }

    if (failedLanes.length) {
      console.error(
        `Backend mutation lanes with nonzero status: ${failedLanes
          .map(({ laneName, exitCode }) => `${laneName} (${exitCode})`)
          .join(', ')}`,
      );
    }

    return {
      exitCode: failedLanes.length || mergeError || strictGateError ? 1 : 0,
      failedLanes,
      mergeError,
      strictGateError,
    };
  } finally {
    await releaseCampaignLock({ preserve: preserveCampaignLock });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runMutationCode();
  process.exitCode = result.exitCode;
}
