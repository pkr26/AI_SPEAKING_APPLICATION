import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { assertMutationLaneManifest, mutationLaneNames, mutationLanes } from './mutation-lanes.mjs';
import { mergeMutationReports, unresolvedStatusSummary } from './merge-mutation-reports.mjs';
import {
  createMutationLaneProvenance,
  writeMutationLaneProvenance,
} from './mutation-provenance.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');
export const mutationCampaignLockFileName = '.mutation-campaign.lock';

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
}

async function runStrykerLane({ laneName, reportDir, appDir, environment }) {
  const strykerEntrypoint = path.join(
    appDir,
    'node_modules',
    '@stryker-mutator',
    'core',
    'bin',
    'stryker.js',
  );
  return runProcess(process.execPath, [strykerEntrypoint, 'run', 'stryker.lane.config.mjs'], {
    cwd: appDir,
    env: { ...environment, MUTATION_LANE: laneName, MUTATION_REPORT_DIR: reportDir },
  });
}

async function removeExpectedReports(reportDir, laneNames) {
  await fs.mkdir(reportDir, { recursive: true });
  const fileNames = [
    ...laneNames.flatMap((laneName) => [
      `${laneName}.json`,
      `${laneName}.html`,
      `${laneName}.provenance.json`,
    ]),
    'app.json',
    'app.html',
    'app-summary.json',
  ];
  await Promise.all(
    fileNames.map((fileName) => fs.rm(path.join(reportDir, fileName), { force: true })),
  );
}

async function readMutationCampaignLock(lockPath) {
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw error;
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no campaign is active before removing it manually`,
    );
  }
  if (
    owner === null ||
    typeof owner !== 'object' ||
    !Number.isInteger(owner.pid) ||
    owner.pid < 1 ||
    typeof owner.token !== 'string' ||
    owner.token.length === 0
  ) {
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no campaign is active before removing it manually`,
    );
  }
  return owner;
}

async function acquireMutationCampaignLock(appDir, reportDir, laneNames) {
  const lockPath = path.join(appDir, mutationCampaignLockFileName);
  const token = randomUUID();
  let handle;
  try {
    handle = await fs.open(lockPath, 'wx');
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const owner = await readMutationCampaignLock(lockPath);
    throw new Error(
      `Another mutation campaign (pid ${owner.pid}, report directory ${owner.reportDir ?? 'unknown'}) ` +
        `already owns ${lockPath}. Verify that neither its parent nor any Stryker child is alive ` +
        'before removing the lock manually.',
    );
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({
        pid: process.pid,
        token,
        startedAt: new Date().toISOString(),
        reportDir: path.resolve(reportDir),
        laneNames,
      })}\n`,
      'utf8',
    );
  } catch (error) {
    await handle.close();
    await fs.rm(lockPath, { force: true });
    throw error;
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await handle.close();
    let owner;
    try {
      owner = await readMutationCampaignLock(lockPath);
    } catch {
      return;
    }
    if (owner.token === token) await fs.rm(lockPath, { force: true });
  };
}

function parsePositiveInteger(value, label, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer (received ${JSON.stringify(value)})`);
  }
  return parsed;
}

/**
 * Run every lane, even when an earlier one is below its threshold: a partial
 * campaign that stops at the first failure hides the rest of the survivors.
 * The exit status still fails, and strict merging refuses to treat a missing
 * or stale lane report as a complete run.
 */
