import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import jsxAttributeCore from './jsx-attribute-mutation-core.cjs';
import { assertMutationLaneManifest, mutationLaneNames, mutationLanes } from './mutation-lanes.mjs';
import {
  acquireMutationCampaignLock,
  classifyJestMutationRun,
  countMutationStatuses,
  createCampaignInputSnapshot,
  executeJestMutationProcess,
  mutationResultStatuses,
  normalizeAppPath,
  parseBoundedInteger,
  resolveMutationReportDirectory,
  runBoundedMutationJobs,
  uniqueSorted,
  writeFileAtomically,
} from './mutation-campaign-runtime.mjs';

const {
  JSX_ATTRIBUTE_MUTATION_MODES,
  MODE_ENV,
  PROJECT_ROOT_ENV,
  SITE_ENV,
  discoverJsxAttributeMutationSites,
  normalizeMode,
} = jsxAttributeCore;

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');
const jestConfigPath = path.join(scriptsDirectory, 'jsx-attribute-mutation.jest.config.cjs');
const reportSchemaVersion = 1;
const maximumConcurrency = 8;
const maximumDeadlineMs = 15 * 60_000;
const campaignToolInputFiles = Object.freeze([
  'app.config.ts',
  'app.json',
  'package.json',
  'package-lock.json',
  'scripts/jsx-attribute-mutation-core.cjs',
  'scripts/jsx-attribute-mutation-transformer.cjs',
  'scripts/jsx-attribute-mutation.jest.config.cjs',
  'scripts/mutation-campaign-runtime.mjs',
  'scripts/mutation-lanes.mjs',
  'scripts/run-jsx-attribute-mutation.mjs',
  'scripts/test-jsx-attribute-mutation.mjs',
  'tsconfig.json',
]);
const campaignToolPackages = Object.freeze([
  '@babel/core',
  '@babel/parser',
  '@babel/traverse',
  'babel-jest',
  'jest',
  'jest-expo',
  'typescript',
]);

function defaultReportDirectory(appDir, mode) {
  return path.join(
    appDir,
    'reports',
    'mutation',
    mode === 'event' ? 'event-handling' : 'accessibility-attributes',
  );
}

