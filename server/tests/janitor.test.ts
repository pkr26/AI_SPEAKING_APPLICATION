import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../src/db', () => ({
  pool: { connect: runtime.connect },
}));

vi.mock('../src/logger', () => ({
  logger: { warn: runtime.warn },
}));

import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from '../src/janitor';

describe('runExclusiveBatchedDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.connect.mockResolvedValue({ query: runtime.query, release: runtime.release });
  });

  it('skips cleanly when another replica owns the advisory lock', async () => {
    runtime.query.mockResolvedValueOnce({ rows: [{ locked: false }] });

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(0);

    expect(runtime.query).toHaveBeenCalledOnce();
    expect(runtime.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', ['janitor:test']);
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledWith(undefined);
  });

  it('skips cleanly when the advisory-lock query returns no row', async () => {
    runtime.query.mockResolvedValueOnce({ rows: [] });

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(0);

    expect(runtime.query).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledWith(undefined);
  });

  it('deletes full batches until the first short batch and returns the exact total', async () => {
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockResolvedValueOnce({ rowCount: JANITOR_BATCH_SIZE })
      .mockResolvedValueOnce({ rowCount: 7 })
      .mockResolvedValueOnce({ rows: [{ pg_advisory_unlock: true }] });

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(JANITOR_BATCH_SIZE + 7);

    expect(runtime.query.mock.calls).toEqual([
      ['SELECT pg_try_advisory_lock(hashtext($1)) AS locked', ['janitor:test']],
      ['DELETE BATCH'],
      ['DELETE BATCH'],
      ['SELECT pg_advisory_unlock(hashtext($1))', ['janitor:test']],
    ]);
    expect(runtime.release).toHaveBeenCalledWith(undefined);
    expect(runtime.warn).not.toHaveBeenCalled();
  });

  it('treats a missing rowCount as a zero-row terminal batch', async () => {
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockResolvedValueOnce({ rowCount: null })
      .mockResolvedValueOnce({ rows: [{ pg_advisory_unlock: true }] });

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(0);
    expect(runtime.query).toHaveBeenCalledTimes(3);
    expect(runtime.release).toHaveBeenCalledWith(undefined);
  });

  it('poisons the pool client and reports an advisory-unlock Error without losing the delete result', async () => {
    const unlockError = new Error('unlock failed');
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockRejectedValueOnce(unlockError);

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(3);

    expect(runtime.warn).toHaveBeenCalledWith(
      { err: unlockError, lockName: 'janitor:test' },
      'janitor advisory unlock failed; poisoning the pool client',
    );
    expect(runtime.release).toHaveBeenCalledWith(unlockError);
  });

  it('normalizes a non-Error unlock rejection before poisoning the client', async () => {
    const unlockFailure = { reason: 'socket closed' };
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockRejectedValueOnce(unlockFailure);

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).resolves.toBe(1);

    const poisonedWith = runtime.release.mock.calls[0][0] as Error;
    expect(poisonedWith).toBeInstanceOf(Error);
    expect(poisonedWith.message).toBe('janitor advisory unlock failed');
    expect(poisonedWith.cause).toBe(unlockFailure);
    expect(runtime.warn).toHaveBeenCalledWith(
      { err: poisonedWith, lockName: 'janitor:test' },
      'janitor advisory unlock failed; poisoning the pool client',
    );
  });

  it('preserves a primary delete failure while still unlocking and releasing', async () => {
    const deleteError = new Error('delete failed');
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockRejectedValueOnce(deleteError)
      .mockResolvedValueOnce({ rows: [{ pg_advisory_unlock: true }] });

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).rejects.toBe(deleteError);

    expect(runtime.query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock(hashtext($1))', ['janitor:test']);
    expect(runtime.release).toHaveBeenCalledWith(undefined);
  });

  it('preserves a primary delete failure while poisoning on a second unlock failure', async () => {
    const deleteError = new Error('delete failed');
    const unlockError = new Error('unlock failed');
    runtime.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockRejectedValueOnce(deleteError)
      .mockRejectedValueOnce(unlockError);

    await expect(runExclusiveBatchedDelete('janitor:test', 'DELETE BATCH')).rejects.toBe(deleteError);

    expect(runtime.warn).toHaveBeenCalledWith(
      { err: unlockError, lockName: 'janitor:test' },
      'janitor advisory unlock failed; poisoning the pool client',
    );
    expect(runtime.release).toHaveBeenCalledWith(unlockError);
  });
});
