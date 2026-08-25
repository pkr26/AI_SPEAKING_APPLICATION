import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { preflight } from '../db/preflight';
import { migrate, seed } from '../db/run';
import { assertSafeDestructiveDatabase } from '../db/database-safety';
import { renderSeedSql } from '../db/generate-seed';
import { questions, type QuestionSeed } from '../db/seed-data';
import { assertDatabaseSchemaCurrent, resetQuestionInventoryReadinessCacheForTests } from '../src/schema-readiness';
import { assertSafeTestDatabase, destructivePurposeForEnvironment } from './global-setup';
import { pool } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('database content seeding', () => {
  it('preserves a generated backslash-and-apostrophe literal with standard_conforming_strings disabled', async () => {
    const authored = structuredClone(questions) as QuestionSeed[];
    const promptWord = "folder\\learner's";
    const questionText = "Don't let \\quotes change this catalog text.";
    authored[0]!.promptWord = promptWord;
    authored[0]!.questionText = questionText;
    const firstInsert = renderSeedSql(authored)
      .split('\n')
      .find((line) => line.startsWith('INSERT INTO questions'));
    expect(firstInsert).toBeDefined();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL standard_conforming_strings = 'off'");
      await client.query(`CREATE TEMP TABLE catalog_literal_test (
        cefr_level TEXT NOT NULL,
        prompt_word TEXT NOT NULL,
        question_text TEXT NOT NULL,
        translations JSONB NOT NULL,
        UNIQUE (cefr_level, prompt_word)
      ) ON COMMIT DROP`);
      await client.query(firstInsert!.replace('INSERT INTO questions', 'INSERT INTO catalog_literal_test'));
      const { rows } = await client.query<{ prompt_word: string; question_text: string }>(
        'SELECT prompt_word, question_text FROM catalog_literal_test',
      );
      expect(rows).toEqual([{ prompt_word: promptWord, question_text: questionText }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('executes every production preflight query against the healthy migrated catalog', async () => {
    await expect(preflight(process.env.DATABASE_URL!)).resolves.toBeUndefined();
  });

  it('executes shared preflight/readiness validation and rejects malformed or overfilled catalog data', async () => {
    resetQuestionInventoryReadinessCacheForTests();
    await expect(assertDatabaseSchemaCurrent()).resolves.toEqual({
      latestMigration: '015_public_strings_nonblank.sql',
    });
    const expectInventoryRejected = async () => {
      resetQuestionInventoryReadinessCacheForTests();
      await expect(assertDatabaseSchemaCurrent()).rejects.toThrow('Question inventory is invalid');
      await expect(preflight(process.env.DATABASE_URL!)).rejects.toThrow('database integrity preflight failed');
    };

    const original = await pool.query<{
      id: string;
      prompt_word: string;
      question_text: string;
      translations: Record<string, unknown>;
    }>(
      "SELECT id, prompt_word, question_text, translations FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT 1",
    );
    const { id, prompt_word: promptWord, question_text: questionText, translations } = original.rows[0];
    try {
      for (const path of ['{te,word}', '{te,examples,0,en}']) {
        await pool.query(`UPDATE questions SET translations = jsonb_set(translations, $2, '7'::jsonb) WHERE id = $1`, [
          id,
          path,
        ]);
        await expectInventoryRejected();
        await pool.query('UPDATE questions SET translations = $2::jsonb WHERE id = $1', [
          id,
          JSON.stringify(translations),
        ]);
      }

      await pool.query('UPDATE questions SET prompt_word = $2 WHERE id = $1', [id, '\t\n']);
      await expectInventoryRejected();
      await pool.query('UPDATE questions SET prompt_word = $2 WHERE id = $1', [id, promptWord]);

      // PostgreSQL char_length sees 51 code points, while JavaScript sees 102
      // UTF-16 code units. The shared validator must enforce the app boundary.
      await pool.query('UPDATE questions SET prompt_word = $2 WHERE id = $1', [id, '😀'.repeat(51)]);
      await expectInventoryRejected();
      await pool.query('UPDATE questions SET prompt_word = $2 WHERE id = $1', [id, promptWord]);

      const extra = await pool.query<{ id: string }>(
        `INSERT INTO questions (cefr_level, prompt_word, question_text, translations)
         VALUES ('A1', $1, 'Temporary readiness overfill', $2::jsonb)
         RETURNING id`,
        [`readiness-overfill-${randomUUID()}`, JSON.stringify(translations)],
      );
      try {
        await expectInventoryRejected();
      } finally {
        await pool.query('DELETE FROM questions WHERE id = $1', [extra.rows[0].id]);
      }
    } finally {
      await pool.query(
        `UPDATE questions
         SET prompt_word = $2, question_text = $3, translations = $4::jsonb
         WHERE id = $1`,
        [id, promptWord, questionText, JSON.stringify(translations)],
      );
    }
  });

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
      questions: 600,
    });
  });
});

