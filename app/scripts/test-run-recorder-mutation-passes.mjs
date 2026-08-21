import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  countRecorderSourceLines,
  RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
  RECORDER_SOURCE_FILE,
  resolveRecorderMutationPlan,
} from './recorder-mutation-plan.mjs';
import {
  createRecorderMutationPassInvocation,
  RECORDER_MUTATION_HTML_FILE,
  RECORDER_MUTATION_OUTCOME_FILE,
  RECORDER_MUTATION_PASS_SIDECAR_FILE,
  RECORDER_MUTATION_REPORT_FILE,
  runRecorderMutationPasses,
  terminateRecorderMutationProcessTree,
} from './run-recorder-mutation-passes.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptsDirectory, '..');

async function currentPlan() {
  const source = await fs.readFile(path.join(appDir, RECORDER_SOURCE_FILE), 'utf8');
  return resolveRecorderMutationPlan({ sourceLineCount: countRecorderSourceLines(source) });
}

function fixedFingerprint(character = 'a') {
  const fingerprint = character.repeat(64);
  return async () => ({ fingerprint, provenance: { fingerprint } });
}

async function createCorruptibleManifestRun(t, character) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-manifest-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const plan = await currentPlan();
  const common = {
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '2',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '2',
    },
    passConcurrency: 1,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint(character),
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    validateMergedReport: async () => {},
    renderReportHtml: async () => '<!doctype html><html></html>',
  };
  const first = await runRecorderMutationPasses({
    ...common,
    runPass: async ({ pass, reportPath }) => {
      if (pass.key === plan.passes[1].key) return 8;
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  });
  assert.equal(first.exitCode, 1);
  return {
    first,
    rerun: () =>
      runRecorderMutationPasses({
        ...common,
        runPass: async () => {
          throw new Error('invalid manifest must fail before pass execution');
        },
      }),
  };
}

const fakeMergedReport = Object.freeze({ schemaVersion: '1', files: {}, testFiles: {} });
const fakeSidecar = Object.freeze({ schemaVersion: 1, passCount: 5 });
const fakeSeedResult = Object.freeze({
  report: { kind: 'killed-only-seed', mutants: ['killed-signature'] },
  audit: { kind: 'seed-audit', universeCount: 2, seededCount: 1 },
  universeSignatures: ['killed-signature', 'executed-signature'],
  seededSignatures: ['killed-signature'],
});

function createFakeKilledSeed({ passReports }) {
  assert.equal(passReports.length, 4);
  assert.ok(passReports.every(({ pass }) => pass.passName !== 'integration'));
  return structuredClone(fakeSeedResult);
}

function normalizeFakeIncremental({ rawReport, seedResult, integrationPass }) {
  assert.equal(rawReport.kind, 'incremental-raw');
  assert.deepEqual(seedResult.seededSignatures, ['killed-signature']);
  assert.equal(integrationPass.passName, 'integration');
  return {
    report: { kind: 'normalized-integration', mutants: ['executed-signature'] },
    skippedDuePriorKillSignatures: ['killed-signature'],
    audit: {
      kind: 'normalization-audit',
      rawStatusCounts: { Killed: 1, Survived: 1 },
      observationStatusCounts: { NoCoverage: 1, Survived: 1 },
      seededReuse: [{ signature: 'killed-signature' }],
      strippedReferences: [{ signature: 'killed-signature', references: ['cheap-test'] }],
    },
  };
}

test('physical source line counting excludes a terminal newline', () => {
  assert.equal(countRecorderSourceLines('one\n'), 1);
  assert.equal(countRecorderSourceLines('one\r\ntwo\r\n'), 2);
  assert.equal(countRecorderSourceLines('one\rtwo\r'), 2);
  assert.equal(countRecorderSourceLines('one\ntwo'), 2);
});

