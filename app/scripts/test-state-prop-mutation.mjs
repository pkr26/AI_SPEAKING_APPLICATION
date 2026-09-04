import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import statePropCore from './state-prop-mutation-core.cjs';
import {
  assertCampaignReport,
  discoverCampaignSites,
  runOneMutation,
  parseCliArgs,
  renderCampaignMarkdown,
  selectCampaignSites,
  writeCampaignReports,
} from './run-state-prop-mutation.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptsDirectory, '..');
const {
  HOSTILE_INITIALIZER_STRING,
  HOSTILE_PROP_STRING,
  MODE_ENV,
  SITE_ENV,
  discoverStateMutationSites,
  discoverPropMutationSites,
  initializerKind,
  statePropMutationInstrumentationPlugin,
} = statePropCore;

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function transform(source, mode, relativeFile = 'src/example.tsx') {
  return babel.transformSync(source, {
    filename: path.join(appDirectory, relativeFile),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [[statePropMutationInstrumentationPlugin, { projectRoot: appDirectory, mode }]],
  }).code;
}

function stateFixture() {
  return [
    'import { useState } from "react";',
    '',
    'export function useThing(seed: string) {',
    '  const [busy, setBusy] = useState(false);',
    '  const [label, setLabel] = useState(seed);',
    '  const [total, setTotal] = useState(0);',
    '  const [note, setNote] = useState(null);',
    '  const [bag, setBag] = useState({ count: 1 });',
    '  const [lazy, setLazy] = useState(() => seed.length);',
    '  const [empty, setEmpty] = useState();',
    '  function unrelatedReset(value: number) {',
    '    return value;',
    '  }',
    '  function run() {',
    '    setBusy(true);',
    '    setLabel(seed);',
    '    unrelatedReset(3);',
    '    setTotal((current) => current + 1);',
    '    setBag((current) => ({ count: current.count + 1 }));',
    '  }',
    '  return run;',
    '}',
  ].join('\n');
}

test('state discovery finds setter calls and classified initializers for local useState hooks only', () => {
  const sites = discoverStateMutationSites(stateFixture(), { relativeFile: 'src/example.ts' });
  assert.deepEqual(
    sites.map(({ kind }) => kind),
    [
      'initializer',
      'initializer',
      'initializer',
      'initializer',
      'initializer',
      'initializer',
      'initializer',
      'setter',
      'setter',
      'setter',
      'setter',
    ],
  );
  const initializers = sites.filter(({ kind }) => kind === 'initializer');
  assert.deepEqual(
    initializers.map(({ initializerKind: kind }) => kind),
    ['boolean', 'expression', 'number', 'null', 'object', 'arrow', 'no-arg'],
  );
  assert.deepEqual(
    initializers.map(({ mutation }) => mutation),
    [
      'force the initial state to true',
      'force the initial state to undefined',
      'force the initial state to 1',
      'force the initial state to false',
      'force the initial state to an empty object',
      'force the lazy initializer to () => undefined',
      'force the initial state to false',
    ],
  );
  const setters = sites.filter(({ kind }) => kind === 'setter');
  // unrelatedReset is a plain function, not a useState setter.
  assert.deepEqual(
    setters.map(({ setterName }) => setterName),
    ['setBusy', 'setLabel', 'setTotal', 'setBag'],
  );
  for (const site of sites) {
    assert.match(site.id, /^sp:state:src\/example\.ts:/u);
    assert.ok(site.siteSource.length > 0);
    assert.ok(site.siteLocation.start.offset < site.siteLocation.end.offset);
  }
});

test('initializer classification covers every hostile value family', () => {
  const cases = [
    ['false', 'boolean'],
    ['0', 'number'],
    ["''", 'string'],
    ['null', 'null'],
    ['undefined', 'undefined'],
    ['({ a: 1 })', 'object'],
    ['([1])', 'array'],
    ['(() => 1)', 'arrow'],
    ['seed', 'expression'],
    ['compute()', 'expression'],
  ];
  for (const [expression, kind] of cases) {
    assert.equal(
      initializerKind(parseNode(expression)),
      kind,
      `initializer ${expression} should classify as ${kind}`,
    );
  }
  assert.equal(initializerKind(null), 'no-arg');
});

function parseNode(expression) {
  const statement = babel.parseSync(`const value = ${expression};`, {
    filename: 'fixture.ts',
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
  });
  return statement.program.body[0].declarations[0].init;
}