describe('migration 010/011 invariants', () => {
  it('restricts question deletion while attempts reference it (no cascade data loss)', async () => {
    const email = `restrict_${randomUUID()}@example.com`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Restrict Test', $1, 'not-used', 'te') RETURNING id`,
      [email],
    );
    const question = await pool.query<{ id: string }>(
      `SELECT id FROM questions WHERE cefr_level = 'A1' AND prompt_word = 'family'`,
    );
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', 1, 'hello', 80, true, 'good')`,
      [user.rows[0].id, question.rows[0].id],
    );

    await expect(pool.query('DELETE FROM questions WHERE id = $1', [question.rows[0].id])).rejects.toMatchObject({
      // PostgreSQL 18 reports the SQL-standard RESTRICT code; older supported
      // releases report the more specific foreign-key violation. Both prove
      // the same required contract: attempt history prevents deletion.
      code: expect.stringMatching(/^(23001|23503)$/),
    });
    await pool.query('DELETE FROM users WHERE id = $1', [user.rows[0].id]);
  });

  it('defaults SRS columns for new progress rows and bounds the interval index', async () => {
    const email = `srs_${randomUUID()}@example.com`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('SRS Test', $1, 'not-used', 'te') RETURNING id`,
      [email],
    );
    const question = await pool.query<{ id: string }>(`SELECT id FROM questions WHERE cefr_level = 'A1' LIMIT 1`);
    const userId = user.rows[0].id;
    const questionId = question.rows[0].id;

    // Skip rows carry zero attempts; the relaxed CHECK must admit them while
    // the SRS columns pick up their schema defaults.
    const inserted = await pool.query<{ srs_interval_index: number; due_now: boolean; skipped_until: string | null }>(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       VALUES ($1, $2, 'learning', 0, 0)
       RETURNING srs_interval_index, due_at <= now() AS due_now, skipped_until`,
      [userId, questionId],
    );
    expect(inserted.rows[0]).toEqual({ srs_interval_index: 0, due_now: true, skipped_until: null });

    // Migration 011 tightened the ladder bound to the real 5-step schedule.
    await expect(
      pool.query(`UPDATE practice_progress SET srs_interval_index = 5 WHERE user_id = $1`, [userId]),
    ).rejects.toMatchObject({ code: '23514' }); // check_violation: index clamps at 4
    await expect(
      pool.query(`UPDATE practice_progress SET srs_interval_index = 9 WHERE user_id = $1`, [userId]),
    ).rejects.toMatchObject({ code: '23514' }); // check_violation: index clamps at 4
    await expect(
      pool.query(`UPDATE practice_progress SET attempt_count = -1 WHERE user_id = $1`, [userId]),
    ).rejects.toMatchObject({ code: '23514' }); // relaxed to >= 0, not unbounded
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  it('stores one lowercase-hex reset token per user and cascades with the account', async () => {
    const email = `reset_${randomUUID()}@example.com`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Reset Test', $1, 'not-used', 'te') RETURNING id`,
      [email],
    );
    const userId = user.rows[0].id;
    const tokenHash = 'a'.repeat(64);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '30 minutes')`,
      [userId, tokenHash],
    );
    // One active token per user: a second request must upsert, not accumulate.
    await expect(
      pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '30 minutes')`,
        [userId, 'b'.repeat(64)],
      ),
    ).rejects.toMatchObject({ code: '23505' }); // unique_violation on the PK
    await expect(
      pool.query(`UPDATE password_reset_tokens SET token_hash = $2 WHERE user_id = $1`, [userId, 'Z'.repeat(64)]),
    ).rejects.toMatchObject({ code: '23514' }); // only lowercase sha256 hex is storable

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    const remaining = await pool.query('SELECT 1 FROM password_reset_tokens WHERE user_id = $1', [userId]);
    expect(remaining.rowCount).toBe(0);
  });

  it('tunes autovacuum and fillfactor on the hot upsert tables', async () => {
    const { rows } = await pool.query<{ relname: string; reloptions: string[] | null }>(
      `SELECT relname, reloptions FROM pg_class
       WHERE relname IN ('practice_progress', 'rate_limit_windows')
       ORDER BY relname`,
    );
    expect(rows).toEqual([
      { relname: 'practice_progress', reloptions: ['autovacuum_vacuum_scale_factor=0.01', 'fillfactor=80'] },
      { relname: 'rate_limit_windows', reloptions: ['autovacuum_vacuum_scale_factor=0.01', 'fillfactor=80'] },
    ]);
  });
});

