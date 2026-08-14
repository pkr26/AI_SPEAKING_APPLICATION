import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { RequestHandler, Response, Router } from 'express';
import { z } from 'zod';
import { config } from './config';
import { isAssessmentRequestProcessing } from './idempotency';
import { logger } from './logger';
import { AuthedRequest, h, HttpError, requireAuth, validate } from './middleware';
import { Limiters } from './rate-limit';
import { AUDIO_TYPES, MAX_AUDIO_BYTES, uploadsDir } from './upload';

export { MAX_AUDIO_BYTES } from './upload';
const KEY_PREFIX = 'audio-uploads';
const AUDIO_EXTS = Object.keys(AUDIO_TYPES).map((ext) => ext.slice(1));
const SUBMITTED_AUDIO_CLEANUP = Symbol('submittedAudioCleanup');

interface SubmittedAudioCleanup {
  userId: string;
  audioKey: string;
  requestId?: string;
  discarded: boolean;
  preserve: boolean;
  finalizing?: Promise<void>;
}

type AudioCleanupResponse = Response & {
  [SUBMITTED_AUDIO_CLEANUP]?: SubmittedAudioCleanup;
};

// Canonical extension per content type (first allowlisted extension wins, so
// e.g. audio/mp4 maps to .m4a). Used to build S3 keys for presigned uploads.
// The map has no prototype: lookups like `__proto__`/`constructor` must miss
// instead of resolving inherited Object members into a truthy "extension".
const CONTENT_TYPE_TO_EXT: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = Object.create(null);
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
    `^${KEY_PREFIX}/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(${exts})$`,
    'i',
  ).test(key);
}

/** Stream guard used after S3 metadata validation so a lying/missing length cannot bypass the cap. */
export function createAudioSizeCap(maxBytes = MAX_AUDIO_BYTES): Transform {
  let received = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > maxBytes) {
        callback(new HttpError(413, 'Audio file is too large'));
      } else {
        callback(null, chunk);
      }
    },
  });
}

/** Release an S3 response body that is rejected before the download pipeline consumes it. */
function releaseUnreadObjectBody(body: unknown): void {
  const discardable = body as {
    destroy?: () => void;
    cancel?: () => void | Promise<void>;
  };
  try {
    if (typeof discardable.destroy === 'function') {
      discardable.destroy();
    } else if (typeof discardable.cancel === 'function') {
      // Do not let a transport's cleanup promise delay the stable 413. The S3
      // operation is already rejected, and cleanup remains best effort.
      void Promise.resolve(discardable.cancel()).catch(() => undefined);
    }
  } catch {
    // Releasing the transport is best effort and must not mask the stable 413
    // response that explains why the uploaded object was rejected.
  }
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
        ? {
            credentials: {
              accessKeyId: config.s3.accessKeyId,
              secretAccessKey: config.s3.secretAccessKey,
              ...(config.s3.sessionToken ? { sessionToken: config.s3.sessionToken } : {}),
            },
          }
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

  // Issues a short-lived, size-constrained presigned POST so clients upload
  // audio straight to S3. Without a configured bucket the API stays in local
  // multipart mode and tells the client so (production config requires S3).
  router.post(
    '/audio-url',
    ...(config.s3.bucket ? [limiters.uploadGrant] : []),
    validate({ body: audioUrlBodySchema }),
    h(async (req: AuthedRequest, res) => {
      const { contentType: requestedContentType } = req.body as z.infer<typeof audioUrlBodySchema>;
      const contentType = requestedContentType.trim().toLowerCase();
      const ext = contentTypeToExt(contentType);
      if (!ext) {
        throw new HttpError(415, 'Unsupported audio media type');
      }
      if (!config.s3.bucket) {
        return res.json({ mode: 'direct' });
      }
      const key = `${KEY_PREFIX}/${req.user!.id}/${randomUUID()}.${ext}`;
      // A presigned PUT cannot reliably enforce a maximum object length. S3
      // POST policies can, so the storage service itself rejects oversized
      // objects before they can create unbounded storage or download costs.
      const { url: uploadUrl, fields: uploadFields } = await createPresignedPost(getS3(), {
        Bucket: config.s3.bucket,
        Key: key,
        Fields: { 'Content-Type': contentType },
        Conditions: [
          ['eq', '$Content-Type', contentType],
          ['content-length-range', 1, MAX_AUDIO_BYTES],
        ],
        Expires: config.s3.uploadUrlTtlSeconds,
      });
      res.json({
        mode: 's3',
        uploadUrl,
        uploadFields,
        audioKey: key,
        contentType,
        expiresIn: config.s3.uploadUrlTtlSeconds,
        maxBytes: MAX_AUDIO_BYTES,
      });
    }),
  );

  return router;
}

