import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertMutationLaneManifest,
  expectedMutationFiles,
  intentionallyUnassignedTestFiles,
  mutationLaneNames,
  mutationLanes,
} from './mutation-lanes.mjs';
import {
  assertMutationLaneProvenance,
  mutationLaneProvenancePath,
  mutationSharedInputFiles,
} from './mutation-provenance.mjs';
import { mutationCampaignLockFileName, runMutation } from './run-mutation.mjs';

/** Build a throwaway app tree with the given source and test file names. */
async function fixtureAppDir(sourceFiles, testFiles) {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-mutation-lanes-'));
  for (const relativeName of [...sourceFiles, ...testFiles]) {
    const absolute = path.join(appDir, relativeName);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, '');
  }
  await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(appDir, '__tests__'), { recursive: true });
  return appDir;
}

function lanes(definition) {
  return Object.fromEntries(
    Object.entries(definition).map(([name, [mutate, testFiles]]) => [name, { mutate, testFiles }]),
  );
}

async function expectManifestProblem(options, expectedFragment) {
  await assert.rejects(
    () => assertMutationLaneManifest(options),
    (error) => {
      assert.match(error.message, /Mutation lane manifest is out of date/);
      assert.match(error.message, expectedFragment);
      return true;
    },
  );
}

test('the checked-in manifest covers every source and test file on disk', async () => {
  const { sourceFiles, testFiles } = await assertMutationLaneManifest();
  assert.equal(sourceFiles.length, expectedMutationFiles.length);
  assert.deepEqual([...expectedMutationFiles], [...sourceFiles]);
  const assignedTestFiles = new Set(
    Object.values(mutationLanes).flatMap(({ testFiles: files }) => files),
  );
  for (const testFile of testFiles) {
    assert.ok(
      assignedTestFiles.has(testFile) || testFile in intentionallyUnassignedTestFiles,
      `${testFile} belongs to no lane and is not declared unassigned`,
    );
  }
});

test('expectedMutationFiles is the sorted, duplicate-free union of every lane', () => {
  const union = Object.values(mutationLanes).flatMap(({ mutate }) => mutate);
  assert.equal(new Set(union).size, union.length, 'a source file is assigned to two lanes');
  assert.deepEqual([...expectedMutationFiles], union.toSorted());
  assert.deepEqual(mutationLaneNames, Object.keys(mutationLanes));
});

test('every lane definition is frozen so a caller cannot mutate the manifest', () => {
  for (const [laneName, definition] of Object.entries(mutationLanes)) {
    assert.ok(Object.isFrozen(definition), `${laneName} is not frozen`);
    assert.ok(Object.isFrozen(definition.mutate), `${laneName}.mutate is not frozen`);
    assert.ok(Object.isFrozen(definition.testFiles), `${laneName}.testFiles is not frozen`);
  }
});

test('a source file assigned to no lane fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts', 'src/nested/b.tsx'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: {},
    },
    /Source files assigned to no lane: src\/nested\/b\.tsx/,
  );
});

test('a source file assigned to two lanes fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts', '__tests__/b-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({
        first: [['src/a.ts'], ['__tests__/a-test.ts']],
        second: [['src/a.ts'], ['__tests__/b-test.ts']],
      }),
      unassignedTestFiles: {},
    },
    /Source files assigned to more than one lane: src\/a\.ts/,
  );
});

test('a lane that names a deleted source file fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts', 'src/gone.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: {},
    },
    /Lanes reference missing source files: src\/gone\.ts/,
  );
});

test('a test file in neither a lane nor the unassigned list fails the manifest', async () => {
  const appDir = await fixtureAppDir(
    ['src/a.ts'],
    ['__tests__/a-test.ts', '__tests__/orphan-test.ts'],
  );
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: {},
    },
    /neither a lane nor intentionallyUnassignedTestFiles: __tests__\/orphan-test\.ts/,
  );
});

test('a declared-unassigned test file that no longer exists fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: { '__tests__/deleted-test.ts': 'stale entry' },
    },
    /names missing files: __tests__\/deleted-test\.ts/,
  );
});

