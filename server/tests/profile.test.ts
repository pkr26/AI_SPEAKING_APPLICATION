import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('PATCH /auth/me', () => {
  const a = app();

  it('updates the name alone and returns the full user contract', async () => {
    const { res, body: reg } = await registerUser(a);
    const token = res.body.token as string;

    const r = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  Renamed Learner  ' });

    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body).toEqual({
      user: {
        id: res.body.user.id,
        name: 'Renamed Learner', // register-grade trimming applies
        email: reg.email,
        nativeLanguage: 'te',
        cefrLevel: null,
        diagnosticCompleted: false,
      },
    });

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.name).toBe('Renamed Learner');
  });

  it('updates the native language alone, and both fields together', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const languageOnly = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nativeLanguage: 'hi' });
    expect(languageOnly.status).toBe(200);
    expect(languageOnly.body.user).toMatchObject({ name: 'Test User', nativeLanguage: 'hi' });

    const both = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nueva Persona', nativeLanguage: 'es' });
    expect(both.status).toBe(200);
    expect(both.body.user).toMatchObject({ name: 'Nueva Persona', nativeLanguage: 'es' });

    const { rows } = await pool.query<{ name: string; native_language: string }>(
      'SELECT name, native_language FROM users WHERE id = $1',
      [res.body.user.id],
    );
    expect(rows[0]).toEqual({ name: 'Nueva Persona', native_language: 'es' });
  });

  it('rejects an empty update with 400 VALIDATION_FAILED', async () => {
    const { res } = await registerUser(a);

    const empty = await request(a).patch('/auth/me').set('Authorization', `Bearer ${res.body.token}`).send({});
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual({
      error: 'at least one of name or nativeLanguage is required',
      code: 'VALIDATION_FAILED',
    });

    // Unknown fields are stripped, so an email change attempt is an empty update.
    const emailChange = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ email: 'new@example.com' });
    expect(emailChange.status).toBe(400);
    expect(emailChange.body.code).toBe('VALIDATION_FAILED');
  });

  it('applies register-grade validation to both fields', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const controlChars = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'bad\u0000name' });
    expect(controlChars.status).toBe(400);
    expect(controlChars.body).toEqual({
      error: 'name: name must not contain control characters',
      code: 'VALIDATION_FAILED',
    });

    const tooLong = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'n'.repeat(101) });
    expect(tooLong.status).toBe(400);

    const blank = await request(a).patch('/auth/me').set('Authorization', `Bearer ${token}`).send({ name: '   ' });
    expect(blank.status).toBe(400);

    const badLanguage = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nativeLanguage: 'fr' });
    expect(badLanguage.status).toBe(400);
    expect(badLanguage.body).toEqual({
      error: "nativeLanguage: nativeLanguage must be one of 'te','hi','es','zh'",
      code: 'VALIDATION_FAILED',
    });

    // None of the rejected updates may have landed.
    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user).toMatchObject({ name: 'Test User', nativeLanguage: 'te' });
  });

  it('requires authentication', async () => {
    const r = await request(a).patch('/auth/me').send({ name: 'Nobody' });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });
  });
});
