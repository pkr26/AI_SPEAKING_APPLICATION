import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import conditionalRenderingCore from './conditional-rendering-core.cjs';
import {
  acquireCampaignLock,
  assertCampaignReport,
  classifyJestRun,
  discoverCampaignSites,
  parseCliArgs,
  renderCampaignMarkdown,
  resolveReportDirectory,
  writeCampaignReports,
} from './run-conditional-rendering-mutation.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptsDirectory, '..');

const {
  FORCE_ENV,
  SITE_ENV,
  STRYKER_BOOLEAN_OPERATORS,
  conditionalRenderingInstrumentationPlugin,
  discoverConditionalRenderingSites,
} = conditionalRenderingCore;

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function jestReport({ appDir, testFiles, failure = null, runtime = false }) {
  const assertionResults = [
    {
      ancestorTitles: ['owner'],
      title: 'asserts rendering',
      status: failure === null ? 'passed' : 'failed',
      failureMessages: failure === null ? [] : [failure],
    },
  ];
  const failed = failure === null ? 0 : 1;
  return {
    success: failed === 0 && !runtime,
    numFailedTestSuites: failed || runtime ? 1 : 0,
    numFailedTests: failed,
    numPassedTestSuites: failed || runtime ? 0 : 1,
    numPassedTests: failed ? 0 : 1,
    numRuntimeErrorTestSuites: runtime ? 1 : 0,
    numTotalTestSuites: 1,
    numTotalTests: 1,
    testResults: [
      {
        name: path.join(appDir, testFiles[0]),
        status: failed || runtime ? 'failed' : 'passed',
        assertionResults: runtime ? [] : assertionResults,
        ...(runtime ? { testExecError: { message: 'module load failed' } } : {}),
      },
    ],
    wasInterrupted: false,
    ...(runtime ? { numTotalTests: 0 } : {}),
  };
}

function processRun(report, overrides = {}) {
  return {
    exitCode: report?.success ? 0 : 1,
    signal: null,
    timedOut: false,
    report,
    reportError: null,
    ...overrides,
  };
}

function validCampaignReport() {
  const site = {
    id: 'cr:src/demo.tsx:1:1-1:6',
    file: 'src/demo.tsx',
    laneName: 'demo',
    predicateSource: 'ready',
    predicateLocation: {
      start: { line: 1, column: 1, offset: 1 },
      end: { line: 1, column: 6, offset: 6 },
    },
  };
  const result = (forcedValue) => ({
    mutationId: `${site.id}:${String(forcedValue)}`,
    siteId: site.id,
    forcedValue,
    status: 'Killed',
  });
  return {
    schemaVersion: 1,
    passed: true,
    durationMs: 10,
    discovery: { totalSites: 1, selectedSites: 1, forcedMutantsPerSite: 2 },
    expectedMutationCount: 2,
    baseline: { status: 'Passed', reason: 'clean' },
    summary: {
      statuses: { Killed: 2, Survived: 0, Error: 0, Timeout: 0 },
      completedMutationCount: 2,
    },
    provenance: {
      before: { fingerprint: 'before' },
      after: { fingerprint: 'before' },
      inputsUnchanged: true,
    },
    sites: [site],
    results: [result(true), result(false)],
  };
}

test('discovery covers render-context ternaries while matching Stryker 9.6.1 exclusions', () => {
  assert.deepEqual(STRYKER_BOOLEAN_OPERATORS, [
    '!=',
    '!==',
    '&&',
    '<',
    '<=',
    '==',
    '===',
    '>',
    '>=',
    '||',
  ]);
  const source = [
    'const arm = ready ? <A /> : null;',
    'const prop = <A label={choice ? "yes" : "no"} />;',
    'const ordinary = ready ? 1 : 2;',
    'const nullish = <A>{(left ?? right) ? "x" : "y"}</A>;',
    ...STRYKER_BOOLEAN_OPERATORS.map(
      (operator, index) =>
        `const excluded${index} = <A>{(left ${operator} right) ? "x" : "y"}</A>;`,
    ),
  ].join('\n');

  const sites = discoverConditionalRenderingSites(source, {
    relativeFile: 'src/example.tsx',
  });
  assert.equal(sites.length, 3);
  assert.deepEqual(
    sites.map(({ predicateSource }) => predicateSource),
    ['ready', 'choice', 'left ?? right'],
  );
  assert.equal(sites[0].id, 'cr:src/example.tsx:1:12-1:17');
  assert.deepEqual(sites[0].predicateLocation, {
    start: { line: 1, column: 12, offset: 12 },
    end: { line: 1, column: 17, offset: 17 },
  });
  assert.deepEqual(sites[0].renderContext, {
    jsxExpressionAncestor: false,
    jsxOrNullArm: true,
  });
  assert.deepEqual(sites[1].renderContext, {
    jsxExpressionAncestor: true,
    jsxOrNullArm: false,
  });
});

