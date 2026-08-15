import { pool } from './db';
import { logger } from './logger';

/**
 * Database janitors delete in bounded ctid batches so a large backlog can
 * never hold one long row-locking DELETE against a hot table; callers embed
 * this limit in their batch statement and the loop below stops as soon as a
 * batch comes back short.
 */
export const JANITOR_BATCH_SIZE = 5000;

/**
 * Run one janitor tick exclusively across replicas: a per-janitor advisory
 * lock (session-scoped, held on this pool client for the whole tick) makes
 * concurrent replicas skip the tick instead of duplicating full-table scans.
 * `batchDeleteSql` must delete at most JANITOR_BATCH_SIZE rows per execution.
 */
export async function runExclusiveBatchedDelete(lockName: string, batchDeleteSql: string): Promise<number> {
  const client = await pool.connect();
  let clientError: Error | undefined;
  try {
    const { rows } = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [
      lockName,
    ]);
    if (rows[0]?.locked !== true) return 0;
    try {
      let removed = 0;
      for (;;) {
        const batch = await client.query(batchDeleteSql);
        removed += batch.rowCount ?? 0;
        if ((batch.rowCount ?? 0) < JANITOR_BATCH_SIZE) return removed;
      }
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
      } catch (unlockError) {
        // A client that may still hold the advisory lock must not return to
        // the pool; destroying the connection releases the lock server-side.
        // Log before poisoning so a stuck-lock scenario is visible instead of
        // the tick silently reporting success.
        const err =
          unlockError instanceof Error
            ? unlockError
            : new Error('janitor advisory unlock failed', { cause: unlockError });
        logger.warn({ err, lockName }, 'janitor advisory unlock failed; poisoning the pool client');
        clientError = err;
      }
    }
  } finally {
    client.release(clientError);
  }
}
