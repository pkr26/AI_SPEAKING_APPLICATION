import { randomUUID } from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { RequestHandler, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { pipeline } from 'stream';
import { HttpError } from './middleware';

/** Private (0700) staging directory for direct multipart uploads and S3-mode downloads. */
export const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o700 });
fs.chmodSync(uploadsDir, 0o700);

/** Public 25 MiB audio ceiling, enforced identically by the S3 policy, download cap, and multipart limit. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** Extension → accepted MIME types; the single allowlist behind every extension/MIME gate and key check. */
export const AUDIO_TYPES: Readonly<Record<string, readonly string[]>> = {
  '.m4a': ['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'video/mp4'],
  '.mp4': ['audio/mp4', 'video/mp4'],
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
  '.ogg': ['audio/ogg', 'application/ogg'],
  '.oga': ['audio/ogg', 'application/ogg'],
  '.webm': ['audio/webm', 'video/webm'],
  '.flac': ['audio/flac', 'audio/x-flac'],
};

const AUDIO_EXTS = Object.keys(AUDIO_TYPES);

// Once the assessment runner takes responsibility for an uploaded file it may
// intentionally keep working after the client disconnects (for example, after
// a paid-capacity reservation commits). Response-level `close` cleanup must
// then defer to the runner's outer finally or it can unlink the file while the
// provider is still about to read it. A WeakSet avoids extending the response
// lifetime.
const ownedSubmittedAudioResponses = new WeakSet<Response>();

/** Hand this response's uploaded file to the assessment runner, deferring response-level close cleanup. */
export function ownSubmittedAudioFile(res: Response): void {
  ownedSubmittedAudioResponses.add(res);
}

/** Whether the assessment runner (rather than response teardown) owns this response's file. */
export function submittedAudioFileIsOwned(res: Response): boolean {
  return ownedSubmittedAudioResponses.has(res);
}

/**
 * Multer storage engine that stages each accepted part as a newly created
 * private file inside uploadsDir instead of multer's default destination.
 */
const privateDiskStorage: multer.StorageEngine = {
  /**
   * Store one multipart file under a fresh random UUID name — the allowlisted
   * extension when the client's is known, `.m4a` otherwise — opened with `wx`
   * so a generated name can never overwrite or append to an existing file.
   */
  _handleFile: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const ext = AUDIO_EXTS.includes(originalExt) ? originalExt : '.m4a';
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const out = fs.createWriteStream(filePath, { flags: 'wx', mode: 0o600 });

    // pipeline propagates failures from both the multipart input and private
    // output and invokes its callback exactly once, avoiding a partially
    // written file or competing error/finish callbacks.
    pipeline(file.stream, out, (error) => {
      if (error) {
        fs.unlink(filePath, () => cb(error));
        return;
      }
      cb(null, { destination: uploadsDir, filename, path: filePath, size: out.bytesWritten });
    });
  },
  /** Unlink one stored upload on multer's behalf. */
  _removeFile: (_req, file, cb) => {
    // A failed _handleFile can leave no stored path; fs.unlink(undefined)
    // throws synchronously and would escape multer's error handling.
    if (!file.path) return cb(null);
    fs.unlink(file.path, cb);
  },
};

/** Direct multipart engine: private disk storage, ingress limits, and the extension/MIME admission gate. */
export const upload = multer({
  storage: privateDiskStorage,
  limits: {
    // Busboy emits LIMIT_FILE_SIZE upon reaching (not exceeding) this value.
    // Set its stream threshold one byte above the public 25 MiB maximum so an
    // exact-cap upload is accepted while the first byte beyond it is rejected.
    fileSize: MAX_AUDIO_BYTES + 1,
    files: 1,
    // The current practice client carries questionId + requestId + durable
    // cycleId + the explicit recording-retention choice. Diagnostic still
    // rejects fields outside its narrower route schema after multipart
    // parsing. One audio file plus those four text fields is five MIME parts;
    // Busboy fires its limit event at equality, so the threshold needs one slot
    // of boundary-counting headroom.
    fields: 4,
    parts: 6,
    fieldNameSize: 64,
    fieldSize: 128,
    headerPairs: 50,
  },
  /** Reject any extension/MIME pair absent from AUDIO_TYPES before a byte is stored. */
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (ext in AUDIO_TYPES && mime && AUDIO_TYPES[ext].includes(mime)) {
      return cb(null, true);
    }
    cb(new HttpError(415, 'Unsupported audio filename or media type', 'AUDIO_INVALID'));
  },
});

const singleAudio = upload.single('audio');

/** Synchronous best-effort unlink used when an upload is rejected mid-flight. */
function unlinkUploadedFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Cleanup is best-effort here; the boot janitor is the final fallback.
  }
}

/**
 * Store one audio upload with private permissions and delete it when the
 * response finishes or the connection closes. Registering cleanup here (and
 * not only inside route handlers) also covers later validation middleware.
 */
