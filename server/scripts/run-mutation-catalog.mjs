import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkCatalogReport } from './check-catalog-report.mjs';
import { acquireMutationCampaignLock } from './mutation-campaign-lock.mjs';
import { mutationTerminationIsUnsafe, MutationChildSignaledError, runMutationProcess } from './mutation-process.mjs';
import {
  assertMutationExecutionIdentityUnchanged,
  assertMutationReportProvenance,
  createMutationExecutionIdentity,
  createMutationReportProvenance,
  writeMutationReportProvenance,
} from './mutation-provenance.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');

async function runStrykerCatalog({ serverDir, environment, outputDir }) {
  const strykerEntrypoint = path.join(serverDir, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
  return runMutationProcess(process.execPath, [strykerEntrypoint, 'run', 'stryker.catalog.config.mjs'], {
    cwd: serverDir,
    env: { ...environment, MUTATION_REPORT_DIR: outputDir },
  });
}

async function removeCatalogArtifacts(reportDir) {
  await Promise.all(
    ['catalog.json', 'catalog.html', 'catalog.provenance.json'].map((fileName) =>
      fs.rm(path.join(reportDir, fileName), { force: true }),
    ),
  );
}

async function publishCatalogArtifacts({
  stagingDir,
  reportDir,
  beforeArtifactCommit,
  afterArtifactCommit,
  validateBeforeCommit,
  validateAfterCommit,
}) {
  const fileNames = ['catalog.html', 'catalog.provenance.json', 'catalog.json'];
  const artifacts = await Promise.all(
    fileNames.map(async (fileName, index) => ({
      contents: await fs.readFile(path.join(stagingDir, fileName)),
      temporaryPath: path.join(reportDir, `${fileName}.tmp-${process.pid}-${index}`),
      canonicalPath: path.join(reportDir, fileName),
    })),
  );
  try {
    await Promise.all(artifacts.map(({ temporaryPath, contents }) => fs.writeFile(temporaryPath, contents)));
    await beforeArtifactCommit?.();
    await validateBeforeCommit();
    // JSON is the commit marker and is published last. Consumers never treat a
    // sidecar/HTML pair without catalog.json as a completed campaign.
    for (const artifact of artifacts) await fs.rename(artifact.temporaryPath, artifact.canonicalPath);
    await afterArtifactCommit?.();
    await validateAfterCommit();
  } catch (error) {
    await removeCatalogArtifacts(reportDir);
    throw error;
  } finally {
    await Promise.all(artifacts.map(({ temporaryPath }) => fs.rm(temporaryPath, { force: true })));
  }
}

/**
 * Run and validate the authored-catalog campaign under the server workspace
 * lock. Stryker writes only to a staging directory; validated HTML/provenance
 * are published first and catalog.json last as the canonical commit marker.
 */
export async function runMutationCatalog({
  serverDir = defaultServerDirectory,
  reportDir = path.join(defaultServerDirectory, 'reports', 'mutation'),
  environment = process.env,
  runStryker = runStrykerCatalog,
  validateReport = checkCatalogReport,
  runtime,
  stableInputFiles,
  beforeArtifactCommit,
  afterArtifactCommit,
} = {}) {
  if (beforeArtifactCommit !== undefined && typeof beforeArtifactCommit !== 'function') {
    throw new Error('beforeArtifactCommit must be a function');
  }
  if (afterArtifactCommit !== undefined && typeof afterArtifactCommit !== 'function') {
    throw new Error('afterArtifactCommit must be a function');
  }
  const releaseCampaignLock = await acquireMutationCampaignLock({
    serverDir,
    reportDir,
    campaign: 'catalog',
  });
  let preserveCampaignLock = false;
  const stagingDir = path.join(reportDir, `.catalog-staging-${process.pid}-${randomUUID()}`);
  try {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.mkdir(stagingDir, { recursive: true });
    await removeCatalogArtifacts(reportDir);
    const effectiveEnvironment = { ...environment, MUTATION_REPORT_DIR: stagingDir };
    const provenanceIdentityOptions = {
      serverDir,
      environment: effectiveEnvironment,
      ...(runtime === undefined ? {} : { runtime }),
      ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
    };
    const executionBefore = await createMutationExecutionIdentity(provenanceIdentityOptions);

    let strykerExitCode;
    let runError;
    let runThrew = false;
    try {
      strykerExitCode = await runStryker({ serverDir, environment: effectiveEnvironment, outputDir: stagingDir });
      if (mutationTerminationIsUnsafe(strykerExitCode)) preserveCampaignLock = true;
    } catch (error) {
      runThrew = true;
      runError = error;
      if (error instanceof MutationChildSignaledError) {
        preserveCampaignLock = true;
        strykerExitCode = error.exitCode;
      }
    }
    if (runThrew || strykerExitCode !== 0) {
      await removeCatalogArtifacts(reportDir);
      return {
        exitCode: 1,
        failure: runThrew ? 'run' : 'stryker',
        strykerExitCode,
        runError,
        reportError: undefined,
        report: undefined,
      };
    }

    try {
      const executionAfter = await assertMutationExecutionIdentityUnchanged({
        expected: executionBefore,
        ...provenanceIdentityOptions,
      });
      const stagingReportPath = path.join(stagingDir, 'catalog.json');
      const report = await validateReport({ reportPath: stagingReportPath, serverDir });
      const provenance = await createMutationReportProvenance({
        campaign: 'catalog',
        laneName: 'catalog',
        reportPath: stagingReportPath,
        executionIdentity: executionAfter,
      });
      await writeMutationReportProvenance({ reportDir: stagingDir, provenance });

      const validateStaging = async () => {
        await assertMutationExecutionIdentityUnchanged({ expected: executionAfter, ...provenanceIdentityOptions });
        await validateReport({ reportPath: stagingReportPath, serverDir });
        await assertMutationReportProvenance({
          reportDir: stagingDir,
          serverDir,
          campaign: 'catalog',
          laneNames: ['catalog'],
          environment: effectiveEnvironment,
          ...(runtime === undefined ? {} : { runtime }),
          ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
        });
      };
      const validateCanonical = async () => {
        await assertMutationExecutionIdentityUnchanged({ expected: executionAfter, ...provenanceIdentityOptions });
        await validateReport({ reportPath: path.join(reportDir, 'catalog.json'), serverDir });
        await assertMutationReportProvenance({
          reportDir,
          serverDir,
          campaign: 'catalog',
          laneNames: ['catalog'],
          environment: effectiveEnvironment,
          ...(runtime === undefined ? {} : { runtime }),
          ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
        });
      };
      await publishCatalogArtifacts({
        stagingDir,
        reportDir,
        beforeArtifactCommit,
        afterArtifactCommit,
        validateBeforeCommit: validateStaging,
        validateAfterCommit: validateCanonical,
      });
      return {
        exitCode: 0,
        failure: undefined,
        strykerExitCode,
        runError: undefined,
        reportError: undefined,
        report,
      };
    } catch (reportError) {
      await removeCatalogArtifacts(reportDir);
      return {
        exitCode: 1,
        failure: 'report',
        strykerExitCode,
        runError: undefined,
        reportError,
        report: undefined,
      };
    }
  } finally {
    if (!preserveCampaignLock) await fs.rm(stagingDir, { recursive: true, force: true });
    await releaseCampaignLock({ preserve: preserveCampaignLock });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runMutationCatalog();
  if (result.failure === 'run') {
    console.error('Catalog mutation campaign could not start', result.runError);
  } else if (result.failure === 'stryker') {
    console.error(`Catalog mutation campaign exited with status ${result.strykerExitCode}`);
  } else if (result.failure === 'report') {
    console.error('Catalog mutation report failed strict validation', result.reportError);
  } else {
    console.log(
      `Catalog mutation strict gate passed: ${result.report.mutantCount} mutants ` +
        `(Killed=${result.report.statusCounts.Killed}, Timeout=${result.report.statusCounts.Timeout}, ` +
        `Ignored=${result.report.statusCounts.Ignored}).`,
    );
  }
  process.exitCode = result.exitCode;
}
