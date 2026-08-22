import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { acquireMutationCampaignLock, mutationCampaignLockFileName } from './mutation-campaign-lock.mjs';
import { runStandaloneMutationMerge } from './merge-mutation-reports.mjs';
import { runMutationCatalog } from './run-mutation-catalog.mjs';

const fixtureInputFile = 'campaign-input.txt';

async function writeCatalogOutput(outputDir, contents = {}) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'catalog.json'),
    JSON.stringify({
      config: {
        testRunner: 'vitest',
        coverageAnalysis: 'perTest',
        mutate: ['db/seed-data.ts'],
        tempDirName: '.stryker-catalog-tmp',
        jsonReporter: { fileName: path.join(outputDir, 'catalog.json') },
        htmlReporter: { fileName: path.join(outputDir, 'catalog.html') },
      },
      ...contents,
    }),
  );
  await fs.writeFile(path.join(outputDir, 'catalog.html'), '<html>catalog</html>');
}

async function workspaceFixture(context) {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-campaign-'));
  const reportDir = path.join(serverDir, 'reports', 'mutation');
  const lockPath = path.join(serverDir, mutationCampaignLockFileName);
  await fs.writeFile(path.join(serverDir, fixtureInputFile), 'stable mutation input');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  return { serverDir, reportDir, lockPath };
}

test('the workspace lock records its owner and releases idempotently', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  const release = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'code lanes: config' });

  const owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  assert.equal(owner.pid, process.pid);
  assert.match(owner.token, /^[0-9a-f-]{36}$/i);
  assert.equal(owner.campaign, 'code lanes: config');
  assert.equal(owner.reportDir, path.resolve(reportDir));
  assert.equal(new Date(owner.startedAt).toISOString(), owner.startedAt);

  await release();
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
  await assert.doesNotReject(release());
});

test('a live or stale lock fails closed and is never reclaimed automatically', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  const release = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'code lanes: config' });
  try {
    await assert.rejects(
      acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'catalog' }),
      /Another backend mutation campaign .*code lanes: config.*already owns/,
    );
  } finally {
    await release();
  }

  const staleOwner = {
    pid: 2_147_483_647,
    token: 'stale-owner-token',
    startedAt: '2000-01-01T00:00:00.000Z',
    campaign: 'interrupted catalog',
    reportDir,
  };
  await fs.writeFile(lockPath, `${JSON.stringify(staleOwner)}\n`);
  await assert.rejects(
    acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'code lanes: db' }),
    /pid 2147483647, interrupted catalog/,
  );
  assert.deepEqual(JSON.parse(await fs.readFile(lockPath, 'utf8')), staleOwner);
});

test('an old owner never removes a replacement lock', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  const releaseOldOwner = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'old campaign' });
  await fs.rm(lockPath);
  const replacement = {
    pid: process.pid + 1,
    token: 'replacement-owner-token',
    startedAt: new Date().toISOString(),
    campaign: 'replacement campaign',
    reportDir,
  };
  await fs.writeFile(lockPath, `${JSON.stringify(replacement)}\n`);

  await releaseOldOwner();

  assert.deepEqual(JSON.parse(await fs.readFile(lockPath, 'utf8')), replacement);
  await releaseOldOwner();
  assert.deepEqual(JSON.parse(await fs.readFile(lockPath, 'utf8')), replacement);
});

test('an invalid replacement is retained and makes release fail loudly', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  const releaseOldOwner = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'old campaign' });
  await fs.rm(lockPath);
  await fs.writeFile(lockPath, 'not-json\n');

  await assert.rejects(releaseOldOwner(), /lock .* is invalid/);
  assert.equal(await fs.readFile(lockPath, 'utf8'), 'not-json\n');
});

test('catalog mutation owns the shared lock while cleaning, running, and validating', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'catalog.json'), 'stale json');
  await fs.writeFile(path.join(reportDir, 'catalog.html'), 'stale html');
  const events = [];
  const validatedPaths = [];

  const result = await runMutationCatalog({
    serverDir,
    reportDir,
    stableInputFiles: [fixtureInputFile],
    environment: { TEST_MARKER: 'catalog-environment' },
    runStryker: async ({ serverDir: receivedServerDir, environment, outputDir }) => {
      events.push('stryker');
      assert.equal(receivedServerDir, serverDir);
      assert.equal(environment.TEST_MARKER, 'catalog-environment');
      await assert.doesNotReject(fs.stat(lockPath));
      await assert.rejects(fs.stat(path.join(reportDir, 'catalog.json')), { code: 'ENOENT' });
      await assert.rejects(fs.stat(path.join(reportDir, 'catalog.html')), { code: 'ENOENT' });
      assert.equal(environment.MUTATION_REPORT_DIR, outputDir);
      await writeCatalogOutput(outputDir);
      return 0;
    },
    validateReport: async ({ reportPath, serverDir: receivedServerDir }) => {
      events.push('validated');
      validatedPaths.push(reportPath);
      assert.equal(receivedServerDir, serverDir);
      await assert.doesNotReject(fs.stat(lockPath));
      return { mutantCount: 7, statusCounts: { Killed: 7, Timeout: 0, Ignored: 0 } };
    },
  });

  assert.deepEqual(events, ['stryker', 'validated', 'validated', 'validated']);
  assert.equal(validatedPaths[0].includes('.catalog-staging-'), true);
  assert.equal(validatedPaths.at(-1), path.join(reportDir, 'catalog.json'));
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.mutantCount, 7);
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
  await assert.doesNotReject(fs.stat(path.join(reportDir, 'catalog.provenance.json')));
});

