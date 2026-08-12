import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('auth: bcrypt 72-byte password boundary', () => {
  const a = app();

  it('accepts a password of exactly 72 UTF-8 bytes', async () => {
    const ascii = `${'a'.repeat(70)}1b`; // 72 single-byte chars
    expect(Buffer.byteLength(ascii, 'utf8')).toBe(72);
    const { res } = await registerUser(a, { password: ascii });
    expect(res.status).toBe(201);

    // The same boundary is enforced with multi-byte characters.
    const multibyte = `${'a'.repeat(69)}1é`; // 69 + 1 + 2 bytes
    expect(Buffer.byteLength(multibyte, 'utf8')).toBe(72);
    const second = await registerUser(a, { password: multibyte });
    expect(second.res.status).toBe(201);
  });

  it('rejects a password of 73 UTF-8 bytes', async () => {
    const ascii = `${'a'.repeat(71)}1b`;
    expect(Buffer.byteLength(ascii, 'utf8')).toBe(73);
    expect((await registerUser(a, { password: ascii })).res.status).toBe(400);

    const multibyte = `${'a'.repeat(70)}1é`; // 70 + 1 + 2 bytes
    expect(Buffer.byteLength(multibyte, 'utf8')).toBe(73);
    expect((await registerUser(a, { password: multibyte })).res.status).toBe(400);
  });

  it('enforces the same byte boundary on login and change-password inputs', async () => {
    const { res, body } = await registerUser(a);
    expect(res.status).toBe(201);

    const login = await request(a)
      .post('/auth/login')
      .send({ email: body.email, password: `${'a'.repeat(71)}1b` });
    expect(login.status).toBe(400);

    const change = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ currentPassword: body.password, newPassword: `${'a'.repeat(70)}1é` });
    expect(change.status).toBe(400);

    // Exactly 72 bytes is accepted as the new password.
    const ok = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ currentPassword: body.password, newPassword: `${'a'.repeat(70)}1b` });
    expect(ok.status).toBe(200);
  });
});

describe('auth: data export pagination boundary', () => {
  const a = app();

  async function seedAttempts(userId: string, transcripts: string[]) {
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    for (const transcript of transcripts) {
      await pool.query(
        `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
         VALUES ($1, $2, 'practice', 1, $3, 80, true, 'nice')`,
        [userId, q.rows[0].id, transcript],
      );
    }
  }

  it('returns nextCursor only when more rows than the limit exist', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await seedAttempts(res.body.user.id, ['one', 'two']);

    // rows.length (2) is NOT > limit (2): no cursor.
    const exact = await request(a).get('/auth/me/data?limit=2').set('Authorization', `Bearer ${token}`);
    expect(exact.status).toBe(200);
    expect(exact.body.attempts).toHaveLength(2);
    expect(exact.body.nextCursor).toBeNull();

    await seedAttempts(res.body.user.id, ['three']);
    // Now 3 rows > limit 2: cursor points at the last returned row.
    const paged = await request(a).get('/auth/me/data?limit=2').set('Authorization', `Bearer ${token}`);
    expect(paged.body.attempts).toHaveLength(2);
    expect(paged.body.nextCursor).toBe(paged.body.attempts[1].id);

    const rest = await request(a)
      .get(`/auth/me/data?limit=2&cursor=${paged.body.nextCursor}`)
      .set('Authorization', `Bearer ${token}`);
    expect(rest.body.attempts).toHaveLength(1);
    expect(rest.body.nextCursor).toBeNull();
  });

  it('validates the export limit range', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    for (const limit of ['0', '501', '-3', 'abc']) {
      const r = await request(a).get(`/auth/me/data?limit=${limit}`).set('Authorization', `Bearer ${token}`);
      expect(r.status).toBe(400);
    }
    const edge = await request(a).get('/auth/me/data?limit=500').set('Authorization', `Bearer ${token}`);
    expect(edge.status).toBe(200);
  });
});
