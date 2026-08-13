import { randomUUID } from 'crypto';
import fsSync from 'fs';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { PassThrough, Readable } from 'stream';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AWS SDK at the module boundary so S3 mode is fully exercisable
// without real credentials or a bucket.
const { sendMock, createPresignedPostMock, s3ClientConstructorMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    createPresignedPostMock: vi.fn(),
    s3ClientConstructorMock: vi.fn().mockImplementation(function () {
      return { send };
    }),
  };
});

vi.mock('@aws-sdk/client-s3', () => {
  // Functions (not arrows) so `new XCommand(input)` works; the returned object wins.
  const command = (kind: string) =>
    vi.fn().mockImplementation(function (input: unknown) {
      return { kind, input };
    });
  return {
    S3Client: s3ClientConstructorMock,
    GetObjectCommand: command('get'),
    DeleteObjectCommand: command('delete'),
  };
});

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: (client: unknown, options: unknown) => createPresignedPostMock(client, options),
}));

import { config } from '../src/config';
import {
  createAudioSizeCap,
  discardPresignedAudio,
  discardSubmittedPresignedAudio,
  finalizeSubmittedPresignedAudio,
  MAX_AUDIO_BYTES,
  resolvePresignedAudio,
} from '../src/audio-upload';
import { AuthedRequest } from '../src/middleware';
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

async function completeDiagnosticInS3Mode(a: ReturnType<typeof app>, token: string, userId: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    if (next.body.done) return;
    const audioKey = ownedKey(userId);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });
    const response = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey });
    if (response.status !== 200) {
      throw new Error(`diagnostic answer failed: ${response.status} ${JSON.stringify(response.body)}`);
    }
    if (response.body.done) return;
  }
  throw new Error('diagnostic did not finish within 5 S3 answers');
}

async function consumeSizeCap(chunks: Buffer[], maxBytes: number): Promise<Buffer> {
  const received: Buffer[] = [];
  for await (const chunk of Readable.from(chunks).pipe(createAudioSizeCap(maxBytes))) {
    received.push(chunk as Buffer);
  }
  return Buffer.concat(received);
}

