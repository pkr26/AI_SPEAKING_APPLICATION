import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import jsxAttributeCore from './jsx-attribute-mutation-core.cjs';
import {
  assertCampaignReport,
  discoverCampaignSites,
  parseCliArgs,
  renderCampaignMarkdown,
  selectCampaignSites,
  writeCampaignReports,
} from './run-jsx-attribute-mutation.mjs';
import {
  acquireMutationCampaignLock,
  classifyJestMutationRun,
  createCampaignInputSnapshot,
  jestFailureHasAssertionEvidence,
  resolveMutationReportDirectory,
  runBoundedMutationJobs,
} from './mutation-campaign-runtime.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptsDirectory, '..');
const {
  MODE_ENV,
  SITE_ENV,
  discoverJsxAttributeMutationSites,
  jsxAttributeMutationInstrumentationPlugin,
} = jsxAttributeCore;

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function transform(source, mode, relativeFile = 'src/example.tsx') {
  return babel.transformSync(source, {
    filename: path.join(appDirectory, relativeFile),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [[jsxAttributeMutationInstrumentationPlugin, { projectRoot: appDirectory, mode }]],
  }).code;
}

function jestReport({ appDir, testFiles, failure = null, runtime = false }) {
  const failed = failure === null ? 0 : 1;
  return {
    success: failed === 0 && !runtime,
    numFailedTestSuites: failed || runtime ? 1 : 0,
    numFailedTests: failed,
    numPassedTestSuites: failed || runtime ? 0 : 1,
    numPassedTests: failed ? 0 : 1,
    numRuntimeErrorTestSuites: runtime ? 1 : 0,
    numTotalTestSuites: 1,
    numTotalTests: runtime ? 0 : 1,
    testResults: [
      {
        name: path.join(appDir, testFiles[0]),
        status: failed || runtime ? 'failed' : 'passed',
        assertionResults: runtime
          ? []
          : [
              {
                ancestorTitles: ['owner'],
                title: 'asserts the wire',
                status: failed ? 'failed' : 'passed',
                failureMessages: failure === null ? [] : [failure],
              },
            ],
        ...(runtime ? { testExecError: { message: 'module failed' } } : {}),
      },
    ],
    wasInterrupted: false,
  };
}

function processRun(report, overrides = {}) {
  return {
    exitCode: report?.success ? 0 : 1,
    signal: null,
    timedOut: false,
    durationMs: 1,
    report,
    reportError: null,
    stdoutTail: '',
    stderrTail: '',
    ...overrides,
  };
}

function validReport(mode = 'event') {
  const site = {
    id: `jsx:${mode}:src/demo.tsx:onPress:1:3-1:21`,
    mode,
    file: 'src/demo.tsx',
    laneName: 'demo',
    attributeName: mode === 'event' ? 'onPress' : 'accessibilityLabel',
    attributeSource: mode === 'event' ? 'onPress={submit}' : 'accessibilityLabel="Submit"',
    attributeLocation: {
      start: { line: 1, column: 3, offset: 3 },
      end: { line: 1, column: 21, offset: 21 },
    },
  };
  return {
    schemaVersion: 1,
    campaign: `jsx-attribute:${mode}`,
    mode,
    passed: true,
    durationMs: 10,
    discovery: { totalSites: 1, selectedSites: 1, mutantsPerSite: 1 },
    expectedMutationCount: 1,
    baseline: { status: 'Passed', reason: 'clean' },
    summary: {
      statuses: { Killed: 1, Survived: 0, Error: 0, Timeout: 0 },
      completedMutationCount: 1,
    },
    provenance: {
      before: { fingerprint: 'same' },
      after: { fingerprint: 'same' },
      inputsUnchanged: true,
    },
    sites: [site],
    results: [{ mutationId: site.id, siteId: site.id, status: 'Killed' }],
  };
}

