import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const mutationCampaignLockFileName = '.mutation-campaign.lock';

async function readMutationCampaignLock(lockPath) {
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw error;
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no campaign is active before removing it manually`,
      { cause: error },
    );
  }
  if (
    owner === null ||
    typeof owner !== 'object' ||
    !Number.isInteger(owner.pid) ||
    owner.pid < 1 ||
    typeof owner.token !== 'string' ||
    owner.token.length === 0
  ) {
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no campaign is active before removing it manually`,
    );
  }
  return owner;
}

/**
 * Exclusively own the server workspace for one mutation campaign. Stryker's
 * temp directories and canonical reports are workspace-scoped, so distinct
 * processes can corrupt each other even when they use different databases or
 * report directories. Locks are deliberately never reclaimed automatically:
 * an interrupted parent can leave a Stryker child alive.
 */
export async function acquireMutationCampaignLock({ serverDir, reportDir, campaign }) {
  const lockPath = path.join(serverDir, mutationCampaignLockFileName);
  const token = randomUUID();
  let handle;
  try {
    handle = await fs.open(lockPath, 'wx');
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const owner = await readMutationCampaignLock(lockPath);
    throw new Error(
      `Another backend mutation campaign (pid ${owner.pid}, ${owner.campaign ?? 'unknown campaign'}, ` +
        `report directory ${owner.reportDir ?? 'unknown'}) already owns ${lockPath}. ` +
        `Verify that neither its parent nor any Stryker child is alive before removing the lock manually.`,
      { cause: error },
    );
  }

  try {
    await handle.writeFile(
      `${JSON.stringify({
        pid: process.pid,
        token,
        startedAt: new Date().toISOString(),
        campaign,
        reportDir: path.resolve(reportDir),
      })}\n`,
      'utf8',
    );
  } catch (error) {
    await handle.close();
    await fs.rm(lockPath, { force: true });
    throw error;
  }

  let released = false;
  return async ({ preserve = false } = {}) => {
    if (released) return;
    released = true;
    await handle.close();
    // A signaled Stryker coordinator can leave descendants alive. In that
    // state the filesystem lock is deliberately retained for an operator to
    // clear only after checking the recorded parent and possible children.
    if (preserve) return;
    let owner;
    try {
      owner = await readMutationCampaignLock(lockPath);
    } catch (error) {
      // Manual removal is allowed only after operators verify the parent and
      // every possible Stryker child are gone. If it happened while this
      // owner was unwinding, there is nothing left for it to release. An
      // invalid replacement must fail loudly and remain in place; silently
      // reporting successful cleanup would hide a wedged workspace.
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    if (owner.token === token) await fs.rm(lockPath, { force: true });
  };
}
