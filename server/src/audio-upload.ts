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
import { isAudioKeyClaimedForProcessing } from './idempotency';
import { logger } from './logger';
import { AuthedRequest, h, HttpError, requireAuth, validate, validated } from './middleware';
import { Limiters } from './rate-limit';
import { AUDIO_TYPES, MAX_AUDIO_BYTES, submittedAudioFileIsOwned, uploadsDir } from './upload';

const KEY_PREFIX = 'audio-uploads';
const AUDIO_EXTS = Object.keys(AUDIO_TYPES).map((ext) => ext.slice(1));
const SUBMITTED_AUDIO_CLEANUP = Symbol('submittedAudioCleanup');
// Errnos the local temp-file write (or its chmod) can raise. Download failures
// carry bare Node errnos too — a body truncated mid-transfer rejects with
// ERR_STREAM_PREMATURE_CLOSE/ECONNRESET after the SDK call already resolved,
// so it never gets $metadata — hence classification is by explicit filesystem
// errno rather than by "looks like a plain Node error".
function isLocalDiskErrorCode(code: unknown): boolean {
  return (
    code === 'EACCES' ||
    code === 'EDQUOT' ||
    code === 'EFBIG' ||
    code === 'EEXIST' ||
    code === 'EIO' ||
    code === 'EMFILE' ||
    code === 'ENFILE' ||
    code === 'ENOSPC' ||
    code === 'EPERM' ||
    code === 'EROFS'
  );
}

interface SubmittedAudioCleanup {
  userId: string;
  audioKey: string;
  preserve: boolean;
  finalizing?: Promise<void>;
}

type AudioCleanupResponse = Response & {
  [SUBMITTED_AUDIO_CLEANUP]?: SubmittedAudioCleanup;
};

// Response-event cleanup is deliberately fire-and-forget. Observability must
// never turn a best-effort ownership check or DeleteObject failure into an
// unhandled rejection if the logger transport itself is broken.
function warnAudioCleanup(context: Record<string, unknown>, message: string): void {
  try {
    logger.warn(context, message);
  } catch {
    // The bucket lifecycle remains the final cleanup fallback.
  }
}

// Return the canonical extension for a content type. The first allowlisted
// extension wins, so e.g. audio/mp4 maps to .m4a. Looking directly through the
// allowlist also makes inherited Object member names ordinary misses.
export function contentTypeToExt(contentType: string): string | undefined {
  const normalizedContentType = contentType.trim().toLowerCase();
  for (const [ext, mimes] of Object.entries(AUDIO_TYPES)) {
    if (mimes.includes(normalizedContentType)) return ext.slice(1);
  }
  return undefined;
}

/**
 * An audio key is only ever resolved for the user it was issued to, so one
 * learner can never have the API fetch another learner's object — or an
 * arbitrary bucket object — through the assessment pipeline.
 */
