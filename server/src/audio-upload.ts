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
import { isAssessmentRequestProcessing, isAudioKeyClaimedForProcessing } from './idempotency';
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
const LOCAL_DISK_ERROR_CODES = new Set([
  'EACCES',
  'EDQUOT',
  'EFBIG',
  'EEXIST',
  'EIO',
  'EMFILE',
  'ENFILE',
  'ENOSPC',
  'EPERM',
  'EROFS',
]);

interface SubmittedAudioCleanup {
  userId: string;
  audioKey: string;
  requestId?: string;
  preserve: boolean;
  finalizing?: Promise<void>;
}

type AudioCleanupResponse = Response & {
  [SUBMITTED_AUDIO_CLEANUP]?: SubmittedAudioCleanup;
};

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
  if (cleanup.preserve) return Promise.resolve();

  cleanup.finalizing = (async () => {
    // A conflict/rate refusal is not definitive: an owner may be processing
    // before it can insert the shared claim under DB-pool saturation. Every
    // 5xx is likewise retryable by contract (including provider/storage 502
    // and 504). For an unfinished request, its idempotency row is abandoned
    // so the client re-posts this exact key. Deleting in that window races a blind same-key retry:
    // the retry can re-claim between the ownership read and DeleteObject, then
    // lose its audio to that late delete. Retain instead; the mandatory bucket
    // lifecycle bounds the transient object exactly as it already does for
    // 409/429.
    if (res.statusCode === 409 || res.statusCode === 429 || res.statusCode >= 500) {
      return;
    }
    // A duplicate can be stopped before claimAssessmentRequest (for example by
    // the assessment limiter). Consult the shared claim table before deleting:
    // preserve while this request's own claim is still processing, and also
    // while ANY non-expired processing claim for this user references the same
    // object — a duplicate submitted under a different (or malformed)
    // requestId, or a blind same-key retry that re-claimed before a failed
    // request's post-response delete landed, must never delete the object out
    // from under its live owner.
    try {
      if (cleanup.requestId && (await isAssessmentRequestProcessing(cleanup.userId, cleanup.requestId))) {
        return;
      }
      if (await isAudioKeyClaimedForProcessing(cleanup.userId, cleanup.audioKey)) {
        return;
      }
    } catch (err) {
      // Fail closed for data safety: retain transient audio when ownership
      // cannot be established. The required bucket lifecycle bounds storage.
      logger.warn({ err, userId: cleanup.userId }, 'failed to verify S3 audio cleanup ownership');
      return;
    }
    await discardPresignedAudio(cleanup.userId, cleanup.audioKey);
  })();
  return cleanup.finalizing;
}

/**
 * Register exactly one best-effort deletion before assessment body validation.
 * This covers malformed requests, idempotent replays, state/authorization
 * failures, missing objects, and successful/provider-error retention decisions
 * without racing route cleanup.
 */
export const discardSubmittedPresignedAudio: RequestHandler = (rawReq, res, next) => {
  const req = rawReq as AuthedRequest;
  const body = req.body as { audioKey?: unknown; requestId?: unknown } | undefined;
  if (!body || !req.user) {
    return next();
  }
  const audioKey = body.audioKey;
  if (typeof audioKey !== 'string' || !isOwnedAudioKey(req.user.id, audioKey)) {
    return next();
  }

  const requestId = z.string().uuid().optional().catch(undefined).parse(body.requestId);
  (res as AudioCleanupResponse)[SUBMITTED_AUDIO_CLEANUP] = {
    userId: req.user.id,
    audioKey,
    requestId,
    preserve: false,
  };
  // Finalize on a microtask so synchronous finish listeners can mark a
  // pre-route 409/429 as non-definitive before ownership is evaluated. An
  // error after a client abort intentionally retains the object (no `finish`
  // fires): that is the same-key retry window, bounded by the bucket lifecycle.
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
    if (!object.Body) throw new HttpError(400, 'audio upload not found or expired');
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
      throw new HttpError(400, 'audio upload not found or expired');
    }
    // A filesystem syscall failure (ENOSPC/EFBIG/EMFILE/EACCES from the temp-file
    // write stream or chmod) is a local disk fault, not an S3 outage: plain 500
    // with a distinct log line. AWS SDK errors carry $metadata and keep the
    // 502, and so does every transport errno the download stream can raise.
    const systemError = err as NodeJS.ErrnoException & { $metadata?: unknown };
    if (
      systemError.$metadata === undefined &&
      typeof systemError.code === 'string' &&
      LOCAL_DISK_ERROR_CODES.has(systemError.code)
    ) {
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