function optionValue(argv, index, inlineValue, name) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseCliArgs(
  argv,
  { appDir = defaultAppDirectory, environment = process.env } = {},
) {
  const lanes = [];
  const files = [];
  const sites = [];
  let mode = environment.JSX_ATTRIBUTE_CAMPAIGN_MODE;
  let concurrency = environment.JSX_ATTRIBUTE_MUTATION_CONCURRENCY;
  let deadlineMs = environment.JSX_ATTRIBUTE_MUTATION_DEADLINE_MS;
  let reportDirectory = environment.JSX_ATTRIBUTE_MUTATION_REPORT_DIR;
  let list = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected positional argument: ${argument}`);
    const equalsIndex = argument.indexOf('=');
    const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (name === '--list' || name === '--help') {
      if (inlineValue !== undefined) throw new Error(`${name} does not take a value`);
      if (name === '--list') list = true;
      else help = true;
      continue;
    }
    const { value, nextIndex } = optionValue(argv, index, inlineValue, name);
    index = nextIndex;
    switch (name) {
      case '--mode':
        mode = value;
        break;
      case '--lane':
        lanes.push(value);
        break;
      case '--file':
        files.push(normalizeAppPath(value, '--file'));
        break;
      case '--site':
        if (value.length === 0) throw new Error('--site must not be empty');
        sites.push(value);
        break;
      case '--concurrency':
        concurrency = value;
        break;
      case '--deadline-ms':
        deadlineMs = value;
        break;
      case '--report-dir':
        reportDirectory = value;
        break;
      default:
        throw new Error(`Unknown option: ${name}`);
    }
  }

  const normalizedMode = help && mode === undefined ? null : normalizeMode(mode);
  const resolvedAppDir = path.resolve(appDir);
  return {
    appDir: resolvedAppDir,
    mode: normalizedMode,
    concurrency: parseBoundedInteger(concurrency, '--concurrency', {
      fallback: 2,
      maximum: maximumConcurrency,
    }),
    deadlineMs: parseBoundedInteger(deadlineMs, '--deadline-ms', {
      fallback: 120_000,
      minimum: 1_000,
      maximum: maximumDeadlineMs,
    }),
    reportDir:
      normalizedMode === null
        ? null
        : resolveMutationReportDirectory(
            reportDirectory || defaultReportDirectory(resolvedAppDir, normalizedMode),
            resolvedAppDir,
          ),
    filters: {
      lanes: uniqueSorted(lanes),
      files: uniqueSorted(files),
      sites: uniqueSorted(sites),
    },
    list,
    help,
  };
}

export function usage() {
  return `Usage: node scripts/run-jsx-attribute-mutation.mjs --mode MODE [options]

Modes:
  event           Disconnect each authored JSX on[A-Z] callback with a no-op.
  accessibility   Remove each authored JSX accessibility attribute.

Options:
  --lane NAME          Select a mutation lane (repeatable)
  --file APP_PATH      Select a mutable .tsx source file (repeatable)
  --site SITE_ID       Select an exact discovered site (repeatable)
  --concurrency N      Run 1-${maximumConcurrency} Jest subprocesses (default: 2)
  --deadline-ms N      Per-process deadline, 1000-${maximumDeadlineMs} ms
  --report-dir PATH    Output directory (mode-specific default under reports/mutation)
  --list               Print selected sites without running Jest
  --help               Show this help

Filters are intersected. Each mutant runs exactly the test files assigned to its source lane.`;
}

function sourceOwnership(lanes) {
  const ownership = new Map();
  for (const [laneName, lane] of Object.entries(lanes)) {
    for (const sourceFile of lane.mutate) {
      if (!sourceFile.endsWith('.tsx')) continue;
      if (ownership.has(sourceFile)) {
        throw new Error(
          `${sourceFile} belongs to both ${ownership.get(sourceFile).laneName} and ${laneName}`,
        );
      }
      ownership.set(sourceFile, { laneName, testFiles: [...lane.testFiles] });
    }
  }
  return ownership;
}

export async function discoverCampaignSites({
  appDir = defaultAppDirectory,
  mode,
  lanes = mutationLanes,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const ownership = sourceOwnership(lanes);
  const discovered = [];
  for (const sourceFile of [...ownership.keys()].toSorted()) {
    const source = await fs.readFile(path.join(appDir, sourceFile), 'utf8');
    const owner = ownership.get(sourceFile);
    const sites = discoverJsxAttributeMutationSites(source, {
      relativeFile: sourceFile,
      filename: path.join(appDir, sourceFile),
      mode: normalizedMode,
    });
    for (const site of sites) {
      discovered.push({ ...site, laneName: owner.laneName, testFiles: [...owner.testFiles] });
    }
  }
  discovered.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.attributeLocation.start.offset - right.attributeLocation.start.offset,
  );
  const ids = discovered.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error('JSX mutation site IDs are not unique');
  return discovered;
}

export function selectCampaignSites(allSites, filters, lanes = mutationLanes) {
  for (const laneName of filters.lanes) {
    if (!Object.hasOwn(lanes, laneName)) {
      throw new Error(
        `Unknown --lane ${JSON.stringify(laneName)}; expected ${mutationLaneNames.join(', ')}`,
      );
    }
  }
  const knownFiles = new Set(allSites.map(({ file }) => file));
  for (const sourceFile of filters.files) {
    if (!knownFiles.has(sourceFile)) {
      throw new Error(`--file ${JSON.stringify(sourceFile)} has no discovered site in this mode`);
    }
  }
  const knownSites = new Set(allSites.map(({ id }) => id));
  for (const site of filters.sites) {
    if (!knownSites.has(site)) throw new Error(`Unknown --site ${JSON.stringify(site)}`);
  }
  const laneFilter = new Set(filters.lanes);
  const fileFilter = new Set(filters.files);
  const siteFilter = new Set(filters.sites);
  const selected = allSites.filter(
    (site) =>
      (laneFilter.size === 0 || laneFilter.has(site.laneName)) &&
      (fileFilter.size === 0 || fileFilter.has(site.file)) &&
      (siteFilter.size === 0 || siteFilter.has(site.id)),
  );
  if (selected.length === 0) throw new Error('The requested filters intersect to zero sites');
  return selected;
}

function productionFilesFor(lanes) {
  return uniqueSorted(Object.values(lanes).flatMap(({ mutate }) => mutate));
}

function mutationEnvironment({ appDir, mode, siteId, environment }) {
  const childEnvironment = {
    ...environment,
    [PROJECT_ROOT_ENV]: appDir,
    [MODE_ENV]: mode,
    NODE_ENV: 'test',
  };
  delete childEnvironment[SITE_ENV];
  if (siteId !== null) childEnvironment[SITE_ENV] = siteId;
  return childEnvironment;
}

export async function executeJsxMutationJest({
  appDir,
  mode,
  siteId = null,
  testFiles,
  deadlineMs,
  outputFile,
  environment = process.env,
}) {
  return executeJestMutationProcess({
    appDir,
    jestConfigPath,
    testFiles,
    deadlineMs,
    outputFile,
    environment: mutationEnvironment({ appDir, mode, siteId, environment }),
  });
}

function diagnosticsFor(run, classification) {
  if (classification.status !== 'Error' && classification.status !== 'Timeout') return null;
  return { stdoutTail: run.stdoutTail, stderrTail: run.stderrTail };
}

export async function runOneMutation({
  site,
  index,
  appDir,
  mode,
  deadlineMs,
  temporaryDirectory,
  executeJest,
  environment,
}) {
  const outputFile = path.join(temporaryDirectory, `mutation-${index}.json`);
  let run;
  try {
    run = await executeJest({
      appDir,
      mode,
      siteId: site.id,
      testFiles: site.testFiles,
      deadlineMs,
      outputFile,
      environment,
    });
  } catch (error) {
    run = {
      exitCode: null,
      signal: null,
      timedOut: false,
      durationMs: 0,
      stdoutTail: '',
      stderrTail: '',
      report: null,
      reportError: `Jest executor threw: ${error.message}`,
    };
  }
  const classification = classifyJestMutationRun(run, {
    expectedTestFiles: site.testFiles,
    appDir,
  });
  return {
    mutationId: site.id,
    siteId: site.id,
    status: classification.status,
    reason: classification.reason,
    failedTestNames: classification.failedTestNames || [],
    durationMs: run.durationMs,
    process: { exitCode: run.exitCode, signal: run.signal },
    diagnostics: diagnosticsFor(run, classification),
  };
}

function stripAnsi(value) {
  return String(value).replaceAll(/\u001b\[[0-9;]*m/gu, '');
}

function markdownCell(value) {
  return stripAnsi(value).replaceAll('|', '\\|').replaceAll(/\s+/gu, ' ').trim();
}

export function assertCampaignReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Campaign report must be an object');
  }
  if (report.schemaVersion !== reportSchemaVersion) {
    throw new Error(`Campaign report schemaVersion must be ${reportSchemaVersion}`);
  }
  normalizeMode(report.mode);
  if (report.campaign !== `jsx-attribute:${report.mode}`) {
    throw new Error('Campaign report identity does not match its mode');
  }
  if (!Array.isArray(report.sites) || !Array.isArray(report.results)) {
    throw new Error('Campaign report sites and results must be arrays');
  }
  const siteIds = report.sites.map(({ id }) => id);
  if (siteIds.some((id) => typeof id !== 'string') || new Set(siteIds).size !== siteIds.length) {
    throw new Error('Campaign report site IDs must be unique strings');
  }
  if (report.expectedMutationCount !== siteIds.length) {
    throw new Error('Campaign report expects exactly one mutant per site');
  }
  if (
    report.discovery?.selectedSites !== siteIds.length ||
    report.discovery?.mutantsPerSite !== 1 ||
    !Number.isInteger(report.discovery?.totalSites) ||
    report.discovery.totalSites < siteIds.length
  ) {
    throw new Error('Campaign report discovery totals are inconsistent');
  }
  if (!report.baseline || !['Passed', 'Error', 'Timeout'].includes(report.baseline.status)) {
    throw new Error('Campaign report baseline status is invalid');
  }
  const resultIds = report.results.map(({ mutationId }) => mutationId);
  if (
    new Set(resultIds).size !== resultIds.length ||
    report.results.some(
      (result) =>
        result.mutationId !== result.siteId ||
        !siteIds.includes(result.siteId) ||
        !mutationResultStatuses.includes(result.status),
    )
  ) {
    throw new Error('Campaign report has an invalid or duplicate mutation result');
  }
  if (report.results.length > report.expectedMutationCount) {
    throw new Error('Campaign report contains more results than expected');
  }
  if (
    report.results.length === report.expectedMutationCount &&
    JSON.stringify([...resultIds].toSorted()) !== JSON.stringify([...siteIds].toSorted())
  ) {
    throw new Error('Campaign report does not contain exactly one result per site');
  }
  if (
    JSON.stringify(countMutationStatuses(report.results)) !==
    JSON.stringify(report.summary.statuses)
  ) {
    throw new Error('Campaign report status totals do not match results');
  }
  if (report.summary.completedMutationCount !== report.results.length) {
    throw new Error('Campaign report completed total is inconsistent');
  }
  if (
    typeof report.provenance?.before?.fingerprint !== 'string' ||
    (report.provenance.after !== null &&
      typeof report.provenance.after?.fingerprint !== 'string') ||
    typeof report.provenance.inputsUnchanged !== 'boolean'
  ) {
    throw new Error('Campaign report provenance is invalid');
  }
  const derivedInputsUnchanged =
    report.provenance.after !== null &&
    report.provenance.before.fingerprint === report.provenance.after.fingerprint;
  if (report.provenance.inputsUnchanged !== derivedInputsUnchanged) {
    throw new Error('Campaign report inputsUnchanged disagrees with its before/after fingerprints');
  }
  const strictPass =
    report.baseline.status === 'Passed' &&
    report.results.length === report.expectedMutationCount &&
    report.results.every(({ status }) => status === 'Killed') &&
    report.provenance.inputsUnchanged;
  if (report.passed !== strictPass) {
    throw new Error('Campaign report passed flag violates the strict all-killed policy');
  }
  return report;
}

export function renderCampaignMarkdown(report) {
  assertCampaignReport(report);
  const title =
    report.mode === 'event'
      ? 'Event Handling JSX Wiring Mutant Campaign'
      : 'Accessibility JSX Attribute Mutant Campaign';
  const lines = [
    `# ${title}`,
    '',
    `- Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
    `- Baseline: **${report.baseline.status}**`,
    `- Discovered sites: ${report.discovery.totalSites}`,
    `- Selected sites: ${report.sites.length}`,
    `- Completed mutants: ${report.results.length}`,
    `- Killed: ${report.summary.statuses.Killed}`,
    `- Survived: ${report.summary.statuses.Survived}`,
    `- Error: ${report.summary.statuses.Error}`,
    `- Timeout: ${report.summary.statuses.Timeout}`,
    `- Inputs unchanged: ${report.provenance.inputsUnchanged ? 'yes' : 'no'}`,
    `- Duration: ${report.durationMs} ms`,
    '',
    'A strict pass requires a clean baseline, an assertion kill for every selected mutant, and identical before/after fingerprints for production sources, owning tests, campaign tooling, tool versions, runtime, and relevant environment.',
    '',
    '## Input provenance',
    '',
    `- Before: \`${report.provenance.before.fingerprint}\``,
    `- After: \`${report.provenance.after?.fingerprint || 'unavailable'}\``,
    '',
    '## Sites and results',
    '',
    '| Site | Location | Lane | Original attribute | Result |',
    '| --- | --- | --- | --- | --- |',
  ];
  const resultById = new Map(report.results.map((result) => [result.siteId, result]));
  for (const site of report.sites) {
    const location = `${site.file}:${site.attributeLocation.start.line}:${site.attributeLocation.start.column}`;
    lines.push(
      `| ${markdownCell(site.id)} | ${markdownCell(location)} | ${markdownCell(site.laneName)} | \`${markdownCell(site.attributeSource)}\` | ${resultById.get(site.id)?.status || 'Not run'} |`,
    );
  }
  const exceptional = report.results.filter(({ status }) => status !== 'Killed');
  if (report.baseline.status !== 'Passed' || exceptional.length > 0) {
    lines.push('', '## Failures requiring attention', '');
    if (report.baseline.status !== 'Passed') {
      lines.push(`- Baseline: ${markdownCell(report.baseline.reason)}`);
    }
    for (const result of exceptional) {
      lines.push(
        `- ${markdownCell(result.mutationId)} — **${result.status}**: ${markdownCell(result.reason)}`,
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function reportFileStem(mode) {
  return mode === 'event' ? 'event-handling' : 'accessibility-attributes';
}

export async function writeCampaignReports({ reportDir, report }) {
  assertCampaignReport(report);
  const stem = reportFileStem(report.mode);
  const jsonPath = path.join(reportDir, `${stem}.json`);
  const markdownPath = path.join(reportDir, `${stem}.md`);
  try {
    await writeFileAtomically(markdownPath, renderCampaignMarkdown(report));
    // JSON is the complete-report marker and is published last.
    await writeFileAtomically(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    await Promise.all([fs.rm(jsonPath, { force: true }), fs.rm(markdownPath, { force: true })]);
    throw error;
  }
  return { jsonPath, markdownPath };
}

async function removeCampaignReports(reportDir, mode) {
  const stem = reportFileStem(mode);
  await fs.mkdir(reportDir, { recursive: true });
  await Promise.all([
    fs.rm(path.join(reportDir, `${stem}.json`), { force: true }),
    fs.rm(path.join(reportDir, `${stem}.md`), { force: true }),
  ]);
}

export async function runJsxAttributeMutationCampaign({
  appDir = defaultAppDirectory,
  mode,
  reportDir,
  filters = { lanes: [], files: [], sites: [] },
  concurrency = 2,
  deadlineMs = 120_000,
  environment = process.env,
  validateManifest = assertMutationLaneManifest,
  lanes = mutationLanes,
  executeJest = executeJsxMutationJest,
  log = console.log,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const resolvedReportDir = reportDir || defaultReportDirectory(appDir, normalizedMode);
  const campaign = `jsx-attribute:${normalizedMode}`;
  const startedAt = Date.now();
  const releaseLock = await acquireMutationCampaignLock({
    appDir,
    reportDir: resolvedReportDir,
    campaign,
  });
  // Hoisted so the signal-preservation decision in finally can read it.
  let stopSignalSeen = false;
  try {
    await removeCampaignReports(resolvedReportDir, normalizedMode);
    await validateManifest({ appDir });
    const allSites = await discoverCampaignSites({ appDir, mode: normalizedMode, lanes });
    const sites = selectCampaignSites(allSites, filters, lanes);
    const testFiles = uniqueSorted(sites.flatMap(({ testFiles: owners }) => owners));
    const snapshotOptions = {
      appDir,
      campaign,
      mode: normalizedMode,
      toolingFiles: campaignToolInputFiles,
      productionFiles: productionFilesFor(lanes),
      testFiles,
      toolPackages: campaignToolPackages,
      environment,
    };
    const before = await createCampaignInputSnapshot(snapshotOptions);
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `jsx-${normalizedMode}-mutants-`),
    );
    let baseline;
    let results = [];
    let after = null;
    let afterError = null;
    try {
      log(
        `Running ${normalizedMode} baseline across ${testFiles.length} owning test files for ${sites.length} sites...`,
      );
      let baselineRun;
      try {
        baselineRun = await executeJest({
          appDir,
          mode: normalizedMode,
          testFiles,
          deadlineMs,
          outputFile: path.join(temporaryDirectory, 'baseline.json'),
          environment,
        });
      } catch (error) {
        baselineRun = {
          exitCode: null,
          signal: null,
          timedOut: false,
          durationMs: 0,
          stdoutTail: '',
          stderrTail: '',
          report: null,
          reportError: `Baseline Jest executor threw: ${error.message}`,
        };
      }
      const baselineClassification = classifyJestMutationRun(baselineRun, {
        expectedTestFiles: testFiles,
        appDir,
      });
      baseline = {
        status:
          baselineClassification.status === 'Survived'
            ? 'Passed'
            : baselineClassification.status === 'Timeout'
              ? 'Timeout'
              : 'Error',
        reason: baselineClassification.reason,
        durationMs: baselineRun.durationMs,
        process: { exitCode: baselineRun.exitCode, signal: baselineRun.signal },
        diagnostics:
          baselineClassification.status === 'Survived'
            ? null
            : { stdoutTail: baselineRun.stdoutTail, stderrTail: baselineRun.stderrTail },
      };

      if (baseline?.process?.signal) stopSignalSeen = true;
      if (baseline.status === 'Passed') {
        results = await runBoundedMutationJobs({
          jobs: sites,
          concurrency,
          runJob: (site, index) =>
            runOneMutation({
              site,
              index,
              appDir,
              mode: normalizedMode,
              deadlineMs,
              temporaryDirectory,
              executeJest,
              environment,
            }),
          log: ({ completed, total, result }) =>
            log(`[${completed}/${total}] ${result.status} ${result.siteId}`),
        });
      } else {
        log(`Baseline ${baseline.status.toLowerCase()}: ${baseline.reason}`);
      }
    } finally {
      try {
        after = await createCampaignInputSnapshot(snapshotOptions);
      } catch (error) {
        afterError = error.message;
      }
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
    if (results.some((result) => result.process?.signal)) stopSignalSeen = true;

    const inputsUnchanged = after !== null && before.fingerprint === after.fingerprint;
    const statuses = countMutationStatuses(results);
    const expectedMutationCount = sites.length;
    const passed =
      baseline.status === 'Passed' &&
      results.length === expectedMutationCount &&
      statuses.Killed === expectedMutationCount &&
      inputsUnchanged;
    const report = {
      schemaVersion: reportSchemaVersion,
      campaign,
      mode: normalizedMode,
      generatedAt: new Date().toISOString(),
      passed,
      durationMs: Date.now() - startedAt,
      configuration: {
        concurrency,
        deadlineMs,
        filters: {
          lanes: [...filters.lanes],
          files: [...filters.files],
          sites: [...filters.sites],
        },
      },
      discovery: { totalSites: allSites.length, selectedSites: sites.length, mutantsPerSite: 1 },
      expectedMutationCount,
      baseline,
      summary: { statuses, completedMutationCount: results.length },
      provenance: { before, after, afterError, inputsUnchanged },
      sites,
      results,
    };
    const reportPaths = await writeCampaignReports({ reportDir: resolvedReportDir, report });
    return { report, reportPaths };
  } finally {
    await releaseLock({ preserve: stopSignalSeen });
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.list) {
    await assertMutationLaneManifest({ appDir: options.appDir });
    const sites = selectCampaignSites(
      await discoverCampaignSites({ appDir: options.appDir, mode: options.mode }),
      options.filters,
    );
    for (const site of sites) {
      console.log(`${site.id}\t${site.laneName}\t${site.attributeSource.replaceAll(/\s+/gu, ' ')}`);
    }
    console.log(`${sites.length} selected ${options.mode} JSX attribute sites`);
    return;
  }

  const { report, reportPaths } = await runJsxAttributeMutationCampaign(options);
  console.log(
    `${options.mode} JSX attribute campaign ${report.passed ? 'passed' : 'failed'}: ` +
      `${report.summary.statuses.Killed} killed, ` +
      `${report.summary.statuses.Survived} survived, ` +
      `${report.summary.statuses.Error} errors, ` +
      `${report.summary.statuses.Timeout} timeouts.`,
  );
  console.log(`JSON report: ${reportPaths.jsonPath}`);
  console.log(`Markdown report: ${reportPaths.markdownPath}`);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  }
}

export {
  JSX_ATTRIBUTE_MUTATION_MODES,
  campaignToolInputFiles,
  campaignToolPackages,
  defaultReportDirectory,
};
