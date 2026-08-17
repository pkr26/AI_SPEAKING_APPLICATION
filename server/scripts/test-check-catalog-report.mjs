import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkCatalogReport } from './check-catalog-report.mjs';

const AGGREGATOR_SOURCE = "export * from './seed-data/a1';\n";
const MODULE_SOURCE = 'export {};\n';

function mutant(status, id) {
  return {
    id,
    mutatorName: 'StringLiteral',
    status,
    location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
  };
}

function fileEntry(source, statuses) {
  return {
    language: 'typescript',
    source,
    mutants: statuses.map((status, index) => mutant(status, `m${index}`)),
  };
}

function report(statuses, { aggregatorStatuses = ['Ignored'] } = {}) {
  return {
    schemaVersion: '2',
    thresholds: { high: 100, low: 100, break: 100 },
    files: {
      'db/seed-data.ts': fileEntry(AGGREGATOR_SOURCE, aggregatorStatuses),
      'db/seed-data/a1.ts': fileEntry(MODULE_SOURCE, statuses),
    },
  };
}

async function writeReport(directory, contents) {
  const reportPath = path.join(directory, 'catalog.json');
  await fs.writeFile(reportPath, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return reportPath;
}

/** A minimal fixture tree whose catalog files match the fixture reports. */
async function writeServerFixture(directory) {
  await fs.mkdir(path.join(directory, 'db', 'seed-data'), { recursive: true });
  await fs.writeFile(path.join(directory, 'db', 'seed-data.ts'), AGGREGATOR_SOURCE);
  await fs.writeFile(path.join(directory, 'db', 'seed-data', 'a1.ts'), MODULE_SOURCE);
}

test('the catalog strict gate passes when every mutant is killed, timed out, or ignored', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeServerFixture(directory);

  const reportPath = await writeReport(directory, report(['Killed', 'Killed', 'Timeout', 'Ignored']));
  const result = await checkCatalogReport({ reportPath, serverDir: directory });
  assert.equal(result.mutantCount, 5);
  assert.equal(result.statusCounts.Killed, 2);
  assert.equal(result.statusCounts.Timeout, 1);
  assert.equal(result.statusCounts.Ignored, 2);
});

test('the catalog strict gate rejects mutants Stryker excludes from its score', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeServerFixture(directory);

  for (const [status, expected] of [
    ['RuntimeError', /Catalog mutation strict gate failed: RuntimeError=1/],
    ['CompileError', /Catalog mutation strict gate failed: CompileError=1/],
    ['Survived', /Catalog mutation strict gate failed: Survived=1/],
    ['NoCoverage', /Catalog mutation strict gate failed: NoCoverage=1/],
    ['Pending', /Catalog mutation strict gate failed: Pending=1/],
  ]) {
    const reportPath = await writeReport(directory, report(['Killed', status]));
    await assert.rejects(checkCatalogReport({ reportPath, serverDir: directory }), expected);
  }
});

test('the catalog strict gate fails closed on missing, malformed, or empty reports', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeServerFixture(directory);

  await assert.rejects(
    checkCatalogReport({ reportPath: path.join(directory, 'absent.json'), serverDir: directory }),
    /missing or unreadable/,
  );

  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, 'not json'), serverDir: directory }),
    /not valid JSON/,
  );

  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, { files: null }), serverDir: directory }),
    /has no files object/,
  );

  const noMutantsArray = report(['Killed']);
  noMutantsArray.files['db/seed-data/a1.ts'] = { language: 'typescript', source: MODULE_SOURCE };
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, noMutantsArray), serverDir: directory }),
    /has no mutants array/,
  );

  await assert.rejects(
    checkCatalogReport({
      reportPath: await writeReport(directory, report([], { aggregatorStatuses: [] })),
      serverDir: directory,
    }),
    /contains no mutants/,
  );

  const invalidStatus = report(['Killed']);
  invalidStatus.files['db/seed-data/a1.ts'].mutants[0].status = 'Sparkling';
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, invalidStatus), serverDir: directory }),
    /status is invalid: Sparkling/,
  );
});

test('the catalog strict gate fails closed when the report does not cover exactly the current catalog files', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeServerFixture(directory);

  // A narrowed campaign (or renamed seed module) leaves the report short a file.
  const narrowed = report(['Killed']);
  delete narrowed.files['db/seed-data/a1.ts'];
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, narrowed), serverDir: directory }),
    /Missing: db\/seed-data\/a1\.ts/,
  );

  // An extra file that is not part of the current catalog is rejected too.
  const widened = report(['Killed']);
  widened.files['db/seed-data/ghost.ts'] = fileEntry('export {};\n', ['Killed']);
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, widened), serverDir: directory }),
    /Unexpected: db\/seed-data\/ghost\.ts/,
  );
});

test('the catalog strict gate fails closed on stale or missing embedded source', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-gate-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeServerFixture(directory);

  const stale = report(['Killed']);
  stale.files['db/seed-data/a1.ts'].source = 'export const old = true;\n';
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, stale), serverDir: directory }),
    /embeds stale source/,
  );

  const noSource = report(['Killed']);
  delete noSource.files['db/seed-data/a1.ts'].source;
  await assert.rejects(
    checkCatalogReport({ reportPath: await writeReport(directory, noSource), serverDir: directory }),
    /has no embedded source/,
  );
});
