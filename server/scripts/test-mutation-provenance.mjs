import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  assertMutationReportProvenance,
  createMutationExecutionIdentity,
  createMutationReportProvenance,
  listStableMutationInputFiles,
  mutationEnvironmentVariableNames,
  mutationProvenancePath,
  writeMutationReportProvenance,
} from './mutation-provenance.mjs';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stableInputFiles = ['package.json', 'src/a.ts', 'tests/a.test.ts', 'db/migrations/001.sql'];
const environment = {
  CI: 'true',
  DATABASE_URL: 'postgres://user:applicationPassword@localhost:5432/application',
  JWT_SECRET: 'jwt-super-secret',
  NODE_ENV: 'test',
  TEST_DATABASE_URL: 'postgres://user:databasePassword@localhost:5432/mutation_test',
  TZ: 'UTC',
};
const runtime = { node: 'v-test', platform: 'test', arch: 'test', versions: { v8: 'test' } };

async function fixture(context) {
  const serverDir = await fs.mkdtemp(path.join(os.tmpdir(), 'server-mutation-provenance-'));
  const reportDir = path.join(serverDir, 'reports');
  context.after(() => fs.rm(serverDir, { recursive: true, force: true }));
  for (const fileName of stableInputFiles) {
    const filePath = path.join(serverDir, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `// ${fileName}\n`);
  }
  await fs.mkdir(reportDir, { recursive: true });
  return { serverDir, reportDir };
}

function report(config = {}) {
  return {
    schemaVersion: '1.0',
    config: {
      testRunner: 'vitest',
      coverageAnalysis: 'perTest',
      timeoutMS: 90_000,
      mutate: ['src/a.ts'],
      testFiles: ['tests/a.test.ts'],
      tempDirName: '.stryker-only-tmp',
      jsonReporter: { fileName: 'reports/only.json' },
      htmlReporter: { fileName: 'reports/only.html' },
      ...config,
    },
    files: {},
    testFiles: {},
  };
}

async function record({ serverDir, reportDir, laneName = 'only', reportBody = report() }) {
  const reportPath = path.join(reportDir, `${laneName}.json`);
  await fs.writeFile(reportPath, JSON.stringify(reportBody));
  const executionIdentity = await createMutationExecutionIdentity({
    serverDir,
    environment,
    runtime,
    stableInputFiles,
  });
  const provenance = await createMutationReportProvenance({
    campaign: 'code',
    laneName,
    reportPath,
    executionIdentity,
  });
  await writeMutationReportProvenance({ reportDir, provenance });
  return { executionIdentity, provenance, reportPath };
}

function validate({ serverDir, reportDir, laneNames = ['only'] }) {
  return assertMutationReportProvenance({
    reportDir,
    serverDir,
    campaign: 'code',
    laneNames,
    environment,
    runtime,
    stableInputFiles,
  });
}

test('stable input discovery covers backend execution inputs and excludes transient or secret paths', async () => {
  const files = await listStableMutationInputFiles(serverDirectory);
  for (const required of [
    'package.json',
    'package-lock.json',
    'src/app.ts',
    'tests/global-setup.ts',
    'db/seed.sql',
    'db/migrations/001_init.sql',
    'scripts/run-mutation-code.mjs',
    'stryker.config.mjs',
    'stryker.catalog.config.mjs',
    'vitest.config.mts',
  ]) {
    assert.ok(files.includes(required), `missing provenance input ${required}`);
  }
  assert.equal(
    files.some((fileName) => fileName.startsWith('reports/')),
    false,
  );
  assert.equal(
    files.some((fileName) => /(^|\/)\.env($|\.)/.test(fileName) && !fileName.endsWith('.env.example')),
    false,
  );
  assert.equal(files.includes('.mutation-campaign.lock'), false);
  assert.equal(files.includes('stryker.catalog.config.json'), false);
});

test('provenance fingerprints both split S3 destinations and no obsolete single-bucket variables', () => {
  for (const name of ['S3_DIAGNOSTIC_BUCKET', 'S3_DIAGNOSTIC_REGION', 'S3_PRACTICE_BUCKET', 'S3_PRACTICE_REGION']) {
    assert.equal(mutationEnvironmentVariableNames.includes(name), true, `missing ${name}`);
  }
  assert.equal(mutationEnvironmentVariableNames.includes('S3_BUCKET'), false);
  assert.equal(mutationEnvironmentVariableNames.includes('S3_REGION'), false);
});

test('provenance fingerprints every documented server environment variable', async () => {
  const example = await fs.readFile(path.join(serverDirectory, '.env.example'), 'utf8');
  const documentedNames = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
  const missingNames = documentedNames.filter((name) => !mutationEnvironmentVariableNames.includes(name));

  assert.deepEqual(missingNames, []);
});

test('catalog Stryker config uses bounded parallelism and routes reporters into the wrapper staging directory', async () => {
  const previous = process.env.MUTATION_REPORT_DIR;
  const staging = path.join(os.tmpdir(), 'catalog-provenance-staging');
  process.env.MUTATION_REPORT_DIR = staging;
  try {
    const configUrl = `${pathToFileURL(path.join(serverDirectory, 'stryker.catalog.config.mjs')).href}?test=${Date.now()}`;
    const { default: config } = await import(configUrl);
    assert.equal(config.jsonReporter.fileName, path.join(staging, 'catalog.json'));
    assert.equal(config.htmlReporter.fileName, path.join(staging, 'catalog.html'));
    assert.equal(config.concurrency, 4);
  } finally {
    if (previous === undefined) delete process.env.MUTATION_REPORT_DIR;
    else process.env.MUTATION_REPORT_DIR = previous;
  }
});