test('state instrumentation wraps setters with no-ops and initializers with hostile defaults', () => {
  const sites = discoverStateMutationSites(stateFixture(), { relativeFile: 'src/example.ts' });
  const transformed = transform(stateFixture(), 'state', 'src/example.ts');
  assert.equal(occurrences(transformed, SITE_ENV), sites.length);
  for (const site of sites) {
    assert.equal(occurrences(transformed, site.id), 1);
  }
  assert.match(transformed, /\? void 0 : setBusy\(true\)/u);
  assert.match(transformed, /\? true : false\)/u);
  assert.match(transformed, /\? 1 : 0\)/u);
  assert.match(transformed, /\? false : null\)/u);
  assert.match(transformed, /\? \{\} : \{\s*\n\s*count: 1\s*\n\s*\}\)/u);
  assert.match(transformed, /\? \(\) => undefined : \(\) => seed\.length\)/u);
  // A no-arg useState still forces its implicit undefined to false.
  assert.match(transformed, /useState\(.*\? false : undefined\)/u);
  // unrelatedReset keeps its call shape.
  assert.match(transformed, /unrelatedReset\(3\);/u);
  assert.equal(occurrences(transformed, MODE_ENV), 0);
});

test('nested setter calls each keep their own selector', () => {
  const source = [
    'const [a, setA] = useState(0);',
    'const [b, setB] = useState(0);',
    'function run() {',
    '  setA(setB(1) + 1);',
    '}',
  ].join('\n');
  const sites = discoverStateMutationSites(source, { relativeFile: 'src/example.ts' });
  const transformed = transform(source, 'state', 'src/example.ts');
  assert.equal(sites.filter(({ kind }) => kind === 'setter').length, 2);
  assert.equal(occurrences(transformed, SITE_ENV), sites.length);
  assert.match(transformed, /void 0 : setA\(/u);
  assert.match(transformed, /void 0 : setB\(1\)/u);
});

test("prop discovery classifies every authored value kind and excludes the other campaigns' surface", () => {
  const source = [
    '<View',
    '  testID="card"',
    '  emptyTestID=""',
    '  numberOfLines={2}',
    '  zeroLines={0}',
    '  disabled={isBusy}',
    '  visible',
    '  focused={true}',
    '  off={false}',
    '  style={styles.row}',
    '  refreshControl={<RefreshControl />}',
    '  onPress={submit}',
    '  onEndReachedThreshold={0.4}',
    '  accessibilityLabel="Card"',
    '  accessible',
    '  key={item.id}',
    '/>;',
  ].join('\n');
  const sites = discoverPropMutationSites(source, { relativeFile: 'src/example.tsx' });
  assert.deepEqual(
    sites.map(({ kind, attributeName }) => `${kind}:${attributeName}`),
    [
      'string:testID',
      'string:emptyTestID',
      'number:numberOfLines',
      'number:zeroLines',
      'expression:disabled',
      'shorthand:visible',
      'boolean:focused',
      'boolean:off',
      'expression:style',
      'expression:refreshControl',
      // The event campaign excludes onEndReachedThreshold because its mutant is
      // a callback no-op; here the numeric prop itself is wiring worth forcing.
      'number:onEndReachedThreshold',
    ],
  );
  const byName = new Map(sites.map((site) => [site.attributeName, site]));
  assert.equal(byName.get('testID').mutation, 'force the prop to an empty string');
  assert.equal(byName.get('emptyTestID').mutation, `force the prop to '${HOSTILE_PROP_STRING}'`);
  assert.equal(byName.get('numberOfLines').mutation, 'force the prop to 0');
  assert.equal(byName.get('zeroLines').mutation, 'force the prop to 1');
  assert.equal(byName.get('disabled').mutation, 'remove the prop from the rendered element');
  assert.equal(byName.get('visible').mutation, 'force the implicit true to false');
  assert.equal(byName.get('focused').mutation, 'force the prop to false');
  assert.equal(byName.get('off').mutation, 'force the prop to true');
});

test('prop instrumentation forces scalar values, spreads expression removals, and preserves order', () => {
  const source =
    '<View testID="before" numberOfLines={2} disabled={busy} visible style={styles.row} testID="after" />';
  const sites = discoverPropMutationSites(source, { relativeFile: 'src/example.tsx' });
  const transformed = transform(source, 'prop');
  assert.equal(occurrences(transformed, SITE_ENV), sites.length);
  for (const site of sites) {
    assert.equal(occurrences(transformed, site.id), 1);
  }
  assert.match(transformed, /testID=\{.*\? "" : "before"\}/u);
  assert.match(transformed, /numberOfLines=\{.*\? 0 : 2\}/u);
  assert.match(transformed, /visible=\{.*\? false : true\}/u);
  assert.match(transformed, /\.\.\..*\? \{\} : \{\s*disabled: busy\s*\}\}/u);
  assert.match(transformed, /\.\.\..*\? \{\} : \{\s*style: styles\.row\s*\}\}/u);
  assert.ok(transformed.indexOf('"before"') < transformed.indexOf('disabled: busy'));
  assert.ok(transformed.indexOf('style: styles.row') < transformed.lastIndexOf('"after"'));
  assert.equal(occurrences(transformed, MODE_ENV), 0);
});