function directS3Request(userId: string, audioKey = ownedKey(userId)): AuthedRequest {
  return {
    body: { audioKey },
    user: { id: userId },
  } as AuthedRequest;
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

afterAll(async () => {
  await pool.end();
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
    expect(res.headers['cache-control']).toBe('no-store');
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
    expect(s3ClientConstructorMock).toHaveBeenCalledOnce();
    expect(s3ClientConstructorMock).toHaveBeenCalledWith({ region: config.s3.region });
  });

  it('enforces the upload-grant budget per user without coupling learners on one IP', async () => {
    const previousWindow = config.rateLimit.uploadGrantWindowMs;
    const previousMax = config.rateLimit.uploadGrantMax;
    config.rateLimit.uploadGrantWindowMs = 61_337;
    config.rateLimit.uploadGrantMax = 1;
    try {
      const a = app();
      const { res: firstRegistration } = await registerUser(a);
      const { res: secondRegistration } = await registerUser(a);
      const firstToken = firstRegistration.body.token as string;
      const secondToken = secondRegistration.body.token as string;

      expect(
        (
          await request(a)
            .post('/uploads/audio-url')
            .set('Authorization', `Bearer ${firstToken}`)
            .send({ contentType: 'audio/mp4' })
        ).status,
      ).toBe(200);
      const limited = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${firstToken}`)
        .send({ contentType: 'audio/mp4' });
      expect(limited.status).toBe(429);
      expect(limited.headers['cache-control']).toBe('no-store');
      expect(limited.body).toEqual({ error: 'Audio upload grant rate limit reached, please try again later' });

      expect(
        (
          await request(a)
            .post('/uploads/audio-url')
            .set('Authorization', `Bearer ${secondToken}`)
            .send({ contentType: 'audio/mp4' })
        ).status,
      ).toBe(200);
    } finally {
      config.rateLimit.uploadGrantWindowMs = previousWindow;
      config.rateLimit.uploadGrantMax = previousMax;
    }
  });
});

describe('submitted S3 cleanup lifecycle', () => {
  it('preserves on an early close, then owner finalization deletes exactly once', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const req = {
      body: { audioKey },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
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
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
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
    await finalizeSubmittedPresignedAudio(res);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each([409, 429])('preserves a %s before an owner has inserted its request claim', async (statusCode) => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId), requestId: randomUUID() },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, Array<() => void>>();
    const res = {
      statusCode,
      writableFinished: true,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

    const ownershipQuery = vi.spyOn(pool, 'query');
    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      for (const listener of listeners.get('finish') ?? []) listener();

      // Await the same finalizer that the response listener started. A 409/429
      // must preserve the response contract without looking up ownership or
      // deleting an object that a saturated worker may still claim.
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
      expect(res.statusCode).toBe(statusCode);
      expect(ownershipQuery).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      ownershipQuery.mockRestore();
    }
  });

  it('deletes only a key owned by the supplied user and sends the exact bucket/key pair', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    sendMock.mockResolvedValue({});

    await discardPresignedAudio(userId, audioKey);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toEqual({
      kind: 'delete',
      input: { Bucket: config.s3.bucket, Key: audioKey },
    });
    expect((sendMock.mock.calls[0][1] as { abortSignal: AbortSignal }).abortSignal).toBeInstanceOf(AbortSignal);

    await discardPresignedAudio(userId, ownedKey(randomUUID()));
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('retains the object when the ownership query fails closed', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId), requestId: randomUUID() },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('ownership lookup failed') as never);

    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
      expect(query).toHaveBeenCalledOnce();
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
    }
  });

  it('coalesces simultaneous finalizers into one in-flight delete', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId) },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    let releaseDelete!: () => void;
    sendMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseDelete = resolve;
        }),
    );

    discardSubmittedPresignedAudio(req, res, vi.fn());
    const first = finalizeSubmittedPresignedAudio(res);
    const second = finalizeSubmittedPresignedAudio(res);

    expect(second).toBe(first);
    expect(sendMock).toHaveBeenCalledOnce();
    releaseDelete();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('aborts a hung DeleteObject at the storage deadline while remaining best effort', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = options?.abortSignal;
          observedSignal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    try {
      const userId = randomUUID();
      const deletion = discardPresignedAudio(userId, ownedKey(userId));
      await vi.advanceTimersByTimeAsync(20);
      await expect(deletion).resolves.toBeUndefined();
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('clears the DeleteObject deadline after a successful deletion', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({});
    });

    try {
      const userId = randomUUID();
      await discardPresignedAudio(userId, ownedKey(userId));
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });
});

describe('S3 object download boundaries', () => {
  it('accepts the exact stream cap and rejects the first byte beyond it', async () => {
    await expect(consumeSizeCap([Buffer.from('ab'), Buffer.from('cd')], 4)).resolves.toEqual(Buffer.from('abcd'));
    await expect(consumeSizeCap([Buffer.from('abcd'), Buffer.from('e')], 4)).rejects.toEqual(
      expect.objectContaining({ status: 413, message: 'Audio file is too large' }),
    );
  });

  it('accepts an exact-cap ContentLength and creates a private temporary file', async () => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = new EventEmitter();
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const chmod = vi.spyOn(fsSync, 'chmodSync');
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()), ContentLength: MAX_AUDIO_BYTES });
    });

    try {
      await resolvePresignedAudio(req, res as never);

      expect(req.file?.path).toBeTruthy();
      expect(sendMock.mock.calls[0][0]).toEqual({
        kind: 'get',
        input: { Bucket: config.s3.bucket, Key: req.body.audioKey },
      });
      expect(observedSignal).toBeInstanceOf(AbortSignal);
      expect(createWriteStream).toHaveBeenCalledWith(req.file!.path, { flags: 'wx', mode: 0o600 });
      expect(chmod).toHaveBeenCalledWith(req.file!.path, 0o600);
      const stat = await fs.stat(req.file!.path);
      expect(stat.mode & 0o777).toBe(0o600);
      res.emit('finish');
      await vi.waitFor(async () => {
        await expect(fs.stat(req.file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      // A killed mutant or failed assertion must not leave a private fixture in
      // the shared uploads directory. The second emit is harmless (`once`).
      res.emit('finish');
      if (req.file?.path) await fs.rm(req.file.path, { force: true });
      createWriteStream.mockRestore();
      chmod.mockRestore();
    }
  });

  it('clears the GetObject/body deadline after a successful private download', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
    });

    try {
      await resolvePresignedAudio(req, res as never);
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      res.emit('finish');
      if (req.file?.path) await fs.rm(req.file.path, { force: true });
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('removes a completed download when final mode enforcement fails', async () => {
    const req = directS3Request(randomUUID());
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const chmodFailure = Object.assign(new Error('chmod failed'), { code: 'EIO' });
    const chmod = vi.spyOn(fsSync, 'chmodSync').mockImplementationOnce(() => {
      throw chmodFailure;
    });
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });

    try {
      await expect(resolvePresignedAudio(req, new EventEmitter() as never)).rejects.toMatchObject({
        status: 502,
        message: 'Audio storage unavailable; please try again',
      });
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      chmod.mockRestore();
      createWriteStream.mockRestore();
    }
  });

  it('rejects ContentLength one byte above the cap before consuming the body', async () => {
    const userId = randomUUID();
    let bodyRead = false;
    const body = new Readable({
      read() {
        bodyRead = true;
        this.push(null);
      },
    });
    const destroy = vi.spyOn(body, 'destroy');
    sendMock.mockResolvedValue({ Body: body, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject({
      status: 413,
      message: 'Audio file is too large',
    });
    expect(bodyRead).toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('does not let a throwing Node body destroy mask the stable 413', async () => {
    const destroy = vi.fn(() => {
      throw new Error('destroy failed');
    });
    sendMock.mockResolvedValue({ Body: { destroy }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('removes the private download on a response close without finish', async () => {
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    const unlink = vi.spyOn(fsSync, 'unlink');
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });

    try {
      await resolvePresignedAudio(req, res as never);
      expect(req.file?.path).toBeTruthy();
      await expect(fs.stat(req.file!.path)).resolves.toBeTruthy();
      res.emit('close');
      await vi.waitFor(async () => {
        await expect(fs.stat(req.file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
      expect(unlink.mock.calls.filter(([filePath]) => filePath === req.file!.path)).toHaveLength(1);
    } finally {
      res.emit('close');
      if (req.file?.path) await fs.rm(req.file.path, { force: true });
      unlink.mockRestore();
    }
  });

  it('cancels an unread non-Node body when oversized metadata is rejected', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    sendMock.mockResolvedValue({ Body: { cancel }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([
    ['never settles', () => new Promise<void>(() => undefined)],
    ['rejects', () => Promise.reject(new Error('cancel failed'))],
  ])('does not let body cleanup that %s delay or mask the stable 413', async (_caseName, cancelResult) => {
    const cancel = vi.fn(cancelResult);
    sendMock.mockResolvedValue({ Body: { cancel }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(cancel).toHaveBeenCalledOnce();
    await Promise.resolve();
  });

  it('rejects an S3 response without a body as an expired upload', async () => {
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    sendMock.mockResolvedValue({ ContentLength: 1 });

    try {
      await expect(
        resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
      ).rejects.toMatchObject({ status: 400, message: 'audio upload not found or expired' });
      expect(createWriteStream).not.toHaveBeenCalled();
    } finally {
      createWriteStream.mockRestore();
    }
  });

  it('aborts a stalled object-body pipeline at the deadline and removes its partial file', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const body = new PassThrough();
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: body });
    });
    const req = directS3Request(randomUUID());
    const result = resolvePresignedAudio(req, new EventEmitter() as never).then(
      () => ({ status: 'fulfilled' as const }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );

    try {
      await vi.waitFor(() => expect(createWriteStream).toHaveBeenCalledOnce());
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      await vi.advanceTimersByTimeAsync(20);
      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: { status: 504, message: 'Audio storage timed out; please try again' },
      });
      expect(observedSignal?.aborted).toBe(true);
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      body.destroy();
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      createWriteStream.mockRestore();
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it.each(['NoSuchKey', 'NotFound', '404'])('maps S3 %s to an expired upload', async (name) => {
    const error = new Error(name);
    error.name = name;
    sendMock.mockRejectedValue(error);

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 400, message: 'audio upload not found or expired' });
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

    const kinds = sendMock.mock.calls.map(([command]) => command.kind);
    expect(kinds).toContain('get');
    expect(kinds).toContain('delete');
    const deleteCommand = sendMock.mock.calls.find(([command]) => command.kind === 'delete')![0];
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
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['delete']);
  });

  it('does not let a losing processing retry delete the object while its owner is reading it', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });

    const submit = () =>
      request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

    const ownerRequest = submit();
    const ownerResponse = ownerRequest.then(
      (response) => ({ status: 'fulfilled' as const, response }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    let ownerOutcome: Awaited<typeof ownerResponse>;
    try {
      await vi.waitFor(() => expect(releaseOwner).toBeTypeOf('function'));

      const loser = await submit();
      expect(loser.status).toBe(409);
      expect(loser.body).toEqual({
        error: 'Assessment is still processing',
        retryAfterSeconds: 2,
      });
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      if (releaseOwner) {
        releaseOwner({ Body: Readable.from(fakeM4aBuffer()) });
      } else {
        ownerRequest.abort();
      }
      ownerOutcome = await ownerResponse;
    }
    if (ownerOutcome.status === 'rejected') throw ownerOutcome.reason;
    const owner = ownerOutcome.response;
    expect(owner.status).toBe(200);
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'delete']);
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
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['delete']);
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
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['delete']);
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

  it('maps an immediate storage AbortError to the same retryable timeout contract', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    sendMock.mockRejectedValue(abortError);

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 504, message: 'Audio storage timed out; please try again' });
  });
});

describe('POST /practice/attempt (S3 mode)', () => {
  it('validates a malformed requestId before the route and deletes the owned object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const audioKey = ownedKey(userId);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: 'not-a-uuid', audioKey });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requestId must be a valid UUID');
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['delete']);
    });
  });

  it('validates a non-string audioKey before the route and leaves no durable request claim', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId, audioKey: { key: ownedKey(userId) } });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/^audioKey:/);
    expect(sendMock).not.toHaveBeenCalled();
    const claims = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('returns 404 for a valid unknown question before download and deletes the owned object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const requestId = randomUUID();
    const audioKey = ownedKey(userId);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: randomUUID(), requestId, audioKey });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Question not found' });
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['delete']);
    });
    const claims = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('downloads, assesses, and finally deletes the learner-owned object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey });

    expect(response.status).toBe(200);
    const operations = sendMock.mock.calls.map(([command]) => ({
      kind: command.kind,
      bucket: command.input.Bucket,
      key: command.input.Key,
    }));
    expect(operations).toEqual([
      { kind: 'get', bucket: config.s3.bucket, key: audioKey },
      { kind: 'delete', bucket: config.s3.bucket, key: audioKey },
    ]);
  });

  it('does not let a losing in-flight retry delete the object while the practice owner is reading it', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });
    const submit = () =>
      request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: next.body.question.id, requestId, audioKey });

    const ownerRequest = submit();
    const ownerResponse = ownerRequest.then(
      (response) => ({ status: 'fulfilled' as const, response }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    let ownerOutcome: Awaited<typeof ownerResponse>;
    try {
      await vi.waitFor(() => expect(releaseOwner).toBeTypeOf('function'));

      const loser = await submit();
      expect(loser.status).toBe(409);
      expect(loser.body).toEqual({
        error: 'Assessment is still processing',
        retryAfterSeconds: 2,
      });
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      if (releaseOwner) {
        releaseOwner({ Body: Readable.from(fakeM4aBuffer()) });
      } else {
        ownerRequest.abort();
      }
      ownerOutcome = await ownerResponse;
    }
    if (ownerOutcome.status === 'rejected') throw ownerOutcome.reason;
    expect(ownerOutcome.response.status).toBe(200);
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'delete']);
  });

  it('rejects a foreign learner key before any S3 operation', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey: ownedKey(randomUUID()) });

    expect(response.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