export async function runMutation({
  appDir = defaultAppDirectory,
  reportDir = process.env.MUTATION_REPORT_DIR ||
    path.join(defaultAppDirectory, 'reports', 'mutation'),
  environment = process.env,
  laneNames = mutationLaneNames,
  parallelLanes,
  merge = true,
  validateManifest = assertMutationLaneManifest,
  runLane = runStrykerLane,
  mergeReports = mergeMutationReports,
} = {}) {
  const effectiveParallelLanes = parsePositiveInteger(
    parallelLanes === undefined ? environment.MUTATION_PARALLEL_LANES : parallelLanes,
    'MUTATION_PARALLEL_LANES',
    1,
  );
  const effectiveEnvironment = {
    ...environment,
    MUTATION_PARALLEL_LANES: String(effectiveParallelLanes),
  };
  await validateManifest({ appDir });
  const repeatedLaneNames = laneNames.filter(
    (laneName, index) => laneNames.indexOf(laneName) !== index,
  );
  if (repeatedLaneNames.length) {
    throw new Error(
      `Mutation lanes requested more than once: ${[...new Set(repeatedLaneNames)].join(', ')}`,
    );
  }
  for (const laneName of laneNames) {
    if (!Object.hasOwn(mutationLanes, laneName)) {
      throw new Error(`Unknown mutation lane requested: ${laneName}`);
    }
  }
  const releaseCampaignLock = await acquireMutationCampaignLock(appDir, reportDir, laneNames);
  try {
    await removeExpectedReports(reportDir, laneNames);

    const startedAt = Date.now();
    const failedLanes = [];
    const queue = [...laneNames];
    const workerCount = Math.min(effectiveParallelLanes, queue.length || 1);

    async function worker() {
      for (let laneName = queue.shift(); laneName !== undefined; laneName = queue.shift()) {
        console.log(`\n=== App mutation lane: ${laneName} ===`);
        let exitCode;
        try {
          const provenanceBefore = await createMutationLaneProvenance({
            appDir,
            laneName,
            lane: mutationLanes[laneName],
            environment: effectiveEnvironment,
          });
          exitCode = await runLane({
            laneName,
            reportDir,
            appDir,
            environment: effectiveEnvironment,
          });
          if (exitCode === 0) {
            const provenanceAfter = await createMutationLaneProvenance({
              appDir,
              laneName,
              lane: mutationLanes[laneName],
              environment: effectiveEnvironment,
            });
            if (provenanceBefore.fingerprint !== provenanceAfter.fingerprint) {
              throw new Error(
                `Mutation inputs for lane ${laneName} changed while Stryker was running; rerun the lane`,
              );
            }
            await fs.access(path.join(reportDir, `${laneName}.json`));
            await writeMutationLaneProvenance({ reportDir, provenance: provenanceAfter });
          }
        } catch (error) {
          console.error(`Mutation lane ${laneName} could not complete`, error);
          exitCode = 1;
        }
        if (exitCode !== 0) {
          failedLanes.push({ laneName, exitCode });
          console.error(
            `Mutation lane ${laneName} exited with status ${exitCode}; continuing with the remaining lanes.`,
          );
        }
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    let mergeError;
    let strictGateError;
    let summary;
    if (merge) {
      try {
        const merged = await mergeReports({ reportDir, environment: effectiveEnvironment });
        summary = merged.summary;
        if (summary.strictMutationGatePassed !== true) {
          strictGateError = new Error(
            `App mutation strict gate failed: ${unresolvedStatusSummary(summary.statusCounts) || 'invalid summary'}`,
          );
          console.error(strictGateError.message);
        }
      } catch (error) {
        mergeError = error;
        console.error('Mutation lane reports could not be consolidated', error);
      }
    } else {
      console.log(
        '\nSkipping the merge: run `node scripts/merge-mutation-reports.mjs` once every lane has reported.',
      );
    }

    if (failedLanes.length) {
      console.error(
        `App mutation lanes with nonzero status: ${failedLanes
          .map(({ laneName, exitCode }) => `${laneName} (${exitCode})`)
          .join(', ')}`,
      );
    }
    if (summary) {
      const minutes = ((Date.now() - startedAt) / 60_000).toFixed(1);
      console.log(
        `\nApp mutation campaign: ${summary.mutantCount} mutants across ${summary.laneCount} lanes in ${minutes} min ` +
          `(${summary.mutationScore === null ? 'n/a' : `${summary.mutationScore.toFixed(2)}%`}, ` +
          `${summary.staticMutants} static).`,
      );
    }

    return {
      exitCode: failedLanes.length || mergeError || strictGateError ? 1 : 0,
      failedLanes,
      mergeError,
      strictGateError,
      summary,
    };
  } finally {
    await releaseCampaignLock();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const commandLineArguments = process.argv.slice(2);
  const unknownFlags = commandLineArguments.filter(
    (argument) => argument.startsWith('--') && argument !== '--no-merge',
  );
  if (unknownFlags.length) throw new Error(`Unknown argument(s): ${unknownFlags.join(', ')}`);
  const requestedLanes = commandLineArguments.filter((argument) => !argument.startsWith('--'));
  const result = await runMutation({
    ...(requestedLanes.length ? { laneNames: requestedLanes } : {}),
    merge: !commandLineArguments.includes('--no-merge'),
  });
  process.exitCode = result.exitCode;
}
