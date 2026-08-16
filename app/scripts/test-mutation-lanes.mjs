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