test('event discovery selects callback attributes but excludes numeric on-threshold props', () => {
  const source = [
    'const value = <View',
    '  onPress={submit}',
    '  onChangeText={(value: string) => save(value)}',
    '  onEndReachedThreshold={0.4}',
    '  onclick={legacy}',
    '  accessibilityLabel="Submit"',
    '/>;',
  ].join('\n');
  const sites = discoverJsxAttributeMutationSites(source, {
    relativeFile: 'src/example.tsx',
    mode: 'event',
  });
  assert.deepEqual(
    sites.map(({ attributeName }) => attributeName),
    ['onPress', 'onChangeText'],
  );
  assert.match(sites[0].id, /^jsx:event:src\/example\.tsx:onPress:/u);
  assert.equal(sites[0].attributeSource, 'onPress={submit}');
  assert.equal(sites[1].valueSource, '{(value: string) => save(value)}');
});

test('accessibility discovery covers the authored React Native attribute family only', () => {
  const source = [
    '<View accessible accessibilityLabel="Card"',
    '  accessibilityState={{ disabled }} importantForAccessibility="yes"',
    '  onPress={submit} testID="card" />;',
  ].join('\n');
  const sites = discoverJsxAttributeMutationSites(source, {
    relativeFile: 'src/example.tsx',
    mode: 'accessibility',
  });
  assert.deepEqual(
    sites.map(({ attributeName }) => attributeName),
    ['accessible', 'accessibilityLabel', 'accessibilityState', 'importantForAccessibility'],
  );
  assert.ok(sites.every(({ mutation }) => mutation.includes('remove')));
});

test('event instrumentation keeps every prop present and disconnects only the selected site', () => {
  const source = 'const value = <View onPress={submit} onBlur={() => close()} />;';
  const sites = discoverJsxAttributeMutationSites(source, {
    relativeFile: 'src/example.tsx',
    mode: 'event',
  });
  const transformed = transform(source, 'event');
  assert.equal(occurrences(transformed, SITE_ENV), 2);
  assert.equal(occurrences(transformed, sites[0].id), 1);
  assert.equal(occurrences(transformed, sites[1].id), 1);
  assert.match(transformed, /onPress=.*ignoredEventArguments/u);
  assert.match(transformed, /: submit/u);
  assert.match(transformed, /onBlur=/u);
  assert.equal(occurrences(transformed, MODE_ENV), 0);
});

