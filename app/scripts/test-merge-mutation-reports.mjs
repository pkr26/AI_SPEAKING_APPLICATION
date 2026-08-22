import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertMutant,
  assertMutationReportInputsMatchWorkspace,
  createMutationReportHtml,
  mergeMutationReportData,
  resolvedStatuses,
  summarizeMutants,
  unresolvedStatusSummary,
} from './merge-mutation-reports.mjs';
import { applyEquivalenceAllowlist, equivalentMutants } from './mutation-equivalents.mjs';
import {
  createMutationMergePolicyProvenance,
  mutationMergePolicyFiles,
  mutationMergePolicySchemaVersion,
} from './mutation-merge-policy.mjs';
import {
  assertMutationLaneProvenance,
  createMutationLaneProvenance,
  mutationSharedInputFiles,
  writeMutationLaneProvenance,
} from './mutation-provenance.mjs';

const location = (line, startColumn = 1, endColumn = 9) => ({
  start: { line, column: startColumn },
  end: { line, column: endColumn },
});

function mutant(id, status, extra = {}) {
  return {
    id,
    mutatorName: 'BooleanLiteral',
    status,
    location: location(Number(id) + 1),
    ...extra,
  };
}

function laneReport({ files, testFiles, overrides = {} }) {
  return {
    schemaVersion: '2.0',
    thresholds: { high: 100, low: 100, break: 100 },
    projectRoot: '/repo/app',
    framework: { name: 'StrykerJS', version: '9.6.1' },
    files: Object.fromEntries(
      Object.entries(files).map(([name, mutants]) => [
        name,
        { language: 'typescript', source: `// ${name}`, mutants },
      ]),
    ),
    testFiles: Object.fromEntries(
      Object.entries(testFiles).map(([name, tests]) => [name, { source: `// ${name}`, tests }]),
    ),
    ...overrides,
  };
}

const twoLaneManifest = {
  lanes: {
    first: { mutate: ['src/a.ts'], testFiles: ['__tests__/shared-test.ts'] },
    second: {
      mutate: ['src/b.ts'],
      testFiles: ['__tests__/shared-test.ts', '__tests__/second-test.ts'],
    },
  },
  laneNames: ['first', 'second'],
  expectedFiles: ['src/a.ts', 'src/b.ts'],
  mergePolicy: {
    schemaVersion: mutationMergePolicySchemaVersion,
    files: [...mutationMergePolicyFiles].toSorted(),
    fingerprint: 'a'.repeat(64),
  },
  // The real allowlist describes real source; fixtures supply their own.
  equivalences: [],
};

function twoLaneReports() {
  return {
    first: laneReport({
      files: {
        'src/a.ts': [
          mutant('0', 'Killed', { coveredBy: ['0', '1'], killedBy: ['1'], static: false }),
        ],
      },
      testFiles: {
        '__tests__/shared-test.ts': [
          { id: '0', name: 'shared one', location: location(3) },
          { id: '1', name: 'shared two', location: location(7) },
        ],
      },
    }),
    second: laneReport({
      files: {
        'src/b.ts': [
          mutant('0', 'Survived', { coveredBy: ['5'], static: true }),
          mutant('1', 'Killed', { coveredBy: ['5', '6'], killedBy: ['6'] }),
        ],
      },
      testFiles: {
        // Same file, same tests as the first lane: they must fold into one identity.
        '__tests__/shared-test.ts': [
          { id: '5', name: 'shared one', location: location(3) },
          { id: '9', name: 'shared two', location: location(7) },
        ],
        '__tests__/second-test.ts': [{ id: '6', name: 'second only', location: location(2) }],
      },
    }),
  };
}