test('instrumentation selects every nested source predicate exactly once after Babel requeue', () => {
  const source = 'const value = <View>{outer ? (inner ? "a" : "b") : null}</View>;';
  const sites = discoverConditionalRenderingSites(source, {
    relativeFile: 'src/demo.tsx',
  });
  assert.equal(sites.length, 2);

  const transformed = babel.transformSync(source, {
    filename: path.join(appDirectory, 'src', 'demo.tsx'),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [[conditionalRenderingInstrumentationPlugin, { projectRoot: appDirectory }]],
  }).code;
  for (const site of sites) assert.equal(occurrences(transformed, site.id), 1);
  assert.equal(occurrences(transformed, SITE_ENV), 2);
  assert.equal(occurrences(transformed, FORCE_ENV), 2);
  assert.match(transformed, /: outer\) \?/);
  assert.match(transformed, /: inner\) \?/);

  const generatedTernaryPlugin = ({ types }) => ({
    visitor: {
      JSXExpressionContainer(expressionPath) {
        expressionPath.node.expression = types.conditionalExpression(
          types.identifier('generatedByExpo'),
          types.stringLiteral('yes'),
          types.stringLiteral('no'),
        );
      },
    },
  });
  const generatedOutput = babel.transformSync('const value = <View>{"source"}</View>;', {
    filename: path.join(appDirectory, 'src', 'generated.tsx'),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      generatedTernaryPlugin,
      [conditionalRenderingInstrumentationPlugin, { projectRoot: appDirectory }],
    ],
  }).code;
  assert.equal(occurrences(generatedOutput, SITE_ENV), 0);
});

test('the checked-in campaign discovers the expected 115 sites and 230 forced mutants', async () => {
  const sites = await discoverCampaignSites({ appDir: appDirectory });
  // Eight new ternary sites shipped with the audit remediation (tab-bar lock
  // gating, chip markers, meter gating, submit-reveal wrappers); the deleted
  // orphaned attempt screen contributed the two sites this count dropped by.
  assert.equal(sites.length, 115);
  assert.equal(sites.length * 2, 230);
  assert.equal(new Set(sites.map(({ id }) => id)).size, sites.length);
  assert.ok(sites.every(({ file }) => file.endsWith('.tsx')));
  assert.ok(sites.every(({ testFiles }) => testFiles.length > 0));
});

test('classification kills only assertion failures and preserves zero-failure runs', () => {
  const testFiles = ['__tests__/owner-test.tsx'];
  const options = { expectedTestFiles: testFiles, appDir: appDirectory };
  const passing = jestReport({ appDir: appDirectory, testFiles });
  assert.equal(classifyJestRun(processRun(passing), options).status, 'Survived');

  const assertionFailure = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: 'Expected: visible; Received: hidden',
  });
  const killed = classifyJestRun(processRun(assertionFailure), options);
  assert.equal(killed.status, 'Killed');
  assert.deepEqual(killed.failedTestNames, ['owner > asserts rendering']);

  const runtimeFailure = jestReport({
    appDir: appDirectory,
    testFiles,
    runtime: true,
  });
  assert.equal(classifyJestRun(processRun(runtimeFailure), options).status, 'Error');
  assert.equal(
    classifyJestRun(processRun(null, { reportError: 'missing JSON' }), options).status,
    'Error',
  );
  assert.equal(
    classifyJestRun(processRun(passing, { signal: 'SIGTERM' }), options).status,
    'Error',
  );
});

test('classification separates subprocess and Jest assertion timeouts', () => {
  const testFiles = ['__tests__/owner-test.tsx'];
  const options = { expectedTestFiles: testFiles, appDir: appDirectory };
  const assertionTimeout = jestReport({
    appDir: appDirectory,
    testFiles,
    failure: 'Exceeded timeout of 30000 ms for a test.',
  });
  assert.equal(classifyJestRun(processRun(assertionTimeout), options).status, 'Timeout');
  assert.equal(
    classifyJestRun(processRun(null, { timedOut: true, reportError: 'missing JSON' }), options)
      .status,
    'Timeout',
  );
});