test('accessibility instrumentation uses an empty selected spread and preserves source order', () => {
  const source =
    'const value = <View testID="before" accessible accessibilityLabel={label} testID="after" />;';
  const sites = discoverJsxAttributeMutationSites(source, {
    relativeFile: 'src/example.tsx',
    mode: 'accessibility',
  });
  const transformed = transform(source, 'accessibility');
  assert.equal(occurrences(transformed, SITE_ENV), 2);
  assert.equal(occurrences(transformed, sites[0].id), 1);
  assert.equal(occurrences(transformed, sites[1].id), 1);
  assert.match(transformed, /\? \{\} : \{\s*accessible: true/u);
  assert.match(transformed, /\? \{\} : \{\s*accessibilityLabel: label/u);
  assert.ok(transformed.indexOf('testID="before"') < transformed.indexOf('accessible: true'));
  assert.ok(
    transformed.indexOf('accessibilityLabel: label') < transformed.lastIndexOf('testID="after"'),
  );
});

test('checked-in discovery is exhaustive and lane-owned for both JSX modes', async () => {
  const eventSites = await discoverCampaignSites({ appDir: appDirectory, mode: 'event' });
  const accessibilitySites = await discoverCampaignSites({
    appDir: appDirectory,
    mode: 'accessibility',
  });
  assert.equal(eventSites.length, 221);
  assert.equal(accessibilitySites.length, 334);
  for (const sites of [eventSites, accessibilitySites]) {
    assert.equal(new Set(sites.map(({ id }) => id)).size, sites.length);
    assert.ok(sites.every(({ file }) => file.endsWith('.tsx')));
    assert.ok(sites.every(({ testFiles }) => testFiles.length > 0));
  }
  assert.equal(
    selectCampaignSites(eventSites, { lanes: ['home'], files: [], sites: [] }).length,
    8,
  );
});

test('CLI requires a valid mode and bounds filters, resources, and report paths', () => {
  const externalReport = path.join(os.tmpdir(), 'jsx-event-report');
  const parsed = parseCliArgs(
    [
      '--mode=event',
      '--lane=home',
      '--file',
      'src/app/home.tsx',
      '--site=jsx:event:one',
      '--concurrency=3',
      '--deadline-ms',
      '2500',
      '--report-dir',
      externalReport,
    ],
    { appDir: appDirectory, environment: {} },
  );
  assert.equal(parsed.mode, 'event');
  assert.deepEqual(parsed.filters.lanes, ['home']);
  assert.equal(parsed.concurrency, 3);
  assert.equal(parsed.deadlineMs, 2500);
  assert.equal(parsed.reportDir, externalReport);
  const bareHelp = parseCliArgs(['--help'], { appDir: appDirectory, environment: {} });
  assert.equal(bareHelp.help, true);
  assert.equal(bareHelp.mode, null);
  assert.equal(bareHelp.reportDir, null);
  assert.throws(
    () => parseCliArgs(['--mode=unknown'], { appDir: appDirectory, environment: {} }),
    /must be one of event, accessibility/u,
  );
  assert.throws(
    () =>
      parseCliArgs(['--mode=event', '--concurrency=9'], {
        appDir: appDirectory,
        environment: {},
      }),
    /between 1 and 8/u,
  );
  assert.throws(
    () => resolveMutationReportDirectory('src/report', appDirectory),
    /must be reports\/ or a descendant/u,
  );
});

test('Jest classification kills matcher and Testing Library query failures only', () => {
  const testFiles = ['__tests__/owner-test.tsx'];
  const options = { expectedTestFiles: testFiles, appDir: appDirectory };
  const passing = jestReport({ appDir: appDirectory, testFiles });
  assert.equal(classifyJestMutationRun(processRun(passing), options).status, 'Survived');

  const failed = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: 'Error: expect(jest.fn()).toHaveBeenCalled()',
  });
  const killed = classifyJestMutationRun(processRun(failed), options);
  assert.equal(killed.status, 'Killed');
  assert.deepEqual(killed.failedTestNames, ['owner > asserts the wire']);

  const testingLibraryFailure = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: 'Error: Unable to find an element with role: button',
  });
  assert.equal(
    classifyJestMutationRun(processRun(testingLibraryFailure), options).status,
    'Killed',
  );

  const rawTypeError = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: "TypeError: Cannot read properties of null (reading 'onPress')",
  });
  assert.equal(classifyJestMutationRun(processRun(rawTypeError), options).status, 'Error');

  const mixed = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: 'Error: expect(received).toBe(expected)',
  });
  mixed.testResults.push({
    name: path.join(appDirectory, '__tests__/second-owner-test.tsx'),
    status: 'failed',
    assertionResults: [
      {
        ancestorTitles: ['second owner'],
        title: 'throws raw',
        status: 'failed',
        failureMessages: ['SyntaxError: Unexpected token in JSON at position 0'],
      },
    ],
  });
  mixed.numFailedTestSuites = 2;
  mixed.numFailedTests = 2;
  mixed.numTotalTestSuites = 2;
  mixed.numTotalTests = 2;
  assert.equal(
    classifyJestMutationRun(processRun(mixed), {
      expectedTestFiles: [...testFiles, '__tests__/second-owner-test.tsx'],
      appDir: appDirectory,
    }).status,
    'Error',
  );

  assert.equal(
    jestFailureHasAssertionEvidence(['Error: expect(jest.fn()).toHaveBeenCalled()']),
    true,
  );
  assert.equal(jestFailureHasAssertionEvidence(['TypeError: callback is not a function']), false);

  const runtime = jestReport({ appDir: appDirectory, testFiles, runtime: true });
  assert.equal(classifyJestMutationRun(processRun(runtime), options).status, 'Error');
  assert.equal(
    classifyJestMutationRun(processRun(null, { timedOut: true }), options).status,
    'Timeout',
  );
});

test('bounded job execution preserves input ordering while respecting concurrency', async () => {
  let active = 0;
  let maximum = 0;
  const results = await runBoundedMutationJobs({
    jobs: [0, 1, 2, 3],
    concurrency: 2,
    runJob: async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, value % 2 === 0 ? 5 : 1));
      active -= 1;
      return value * 10;
    },
  });
  assert.deepEqual(results, [0, 10, 20, 30]);
  assert.equal(maximum, 2);
});

