import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AWS SDK at the module boundary so S3 mode is fully exercisable
// without real credentials or a bucket.
const { sendMock, createPresignedPostMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createPresignedPostMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  // Functions (not arrows) so `new XCommand(input)` works; the returned object wins.
  const command = (kind: string) =>
    vi.fn().mockImplementation(function (input: unknown) {
      return { kind, input };
    });
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return { send: sendMock };
    }),
    GetObjectCommand: command('get'),
    DeleteObjectCommand: command('delete'),
  };
});

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: (client: unknown, options: unknown) => createPresignedPostMock(client, options),
}));

import { config } from '../src/config';
import { discardSubmittedPresignedAudio, finalizeSubmittedPresignedAudio } from '../src/audio-upload';
import { app, fakeM4aBuffer, pool, registerUser } from './helpers';

// Switch the whole app into S3 ingress mode (must precede createApp()).
config.s3.bucket = 'test-audio-bucket';

async function registerAndGetQuestion(a: ReturnType<typeof app>) {
  const { res: reg } = await registerUser(a);
  if (reg.status !== 201) {
    throw new Error(`registration failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const token = reg.body.token as string;
  const userId = reg.body.user.id as string;
  const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
  return { token, userId, questionId: next.body.question.id as string };
}

function ownedKey(userId: string): string {
  return `audio-uploads/${userId}/${randomUUID()}.m4a`;
}

beforeEach(() => {
  sendMock.mockReset();
  createPresignedPostMock.mockReset();
  createPresignedPostMock.mockImplementation(
    (_client: unknown, options: { Key: string; Fields: Record<string, string> }) =>
      Promise.resolve({
        url: 'https://s3.example.com/presigned-post',
        fields: { key: options.Key, ...options.Fields, policy: 'signed-policy' },
      }),
  );
});

describe('POST /uploads/audio-url (S3 mode)', () => {
  it('returns a size-constrained presigned POST grant with a user-owned key and normalized content type', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;

    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: ' AUDIO/MP4 ' });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('s3');
    expect(res.body.uploadUrl).toBe('https://s3.example.com/presigned-post');
    expect(res.body.audioKey).toMatch(new RegExp(`^audio-uploads/${userId}/[0-9a-f-]{36}\\.m4a$`));
    expect(res.body.contentType).toBe('audio/mp4');
    expect(res.body.expiresIn).toBe(config.s3.uploadUrlTtlSeconds);
    expect(res.body.maxBytes).toBe(25 * 1024 * 1024);
    expect(res.body.uploadFields).toMatchObject({
      key: res.body.audioKey,
      'Content-Type': 'audio/mp4',
      policy: 'signed-policy',
    });

    // The storage service, not only the API download, enforces identity, type,
    // and size before accepting the learner's bytes.
    expect(createPresignedPostMock).toHaveBeenCalledOnce();
    const postOptions = createPresignedPostMock.mock.calls[0][1] as {
      Bucket: string;
      Key: string;
      Fields: Record<string, string>;
      Conditions: unknown[];
      Expires: number;
    };
    expect(postOptions).toMatchObject({
      Bucket: config.s3.bucket,
      Key: res.body.audioKey,
      Fields: { 'Content-Type': 'audio/mp4' },
      Expires: config.s3.uploadUrlTtlSeconds,
    });
    expect(postOptions.Conditions).toContainEqual(['eq', '$Content-Type', 'audio/mp4']);
    expect(postOptions.Conditions).toContainEqual(['content-length-range', 1, 25 * 1024 * 1024]);
  });
});

describe('submitted S3 cleanup lifecycle', () => {
  it('preserves on an early close, then owner finalization deletes exactly once', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const req = {
      body: { audioKey },
      user: { id: userId },
    } as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, () => void>();
    const res = {
      writableFinished: false,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const next = vi.fn();

    discardSubmittedPresignedAudio(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    listeners.get('close')?.();
    expect(sendMock).not.toHaveBeenCalled();

    sendMock.mockResolvedValue({});
    await finalizeSubmittedPresignedAudio(res);
    await finalizeSubmittedPresignedAudio(res);
    expect(sendMock).toHaveBeenCalledOnce();
    expect((sendMock.mock.calls[0][0] as { kind: string }).kind).toBe('delete');
  });

  it('preserves a limiter-rejected duplicate while a shared request claim is processing', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const userId = registration.body.user.id as string;
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    await pool.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status)
       VALUES ($1, $2, $3, 'diagnostic', $4, 'processing')`,
      [userId, requestId, randomUUID(), question.rows[0].id],
    );
    const req = {
      body: { audioKey, requestId },
      user: { id: userId },
    } as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, () => void>();
    const res = {
      writableFinished: true,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

    discardSubmittedPresignedAudio(req, res, vi.fn());
    listeners.get('finish')?.();
    await vi.waitFor(() => expect(sendMock).not.toHaveBeenCalled());
    await finalizeSubmittedPresignedAudio(res);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('preserves a 429 before an owner has inserted its request claim', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId), requestId: randomUUID() },
      user: { id: userId },
    } as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, Array<() => void>>();
    const res = {
      statusCode: 429,
      writableFinished: true,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

    discardSubmittedPresignedAudio(req, res, vi.fn());
    for (const listener of listeners.get('finish') ?? []) listener();
    await new Promise((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('POST /diagnostic/answer (S3 mode)', () => {
  it('downloads the presigned object, assesses it, and deletes the object', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey });

    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(typeof res.body.done).toBe('boolean');

    const kinds = sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind);
    expect(kinds).toContain('get');
    expect(kinds).toContain('delete');
    const deleteCommand = sendMock.mock.calls.find(([command]: [{ kind: string }]) => command.kind === 'delete')![0];
    expect(deleteCommand.input.Key).toBe(audioKey);
  });

  it('replays a completed request before downloading audio and still discards the newly submitted object', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const first = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey });
    expect(first.status).toBe(200);

    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const replay = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey });

    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind)).toEqual(['delete']);
  });

  it('does not let a losing processing retry delete the object while its owner is reading it', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    let signalGetStarted: (() => void) | undefined;
    const getStarted = new Promise<void>((resolve) => {
      signalGetStarted = resolve;
    });
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      signalGetStarted?.();
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });

    const submit = () =>
      request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

    const ownerResponse = submit().then((response) => response);
    await getStarted;

    const loser = await submit();
    expect(loser.status).toBe(409);
    expect(loser.body).toEqual({
      error: 'Assessment is still processing',
      retryAfterSeconds: 2,
    });
    expect(sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind)).toEqual(['get']);

    releaseOwner?.({ Body: Readable.from(fakeM4aBuffer()) });
    const owner = await ownerResponse;
    expect(owner.status).toBe(200);
    expect(sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind)).toEqual(['get', 'delete']);
  });

  it('deletes a submitted object when diagnostic completion rejects the request before download', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
    sendMock.mockResolvedValue({});

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Diagnostic already completed');
    expect(sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind)).toEqual(['delete']);
  });

  it('deletes an owned object when body validation rejects the request before the route handler', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    sendMock.mockResolvedValue({});

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: 'not-a-uuid', audioKey });

    expect(res.status).toBe(400);
    expect(sendMock.mock.calls.map(([command]: [{ kind: string }]) => command.kind)).toEqual(['delete']);
  });

  it('returns 400 for a key owned by another user without touching S3', async () => {
    const a = app();
    const { token, questionId } = await registerAndGetQuestion(a);
    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(randomUUID()) });
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the object is missing or expired', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const notFound = new Error('NoSuchKey');
    notFound.name = 'NoSuchKey';
    sendMock.mockRejectedValue(notFound);

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('audio upload not found or expired');
  });

  it('returns 413 when the object exceeds the audio size cap', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(Buffer.alloc(26 * 1024 * 1024, 1)) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(413);
  });

  it('returns 415 when the downloaded object is not real audio', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(Buffer.from('just text, not audio')) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(415);
  });

  it('returns 502 when S3 is unavailable', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    sendMock.mockRejectedValue(new Error('connection refused'));

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(502);
  });

  it('aborts a hung S3 GetObject request at the configured deadline', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    sendMock.mockImplementation(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.abortSignal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    try {
      const res = await request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
      expect(res.status).toBe(504);
      expect(res.body).toEqual({ error: 'Audio storage timed out; please try again' });
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
    }
  });
});