test('merging renumbers mutants and rewrites every test reference', () => {
  const { report, summary } = mergeMutationReportData({
    reportsByLane: twoLaneReports(),
    ...twoLaneManifest,
  });

  assert.deepEqual(Object.keys(report.files), ['src/a.ts', 'src/b.ts']);
  assert.deepEqual(
    Object.values(report.files).flatMap((file) => file.mutants.map((each) => each.id)),
    ['0', '1', '2'],
    'mutant IDs are globally unique after the merge',
  );

  const testsByName = new Map(
    Object.entries(report.testFiles).flatMap(([fileName, file]) =>
      file.tests.map((each) => [`${fileName}:${each.name}`, each.id]),
    ),
  );
  assert.equal(testsByName.size, 3, 'the shared test file is folded, not duplicated');

  const [aMutant] = report.files['src/a.ts'].mutants;
  assert.deepEqual(aMutant.killedBy, [testsByName.get('__tests__/shared-test.ts:shared two')]);
  const [survivor, killed] = report.files['src/b.ts'].mutants;
  assert.deepEqual(survivor.coveredBy, [testsByName.get('__tests__/shared-test.ts:shared one')]);
  assert.deepEqual(killed.killedBy, [testsByName.get('__tests__/second-test.ts:second only')]);

  assert.equal(summary.mutantCount, 3);
  assert.equal(summary.testCount, 3);
  assert.equal(summary.laneCount, 2);
  assert.equal(summary.staticMutants, 1);
  assert.equal(summary.dynamicMutants, 2);
  assert.deepEqual(summary.mergePolicy, twoLaneManifest.mergePolicy);
  assert.equal(summary.strictMutationGatePassed, false);
  assert.equal(summary.mutationScore, (2 / 3) * 100);
  assert.deepEqual(
    summary.lanes.map((each) => [each.name, each.mutantCount, each.statusCounts.Survived]),
    [
      ['first', 1, 0],
      ['second', 2, 1],
    ],
  );
});

test('the app merge policy fingerprint pins merger and reviewed-equivalence contents', async (t) => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-mutation-merge-policy-'));
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  for (const fileName of mutationMergePolicyFiles) {
    const absolutePath = path.join(appDir, fileName);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `// ${fileName}`);
  }

  const first = await createMutationMergePolicyProvenance({ appDir });
  const repeated = await createMutationMergePolicyProvenance({ appDir });
  assert.deepEqual(repeated, first);
  assert.match(first.fingerprint, /^[a-f0-9]{64}$/u);
  assert.deepEqual(first.files, [...mutationMergePolicyFiles].toSorted());
  assert.equal(
    mutationSharedInputFiles.includes('scripts/mutation-equivalents.mjs'),
    false,
    'reviewed equivalences must not stale an already-produced lane report',
  );
  assert.equal(
    mutationSharedInputFiles.includes('scripts/merge-mutation-reports.mjs'),
    true,
    'the Recorder runner imports app-merger helpers during canonical lane publication',
  );
  assert.equal(
    mutationSharedInputFiles.includes('scripts/mutation-merge-policy.mjs'),
    true,
    'the Recorder runner transitively loads the merge-policy helper',
  );

  await fs.appendFile(path.join(appDir, 'scripts/mutation-equivalents.mjs'), '\n// reviewed');
  const equivalenceChange = await createMutationMergePolicyProvenance({ appDir });
  assert.notEqual(equivalenceChange.fingerprint, first.fingerprint);

  await fs.appendFile(path.join(appDir, 'scripts/merge-mutation-reports.mjs'), '\n// gate change');
  const mergerChange = await createMutationMergePolicyProvenance({ appDir });
  assert.notEqual(mergerChange.fingerprint, equivalenceChange.fingerprint);
});

test('merging rejects missing or malformed merge policy provenance', () => {
  const reports = twoLaneReports();
  assert.throws(
    () =>
      mergeMutationReportData({
        reportsByLane: reports,
        ...twoLaneManifest,
        mergePolicy: undefined,
      }),
    /merge policy provenance is invalid/,
  );
  assert.throws(
    () =>
      mergeMutationReportData({
        reportsByLane: reports,
        ...twoLaneManifest,
        mergePolicy: { ...twoLaneManifest.mergePolicy, fingerprint: 'not-a-sha256' },
      }),
    /merge policy provenance is invalid/,
  );
  assert.throws(
    () =>
      mergeMutationReportData({
        reportsByLane: reports,
        ...twoLaneManifest,
        mergePolicy: { ...twoLaneManifest.mergePolicy, files: ['scripts/only-one.mjs'] },
      }),
    /merge policy provenance is invalid/,
  );
});

test('a campaign with nothing left unresolved passes the strict gate', () => {
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].status = 'Killed';
  reports.second.files['src/b.ts'].mutants[0].killedBy = ['5'];
  const { summary } = mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest });
  assert.equal(summary.strictMutationGatePassed, true);
  assert.equal(summary.mutationScore, 100);
  assert.equal(unresolvedStatusSummary(summary.statusCounts), '');
});