test('prop instrumentation reaches JSX attributes nested inside expression attribute values', () => {
  const source = [
    '<FlatList',
    '  data={rows}',
    '  renderItem={({ item }) => (',
    '    <HistoryRow item={item} ownerId={owner} t={t} focused style={styles.row} variant="card" />',
    '  )}',
    '  refreshControl={<RefreshControl refreshing={busy} tintColor={ink} />}',
    '/>;',
  ].join('\n');
  const sites = discoverPropMutationSites(source, { relativeFile: 'src/example.tsx' });
  const transformed = transform(source, 'prop');
  // Every discovered site — including those nested inside renderItem and
  // refreshControl values — must carry exactly one selector. Replacing an
  // expression-valued attribute during enter used to discard Babel's queued
  // visits for those nested attributes, silently no-oping their mutants.
  assert.equal(occurrences(transformed, SITE_ENV), sites.length);
  for (const site of sites) {
    assert.equal(occurrences(transformed, site.id), 1, `missing selector for ${site.id}`);
  }
  assert.ok(sites.some(({ id }) => id.includes(':expression:item:')));
  assert.ok(sites.some(({ id }) => id.includes(':expression:refreshing:')));
  assert.ok(sites.some(({ id }) => id.includes(':string:variant:')));
  // The nested removals spread inside the cloned renderItem/refreshControl
  // values (each cloned property becomes its own conditional spread), nested
  // under the outer attribute's selector rather than at the element's top
  // level.
  const renderItemIndex = transformed.indexOf('renderItem:');
  const refreshControlIndex = transformed.indexOf('refreshControl:');
  assert.ok(renderItemIndex > 0 && refreshControlIndex > renderItemIndex);
  assert.ok(transformed.indexOf('item: item') > renderItemIndex);
  assert.ok(transformed.indexOf('ownerId: owner') > renderItemIndex);
  assert.ok(transformed.indexOf('t: t') > renderItemIndex);
  assert.ok(transformed.indexOf('refreshing: busy') > refreshControlIndex);
  assert.ok(transformed.indexOf('tintColor: ink') > refreshControlIndex);
});

test('checked-in discovery is exhaustive and lane-owned for both modes', async () => {
  const stateSites = await discoverCampaignSites({ appDir: appDirectory, mode: 'state' });
  const propSites = await discoverCampaignSites({ appDir: appDirectory, mode: 'prop' });
  // 444 authored setter calls plus 150 initializers (the useState inventory),
  // including value kinds Stryker already owns on purpose. The wiring-campaign
  // close removed 17 dead defensive setter calls (settings bulk-delete
  // retraction pair, diagnostic boundary/replay/advance resets, recorder
  // discard/transfer markers) from the original 461.
  assert.equal(stateSites.length, 594);
  // 1209 expression removals, 338 string forces, 188 number forces, 51
  // shorthand flips, and 17 boolean-literal flips; the tab-bar settings glyph
  // dropped the one color prop that restated Icon's own theme-text default.
  assert.equal(propSites.length, 1803);
  for (const sites of [stateSites, propSites]) {
    assert.equal(new Set(sites.map(({ id }) => id)).size, sites.length);
    assert.ok(sites.every(({ testFiles }) => testFiles.length > 0));
    assert.ok(sites.every(({ laneName }) => typeof laneName === 'string' && laneName.length > 0));
  }
  const stateKinds = countBy(stateSites, 'kind');
  assert.deepEqual(stateKinds, { initializer: 150, setter: 444 });
  const propKinds = countBy(propSites, 'kind');
  assert.deepEqual(propKinds, {
    boolean: 17,
    expression: 1209,
    number: 188,
    shorthand: 51,
    string: 338,
  });
  // The .ts hook file participates in state mode only.
  assert.ok(stateSites.some(({ file }) => file === 'src/lib/use-reduce-motion.ts'));
  assert.ok(propSites.every(({ file }) => file.endsWith('.tsx')));
  // The home lane keeps its five data-refresh/retry/CTA handlers out of prop
  // mode (event mode owns them) while its prop wiring joins this campaign.
  assert.ok(
    selectCampaignSites(propSites, { lanes: ['home'], files: [], sites: [], kinds: [] }).length > 0,
  );
});