test('a pass invocation selects one owned test, one exact range, and a unique temp directory', async () => {
  const plan = await currentPlan();
  assert.equal(plan.passes.length, 5);
  const pass = plan.passes[1];
  const controller = new AbortController();
  const invocation = createRecorderMutationPassInvocation({
    appDir,
    childConcurrency: 4,
    environment: { SENTINEL: 'kept' },
    pass,
    passReportDir: '/tmp/recorder-pass-report',
    logPath: '/tmp/recorder-pass-report/stryker.log',
    signal: controller.signal,
    tempDirName: '.stryker-recorder-unique-pass-tmp',
  });
  assert.deepEqual(invocation.args.slice(-4), [
    '--mutate',
    `${RECORDER_SOURCE_FILE}:1-${plan.sourceLineCount}`,
    '--tempDirName',
    '.stryker-recorder-unique-pass-tmp',
  ]);
  assert.equal(invocation.options.environment.MUTATION_LANE, 'recorder');
  assert.equal(invocation.options.environment.MUTATION_TEST_FILES, pass.testFile);
  assert.equal(invocation.options.environment.MUTATION_TEST_FILES.includes(','), false);
  assert.equal(invocation.options.environment.MUTATION_CONCURRENCY, '4');
  assert.equal(invocation.options.environment.MUTATION_REPORT_DIR, '/tmp/recorder-pass-report');
  assert.equal(invocation.options.environment.SENTINEL, 'kept');
  assert.equal(invocation.options.logPath, '/tmp/recorder-pass-report/stryker.log');

  const incremental = createRecorderMutationPassInvocation({
    appDir,
    childConcurrency: 4,
    environment: {},
    incrementalFile: '/tmp/integration-attempt/incremental-working.json',
    logPath: '/tmp/integration-attempt/stryker.log',
    mode: RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
    pass: plan.passes.at(-1),
    passReportDir: '/tmp/integration-attempt',
    signal: controller.signal,
    tempDirName: '.stryker-recorder-integration-tmp',
  });
  assert.deepEqual(incremental.args.slice(-5), [
    '--coverageAnalysis',
    'off',
    '--incremental',
    '--incrementalFile',
    '/tmp/integration-attempt/incremental-working.json',
  ]);
  assert.equal(incremental.args.includes('--force'), false);
});

