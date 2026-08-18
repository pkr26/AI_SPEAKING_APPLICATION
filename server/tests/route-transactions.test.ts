import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

interface ObservedLease {
  statements: string[];
  release: ReturnType<typeof vi.fn>;
  releasedAfterStatementCount: number[];
}

async function observePoolLeases<T>(action: () => Promise<T>): Promise<{ result: T; leases: ObservedLease[] }> {
  const originalConnect = pool.connect.bind(pool);
  const leases: ObservedLease[] = [];
  const wrap = (client: PoolClient) => {
    const statements: string[] = [];
    const mutable = client as unknown as {
      query: (...args: unknown[]) => unknown;
      release: (error?: Error | boolean) => void;
    };
    const actualQuery = mutable.query.bind(client);
    const actualRelease = mutable.release.bind(client);
    mutable.query = (query: unknown, ...args: unknown[]) => {
      const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
      if (typeof text === 'string') statements.push(text);
      return actualQuery(query, ...args);
    };
    const releasedAfterStatementCount: number[] = [];
    const release = vi.fn((error?: Error | boolean) => {
      releasedAfterStatementCount.push(statements.length);
      mutable.query = actualQuery;
      mutable.release = actualRelease;
      actualRelease(error);
    });
    mutable.release = release;
    leases.push({ statements, release, releasedAfterStatementCount });
    return client;
  };
  const connect = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
    // pool.query uses the callback overload internally; preserve it untouched so
    // only explicit transaction leases are instrumented.
    if (typeof callback === 'function') return originalConnect(callback as never);
    return originalConnect().then(wrap);
  }) as typeof pool.connect);

  try {
    return { result: await action(), leases };
  } finally {
    connect.mockRestore();
  }
}

function expectCommittedLease(lease: ObservedLease | undefined): void {
  expect(lease).toBeDefined();
  expect(lease!.statements[0]).toBe('BEGIN');
  expect(lease!.statements[lease!.releasedAfterStatementCount[0] - 1]).toBe('COMMIT');
  expect(lease!.release).toHaveBeenCalledOnce();
  expect(lease!.release).toHaveBeenCalledWith(undefined);
}

afterAll(async () => {
  await pool.end();
});