test('report-bound provenance is deterministic, atomic, and secret-free', async (context) => {
  const { serverDir, reportDir } = await fixture(context);
  const first = await record({ serverDir, reportDir });
  await assert.doesNotReject(validate({ serverDir, reportDir }));
  const secondIdentity = await createMutationExecutionIdentity({
    serverDir,
    environment,
    runtime,
    stableInputFiles,
  });
  assert.equal(first.executionIdentity.fingerprint, secondIdentity.fingerprint);

  const serialized = await fs.readFile(mutationProvenancePath(reportDir, 'only'), 'utf8');
  assert.doesNotMatch(serialized, /databasePassword|applicationPassword|jwt-super-secret/);
  assert.match(first.provenance.reportFingerprint, /^[a-f0-9]{64}$/);
  assert.match(first.provenance.configFingerprint, /^[a-f0-9]{64}$/);
});

test('provenance rejects missing, malformed, tampered, and report-swapped sidecars', async (context) => {
  const { serverDir, reportDir } = await fixture(context);
  await fs.writeFile(path.join(reportDir, 'only.json'), JSON.stringify(report()));
  await assert.rejects(validate({ serverDir, reportDir }), /provenance for only is missing/i);

  const sidecarPath = mutationProvenancePath(reportDir, 'only');
  await fs.writeFile(sidecarPath, 'not json');
  await assert.rejects(validate({ serverDir, reportDir }), /not valid JSON/);

  await record({ serverDir, reportDir });
  const recorded = JSON.parse(await fs.readFile(sidecarPath, 'utf8'));
  recorded.schemaVersion = 99;
  await fs.writeFile(sidecarPath, JSON.stringify(recorded));
  await assert.rejects(validate({ serverDir, reportDir }), /is invalid/);

  await record({ serverDir, reportDir });
  await fs.writeFile(path.join(reportDir, 'only.json'), JSON.stringify(report({ timeoutMS: 1 })));
  await assert.rejects(validate({ serverDir, reportDir }), /does not match its current JSON report/);

  await record({ serverDir, reportDir });
  const badFingerprint = JSON.parse(await fs.readFile(sidecarPath, 'utf8'));
  badFingerprint.reportFingerprint = '0'.repeat(64);
  await fs.writeFile(sidecarPath, JSON.stringify(badFingerprint));
  await assert.rejects(validate({ serverDir, reportDir }), /invalid fingerprint/);
});

test('provenance rejects workspace, environment, runtime, and installed-tool drift', async (context) => {
  const { serverDir, reportDir } = await fixture(context);
  await record({ serverDir, reportDir });

  await fs.appendFile(path.join(serverDir, 'src/a.ts'), '// changed\n');
  await assert.rejects(validate({ serverDir, reportDir }), /workspace, toolchain, runtime, or environment changed/);
  await fs.writeFile(path.join(serverDir, 'src/a.ts'), '// src/a.ts\n');
  await assert.doesNotReject(validate({ serverDir, reportDir }));

  await assert.rejects(
    assertMutationReportProvenance({
      reportDir,
      serverDir,
      campaign: 'code',
      laneNames: ['only'],
      environment: { ...environment, TZ: 'America/Phoenix' },
      runtime,
      stableInputFiles,
    }),
    /workspace, toolchain, runtime, or environment changed/,
  );
  await assert.rejects(
    assertMutationReportProvenance({
      reportDir,
      serverDir,
      campaign: 'code',
      laneNames: ['only'],
      environment,
      runtime: { ...runtime, node: 'v-other' },
      stableInputFiles,
    }),
    /workspace, toolchain, runtime, or environment changed/,
  );

  const vitestPackage = path.join(serverDir, 'node_modules', 'vitest', 'package.json');
  await fs.mkdir(path.dirname(vitestPackage), { recursive: true });
  await fs.writeFile(vitestPackage, JSON.stringify({ version: '99.0.0' }));
  await assert.rejects(validate({ serverDir, reportDir }), /workspace, toolchain, runtime, or environment changed/);
});

test('code provenance normalizes lane paths but rejects behaviorally different resolved configs', async (context) => {
  const { serverDir, reportDir } = await fixture(context);
  await record({ serverDir, reportDir, laneName: 'first' });
  await record({
    serverDir,
    reportDir,
    laneName: 'second',
    reportBody: report({
      mutate: ['src/other.ts'],
      testFiles: ['tests/other.test.ts'],
      tempDirName: '.stryker-second-tmp',
      jsonReporter: { fileName: 'elsewhere/second.json' },
      htmlReporter: { fileName: 'elsewhere/second.html' },
    }),
  });
  await assert.doesNotReject(validate({ serverDir, reportDir, laneNames: ['first', 'second'] }));

  await record({
    serverDir,
    reportDir,
    laneName: 'second',
    reportBody: report({ timeoutMS: 1 }),
  });
  await assert.rejects(
    validate({ serverDir, reportDir, laneNames: ['first', 'second'] }),
    /resolved mutation config differs/i,
  );
});
