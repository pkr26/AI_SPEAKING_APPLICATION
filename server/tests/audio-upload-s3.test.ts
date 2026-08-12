import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AWS SDK at the module boundary so S3 mode is fully exercisable
// without real credentials or a bucket.
const { sendMock, getSignedUrlMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
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
    PutObjectCommand: command('put'),
    GetObjectCommand: command('get'),
    DeleteObjectCommand: command('delete'),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (client: unknown, command: unknown, options: unknown) => getSignedUrlMock(client, command, options),
}));

import { config } from '../src/config';
import { app, fakeM4aBuffer, registerUser } from './helpers';

// Switch the whole app into S3 ingress mode (must precede createApp()).
config.s3.bucket = 'test-audio-bucket';

async function registerAndGetQuestion(a: ReturnType<typeof app>) {
  const { res: reg } = await registerUser(a);
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
  getSignedUrlMock.mockReset();
});

describe('POST /uploads/audio-url (S3 mode)', () => {
  it('returns a presigned PUT grant with a user-owned key', async () => {
    getSignedUrlMock.mockResolvedValue('https://s3.example.com/presigned-put');
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;

    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'audio/mp4' });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('s3');
    expect(res.body.uploadUrl).toBe('https://s3.example.com/presigned-put');
    expect(res.body.audioKey).toMatch(new RegExp(`^audio-uploads/${userId}/[0-9a-f-]{36}\\.m4a$`));
    expect(res.body.expiresIn).toBe(config.s3.uploadUrlTtlSeconds);
    // The signed request is pinned to the object's key and content type.
    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    const putCommand = getSignedUrlMock.mock.calls[0][1] as { kind: string; input: Record<string, unknown> };
    expect(putCommand.kind).toBe('put');
    expect(putCommand.input.Key).toBe(res.body.audioKey);
    expect(putCommand.input.ContentType).toBe('audio/mp4');
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
    // The transient object is deleted once the response finishes.
    await vi.waitFor(() => expect(kinds).toContain('delete'));
    const deleteCommand = sendMock.mock.calls.find(([command]: [{ kind: string }]) => command.kind === 'delete')![0];
    expect(deleteCommand.input.Key).toBe(audioKey);
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
});