function countBy(sites, key) {
  const counts = {};
  for (const site of sites) counts[site[key]] = (counts[site[key]] || 0) + 1;
  return counts;
}

test('CLI requires a valid mode and bounds filters, kinds, resources, and report paths', () => {
  const externalReport = path.join(os.tmpdir(), 'sp-state-report');
  const parsed = parseCliArgs(
    [
      '--mode=state',
      '--lane=home',
      '--file',
      'src/app/home.tsx',
      '--site=sp:state:one',
      '--kind=setter',
      '--concurrency=12',
      '--deadline-ms',
      '2500',
      '--report-dir',
      externalReport,
    ],
    { appDir: appDirectory, environment: {} },
  );
  assert.equal(parsed.mode, 'state');
  assert.deepEqual(parsed.filters.lanes, ['home']);
  assert.deepEqual(parsed.filters.kinds, ['setter']);
  assert.equal(parsed.concurrency, 12);
  assert.equal(parsed.deadlineMs, 2500);
  assert.equal(parsed.reportDir, externalReport);
  const bareHelp = parseCliArgs(['--help'], { appDir: appDirectory, environment: {} });
  assert.equal(bareHelp.help, true);
  assert.equal(bareHelp.mode, null);
  assert.equal(bareHelp.reportDir, null);
  assert.throws(
    () => parseCliArgs(['--mode=unknown'], { appDir: appDirectory, environment: {} }),
    /must be one of state, prop/u,
  );
  assert.throws(
    () =>
      parseCliArgs(['--mode=state', '--concurrency=13'], {
        appDir: appDirectory,
        environment: {},
      }),
    /between 1 and 12/u,
  );
  assert.throws(
    () =>
      parseCliArgs(['--mode=prop', '--kind=setter'], { appDir: appDirectory, environment: {} })
        .mode &&
      selectCampaignSites([{ id: 'x', kind: 'string', laneName: 'ui', file: 'src/a.tsx' }], {
        lanes: [],
        files: [],
        sites: [],
        kinds: ['setter'],
      }),
    /intersect to zero sites/u,
  );
});