/**
 * Best-effort deletion for a user-owned transient object. This is also used
 * when an idempotent response can be replayed without downloading the object.
 */
export async function discardPresignedAudio(userId: string, audioKey: string): Promise<void> {
  if (!isOwnedAudioKey(userId, audioKey) || !config.s3.bucket) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.s3.operationTimeoutMs);
  timer.unref();
  try {
    await getS3().send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: audioKey }), {
      abortSignal: controller.signal,
    });
  } catch (err) {
    logger.warn({ err, userId, audioKey }, 'failed to delete S3 audio object');
  } finally {
    clearTimeout(timer);
  }
}

/** Preserve a submitted key because another worker may still be reading it. */
export function preserveSubmittedPresignedAudio(res: Response): void {
  const cleanup = (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP];
  if (cleanup) cleanup.preserve = true;
}

/** The worker holding the claim may delete once its processing is complete. */
export function ownSubmittedPresignedAudio(res: Response): void {
  const cleanup = (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP];
  if (cleanup) {
    cleanup.requestId = undefined;
    cleanup.preserve = false;
  }
}

/** A completed replay no longer has an owner that could need this object. */
export function completeSubmittedPresignedAudioReplay(res: Response): void {
  const cleanup = (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP];
  if (cleanup) cleanup.requestId = undefined;
}

/** Idempotently discard after the owning route no longer needs the object. */
export function finalizeSubmittedPresignedAudio(res: Response): Promise<void> {
  const cleanup = (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP];
  if (!cleanup) return Promise.resolve();
  if (cleanup.finalizing) return cleanup.finalizing;
  if (cleanup.discarded || cleanup.preserve) return Promise.resolve();

  cleanup.finalizing = (async () => {
    // A pre-route conflict is not definitive: an owner may be processing even
    // before it can insert the shared claim under DB-pool saturation.
    if (res.statusCode === 409 || res.statusCode === 429) {
      cleanup.preserve = true;
      return;
    }
    // A duplicate can be stopped before claimAssessmentRequest (for example by
    // the assessment limiter). Consult the shared claim table before deleting.
    if (cleanup.requestId) {
      try {
        if (await isAssessmentRequestProcessing(cleanup.userId, cleanup.requestId)) {
          cleanup.preserve = true;
          return;
        }
      } catch (err) {
        // Fail closed for data safety: retain transient audio when ownership
        // cannot be established. The required bucket lifecycle bounds storage.
        cleanup.preserve = true;
        logger.warn({ err, userId: cleanup.userId }, 'failed to verify S3 audio cleanup ownership');
        return;
      }
    }
    cleanup.discarded = true;
    await discardPresignedAudio(cleanup.userId, cleanup.audioKey);
  })();
  return cleanup.finalizing;
}

/**
 * Register exactly one best-effort deletion before assessment body validation.
 * This covers malformed requests, idempotent replays, state/authorization
 * failures, missing objects, and provider errors without racing route cleanup.
 */
