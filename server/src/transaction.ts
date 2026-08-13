type TransactionClient = {
  query: (text: string) => Promise<unknown>;
  release?: (error?: Error) => void;
};

export type CapturedTransactionError = { value: unknown };

// pg-pool installs a fresh, one-shot `release` closure each time a client is
// checked out. Tracking that lease handle (rather than the PoolClient object,
// which the pool reuses) makes finalization idempotent without leaking a future
// checkout of the same client.
const releasedLeases = new WeakSet<(error?: Error) => void>();

function normalizedReleaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('PostgreSQL transaction rollback failed', { cause: error });
}

/** Release the current pool lease at most once, optionally poisoning it. */
export function releaseTransactionClient(client: TransactionClient, error?: Error): void {
  const release = client.release;
  if (!release || releasedLeases.has(release)) return;
  releasedLeases.add(release);
  release.call(client, error);
}

/**
 * Attempt a transaction rollback without replacing the failure that caused it.
 * When no primary error is supplied, a rollback failure remains observable.
 */
export function rollbackTransaction(client: TransactionClient): Promise<void>;
export function rollbackTransaction(client: TransactionClient, primaryError: CapturedTransactionError): Promise<never>;
export async function rollbackTransaction(
  client: TransactionClient,
  primaryError?: CapturedTransactionError,
): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    // A client whose rollback failed must never return to pg-pool: it may still
    // have an open or aborted transaction. Preserve the operation failure (or
    // the rollback failure when standalone) even if disposal itself objects.
    try {
      releaseTransactionClient(client, normalizedReleaseError(rollbackError));
    } catch {
      // pg-pool's release(error) only throws for an already-released lease; the
      // lease tracker above prevents our finalizers from triggering that path.
    }
    if (!primaryError) throw rollbackError;
  }
  if (primaryError) throw primaryError.value;
}