test('fast cheap barrier gives sentinel and integration the full worker budget', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-incremental-runner-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const expectedArtifactDir = path.join(reportDir, 'recorder-pass-runs', 'a'.repeat(64));
  const orphanSeedDir = path.join(expectedArtifactDir, 'incremental-seed');
  await fs.mkdir(orphanSeedDir, { recursive: true });
  await fs.writeFile(path.join(orphanSeedDir, 'killed-only-seed.json'), '{"orphan":true}\n');
  await fs.writeFile(path.join(orphanSeedDir, 'seed-audit.json'), '{"orphan":true}\n');
  const calls = [];
  let activeCheap = 0;
  let maxActiveCheap = 0;
  let completedFastCheap = 0;
  let completedCheap = 0;
  let cheapEntered = 0;
  let releaseCheap;
  const cheapBarrier = new Promise((resolve) => {
    releaseCheap = resolve;
  });
  const mergePassData = ({ passReports }) => {
    assert.equal(passReports.length, 5);
    assert.ok(passReports.slice(0, 4).every((entry) => entry.mode === undefined));
    const integration = passReports.at(-1);
    assert.equal(integration.mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
    assert.deepEqual(integration.skippedDuePriorKillSignatures, ['killed-signature']);
    assert.equal(integration.report.kind, 'normalized-integration');
    return { report: fakeMergedReport, sidecar: fakeSidecar };
  };
  const options = {
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '4',
      MUTATION_RECORDER_TOTAL_WORKERS: '4',
    },
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('a'),
    createKilledSeed: createFakeKilledSeed,
    normalizeIncrementalReport: normalizeFakeIncremental,
    mergePassData,
    validateMergedReport: async () => {},
    renderReportHtml: async () => '<!doctype html><html></html>',
  };
  const first = await runRecorderMutationPasses({
    ...options,
    runPass: async ({ childConcurrency, incrementalFile, mode, pass, reportPath }) => {
      calls.push({ childConcurrency, incrementalFile, mode, passName: pass.passName });
      if (pass.passName !== 'component-sentinels' && pass.passName !== 'integration') {
        assert.equal(childConcurrency, 1);
        activeCheap += 1;
        maxActiveCheap = Math.max(maxActiveCheap, activeCheap);
        cheapEntered += 1;
        if (cheapEntered === 3) releaseCheap();
        await cheapBarrier;
        activeCheap -= 1;
        completedFastCheap += 1;
        completedCheap += 1;
        await fs.writeFile(reportPath, JSON.stringify({ kind: 'cheap-raw', key: pass.key }));
        return 0;
      }
      if (pass.passName === 'component-sentinels') {
        assert.equal(completedFastCheap, 3);
        assert.equal(childConcurrency, 4);
        completedCheap += 1;
        await fs.writeFile(reportPath, JSON.stringify({ kind: 'cheap-raw', key: pass.key }));
        return 0;
      }
      assert.equal(completedCheap, 4);
      assert.equal(childConcurrency, 4);
      assert.equal(mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
      assert.equal(JSON.parse(await fs.readFile(incrementalFile, 'utf8')).kind, 'killed-only-seed');
      const cumulative = { kind: 'incremental-raw', mutants: ['killed', 'executed'] };
      await fs.writeFile(incrementalFile, JSON.stringify(cumulative));
      await fs.writeFile(reportPath, JSON.stringify(cumulative));
      return 0;
    },
  });
  assert.equal(first.exitCode, 0);
  assert.equal(maxActiveCheap, 3);
  assert.deepEqual(
    calls.map(({ childConcurrency }) => childConcurrency),
    [1, 1, 1, 4, 4],
  );
  const manifest = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  assert.equal(manifest.incrementalSeed.seededCount, 1);
  assert.equal(manifest.incrementalSeed.universeCount, 2);
  assert.match(manifest.incrementalSeed.reportSha256, /^[a-f0-9]{64}$/);
  assert.ok(
    (await fs.readdir(orphanSeedDir)).some((name) => name.includes('.corrupt-')),
    'orphaned seed evidence should be archived before deterministic regeneration',
  );
  assert.ok(
    manifest.passes.slice(0, 3).every(({ attempts }) => attempts[0].childConcurrency === 1),
  );
  assert.equal(manifest.passes[3].attempts[0].childConcurrency, 4);
  const integrationAttempt = manifest.passes.at(-1).attempts[0];
  assert.equal(integrationAttempt.childConcurrency, 4);
  assert.equal(integrationAttempt.mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
  for (const field of [
    'seedInputSha256',
    'rawReportSha256',
    'incrementalWorkingSha256',
    'reportSha256',
    'normalizationAuditSha256',
  ]) {
    assert.match(integrationAttempt[field], /^[a-f0-9]{64}$/);
  }
  const sidecar = JSON.parse(
    await fs.readFile(path.join(reportDir, RECORDER_MUTATION_PASS_SIDECAR_FILE), 'utf8'),
  );
  assert.equal(sidecar.incrementalDominance.seededCount, 1);
  assert.equal(sidecar.incrementalDominance.runFingerprint, 'a'.repeat(64));
  assert.equal(
    sidecar.incrementalDominance.artifactRoot,
    path.join('recorder-pass-runs', 'a'.repeat(64)),
  );
  assert.deepEqual(sidecar.incrementalDominance.rawStatusCounts, { Killed: 1, Survived: 1 });
  assert.match(sidecar.incrementalDominance.normalizationAuditSha256, /^[a-f0-9]{64}$/);

  await fs.writeFile(
    path.join(first.artifactDir, manifest.incrementalSeed.reportPath),
    '{"corrupt":true}\n',
  );

  const resumed = await runRecorderMutationPasses({
    ...options,
    runPass: async () => {
      throw new Error('hash-valid deterministic resume must not rerun a pass');
    },
  });
  assert.equal(resumed.exitCode, 0);
  assert.equal(resumed.completedPasses.length, 5);
  const resumedManifest = JSON.parse(await fs.readFile(resumed.manifestPath, 'utf8'));
  assert.equal(resumedManifest.incrementalSeed.generation, 2);
});

test('integration seed-copy setup failure is persisted and returns one without publishing', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-seed-copy-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const fingerprint = 'b'.repeat(64);
  const integrationAttemptDir = path.join(
    reportDir,
    'recorder-pass-runs',
    fingerprint,
    'passes',
    '05-full-source-integration',
    'attempt-001',
  );
  await fs.mkdir(integrationAttemptDir, { recursive: true });
  await fs.writeFile(path.join(integrationAttemptDir, 'incremental-working.json'), 'occupied');
  const calls = [];
  const result = await runRecorderMutationPasses({
    appDir,
    reportDir,
    environment: { MUTATION_CONCURRENCY: '4', MUTATION_RECORDER_TOTAL_WORKERS: '4' },
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('b'),
    createKilledSeed: createFakeKilledSeed,
    normalizeIncrementalReport: normalizeFakeIncremental,
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    validateMergedReport: async () => {},
    renderReportHtml: async () => '<!doctype html><html></html>',
    runPass: async ({ pass, reportPath }) => {
      calls.push(pass.passName);
      await fs.writeFile(reportPath, JSON.stringify({ kind: 'cheap-raw', key: pass.key }));
      return 0;
    },
  });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(calls.toSorted(), [
    'audio-owner-contract',
    'component-sentinels',
    'pure-contract',
    'recovery-loop-contract',
  ]);
  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.status, 'failed');
  assert.equal(manifest.passes.at(-1).status, 'failed');
  assert.equal(manifest.passes.at(-1).attempts[0].phase, 'setup');
  assert.match(manifest.passes.at(-1).attempts[0].error, /EEXIST/);
  await assert.rejects(fs.access(path.join(reportDir, RECORDER_MUTATION_REPORT_FILE)), /ENOENT/);
});

