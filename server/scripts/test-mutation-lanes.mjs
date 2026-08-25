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
  assert.equal(codeMutationLaneNames.length, 21);
  assert.equal(expectedCodeMutationFiles.length, 31);
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

async function writeOrchestratorReport(reportDir, laneName) {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(
    path.join(reportDir, `${laneName}.json`),
    JSON.stringify({
      config: {
        testRunner: 'vitest',
        coverageAnalysis: 'perTest',
        timeoutMS: 90_000,
        mutate: codeMutationLanes[laneName].mutate,
        testFiles: codeMutationLanes[laneName].testFiles,
        tempDirName: `.stryker-${laneName}-tmp`,
      },
    }),
  );
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
      await writeOrchestratorReport(reportDir, laneName);
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

test('the orchestrator rejects duplicate lane requests before locking, running, or merging', async (context) => {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-invalid-'));
  const reportDir = path.join(serverDir, 'reports');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  const events = [];

  await assert.rejects(
    runMutationCode({
      serverDir,
      reportDir,
      laneNames: ['config', 'db', 'config', 'db'],
      validateManifest: async () => events.push('validated'),
      runLane: async () => {
        events.push('ran');
        return 0;
      },
      mergeReports: async () => {
        events.push('merged');
        return { summary: { strictMutationGatePassed: true, statusCounts: {} } };
      },
    }),
    /Mutation lanes requested more than once: config, db/,
  );

  assert.deepEqual(events, []);
  await assert.rejects(fs.stat(path.join(serverDir, '.mutation-campaign.lock')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(reportDir), { code: 'ENOENT' });
});

test('the orchestrator rejects unknown and inherited lane names before workspace mutation', async (context) => {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-invalid-'));
  const reportDir = path.join(serverDir, 'reports');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  let validations = 0;

  for (const laneName of ['notALane', 'constructor']) {
    let ran = false;
    await assert.rejects(
      runMutationCode({
        serverDir,
        reportDir,
        laneNames: [laneName],
        validateManifest: async () => {
          validations += 1;
        },
        runLane: async () => {
          ran = true;
          return 0;
        },
        mergeReports: async () => ({ summary: { strictMutationGatePassed: true, statusCounts: {} } }),
      }),
      new RegExp(`Unknown mutation lane requested: ${laneName}`),
    );
    assert.equal(ran, false);
  }

  assert.equal(validations, 0);
  await assert.rejects(fs.stat(path.join(serverDir, '.mutation-campaign.lock')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(reportDir), { code: 'ENOENT' });
});

test('the orchestrator rejects an empty lane campaign before validation or workspace mutation', async (context) => {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-invalid-'));
  const reportDir = path.join(serverDir, 'reports');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  let validated = false;

  await assert.rejects(
    runMutationCode({
      serverDir,
      reportDir,
      laneNames: [],
      validateManifest: async () => {
        validated = true;
      },
    }),
    /must request at least one configured lane/,
  );

  assert.equal(validated, false);
  await assert.rejects(fs.stat(path.join(serverDir, '.mutation-campaign.lock')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(reportDir), { code: 'ENOENT' });
});

test('the orchestrator rejects unresolved or invalid mutant statuses after writing merged artifacts', async (context) => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-'));
  context.after(() => fs.rm(reportDir, { recursive: true, force: true }));

  const result = await runMutationCode({
    serverDir: serverDirectory,
    reportDir,
    laneNames: ['config'],
    validateManifest: async () => undefined,
    runLane: async ({ laneName }) => {
      await writeOrchestratorReport(reportDir, laneName);
      return 0;
    },
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
    runLane: async ({ laneName }) => {
      await writeOrchestratorReport(reportDir, laneName);
      return 0;
    },
    mergeReports: async () => {
      throw failure;
    },
  });

  assert.deepEqual(result.failedLanes, []);
  assert.equal(result.mergeError, failure);
  assert.equal(result.strictGateError, undefined);
  assert.equal(result.exitCode, 1);
});

test('a subset run deletes every unrequested lane report before it can be reused', async (context) => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-subset-'));
  context.after(() => fs.rm(reportDir, { recursive: true, force: true }));
  await fs.writeFile(path.join(reportDir, 'db.json'), 'stale db report');
  await fs.writeFile(path.join(reportDir, 'db.provenance.json'), 'stale db provenance');

  const result = await runMutationCode({
    serverDir: serverDirectory,
    reportDir,
    laneNames: ['config'],
    validateManifest: async () => undefined,
    runLane: async ({ laneName }) => {
      await writeOrchestratorReport(reportDir, laneName);
      return 0;
    },
    mergeReports: async () => {
      await assert.rejects(fs.stat(path.join(reportDir, 'db.json')), { code: 'ENOENT' });
      await assert.rejects(fs.stat(path.join(reportDir, 'db.provenance.json')), { code: 'ENOENT' });
      return { summary: { strictMutationGatePassed: true, statusCounts: {} } };
    },
  });

  assert.equal(result.exitCode, 0);
});

test('a signaled code lane stops the campaign and deliberately preserves the workspace lock', async (context) => {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-orchestrator-signaled-'));
  const reportDir = path.join(serverDir, 'reports');
  const inputFile = 'campaign-input.txt';
  await fs.writeFile(path.join(serverDir, inputFile), 'stable input');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  const started = [];

  const result = await runMutationCode({
    serverDir,
    reportDir,
    laneNames: ['config', 'db'],
    stableInputFiles: [inputFile],
    validateManifest: async () => undefined,
    runLane: async ({ laneName }) => {
      started.push(laneName);
      return 143;
    },
    mergeReports: async () => {
      throw new Error('merge must not succeed after a signal');
    },
  });

  assert.deepEqual(started, ['config']);
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.failedLanes, [{ laneName: 'config', exitCode: 143 }]);
  const lockPath = path.join(serverDir, '.mutation-campaign.lock');
  await assert.doesNotReject(fs.stat(lockPath));
  const owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  assert.match(owner.campaign, /code lanes/);
});
