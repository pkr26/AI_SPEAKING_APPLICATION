import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertMutationLaneManifest,
  codeMutationLaneNames,
  codeMutationLanes,
  expectedCodeMutationFiles,
  intentionallyUnassignedTestFiles,
} from './mutation-lanes.mjs';
import { runMutationCode } from './run-mutation-code.mjs';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the checked-in manifest exactly partitions every executable backend TypeScript file', async () => {
  await assert.doesNotReject(assertMutationLaneManifest({ serverDir: serverDirectory }));
  assert.equal(codeMutationLaneNames.length, 19);
  assert.equal(expectedCodeMutationFiles.length, 27);
  assert.equal(new Set(expectedCodeMutationFiles).size, expectedCodeMutationFiles.length);
});

async function writeManifestFixture() {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-lanes-'));
  const laneTestFiles = new Set(Object.values(codeMutationLanes).flatMap(({ testFiles }) => testFiles));
  const allFiles = [...expectedCodeMutationFiles, ...laneTestFiles, ...Object.keys(intentionallyUnassignedTestFiles)];
  for (const fileName of allFiles) {
    const target = path.join(fixture, fileName);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, 'export {};\n');
  }
  return fixture;
}

test('manifest validation rejects a newly added unassigned production file', async (context) => {
  const fixture = await writeManifestFixture();
  context.after(() => fs.rm(fixture, { recursive: true, force: true }));

  await assert.doesNotReject(assertMutationLaneManifest({ serverDir: fixture }));
  await fs.writeFile(path.join(fixture, 'src', 'unassigned.ts'), 'export const unassigned = true;\n');
  await assert.rejects(assertMutationLaneManifest({ serverDir: fixture }), /Missing assignments: src\/unassigned\.ts/);
});

test('manifest validation accounts for every on-disk test file, exclusions included', async (context) => {
  const fixture = await writeManifestFixture();
  context.after(() => fs.rm(fixture, { recursive: true, force: true }));

  // A new test file that is in no lane and not documented must be rejected.
  await fs.writeFile(path.join(fixture, 'tests', 'orphan.test.ts'), 'export {};\n');
  await assert.rejects(
    assertMutationLaneManifest({ serverDir: fixture }),
    /not documented as intentionally unassigned: tests\/orphan\.test\.ts/,
  );
  await fs.rm(path.join(fixture, 'tests', 'orphan.test.ts'));

  // Every documented exclusion must still exist on disk.
  const [firstExclusion] = Object.keys(intentionallyUnassignedTestFiles);
  await fs.rm(path.join(fixture, firstExclusion));
  await assert.rejects(
    assertMutationLaneManifest({ serverDir: fixture }),
    new RegExp(`missing on disk: ${firstExclusion.replace(/[.\\/]/g, '\\$&')}`),
  );
  await fs.writeFile(path.join(fixture, firstExclusion), 'export {};\n');

  // An exclusion that is also assigned to a lane is a contradiction.
  const [assignedTestFile] = codeMutationLanes.config.testFiles;
  await assert.rejects(
    assertMutationLaneManifest({
      serverDir: fixture,
      unassignedTestFiles: { ...intentionallyUnassignedTestFiles, [assignedTestFile]: 'contradiction' },
    }),
    new RegExp(
      `both assigned to a lane and marked intentionally unassigned: ${assignedTestFile.replace(/[.\\/]/g, '\\$&')}`,
    ),
  );

  // Exclusions without a documented reason are rejected outright.
  await assert.rejects(
    assertMutationLaneManifest({
      serverDir: fixture,
      unassignedTestFiles: { ...intentionallyUnassignedTestFiles, 'tests/why.test.ts': '   ' },
    }),
    /must document a reason: tests\/why\.test\.ts/,
  );
});

test('the orchestrator continues after a lane failure, merges last, and returns nonzero', async (context) => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-'));
  context.after(() => fs.rm(reportDir, { recursive: true, force: true }));
  const events = [];

  const result = await runMutationCode({
    serverDir: serverDirectory,
    reportDir,
    laneNames: ['config', 'db', 'logger'],
    validateManifest: async () => events.push('validated'),
    runLane: async ({ laneName }) => {
      events.push(laneName);
      return laneName === 'db' ? 7 : 0;
    },
    mergeReports: async () => {
      events.push('merged');
      return { summary: { strictMutationGatePassed: true, statusCounts: {} } };
    },
  });

  assert.deepEqual(events, ['validated', 'config', 'db', 'logger', 'merged']);
  assert.deepEqual(result.failedLanes, [{ laneName: 'db', exitCode: 7 }]);
  assert.equal(result.mergeError, undefined);
  assert.equal(result.strictGateError, undefined);
  assert.equal(result.exitCode, 1);
});

test('the orchestrator rejects unresolved or invalid mutant statuses after writing merged artifacts', async (context) => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-'));
  context.after(() => fs.rm(reportDir, { recursive: true, force: true }));

  const result = await runMutationCode({
    serverDir: serverDirectory,
    reportDir,
    laneNames: ['config'],
    validateManifest: async () => undefined,
    runLane: async () => 0,
    mergeReports: async () => ({
      summary: {
        strictMutationGatePassed: false,
        statusCounts: { Killed: 9, RuntimeError: 1 },
      },
    }),
  });

  assert.deepEqual(result.failedLanes, []);
  assert.equal(result.mergeError, undefined);
  assert.match(result.strictGateError?.message ?? '', /RuntimeError=1/);
  assert.equal(result.exitCode, 1);
});

test('the orchestrator reports a strict merge failure even when all lanes pass', async (context) => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-'));
  context.after(() => fs.rm(reportDir, { recursive: true, force: true }));
  const failure = new Error('missing lane report');

  const result = await runMutationCode({
    serverDir: serverDirectory,
    reportDir,
    laneNames: ['config'],
    validateManifest: async () => undefined,
    runLane: async () => 0,
    mergeReports: async () => {
      throw failure;
    },
  });

  assert.deepEqual(result.failedLanes, []);
  assert.equal(result.mergeError, failure);
  assert.equal(result.strictGateError, undefined);
  assert.equal(result.exitCode, 1);
});