test('parallel stage manifest rejection aborts and awaits every sibling', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-stage-reject-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  let entered = 0;
  let releaseFirst;
  const allEntered = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const siblingsSettled = [];
  let rejectedWrites = 0;
  let rejectManifestWrites = false;
  const result = await runRecorderMutationPasses({
    appDir,
    reportDir,
    environment: { MUTATION_CONCURRENCY: '4', MUTATION_RECORDER_TOTAL_WORKERS: '4' },
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('4'),
    writeManifest: async (manifestPath, snapshot) => {
      if (snapshot.passes.some(({ status }) => status === 'completed')) {
        rejectManifestWrites = true;
      }
      if (rejectManifestWrites && rejectedWrites < 2) {
        rejectedWrites += 1;
        throw new Error('injected manifest write failure');
      }
      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(manifestPath, `${JSON.stringify(snapshot)}\n`);
    },
    runPass: async ({ pass, reportPath, signal }) => {
      entered += 1;
      if (entered === 3) releaseFirst();
      await allEntered;
      if (pass.passName === 'pure-contract') {
        await fs.writeFile(reportPath, JSON.stringify({ kind: 'cheap-raw' }));
        return 0;
      }
      return new Promise((resolve) => {
        signal.addEventListener(
          'abort',
          () => {
            siblingsSettled.push(pass.passName);
            resolve(143);
          },
          { once: true },
        );
      });
    },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(rejectedWrites, 2);
  assert.equal(siblingsSettled.length, 2);
  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.status, 'failed');
  assert.match(manifest.validationError, /injected manifest write failure/);
});