test('a survivor explained by a reviewed equivalence entry passes the gate', () => {
  const equivalences = [
    {
      file: 'src/b.ts',
      mutator: 'BooleanLiteral',
      original: '// src/b.ts',
      replacements: ['true'],
      locations: [location(1)],
      reason: 'fixture: proven unkillable',
    },
  ];
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].replacement = 'true';
  const { summary } = mergeMutationReportData({
    reportsByLane: reports,
    ...twoLaneManifest,
    equivalences,
  });
  assert.equal(summary.strictMutationGatePassed, true);
  assert.equal(summary.acceptedEquivalents, 1);
  assert.deepEqual(summary.unexplainedSurvivors, []);
  // Stryker's own score still counts it as survived; only our gate forgives it.
  assert.equal(summary.statusCounts.Survived, 1);
});

test('a survivor nobody explained fails the gate and is named', () => {
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].replacement = 'true';
  const { summary } = mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest });
  assert.equal(summary.strictMutationGatePassed, false);
  assert.equal(summary.unexplainedSurvivors.length, 1);
  assert.equal(summary.unexplainedSurvivors[0].file, 'src/b.ts');
  assert.equal(summary.unexplainedSurvivors[0].mutatorName, 'BooleanLiteral');
});

test('an Ignored mutant nobody explained fails the gate', () => {
  // Regression: a `// Stryker disable all` comment whose `restore` did not take
  // effect silenced 157 mutants in login.tsx, and the campaign still reported
  // 100%. Ignoring a mutant is a claim, and the claim has to be written down.
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].status = 'Ignored';
  const { summary } = mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest });
  assert.equal(summary.strictMutationGatePassed, false);
  assert.equal(summary.unexplainedSurvivors.length, 1);
  assert.equal(summary.unexplainedSurvivors[0].status, 'Ignored');
  assert.match(unresolvedStatusSummary(summary.statusCounts), /Ignored=1/);
});

test('an equivalence entry that matches nothing fails the gate', () => {
  const equivalences = [
    {
      file: 'src/a.ts',
      mutator: 'BooleanLiteral',
      original: 'code that no longer exists',
      replacements: ['true'],
      locations: [location(1)],
      reason: 'fixture: stale exemption',
    },
  ];
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].status = 'Killed';
  reports.second.files['src/b.ts'].mutants[0].killedBy = ['5'];
  const { summary } = mergeMutationReportData({
    reportsByLane: reports,
    ...twoLaneManifest,
    equivalences,
  });
  assert.equal(summary.strictMutationGatePassed, false, 'a stale exemption must not pass silently');
  assert.equal(summary.staleEquivalenceEntries.length, 1);
  assert.equal(summary.staleEquivalenceEntries[0].original, 'code that no longer exists');
  // The counts travel with the summary so the diagnostic can label the entry
  // accurately instead of always claiming "matched nothing".
  assert.equal(summary.staleEquivalenceEntries[0].matched, 0);
  assert.equal(summary.staleEquivalenceEntries[0].expected, 1);
});

test('an over-matching equivalence entry keeps its real matched and expected counts', () => {
  // Two mutants at one exact span survive behind an exemption written for
  // exactly one: the dangerous drift direction, and the one a blanket
  // "matched nothing" label would hide.
  const equivalences = [
    {
      file: 'src/b.ts',
      mutator: 'BooleanLiteral',
      original: '// src/b.ts',
      replacements: ['true'],
      locations: [location(1)],
      reason: 'fixture: proven unkillable',
    },
  ];
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[0].replacement = 'true';
  reports.second.files['src/b.ts'].mutants[1] = {
    ...reports.second.files['src/b.ts'].mutants[1],
    status: 'Survived',
    replacement: 'true',
    location: location(1),
  };
  const { summary } = mergeMutationReportData({
    reportsByLane: reports,
    ...twoLaneManifest,
    equivalences,
  });
  assert.equal(summary.strictMutationGatePassed, false);
  assert.equal(summary.unexplainedSurvivors.length, 0, 'both survivors sit behind the entry');
  assert.equal(summary.staleEquivalenceEntries.length, 1);
  assert.equal(summary.staleEquivalenceEntries[0].matched, 2);
  assert.equal(summary.staleEquivalenceEntries[0].expected, 1);
});

