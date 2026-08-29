import { Express } from 'express';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';

export { pool };

export function app(): Express {
  return createApp();
}

/** Properly-formed ISO BMFF header: box size + 'ftyp' at offset 4. */
export function fakeM4aBuffer(): Buffer {
  return Buffer.from('00000018667479704d34412000000000', 'hex');
}

let counter = 0;
export function uniqueEmail(prefix = 't'): string {
  counter++;
  return `${prefix}_${Date.now()}_${process.pid}_${counter}_${randomUUID()}@example.com`;
}

export const STRONG_PASSWORD = 'passw0rd123';

export async function registerUser(a: Express, overrides: Record<string, unknown> = {}) {
  const body = {
    name: 'Test User',
    email: uniqueEmail(),
    password: STRONG_PASSWORD,
    nativeLanguage: 'te',
    ...overrides,
  };
  const res = await request(a).post('/auth/register').send(body);
  return { res, body };
}

/** Create immutable practice history owned by one learner/question fixture. */
export async function createClosedPracticeCycle(userId: string, questionId: string, attemptsUsed = 1): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO practice_cycles
       (user_id, question_id, kind, attempts_used, status, closed_at)
     VALUES ($1, $2, 'revision', $3, 'closed', now())
     RETURNING id`,
    [userId, questionId, attemptsUsed],
  );
  return rows[0].id;
}

/** Attach a valid-audio multipart form with the given questionId/requestId. */
export function answerForm(req: request.Test, questionId: string, requestId = randomUUID(), cycleId?: string | null) {
  const form = req
    .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
    .field('questionId', questionId)
    .field('requestId', requestId);
  const resolvedCycleId =
    cycleId === undefined && new URL(req.url).pathname.startsWith('/practice/') ? randomUUID() : cycleId;
  return resolvedCycleId == null ? form : form.field('cycleId', resolvedCycleId);
}

/**
 * Run a freshly-registered user through the whole diagnostic with MOCK_AI.
 * Returns the token and assigned level.
 */
export async function completeDiagnostic(a: Express, token: string): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    if (next.status !== 200) {
      throw new Error(`diagnostic next failed: ${next.status} ${JSON.stringify(next.body)}`);
    }
    if (next.body.done) {
      if (typeof next.body.level !== 'string') {
        throw new Error(`diagnostic completion omitted its level: ${JSON.stringify(next.body)}`);
      }
      return next.body.level;
    }
    const questionId = next.body?.question?.id;
    if (typeof questionId !== 'string') {
      throw new Error(`diagnostic next omitted its question: ${JSON.stringify(next.body)}`);
    }
    const res = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      questionId,
      randomUUID(),
      null,
    );
    if (res.status !== 200) throw new Error(`diagnostic answer failed: ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.done) {
      if (typeof res.body.level !== 'string') {
        throw new Error(`diagnostic answer completion omitted its level: ${JSON.stringify(res.body)}`);
      }
      return res.body.level;
    }
  }
  throw new Error('diagnostic did not finish within 3 answers');
}