describe('migration 014 attempt-result invariants', () => {
  it('enforces context attempt bounds and derives passed from the score threshold', async () => {
    const email = `attempt_invariants_${randomUUID()}@example.com`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Attempt Invariants', $1, 'not-used', 'te') RETURNING id`,
      [email],
    );
    const question = await pool.query<{ id: string }>('SELECT id FROM questions ORDER BY id LIMIT 1');
    const userId = user.rows[0].id;
    const questionId = question.rows[0].id;
    const insertAttempt = (context: 'diagnostic' | 'practice', attemptNo: number, score: number, passed: boolean) =>
      pool.query(
        `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
         VALUES ($1, $2, $3, $4, 'bounded answer', $5, $6, 'bounded feedback')`,
        [userId, questionId, context, attemptNo, score, passed],
      );

    try {
      await expect(insertAttempt('diagnostic', 1, 59, false)).resolves.toMatchObject({ rowCount: 1 });
      await expect(insertAttempt('diagnostic', 5, 60, true)).resolves.toMatchObject({ rowCount: 1 });
      await expect(insertAttempt('practice', 1, 100, true)).resolves.toMatchObject({ rowCount: 1 });
      await expect(insertAttempt('practice', 3, 0, false)).resolves.toMatchObject({ rowCount: 1 });

      for (const invalid of [
        ['diagnostic', 0, 59, false],
        ['diagnostic', 6, 60, true],
        ['practice', 0, 59, false],
        ['practice', 4, 60, true],
        ['diagnostic', 1, 59, true],
        ['practice', 1, 60, false],
      ] as const) {
        const [context, attemptNo, score, passed] = invalid;
        await expect(insertAttempt(context, attemptNo, score, passed)).rejects.toMatchObject({ code: '23514' });
      }

      const constraints = await pool.query<{ conname: string; convalidated: boolean }>(
        `SELECT conname, convalidated
         FROM pg_constraint
         WHERE conrelid = 'attempts'::regclass
           AND conname IN ('attempts_context_attempt_no_check', 'attempts_passed_score_check')
         ORDER BY conname`,
      );
      expect(constraints.rows).toEqual([
        { conname: 'attempts_context_attempt_no_check', convalidated: true },
        { conname: 'attempts_passed_score_check', convalidated: true },
      ]);
      const retiredConstraint = await pool.query(
        `SELECT 1 FROM pg_constraint
         WHERE conrelid = 'attempts'::regclass
           AND conname = 'attempts_attempt_no_check'`,
      );
      expect(retiredConstraint.rowCount).toBe(0);
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it.each([
    ['attempt number', 4, 59, false],
    ['passed/score derivation', 1, 59, true],
  ] as const)('fails atomically when a legacy row has an invalid %s', async (_caseName, attemptNo, score, passed) => {
    const client = await pool.connect();
    const schema = `attempt_invariant_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query(`CREATE TABLE attempts (
        context TEXT NOT NULL CHECK (context IN ('diagnostic', 'practice')),
        attempt_no INT NOT NULL,
        score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
        passed BOOLEAN NOT NULL,
        CONSTRAINT attempts_attempt_no_check CHECK (attempt_no > 0)
      )`);
      await client.query("INSERT INTO attempts VALUES ('practice', $1, $2, $3)", [attemptNo, score, passed]);
      await client.query('SAVEPOINT before_attempt_invariants');

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/014_attempt_result_invariants.sql'), 'utf8');
      await expect(client.query(sql)).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_attempt_invariants');

      const constraints = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint
         WHERE conrelid = 'attempts'::regclass
           AND conname IN (
             'attempts_attempt_no_check',
             'attempts_context_attempt_no_check',
             'attempts_passed_score_check'
           )
         ORDER BY conname`,
      );
      expect(constraints.rows).toEqual([{ conname: 'attempts_attempt_no_check' }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 015 public-string invariants', () => {
  it('rejects ECMAScript-whitespace-only user identity and attempt feedback fields', async () => {
    const validEmail = `public_strings_${randomUUID()}@example.com`;
    const question = await pool.query<{ id: string }>('SELECT id FROM questions ORDER BY id LIMIT 1');
    const blank = `\t\u00a0\ufeff`;

    await expect(
      pool.query(
        `INSERT INTO users (name, email, password_hash, native_language)
         VALUES ($1, $2, 'not-used', 'te')`,
        [blank, `blank_name_${randomUUID()}@example.com`],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        `INSERT INTO users (name, email, password_hash, native_language)
         VALUES ('Valid Name', $1, 'not-used', 'te')`,
        [blank],
      ),
    ).rejects.toMatchObject({ code: '23514' });

    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Public String Invariants', $1, 'not-used', 'te') RETURNING id`,
      [validEmail],
    );
    const userId = user.rows[0].id;
    try {
      await expect(
        pool.query(
          `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
           VALUES ($1, $2, 'practice', 1, 'bounded answer', 60, true, $3)`,
          [userId, question.rows[0].id, blank],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      const constraints = await pool.query<{ conname: string; convalidated: boolean }>(
        `SELECT conname, convalidated
         FROM pg_constraint
         WHERE conname IN (
           'users_name_nonblank_check',
           'users_email_nonblank_check',
           'attempts_feedback_nonblank_check'
         )
         ORDER BY conname`,
      );
      expect(constraints.rows).toEqual([
        { conname: 'attempts_feedback_nonblank_check', convalidated: true },
        { conname: 'users_email_nonblank_check', convalidated: true },
        { conname: 'users_name_nonblank_check', convalidated: true },
      ]);
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it.each([
    ['user name', `\t\u00a0\ufeff`, 'learner@example.com', 'Helpful feedback.'],
    ['user email', 'Learner', `\t\u00a0\ufeff`, 'Helpful feedback.'],
    ['attempt feedback', 'Learner', 'learner@example.com', `\t\u00a0\ufeff`],
  ] as const)('fails atomically when a legacy row has blank %s', async (_caseName, name, email, feedback) => {
    const client = await pool.connect();
    const schema = `public_string_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE users (name TEXT NOT NULL, email TEXT NOT NULL)');
      await client.query('CREATE TABLE attempts (feedback TEXT NOT NULL)');
      await client.query('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email]);
      await client.query('INSERT INTO attempts (feedback) VALUES ($1)', [feedback]);
      await client.query('SAVEPOINT before_public_string_invariants');

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/015_public_strings_nonblank.sql'), 'utf8');
      await expect(client.query(sql)).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_public_string_invariants');

      const constraints = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint
           WHERE connamespace = $1::regnamespace
             AND conname IN (
               'users_name_nonblank_check',
               'users_email_nonblank_check',
               'attempts_feedback_nonblank_check'
             )`,
        [schema],
      );
      expect(constraints.rows).toEqual([]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
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

  it('repairs legacy duplicate audio bindings before enforcing one logical owner per S3 key', async () => {
    const client = await pool.connect();
    const schema = `audio_binding_upgrade_${randomUUID().replace(/-/g, '')}`;
    const userA = randomUUID();
    const userB = randomUUID();
    const questionId = randomUUID();
    const sharedKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const completedKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const liveKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const expiredCompletedKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const processingBoundaryKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const completedBoundaryKey = `audio-uploads/${userA}/${randomUUID()}.m4a`;
    const retainedSharedCompletion = randomUUID();
    const retainedCompletedRequest = randomUUID();
    const retainedLiveRequest = randomUUID();
    const processingBoundaryRequest = randomUUID();
    const completedBoundaryRequest = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query(`CREATE TABLE assessment_requests (
        user_id UUID NOT NULL,
        request_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        context TEXT NOT NULL,
        question_id UUID NOT NULL,
        status TEXT NOT NULL,
        response_body JSONB,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        audio_key TEXT,
        PRIMARY KEY (user_id, request_id)
      )`);
      const insertRequest = async ({
        userId = userA,
        requestId = randomUUID(),
        status,
        ageMinutes,
        audioKey,
      }: {
        userId?: string;
        requestId?: string;
        status: 'processing' | 'completed';
        ageMinutes: number;
        audioKey: string | null;
      }) =>
        client.query(
          `INSERT INTO assessment_requests
             (user_id, request_id, claim_id, context, question_id, status, response_body,
              started_at, completed_at, audio_key)
           VALUES ($1, $2, $3, 'practice', $4, $5,
                   CASE WHEN $5 = 'completed' THEN '{"done":true}'::jsonb ELSE NULL END,
                   now() - ($6 * interval '1 minute'),
                   CASE WHEN $5 = 'completed' THEN now() - ($6 * interval '1 minute') ELSE NULL END,
                   $7)`,
          [userId, requestId, randomUUID(), questionId, status, ageMinutes, audioKey],
        );

      // A completed tombstone must beat an expired processing lease.
      await insertRequest({
        requestId: retainedSharedCompletion,
        status: 'completed',
        ageMinutes: 1,
        audioKey: sharedKey,
      });
      await insertRequest({ status: 'processing', ageMinutes: 6, audioKey: sharedKey });
      // With no live worker, newest completion owns the binding.
      await insertRequest({ status: 'completed', ageMinutes: 2, audioKey: completedKey });
      await insertRequest({
        requestId: retainedCompletedRequest,
        status: 'completed',
        ageMinutes: 1,
        audioKey: completedKey,
      });
      // One live worker may safely outlive an expired processing duplicate.
      await insertRequest({ requestId: retainedLiveRequest, status: 'processing', ageMinutes: 1, audioKey: liveKey });
      await insertRequest({ status: 'processing', ageMinutes: 6, audioKey: liveKey });
      await insertRequest({ status: 'completed', ageMinutes: 49 * 60, audioKey: expiredCompletedKey });
      await insertRequest({
        requestId: processingBoundaryRequest,
        status: 'processing',
        ageMinutes: 5,
        audioKey: processingBoundaryKey,
      });
      await insertRequest({
        requestId: completedBoundaryRequest,
        status: 'completed',
        ageMinutes: 48 * 60,
        audioKey: completedBoundaryKey,
      });
      // The same key remains independently ownable by another learner.
      await insertRequest({ userId: userB, status: 'processing', ageMinutes: 1, audioKey: sharedKey });
      await insertRequest({ status: 'processing', ageMinutes: 0, audioKey: null });
      await insertRequest({ status: 'processing', ageMinutes: 0, audioKey: null });

      const sql = fs.readFileSync(
        path.join(__dirname, '../db/migrations/013_assessment_audio_key_uniqueness.sql'),
        'utf8',
      );
      const writerLockAt = sql.indexOf('LOCK TABLE assessment_requests IN SHARE ROW EXCLUSIVE MODE');
      const normalizationAt = sql.indexOf('UPDATE assessment_requests');
      const uniqueIndexAt = sql.indexOf('CREATE UNIQUE INDEX uq_assessment_requests_user_audio_key');
      expect(writerLockAt).toBeGreaterThanOrEqual(0);
      expect(writerLockAt).toBeLessThan(normalizationAt);
      expect(writerLockAt).toBeLessThan(uniqueIndexAt);
      await client.query(sql);

      const retained = await client.query<{ user_id: string; request_id: string; audio_key: string }>(
        `SELECT user_id, request_id, audio_key
         FROM assessment_requests
         WHERE audio_key IS NOT NULL
         ORDER BY user_id, audio_key`,
      );
      expect(retained.rows).toEqual(
        expect.arrayContaining([
          { user_id: userA, request_id: retainedSharedCompletion, audio_key: sharedKey },
          { user_id: userA, request_id: retainedCompletedRequest, audio_key: completedKey },
          { user_id: userA, request_id: retainedLiveRequest, audio_key: liveKey },
          { user_id: userA, request_id: processingBoundaryRequest, audio_key: processingBoundaryKey },
          { user_id: userA, request_id: completedBoundaryRequest, audio_key: completedBoundaryKey },
          { user_id: userB, request_id: expect.any(String), audio_key: sharedKey },
        ]),
      );
      expect(retained.rows).toHaveLength(6);

      const cleared = await client.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM assessment_requests WHERE user_id = $1 AND audio_key IS NULL',
        [userA],
      );
      expect(cleared.rows[0].n).toBe(6); // two expired leases, one expired completion/loser, and two unbound rows

      await client.query('SAVEPOINT duplicate_audio_key');
      try {
        await expect(
          client.query(
            `INSERT INTO assessment_requests
               (user_id, request_id, claim_id, context, question_id, status, started_at, audio_key)
             VALUES ($1, $2, $3, 'practice', $4, 'processing', now(), $5)`,
            [userA, randomUUID(), randomUUID(), questionId, sharedKey],
          ),
        ).rejects.toMatchObject({ code: '23505' });
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT duplicate_audio_key');
      }
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it.each([
    ['a live worker plus a completed owner', 'completed', 'processing'],
    ['two live processing workers', 'processing', 'processing'],
  ] as const)('fails migration 013 instead of collapsing %s', async (_caseName, firstStatus, secondStatus) => {
    const client = await pool.connect();
    const schema = `audio_binding_conflict_${randomUUID().replace(/-/g, '')}`;
    const userId = randomUUID();
    const questionId = randomUUID();
    const audioKey = `audio-uploads/${userId}/${randomUUID()}.m4a`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query(`CREATE TABLE assessment_requests (
        user_id UUID NOT NULL,
        request_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        context TEXT NOT NULL,
        question_id UUID NOT NULL,
        status TEXT NOT NULL,
        response_body JSONB,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        audio_key TEXT,
        PRIMARY KEY (user_id, request_id)
      )`);
      await client.query(
        `INSERT INTO assessment_requests
           (user_id, request_id, claim_id, context, question_id, status, response_body,
            started_at, completed_at, audio_key)
         VALUES
           ($1, $2, $3, 'practice', $4, $5,
             CASE WHEN $5 = 'completed' THEN '{"done":true}'::jsonb ELSE NULL END,
             now(), CASE WHEN $5 = 'completed' THEN now() ELSE NULL END, $6),
           ($1, $7, $8, 'practice', $4, $9,
             CASE WHEN $9 = 'completed' THEN '{"done":true}'::jsonb ELSE NULL END,
             now(), CASE WHEN $9 = 'completed' THEN now() ELSE NULL END, $6)`,
        [
          userId,
          randomUUID(),
          randomUUID(),
          questionId,
          firstStatus,
          audioKey,
          randomUUID(),
          randomUUID(),
          secondStatus,
        ],
      );
      const sql = fs.readFileSync(
        path.join(__dirname, '../db/migrations/013_assessment_audio_key_uniqueness.sql'),
        'utf8',
      );

      await expect(client.query(sql)).rejects.toMatchObject({
        code: '55000',
        message: expect.stringContaining('cannot safely deduplicate live assessment audio owners'),
      });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('takes the migration-013 writer lock before normalization can yield to concurrent inserts', async () => {
    const schema = `audio_binding_lock_${randomUUID().replace(/-/g, '')}`;
    const triggerFunction = `pause_audio_normalization_${randomUUID().replace(/-/g, '')}`;
    const triggerName = `pause_audio_normalization_${randomUUID().replace(/-/g, '')}`;
    const barrierName = `migration-013-test-${randomUUID()}`;
    const owner = await pool.connect();
    const blocker = await pool.connect();
    const rival = await pool.connect();
    let ownerTransactionOpen = false;
    let barrierHeld = false;
    let migrationOutcome: Promise<unknown> | undefined;
    let rivalInsertOutcome: Promise<unknown> | undefined;
    try {
      await pool.query(`CREATE SCHEMA "${schema}"`);
      await pool.query(`CREATE TABLE "${schema}".assessment_requests (
        user_id UUID NOT NULL,
        request_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        context TEXT NOT NULL,
        question_id UUID NOT NULL,
        status TEXT NOT NULL,
        response_body JSONB,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        audio_key TEXT,
        PRIMARY KEY (user_id, request_id)
      )`);
      await pool.query(`CREATE FUNCTION "${schema}"."${triggerFunction}"() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM pg_advisory_xact_lock(hashtext('${barrierName}'));
          RETURN NEW;
        END
      $$`);
      await pool.query(`CREATE TRIGGER "${triggerName}"
        BEFORE UPDATE ON "${schema}".assessment_requests
        FOR EACH ROW EXECUTE FUNCTION "${schema}"."${triggerFunction}"()`);
      const userId = randomUUID();
      const questionId = randomUUID();
      await pool.query(
        `INSERT INTO "${schema}".assessment_requests
           (user_id, request_id, claim_id, context, question_id, status, started_at, audio_key)
         VALUES ($1, $2, $3, 'practice', $4, 'processing', now() - interval '6 minutes', $5)`,
        [userId, randomUUID(), randomUUID(), questionId, `audio-uploads/${userId}/${randomUUID()}.m4a`],
      );

      await blocker.query('SELECT pg_advisory_lock(hashtext($1))', [barrierName]);
      barrierHeld = true;
      const blockerPid = (await blocker.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const ownerPid = (await owner.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const rivalPid = (await rival.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const sql = fs.readFileSync(
        path.join(__dirname, '../db/migrations/013_assessment_audio_key_uniqueness.sql'),
        'utf8',
      );

      await owner.query('BEGIN');
      ownerTransactionOpen = true;
      await owner.query(`SET LOCAL search_path TO "${schema}", public`);
      migrationOutcome = owner.query(sql).then(
        () => ({ status: 'fulfilled' as const }),
        (error: unknown) => ({ status: 'rejected' as const, error }),
      );
      await vi.waitFor(
        async () => {
          const blocked = await pool.query(
            'SELECT 1 FROM pg_stat_activity WHERE pid = $1 AND $2::integer = ANY(pg_blocking_pids(pid))',
            [ownerPid, blockerPid],
          );
          expect(blocked.rowCount).toBe(1);
        },
        { timeout: 5_000, interval: 10 },
      );

      rivalInsertOutcome = rival
        .query(
          `INSERT INTO "${schema}".assessment_requests
             (user_id, request_id, claim_id, context, question_id, status, started_at, audio_key)
           VALUES ($1, $2, $3, 'practice', $4, 'processing', now(), $5)`,
          [userId, randomUUID(), randomUUID(), questionId, `audio-uploads/${userId}/${randomUUID()}.m4a`],
        )
        .then(
          (result) => ({ status: 'fulfilled' as const, result }),
          (error: unknown) => ({ status: 'rejected' as const, error }),
        );
      await vi.waitFor(
        async () => {
          const blocked = await pool.query(
            'SELECT 1 FROM pg_stat_activity WHERE pid = $1 AND $2::integer = ANY(pg_blocking_pids(pid))',
            [rivalPid, ownerPid],
          );
          expect(blocked.rowCount).toBe(1);
        },
        { timeout: 5_000, interval: 10 },
      );

      const unlocked = await blocker.query<{ unlocked: boolean }>(
        'SELECT pg_advisory_unlock(hashtext($1)) AS unlocked',
        [barrierName],
      );
      expect(unlocked.rows[0].unlocked).toBe(true);
      barrierHeld = false;
      await expect(migrationOutcome).resolves.toEqual({ status: 'fulfilled' });
      await owner.query('COMMIT');
      ownerTransactionOpen = false;
      await expect(rivalInsertOutcome).resolves.toMatchObject({ status: 'fulfilled', result: { rowCount: 1 } });
    } finally {
      if (barrierHeld)
        await blocker.query('SELECT pg_advisory_unlock(hashtext($1))', [barrierName]).catch(() => undefined);
      if (ownerTransactionOpen) await owner.query('ROLLBACK').catch(() => undefined);
      await migrationOutcome?.catch(() => undefined);
      await rivalInsertOutcome?.catch(() => undefined);
      owner.release();
      blocker.release();
      rival.release();
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  });
});

describe('destructive test database guard', () => {
  it('rejects a database without the _test suffix', () => {
    expect(() => assertSafeTestDatabase('postgres://localhost:5432/production', undefined)).toThrow(
      'must name a database ending in _test',
    );
  });

  it('rejects the application database even when connection URLs differ', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgres://tester@localhost:5432/example_test',
        'postgresql://app@localhost:5432/example_test',
      ),
    ).toThrow('matches DATABASE_URL');
  });

  it('treats localhost and 127.0.0.1 as the same destructive target', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgres://tester@localhost:5432/example_test',
        'postgresql://app@127.0.0.1:5432/example_test',
      ),
    ).toThrow('matches DATABASE_URL');
  });

  it('rejects remote databases even when their name ends in _test', () => {
    expect(() => assertSafeTestDatabase('postgres://db.production.internal:5432/customer_test', undefined)).toThrow(
      'non-loopback',
    );
  });

  it.each([
    'postgres://localhost:5432/customer_test?host=db.production.internal',
    'postgres://localhost:5432/customer_test?port=6543',
    'postgres://localhost:5432/customer_test#override',
  ])('rejects an ambiguous destructive target: %s', (url) => {
    expect(() => assertSafeTestDatabase(url, undefined)).toThrow('must not contain query parameters');
  });

  it('rejects connection-target overrides in DATABASE_URL before comparing targets', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgres://localhost:5432/customer_test',
        'postgres://db.production.internal/customer_test?host=localhost',
      ),
    ).toThrow('DATABASE_URL must not contain query parameters');
  });

  it.each([
    ['https://localhost:5432/customer_test', 'postgres or postgresql'],
    ['postgres://localhost:5432/customer%2Fother_test', 'exactly one database name'],
    ['postgres://localhost:5432/customer%ZZ_test', 'invalid encoded database name'],
    ['postgres:///customer_test', 'must include a hostname'],
    ['postgres://localhost/customer_test', 'explicit port'],
    ['postgres://localhost:0/customer_test', 'invalid effective PostgreSQL port'],
  ])('rejects malformed destructive connection URLs', (url, message) => {
    expect(() => assertSafeTestDatabase(url, undefined)).toThrow(message);
  });

  it('uses PGPORT when comparing an application URL without an explicit port', () => {
    const previous = process.env.PGPORT;
    process.env.PGPORT = '6543';
    try {
      expect(() =>
        assertSafeTestDatabase('postgres://localhost:6543/customer_test', 'postgres://127.0.0.1/customer_test'),
      ).toThrow('matches DATABASE_URL');
    } finally {
      if (previous === undefined) delete process.env.PGPORT;
      else process.env.PGPORT = previous;
    }
  });

  it.each(['LOCALHOST', 'localhost.'])(
    'normalizes the application loopback spelling %s before comparing targets',
    (host) => {
      expect(() =>
        assertSafeTestDatabase('postgres://localhost:5432/customer_test', `postgres://${host}:5432/customer_test`),
      ).toThrow('matches DATABASE_URL');
    },
  );

  it.each(['05432', ' 5432', '5432suffix'])('normalizes PGPORT=%j exactly as node-postgres does', (port) => {
    const previous = process.env.PGPORT;
    process.env.PGPORT = port;
    try {
      expect(() =>
        assertSafeTestDatabase('postgres://localhost:5432/customer_test', 'postgres://127.0.0.1/customer_test'),
      ).toThrow('matches DATABASE_URL');
    } finally {
      if (previous === undefined) delete process.env.PGPORT;
      else process.env.PGPORT = previous;
    }
  });

  it('rejects an application URL without a hostname instead of using ambient PGHOST', () => {
    expect(() =>
      assertSafeTestDatabase('postgres://localhost:5432/customer_test', 'postgres:///customer_test'),
    ).toThrow('DATABASE_URL must include a hostname');
  });

  it('applies the stricter mutation guard at the destructive moment when MUTATION_LANE is set', () => {
    // Direct `npx stryker` runs bypass the npm pre-step guard, so globalSetup
    // must escalate to the mutation rules on its own. (Calling globalSetup
    // itself is not test-safe: with a valid mutation URL it would drop a
    // database mid-suite.)
    expect(destructivePurposeForEnvironment({})).toBe('test');
    expect(destructivePurposeForEnvironment({ MUTATION_LANE: 'config' })).toBe('mutation');
    expect(() =>
      assertSafeDestructiveDatabase(
        'postgres://localhost:5432/ai_english_test',
        undefined,
        destructivePurposeForEnvironment({ MUTATION_LANE: 'config' }),
      ),
    ).toThrow('must name a dedicated mutation database');
  });
});