export const discardSubmittedPresignedAudio: RequestHandler = (rawReq, res, next) => {
  const req = rawReq as AuthedRequest;
  const audioKey = (req.body as { audioKey?: unknown } | undefined)?.audioKey;
  if (typeof audioKey !== 'string' || !req.user || !isOwnedAudioKey(req.user.id, audioKey)) {
    return next();
  }

  const rawRequestId = (req.body as { requestId?: unknown } | undefined)?.requestId;
  const requestId =
    typeof rawRequestId === 'string' && z.string().uuid().safeParse(rawRequestId).success ? rawRequestId : undefined;
  (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP] = {
    userId: req.user.id,
    audioKey,
    requestId,
    discarded: false,
    preserve: false,
  };
  // Finalize on a microtask so synchronous finish listeners can mark a
  // pre-route 409/429 as non-definitive before ownership is evaluated.
  res.once('finish', () => queueMicrotask(() => void finalizeSubmittedPresignedAudio(res)));
  // `close` can precede route/claim resolution when a client disconnects. In
  // that case retain the object for the active worker and let the mandatory S3
  // lifecycle rule collect any orphan; a normal post-finish close is harmless.
  res.once('close', () => {
    if (res.writableFinished) void finalizeSubmittedPresignedAudio(res);
  });
  return next();
};

/**
 * S3-mode audio ingress: downloads the object referenced by the validated
 * `audioKey` body field into a private temp file and exposes it as `req.file`,
 * so downstream handlers (magic-byte check, assessment, unlink) are identical
 * to the multipart flow. A route middleware registered before validation
 * discards the S3 object when the response finishes.
 */
export async function resolvePresignedAudio(authed: AuthedRequest, res: Response): Promise<void> {
  const audioKey = (authed.body as { audioKey?: string }).audioKey;
  if (!audioKey || !isOwnedAudioKey(authed.user!.id, audioKey)) {
    throw new HttpError(400, 'audioKey is missing or invalid');
  }

  const tempPath = path.join(uploadsDir, `${randomUUID()}${path.extname(audioKey)}`);
  const controller = new AbortController();
  const operationTimer = setTimeout(() => controller.abort(), config.s3.operationTimeoutMs);
  operationTimer.unref();
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    fs.unlink(tempPath, () => {});
  };
  // Register local cleanup before the first S3 request. The response-level S3
  // cleanup covers missing, oversized, malformed, replayed, and provider-error
  // responses without issuing duplicate DeleteObject requests.
  res.once('finish', cleanup);
  res.once('close', cleanup);

  try {
    const object = await getS3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: audioKey }), {
      abortSignal: controller.signal,
    });
    if (!object.Body) throw new HttpError(400, 'audio upload not found or expired');
    if (typeof object.ContentLength === 'number' && object.ContentLength > MAX_AUDIO_BYTES) {
      releaseUnreadObjectBody(object.Body);
      throw new HttpError(413, 'Audio file is too large');
    }

    const sizeCap = createAudioSizeCap();
    const out = fs.createWriteStream(tempPath, { flags: 'wx', mode: 0o600 });
    await pipeline(object.Body as NodeJS.ReadableStream, sizeCap, out, { signal: controller.signal });
    fs.chmodSync(tempPath, 0o600);
  } catch (err) {
    cleanup();
    if (err instanceof HttpError) throw err;
    if (controller.signal.aborted || (err as { name?: string }).name === 'AbortError') {
      throw new HttpError(504, 'Audio storage timed out; please try again');
    }
    const s3Err = err as { name?: string };
    if (s3Err.name === 'NoSuchKey' || s3Err.name === 'NotFound' || s3Err.name === '404') {
      throw new HttpError(400, 'audio upload not found or expired');
    }
    logger.warn({ err, userId: authed.user!.id }, 'failed to fetch audio from S3');
    throw new HttpError(502, 'Audio storage unavailable; please try again');
  } finally {
    clearTimeout(operationTimer);
  }

  authed.file = {
    path: tempPath,
    originalname: path.basename(audioKey),
  } as Express.Multer.File;
}