test('failed runs preserve evidence and resume only unfinished passes before atomic publication', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-runner-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await fs.mkdir(reportDir, { recursive: true });
  const priorCanonical = {
    [RECORDER_MUTATION_REPORT_FILE]: 'prior json',
    [RECORDER_MUTATION_HTML_FILE]: 'prior html',
    [RECORDER_MUTATION_PASS_SIDECAR_FILE]: 'prior sidecar',
  };
  await Promise.all(
    Object.entries(priorCanonical).map(([fileName, contents]) =>
      fs.writeFile(path.join(reportDir, fileName), contents),
    ),
  );
  const plan = await currentPlan();
  const firstCalls = [];
  let active = 0;
  let maxActive = 0;
  const first = await runRecorderMutationPasses({
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '4',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '4',
    },
    passConcurrency: 1,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('c'),
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    renderReportHtml: async () => '<!doctype html><html><body>Recorder</body></html>',
    runPass: async ({ logPath, pass, passReportDir, reportPath, tempDirName }) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      firstCalls.push({ pass, passReportDir, tempDirName });
      await fs.writeFile(logPath, `attempted ${pass.key}\n`);
      await Promise.resolve();
      active -= 1;
      if (pass.key === plan.passes[1].key) return 7;
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  });
  assert.equal(first.exitCode, 1);
  assert.equal(maxActive, 1);
  assert.deepEqual(
    firstCalls.map(({ pass }) => pass.key),
    plan.passes.slice(0, 2).map(({ key }) => key),
  );
  assert.equal(new Set(firstCalls.map(({ passReportDir }) => passReportDir)).size, 2);
  assert.equal(new Set(firstCalls.map(({ tempDirName }) => tempDirName)).size, 2);
  for (const [fileName, contents] of Object.entries(priorCanonical)) {
    assert.equal(await fs.readFile(path.join(reportDir, fileName), 'utf8'), contents);
  }
  const failedManifest = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  assert.equal(failedManifest.status, 'failed');
  assert.equal(failedManifest.passes[0].status, 'completed');
  assert.equal(failedManifest.passes[1].status, 'failed');
  assert.match(failedManifest.passes[0].attempts[0].reportSha256, /^[a-f0-9]{64}$/);
  const firstReportPath = path.join(
    first.artifactDir,
    failedManifest.passes[0].attempts[0].reportPath,
  );
  await fs.access(firstReportPath);
  await fs.access(path.join(first.artifactDir, failedManifest.passes[0].attempts[0].logPath));

  const resumedCalls = [];
  const resumed = await runRecorderMutationPasses({
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '4',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '4',
    },
    passConcurrency: 1,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('c'),
    mergePassData: ({ passReports, plan: mergedPlan }) => {
      assert.deepEqual(
        passReports.map(({ pass }) => pass.key),
        mergedPlan.passes.map(({ key }) => key),
      );
      return { report: fakeMergedReport, sidecar: fakeSidecar };
    },
    validateMergedReport: async () => {},
    renderReportHtml: async () => '<!doctype html><html><body>Recorder</body></html>',
    runPass: async ({ pass, reportPath }) => {
      resumedCalls.push(pass.key);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  });
  assert.equal(resumed.exitCode, 0);
  assert.deepEqual(
    resumedCalls,
    plan.passes.slice(1).map(({ key }) => key),
  );
  await Promise.all([
    fs.access(path.join(reportDir, RECORDER_MUTATION_REPORT_FILE)),
    fs.access(path.join(reportDir, RECORDER_MUTATION_HTML_FILE)),
    fs.access(path.join(reportDir, RECORDER_MUTATION_PASS_SIDECAR_FILE)),
    fs.access(firstReportPath),
  ]);
  assert.notEqual(
    await fs.readFile(path.join(reportDir, RECORDER_MUTATION_REPORT_FILE), 'utf8'),
    priorCanonical[RECORDER_MUTATION_REPORT_FILE],
  );
  assert.equal(
    await fs.readFile(path.join(reportDir, RECORDER_MUTATION_HTML_FILE), 'utf8'),
    '<!doctype html><html><body>Recorder</body></html>',
  );
  assert.equal(
    JSON.parse(await fs.readFile(path.join(reportDir, RECORDER_MUTATION_PASS_SIDECAR_FILE), 'utf8'))
      .incrementalDominance.enabled,
    false,
  );
  const completeManifest = JSON.parse(await fs.readFile(resumed.manifestPath, 'utf8'));
  assert.equal(completeManifest.status, 'complete');
  assert.equal(completeManifest.passes[0].attempts.length, 1);
  assert.equal(completeManifest.passes[1].attempts.length, 2);
  assert.ok(completeManifest.passes.every(({ status }) => status === 'completed'));
});