test('provenance fingerprints source, owning tests, tooling, and installed versions', async () => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsx-input-snapshot-test-'));
  try {
    await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(appDir, '__tests__'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'scripts'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'node_modules', 'fake-tool'), { recursive: true });
    await fs.writeFile(path.join(appDir, 'src', 'view.tsx'), '<View />\n');
    await fs.writeFile(
      path.join(appDir, '__tests__', 'view-test.tsx'),
      'test("view", () => {});\n',
    );
    await fs.writeFile(path.join(appDir, 'scripts', 'runner.mjs'), 'export {};\n');
    await fs.writeFile(
      path.join(appDir, 'node_modules', 'fake-tool', 'package.json'),
      '{"version":"1.2.3"}\n',
    );
    const options = {
      appDir,
      campaign: 'jsx-attribute:event',
      mode: 'event',
      toolingFiles: ['scripts/runner.mjs'],
      productionFiles: ['src/view.tsx'],
      testFiles: ['__tests__/view-test.tsx'],
      toolPackages: ['fake-tool'],
      environment: {},
    };
    const before = await createCampaignInputSnapshot(options);
    const same = await createCampaignInputSnapshot(options);
    assert.equal(before.fingerprint, same.fingerprint);
    assert.equal(before.toolVersions['fake-tool'], '1.2.3');
    assert.deepEqual(
      before.files.map(({ kind }) => kind),
      ['tooling', 'production', 'owningTest'],
    );

    await fs.writeFile(
      path.join(appDir, '__tests__', 'view-test.tsx'),
      'test("changed", () => {});\n',
    );
    const changed = await createCampaignInputSnapshot(options);
    assert.notEqual(before.fingerprint, changed.fingerprint);
  } finally {
    await fs.rm(appDir, { recursive: true, force: true });
  }
});

test('report validation is strict and writes Markdown before the JSON commit marker', async () => {
  const report = validReport();
  assert.equal(assertCampaignReport(report), report);
  assert.match(renderCampaignMarkdown(report), /Result: \*\*PASS\*\*/u);

  const survivor = structuredClone(report);
  survivor.results[0].status = 'Survived';
  survivor.summary.statuses = { Killed: 0, Survived: 1, Error: 0, Timeout: 0 };
  assert.throws(
    () => assertCampaignReport(survivor),
    /passed flag violates the strict all-killed policy/u,
  );

  const forgedProvenance = structuredClone(report);
  forgedProvenance.provenance.after.fingerprint = 'different';
  assert.throws(
    () => assertCampaignReport(forgedProvenance),
    /inputsUnchanged disagrees with its before\/after fingerprints/u,
  );

  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsx-report-test-'));
  try {
    const paths = await writeCampaignReports({ reportDir, report });
    assert.equal(JSON.parse(await fs.readFile(paths.jsonPath, 'utf8')).passed, true);
    assert.match(await fs.readFile(paths.markdownPath, 'utf8'), /Sites and results/u);
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
});

test('the reusable runner shares the ownership-safe app mutation lock', async () => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsx-lock-test-'));
  const lockPath = path.join(appDir, '.mutation-campaign.lock');
  try {
    const release = await acquireMutationCampaignLock({
      appDir,
      reportDir: path.join(appDir, 'reports'),
      campaign: 'jsx-attribute:event',
    });
    const owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
    assert.equal(owner.campaign, 'jsx-attribute:event');
    await assert.rejects(
      acquireMutationCampaignLock({
        appDir,
        reportDir: path.join(appDir, 'other'),
        campaign: 'jsx-attribute:accessibility',
      }),
      /Another mutation campaign/u,
    );
    await release();
    await assert.rejects(fs.access(lockPath), { code: 'ENOENT' });

    const replaced = await acquireMutationCampaignLock({
      appDir,
      reportDir: path.join(appDir, 'reports'),
      campaign: 'jsx-attribute:event',
    });
    await fs.writeFile(
      lockPath,
      `${JSON.stringify({ pid: process.pid, token: 'replacement-owner' })}\n`,
      'utf8',
    );
    await replaced();
    assert.equal(JSON.parse(await fs.readFile(lockPath, 'utf8')).token, 'replacement-owner');
  } finally {
    await fs.rm(appDir, { recursive: true, force: true });
  }
});
