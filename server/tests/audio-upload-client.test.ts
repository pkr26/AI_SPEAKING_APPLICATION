import { randomUUID } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, s3ClientConstructorMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    s3ClientConstructorMock: vi.fn().mockImplementation(function () {
      return { send };
    }),
  };
});

vi.mock('@aws-sdk/client-s3', () => {
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

const managedEnvironment = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_SESSION_TOKEN',
] as const;
const originalEnvironment = Object.fromEntries(managedEnvironment.map((name) => [name, process.env[name]]));

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
  s3ClientConstructorMock.mockClear();
});

afterEach(() => {
  for (const name of managedEnvironment) {
    const original = originalEnvironment[name];
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
  vi.resetModules();
});

async function constructClientWith(environment: Record<string, string>) {
  vi.resetModules();
  for (const name of managedEnvironment) delete process.env[name];
  Object.assign(process.env, {
    S3_BUCKET: 'credential-mode-bucket',
    S3_REGION: 'eu-west-2',
    ...environment,
  });
  const { discardPresignedAudio } = await import('../src/audio-upload');
  const userId = randomUUID();
  await discardPresignedAudio(userId, `audio-uploads/${userId}/${randomUUID()}.m4a`);
  await discardPresignedAudio(userId, `audio-uploads/${userId}/${randomUUID()}.m4a`);
  expect(sendMock).toHaveBeenCalledTimes(2);
  expect(s3ClientConstructorMock).toHaveBeenCalledOnce();
  return s3ClientConstructorMock.mock.calls[0][0] as Record<string, unknown>;
}

describe('S3 client credential modes', () => {
  it('uses the configured region and the AWS default provider chain when static credentials are absent', async () => {
    await expect(constructClientWith({})).resolves.toEqual({ region: 'eu-west-2' });
  });

  it('uses a complete static access-key pair without inventing a session token', async () => {
    await expect(
      constructClientWith({
        S3_ACCESS_KEY_ID: 'local-access-key',
        S3_SECRET_ACCESS_KEY: 'local-secret-key',
      }),
    ).resolves.toEqual({
      region: 'eu-west-2',
      credentials: {
        accessKeyId: 'local-access-key',
        secretAccessKey: 'local-secret-key',
      },
    });
  });

  it('passes the configured session token only with a complete static access-key pair', async () => {
    await expect(
      constructClientWith({
        S3_ACCESS_KEY_ID: 'temporary-access-key',
        S3_SECRET_ACCESS_KEY: 'temporary-secret-key',
        S3_SESSION_TOKEN: 'temporary-session-token',
      }),
    ).resolves.toEqual({
      region: 'eu-west-2',
      credentials: {
        accessKeyId: 'temporary-access-key',
        secretAccessKey: 'temporary-secret-key',
        sessionToken: 'temporary-session-token',
      },
    });
  });
});
