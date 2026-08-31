import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { preflight } from '../db/preflight';
import { migrate, seed } from '../db/run';
import { assertSafeDestructiveDatabase } from '../db/database-safety';
import { renderSeedSql } from '../db/generate-seed';
import { ASSESSMENT_RECOVERY_CUTOVER, RECORDING_PRIVACY_CUTOVER } from '../db/schema-cutover';
import { questions, type QuestionSeed } from '../db/seed-data';
import { assertDatabaseSchemaCurrent, resetQuestionInventoryReadinessCacheForTests } from '../src/schema-readiness';
import { assertSafeTestDatabase, destructivePurposeForEnvironment } from './global-setup';
import { createClosedPracticeCycle, pool } from './helpers';

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
      latestMigration: '026_attempts_question_snapshots.sql',
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
    const cycleId = await createClosedPracticeCycle(user.rows[0].id, question.rows[0].id);
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
       VALUES ($1, $2, 'practice', 1, 'hello', 80, true, 'good', $3)`,
      [user.rows[0].id, question.rows[0].id, cycleId],
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
    const insertAttempt = async (
      context: 'diagnostic' | 'practice',
      attemptNo: number,
      score: number,
      passed: boolean,
    ) => {
      const cycleId =
        context === 'practice'
          ? await createClosedPracticeCycle(userId, questionId, Math.max(0, Math.min(3, attemptNo)))
          : null;
      return pool.query(
        `INSERT INTO attempts
           (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
         VALUES ($1, $2, $3, $4, 'bounded answer', $5, $6, 'bounded feedback', $7)`,
        [userId, questionId, context, attemptNo, score, passed, cycleId],
      );
    };

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
      await client.query('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
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
      const cycleId = await createClosedPracticeCycle(userId, question.rows[0].id);
      await expect(
        pool.query(
          `INSERT INTO attempts
             (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
           VALUES ($1, $2, 'practice', 1, 'bounded answer', 60, true, $3, $4)`,
          [userId, question.rows[0].id, blank, cycleId],
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

describe('migration 016 user UI language', () => {
  it('backfills existing users, defaults new users to English, and rejects unsupported values', async () => {
    const client = await pool.connect();
    const schema = `ui_language_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
      await client.query('INSERT INTO users (id) VALUES (1)');

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/016_user_ui_language.sql'), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO users (id) VALUES (2)');

      const rows = await client.query<{ id: number; ui_language: string }>(
        'SELECT id, ui_language FROM users ORDER BY id',
      );
      expect(rows.rows).toEqual([
        { id: 1, ui_language: 'en' },
        { id: 2, ui_language: 'en' },
      ]);

      const column = await client.query<{ is_nullable: string; column_default: string }>(
        `SELECT is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'ui_language'`,
        [schema],
      );
      expect(column.rows).toEqual([{ is_nullable: 'NO', column_default: "'en'::text" }]);

      await expect(client.query("INSERT INTO users (id, ui_language) VALUES (3, 'fr')")).rejects.toMatchObject({
        code: '23514',
      });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 019 diagnostic acknowledgement', () => {
  it('repairs impossible legacy in-progress states, preserves completed state, and backfills acknowledgement', async () => {
    const client = await pool.connect();
    const schema = `diagnostic_ack_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE users (id INTEGER PRIMARY KEY, diagnostic_completed BOOLEAN NOT NULL)');
      await client.query(`CREATE TABLE diagnostic_state (
        user_id INTEGER PRIMARY KEY,
        low_idx INTEGER NOT NULL,
        high_idx INTEGER NOT NULL,
        questions_asked INTEGER NOT NULL,
        current_question_id INTEGER,
        processing_question_id INTEGER,
        processing_started_at TIMESTAMPTZ,
        processing_claim_id UUID
      )`);
      await client.query('INSERT INTO users (id, diagnostic_completed) VALUES (1, false), (2, true), (3, false)');
      await client.query(
        `INSERT INTO diagnostic_state
           (user_id, low_idx, high_idx, questions_asked, current_question_id,
            processing_question_id, processing_started_at, processing_claim_id)
         VALUES
           (1, 2, 5, 3, 10, 10, now(), gen_random_uuid()),
           (2, 4, 3, 4, NULL, NULL, NULL, NULL),
           (3, 1, 4, 2, 11, NULL, NULL, NULL)`,
      );

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/019_diagnostic_acknowledgement.sql'), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO users (id, diagnostic_completed) VALUES (4, false)');

      const rows = await client.query<{ id: number; diagnostic_acknowledged: boolean }>(
        'SELECT id, diagnostic_acknowledged FROM users ORDER BY id',
      );
      expect(rows.rows).toEqual([
        { id: 1, diagnostic_acknowledged: false },
        { id: 2, diagnostic_acknowledged: true },
        { id: 3, diagnostic_acknowledged: false },
        { id: 4, diagnostic_acknowledged: false },
      ]);
      const states = await client.query(
        `SELECT user_id, low_idx, high_idx, questions_asked, current_question_id,
                processing_question_id, processing_started_at, processing_claim_id
         FROM diagnostic_state ORDER BY user_id`,
      );
      expect(states.rows).toEqual([
        {
          user_id: 1,
          low_idx: 0,
          high_idx: 5,
          questions_asked: 0,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 2,
          low_idx: 4,
          high_idx: 3,
          questions_asked: 4,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 3,
          low_idx: 1,
          high_idx: 4,
          questions_asked: 2,
          current_question_id: 11,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
      ]);
      await expect(client.query('UPDATE users SET diagnostic_acknowledged = true WHERE id = 1')).rejects.toMatchObject({
        code: '23514',
      });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 020 assessment recording retention choice', () => {
  it('backfills old request identities to retain and stores explicit opt-out choices', async () => {
    const client = await pool.connect();
    const schema = `retention_choice_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE assessment_requests (request_id INTEGER PRIMARY KEY)');
      await client.query('INSERT INTO assessment_requests (request_id) VALUES (1)');

      const sql = fs.readFileSync(
        path.join(__dirname, '../db/migrations/020_assessment_recording_retention_choice.sql'),
        'utf8',
      );
      await client.query(sql);
      await client.query('INSERT INTO assessment_requests (request_id) VALUES (2)');
      await client.query('INSERT INTO assessment_requests (request_id, retain_recording) VALUES (3, false)');

      const rows = await client.query<{ request_id: number; retain_recording: boolean }>(
        'SELECT request_id, retain_recording FROM assessment_requests ORDER BY request_id',
      );
      expect(rows.rows).toEqual([
        { request_id: 1, retain_recording: true },
        { request_id: 2, retain_recording: true },
        { request_id: 3, retain_recording: false },
      ]);
      const column = await client.query<{ is_nullable: string }>(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = $1
           AND table_name = 'assessment_requests'
           AND column_name = 'retain_recording'`,
        [schema],
      );
      expect(column.rows).toEqual([{ is_nullable: 'NO' }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 021 recording retention epoch', () => {
  it('backfills monotonic zero epochs for users and assessment request claims', async () => {
    const client = await pool.connect();
    const schema = `recording_epoch_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
      await client.query('CREATE TABLE assessment_requests (request_id INTEGER PRIMARY KEY)');
      await client.query('INSERT INTO users (id) VALUES (1)');
      await client.query('INSERT INTO assessment_requests (request_id) VALUES (1)');

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/021_recording_retention_epoch.sql'), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO users (id) VALUES (2)');
      await client.query('INSERT INTO assessment_requests (request_id) VALUES (2)');

      const users = await client.query<{ id: number; recording_retention_epoch: string }>(
        'SELECT id, recording_retention_epoch FROM users ORDER BY id',
      );
      const requests = await client.query<{
        request_id: number;
        recording_retention_epoch: string;
      }>('SELECT request_id, recording_retention_epoch FROM assessment_requests ORDER BY request_id');
      expect(users.rows).toEqual([
        { id: 1, recording_retention_epoch: '0' },
        { id: 2, recording_retention_epoch: '0' },
      ]);
      expect(requests.rows).toEqual([
        { request_id: 1, recording_retention_epoch: '0' },
        { request_id: 2, recording_retention_epoch: '0' },
      ]);
      await client.query('SAVEPOINT before_invalid_user_epoch');
      await expect(client.query('UPDATE users SET recording_retention_epoch = -1 WHERE id = 1')).rejects.toMatchObject({
        code: '23514',
      });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_user_epoch');
      await expect(
        client.query('UPDATE assessment_requests SET recording_retention_epoch = -1 WHERE request_id = 1'),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 023 recording bulk cleanup generation', () => {
  it('backfills each recording from its owner and requires a nonnegative generation', async () => {
    const client = await pool.connect();
    const schema = `recording_bulk_generation_${randomUUID().replace(/-/g, '')}`;
    const ownerId = randomUUID();
    const originalRecordingId = randomUUID();
    const oldWriterRecordingId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
      await client.query('CREATE TABLE users (id UUID PRIMARY KEY, recording_retention_epoch BIGINT NOT NULL)');
      await client.query(
        `CREATE TABLE recordings (
           id UUID PRIMARY KEY,
           user_id UUID NOT NULL REFERENCES users(id),
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      );
      await client.query('INSERT INTO users (id, recording_retention_epoch) VALUES ($1, 7)', [ownerId]);
      await client.query('INSERT INTO recordings (id, user_id) VALUES ($1, $2)', [originalRecordingId, ownerId]);

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/023_recording_bulk_cleanup.sql'), 'utf8');
      await client.query(sql);

      expect((await client.query('SELECT name, checksum FROM schema_migrations')).rows).toEqual([
        {
          name: RECORDING_PRIVACY_CUTOVER.name,
          checksum: RECORDING_PRIVACY_CUTOVER.checksum,
        },
      ]);

      expect(
        (await client.query('SELECT recording_retention_epoch FROM recordings WHERE id = $1', [originalRecordingId]))
          .rows,
      ).toEqual([{ recording_retention_epoch: '7' }]);
      await client.query('SAVEPOINT before_invalid_recording_epoch');
      await expect(
        client.query('UPDATE recordings SET recording_retention_epoch = -1 WHERE id = $1', [originalRecordingId]),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_recording_epoch');
      await client.query('INSERT INTO recordings (id, user_id) VALUES ($1, $2)', [oldWriterRecordingId, ownerId]);
      expect(
        (await client.query('SELECT recording_retention_epoch FROM recordings WHERE id = $1', [oldWriterRecordingId]))
          .rows,
      ).toEqual([{ recording_retention_epoch: '7' }]);
      await client.query(
        `INSERT INTO recording_bulk_cleanup_jobs (user_id, cutoff_epoch)
         VALUES ($1, 7)
         ON CONFLICT (user_id) DO UPDATE SET cutoff_epoch = EXCLUDED.cutoff_epoch`,
        [ownerId],
      );
      await client.query(
        `INSERT INTO recording_bulk_cleanup_jobs (user_id, cutoff_epoch)
         VALUES ($1, 8)
         ON CONFLICT (user_id) DO UPDATE SET cutoff_epoch = EXCLUDED.cutoff_epoch`,
        [ownerId],
      );
      expect((await client.query('SELECT user_id, cutoff_epoch FROM recording_bulk_cleanup_jobs')).rows).toEqual([
        { user_id: ownerId, cutoff_epoch: '8' },
      ]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 024 diagnostic runs and question snapshots', () => {
  it('retires every unverifiable legacy run and protects draining old writers across an identical reset', async () => {
    const client = await pool.connect();
    const schema = `diagnostic_runs_${randomUUID().replace(/-/g, '')}`;
    const userId = randomUUID();
    const questionId = randomUUID();
    const completedRequestId = randomUUID();
    const processingRequestId = randomUUID();
    const currentRequestId = randomUUID();
    const practiceRequestId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
      await client.query(`CREATE TABLE questions (
        id UUID PRIMARY KEY,
        cefr_level TEXT NOT NULL,
        prompt_word TEXT NOT NULL,
        question_text TEXT NOT NULL
      )`);
      await client.query(`CREATE TABLE diagnostic_state (
        user_id UUID PRIMARY KEY,
        low_idx INTEGER NOT NULL,
        high_idx INTEGER NOT NULL,
        questions_asked INTEGER NOT NULL,
        current_question_id UUID,
        processing_question_id UUID,
        processing_started_at TIMESTAMPTZ,
        processing_claim_id UUID
      )`);
      await client.query(`CREATE TABLE assessment_requests (
        user_id UUID NOT NULL,
        request_id UUID NOT NULL,
        context TEXT NOT NULL,
        question_id UUID NOT NULL,
        status TEXT NOT NULL,
        response_body JSONB,
        completed_at TIMESTAMPTZ,
        response_version SMALLINT NOT NULL DEFAULT 2,
        PRIMARY KEY (user_id, request_id),
        CONSTRAINT assessment_requests_response_check CHECK (
          (status = 'processing' AND response_body IS NULL AND completed_at IS NULL)
          OR (status = 'completed' AND response_body IS NOT NULL AND completed_at IS NOT NULL)
        )
      )`);
      await client.query(
        `INSERT INTO questions (id, cefr_level, prompt_word, question_text)
         VALUES ($1, 'B1', 'snapshot', 'Describe an immutable snapshot.')`,
        [questionId],
      );
      await client.query(
        `INSERT INTO diagnostic_state
           (user_id, low_idx, high_idx, questions_asked, current_question_id)
         VALUES ($1, 0, 5, 0, NULL)`,
        [userId],
      );
      await client.query(
        `INSERT INTO assessment_requests
           (user_id, request_id, context, question_id, status, response_body, completed_at)
         VALUES
           ($1, $2, 'diagnostic', $4, 'completed', '{"legacy":true}'::jsonb, now()),
           ($1, $3, 'diagnostic', $4, 'processing', NULL, NULL)`,
        [userId, completedRequestId, processingRequestId, questionId],
      );

      const sql = fs.readFileSync(
        path.join(__dirname, '../db/migrations/024_diagnostic_runs_and_question_snapshots.sql'),
        'utf8',
      );
      await client.query(sql);
      expect((await client.query('SELECT name, checksum FROM schema_migrations')).rows).toEqual([
        {
          name: ASSESSMENT_RECOVERY_CUTOVER.name,
          checksum: ASSESSMENT_RECOVERY_CUTOVER.checksum,
        },
      ]);

      const stateBeforeReset = await client.query<{ diagnostic_run_id: string }>(
        'SELECT diagnostic_run_id FROM diagnostic_state WHERE user_id = $1',
        [userId],
      );
      const originalRunId = stateBeforeReset.rows[0].diagnostic_run_id;
      const legacy = await client.query<{
        request_id: string;
        diagnostic_run_id: string;
        status: string;
        response_version: number;
        response_body: Record<string, unknown>;
        question_cefr_level: string;
        question_prompt_word: string;
        question_text: string;
      }>(
        `SELECT request_id, diagnostic_run_id, status, response_version, response_body,
                question_cefr_level, question_prompt_word, question_text
         FROM assessment_requests
         ORDER BY request_id`,
      );
      expect(legacy.rows).toHaveLength(2);
      for (const row of legacy.rows) {
        expect(row.diagnostic_run_id).not.toBe(originalRunId);
        expect(row.status).toBe('completed');
        expect(row.response_version).toBe(1);
        expect(row).toMatchObject({
          question_cefr_level: 'B1',
          question_prompt_word: 'snapshot',
          question_text: 'Describe an immutable snapshot.',
        });
      }
      expect(legacy.rows.find(({ request_id }) => request_id === processingRequestId)?.response_body).toEqual({});

      // A draining pre-024 writer omits every new column. The INSERT trigger
      // snapshots the current run and public question fields for it.
      await client.query(
        `INSERT INTO assessment_requests (user_id, request_id, context, question_id, status)
         VALUES ($1, $2, 'diagnostic', $3, 'processing')`,
        [userId, currentRequestId, questionId],
      );
      expect(
        (
          await client.query(
            `SELECT diagnostic_run_id, question_cefr_level, question_prompt_word, question_text
             FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
            [userId, currentRequestId],
          )
        ).rows,
      ).toEqual([
        {
          diagnostic_run_id: originalRunId,
          question_cefr_level: 'B1',
          question_prompt_word: 'snapshot',
          question_text: 'Describe an immutable snapshot.',
        },
      ]);

      // This is the exact old-binary reset shape, and every old field is
      // already pristine. The trigger must still rotate and retire the request.
      await client.query(
        `UPDATE diagnostic_state
         SET low_idx = 0, high_idx = 5, questions_asked = 0,
             current_question_id = NULL, processing_question_id = NULL,
             processing_started_at = NULL, processing_claim_id = NULL
         WHERE user_id = $1`,
        [userId],
      );
      const stateAfterReset = await client.query<{ diagnostic_run_id: string }>(
        'SELECT diagnostic_run_id FROM diagnostic_state WHERE user_id = $1',
        [userId],
      );
      expect(stateAfterReset.rows[0].diagnostic_run_id).not.toBe(originalRunId);
      expect(
        (
          await client.query(
            `SELECT status, response_version, response_body
             FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
            [userId, currentRequestId],
          )
        ).rows,
      ).toEqual([{ status: 'completed', response_version: 1, response_body: {} }]);

      await client.query(
        `INSERT INTO assessment_requests (user_id, request_id, context, question_id, status)
         VALUES ($1, $2, 'practice', $3, 'processing')`,
        [userId, practiceRequestId, questionId],
      );
      expect(
        (
          await client.query(
            `SELECT diagnostic_run_id, question_prompt_word
             FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
            [userId, practiceRequestId],
          )
        ).rows,
      ).toEqual([{ diagnostic_run_id: null, question_prompt_word: 'snapshot' }]);

      await client.query('SAVEPOINT before_invalid_snapshot');
      await expect(
        client.query(
          `UPDATE assessment_requests SET question_prompt_word = E'\t\n'
           WHERE user_id = $1 AND request_id = $2`,
          [userId, practiceRequestId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_snapshot');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 022 learning audit repairs', () => {
  it('repairs pending silent diagnostic runs and snapshots native-attempt languages', async () => {
    const client = await pool.connect();
    const schema = `learning_audit_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query(`CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        diagnostic_completed BOOLEAN NOT NULL,
        diagnostic_acknowledged BOOLEAN NOT NULL,
        cefr_level TEXT,
        native_language TEXT NOT NULL
      )`);
      await client.query(`CREATE TABLE diagnostic_state (
        user_id INTEGER PRIMARY KEY,
        low_idx INTEGER NOT NULL,
        high_idx INTEGER NOT NULL,
        questions_asked INTEGER NOT NULL,
        current_question_id INTEGER,
        processing_question_id INTEGER,
        processing_started_at TIMESTAMPTZ,
        processing_claim_id UUID
      )`);
      await client.query(`CREATE TABLE attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL DEFAULT 1,
        practice_cycle_id INTEGER DEFAULT 101,
        context TEXT NOT NULL,
        attempt_no INTEGER NOT NULL DEFAULT 1,
        transcript TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`);
      await client.query(`CREATE TABLE assessment_requests (
        request_id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL DEFAULT 1,
        practice_cycle_id INTEGER DEFAULT 101,
        context TEXT NOT NULL,
        status TEXT NOT NULL,
        response_version SMALLINT NOT NULL DEFAULT 2,
        response_body JSONB
      )`);
      await client.query(`CREATE TABLE practice_cycles (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at TIMESTAMPTZ
      )`);
      await client.query(
        `INSERT INTO users
           (id, diagnostic_completed, diagnostic_acknowledged, cefr_level, native_language)
         VALUES
           (1, false, false, NULL, 'te'),
           (2, false, false, NULL, 'hi'),
           (3, false, false, NULL, 'es'),
           (4, true, true, 'C1', 'zh'),
           (5, true, false, 'A1', 'te'),
           (6, false, false, NULL, 'es')`,
      );
      await client.query(
        `INSERT INTO diagnostic_state
           (user_id, low_idx, high_idx, questions_asked, current_question_id,
            processing_question_id, processing_started_at, processing_claim_id)
         VALUES
           (1, 0, 1, 1, 11, 11, now(), gen_random_uuid()),
           (2, 1, 4, 2, 12, NULL, NULL, NULL),
           (3, 1, 4, 2, 13, NULL, NULL, NULL),
           (4, 4, 3, 1, NULL, NULL, NULL, NULL),
           (5, 0, -1, 1, NULL, NULL, NULL, NULL)`,
      );
      await client.query(
        `INSERT INTO attempts (user_id, context, attempt_no, transcript, created_at) VALUES
           (1, 'diagnostic', 1, '', now() - interval '1 minute'),
           (2, 'diagnostic', 1, 'spoken first answer', now() - interval '2 minutes'),
           (2, 'diagnostic', 2, $1, now() - interval '1 minute'),
           (3, 'diagnostic', 1, '', now() - interval '3 minutes'),
           (3, 'diagnostic', 1, 'active first answer', now() - interval '2 minutes'),
           (3, 'diagnostic', 2, 'active second answer', now() - interval '1 minute'),
           (4, 'diagnostic', 1, '', now() - interval '1 minute'),
           (5, 'diagnostic', 1, '', now() - interval '1 minute'),
           (1, 'practice-native', 1, 'native answer', now())`,
        [`\t\u00a0\ufeff`],
      );
      await client.query(
        `INSERT INTO practice_cycles (id, user_id, status)
         VALUES (1, 5, 'active')`,
      );
      await client.query(
        `INSERT INTO assessment_requests
           (request_id, user_id, context, status, response_version, response_body)
         VALUES
           (1, 1, 'practice-native', 'completed', 2, '{"mode":"native"}'::jsonb),
           (2, 2, 'practice-native', 'processing', 2, NULL),
           (3, 5, 'diagnostic', 'completed', 2,
             '{"transcript":"","passed":false,"score":0}'::jsonb),
           (4, 5, 'diagnostic', 'processing', 2, NULL)`,
      );

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/022_learning_audit_repairs.sql'), 'utf8');
      await client.query(sql);

      const states = await client.query(
        `SELECT user_id, low_idx, high_idx, questions_asked, current_question_id,
                processing_question_id, processing_started_at, processing_claim_id
         FROM diagnostic_state ORDER BY user_id`,
      );
      expect(states.rows).toEqual([
        {
          user_id: 1,
          low_idx: 0,
          high_idx: 5,
          questions_asked: 0,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 2,
          low_idx: 0,
          high_idx: 5,
          questions_asked: 0,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 3,
          low_idx: 1,
          high_idx: 4,
          questions_asked: 2,
          current_question_id: 13,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 4,
          low_idx: 4,
          high_idx: 3,
          questions_asked: 1,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
        {
          user_id: 5,
          low_idx: 0,
          high_idx: 5,
          questions_asked: 0,
          current_question_id: null,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        },
      ]);

      expect(
        (
          await client.query(
            `SELECT id, diagnostic_completed, diagnostic_acknowledged, cefr_level
             FROM users WHERE id IN (4, 5) ORDER BY id`,
          )
        ).rows,
      ).toEqual([
        { id: 4, diagnostic_completed: true, diagnostic_acknowledged: true, cefr_level: 'C1' },
        { id: 5, diagnostic_completed: false, diagnostic_acknowledged: false, cefr_level: null },
      ]);
      expect((await client.query('SELECT status, closed_at FROM practice_cycles WHERE id = 1')).rows).toEqual([
        { status: 'closed', closed_at: expect.any(Date) },
      ]);

      const existingNative = await client.query<{ native_language: string }>(
        `SELECT native_language FROM attempts
         WHERE user_id = 1 AND context = 'practice-native'`,
      );
      expect(existingNative.rows).toEqual([{ native_language: 'te' }]);

      const migratedResponse = await client.query<{ native_language: string }>(
        `SELECT response_body->>'nativeLanguage' AS native_language
         FROM assessment_requests WHERE request_id = 1`,
      );
      expect(migratedResponse.rows).toEqual([{ native_language: 'te' }]);

      // A request that existed before migration uses the only recoverable
      // profile fallback. Even an older writer's attempt INSERT can stay NULL
      // temporarily: completing that exact request synchronizes both durable
      // artifacts before the deferred commit check runs.
      const insertedNative = await client.query<{ native_language: string | null }>(
        `INSERT INTO attempts
           (user_id, question_id, practice_cycle_id, context, transcript, created_at)
         VALUES (2, 1, 101, 'practice-native', 'older-writer answer', now())
         RETURNING native_language`,
      );
      expect(insertedNative.rows).toEqual([{ native_language: null }]);
      const completedByOlderWriter = await client.query<{ native_language: string }>(
        `UPDATE assessment_requests
         SET status = 'completed',
             response_body =
               '{"mode":"native","transcript":"respuesta","attemptNo":1}'::jsonb
         WHERE request_id = 2
         RETURNING response_body->>'nativeLanguage' AS native_language`,
      );
      expect(completedByOlderWriter.rows).toEqual([{ native_language: 'hi' }]);
      expect(
        (
          await client.query(
            `SELECT native_language FROM attempts
             WHERE user_id = 2 AND context = 'practice-native'`,
          )
        ).rows,
      ).toEqual([{ native_language: 'hi' }]);

      // A post-migration draining writer snapshots at the durable claim. A
      // later profile change must not relabel its eventual attempt or replay.
      const oldWriterClaim = await client.query<{ native_language: string }>(
        `INSERT INTO assessment_requests
           (request_id, user_id, question_id, practice_cycle_id, context, status, response_body)
         VALUES (5, 6, 1, 606, 'practice-native', 'processing', NULL)
         RETURNING native_language`,
      );
      expect(oldWriterClaim.rows).toEqual([{ native_language: 'es' }]);
      await client.query("UPDATE users SET native_language = 'zh' WHERE id = 6");
      expect(
        (
          await client.query(
            `INSERT INTO attempts
               (user_id, question_id, practice_cycle_id, context, attempt_no, transcript, created_at)
             VALUES (6, 1, 606, 'practice-native', 1, 'respuesta original', now())
             RETURNING native_language`,
          )
        ).rows,
      ).toEqual([{ native_language: null }]);
      const exactOldWriterCompletion = await client.query<{ native_language: string }>(
        `UPDATE assessment_requests
         SET status = 'completed',
             response_body =
               '{"mode":"native","transcript":"respuesta original","attemptNo":1}'::jsonb
         WHERE request_id = 5
         RETURNING response_body->>'nativeLanguage' AS native_language`,
      );
      expect(exactOldWriterCompletion.rows).toEqual([{ native_language: 'es' }]);
      expect(
        (
          await client.query(
            `SELECT native_language FROM attempts
             WHERE user_id = 6 AND practice_cycle_id = 606`,
          )
        ).rows,
      ).toEqual([{ native_language: 'es' }]);

      expect(
        (await client.query('SELECT response_version FROM assessment_requests WHERE request_id = 3')).rows,
      ).toEqual([{ response_version: 1 }]);
      const legacySilentCompletion = await client.query<{ response_version: number }>(
        `UPDATE assessment_requests
         SET status = 'completed',
             response_body = '{"transcript":"","passed":false,"score":0}'::jsonb
         WHERE request_id = 4
         RETURNING response_version`,
      );
      expect(legacySilentCompletion.rows).toEqual([{ response_version: 1 }]);
      const currentSilenceCompletion = await client.query<{ response_version: number }>(
        `UPDATE assessment_requests
         SET response_version = 2,
             response_body = '{"transcript":"","passed":false,"score":0,"noSpeech":true}'::jsonb
         WHERE request_id = 4
         RETURNING response_version`,
      );
      expect(currentSilenceCompletion.rows).toEqual([{ response_version: 2 }]);

      await client.query('SAVEPOINT before_invalid_native_snapshot');
      await expect(
        client.query(
          `INSERT INTO attempts (user_id, context, transcript, created_at, native_language)
           VALUES (1, 'practice-native', 'invalid language', now(), 'fr')`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_native_snapshot');
      await expect(
        client.query(
          `INSERT INTO attempts (user_id, context, transcript, created_at, native_language)
           VALUES (1, 'practice', 'wrong context', now(), 'te')`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_native_snapshot');
      await expect(
        client.query(
          `INSERT INTO assessment_requests
             (request_id, user_id, context, status, response_body, native_language)
           VALUES (6, 1, 'diagnostic', 'processing', NULL, 'te')`,
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_invalid_native_snapshot');

      await client.query('SAVEPOINT before_missing_native_snapshot');
      await client.query(
        `INSERT INTO attempts
           (user_id, question_id, practice_cycle_id, context, transcript, created_at)
         VALUES (1, 1, 999, 'practice-native', 'unowned attempt', now())`,
      );
      await expect(
        client.query('SET CONSTRAINTS attempts_native_language_required_trigger IMMEDIATE'),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_missing_native_snapshot');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 025 trigger function search paths', () => {
  it('pins a search_path setting on both recording trigger functions', async () => {
    const { rows } = await pool.query<{ proname: string; proconfig: string[] | null }>(
      `SELECT proname, proconfig
       FROM pg_proc
       WHERE pronamespace = 'public'::regnamespace
         AND proname IN ('enqueue_recording_s3_deletion', 'assign_recording_retention_epoch')
       ORDER BY proname`,
    );
    expect(rows).toHaveLength(2);
    for (const fn of rows) {
      // A pinned search_path is exactly what migrations 022/024 establish for
      // their trigger functions; 025 brings the two older recording triggers
      // up to the same posture. Any proconfig entry must pin the path.
      expect(fn.proconfig, fn.proname).toEqual([expect.stringMatching(/^search_path=/)]);
    }
  });
});

describe('migration 026 attempts question snapshots', () => {
  it('backfills every attempt from the catalog, snapshots draining writers, and enforces the snapshot contract', async () => {
    const client = await pool.connect();
    const schema = `attempt_snapshots_${randomUUID().replace(/-/g, '')}`;
    const questionId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      await client.query(`CREATE TABLE questions (
        id UUID PRIMARY KEY,
        cefr_level TEXT NOT NULL,
        prompt_word TEXT NOT NULL,
        question_text TEXT NOT NULL
      )`);
      await client.query(`CREATE TABLE attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL
      )`);
      // Production attempts carries migration 022's DEFERRABLE INITIALLY
      // DEFERRED constraint trigger; reproduce it so this replay proves the
      // migration's disable/enable bracket survives a populated backfill
      // (without the bracket the same-transaction ALTERs fail with 55006).
      await client.query(`CREATE FUNCTION noop_attempt_snapshot_trigger() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`);
      await client.query(`CREATE CONSTRAINT TRIGGER attempts_native_language_required_trigger
        AFTER INSERT OR UPDATE ON attempts
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION noop_attempt_snapshot_trigger()`);
      await client.query(
        `INSERT INTO questions (id, cefr_level, prompt_word, question_text)
         VALUES ($1, 'B1', 'snapshot', 'Describe an immutable snapshot.')`,
        [questionId],
      );
      // A pre-026 row: no snapshot columns exist on its INSERT path.
      await client.query('INSERT INTO attempts (question_id) VALUES ($1)', [questionId]);
      // Fire the deferred event queued by that INSERT and restore deferral so
      // the migration starts from the same pending-events state as a real run.
      await client.query('SET CONSTRAINTS attempts_native_language_required_trigger IMMEDIATE');
      await client.query('SET CONSTRAINTS attempts_native_language_required_trigger DEFERRED');

      const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/026_attempts_question_snapshots.sql'), 'utf8');
      await client.query(sql);

      // The backfill matched the exact questions join.
      expect((await client.query('SELECT cefr_level, prompt_word, question_text FROM attempts')).rows).toEqual([
        { cefr_level: 'B1', prompt_word: 'snapshot', question_text: 'Describe an immutable snapshot.' },
      ]);

      // A draining pre-026 writer omits the columns; the INSERT trigger fills
      // them from the catalog row.
      await client.query('INSERT INTO attempts (question_id) VALUES ($1)', [questionId]);
      expect((await client.query('SELECT count(*)::int AS n FROM attempts')).rows).toEqual([{ n: 2 }]);

      // A current writer's in-memory grading copy is preserved verbatim.
      await client.query(
        `INSERT INTO attempts (question_id, cefr_level, prompt_word, question_text)
         VALUES ($1, 'C2', 'graded-word', 'Exact wording used for grading.')`,
        [questionId],
      );
      expect(
        (
          await client.query(
            `SELECT cefr_level, prompt_word, question_text FROM attempts
             WHERE prompt_word = 'graded-word'`,
          )
        ).rows,
      ).toEqual([{ cefr_level: 'C2', prompt_word: 'graded-word', question_text: 'Exact wording used for grading.' }]);

      // NOT NULL is enforced against post-migration writes.
      await client.query('SAVEPOINT before_null_snapshot');
      await expect(
        client.query(`UPDATE attempts SET cefr_level = NULL WHERE prompt_word = 'snapshot'`),
      ).rejects.toMatchObject({ code: '23502' });
      await client.query('ROLLBACK TO SAVEPOINT before_null_snapshot');

      // CHECK rejects blank, oversized, and off-enum snapshots.
      for (const [column, value] of [
        ['prompt_word', '\t\n '],
        ['question_text', '\t\n '],
        ['prompt_word', 'a'.repeat(101)],
        ['question_text', 'b'.repeat(1_001)],
        ['cefr_level', 'D1'],
      ] as const) {
        await client.query('SAVEPOINT before_invalid_snapshot');
        await expect(
          client.query(`UPDATE attempts SET ${column} = $1 WHERE prompt_word = 'graded-word'`, [value]),
        ).rejects.toMatchObject({ code: '23514' });
        await client.query('ROLLBACK TO SAVEPOINT before_invalid_snapshot');
      }
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('migration 018 practice cycle upgrade', () => {
  it('upgrades a populated genuine 017 schema without weakening legacy history or replay ownership', async () => {
    const client = await pool.connect();
    const schema = `practice_cycle_upgrade_${randomUUID().replace(/-/g, '')}`;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", public`);
      const migrationsDirectory = path.join(__dirname, '../db/migrations');
      const legacyMigrations = fs
        .readdirSync(migrationsDirectory)
        .filter((name) => /^0(0[1-9]|1[0-7])_.*\.sql$/.test(name))
        .sort();
      expect(legacyMigrations.at(-1)).toBe('017_retained_recordings.sql');
      for (const name of legacyMigrations) {
        await client.query(fs.readFileSync(path.join(migrationsDirectory, name), 'utf8'));
      }

      const userId = randomUUID();
      const questionId = randomUUID();
      const otherQuestionId = randomUUID();
      const translations = Object.fromEntries(
        ['te', 'hi', 'es', 'zh'].map((language) => [
          language,
          {
            word: `${language} word`,
            question: `${language} question`,
            examples: Array.from({ length: 3 }, (_, index) => ({
              en: `English example ${index + 1}`,
              native: `${language} example ${index + 1}`,
            })),
          },
        ]),
      );
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, native_language)
         VALUES ($1, 'Legacy Learner', 'legacy@example.com', 'not-used', 'te')`,
        [userId],
      );
      await client.query(
        `INSERT INTO questions (id, cefr_level, prompt_word, question_text, translations)
         VALUES
           ($1, 'A1', 'legacy', 'Describe a legacy answer.', $3::jsonb),
           ($2, 'A1', 'other', 'Describe another answer.', $3::jsonb)`,
        [questionId, otherQuestionId, JSON.stringify(translations)],
      );
      await client.query(
        `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
         VALUES
           ($1, $2, 'practice', 1, 'first old cycle', 50, false, 'Try again.'),
           ($1, $2, 'practice', 1, 'second old cycle', 80, true, 'Well done.'),
           ($1, $2, 'diagnostic', 1, 'diagnostic speech', 60, true, 'Placed.')`,
        [userId, questionId],
      );

      const legacyPracticeRequest = randomUUID();
      const legacyNativeRequest = randomUUID();
      const legacySilentDiagnosticRequest = randomUUID();
      const compatibleDiagnosticRequest = randomUUID();
      const diagnosticQuestion = {
        id: questionId,
        cefrLevel: 'A1',
        promptWord: 'legacy',
        questionText: 'Describe a legacy answer.',
      };
      const insertCompletedRequest = (requestId: string, context: string, response: Record<string, unknown>) =>
        client.query(
          `INSERT INTO assessment_requests
             (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at)
           VALUES ($1, $2, gen_random_uuid(), $3, $4, 'completed', $5::jsonb, now())`,
          [userId, requestId, context, questionId, JSON.stringify(response)],
        );
      await insertCompletedRequest(legacyPracticeRequest, 'practice', {
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 50,
        transcript: 'legacy practice speech',
        feedback: 'Try again.',
      });
      await insertCompletedRequest(legacyNativeRequest, 'practice-native', {
        mode: 'native',
        understood: true,
        transcript: 'legacy native speech',
        modelAnswer: 'A model answer.',
        feedback: 'Understood.',
      });
      await insertCompletedRequest(legacySilentDiagnosticRequest, 'diagnostic', {
        passed: false,
        score: 0,
        transcript: '',
        feedback: 'No speech detected.',
        done: false,
        nextQuestion: diagnosticQuestion,
      });
      await insertCompletedRequest(compatibleDiagnosticRequest, 'diagnostic', {
        passed: true,
        score: 60,
        transcript: 'legacy diagnostic speech',
        feedback: 'Placed.',
        done: true,
        level: 'A1',
      });

      const migration = fs.readFileSync(path.join(migrationsDirectory, '018_practice_serving_cycles.sql'), 'utf8');
      await client.query(migration);

      const upgradedAttempts = await client.query<{
        id: string;
        context: string;
        practice_cycle_id: string | null;
      }>('SELECT id, context, practice_cycle_id FROM attempts ORDER BY created_at, id');
      const practiceAttempts = upgradedAttempts.rows.filter((row) => row.context === 'practice');
      expect(practiceAttempts).toHaveLength(2);
      expect(practiceAttempts.every((row) => row.practice_cycle_id === row.id)).toBe(true);
      expect(upgradedAttempts.rows.find((row) => row.context === 'diagnostic')?.practice_cycle_id).toBeNull();

      const replayVersions = await client.query<{
        request_id: string;
        response_version: number;
        practice_cycle_id: string | null;
      }>(
        `SELECT request_id, response_version, practice_cycle_id
         FROM assessment_requests ORDER BY request_id`,
      );
      const byRequest = new Map(replayVersions.rows.map((row) => [row.request_id, row]));
      expect(byRequest.get(legacyPracticeRequest)).toMatchObject({ response_version: 1, practice_cycle_id: null });
      expect(byRequest.get(legacyNativeRequest)).toMatchObject({ response_version: 1, practice_cycle_id: null });
      expect(byRequest.get(legacySilentDiagnosticRequest)).toMatchObject({
        response_version: 1,
        practice_cycle_id: null,
      });
      expect(byRequest.get(compatibleDiagnosticRequest)).toMatchObject({
        response_version: 2,
        practice_cycle_id: null,
      });

      const cycleId = practiceAttempts[0].practice_cycle_id!;
      await client.query('SAVEPOINT before_duplicate_attempt');
      await expect(
        client.query(
          `INSERT INTO attempts
             (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
           VALUES ($1, $2, 'practice', 1, 'duplicate', 50, false, 'Try again.', $3)`,
          [userId, questionId, cycleId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT before_duplicate_attempt');

      await client.query('SAVEPOINT before_missing_request_cycle');
      await expect(
        client.query(
          `INSERT INTO assessment_requests
             (user_id, request_id, claim_id, context, question_id, status)
           VALUES ($1, gen_random_uuid(), gen_random_uuid(), 'practice', $2, 'processing')`,
          [userId, questionId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_missing_request_cycle');

      await client.query('SAVEPOINT before_diagnostic_request_cycle');
      await expect(
        client.query(
          `INSERT INTO assessment_requests
             (user_id, request_id, claim_id, context, question_id, status, practice_cycle_id)
           VALUES ($1, gen_random_uuid(), gen_random_uuid(), 'diagnostic', $2, 'processing', $3)`,
          [userId, questionId, cycleId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_diagnostic_request_cycle');
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
