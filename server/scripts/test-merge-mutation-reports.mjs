import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { mergeMutationReportData, mergeMutationReports } from './merge-mutation-reports.mjs';
import { codeMutationLaneNames, codeMutationLanes, expectedCodeMutationFiles } from './mutation-lanes.mjs';

const thresholds = Object.freeze({ high: 95, low: 90, break: 90 });
const framework = Object.freeze({ name: 'StrykerJS', version: '9.6.1' });

function position(line, column) {
  return { line, column };
}

function mutationLocation(line) {
  return { start: position(line, 1), end: position(line, 2) };
}

function report({ files, tests, performance = { setup: 1, initialRun: 2, mutation: 3 } }) {
  return {
    schemaVersion: '1.0',
    thresholds,
    projectRoot: '/fixture/server',
    framework,
    performance,
    config: { mutate: Object.keys(files), testFiles: Object.keys(tests), tempDirName: '.lane-tmp' },
    files,
    testFiles: tests,
  };
}

function duplicateNameTests(firstId, secondId) {
  return {
    source: "it('same name', () => {});\nit('same name', () => {});\n",
    tests: [
      { id: firstId, name: 'same name', location: { start: position(1, 1) } },
      { id: secondId, name: 'same name', location: { start: position(2, 1) } },
    ],
  };
}

function focusedFixtures() {
  const lanes = {
    alpha: { mutate: ['src/a.ts'], testFiles: ['tests/shared.test.ts'] },
    beta: { mutate: ['src/b.ts'], testFiles: ['tests/shared.test.ts'] },
  };
  const reportsByLane = {
    alpha: report({
      files: {
        'src/a.ts': {
          language: 'typescript',
          source: 'export const a = 1;\n',
          mutants: [
            {
              id: '0',
              mutatorName: 'ArithmeticOperator',
              replacement: '2',
              status: 'Killed',
              static: true,
              coveredBy: ['0', '1'],
              killedBy: ['1'],
              location: mutationLocation(1),
            },
          ],
        },
      },
      tests: { 'tests/shared.test.ts': duplicateNameTests('0', '1') },
    }),
    beta: report({
      files: {
        'src/b.ts': {
          language: 'typescript',
          source: 'export const b = 2;\n',
          mutants: [
            {
              id: '0',
              mutatorName: 'ArithmeticOperator',
              replacement: '3',
              status: 'Survived',
              static: false,
              coveredBy: ['11'],
              location: mutationLocation(1),
            },
          ],
        },
      },
      tests: { 'tests/shared.test.ts': duplicateNameTests('10', '11') },
    }),
  };
  return { reportsByLane, lanes, laneNames: ['alpha', 'beta'], expectedFiles: ['src/a.ts', 'src/b.ts'] };
}

test('merges disjoint files while globally remapping mutant and deduplicated test IDs', () => {
  const merged = mergeMutationReportData(focusedFixtures());

  assert.deepEqual(Object.keys(merged.report.files), ['src/a.ts', 'src/b.ts']);
  assert.deepEqual(
    merged.report.testFiles['tests/shared.test.ts'].tests.map(({ id, name }) => ({ id, name })),
    [
      { id: '0', name: 'same name' },
      { id: '1', name: 'same name' },
    ],
  );
  assert.deepEqual(merged.report.files['src/a.ts'].mutants[0], {
    ...focusedFixtures().reportsByLane.alpha.files['src/a.ts'].mutants[0],
    id: '0',
    coveredBy: ['0', '1'],
    killedBy: ['1'],
  });
  assert.deepEqual(merged.report.files['src/b.ts'].mutants[0].id, '1');
  assert.deepEqual(merged.report.files['src/b.ts'].mutants[0].coveredBy, ['1']);
  assert.deepEqual(merged.report.performance, { setup: 2, initialRun: 4, mutation: 6 });
  assert.equal(merged.summary.mutantCount, 2);
  assert.equal(merged.summary.testCount, 2);
  assert.equal(merged.summary.staticMutants, 1);
  assert.equal(merged.summary.statusCounts.Killed, 1);
  assert.equal(merged.summary.statusCounts.Survived, 1);
  assert.equal(merged.summary.mutationScore, 50);
  assert.equal(merged.summary.meetsBreakThreshold, false);
  assert.equal(merged.summary.strictMutationGatePassed, false);
});

test('the strict gate rejects invalid runner statuses while allowing intentional ignores', () => {
  const runtimeError = focusedFixtures();
  runtimeError.reportsByLane.beta.files['src/b.ts'].mutants[0].status = 'RuntimeError';
  const invalid = mergeMutationReportData(runtimeError);
  assert.equal(invalid.summary.mutationScore, 100);
  assert.equal(invalid.summary.statusCounts.RuntimeError, 1);
  assert.equal(invalid.summary.strictMutationGatePassed, false);

  const ignored = focusedFixtures();
  ignored.reportsByLane.beta.files['src/b.ts'].mutants[0].status = 'Ignored';
  const intentional = mergeMutationReportData(ignored);
  assert.equal(intentional.summary.strictMutationGatePassed, true);
});

