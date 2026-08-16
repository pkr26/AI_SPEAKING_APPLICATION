import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertMutationLaneManifest, codeMutationLaneNames, codeMutationLanes } from './mutation-lanes.mjs';
import { mergeMutationReports } from './merge-mutation-reports.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      resolve(code ?? (signal ? 128 : 1));
    });
  });
}

async function runStrykerLane({ laneName, reportDir, serverDir, environment }) {
  const strykerEntrypoint = path.join(serverDir, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
  return runProcess(process.execPath, [strykerEntrypoint, 'run', 'stryker.config.mjs'], {
    cwd: serverDir,
    env: {
      ...environment,
      MUTATION_LANE: laneName,
      MUTATION_REPORT_DIR: reportDir,
    },
  });
}

async function removeExpectedReports(reportDir, laneNames) {
  await fs.mkdir(reportDir, { recursive: true });
  const fileNames = [
    ...laneNames.flatMap((laneName) => [`${laneName}.json`, `${laneName}.html`]),
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
} = {}) {
  await validateManifest({ serverDir });
  await removeExpectedReports(reportDir, laneNames);

  const failedLanes = [];
  for (const laneName of laneNames) {
    if (!codeMutationLanes[laneName]) throw new Error(`Unknown mutation lane requested: ${laneName}`);
    console.log(`\n=== Backend mutation lane: ${laneName} ===`);
    let exitCode;
    try {
      exitCode = await runLane({ laneName, reportDir, serverDir, environment });
    } catch (error) {
      console.error(`Mutation lane ${laneName} could not start`, error);
      exitCode = 1;
    }
    if (exitCode !== 0) {
      failedLanes.push({ laneName, exitCode });
      console.error(`Mutation lane ${laneName} exited with status ${exitCode}; continuing with the remaining lanes.`);
    }
  }

  let mergeError;
  let strictGateError;
  try {
    const merged = await mergeReports({ reportDir });
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runMutationCode();
  process.exitCode = result.exitCode;
}
