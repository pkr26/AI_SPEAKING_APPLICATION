import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMutant, summarizeMutants } from './merge-mutation-reports.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');
const defaultReportPath = path.join(defaultServerDirectory, 'reports', 'mutation', 'catalog.json');
export const catalogOracleTestFile = 'tests/seed-catalog-mutation.test.ts';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Reviewed catalog files that Stryker legitimately never reports because they
 * contain no runtime code (interfaces produce no mutants). Listing a file here
 * requires review and fails closed: if a listed file ever gains runtime code,
 * the report starts containing it and the exact-set check rejects it as
 * unexpected until this list is pruned.
 */
const reviewedNonMutatedCatalogFiles = ['db/seed-data/types.ts'];

/**
 * The exact set of catalog files the campaign must have mutated: the
 * aggregator plus every per-level module currently in the tree, minus the
 * reviewed type-only files above. Derived from the workspace (not the report)
 * so a narrowed mutate glob, a renamed seed module, or a truncated report
 * cannot pass silently.
 */
async function expectedCatalogSourceFiles(serverDir = defaultServerDirectory) {
  const seedDataDirectory = path.join(serverDir, 'db', 'seed-data');
  const entries = await fs.readdir(seedDataDirectory);
  const modules = entries.filter((entry) => entry.endsWith('.ts')).map((entry) => `db/seed-data/${entry}`);
  return ['db/seed-data.ts', ...modules].filter((file) => !reviewedNonMutatedCatalogFiles.includes(file)).sort();
}

/**
 * Stryker's break threshold scores only valid mutants: CompileError,
 * RuntimeError, and Pending mutants are excluded from the percentage, so the
 * catalog campaign could report 100% and exit 0 while some authored literals
 * were never actually judged. Re-apply the code campaign's strict gate to the
 * catalog report: every mutant must be Killed, Timeout, or Ignored.
 */
export async function checkCatalogReport({
  reportPath = defaultReportPath,
  serverDir = defaultServerDirectory,
  readWorkspaceFile = fs.readFile,
  beforeFinalWorkspaceCheck,
} = {}) {
  if (typeof readWorkspaceFile !== 'function') throw new Error('readWorkspaceFile must be a function');
  if (beforeFinalWorkspaceCheck !== undefined && typeof beforeFinalWorkspaceCheck !== 'function') {
    throw new Error('beforeFinalWorkspaceCheck must be a function');
  }
  let raw;
  try {
    raw = await fs.readFile(reportPath, 'utf8');
  } catch (error) {
    throw new Error(`Catalog mutation report is missing or unreadable at ${reportPath}: ${error.message}`, {
      cause: error,
    });
  }
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new Error(`Catalog mutation report at ${reportPath} is not valid JSON`);
  }
  if (!isRecord(report) || !isRecord(report.files)) {
    throw new Error(`Catalog mutation report at ${reportPath} has no files object`);
  }
  if (!isRecord(report.testFiles)) {
    throw new Error(`Catalog mutation report at ${reportPath} has no testFiles object`);
  }

  // Fail closed on file coverage: the report must cover exactly the current
  // catalog files, and each embedded source must match the workspace file
  // byte-for-byte so a stale report from an older commit cannot pass.
  const expectedFiles = await expectedCatalogSourceFiles(serverDir);
  const actualFiles = Object.keys(report.files).sort();
  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const unexpected = actualFiles.filter((file) => !expectedFiles.includes(file));
  if (missing.length || unexpected.length) {
    throw new Error(
      [
        `Catalog mutation report does not cover exactly the current catalog files.`,
        missing.length ? `Missing: ${missing.join(', ')}` : undefined,
        unexpected.length ? `Unexpected: ${unexpected.join(', ')}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const mutants = [];
  const workspaceSnapshot = new Map();
  for (const [fileName, file] of Object.entries(report.files)) {
    if (!isRecord(file) || !Array.isArray(file.mutants)) {
      throw new Error(`Catalog mutation report file ${fileName} has no mutants array`);
    }
    if (file.mutants.length === 0) {
      throw new Error(`Catalog mutation report file ${fileName} contains no mutants`);
    }
    if (typeof file.source !== 'string') {
      throw new Error(`Catalog mutation report file ${fileName} has no embedded source`);
    }
    const sourcePath = path.join(serverDir, fileName);
    const currentSource = await readWorkspaceFile(sourcePath, 'utf8');
    if (file.source !== currentSource) {
      throw new Error(
        `Catalog mutation report file ${fileName} embeds stale source that no longer matches the workspace`,
      );
    }
    workspaceSnapshot.set(sourcePath, currentSource);
    file.mutants.forEach((mutant, index) => {
      assertMutant(mutant, `Catalog file ${fileName} mutants[${index}]`);
      mutants.push(mutant);
    });
  }
  const reportedTestFiles = Object.keys(report.testFiles);
  if (reportedTestFiles.length !== 1 || reportedTestFiles[0] !== catalogOracleTestFile) {
    throw new Error(
      `Catalog mutation report test files must be exactly ${catalogOracleTestFile} (received ${reportedTestFiles.join(', ') || 'none'})`,
    );
  }
  const oracleTest = report.testFiles[catalogOracleTestFile];
  if (!isRecord(oracleTest) || typeof oracleTest.source !== 'string' || !Array.isArray(oracleTest.tests)) {
    throw new Error(`Catalog mutation report has invalid test metadata for ${catalogOracleTestFile}`);
  }
  if (oracleTest.tests.length === 0) {
    throw new Error(`Catalog mutation report contains no tests for ${catalogOracleTestFile}`);
  }
  const oraclePath = path.join(serverDir, catalogOracleTestFile);
  const currentOracleSource = await readWorkspaceFile(oraclePath, 'utf8');
  if (oracleTest.source !== currentOracleSource) {
    throw new Error(`Catalog mutation report embeds stale test source for ${catalogOracleTestFile}`);
  }
  workspaceSnapshot.set(oraclePath, currentOracleSource);

  // Re-read every source after validation. An editor can otherwise change a
  // file just after its turn in the loop and let a stale report pass because
  // no later operation consults that file again.
  await beforeFinalWorkspaceCheck?.();
  for (const [sourcePath, expectedSource] of workspaceSnapshot) {
    if ((await readWorkspaceFile(sourcePath, 'utf8')) !== expectedSource) {
      throw new Error(
        `Catalog mutation campaign input changed during report validation: ${path.relative(serverDir, sourcePath)}`,
      );
    }
  }

  const summary = summarizeMutants(mutants);
  if (summary.strictMutationGatePassed !== true) {
    const unresolved = Object.entries(summary.statusCounts)
      .filter(([status, count]) => !['Killed', 'Timeout', 'Ignored'].includes(status) && count > 0)
      .map(([status, count]) => `${status}=${count}`)
      .join(', ');
    throw new Error(`Catalog mutation strict gate failed: ${unresolved || 'invalid summary'}`);
  }
  return { mutantCount: mutants.length, statusCounts: summary.statusCounts, reportPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { mutantCount, statusCounts } = await checkCatalogReport();
  console.log(
    `Catalog mutation strict gate passed: ${mutantCount} mutants ` +
      `(Killed=${statusCounts.Killed}, Timeout=${statusCounts.Timeout}, Ignored=${statusCounts.Ignored}).`,
  );
}