test('an external stop reaches the active pass and records a durable stopped outcome', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-stop-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await fs.mkdir(reportDir, { recursive: true });
  const priorCanonical = {
    [RECORDER_MUTATION_REPORT_FILE]: 'stopped prior json',
    [RECORDER_MUTATION_HTML_FILE]: 'stopped prior html',
    [RECORDER_MUTATION_PASS_SIDECAR_FILE]: 'stopped prior sidecar',
  };
  await Promise.all(
    Object.entries(priorCanonical).map(([fileName, contents]) =>
      fs.writeFile(path.join(reportDir, fileName), contents),
    ),
  );
  const controller = new AbortController();
  let entered;
  const passEntered = new Promise((resolve) => {
    entered = resolve;
  });
  let teardownDiagnostics;
  const running = runRecorderMutationPasses({
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '2',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '2',
    },
    passConcurrency: 1,
    signal: controller.signal,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('d'),
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    renderReportHtml: async () => '<!doctype html><html></html>',
    runPass: ({ signal }) =>
      new Promise((resolve) => {
        entered();
        signal.addEventListener(
          'abort',
          () => {
            void (async () => {
              const termination = terminateRecorderMutationProcessTree(
                { pid: 7001 },
                {
                  clearTimer: clearImmediate,
                  killProcess(pid) {
                    if (pid < 0) {
                      throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
                    }
                  },
                  listProcessGroupPids: async () => [7002],
                  platform: 'darwin',
                  schedule: setImmediate,
                },
              );
              await termination.leaderExited();
              teardownDiagnostics = await termination.completion;
              resolve(143);
            })();
          },
          { once: true },
        );
      }),
  });
  await passEntered;
  controller.abort({ kind: 'user-stop', signal: 'SIGTERM' });
  const result = await running;
  assert.equal(result.exitCode, 143);
  assert.equal(result.aborted, true);
  assert.ok(teardownDiagnostics.some(({ code }) => code === 'EPERM'));
  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.status, 'stopped');
  assert.equal(manifest.passes[0].status, 'stopped');
  assert.equal(manifest.passes[1].status, 'pending');
  for (const [fileName, contents] of Object.entries(priorCanonical)) {
    assert.equal(await fs.readFile(path.join(reportDir, fileName), 'utf8'), contents);
  }
});

test('resume re-runs a parseable completed report whose recorded hash changed', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-hash-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const plan = await currentPlan();
  const baseOptions = {
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '2',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '2',
    },
    passConcurrency: 1,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('e'),
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    validateMergedReport: async () => {},
    renderReportHtml: async () => '<!doctype html><html></html>',
  };
  const first = await runRecorderMutationPasses({
    ...baseOptions,
    runPass: async ({ pass, reportPath }) => {
      if (pass.key === plan.passes[1].key) return 9;
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  });
  const firstManifest = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  const completedPath = path.join(
    first.artifactDir,
    firstManifest.passes[0].attempts[0].reportPath,
  );
  await fs.writeFile(completedPath, JSON.stringify({ passKey: plan.passes[0].key, corrupt: true }));

  const resumedCalls = [];
  const resumed = await runRecorderMutationPasses({
    ...baseOptions,
    runPass: async ({ pass, reportPath }) => {
      resumedCalls.push(pass.key);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  });
  assert.equal(resumed.exitCode, 0);
  assert.deepEqual(
    resumedCalls,
    plan.passes.map(({ key }) => key),
  );
  const resumedManifest = JSON.parse(await fs.readFile(resumed.manifestPath, 'utf8'));
  assert.equal(resumedManifest.passes[0].attempts.length, 2);
  assert.equal(resumedManifest.passes[0].status, 'completed');
});