test('report validation is strict about kinds, results, and the all-killed policy', async () => {
  const site = {
    id: 'sp:state:src/demo.tsx:setter:setBusy:3:2-3:16',
    mode: 'state',
    kind: 'setter',
    file: 'src/demo.tsx',
    laneName: 'demo',
    setterName: 'setBusy',
    siteLocation: { start: { line: 3, column: 2 }, end: { line: 3, column: 16 } },
    siteSource: 'setBusy(true)',
    mutation: 'replace the setter call with a no-op',
  };
  const report = {
    schemaVersion: 1,
    campaign: 'state-prop:state',
    mode: 'state',
    passed: true,
    durationMs: 10,
    discovery: { totalSites: 1, selectedSites: 1, mutantsPerSite: 1 },
    expectedMutationCount: 1,
    baseline: { status: 'Passed', reason: 'clean' },
    summary: {
      statuses: {
        Killed: 1,
        Survived: 0,
        Error: 0,
        Timeout: 0,
        ExpectedTimeout: 0,
        ExpectedError: 0,
        ExpectedEquivalent: 0,
      },
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
  assert.equal(assertCampaignReport(report), report);
  assert.match(renderCampaignMarkdown(report), /Result: \*\*PASS\*\*/u);
  assert.match(renderCampaignMarkdown(report), /State Wiring Mutant Campaign/u);

  const survivor = structuredClone(report);
  survivor.results[0].status = 'Survived';
  survivor.summary.statuses = {
    Killed: 0,
    Survived: 1,
    Error: 0,
    Timeout: 0,
    ExpectedTimeout: 0,
    ExpectedError: 0,
    ExpectedEquivalent: 0,
  };
  assert.throws(
    () => assertCampaignReport(survivor),
    /passed flag violates the strict killed-or-reviewed-timeout policy/u,
  );

  const wrongKind = structuredClone(report);
  wrongKind.sites[0].kind = 'expression';
  assert.throws(() => assertCampaignReport(wrongKind), /invalid state site kind/u);

  const propIdentity = structuredClone(report);
  propIdentity.mode = 'prop';
  propIdentity.campaign = 'state-prop:prop';
  propIdentity.sites[0].kind = 'expression';
  assert.doesNotThrow(() => assertCampaignReport(propIdentity));

  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sp-report-test-'));
  try {
    const paths = await writeCampaignReports({ reportDir, report });
    assert.equal(JSON.parse(await fs.readFile(paths.jsonPath, 'utf8')).passed, true);
    assert.match(await fs.readFile(paths.markdownPath, 'utf8'), /Sites and results/u);
    assert.match(
      await fs.readFile(paths.markdownPath, 'utf8'),
      /replace the setter call with a no-op/u,
    );
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
});

test('hostile sentinels are stable strings shared by discovery and instrumentation', () => {
  assert.equal(HOSTILE_INITIALIZER_STRING, 'StrykerStateForce');
  assert.equal(HOSTILE_PROP_STRING, 'StrykerPropForce');
  const emptyString = discoverPropMutationSites('<View label="" />;', {
    relativeFile: 'src/example.tsx',
  });
  assert.equal(emptyString[0].hostileValue, `force the prop to '${HOSTILE_PROP_STRING}'`);
});

test('expected-timeout pins validate fail-closed and excuse only detected timeouts', async () => {
  const { expectedTimeoutSites, validateExpectedTimeoutPins } =
    await import('./state-prop-expectations.mjs');
  const allSites = await discoverCampaignSites({ appDir: appDirectory, mode: 'state' });
  // The pinned entries must always match the current production source exactly
  // (mode-scoped: prop-mode pins cannot match state discovery and vice versa).
  const stateEntries = expectedTimeoutSites.filter((entry) => entry.id.startsWith('sp:state:'));
  assert.deepEqual(validateExpectedTimeoutPins(allSites, stateEntries), []);

  const driftedSite = { ...allSites[0], siteSource: 'mutated source' };
  const drifted = validateExpectedTimeoutPins(
    [driftedSite, ...allSites.slice(1)],
    [
      {
        ...stateEntries[0],
        id: driftedSite.id,
      },
    ],
  );
  assert.ok(drifted.length >= 1, 'a stale pin must fail closed');

  const unknown = validateExpectedTimeoutPins(allSites, [
    { ...stateEntries[0], id: 'sp:state:src/gone.tsx:setter:setX:1:1-1:2' },
  ]);
  assert.match(unknown.join('\n'), /matches no discovered site/u);

  // Mapping rule: a Timeout on an expected site still requires evidence.
  const mapped = await runOneMutation({
    site: { ...allSites[0], id: expectedTimeoutSites[0].id, testFiles: ['__tests__/x.tsx'] },
    index: 0,
    appDir: appDirectory,
    mode: 'state',
    deadlineMs: 1_000,
    temporaryDirectory: '.',
    executeJest: async () => ({
      exitCode: 1,
      signal: null,
      timedOut: false,
      durationMs: 1,
      stdoutTail: '',
      stderrTail: '',
      report: null,
      reportError: null,
    }),
    environment: {},
    expectedTimeouts: expectedTimeoutSites,
  });
  assert.equal(mapped.status, 'Error');

  const timedOutWithEvidence = await runOneMutation({
    site: { ...allSites[0], id: expectedTimeoutSites[0].id, testFiles: ['__tests__/x.tsx'] },
    index: 0,
    appDir: appDirectory,
    mode: 'state',
    deadlineMs: 1_000,
    temporaryDirectory: '.',
    executeJest: async () => ({
      exitCode: 1,
      signal: null,
      timedOut: true,
      durationMs: 1,
      stdoutTail: '',
      stderrTail: '',
      report: null,
      reportError: null,
    }),
    environment: {},
    expectedTimeouts: expectedTimeoutSites,
  });
  assert.equal(timedOutWithEvidence.status, 'Timeout');
});