test('catalog mutation cannot overlap another workspace owner', async (context) => {
  const { serverDir, reportDir } = await workspaceFixture(context);
  const releaseCode = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'code lanes: config' });
  let ran = false;
  try {
    await assert.rejects(
      runMutationCatalog({
        serverDir,
        reportDir,
        runStryker: async () => {
          ran = true;
          return 0;
        },
      }),
      /Another backend mutation campaign/,
    );
    assert.equal(ran, false);
  } finally {
    await releaseCode();
  }
});

test('the standalone canonical merge owns the shared lock and cannot overlap a campaign', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  let merges = 0;
  const merged = await runStandaloneMutationMerge({
    serverDir,
    reportDir,
    mergeReports: async () => {
      merges += 1;
      await assert.doesNotReject(fs.stat(lockPath));
      return { summary: { mutantCount: 1, laneCount: 1, mutationScore: 100 }, paths: {} };
    },
  });
  assert.equal(merged.summary.mutantCount, 1);
  assert.equal(merges, 1);
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });

  const release = await acquireMutationCampaignLock({ serverDir, reportDir, campaign: 'active code campaign' });
  try {
    await assert.rejects(
      runStandaloneMutationMerge({
        serverDir,
        reportDir,
        mergeReports: async () => {
          merges += 1;
        },
      }),
      /Another backend mutation campaign/,
    );
    assert.equal(merges, 1);
  } finally {
    await release();
  }
});

test('catalog failures release the workspace and never validate stale reports', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  let validations = 0;
  const failed = await runMutationCatalog({
    serverDir,
    reportDir,
    stableInputFiles: [fixtureInputFile],
    runStryker: async ({ outputDir }) => {
      await writeCatalogOutput(outputDir, { partial: true });
      return 9;
    },
    validateReport: async () => {
      validations += 1;
    },
  });

  assert.equal(failed.exitCode, 1);
  assert.equal(failed.failure, 'stryker');
  assert.equal(failed.strykerExitCode, 9);
  assert.equal(validations, 0);
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(reportDir, 'catalog.json')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(reportDir, 'catalog.html')), { code: 'ENOENT' });

  const reportFailure = new Error('strict catalog report failed');
  const invalid = await runMutationCatalog({
    serverDir,
    reportDir,
    stableInputFiles: [fixtureInputFile],
    runStryker: async ({ outputDir }) => {
      await writeCatalogOutput(outputDir, { invalid: true });
      return 0;
    },
    validateReport: async () => {
      throw reportFailure;
    },
  });
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.failure, 'report');
  assert.equal(invalid.reportError, reportFailure);
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(reportDir, 'catalog.json')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(reportDir, 'catalog.html')), { code: 'ENOENT' });

  const couldNotStart = await runMutationCatalog({
    serverDir,
    reportDir,
    stableInputFiles: [fixtureInputFile],
    runStryker: async () => {
      throw undefined;
    },
  });
  assert.equal(couldNotStart.exitCode, 1);
  assert.equal(couldNotStart.failure, 'run');
  assert.equal(couldNotStart.runError, undefined);
  await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
});

test('a signaled catalog child preserves both the workspace lock and staging evidence', async (context) => {
  const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
  let stagingDir;
  const result = await runMutationCatalog({
    serverDir,
    reportDir,
    stableInputFiles: [fixtureInputFile],
    runStryker: async ({ outputDir }) => {
      stagingDir = outputDir;
      await writeCatalogOutput(outputDir, { partial: true });
      return 143;
    },
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.failure, 'stryker');
  await assert.doesNotReject(fs.stat(lockPath));
  await assert.doesNotReject(fs.stat(path.join(stagingDir, 'catalog.json')));
  await assert.rejects(fs.stat(path.join(reportDir, 'catalog.json')), { code: 'ENOENT' });
});

for (const stage of ['beforeArtifactCommit', 'afterArtifactCommit']) {
  test(`catalog publication rolls back every canonical artifact on ${stage} provenance drift`, async (context) => {
    const { serverDir, reportDir, lockPath } = await workspaceFixture(context);
    const result = await runMutationCatalog({
      serverDir,
      reportDir,
      stableInputFiles: [fixtureInputFile],
      runStryker: async ({ outputDir }) => {
        await writeCatalogOutput(outputDir);
        return 0;
      },
      validateReport: async () => ({ mutantCount: 1, statusCounts: { Killed: 1, Timeout: 0, Ignored: 0 } }),
      [stage]: async () => {
        await fs.appendFile(path.join(serverDir, fixtureInputFile), '\nchanged during publication');
      },
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.failure, 'report');
    assert.match(result.reportError.message, /workspace, toolchain, runtime, or environment changed/);
    for (const fileName of ['catalog.json', 'catalog.html', 'catalog.provenance.json']) {
      await assert.rejects(fs.stat(path.join(reportDir, fileName)), { code: 'ENOENT' });
    }
    await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
  });
}