describe('assessment route transaction lifecycles', () => {
  const a = app();

  it('commits and releases the diagnostic first-use transaction', async () => {
    const { res } = await registerUser(a);
    const userId = res.body.user.id as string;
    await pool.query('DELETE FROM diagnostic_state WHERE user_id = $1', [userId]);

    const { result, leases } = await observePoolLeases(() =>
      request(a).get('/diagnostic/next').set('Authorization', `Bearer ${res.body.token}`),
    );

    expect(result.status).toBe(200);
    expect(result.body.progress).toEqual({ asked: 0, maxQuestions: 5 });
    expectCommittedLease(leases.find(({ statements }) => statements.some((text) => text.includes('diagnostic_state'))));
  });

  it('commits and releases both diagnostic claim and result transactions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const { result, leases } = await observePoolLeases(() =>
      answerForm(request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`), next.body.question.id),
    );

    expect(result.status).toBe(200);
    expectCommittedLease(
      leases.find(({ statements }) =>
        statements.some((text) => text.includes('SET processing_question_id = $1, processing_started_at = now()')),
      ),
    );
    expectCommittedLease(
      leases.find(({ statements }) => statements.some((text) => text.includes("VALUES ($1, $2, 'diagnostic', $3"))),
    );
  });

  it('commits and releases both practice claim and result transactions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);

    const { result, leases } = await observePoolLeases(() =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), question.rows[0].id),
    );

    expect(result.status).toBe(200);
    expectCommittedLease(
      leases.find(({ statements }) =>
        statements.some((text) => text.includes('INSERT INTO practice_inflight (user_id, question_id, claim_id)')),
      ),
    );
    const resultLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes("VALUES ($1, $2, 'practice', $3")),
    );
    expectCommittedLease(resultLease);

    const exactClaimDelete = 'DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3';
    const deleteIndex = resultLease!.statements.indexOf(exactClaimDelete);
    const requestCompletionIndex = resultLease!.statements.findIndex((text) =>
      text.includes("SET status = 'completed', response_body = $1::jsonb"),
    );
    const commitIndex = resultLease!.statements.indexOf('COMMIT');
    expect(deleteIndex).toBeGreaterThan(0);
    expect(requestCompletionIndex).toBeGreaterThan(deleteIndex);
    expect(commitIndex).toBeGreaterThan(requestCompletionIndex);
  });

  it('locks the current user before parking a skipped word', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);

    const { result, leases } = await observePoolLeases(() =>
      request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: question.rows[0].id }),
    );

    expect(result.status).toBe(204);
    const skipLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes('INSERT INTO practice_progress')),
    );
    expect(skipLease).toBeDefined();
    expect(skipLease!.statements[0]).toBe('BEGIN');
    expect(skipLease!.statements[1]).toBe(
      'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
    );
    expect(skipLease!.statements.findIndex((text) => text.includes('FROM questions WHERE id = $1'))).toBeGreaterThan(1);
    expect(skipLease!.statements.at(-1)).toBe('COMMIT');
  });

  it('rolls back and releases a practice claim when ownership is already live', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    await pool.query('INSERT INTO practice_inflight (user_id, question_id, claim_id) VALUES ($1, $2, $3)', [
      userId,
      question.rows[0].id,
      randomUUID(),
    ]);

    try {
      const { result, leases } = await observePoolLeases(() =>
        answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), question.rows[0].id),
      );
      expect(result.status).toBe(409);
      expect(result.body).toEqual({
        error: 'An assessment is already in progress for this question',
        code: 'ASSESSMENT_IN_PROGRESS',
      });
      const claim = leases.find(({ statements }) =>
        statements.some((text) => text.includes('INSERT INTO practice_inflight (user_id, question_id, claim_id)')),
      );
      expect(claim?.statements[0]).toBe('BEGIN');
      expect(claim?.statements[claim.releasedAfterStatementCount[0] - 1]).toBe('ROLLBACK');
      expect(claim?.release).toHaveBeenCalledOnce();
    } finally {
      await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [
        userId,
        question.rows[0].id,
      ]);
    }
  });

  it('locks the users parent row before the practice_inflight child row when claiming an attempt', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);

    const { result, leases } = await observePoolLeases(() =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), question.rows[0].id),
    );

    expect(result.status).toBe(200);
    // Account deletion locks users and cascades into practice_inflight, so a
    // claim that touched the child row first — the stale-claim DELETE, or the
    // INSERT's foreign-key check on users — would deadlock (40P01) against a
    // concurrent DELETE /auth/account.
    const claimLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes('INSERT INTO practice_inflight (user_id, question_id, claim_id)')),
    );
    expect(claimLease).toBeDefined();
    expect(claimLease!.statements[0]).toBe('BEGIN');
    expect(claimLease!.statements[1]).toBe(
      'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
    );
    expect(claimLease!.statements.findIndex((text) => text.includes('FROM practice_inflight'))).toBeGreaterThan(1);
  });

  it('locks the users parent row before the diagnostic_state child row in claim, next, finalize, and restart', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const { result, leases } = await observePoolLeases(async () => {
      const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
      const answer = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
      );
      const restart = await request(a)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });
      return { next, answer, restart };
    });

    expect(result.next.status).toBe(200);
    expect(result.answer.status).toBe(200);
    expect(result.restart.status).toBe(204);

    // Account deletion locks users first and cascades into diagnostic_state,
    // so any diagnostic transaction that writes diagnostic_state after locking
    // it would deadlock against it (40P01). All four transactions below reach
    // the child row, so all four must take the parent lock first — and for
    // GET /next that lock is also the authoritative completion check.
    const writerParentLock = 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE';
    const claimParentLock = 'SELECT diagnostic_completed FROM users WHERE id = $1 FOR UPDATE';
    const nextParentLock = 'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE';
    const childLock = 'SELECT * FROM diagnostic_state WHERE user_id = $1 FOR UPDATE';
    const nextLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes('UPDATE diagnostic_state SET current_question_id = $1')),
    );
    const finalizeLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes("VALUES ($1, $2, 'diagnostic', $3")),
    );
    const claimLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes('SET processing_question_id = $1, processing_started_at = now()')),
    );
    const restartLease = leases.find(({ statements }) =>
      statements.some((text) => text.includes('SET low_idx = 0, high_idx = 5')),
    );
    for (const [lease, parentLock] of [
      [nextLease, nextParentLock],
      [claimLease, claimParentLock],
      [finalizeLease, writerParentLock],
      [restartLease, writerParentLock],
    ] as const) {
      expect(lease).toBeDefined();
      const parentAt = lease!.statements.indexOf(parentLock);
      const childAt = lease!.statements.indexOf(childLock);
      expect(parentAt).toBeGreaterThanOrEqual(0);
      expect(childAt).toBeGreaterThan(parentAt);
    }
  });
});