test('an entry must excuse exactly the number of mutants it declares', () => {
  // Some mutators can report multiple variants at one exact node. The declared
  // count must still agree so an added or removed variant cannot pass silently.
  const entry = {
    file: 'src/a.ts',
    mutator: 'ConditionalExpression',
    original: 'if (a && b) return;',
    replacements: ['true'],
    locations: [location(1)],
    count: 1,
    reason: 'fixture',
  };
  const survivor = {
    file: 'src/a.ts',
    status: 'Survived',
    mutatorName: 'ConditionalExpression',
    replacement: 'true',
    original: 'if (a && b) return;',
    location: location(1),
    line: 1,
  };

  const one = applyEquivalenceAllowlist([survivor], [entry]);
  assert.equal(one.accepted.length, 1);
  assert.deepEqual(one.staleEntries, [], 'the declared count is met exactly');

  const two = applyEquivalenceAllowlist([survivor, { ...survivor, line: 1 }], [entry]);
  assert.equal(two.staleEntries.length, 1, 'a second mutant behind one exemption must be flagged');
  assert.equal(two.staleEntries[0].matched, 2);
  assert.equal(two.staleEntries[0].expected, 1);

  const none = applyEquivalenceAllowlist([], [entry]);
  assert.equal(none.staleEntries.length, 1, 'an exemption matching nothing must be flagged');
  assert.equal(none.staleEntries[0].matched, 0);
});

test('an entry may pin multiple exact locations when the node text repeats', () => {
  // `if (!isCurrent()) return;` occurs 19 times in Recorder.tsx and exactly two
  // are unkillable, so text alone would excuse the seventeen that are killed.
  const entry = {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    original: 'if (!isCurrent()) return;',
    replacements: ['false'],
    locations: [location(477, 13, 25), location(487, 13, 25)],
    count: 2,
    reason: 'fixture',
  };
  const at = (line, startColumn = 13, endColumn = 25) => ({
    file: 'src/components/Recorder.tsx',
    status: 'Survived',
    mutatorName: 'ConditionalExpression',
    replacement: 'false',
    original: 'if (!isCurrent()) return;',
    location: location(line, startColumn, endColumn),
    line,
  });

  const covered = applyEquivalenceAllowlist([at(477), at(487)], [entry]);
  assert.equal(covered.accepted.length, 2);
  assert.deepEqual(covered.staleEntries, []);

  const elsewhere = applyEquivalenceAllowlist([at(477), at(487), at(1211)], [entry]);
  assert.equal(elsewhere.unexplained.length, 1, 'a sibling on another line is not excused');
  assert.equal(elsewhere.unexplained[0].line, 1211);
});

test('a same-line one-for-one survivor swap fails closed on exact columns', () => {
  const entry = {
    file: 'src/a.ts',
    mutator: 'ConditionalExpression',
    original: 'if (a && b) return;',
    replacements: ['true'],
    locations: [location(12, 5, 11)],
    reason: 'fixture',
  };
  const swappedSibling = {
    file: 'src/a.ts',
    status: 'Survived',
    mutatorName: 'ConditionalExpression',
    replacement: 'true',
    original: 'if (a && b) return;',
    location: location(12, 16, 22),
    line: 12,
  };

  const { accepted, unexplained, staleEntries } = applyEquivalenceAllowlist(
    [swappedSibling],
    [entry],
  );
  assert.deepEqual(accepted, []);
  assert.equal(unexplained.length, 1, 'the newly surviving sibling must not inherit the exemption');
  assert.equal(staleEntries.length, 1, 'the original exact-span exemption must become stale');
});

test('every equivalence entry must declare its exact start and end locations', () => {
  const incomplete = {
    file: 'src/a.ts',
    mutator: 'BooleanLiteral',
    original: 'const enabled = true;',
    replacements: ['false'],
    reason: 'fixture',
  };
  assert.throws(
    () => applyEquivalenceAllowlist([], [incomplete]),
    /must declare 1 exact start\/end location/,
  );
  assert.throws(
    () =>
      applyEquivalenceAllowlist(
        [],
        [
          {
            ...incomplete,
            locations: [{ start: { line: 1, column: 17 } }],
          },
        ],
      ),
    /must declare 1 exact start\/end location/,
  );
});

