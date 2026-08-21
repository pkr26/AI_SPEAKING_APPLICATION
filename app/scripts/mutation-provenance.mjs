import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { expectedMutationFiles } from './mutation-lanes.mjs';

const mutationProvenanceSchemaVersion = 1;

/**
 * Execution inputs shared by every lane. Every production source is included
 * because a lane can execute imported code owned by another lane; changing any
 * one of them therefore invalidates the whole incremental campaign. An
 * owning-test change remains lane-local. The reviewed-equivalence registry is
 * post-run policy and is fingerprinted in app-summary.json instead.
 */
export const mutationSharedInputFiles = Object.freeze([
  // jest-expo reads app.json, so config-plugin changes must stale retained
  // lane reports just like source or toolchain changes.
  'app.json',
  'package.json',
  'package-lock.json',
  'stryker.lane.config.mjs',
  // The Recorder pass runner imports this module's workspace validator and
  // HTML renderer while publishing its canonical lane artifacts, including
  // the merge-policy helper that module loads transitively.
  'scripts/merge-mutation-reports.mjs',
  'scripts/merge-recorder-mutation-passes.mjs',
  'scripts/mutation-merge-policy.mjs',
  'scripts/mutation-lanes.mjs',
  'scripts/mutation-provenance.mjs',
  'scripts/recorder-killed-incremental-seed.mjs',
  'scripts/recorder-mutation-plan.mjs',
  'scripts/run-recorder-mutation-passes.mjs',
  'scripts/run-mutation.mjs',
  ...expectedMutationFiles,
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalEnvironment(environment) {
  const value = (name) => {
    const candidate = environment[name];
    return candidate === undefined ? null : String(candidate);
  };
  return {
    CI: value('CI'),
    EXPO_PUBLIC_API_URL: value('EXPO_PUBLIC_API_URL'),
    LANG: value('LANG'),
    LC_ALL: value('LC_ALL'),
    MUTATION_CONCURRENCY: value('MUTATION_CONCURRENCY') || '2',
    MUTATION_PARALLEL_LANES: value('MUTATION_PARALLEL_LANES') || '1',
    MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL:
      value('MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL') || 'true',
    MUTATION_RECORDER_PARALLEL_PASSES: value('MUTATION_RECORDER_PARALLEL_PASSES') || '4',
    MUTATION_RECORDER_TOTAL_WORKERS:
      value('MUTATION_RECORDER_TOTAL_WORKERS') || value('MUTATION_CONCURRENCY') || '2',
    NODE_ENV: value('NODE_ENV'),
    NODE_OPTIONS: value('NODE_OPTIONS'),
    TZ: value('TZ'),
  };
}

async function fingerprintFiles(appDir, relativeFileNames, seed) {
  const hash = createHash('sha256');
  hash.update(`${JSON.stringify(seed)}\n`);
  for (const relativeFileName of [...new Set(relativeFileNames)].toSorted()) {
    const contents = await fs.readFile(path.join(appDir, relativeFileName));
    hash.update(`${relativeFileName}\0${contents.byteLength}\0`);
    hash.update(contents);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Build a deterministic, secret-free provenance record for one lane. */
export async function createMutationLaneProvenance({
  appDir,
  laneName,
  lane,
  environment = process.env,
  runtime = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
}) {
  if (typeof appDir !== 'string' || appDir.length === 0) {
    throw new Error('appDir must be a non-empty string');
  }
  if (typeof laneName !== 'string' || laneName.length === 0) {
    throw new Error('laneName must be a non-empty string');
  }
  if (!lane || !Array.isArray(lane.mutate) || !Array.isArray(lane.testFiles)) {
    throw new Error(`Mutation lane ${laneName} has an invalid definition`);
  }

  const execution = {
    environment: canonicalEnvironment(environment),
    runtime,
  };
  const sharedFingerprint = await fingerprintFiles(appDir, mutationSharedInputFiles, execution);
  const laneFingerprint = await fingerprintFiles(appDir, [...lane.mutate, ...lane.testFiles], {
    laneName,
    mutate: [...lane.mutate],
    testFiles: [...lane.testFiles],
    sharedFingerprint,
  });

  return {
    schemaVersion: mutationProvenanceSchemaVersion,
    laneName,
    sharedFingerprint,
    laneFingerprint,
    fingerprint: sha256(`${sharedFingerprint}:${laneFingerprint}`),
  };
}

export function mutationLaneProvenancePath(reportDir, laneName) {
  return path.join(reportDir, `${laneName}.provenance.json`);
}

export async function writeMutationLaneProvenance({ reportDir, provenance }) {
  await fs.mkdir(reportDir, { recursive: true });
  const filePath = mutationLaneProvenancePath(reportDir, provenance.laneName);
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  return filePath;
}

function assertProvenanceShape(provenance, laneName, filePath) {
  if (
    provenance === null ||
    typeof provenance !== 'object' ||
    Array.isArray(provenance) ||
    provenance.schemaVersion !== mutationProvenanceSchemaVersion ||
    provenance.laneName !== laneName ||
    typeof provenance.sharedFingerprint !== 'string' ||
    typeof provenance.laneFingerprint !== 'string' ||
    typeof provenance.fingerprint !== 'string'
  ) {
    throw new Error(`Mutation provenance for lane ${laneName} at ${filePath} is invalid`);
  }
}

/**
 * Require every retained lane to have been run with the current toolchain,
 * runtime, environment, source, and owning tests.
 */
export async function assertMutationLaneProvenance({
  reportDir,
  appDir,
  lanes,
  laneNames,
  environment = process.env,
  runtime,
}) {
  for (const laneName of laneNames) {
    const filePath = mutationLaneProvenancePath(reportDir, laneName);
    let recorded;
    try {
      recorded = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `Mutation provenance for lane ${laneName} is missing; rerun that lane before merging`,
        );
      }
      if (error instanceof SyntaxError) {
        throw new Error(
          `Mutation provenance for lane ${laneName} at ${filePath} is not valid JSON`,
        );
      }
      throw error;
    }
    assertProvenanceShape(recorded, laneName, filePath);
    const expected = await createMutationLaneProvenance({
      appDir,
      laneName,
      lane: lanes[laneName],
      environment,
      ...(runtime === undefined ? {} : { runtime }),
    });
    if (recorded.fingerprint !== expected.fingerprint) {
      const scope =
        recorded.sharedFingerprint === expected.sharedFingerprint
          ? 'its lane inputs changed'
          : 'a production source, the mutation toolchain, runtime, or environment changed';
      throw new Error(
        `Mutation provenance for lane ${laneName} is stale (${scope}); rerun that lane before merging`,
      );
    }
  }
}