test('a test file both assigned and declared unassigned fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: { '__tests__/a-test.ts': 'contradictory' },
    },
    /listed as unassigned but used by a lane: __tests__\/a-test\.ts/,
  );
});

test('an unassigned test file without a stated reason fails the manifest', async () => {
  const appDir = await fixtureAppDir(
    ['src/a.ts'],
    ['__tests__/a-test.ts', '__tests__/orphan-test.ts'],
  );
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
      unassignedTestFiles: { '__tests__/orphan-test.ts': '   ' },
    },
    /must explain why the file owns no mutants/,
  );
});

test('an empty lane fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']], empty: [[], []] }),
      unassignedTestFiles: {},
    },
    /Lane empty mutates nothing/,
  );
});

test('a lane that repeats a test file fails the manifest', async () => {
  const appDir = await fixtureAppDir(['src/a.ts'], ['__tests__/a-test.ts']);
  await expectManifestProblem(
    {
      appDir,
      lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts', '__tests__/a-test.ts']] }),
      unassignedTestFiles: {},
    },
    /Lane only repeats test files: __tests__\/a-test\.ts/,
  );
});

test('declaration files and non-TypeScript sources are not expected to have lanes', async () => {
  const appDir = await fixtureAppDir(
    ['src/a.ts', 'src/globals.d.ts', 'src/readme.md'],
    ['__tests__/a-test.ts', '__tests__/fixture.json'],
  );
  const result = await assertMutationLaneManifest({
    appDir,
    lanes: lanes({ only: [['src/a.ts'], ['__tests__/a-test.ts']] }),
    unassignedTestFiles: {},
  });
  assert.deepEqual(result.sourceFiles, ['src/a.ts']);
  assert.deepEqual(result.testFiles, ['__tests__/a-test.ts']);
});

async function fixtureMutationRunnerApp() {
  return fixtureAppDir(
    [...mutationSharedInputFiles, ...mutationLanes.recorder.mutate],
    [...mutationLanes.recorder.testFiles],
  );
}