test('equivalence matching normalizes whitespace while retaining the exact location', () => {
  const survivors = [
    {
      file: 'src/a.ts',
      status: 'Survived',
      mutatorName: 'LogicalOperator',
      replacement: 'a   ||   b',
      original: 'const x =\n  a &&\n  b;',
      location: location(999),
      line: 999,
    },
  ];
  const { accepted, unexplained, staleEntries } = applyEquivalenceAllowlist(survivors, [
    {
      file: 'src/a.ts',
      mutator: 'LogicalOperator',
      original: 'const x = a && b;',
      replacements: ['a || b'],
      locations: [location(999)],
      reason: 'fixture',
    },
  ]);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].reason, 'fixture');
  assert.deepEqual(unexplained, []);
  assert.deepEqual(staleEntries, []);
});

test('every checked-in equivalence entry is complete and reviewable', () => {
  assert.ok(equivalentMutants.length > 0);
  for (const entry of equivalentMutants) {
    assert.match(entry.file, /^src\//, 'file must be a repo-relative source path');
    assert.ok(entry.mutator.length > 0, `${entry.file} entry has no mutator`);
    assert.ok(entry.originals.length > 0, `${entry.file} entry names no source span`);
    assert.ok(Object.isFrozen(entry.originals), `${entry.file} source spans must be frozen`);
    for (const original of entry.originals) {
      assert.ok(original.trim().length > 0, `${entry.file} entry has an empty source span`);
    }
    assert.ok(entry.replacements.length > 0, `${entry.file} entry lists no replacement`);
    assert.equal(
      entry.locations.length,
      entry.count ?? 1,
      `${entry.file} [${entry.mutator}] must pin every expected mutant location`,
    );
    assert.ok(Object.isFrozen(entry.locations), `${entry.file} locations must be frozen`);
    for (const exact of entry.locations) {
      assert.ok(Object.isFrozen(exact), `${entry.file} exact locations must be frozen`);
      for (const position of [exact.start, exact.end]) {
        assert.ok(Number.isInteger(position.line) && position.line > 0);
        assert.ok(Number.isInteger(position.column) && position.column > 0);
      }
    }
    assert.ok(
      entry.reason.trim().length >= 40,
      `${entry.file} [${entry.mutator}] must explain WHY no test can kill it`,
    );
    assert.ok(Object.isFrozen(entry), 'entries must be frozen');
  }
});

test('the Recorder review pins 186 equivalents without exempting sentinel kills or final gaps', () => {
  const recorderEntries = equivalentMutants.filter(
    (entry) => entry.file === 'src/components/Recorder.tsx',
  );
  const reviewedIds = recorderEntries.map((entry) => entry.reviewedMutantId);
  assert.equal(recorderEntries.length, 186);
  assert.equal(new Set(reviewedIds).size, 186, 'canonical Recorder IDs must be unique');
  assert.ok(reviewedIds.every((id) => /^\d+$/u.test(id)));

  const reclassifiedInvariantIds = ['1220', '2187', '2188', '2206', '2258', '2266', '2311', '2340'];
  for (const id of reclassifiedInvariantIds) {
    assert.ok(reviewedIds.includes(id), `reviewed invariant ${id} is missing`);
  }

  const sentinelKilledIds = [
    '1317',
    '1321',
    '2238',
    '2451',
    '2453',
    '2454',
    '2834',
    '2835',
    '2836',
  ];
  const finalGapIds = ['891', '2268'];
  const unexplainedOldCanonicalIds = [...sentinelKilledIds, ...finalGapIds];
  assert.equal(unexplainedOldCanonicalIds.length, 11);
  for (const id of unexplainedOldCanonicalIds) {
    assert.equal(reviewedIds.includes(id), false, `mutant ${id} must remain unexplained`);
  }

  const formerBehavioralGapIds = [
    '891',
    '1220',
    '1317',
    '1321',
    '2187',
    '2188',
    '2206',
    '2238',
    '2258',
    '2266',
    '2268',
    '2311',
    '2340',
    '2451',
    '2453',
    '2454',
    '2834',
    '2835',
    '2836',
  ];
  assert.deepEqual(
    [...reclassifiedInvariantIds, ...unexplainedOldCanonicalIds].toSorted(),
    formerBehavioralGapIds.toSorted(),
  );

  const simplificationIds = [
    '2023',
    '2025',
    '2027',
    '2029',
    '2031',
    '2032',
    '2033',
    '2034',
    '2035',
    '2037',
    '2039',
    '2040',
    '2042',
    '2045',
    '2047',
    '2050',
  ];
  for (const id of simplificationIds) {
    const entry = recorderEntries.find((candidate) => candidate.reviewedMutantId === id);
    assert.ok(entry, `reviewed simplification ${id} is missing`);
    assert.match(entry.reason, /fixed two-element literal/u);
  }
});

test('the strict gate rejects statuses that Stryker excludes from its own score', () => {
  for (const status of [
    'Survived',
    'NoCoverage',
    'CompileError',
    'RuntimeError',
    'Pending',
    // Ignored counts too: a leaking `// Stryker disable` comment silently
    // excluded 157 real mutants once, and the campaign still read as 100%.
    'Ignored',
  ]) {
    const summary = summarizeMutants([mutant('0', 'Killed'), mutant('1', status)]);
    assert.equal(summary.strictMutationGatePassed, false, `${status} must not pass the gate`);
    assert.match(unresolvedStatusSummary(summary.statusCounts), new RegExp(`${status}=1`));
  }
  for (const status of resolvedStatuses) {
    assert.equal(summarizeMutants([mutant('0', status)]).strictMutationGatePassed, true);
  }
});

test('Ignored mutants are excluded from the score rather than counted as kills', () => {
  const summary = summarizeMutants([mutant('0', 'Killed'), mutant('1', 'Ignored')]);
  assert.equal(summary.mutantCount, 2);
  assert.equal(summary.mutationScore, 100);
  assert.equal(summary.statusCounts.Ignored, 1);
});

test('a lane report whose files disagree with the manifest is rejected', () => {
  const reports = twoLaneReports();
  reports.first.files['src/unexpected.ts'] = { language: 'typescript', source: '', mutants: [] };
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /Source files in lane first.*Unexpected: src\/unexpected\.ts/s,
  );
});