test('deterministic final validation failure reuses preserved passes without rerunning', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-corrupt-test-'));
  const reportDir = path.join(workspace, 'reports');
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  let validationFails = true;
  const calls = [];
  const options = {
    appDir,
    reportDir,
    environment: {
      MUTATION_CONCURRENCY: '2',
      MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL: 'false',
      MUTATION_RECORDER_TOTAL_WORKERS: '2',
    },
    passConcurrency: 1,
    handleProcessSignals: false,
    createInputFingerprint: fixedFingerprint('f'),
    mergePassData: () => ({ report: fakeMergedReport, sidecar: fakeSidecar }),
    validateMergedReport: async () => {
      if (validationFails) throw new Error('merged report embeds stale unique test source');
    },
    renderReportHtml: async () => '<!doctype html><html></html>',
    runPass: async ({ pass, reportPath }) => {
      calls.push(pass.key);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({ passKey: pass.key }));
      return 0;
    },
  };
  const rejected = await runRecorderMutationPasses(options);
  assert.equal(rejected.exitCode, 1);
  assert.match(rejected.validationError.message, /stale unique test source/);
  await assert.rejects(fs.access(path.join(reportDir, RECORDER_MUTATION_REPORT_FILE)), /ENOENT/);
  const rejectedManifest = JSON.parse(await fs.readFile(rejected.manifestPath, 'utf8'));
  assert.equal(rejectedManifest.status, 'validation-failed');
  assert.ok(rejectedManifest.passes.every(({ status }) => status === 'completed'));

  validationFails = false;
  const recovered = await runRecorderMutationPasses(options);
  assert.equal(recovered.exitCode, 0);
  assert.equal(calls.length, 5);
  const recoveredManifest = JSON.parse(await fs.readFile(recovered.manifestPath, 'utf8'));
  assert.ok(recoveredManifest.passes.every(({ attempts }) => attempts.length === 1));
});

test('integration concurrency cannot exceed the explicit total-worker budget', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-budget-test-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await assert.rejects(
    () =>
      runRecorderMutationPasses({
        appDir,
        reportDir: path.join(workspace, 'reports'),
        environment: { MUTATION_CONCURRENCY: '4', MUTATION_RECORDER_TOTAL_WORKERS: '3' },
        passConcurrency: 2,
        handleProcessSignals: false,
        createInputFingerprint: fixedFingerprint('e'),
        runPass: async () => {
          throw new Error('resource validation must happen before execution');
        },
      }),
    /integration requests 4 Stryker workers.*above MUTATION_RECORDER_TOTAL_WORKERS=3/,
  );
});

test('resume rejects traversal and absolute attempt paths before reading them', async (t) => {
  const { first, rerun } = await createCorruptibleManifestRun(t, '5');
  const original = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  const traversal = structuredClone(original);
  traversal.passes[0].attempts[0].reportPath = '../outside.json';
  await fs.writeFile(first.manifestPath, JSON.stringify(traversal));
  await assert.rejects(rerun, /reportPath escapes Recorder artifact directory/);

  const absolute = structuredClone(original);
  absolute.passes[0].attempts[0].reportPath = '/tmp/outside.json';
  await fs.writeFile(first.manifestPath, JSON.stringify(absolute));
  await assert.rejects(rerun, /reportPath must be a non-empty relative path/);
});