test('rejects repeated test files whose source or test metadata differs', () => {
  const sourceMismatch = focusedFixtures();
  sourceMismatch.reportsByLane.beta.testFiles['tests/shared.test.ts'].source = 'different source';
  assert.throws(() => mergeMutationReportData(sourceMismatch), /Test file source differs across lanes/);

  const metadataMismatch = focusedFixtures();
  metadataMismatch.reportsByLane.beta.testFiles['tests/shared.test.ts'].tests[1].location.start.line = 99;
  assert.throws(() => mergeMutationReportData(metadataMismatch), /Test metadata differs across lanes/);
});

test('rejects dangling test references and unexpected source files', () => {
  const danglingReference = focusedFixtures();
  danglingReference.reportsByLane.alpha.files['src/a.ts'].mutants[0].coveredBy = ['missing'];
  assert.throws(() => mergeMutationReportData(danglingReference), /references unknown test ID missing/);

  const unexpectedSource = focusedFixtures();
  unexpectedSource.reportsByLane.alpha.files['src/unexpected.ts'] = {
    language: 'typescript',
    source: '',
    mutants: [],
  };
  assert.throws(() => mergeMutationReportData(unexpectedSource), /Unexpected: src\/unexpected\.ts/);
});

function fullManifestReport(laneName) {
  const definition = codeMutationLanes[laneName];
  const testFiles = Object.fromEntries(
    definition.testFiles.map((testFileName, index) => [
      testFileName,
      {
        source: `// source for ${testFileName}\n`,
        tests: [{ id: String(index), name: `test in ${testFileName}` }],
      },
    ]),
  );
  const firstTestId = testFiles[definition.testFiles[0]].tests[0].id;
  const files = Object.fromEntries(
    definition.mutate.map((sourceFileName, index) => [
      sourceFileName,
      {
        language: 'typescript',
        source: index === 0 && laneName === codeMutationLaneNames[0] ? 'const unsafe = "</script>";\n' : '// source\n',
        mutants:
          index === 0
            ? [
                {
                  id: '0',
                  mutatorName: 'StringLiteral',
                  replacement: '""',
                  status: laneName === codeMutationLaneNames[0] ? 'Killed' : 'NoCoverage',
                  coveredBy: [firstTestId],
                  ...(laneName === codeMutationLaneNames[0] ? { killedBy: [firstTestId] } : {}),
                  location: mutationLocation(1),
                },
              ]
            : [],
      },
    ]),
  );
  return report({ files, tests: testFiles, performance: undefined });
}

test('requires every manifest lane before writing consolidated JSON, summary, and self-contained HTML', async (context) => {
  const reportDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-report-merge-'));
  context.after(async () => fs.rm(reportDirectory, { recursive: true, force: true }));
  const missingLane = codeMutationLaneNames.at(-1);

  for (const laneName of codeMutationLaneNames.slice(0, -1)) {
    await fs.writeFile(
      path.join(reportDirectory, `${laneName}.json`),
      JSON.stringify(fullManifestReport(laneName)),
      'utf8',
    );
  }
  await assert.rejects(
    mergeMutationReports({ reportDir: reportDirectory }),
    new RegExp(`missing expected lane reports: ${missingLane}\\.json`),
  );
  await assert.rejects(fs.stat(path.join(reportDirectory, 'code.json')), { code: 'ENOENT' });

  await fs.writeFile(
    path.join(reportDirectory, `${missingLane}.json`),
    JSON.stringify(fullManifestReport(missingLane)),
    'utf8',
  );
  const result = await mergeMutationReports({ reportDir: reportDirectory });
  const [mergedJson, summaryJson, html] = await Promise.all([
    fs.readFile(result.paths.json, 'utf8').then(JSON.parse),
    fs.readFile(result.paths.summary, 'utf8').then(JSON.parse),
    fs.readFile(result.paths.html, 'utf8'),
  ]);

  assert.deepEqual(Object.keys(mergedJson.files), expectedCodeMutationFiles);
  assert.equal(summaryJson.laneCount, codeMutationLaneNames.length);
  assert.equal(summaryJson.fileCount, expectedCodeMutationFiles.length);
  assert.equal(summaryJson.mutantCount, codeMutationLaneNames.length);
  assert.match(html, /<mutation-test-report-app/);
  assert.match(html, /\\u003c\/script>/);
  assert.doesNotMatch(html, /const unsafe = "<\/script>"/);
});
