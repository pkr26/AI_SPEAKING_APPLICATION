import { afterAll, afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { pool } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('CORS allowlist', () => {
  const ALLOWED = 'https://allowed.example';
  const savedOrigins = [...config.corsOrigins];

  afterEach(() => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ...savedOrigins);
  });

  it('reflects allowlisted origins and omits the header for everything else', async () => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ALLOWED);
    const a = createApp();

    const allowed = await request(a).get('/health').set('Origin', ALLOWED);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED);

    const disallowed = await request(a).get('/health').set('Origin', 'https://evil.example');
    expect(disallowed.status).toBe(200); // not blocked — just no CORS grant
    expect(disallowed.headers['access-control-allow-origin']).toBeUndefined();

    // Non-browser clients (mobile apps, curl) send no Origin and pass through.
    const noOrigin = await request(a).get('/health');
    expect(noOrigin.status).toBe(200);
    expect(noOrigin.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflights only for allowlisted origins and never allows credentials', async () => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ALLOWED);
    const a = createApp();

    const preflight = await request(a)
      .options('/auth/login')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();

    const badPreflight = await request(a)
      .options('/auth/login')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(badPreflight.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('app wiring', () => {
  const a = createApp();

  it('sets security headers via helmet', async () => {
    const res = await request(a).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(a).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('echoes an inbound x-request-id and generates one otherwise', async () => {
    const inbound = await request(a).get('/health').set('x-request-id', 'req-from-client');
    expect(inbound.headers['x-request-id']).toBe('req-from-client');

    const generated = await request(a).get('/health');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const tooLong = await request(a).get('/health').set('x-request-id', 'x'.repeat(200));
    expect(tooLong.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(tooLong.headers['x-request-id']).not.toBe('x'.repeat(200));
  });

  it('rejects malformed JSON with 400, not 500', async () => {
    const res = await request(a)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ definitely not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body is not valid JSON');
  });
});