test('a lane report missing one of its test files is rejected', () => {
  const reports = twoLaneReports();
  delete reports.second.testFiles['__tests__/second-test.ts'];
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /Test files in lane second.*Missing: __tests__\/second-test\.ts/s,
  );
});

test('a missing lane report is rejected rather than silently skipped', () => {
  const reports = twoLaneReports();
  delete reports.second;
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /Mutation lane reports.*Missing: second/s,
  );
});

test('retained lane reports must match current source and test contents', async (t) => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-mutation-inputs-'));
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(appDir, '__tests__'), { recursive: true });
  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// src/a.ts');
  await fs.writeFile(path.join(appDir, '__tests__/a-test.ts'), '// __tests__/a-test.ts');

  const lanes = {
    only: { mutate: ['src/a.ts'], testFiles: ['__tests__/a-test.ts'] },
  };
  const reportsByLane = {
    only: laneReport({
      files: { 'src/a.ts': [mutant('0', 'Killed')] },
      testFiles: { '__tests__/a-test.ts': [{ id: '0', name: 'owns a' }] },
    }),
  };
  const validate = () =>
    assertMutationReportInputsMatchWorkspace({
      reportsByLane,
      lanes,
      laneNames: ['only'],
      appDir,
    });

  await assert.doesNotReject(validate);
  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// changed source');
  await assert.rejects(validate, /source file src\/a\.ts changed; rerun that lane/);

  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// src/a.ts');
  await fs.writeFile(path.join(appDir, '__tests__/a-test.ts'), '// changed test');
  await assert.rejects(
    validate,
    /test file __tests__\/a-test\.ts changed; rerun every lane that owns that test/,
  );
});

