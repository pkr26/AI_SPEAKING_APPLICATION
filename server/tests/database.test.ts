import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { migrate, seed } from '../db/run';
import { assertSafeTestDatabase } from './global-setup';
import { pool } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('database content seeding', () => {
  it('is idempotent and preserves question IDs, attempts, and diagnostic state', async () => {
    const email = `seed_${randomUUID()}@example.com`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Seed Test', $1, 'not-used', 'te') RETURNING id`,
      [email],
    );
    const question = await pool.query<{ id: string }>(
      `SELECT id FROM questions WHERE cefr_level = 'A1' AND prompt_word = 'family'`,
    );
    const userId = user.rows[0].id;
    const questionId = question.rows[0].id;

    await pool.query(
      `INSERT INTO diagnostic_state (user_id, low_idx, high_idx, questions_asked, current_question_id)
       VALUES ($1, 0, 5, 1, $2)`,
      [userId, questionId],
    );
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, 'hello', 80, true, 'good')`,
      [userId, questionId],
    );
    await pool.query("UPDATE questions SET question_text = 'stale content' WHERE id = $1", [questionId]);

    await seed(process.env.DATABASE_URL!, () => {});
    await seed(process.env.DATABASE_URL!, () => {});

    const preserved = await pool.query<{
      question_id: string;
      question_text: string;
      attempts: number;
      states: number;
      questions: number;
    }>(
      `SELECT
         (SELECT id FROM questions WHERE cefr_level = 'A1' AND prompt_word = 'family') AS question_id,
         (SELECT question_text FROM questions WHERE id = $2) AS question_text,
         (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts,
         (SELECT count(*)::int FROM diagnostic_state WHERE user_id = $1) AS states,
         (SELECT count(*)::int FROM questions) AS questions`,
      [userId, questionId],
    );
    expect(preserved.rows[0]).toEqual({
      question_id: questionId,
      question_text: 'Talk about your family. Who is in your family?',
      attempts: 1,
      states: 1,
      questions: 36,
    });
  });
});

describe('migration integrity', () => {
  it('rejects edits to an already-applied migration', async () => {
    const name = '001_init.sql';
    const current = await pool.query<{ checksum: string }>('SELECT checksum FROM schema_migrations WHERE name = $1', [
      name,
    ]);
    const checksum = current.rows[0].checksum;
    await pool.query('UPDATE schema_migrations SET checksum = $1 WHERE name = $2', ['0'.repeat(64), name]);
    try {
      await expect(migrate(process.env.DATABASE_URL!, () => {})).rejects.toThrow(
        `applied migration ${name} has changed (checksum mismatch)`,
      );
    } finally {
      await pool.query('UPDATE schema_migrations SET checksum = $1 WHERE name = $2', [checksum, name]);
    }
  });

  it('upgrades populated migration-005 replay rows with ownership tokens', async () => {
    const client = await pool.connect();
    const schema = `migration_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE users (id UUID PRIMARY KEY)');
      await client.query('CREATE TABLE questions (id UUID PRIMARY KEY)');
      await client.query(`CREATE TABLE assessment_requests (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_id UUID NOT NULL,
        context TEXT NOT NULL CHECK (context IN ('diagnostic', 'practice')),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('processing', 'completed')),
        response_body JSONB,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ,
        PRIMARY KEY (user_id, request_id)
      )`);
      const userId = randomUUID();
      const questionId = randomUUID();
      await client.query('INSERT INTO users (id) VALUES ($1)', [userId]);
      await client.query('INSERT INTO questions (id) VALUES ($1)', [questionId]);
      await client.query(
        `INSERT INTO assessment_requests
           (user_id, request_id, context, question_id, status, response_body, completed_at)
         VALUES
           ($1, $3, 'practice', $2, 'processing', NULL, NULL),
           ($1, $4, 'diagnostic', $2, 'completed', '{"done":true}'::jsonb, now())`,
        [userId, questionId, randomUUID(), randomUUID()],
      );

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/006_assessment_request_claims.sql'), 'utf8');
      await client.query(sql);

      const upgraded = await client.query<{ claim_id: string }>(
        'SELECT claim_id FROM assessment_requests ORDER BY request_id',
      );
      expect(upgraded.rows).toHaveLength(2);
      expect(upgraded.rows.every((row) => /^[0-9a-f-]{36}$/i.test(row.claim_id))).toBe(true);
      expect(upgraded.rows[0].claim_id).not.toBe(upgraded.rows[1].claim_id);
      await client.query('SAVEPOINT missing_claim');
      try {
        await expect(
          client.query(
            `INSERT INTO assessment_requests (user_id, request_id, context, question_id, status)
             VALUES ($1, $2, 'practice', $3, 'processing')`,
            [userId, randomUUID(), questionId],
          ),
        ).rejects.toMatchObject({ code: '23502' });
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT missing_claim');
      }
      const indexes = await client.query<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = $1 AND tablename = 'assessment_requests'`,
        [schema],
      );
      expect(indexes.rows.map((row) => row.indexname)).toContain('idx_assessment_requests_completed_at');
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});

describe('destructive test database guard', () => {
  it('rejects a database without the _test suffix', () => {
    expect(() => assertSafeTestDatabase('postgres://localhost/production', undefined)).toThrow(
      'must name a database ending in _test',
    );
  });

  it('rejects the application database even when connection URLs differ', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgres://tester@localhost/example_test',
        'postgresql://app@localhost:5432/example_test',
      ),
    ).toThrow('matches DATABASE_URL');
  });

  it('treats localhost and 127.0.0.1 as the same destructive target', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgres://tester@localhost/example_test',
        'postgresql://app@127.0.0.1:5432/example_test',
      ),
    ).toThrow('matches DATABASE_URL');
  });

  it('rejects remote databases even when their name ends in _test', () => {
    expect(() => assertSafeTestDatabase('postgres://db.production.internal/customer_test', undefined)).toThrow(
      'non-loopback',
    );
  });
});
