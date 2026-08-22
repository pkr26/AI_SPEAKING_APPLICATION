import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMutationProcess } from './mutation-process.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');

async function runNpmCampaign({ campaign, serverDir, environment }) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return runMutationProcess(npmCommand, ['run', campaign], { cwd: serverDir, env: environment });
}

/** Always run both independent backend campaigns, then aggregate their status. */
export async function runMutationAll({
  serverDir = defaultServerDirectory,
  environment = process.env,
  runCampaign = runNpmCampaign,
} = {}) {
  const results = [];
  for (const campaign of ['mutation:code', 'mutation:catalog']) {
    let exitCode;
    let error;
    try {
      exitCode = await runCampaign({ campaign, serverDir, environment });
    } catch (caught) {
      error = caught;
      exitCode = 1;
    }
    results.push({ campaign, exitCode, error });
  }
  return { exitCode: results.some((result) => result.exitCode !== 0) ? 1 : 0, results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runMutationAll();
  for (const entry of result.results) {
    if (entry.error) console.error(`${entry.campaign} could not complete`, entry.error);
    else if (entry.exitCode !== 0) console.error(`${entry.campaign} exited with status ${entry.exitCode}`);
  }
  process.exitCode = result.exitCode;
}
