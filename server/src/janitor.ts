import { pool } from './db';
import { logger } from './logger';

/**
 * Database janitors delete in bounded ctid batches so a large backlog can
 * never hold one long row-locking DELETE against a hot table; callers embed
 * this limit in their batch statement; the loop stops on the first short
 * batch or at the finite per-tick cap below.
 */
export const JANITOR_BATCH_SIZE = 5000;
/**
 * A tick is also bounded as a whole. Without this cap, a table whose expired
 * rows are replenished as quickly as they are deleted (or a faulty caller
 * that always reports one full batch) can keep the advisory lock and one pool
 * lease forever. Hourly ticks make forward progress through a backlog without
 * turning cleanup into an unbounded request competitor.
 */
export const JANITOR_MAX_BATCHES_PER_TICK = 10;

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
      for (let batchNumber = 0; batchNumber < JANITOR_MAX_BATCHES_PER_TICK; batchNumber += 1) {
        const batch = await client.query(batchDeleteSql);
        removed += batch.rowCount ?? 0;
        if ((batch.rowCount ?? 0) < JANITOR_BATCH_SIZE) return removed;
      }
      try {
        logger.warn(
          { lockName, removed, maxBatches: JANITOR_MAX_BATCHES_PER_TICK },
          'janitor batch cap reached; cleanup will continue on a later tick',
        );
      } catch {
        // Cleanup completed successfully; observability failure must not erase
        // its bounded progress/result.
      }
      return removed;
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
        // Mark the lease poisoned before logging: even a broken logger must
        // not put a session that may retain this advisory lock back in the
        // pool. Cleanup safety is more important than observability failure.
        clientError = err;
        try {
          logger.warn({ err, lockName }, 'janitor advisory unlock failed; poisoning the pool client');
        } catch {
          // The original delete result/error remains authoritative.
        }
      }
    }
  } finally {
    client.release(clientError);
  }
}
