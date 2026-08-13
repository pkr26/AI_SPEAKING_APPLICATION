import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from './config';
import { pool } from './db';
import { AuthedRequest, h, HttpError, JWT_AUDIENCE, JWT_ISSUER, requireAuth, UserRow, validate } from './middleware';
import { Limiters } from './rate-limit';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

const BCRYPT_COST = 12;
const BCRYPT_MAX_BYTES = 72;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
// A real cost-12 hash keeps the unknown-email login path comparable to a
// normal bcrypt verification without corresponding to any user password.
const DUMMY_BCRYPT_HASH = '$2b$12$uHmk0Jtqi.9oe6f8E8sIMuNV0ECcPhIheggvbpHkSlO/6IXNNQzFu';

export function toUserJson(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    nativeLanguage: row.native_language,
    cefrLevel: row.cefr_level,
    diagnosticCompleted: row.diagnostic_completed,
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

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(MAX_NAME_LENGTH, `name must be at most ${MAX_NAME_LENGTH} characters`),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, `email must be at most ${MAX_EMAIL_LENGTH} characters`)
    .email('a valid email is required'),
  password: passwordSchema,
  nativeLanguage: z.enum(['te', 'hi', 'es', 'zh'], {
    errorMap: () => ({ message: "nativeLanguage must be one of 'te','hi','es','zh'" }),
  }),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'email and password are required' })
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, `email must be at most ${MAX_EMAIL_LENGTH} characters`)
    .email('a valid email is required'),
  password: comparablePasswordSchema('password'),
});

const changePasswordSchema = z.object({
  currentPassword: comparablePasswordSchema('currentPassword'),
  newPassword: passwordSchema,
});

const deleteAccountSchema = z.object({
  password: comparablePasswordSchema('password'),
});

const exportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().uuid('cursor must be a valid UUID').optional(),
});

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
      const { name, email, password, nativeLanguage } = req.body as z.infer<typeof registerSchema>;

      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      // User + initial diagnostic state in ONE transaction.
      const client = await pool.connect();
      let user: UserRow;
      try {
        await client.query('BEGIN');
        const { rows } = await client.query<UserRow>(
          'INSERT INTO users (name, email, password_hash, native_language) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, email, passwordHash, nativeLanguage],
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
          (e as { code?: string }).code === '23505' ? new HttpError(409, 'Email already registered') : e;
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
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      const user = rows[0];
      // Always verify, even when the account budget is exhausted: an attacker
      // saturating it must not lock out the real owner (see rate-limit.ts).
      const validPassword = await bcrypt.compare(password, user?.password_hash ?? DUMMY_BCRYPT_HASH);
      if (!user || !validPassword) {
        if (res.locals.loginAccountThrottled) {
          throw new HttpError(429, 'Too many login attempts, please try again later');
        }
        throw new HttpError(401, 'Invalid email or password');
      }
      res.json({ token: signToken(user), user: toUserJson(user) });
    }),
  );

  authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: toUserJson(req.user!) });
  });

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
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
        if (res.locals.passwordAccountThrottled) {
          throw new HttpError(429, 'Too many attempts, please try again later');
        }
        throw new HttpError(401, 'Current password is incorrect');
      }
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
      // Bumping token_version invalidates every previously issued token.
      const { rows } = await pool.query<UserRow>(
        'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *',
        [passwordHash, user.id],
      );
      const updated = rows[0];
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
      const { password } = req.body as z.infer<typeof deleteAccountSchema>;
      if (!(await bcrypt.compare(password, user.password_hash))) {
        if (res.locals.passwordAccountThrottled) {
          throw new HttpError(429, 'Too many attempts, please try again later');
        }
        throw new HttpError(401, 'Password is incorrect');
      }
      // attempts / diagnostic_state rows are removed by ON DELETE CASCADE.
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
      res.status(204).end();
    }),
  );

  // Paginated data export: bounded memory/response size even for long-lived
  // accounts. Follow nextCursor until it is null to export every attempt.
  authRouter.get(
    '/me/data',
    requireAuth,
    validate({ query: exportQuerySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { limit, cursor } = req.query as unknown as z.infer<typeof exportQuerySchema>;
      if (cursor) {
        const cursorRow = await pool.query('SELECT 1 FROM attempts WHERE id = $1 AND user_id = $2', [cursor, user.id]);
        if (!cursorRow.rows[0]) throw new HttpError(400, 'Invalid export cursor');
      }

      const { rows } = await pool.query(
        `SELECT id, question_id AS "questionId", context, attempt_no AS "attemptNo",
              transcript, score, passed, feedback, created_at AS "createdAt"
       FROM attempts
       WHERE user_id = $1
         AND (
           $2::uuid IS NULL
           OR (created_at, id) > (
             SELECT created_at, id FROM attempts WHERE id = $2 AND user_id = $1
           )
         )
       ORDER BY created_at ASC, id ASC
       LIMIT $3`,
        [user.id, cursor ?? null, limit + 1],
      );
      const hasMore = rows.length > limit;
      const attempts = hasMore ? rows.slice(0, limit) : rows;
      res.json({
        user: toUserJson(user),
        attempts,
        nextCursor: hasMore ? attempts[attempts.length - 1].id : null,
      });
    }),
  );

  return authRouter;
}
