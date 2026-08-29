import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from './config';
import { pool } from './db';
import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from './janitor';
import { sendMail } from './mailer';
import {
  AuthedRequest,
  AuthUser,
  h,
  HttpError,
  JWT_AUDIENCE,
  JWT_ISSUER,
  requireAuth,
  UserRow,
  validate,
  validated,
} from './middleware';
import { Limiters } from './rate-limit';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

const BCRYPT_COST = 12;
const BCRYPT_MAX_BYTES = 72;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

// A real cost-12 hash keeps the unknown-email login path comparable to a
// normal bcrypt verification without corresponding to any user password.
function dummyBcryptHash(): string {
  return '$2b$12$uHmk0Jtqi.9oe6f8E8sIMuNV0ECcPhIheggvbpHkSlO/6IXNNQzFu';
}

/** 16 random bytes rendered as 32 lowercase hex characters. */
const RESET_TOKEN_BYTES = 16;
const RESET_TOKEN_TTL_MINUTES = 30;
// One uniform message for every reset failure (unknown email, missing row,
// expired, already used, wrong code): distinct errors would enumerate accounts.
const RESET_INVALID_MESSAGE = 'Reset code is invalid or expired';
const authenticationStateChanged = () =>
  new HttpError(409, 'Authentication state changed; please try again', 'STATE_CHANGED');

function toUserJson(row: AuthUser) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    nativeLanguage: row.native_language,
    uiLanguage: row.ui_language,
    cefrLevel: row.cefr_level,
    diagnosticCompleted: row.diagnostic_completed,
    diagnosticAcknowledged: row.diagnostic_acknowledged,
  };
}

function signToken(user: { id: string; token_version: number }) {
  return jwt.sign({ sub: user.id, tv: user.token_version }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '30d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

// Min 8 chars, at least one letter and one number (register + change-password;
// login stays permissive so old passwords can still authenticate).
const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(BCRYPT_MAX_BYTES, `password must be at most ${BCRYPT_MAX_BYTES} UTF-8 bytes`)
  .regex(/\p{L}/u, 'password must contain at least one letter')
  .regex(/[0-9]/, 'password must contain at least one number')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES, {
    message: `password must be at most ${BCRYPT_MAX_BYTES} UTF-8 bytes`,
  });

const comparablePasswordSchema = (field: string) =>
  z
    .string({ required_error: `${field} is required` })
    .min(1, `${field} is required`)
    .max(BCRYPT_MAX_BYTES, `${field} must be at most ${BCRYPT_MAX_BYTES} UTF-8 bytes`)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES, {
      message: `${field} must be at most ${BCRYPT_MAX_BYTES} UTF-8 bytes`,
    });

// PostgreSQL text rejects U+0000 (22021 → unhandled 500), and all Unicode
// control / line-separator code points have no place in a stored display name:
// C1 controls and U+2028/U+2029 otherwise survive the old C0-only check and
// can split UI, audit, and export records.
const hasNoControlCharacters = (value: string) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value);

const nameSchema = z
  .string()
  .trim()
  .min(1, 'name is required')
  .max(MAX_NAME_LENGTH, `name must be at most ${MAX_NAME_LENGTH} characters`)
  .refine(hasNoControlCharacters, 'name must not contain control characters');

const nativeLanguageSchema = z.enum(['te', 'hi', 'es', 'zh'], {
  errorMap: () => ({ message: "nativeLanguage must be one of 'te','hi','es','zh'" }),
});

const uiLanguageSchema = z.enum(['en', 'te', 'hi', 'es', 'zh'], {
  errorMap: () => ({ message: "uiLanguage must be one of 'en','te','hi','es','zh'" }),
});

const emailSchema = (requiredError: string) =>
  z
    .string({ required_error: requiredError })
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, `email must be at most ${MAX_EMAIL_LENGTH} characters`)
    .email('a valid email is required');

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema('email is required'),
  password: passwordSchema,
  nativeLanguage: nativeLanguageSchema,
  uiLanguage: uiLanguageSchema.default('en'),
});

const loginSchema = z.object({
  email: emailSchema('email and password are required'),
  password: comparablePasswordSchema('password'),
});

const changePasswordSchema = z
  .object({
    currentPassword: comparablePasswordSchema('currentPassword'),
    newPassword: passwordSchema,
  })
  .refine(({ currentPassword, newPassword }) => currentPassword !== newPassword, {
    path: ['newPassword'],
    message: 'new password must be different from the current password',
  });

const deleteAccountSchema = z.object({
  password: comparablePasswordSchema('password'),
});

const exportDoneFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');
const exportQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    cursor: z.string().uuid('cursor must be a valid UUID').optional(),
    practiceCycleCursor: z.string().uuid('practiceCycleCursor must be a valid UUID').optional(),
    attemptsDone: exportDoneFlag,
    practiceCyclesDone: exportDoneFlag,
  })
  .superRefine(({ attemptsDone, practiceCyclesDone, cursor, practiceCycleCursor }, ctx) => {
    if (attemptsDone && cursor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cursor'],
        message: 'must be omitted when attemptsDone=true',
      });
    }
    if (practiceCyclesDone && practiceCycleCursor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['practiceCycleCursor'],
        message: 'must be omitted when practiceCyclesDone=true',
      });
    }
  });

const forgotPasswordSchema = z.object({
  email: emailSchema('email is required'),
});

// The token is compared byte-for-byte against the stored hash, so this only
// bounds the input; a wrong format is just another invalid code (same 400).
const resetPasswordSchema = z.object({
  email: emailSchema('email is required'),
  token: z
    .string({ required_error: 'token is required' })
    .trim()
    .min(1, 'token is required')
    .max(128, 'token must be at most 128 characters'),
  newPassword: passwordSchema,
});

const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    nativeLanguage: nativeLanguageSchema.optional(),
    uiLanguage: uiLanguageSchema.optional(),
  })
  .refine(
    (fields) => fields.name !== undefined || fields.nativeLanguage !== undefined || fields.uiLanguage !== undefined,
    {
      message: 'at least one of name, nativeLanguage, or uiLanguage is required',
    },
  );

/**
 * Janitor: remove expired password-reset tokens. Expiry is already enforced by
 * predicate on the read path, so this only bounds table growth.
 */
export async function cleanupPasswordResetTokens(): Promise<number> {
  return runExclusiveBatchedDelete(
    'janitor:password-reset-tokens',
    `DELETE FROM password_reset_tokens
     WHERE ctid IN (
       SELECT ctid FROM password_reset_tokens
       WHERE expires_at <= now()
       LIMIT ${JANITOR_BATCH_SIZE}
     )`,
  );
}