test('runMutation writes provenance only after a successful lane report', async (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  let observedParallelLanes;
  const result = await runMutation({
    appDir,
    reportDir,
    environment: { MUTATION_PARALLEL_LANES: '9' },
    laneNames: ['recorder'],
    parallelLanes: 2,
    merge: false,
    validateManifest: async () => {},
    runLane: async ({ environment }) => {
      observedParallelLanes = environment.MUTATION_PARALLEL_LANES;
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(path.join(reportDir, 'recorder.json'), '{}');
      return 0;
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(observedParallelLanes, '2');
  const provenance = JSON.parse(
    await fs.readFile(mutationLaneProvenancePath(reportDir, 'recorder'), 'utf8'),
  );
  assert.equal(provenance.laneName, 'recorder');
  assert.match(provenance.fingerprint, /^[a-f0-9]{64}$/);
  await assert.doesNotReject(() =>
    assertMutationLaneProvenance({
      reportDir,
      appDir,
      lanes: mutationLanes,
      laneNames: ['recorder'],
      environment: { MUTATION_PARALLEL_LANES: '2' },
    }),
  );
  await assert.rejects(
    () =>
      assertMutationLaneProvenance({
        reportDir,
        appDir,
        lanes: mutationLanes,
        laneNames: ['recorder'],
        environment: { MUTATION_PARALLEL_LANES: '9' },
      }),
    /runtime, or environment changed/,
  );

  const failedReportDir = path.join(appDir, 'failed-reports');
  const failed = await runMutation({
    appDir,
    reportDir: failedReportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => {
      await fs.writeFile(path.join(failedReportDir, 'recorder.json'), '{}');
      return 1;
    },
  });
  assert.equal(failed.exitCode, 1);
  await assert.rejects(
    fs.access(mutationLaneProvenancePath(failedReportDir, 'recorder')),
    /ENOENT/,
  );

  const missingReportDir = path.join(appDir, 'missing-reports');
  const missing = await runMutation({
    appDir,
    reportDir: missingReportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => 0,
  });
  assert.equal(missing.exitCode, 1);
  await assert.rejects(
    fs.access(mutationLaneProvenancePath(missingReportDir, 'recorder')),
    /ENOENT/,
  );
});

test('runMutation fails when an unmutated production dependency changes during a lane', async (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  const result = await runMutation({
    appDir,
    reportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => {
      await fs.writeFile(path.join(reportDir, 'recorder.json'), '{}');
      const unmutatedDependency = expectedMutationFiles.find(
        (fileName) => !mutationLanes.recorder.mutate.includes(fileName),
      );
      assert.ok(unmutatedDependency);
      await fs.writeFile(path.join(appDir, unmutatedDependency), '// changed');
      return 0;
    },
  });

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.failedLanes, [{ laneName: 'recorder', exitCode: 1 }]);
  await assert.rejects(fs.access(mutationLaneProvenancePath(reportDir, 'recorder')), /ENOENT/);
});

test('mutation provenance fails when the report gate or equivalence policy changes', async (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  const result = await runMutation({
    appDir,
    reportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => {
      await fs.writeFile(path.join(reportDir, 'recorder.json'), '{}');
      return 0;
    },
  });
  assert.equal(result.exitCode, 0);

  await fs.appendFile(path.join(appDir, 'scripts', 'mutation-equivalents.mjs'), '// changed');
  await assert.rejects(
    () =>
      assertMutationLaneProvenance({
        reportDir,
        appDir,
        lanes: mutationLanes,
        laneNames: ['recorder'],
        environment: {},
      }),
    /production source, the mutation toolchain, runtime, or environment changed/,
  );
});

test('runMutation rejects duplicate lanes before cleaning reports or starting work', async (t) => {
  const appDir = await fixtureAppDir([], []);
  const reportDir = path.join(appDir, 'reports');
  const existingReport = path.join(reportDir, 'recorder.json');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(existingReport, 'keep me');
  let laneStarted = false;

  await assert.rejects(
    () =>
      runMutation({
        appDir,
        reportDir,
        laneNames: ['recorder', 'recorder'],
        merge: false,
        validateManifest: async () => {},
        runLane: async () => {
          laneStarted = true;
          return 0;
        },
      }),
    /Mutation lanes requested more than once: recorder/,
  );
  assert.equal(laneStarted, false);
  assert.equal(await fs.readFile(existingReport, 'utf8'), 'keep me');
});

test('runMutation rejects inherited object-property lane names before starting work', async (t) => {
  const appDir = await fixtureAppDir([], []);
  const reportDir = path.join(appDir, 'reports');
  const existingReport = path.join(reportDir, 'recorder.json');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(existingReport, 'keep me');
  let laneStarted = false;

  await assert.rejects(
    () =>
      runMutation({
        appDir,
        reportDir,
        laneNames: ['constructor'],
        merge: false,
        validateManifest: async () => {},
        runLane: async () => {
          laneStarted = true;
          return 0;
        },
      }),
    /Unknown mutation lane requested: constructor/,
  );
  assert.equal(laneStarted, false);
  assert.equal(await fs.readFile(existingReport, 'utf8'), 'keep me');
});

test('runMutation locks the app against campaigns using different report directories', async (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  const secondReportDir = path.join(appDir, 'other-reports');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  let signalEntered;
  const enteredLane = new Promise((resolve) => {
    signalEntered = resolve;
  });
  let releaseLane;
  const continueLane = new Promise((resolve) => {
    releaseLane = resolve;
  });
  const firstRun = runMutation({
    appDir,
    reportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => {
      signalEntered();
      await continueLane;
      await fs.writeFile(path.join(reportDir, 'recorder.json'), '{}');
      return 0;
    },
  });
  await enteredLane;

  try {
    await assert.rejects(
      () =>
        runMutation({
          appDir,
          reportDir: secondReportDir,
          environment: {},
          laneNames: ['recorder'],
          merge: false,
          validateManifest: async () => {},
          runLane: async () => {
            throw new Error('the locked campaign must never start a lane');
          },
        }),
      /Another mutation campaign .* already owns/s,
    );
  } finally {
    releaseLane();
  }

  assert.equal((await firstRun).exitCode, 0);
  await assert.rejects(fs.access(path.join(appDir, mutationCampaignLockFileName)), /ENOENT/);
});

test('runMutation refuses a stale-looking lock until it is manually cleared', async (t) => {
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  const lockPath = path.join(appDir, mutationCampaignLockFileName);
  const lockContents = `${JSON.stringify({
    pid: 999_999,
    token: 'stale-owner',
    reportDir: '/tmp/old-mutation-reports',
  })}\n`;
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  await fs.writeFile(lockPath, lockContents);
  let laneStarted = false;

  await assert.rejects(
    () =>
      runMutation({
        appDir,
        reportDir,
        environment: {},
        laneNames: ['recorder'],
        merge: false,
        validateManifest: async () => {},
        runLane: async () => {
          laneStarted = true;
          return 0;
        },
      }),
    /pid 999999.*Verify that neither its parent nor any Stryker child is alive/s,
  );
  assert.equal(laneStarted, false);
  assert.equal(await fs.readFile(lockPath, 'utf8'), lockContents);
});

test('runMutation release never removes a lock with another ownership token', async (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const appDir = await fixtureMutationRunnerApp();
  const reportDir = path.join(appDir, 'reports');
  const lockPath = path.join(appDir, mutationCampaignLockFileName);
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  const replacement = {
    pid: process.pid,
    token: 'replacement-owner',
    reportDir: '/tmp/replacement',
  };

  const result = await runMutation({
    appDir,
    reportDir,
    environment: {},
    laneNames: ['recorder'],
    merge: false,
    validateManifest: async () => {},
    runLane: async () => {
      await fs.writeFile(path.join(reportDir, 'recorder.json'), '{}');
      await fs.writeFile(lockPath, `${JSON.stringify(replacement)}\n`);
      return 0;
    },
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(JSON.parse(await fs.readFile(lockPath, 'utf8')), replacement);
});

test('the app Stryker config defaults to two workers and bails after a decisive kill', async () => {
  const previousLane = process.env.MUTATION_LANE;
  const previousConcurrency = process.env.MUTATION_CONCURRENCY;
  process.env.MUTATION_LANE = 'recorder';
  delete process.env.MUTATION_CONCURRENCY;
  try {
    const configUrl = new URL('../stryker.lane.config.mjs', import.meta.url);
    configUrl.searchParams.set('test', String(Date.now()));
    const { default: config } = await import(configUrl.href);
    assert.equal(config.concurrency, 2);
    assert.equal(config.jest.config.bail, 1);
  } finally {
    if (previousLane === undefined) delete process.env.MUTATION_LANE;
    else process.env.MUTATION_LANE = previousLane;
    if (previousConcurrency === undefined) delete process.env.MUTATION_CONCURRENCY;
    else process.env.MUTATION_CONCURRENCY = previousConcurrency;
  }
});

test('the app Stryker config rejects inherited object-property lane names', async () => {
  const previousLane = process.env.MUTATION_LANE;
  try {
    process.env.MUTATION_LANE = 'constructor';
    const configUrl = new URL('../stryker.lane.config.mjs', import.meta.url);
    configUrl.searchParams.set('inherited-lane-test', String(Date.now()));
    await assert.rejects(
      () => import(configUrl.href),
      /MUTATION_LANE must name one configured lane \(received "constructor"\)/,
    );
  } finally {
    if (previousLane === undefined) delete process.env.MUTATION_LANE;
    else process.env.MUTATION_LANE = previousLane;
  }
});

test('runMutation derives parallel lanes from its injected environment', async () => {
  await assert.rejects(
    () =>
      runMutation({
        appDir: '/unused-before-validation',
        environment: { MUTATION_PARALLEL_LANES: 'invalid' },
        merge: false,
        validateManifest: async () => {
          throw new Error('parallel-lane validation must happen first');
        },
      }),
    /MUTATION_PARALLEL_LANES must be a positive integer/,
  );
});