test('CLI parsing validates filters, bounded resources, and safe report paths', () => {
  const externalReport = path.join(os.tmpdir(), 'conditional-report');
  const parsed = parseCliArgs(
    [
      '--lane=home',
      '--lane',
      'history',
      '--file',
      'src/app/home.tsx',
      '--site=cr:one',
      '--concurrency',
      '3',
      '--deadline-ms=2500',
      '--report-dir',
      externalReport,
    ],
    { appDir: appDirectory, environment: {} },
  );
  assert.deepEqual(parsed.filters.lanes, ['history', 'home']);
  assert.deepEqual(parsed.filters.files, ['src/app/home.tsx']);
  assert.deepEqual(parsed.filters.sites, ['cr:one']);
  assert.equal(parsed.concurrency, 3);
  assert.equal(parsed.deadlineMs, 2500);
  assert.equal(parsed.reportDir, externalReport);

  assert.throws(
    () => parseCliArgs(['--concurrency', '9'], { appDir: appDirectory, environment: {} }),
    /between 1 and 8/,
  );
  assert.throws(
    () => parseCliArgs(['--deadline-ms', '999'], { appDir: appDirectory, environment: {} }),
    /between 1000/,
  );
  assert.throws(
    () => parseCliArgs(['--file', '/tmp/source.tsx'], { appDir: appDirectory, environment: {} }),
    /relative to the app directory/,
  );
  assert.throws(
    () => resolveReportDirectory('src/generated-report', appDirectory),
    /must be reports\//,
  );
  assert.equal(
    resolveReportDirectory('reports/mutation/conditional-rendering', appDirectory),
    path.join(appDirectory, 'reports', 'mutation', 'conditional-rendering'),
  );
});

test('report validation enforces strict all-killed policy and writes both formats', async () => {
  const report = validCampaignReport();
  assert.equal(assertCampaignReport(report), report);
  assert.match(renderCampaignMarkdown(report), /Result: \*\*PASS\*\*/);

  const falsePass = structuredClone(report);
  falsePass.results[0].status = 'Survived';
  falsePass.summary.statuses = {
    Killed: 1,
    Survived: 1,
    Error: 0,
    Timeout: 0,
  };
  assert.throws(
    () => assertCampaignReport(falsePass),
    /passed flag violates the strict all-killed policy/,
  );

  const mismatchedForce = structuredClone(report);
  mismatchedForce.results[1].forcedValue = true;
  assert.throws(() => assertCampaignReport(mismatchedForce), /Mutation result ID is inconsistent/);

  const incompleteFalsePass = structuredClone(report);
  incompleteFalsePass.results.pop();
  incompleteFalsePass.summary.statuses.Killed = 1;
  incompleteFalsePass.summary.completedMutationCount = 1;
  assert.throws(
    () => assertCampaignReport(incompleteFalsePass),
    /passed flag violates the strict all-killed policy/,
  );

  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conditional-rendering-report-test-'));
  try {
    const paths = await writeCampaignReports({ reportDir, report });
    const writtenJson = JSON.parse(await fs.readFile(paths.jsonPath, 'utf8'));
    const writtenMarkdown = await fs.readFile(paths.markdownPath, 'utf8');
    assert.equal(writtenJson.passed, true);
    assert.match(writtenMarkdown, /Sites and results/);
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
});

test('the conditional campaign shares an ownership-safe app mutation lock', async () => {
  const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conditional-rendering-lock-test-'));
  const lockPath = path.join(appDir, '.mutation-campaign.lock');
  try {
    const release = await acquireCampaignLock(appDir, path.join(appDir, 'reports'));
    const owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
    assert.equal(owner.campaign, 'conditional-rendering');
    await assert.rejects(
      acquireCampaignLock(appDir, path.join(appDir, 'other-reports')),
      /Another mutation campaign/,
    );
    await release();
    await assert.rejects(fs.access(lockPath), { code: 'ENOENT' });

    const releaseReplaced = await acquireCampaignLock(appDir, path.join(appDir, 'reports'));
    await fs.writeFile(
      lockPath,
      `${JSON.stringify({ pid: process.pid, token: 'replacement-owner' })}\n`,
      'utf8',
    );
    await releaseReplaced();
    assert.equal(JSON.parse(await fs.readFile(lockPath, 'utf8')).token, 'replacement-owner');
  } finally {
    await fs.rm(appDir, { recursive: true, force: true });
  }
});
