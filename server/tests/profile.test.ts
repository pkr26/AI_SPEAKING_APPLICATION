import { afterAll, describe, expect, it, vi } from 'vitest';
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
        uiLanguage: 'en',
        cefrLevel: null,
        diagnosticCompleted: false,
        diagnosticAcknowledged: false,
      },
    });

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.name).toBe('Renamed Learner');
  });

  it('updates native and UI languages independently, and all profile fields together', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const uiOnly = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ uiLanguage: 'zh' });
    expect(uiOnly.status).toBe(200);
    expect(uiOnly.body.user).toMatchObject({
      name: 'Test User',
      nativeLanguage: 'te',
      uiLanguage: 'zh',
    });

    const languageOnly = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nativeLanguage: 'hi' });
    expect(languageOnly.status).toBe(200);
    expect(languageOnly.body.user).toMatchObject({
      name: 'Test User',
      nativeLanguage: 'hi',
      uiLanguage: 'zh',
    });

    const both = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nueva Persona', nativeLanguage: 'es', uiLanguage: 'es' });
    expect(both.status).toBe(200);
    expect(both.body.user).toMatchObject({
      name: 'Nueva Persona',
      nativeLanguage: 'es',
      uiLanguage: 'es',
    });

    const { rows } = await pool.query<{ name: string; native_language: string; ui_language: string }>(
      'SELECT name, native_language, ui_language FROM users WHERE id = $1',
      [res.body.user.id],
    );
    expect(rows[0]).toEqual({ name: 'Nueva Persona', native_language: 'es', ui_language: 'es' });
  });

  it('rejects an empty update with 400 VALIDATION_FAILED', async () => {
    const { res } = await registerUser(a);

    const empty = await request(a).patch('/auth/me').set('Authorization', `Bearer ${res.body.token}`).send({});
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual({
      error: 'at least one of name, nativeLanguage, or uiLanguage is required',
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

    const badUiLanguage = await request(a)
      .patch('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ uiLanguage: 'fr' });
    expect(badUiLanguage.status).toBe(400);
    expect(badUiLanguage.body).toEqual({
      error: "uiLanguage: uiLanguage must be one of 'en','te','hi','es','zh'",
      code: 'VALIDATION_FAILED',
    });

    // None of the rejected updates may have landed.
    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user).toMatchObject({ name: 'Test User', nativeLanguage: 'te', uiLanguage: 'en' });
  });

  it('requires authentication', async () => {
    const r = await request(a).patch('/auth/me').send({ name: 'Nobody' });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });
  });

  it('answers 409 STATE_CHANGED when the account vanishes between auth and the update', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    // A concurrent self-delete commits after requireAuth loaded the user: the
    // UPDATE then matches no row. Simulate by emptying that one query result.
    const originalQuery = pool.query.bind(pool);
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...args: unknown[]) => {
      if (typeof text === 'string' && text.startsWith('UPDATE users') && text.includes('SET name = coalesce')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return originalQuery(text as never, ...(args as never[]));
    }) as typeof pool.query);
    try {
      const r = await request(a).patch('/auth/me').set('Authorization', `Bearer ${token}`).send({ name: 'Gone' });
      expect(r.status).toBe(409);
      expect(r.body).toEqual({ error: 'Authentication state changed; please try again', code: 'STATE_CHANGED' });
    } finally {
      query.mockRestore();
    }
  });
});
