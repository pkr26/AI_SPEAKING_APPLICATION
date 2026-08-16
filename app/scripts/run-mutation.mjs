import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { assertMutationLaneManifest, mutationLaneNames, mutationLanes } from './mutation-lanes.mjs';
import { mergeMutationReports, unresolvedStatusSummary } from './merge-mutation-reports.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');

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
    ...laneNames.flatMap((laneName) => [`${laneName}.json`, `${laneName}.html`]),
    'app.json',
    'app.html',
    'app-summary.json',
  ];
  await Promise.all(
    fileNames.map((fileName) => fs.rm(path.join(reportDir, fileName), { force: true })),
  );
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
  parallelLanes = parsePositiveInteger(
    process.env.MUTATION_PARALLEL_LANES,
    'MUTATION_PARALLEL_LANES',
    1,
  ),
  merge = true,
  validateManifest = assertMutationLaneManifest,
  runLane = runStrykerLane,
  mergeReports = mergeMutationReports,
} = {}) {
  await validateManifest({ appDir });
  for (const laneName of laneNames) {
    if (!mutationLanes[laneName]) throw new Error(`Unknown mutation lane requested: ${laneName}`);
  }
  await removeExpectedReports(reportDir, laneNames);

  const startedAt = Date.now();
  const failedLanes = [];
  const queue = [...laneNames];
  const workerCount = Math.min(parallelLanes, queue.length || 1);

  async function worker() {
    for (let laneName = queue.shift(); laneName !== undefined; laneName = queue.shift()) {
      console.log(`\n=== App mutation lane: ${laneName} ===`);
      let exitCode;
      try {
        exitCode = await runLane({ laneName, reportDir, appDir, environment });
      } catch (error) {
        console.error(`Mutation lane ${laneName} could not start`, error);
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
      const merged = await mergeReports({ reportDir });
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
