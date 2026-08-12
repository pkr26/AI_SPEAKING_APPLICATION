import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RequestHandler, Router } from 'express';
import { z } from 'zod';
import { config } from './config';
import { logger } from './logger';
import { AuthedRequest, h, HttpError, requireAuth, validate } from './middleware';
import { Limiters } from './rate-limit';
import { AUDIO_TYPES, uploadsDir } from './upload';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const KEY_PREFIX = 'audio-uploads';
const AUDIO_EXTS = Object.keys(AUDIO_TYPES).map((ext) => ext.slice(1));

// Canonical extension per content type (first allowlisted extension wins, so
// e.g. audio/mp4 maps to .m4a). Used to build S3 keys for presigned uploads.
const CONTENT_TYPE_TO_EXT: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const [ext, mimes] of Object.entries(AUDIO_TYPES)) {
    for (const mime of mimes) {
      if (!(mime in map)) map[mime] = ext.slice(1);
    }
  }
  return map;
})();

export function contentTypeToExt(contentType: string): string | undefined {
  return CONTENT_TYPE_TO_EXT[contentType.trim().toLowerCase()];
}

/**
 * An audio key is only ever resolved for the user it was issued to, so one
 * learner can never have the API fetch another learner's object — or an
 * arbitrary bucket object — through the assessment pipeline.
 */
export function isOwnedAudioKey(userId: string, key: string): boolean {
  const exts = AUDIO_EXTS.join('|');
  return new RegExp(
    `^${KEY_PREFIX}/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${exts})$`,
  ).test(key);
}

// --- S3 client (module singleton, created on first real use) ----------------
let s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (!config.s3.bucket) {
    throw new HttpError(503, 'Audio storage is not configured');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.s3.region,
      // Static keys are a local/dev convenience; in AWS environments the
      // default provider chain (IAM role, shared config) is preferred.
      ...(config.s3.accessKeyId && config.s3.secretAccessKey
        ? { credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey } }
        : {}),
    });
  }
  return s3Client;
}

const audioUrlBodySchema = z.object({
  contentType: z.string().max(128),
});

export function createAudioUploadRouter(limiters: Limiters) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  // Issues a short-lived presigned PUT URL so clients upload audio straight to
  // S3. Without a configured bucket the API stays in local multipart mode and
  // tells the client so (dev/test only — production config requires S3).
  router.post(
    '/audio-url',
    limiters.assess,
    validate({ body: audioUrlBodySchema }),
    h(async (req: AuthedRequest, res) => {
      const { contentType } = req.body as z.infer<typeof audioUrlBodySchema>;
      const ext = contentTypeToExt(contentType);
      if (!ext) {
        throw new HttpError(415, 'Unsupported audio media type');
      }
      if (!config.s3.bucket) {
        return res.json({ mode: 'direct' });
      }
      const key = `${KEY_PREFIX}/${req.user!.id}/${randomUUID()}.${ext}`;
      const uploadUrl = await getSignedUrl(
        getS3(),
        new PutObjectCommand({ Bucket: config.s3.bucket, Key: key, ContentType: contentType }),
        { expiresIn: config.s3.uploadUrlTtlSeconds },
      );
      res.json({ mode: 's3', uploadUrl, audioKey: key, expiresIn: config.s3.uploadUrlTtlSeconds });
    }),
  );

  return router;
}

/**
 * S3-mode audio ingress: downloads the object referenced by the validated
 * `audioKey` body field into a private temp file and exposes it as `req.file`,
 * so downstream handlers (magic-byte check, assessment, unlink) are identical
 * to the multipart flow. The S3 object is transient — it is deleted once the
 * response finishes, mirroring the delete-after-assess behavior of local mode.
 */
export const resolvePresignedAudio: RequestHandler = (req, res, next) => {
  void (async () => {
    const authed = req as AuthedRequest;
    const audioKey = (authed.body as { audioKey?: string }).audioKey;
    if (!audioKey || !isOwnedAudioKey(authed.user!.id, audioKey)) {
      throw new HttpError(400, 'audioKey is missing or invalid');
    }

    const tempPath = path.join(uploadsDir, `${randomUUID()}${path.extname(audioKey)}`);
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      fs.unlink(tempPath, () => {});
      getS3()
        .send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: audioKey }))
        .catch((err) => logger.warn({ err, userId: authed.user!.id, audioKey }, 'failed to delete S3 audio object'));
    };

    try {
      const object = await getS3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: audioKey }));
      if (!object.Body) throw new HttpError(400, 'audio upload not found or expired');

      let received = 0;
      const sizeCap = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          received += chunk.length;
          if (received > MAX_AUDIO_BYTES) {
            callback(new HttpError(413, 'Audio file is too large'));
          } else {
            callback(null, chunk);
          }
        },
      });
      const out = fs.createWriteStream(tempPath, { flags: 'wx', mode: 0o600 });
      await pipeline(object.Body as NodeJS.ReadableStream, sizeCap, out);
      fs.chmodSync(tempPath, 0o600);
    } catch (err) {
      fs.unlink(tempPath, () => {});
      if (err instanceof HttpError) throw err;
      const s3Err = err as { name?: string };
      if (s3Err.name === 'NoSuchKey' || s3Err.name === 'NotFound' || s3Err.name === '404') {
        throw new HttpError(400, 'audio upload not found or expired');
      }
      logger.warn({ err, userId: authed.user!.id }, 'failed to fetch audio from S3');
      throw new HttpError(502, 'Audio storage unavailable; please try again');
    }

    authed.file = {
      path: tempPath,
      originalname: path.basename(audioKey),
    } as Express.Multer.File;

    res.once('finish', cleanup);
    res.once('close', cleanup);
  })().then(next, next);
};