test('resume rejects corrupt manifest status, attempt number, status, and hash', async (t) => {
  const { first, rerun } = await createCorruptibleManifestRun(t, '6');
  const original = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  const variants = [
    [
      'manifest status',
      (manifest) => {
        manifest.status = 'mystery';
      },
      /does not match the current inputs\/plan/,
    ],
    [
      'attempt number',
      (manifest) => {
        manifest.passes[0].attempts[0].number = 9;
      },
      /attempt 1 metadata is invalid/,
    ],
    [
      'attempt status',
      (manifest) => {
        manifest.passes[0].attempts[0].status = 'mystery';
      },
      /attempt 1 metadata is invalid/,
    ],
    [
      'attempt hash',
      (manifest) => {
        manifest.passes[0].attempts[0].reportSha256 = 'bad';
      },
      /reportSha256 must be a SHA-256 hash/,
    ],
  ];
  for (const [label, mutate, expected] of variants) {
    const manifest = structuredClone(original);
    mutate(manifest);
    await fs.writeFile(first.manifestPath, JSON.stringify(manifest));
    await assert.rejects(rerun, expected, label);
  }
});

test('process-tree cancellation keeps escalation armed after the leader exits', async () => {
  const signals = [];
  let escalation;
  let cleared;
  const termination = terminateRecorderMutationProcessTree(
    { pid: 1234 },
    {
      clearTimer(timer) {
        cleared = timer;
      },
      killProcess(pid, signal) {
        if (signal !== 0) signals.push([pid, signal]);
      },
      listProcessGroupPids: async () => [1234],
      platform: 'darwin',
      schedule(callback, delay) {
        escalation = callback;
        return { delay, unref() {} };
      },
      stopGraceMs: 250,
    },
  );
  await Promise.resolve();
  assert.deepEqual(signals, [[-1234, 'SIGTERM']]);
  await termination.leaderExited();
  assert.equal(cleared, undefined);
  escalation();
  await termination.completion;
  assert.deepEqual(signals, [
    [-1234, 'SIGTERM'],
    [-1234, 'SIGKILL'],
  ]);
  assert.equal(cleared.delay, 250);
});

test('macOS EPERM falls back to exact-PGID members without throwing', async () => {
  const memberSignals = [];
  let escalation;
  const eperm = () => Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
  const termination = terminateRecorderMutationProcessTree(
    { pid: 4321 },
    {
      clearTimer() {},
      killProcess(pid, signal) {
        if (pid < 0) throw eperm();
        if (pid === 4323) throw eperm();
        memberSignals.push([pid, signal]);
      },
      listProcessGroupPids: async (pgid) => {
        assert.equal(pgid, 4321);
        return [4321, 4322, 4323];
      },
      platform: 'darwin',
      schedule(callback) {
        escalation = callback;
        return { unref() {} };
      },
      stopGraceMs: 10,
    },
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(memberSignals, [
    [4321, 'SIGTERM'],
    [4322, 'SIGTERM'],
  ]);
  await termination.leaderExited();
  escalation();
  const diagnostics = await termination.completion;
  assert.deepEqual(memberSignals, [
    [4321, 'SIGTERM'],
    [4322, 'SIGTERM'],
    [4321, 'SIGKILL'],
    [4322, 'SIGKILL'],
  ]);
  assert.ok(diagnostics.some(({ phase, code }) => phase === 'probe-group' && code === 'EPERM'));
  assert.ok(diagnostics.some(({ phase, code }) => phase === 'kill-group' && code === 'EPERM'));
  assert.ok(
    diagnostics.some(
      ({ phase, code, pid }) => phase.includes('member') && code === 'EPERM' && pid === 4323,
    ),
  );
});

test('the outcome filename remains stable for manual audit tooling', () => {
  assert.equal(RECORDER_MUTATION_OUTCOME_FILE, 'outcome.json');
});
