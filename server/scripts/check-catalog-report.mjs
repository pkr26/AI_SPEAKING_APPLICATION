import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMutant, summarizeMutants } from './merge-mutation-reports.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultReportPath = path.resolve(scriptsDirectory, '..', 'reports', 'mutation', 'catalog.json');

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Stryker's break threshold scores only valid mutants: CompileError,
 * RuntimeError, and Pending mutants are excluded from the percentage, so the
 * catalog campaign could report 100% and exit 0 while some authored literals
 * were never actually judged. Re-apply the code campaign's strict gate to the
 * catalog report: every mutant must be Killed, Timeout, or Ignored.
 */
export async function checkCatalogReport({ reportPath = defaultReportPath } = {}) {
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

  const mutants = [];
  for (const [fileName, file] of Object.entries(report.files)) {
    if (!isRecord(file) || !Array.isArray(file.mutants)) {
      throw new Error(`Catalog mutation report file ${fileName} has no mutants array`);
    }
    file.mutants.forEach((mutant, index) => {
      assertMutant(mutant, `Catalog file ${fileName} mutants[${index}]`);
      mutants.push(mutant);
    });
  }
  if (mutants.length === 0) {
    throw new Error(`Catalog mutation report at ${reportPath} contains no mutants`);
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