export const uploadAudio: RequestHandler = (req, res, next) => {
  singleAudio(req, res, (err) => {
    const file = req.file;

    if (err) {
      if (file) unlinkUploadedFile(file.path);
      if (err instanceof multer.MulterError || err instanceof HttpError) {
        return next(err);
      }
      // Busboy reports multipart framing failures (missing boundary, truncated
      // form, malformed part header) as plain Errors — malformed client input
      // that must 400, never 500. Errors carrying a system errno (storage/IO
      // failures) remain genuine server errors.
      if ((err as NodeJS.ErrnoException).code) return next(err);
      return next(new HttpError(400, 'Malformed multipart body'));
    }

    if (file) {
      const filePath = file.path;
      try {
        fs.chmodSync(filePath, 0o600);
      } catch (chmodErr) {
        unlinkUploadedFile(filePath);
        return next(chmodErr);
      }

      let cleaned = false;
      const cleanupOnce = () => {
        if (cleaned) return;
        cleaned = true;
        unlinkUploadedFile(filePath);
      };
      res.once('finish', cleanupOnce);
      res.once('close', () => {
        if (!submittedAudioFileIsOwned(res)) cleanupOnce();
      });
    }

    return next();
  });
};

/**
 * Validate the actual file content against known audio magic numbers
 * (extension/mimetype checks alone are trivially spoofed). On mismatch the
 * file is deleted and a 415 is thrown. Returns true when the bytes look like
 * a supported audio container.
 */
export async function verifyAudioMagicBytes(filePath: string): Promise<true> {
  const handle = await fsPromises.open(filePath, 'r');
  let head: Buffer;
  try {
    head = Buffer.alloc(12);
    const { bytesRead } = await handle.read(head, 0, 12, 0);
    head = head.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }

  const ext = path.extname(filePath).toLowerCase();
  // Buffer string slices and indexed reads already fail closed when bytes are
  // absent, so separate length predicates add no security and create two
  // representations of each signature boundary that can drift apart.
  const isoBmff = head.toString('ascii', 4, 8) === 'ftyp';
  const wav = head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WAVE';
  const id3 = head.toString('ascii', 0, 3) === 'ID3';
  // ADTS/AAC begins with the same 11-bit sync word as an MPEG audio frame.
  // It is not an allowed `.mp3` container, so require the non-reserved MPEG
  // version and layer fields as well as a complete four-byte frame header.
  const mpegAudio =
    head.length >= 4 &&
    head[0] === 0xff &&
    (head[1] & 0xe0) === 0xe0 &&
    (head[1] & 0x18) !== 0x08 &&
    (head[1] & 0x06) !== 0;
  const ogg = head.toString('ascii', 0, 4) === 'OggS';
  const webm = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  const flac = head.toString('ascii', 0, 4) === 'fLaC';

  // The container signature must match the already allowlisted extension and
  // MIME pair. Merely finding *some* supported signature is not sufficient.
  const is =
    (['.m4a', '.mp4'].includes(ext) && isoBmff) ||
    (ext === '.wav' && wav) ||
    (ext === '.mp3' && (id3 || mpegAudio)) ||
    (['.ogg', '.oga'].includes(ext) && ogg) ||
    (ext === '.webm' && webm) ||
    (ext === '.flac' && flac);

  if (!is) {
    await fsPromises.unlink(filePath).catch(() => {});
    throw new HttpError(415, 'Invalid audio file', 'AUDIO_INVALID');
  }
  return true;
}

/**
 * Deterministic janitor core. Callers must supply a trusted directory; normal
 * application code should use cleanupOldUploads(), whose target is fixed.
 */
export async function cleanupOldUploadsInDirectory(directory: string, maxAgeMs: number, now: number): Promise<number> {
  const cutoff = now - maxAgeMs;
  let removed = 0;
  let entries: string[];
  try {
    entries = await fsPromises.readdir(directory);
  } catch (error) {
    // A missing directory is equivalent to having no orphaned uploads. Other
    // I/O failures must reach the caller so operations can alert on a janitor
    // that is unable to inspect its storage directory.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }
  for (const name of entries) {
    const full = path.join(directory, name);
    let stat: Awaited<ReturnType<typeof fsPromises.stat>>;
    try {
      stat = await fsPromises.stat(full);
    } catch {
      continue;
    }
    if (stat.isFile() && stat.mtimeMs < cutoff) {
      try {
        await fsPromises.unlink(full);
        removed++;
      } catch {
        // Best effort: a future janitor pass can retry transient failures.
      }
    }
  }
  return removed;
}

/** Boot-time janitor: drop orphaned uploads older than maxAgeMs (fire-and-forget). */
export async function cleanupOldUploads(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  return cleanupOldUploadsInDirectory(uploadsDir, maxAgeMs, Date.now());
}