export function createAuthRouter(limiters: Limiters) {
  const authRouter = Router();

  authRouter.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  authRouter.post(
    '/register',
    validate({ body: registerSchema }),
    h(async (req, res) => {
      const { name, email, password, nativeLanguage, uiLanguage } = validated(req, registerSchema);

      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      // User + initial diagnostic state in ONE transaction.
      const client = await pool.connect();
      let user: UserRow;
      try {
        await client.query('BEGIN');
        const { rows } = await client.query<UserRow>(
          `INSERT INTO users (name, email, password_hash, native_language, ui_language)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [name, email, passwordHash, nativeLanguage, uiLanguage],
        );
        user = rows[0];
        await client.query(
          'INSERT INTO diagnostic_state (user_id, low_idx, high_idx, questions_asked) VALUES ($1, 0, 5, 0)',
          [user.id],
        );
        await client.query('COMMIT');
      } catch (e) {
        // A 409 here inherently confirms account existence (login errors stay
        // generic). Accepted until verified-email registration exists: the
        // per-IP register limiter bounds bulk enumeration, and timing gives no
        // signal because the bcrypt hash runs before the unique check.
        const primaryError =
          (e as { code?: string }).code === '23505' ? new HttpError(409, 'Email already registered', 'EMAIL_TAKEN') : e;
        return await rollbackTransaction(client, { value: primaryError });
      } finally {
        releaseTransactionClient(client);
      }
      res.status(201).json({ token: signToken(user), user: toUserJson(user) });
    }),
  );

  authRouter.post(
    '/login',
    validate({ body: loginSchema }),
    h(async (req, res) => {
      const { email, password } = validated(req, loginSchema);
      const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      const user = rows[0];
      // Always verify, even when the account budget is exhausted: an attacker
      // saturating it must not lock out the real owner (see rate-limit.ts).
      const validPassword = await bcrypt.compare(password, user ? user.password_hash : dummyBcryptHash());
      if (!user || !validPassword) {
        if (res.locals.loginAccountThrottled) {
          throw new HttpError(429, 'Too many login attempts, please try again later');
        }
        throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }
      res.json({ token: signToken(user), user: toUserJson(user) });
    }),
  );

  // Always 204, whatever the outcome: a distinguishable response (or error)
  // would confirm whether the address has an account. Delivery is
  // fire-and-forget for the same reason — a slow or failing mail relay must
  // not stretch this route's latency into an existence oracle. Like the
  // register route's documented 409 tradeoff, the small database-write timing
  // difference for known addresses is accepted until verified-email
  // infrastructure exists.
  authRouter.post(
    '/forgot-password',
    limiters.forgotPasswordEmail,
    validate({ body: forgotPasswordSchema }),
    h(async (req, res) => {
      const { email } = validated(req, forgotPasswordSchema);
      // Over the per-email budget: acknowledge without issuing a new token or
      // sending mail, so saturating the budget neither spams the mailbox nor
      // reveals anything through the response.
      if (res.locals.forgotEmailThrottled) return res.status(204).end();
      let token: string | undefined;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // All reset-token writers lock the parent first. Besides keeping the
        // lock order consistent with reset/change/delete, this closes the
        // SELECT-then-INSERT race where account deletion (and immediate
        // re-registration of the email) could leave this request inserting a
        // token for the deleted UUID and leaking a 23503 as a non-uniform 500.
        const lockedUser = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1 FOR UPDATE', [
          email,
        ]);
        const userId = lockedUser.rows[0]?.id;
        if (userId) {
          token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
          const tokenHash = createHash('sha256').update(token).digest('hex');
          // One active token per user: a repeat request replaces (revokes) the
          // previous code instead of accumulating parallel valid codes.
          await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, now() + interval '${RESET_TOKEN_TTL_MINUTES} minutes')
             ON CONFLICT (user_id) DO UPDATE SET
               token_hash = EXCLUDED.token_hash,
               expires_at = EXCLUDED.expires_at,
               created_at = now()`,
            [userId, tokenHash],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        return await rollbackTransaction(client, { value: err });
      } finally {
        releaseTransactionClient(client);
      }
      if (!token) return res.status(204).end();
      // The token travels only through the mailer (log or webhook), never in
      // this response. sendMail never rejects; failures are logged inside it.
      void sendMail({
        to: email,
        subject: 'Your password reset code',
        text: `Your password reset code is ${token}. It expires in ${RESET_TOKEN_TTL_MINUTES} minutes. If you did not request this, you can ignore this message.`,
      });
      return res.status(204).end();
    }),
  );

  authRouter.post(
    '/reset-password',
    validate({ body: resetPasswordSchema }),
    h(async (req, res) => {
      const { email, token, newPassword } = validated(req, resetPasswordSchema);
      const invalidReset = () => new HttpError(400, RESET_INVALID_MESSAGE, 'RESET_INVALID');
      const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      const user = rows[0];
      if (!user) throw invalidReset();
      const tokenRows = await pool.query<{ token_hash: string }>(
        'SELECT token_hash FROM password_reset_tokens WHERE user_id = $1 AND expires_at > now()',
        [user.id],
      );
      const stored = tokenRows.rows[0];
      if (!stored) throw invalidReset();
      const storedHash = Buffer.from(stored.token_hash, 'hex');
      const presentedHash = createHash('sha256').update(token).digest();
      // Migration 010 constrains stored hashes to 64 lowercase hex characters,
      // so both buffers are exactly 32-byte SHA-256 digests. The comparison is
      // constant-time regardless of how much of the code an attacker guessed.
      if (!timingSafeEqual(storedHash, presentedHash)) {
        throw invalidReset();
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Lock the parent user row before touching its reset-token child.
        // Password changes and account deletion already take that order
        // (users -> password_reset_tokens); the reverse order here formed a
        // real 40P01 cycle under a simultaneous reset and password change.
        // Re-checking existence inside the transaction also keeps a
        // concurrent account deletion on the uniform invalid-reset path.
        const lockedUser = await client.query<{ id: string }>('SELECT id FROM users WHERE id = $1 FOR UPDATE', [
          user.id,
        ]);
        if (lockedUser.rowCount !== 1) throw invalidReset();
        // Guarded delete makes the token single-use even under concurrent
        // resets: only the request that removes the row applies the change.
        const consumed = await client.query(
          'DELETE FROM password_reset_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > now()',
          [user.id, stored.token_hash],
        );
        if (consumed.rowCount !== 1) throw invalidReset();
        // Bumping token_version invalidates every previously issued token.
        const updated = await client.query(
          'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2',
          [passwordHash, user.id],
        );
        if (updated.rowCount !== 1) throw invalidReset();
        await client.query('COMMIT');
      } catch (err) {
        return await rollbackTransaction(client, { value: err });
      } finally {
        releaseTransactionClient(client);
      }
      res.status(204).end();
    }),
  );

  authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: toUserJson(req.user!) });
  });

  authRouter.patch(
    '/me',
    requireAuth,
    validate({ body: updateProfileSchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { name, nativeLanguage, uiLanguage } = validated(req, updateProfileSchema);
      const { rows } = await pool.query<UserRow>(
        `UPDATE users
         SET name = coalesce($1, name),
             native_language = coalesce($2, native_language),
             ui_language = coalesce($3, ui_language)
         WHERE id = $4
         RETURNING *`,
        [name ?? null, nativeLanguage ?? null, uiLanguage ?? null, user.id],
      );
      const updated = rows[0];
      // A concurrent self-delete between requireAuth and this UPDATE leaves no
      // row; treat it like the sibling routes' state change, not a TypeError.
      if (!updated) throw authenticationStateChanged();
      res.json({ user: toUserJson(updated) });
    }),
  );

  // Logout revokes every bearer token issued before this request. This is a
  // deliberate all-device logout until refresh-token families are introduced.
  authRouter.post(
    '/logout',
    requireAuth,
    h(async (req: AuthedRequest, res) => {
      await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user!.id]);
      res.status(204).end();
    }),
  );

  authRouter.post(
    '/change-password',
    requireAuth,
    limiters.passwordAccount,
    validate({ body: changePasswordSchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { currentPassword, newPassword } = validated(req, changePasswordSchema);
      // requireAuth deliberately does not pin the bcrypt hash onto the request
      // object; fetch the exact credential snapshot at the moment of
      // verification instead. A self-delete between the two reads leaves no
      // row and gets the same state-change error as the guarded write below.
      const credentialRows = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [user.id],
      );
      const credential = credentialRows.rows[0];
      if (!credential) throw authenticationStateChanged();
      if (!(await bcrypt.compare(currentPassword, credential.password_hash))) {
        if (res.locals.passwordAccountThrottled) {
          throw new HttpError(429, 'Too many attempts, please try again later');
        }
        throw new HttpError(401, 'Current password is incorrect', 'INVALID_CREDENTIALS');
      }
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
      // Bind the write to the exact credential snapshot that was verified.
      // A concurrent password reset/change/logout must win instead of being
      // overwritten by this now-stale request. The same statement revokes any
      // outstanding reset code — one already sitting in a mailbox must not
      // survive the rotation meant to re-secure the account — and driving the
      // DELETE off the guarded UPDATE's own output keeps both writes atomic
      // while leaving a losing (409) request's token untouched.
      const updatedResult = await pool.query<UserRow>(
        `WITH updated AS (
           UPDATE users
           SET password_hash = $1, token_version = token_version + 1
           WHERE id = $2 AND password_hash = $3 AND token_version = $4
           RETURNING *
         ), revoked AS (
           DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM updated)
         )
         SELECT * FROM updated`,
        [passwordHash, user.id, credential.password_hash, credential.token_version],
      );
      if (updatedResult.rowCount !== 1) throw authenticationStateChanged();
      const updated = updatedResult.rows[0];
      res.json({ token: signToken(updated), user: toUserJson(updated) });
    }),
  );

  authRouter.delete(
    '/account',
    requireAuth,
    limiters.passwordAccount,
    validate({ body: deleteAccountSchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { password } = validated(req, deleteAccountSchema);
      // Same in-route credential snapshot as change-password: the hash never
      // rides on the request object, and a vanished row is the same
      // state-change error as the guarded DELETE below.
      const credentialRows = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [user.id],
      );
      const credential = credentialRows.rows[0];
      if (!credential) throw authenticationStateChanged();
      if (!(await bcrypt.compare(password, credential.password_hash))) {
        if (res.locals.passwordAccountThrottled) {
          throw new HttpError(429, 'Too many attempts, please try again later');
        }
        throw new HttpError(401, 'Password is incorrect', 'INVALID_CREDENTIALS');
      }
      // attempts / diagnostic_state rows are removed by ON DELETE CASCADE.
      // As with password changes, delete only the credential snapshot that was
      // confirmed above; never delete an account after another request has
      // already changed or revoked that authentication state.
      const deleted = await pool.query(
        'DELETE FROM users WHERE id = $1 AND password_hash = $2 AND token_version = $3',
        [user.id, credential.password_hash, credential.token_version],
      );
      if (deleted.rowCount !== 1) throw authenticationStateChanged();
      res.status(204).end();
    }),
  );

  // Paginated data export: bounded memory/response size even for long-lived
  // accounts. Follow nextCursor and nextPracticeCycleCursor independently
  // until both are null to export every attempt and every serving cycle.
  authRouter.get(
    '/me/data',
    requireAuth,
    validate({ query: exportQuerySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { limit, cursor, practiceCycleCursor, attemptsDone, practiceCyclesDone } = validated(
        req,
        exportQuerySchema,
      );
      if (cursor) {
        const cursorRow = await pool.query('SELECT 1 FROM attempts WHERE id = $1 AND user_id = $2', [cursor, user.id]);
        if (!cursorRow.rows[0]) throw new HttpError(400, 'Invalid export cursor');
      }
      if (practiceCycleCursor) {
        const cursorRow = await pool.query('SELECT 1 FROM practice_cycles WHERE id = $1 AND user_id = $2', [
          practiceCycleCursor,
          user.id,
        ]);
        if (!cursorRow.rows[0]) throw new HttpError(400, 'Invalid practice cycle export cursor');
      }

      const { rows } = attemptsDone
        ? { rows: [] }
        : await pool.query(
            `SELECT a.id, a.question_id AS "questionId", q.prompt_word AS "promptWord",
                    q.question_text AS "questionText", q.cefr_level AS "cefrLevel",
                    a.context, a.attempt_no AS "attemptNo",
                    a.transcript, a.score, a.passed, a.feedback,
                    a.practice_cycle_id AS "cycleId", a.understood,
                    a.translated_transcript AS "translatedTranscript", a.model_answer AS "modelAnswer",
                    a.native_language AS "nativeLanguage",
                    a.created_at AS "createdAt"
             FROM attempts a
             JOIN questions q ON q.id = a.question_id
             WHERE a.user_id = $1
               AND (
                 $2::uuid IS NULL
                 OR (a.created_at, a.id) > (
                   SELECT created_at, id FROM attempts WHERE id = $2 AND user_id = $1
                 )
               )
             ORDER BY a.created_at ASC, a.id ASC
             LIMIT $3`,
            [user.id, cursor ?? null, limit + 1],
          );
      const progressResult = await pool.query(
        `SELECT pp.question_id AS "questionId", q.prompt_word AS "promptWord",
                q.cefr_level AS "cefrLevel", pp.status, pp.best_score AS "bestScore",
                pp.attempt_count AS "attemptCount", pp.last_attempt_at AS "lastAttemptAt",
                pp.due_at AS "dueAt", pp.srs_interval_index AS "srsIntervalIndex",
                pp.skipped_until AS "skippedUntil"
         FROM practice_progress pp
         JOIN questions q ON q.id = pp.question_id
         WHERE pp.user_id = $1
         ORDER BY q.cefr_level, q.prompt_word, pp.question_id`,
        [user.id],
      );
      const diagnosticResult = await pool.query(
        `SELECT low_idx AS "lowIndex", high_idx AS "highIndex",
                questions_asked AS "questionsAsked", current_question_id AS "currentQuestionId"
         FROM diagnostic_state WHERE user_id = $1`,
        [user.id],
      );
      const cycleResult = practiceCyclesDone
        ? { rows: [] }
        : await pool.query(
            `SELECT id, question_id AS "questionId", kind,
                    attempts_used AS "attemptsUsed", status,
                    created_at AS "createdAt", updated_at AS "updatedAt", closed_at AS "closedAt"
             FROM practice_cycles
             WHERE user_id = $1
               AND (
                 $2::uuid IS NULL
                 OR (created_at, id) > (
                   SELECT created_at, id FROM practice_cycles WHERE id = $2 AND user_id = $1
                 )
               )
             ORDER BY created_at ASC, id ASC
             LIMIT $3`,
            [user.id, practiceCycleCursor ?? null, limit + 1],
          );
      const hasMore = rows.length > limit;
      const attempts = hasMore ? rows.slice(0, limit) : rows;
      const hasMorePracticeCycles = cycleResult.rows.length > limit;
      const practiceCycles = hasMorePracticeCycles ? cycleResult.rows.slice(0, limit) : cycleResult.rows;
      res.json({
        user: toUserJson(user),
        attempts,
        practiceProgress: progressResult.rows,
        practiceCycles,
        diagnosticState: diagnosticResult.rows[0] ?? null,
        nextCursor: hasMore ? attempts[attempts.length - 1].id : null,
        nextPracticeCycleCursor: hasMorePracticeCycles ? practiceCycles[practiceCycles.length - 1].id : null,
        attemptsDone: attemptsDone || !hasMore,
        practiceCyclesDone: practiceCyclesDone || !hasMorePracticeCycles,
      });
    }),
  );

  return authRouter;
}
