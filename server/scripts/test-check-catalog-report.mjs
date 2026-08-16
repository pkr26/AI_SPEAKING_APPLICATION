import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkCatalogReport } from './check-catalog-report.mjs';

function mutant(status, id) {
  return {
    id,
    mutatorName: 'StringLiteral',
    status,
    location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
  };
}

function report(statuses) {
  return {
    schemaVersion: '2',
    thresholds: { high: 100, low: 100, break: 100 },
    files: {
      'db/seed-data/a1.ts': {
        language: 'typescript',
        source: 'export {};',
        mutants: statuses.map((status, index) => mutant(status, `m${index}`)),
      },
    },
  };
}

async function writeReport(directory, contents) {
  const reportPath = path.join(directory, 'catalog.json');
  await fs.writeFile(reportPath, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return reportPath;
}

test('the catalog strict gate passes when every mutant is killed, timed out, or ignored', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  const reportPath = await writeReport(directory, report(['Killed', 'Killed', 'Timeout', 'Ignored']));
  const result = await checkCatalogReport({ reportPath });
  assert.equal(result.mutantCount, 4);
  assert.equal(result.statusCounts.Killed, 2);
  assert.equal(result.statusCounts.Timeout, 1);
  assert.equal(result.statusCounts.Ignored, 1);
});

test('the catalog strict gate rejects mutants Stryker excludes from its score', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  for (const [status, expected] of [
    ['RuntimeError', /Catalog mutation strict gate failed: RuntimeError=1/],
    ['CompileError', /Catalog mutation strict gate failed: CompileError=1/],
    ['Survived', /Catalog mutation strict gate failed: Survived=1/],
    ['NoCoverage', /Catalog mutation strict gate failed: NoCoverage=1/],
    ['Pending', /Catalog mutation strict gate failed: Pending=1/],
  ]) {
    const reportPath = await writeReport(directory, report(['Killed', status]));
    await assert.rejects(checkCatalogReport({ reportPath }), expected);
  }
});

test('the catalog strict gate fails closed on missing, malformed, or empty reports', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    checkCatalogReport({ reportPath: path.join(directory, 'absent.json') }),
    /missing or unreadable/,
  );

  await assert.rejects(checkCatalogReport({ reportPath: await writeReport(directory, 'not json') }), /not valid JSON/);

  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, { files: null }) }),
    /has no files object/,
  );

  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, { files: { 'db/seed-data/a1.ts': {} } }) }),
    /has no mutants array/,
  );

  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, report([])) }),
    /contains no mutants/,
  );

  const invalidStatus = report(['Killed']);
  invalidStatus.files['db/seed-data/a1.ts'].mutants[0].status = 'Sparkling';
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, invalidStatus) }),
    /status is invalid: Sparkling/,
  );
});