export function isOwnedAudioKey(userId: string, key: unknown): key is string {
  if (typeof key !== 'string') return false;
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
        callback(new HttpError(413, 'Audio file is too large', 'AUDIO_TOO_LARGE'));
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
    on?: (event: string, listener: (error: Error) => void) => unknown;
  };
  try {
    // The S3 SDK body is normally a Node Readable. We reject it before a
    // pipeline has attached listeners, so retain a no-op error listener while
    // destroying it; a concurrent transport failure must not become an
    // unhandled EventEmitter error in the API process.
    if (typeof discardable.on === 'function') discardable.on('error', () => undefined);
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

export function createAudioUploadRouter(limiters: Limiters) {
  const audioUrlBodySchema = z.object({
    contentType: z.string().max(128),
  });
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
      const { contentType: requestedContentType } = validated(req, audioUrlBodySchema);
      const contentType = requestedContentType.trim().toLowerCase();
      const ext = contentTypeToExt(contentType);
      if (!ext) {
        throw new HttpError(415, 'Unsupported audio media type', 'AUDIO_INVALID');
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
 * Best-effort deletion for a user-owned transient object after a successful
 * fresh owner no longer needs it.
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
    warnAudioCleanup({ err, userId, audioKey }, 'failed to delete S3 audio object');
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
  if (cleanup) cleanup.preserve = false;
}

/** Idempotently discard after the owning route no longer needs the object. */
export function finalizeSubmittedPresignedAudio(res: Response): Promise<void> {
  const cleanup = (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP];
  if (!cleanup) return Promise.resolve();
  if (cleanup.finalizing) return cleanup.finalizing;
  if (cleanup.preserve) return Promise.resolve();

  cleanup.finalizing = (async () => {
    // Only a successful fresh route owner may delete. Every replay or rejected
    // request either has no new durable binding or abandons
    // it before the error response finishes. A check-then-DeleteObject cleanup
    // for that unbound key has an unavoidable cross-replica gap: a valid retry
    // can claim the key after the check and lose it to the late delete. Retain
    // all non-success outcomes and let the mandatory bucket lifecycle collect
    // them. This covers terminal 4xx as well as retryable 409/429/5xx; client
    // behavior is not a synchronization primitive.
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }
    // Keep a final defensive check for a live worker. The durable unique
    // object binding prevents a new request from appearing after this lookup;
    // this query covers a worker whose processing transaction is already live
    // when a successful owner reaches cleanup.
    try {
      if (await isAudioKeyClaimedForProcessing(cleanup.userId, cleanup.audioKey)) {
        return;
      }
    } catch (err) {
      // Fail closed for data safety: retain transient audio when ownership
      // cannot be established. The required bucket lifecycle bounds storage.
      warnAudioCleanup({ err, userId: cleanup.userId }, 'failed to verify S3 audio cleanup ownership');
      return;
    }
    await discardPresignedAudio(cleanup.userId, cleanup.audioKey);
  })();
  return cleanup.finalizing;
}

/**
 * Register exactly one cleanup decision before assessment body validation.
 * It defaults to preservation: only a fresh durable owner can later opt into
 * best-effort deletion. Completed replays stay preserved because a deletion
 * begun near their 48-hour retention boundary could outlive the tombstone and
 * race a newly rebound request. That makes
 * malformed and pre-route requests safe without a racy ownership lookup.
 */
export const discardSubmittedPresignedAudio: RequestHandler = (rawReq, res, next) => {
  const req = rawReq as AuthedRequest;
  const body = req.body as { audioKey?: unknown } | undefined;
  if (!body || !req.user) {
    return next();
  }
  const audioKey = body.audioKey;
  if (!isOwnedAudioKey(req.user.id, audioKey)) {
    return next();
  }

  (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP] = {
    userId: req.user.id,
    audioKey,
    preserve: true,
  };
  // Finalize on a microtask so every synchronous finish listener observes the
  // completed response first. An error after a client abort intentionally
  // retains the object (no `finish` fires); the bucket lifecycle bounds it.
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
 * The slice of an uploaded audio file the assessment pipeline consumes.
 * Multer's Express.Multer.File satisfies it structurally, and the S3 download
 * below produces it honestly instead of casting a partial object to the full
 * multer shape.
 */
export interface SubmittedAudioFile {
  path: string;
  originalname: string;
}

/**
 * S3-mode audio ingress: downloads the object referenced by the validated
 * `audioKey` body field into a private temp file and returns it in the same
 * shape routes read off `req.file`, so downstream handling (magic-byte check,
 * assessment, unlink) is identical to the multipart flow. A route middleware
 * registered before validation discards the S3 object when the response
 * finishes.
 */
export async function resolvePresignedAudio(authed: AuthedRequest, res: Response): Promise<SubmittedAudioFile> {
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
  res.once('close', () => {
    if (!submittedAudioFileIsOwned(res)) cleanup();
  });

  try {
    const object = await getS3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: audioKey }), {
      abortSignal: controller.signal,
    });
    if (!object.Body) throw new HttpError(400, 'audio upload not found or expired', 'AUDIO_UPLOAD_MISSING');
    if (typeof object.ContentLength === 'number' && object.ContentLength > MAX_AUDIO_BYTES) {
      releaseUnreadObjectBody(object.Body);
      throw new HttpError(413, 'Audio file is too large', 'AUDIO_TOO_LARGE');
    }

    const sizeCap = createAudioSizeCap();
    const out = fs.createWriteStream(tempPath, { flags: 'wx', mode: 0o600 });
    await pipeline(object.Body as NodeJS.ReadableStream, sizeCap, out, { signal: controller.signal });
    fs.chmodSync(tempPath, 0o600);
  } catch (err) {
    cleanup();
    if (err instanceof HttpError) throw err;
    if (controller.signal.aborted || (err as { name?: string }).name === 'AbortError') {
      throw new HttpError(504, 'Audio storage timed out; please try again', 'PROVIDER_TIMEOUT');
    }
    const s3Err = err as { name?: string };
    if (s3Err.name === 'NoSuchKey' || s3Err.name === 'NotFound' || s3Err.name === '404') {
      throw new HttpError(400, 'audio upload not found or expired', 'AUDIO_UPLOAD_MISSING');
    }
    // A filesystem syscall failure (ENOSPC/EFBIG/EMFILE/EACCES from the temp-file
    // write stream or chmod) is a local disk fault, not an S3 outage: plain 500
    // with a distinct log line. AWS SDK errors carry $metadata and keep the
    // 502, and so does every transport errno the download stream can raise.
    const systemError = err as NodeJS.ErrnoException & { $metadata?: unknown };
    if (systemError.$metadata === undefined && isLocalDiskErrorCode(systemError.code)) {
      logger.error({ err, userId: authed.user!.id }, 'failed to store downloaded audio on local disk');
      throw new HttpError(500, 'Internal server error', 'INTERNAL');
    }
    logger.warn({ err, userId: authed.user!.id }, 'failed to fetch audio from S3');
    throw new HttpError(502, 'Audio storage unavailable; please try again', 'PROVIDER_FAILED');
  } finally {
    clearTimeout(operationTimer);
  }

  return { path: tempPath, originalname: path.basename(audioKey) };
}