test('lane provenance rejects missing, lane-stale, and toolchain-stale reports', async (t) => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-mutation-provenance-'));
  const reportDir = path.join(appDir, 'reports');
  t.after(() => fs.rm(appDir, { recursive: true, force: true }));
  for (const fileName of mutationSharedInputFiles) {
    const absolutePath = path.join(appDir, fileName);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `// ${fileName}`);
  }
  await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(appDir, '__tests__'), { recursive: true });
  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// source');
  await fs.writeFile(path.join(appDir, '__tests__/a-test.ts'), '// test');

  const lanes = {
    only: { mutate: ['src/a.ts'], testFiles: ['__tests__/a-test.ts'] },
  };
  const environment = {
    CI: 'true',
    LANG: 'en_US.UTF-8',
    MUTATION_CONCURRENCY: '2',
    NODE_ENV: 'test',
    TZ: 'UTC',
  };
  const runtime = { node: 'v-test', platform: 'test', arch: 'test' };
  const validate = () =>
    assertMutationLaneProvenance({
      reportDir,
      appDir,
      lanes,
      laneNames: ['only'],
      environment,
      runtime,
    });

  await assert.rejects(validate, /provenance for lane only is missing/);
  const provenance = await createMutationLaneProvenance({
    appDir,
    laneName: 'only',
    lane: lanes.only,
    environment,
    runtime,
  });
  await writeMutationLaneProvenance({ reportDir, provenance });
  await assert.doesNotReject(validate);

  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// changed source');
  await assert.rejects(validate, /lane inputs changed/);

  await fs.writeFile(path.join(appDir, 'src/a.ts'), '// source');
  const unmutatedDependency = mutationSharedInputFiles.find((fileName) =>
    fileName.startsWith('src/lib/'),
  );
  assert.ok(unmutatedDependency, 'the shared fingerprint must include production dependencies');
  await fs.writeFile(path.join(appDir, unmutatedDependency), '// changed dependency');
  await assert.rejects(validate, /a production source, the mutation toolchain/);

  await fs.writeFile(path.join(appDir, unmutatedDependency), `// ${unmutatedDependency}`);
  await assert.rejects(
    () =>
      assertMutationLaneProvenance({
        reportDir,
        appDir,
        lanes,
        laneNames: ['only'],
        environment: { ...environment, MUTATION_PARALLEL_LANES: '2' },
        runtime,
      }),
    /runtime, or environment changed/,
  );

  await fs.writeFile(path.join(appDir, 'package.json'), '// changed package');
  await assert.rejects(validate, /production source, the mutation toolchain/);
});

test('reports produced by different Stryker versions are rejected', () => {
  const reports = twoLaneReports();
  reports.second.framework = { name: 'StrykerJS', version: '9.0.0' };
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /metadata framework differs between lanes first and second/,
  );
});

test('a repeated mutant ID inside one lane is rejected', () => {
  const reports = twoLaneReports();
  reports.second.files['src/b.ts'].mutants[1].id = '0';
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /repeats mutant ID 0/,
  );
});

test('a mutant referencing an unknown test ID is rejected', () => {
  const reports = twoLaneReports();
  reports.first.files['src/a.ts'].mutants[0].coveredBy = ['404'];
  assert.throws(
    () => mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest }),
    /references unknown test ID 404/,
  );
});

test('an unknown mutant status is rejected', () => {
  assert.throws(
    () => assertMutant(mutant('0', 'Probably fine'), 'fixture'),
    /fixture\.status is invalid/,
  );
  assert.throws(
    () => assertMutant({ ...mutant('0', 'Killed'), location: {} }, 'fixture'),
    /fixture\.location\.start/,
  );
  assert.throws(() => assertMutant({ ...mutant('0', 'Killed'), id: '' }, 'fixture'), /fixture\.id/);
});

test('the merged config advertises the whole campaign, not the first lane', () => {
  const reports = twoLaneReports();
  for (const [laneName, report] of Object.entries(reports)) {
    report.config = {
      mutate: ['whatever'],
      tempDirName: `.stryker-${laneName}-tmp`,
      jsonReporter: {},
      concurrency: 3,
    };
  }
  const { report } = mergeMutationReportData({ reportsByLane: reports, ...twoLaneManifest });
  assert.deepEqual(report.config.mutate, ['src/a.ts', 'src/b.ts']);
  assert.deepEqual(report.config.mutationLanes, ['first', 'second']);
  assert.equal(report.config.concurrency, 3);
  assert.ok(
    !('tempDirName' in report.config),
    'the per-lane sandbox name is meaningless once merged',
  );
  assert.ok(!('jsonReporter' in report.config));
});

test('the HTML report neutralises sequences that would break out of the script tag', async () => {
  const html = await createMutationReportHtml({
    files: { 'src/a.ts': { language: 'typescript', source: '</script><img src=x>', mutants: [] } },
    testFiles: {},
    schemaVersion: '2.0',
    thresholds: { high: 100, low: 100, break: 100 },
  });
  const embedded = html.slice(html.indexOf('app.report = '));
  assert.ok(!embedded.includes('</script><img'), 'the closing tag must be escaped');
  assert.match(embedded, /\\u003c\/script>/);
  assert.ok(
    !embedded.includes('\u2028'),
    'a raw line separator is invalid inside a JS string literal',
  );
  assert.ok(!embedded.includes('\u2029'));
  assert.ok(html.includes(' '), 'ordinary spaces must survive escaping');
});
