import { randomUUID } from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { HttpError } from './middleware';

export const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o700 });
fs.chmodSync(uploadsDir, 0o700);

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

const privateDiskStorage: multer.StorageEngine = {
  _handleFile: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname || '').toLowerCase();
    const ext = AUDIO_EXTS.includes(originalExt) ? originalExt : '.m4a';
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const out = fs.createWriteStream(filePath, { flags: 'wx', mode: 0o600 });

    file.stream.pipe(out);
    out.once('error', (err) => {
      fs.unlink(filePath, () => cb(err));
    });
    out.once('finish', () => {
      cb(null, { destination: uploadsDir, filename, path: filePath, size: out.bytesWritten });
    });
  },
  _removeFile: (_req, file, cb) => {
    fs.unlink(file.path, cb);
  },
};

export const upload = multer({
  storage: privateDiskStorage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
    fields: 2,
    parts: 4,
    fieldNameSize: 64,
    fieldSize: 128,
    headerPairs: 50,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = file.mimetype?.toLowerCase();
    if (ext in AUDIO_TYPES && mime && AUDIO_TYPES[ext].includes(mime)) {
      return cb(null, true);
    }
    cb(new HttpError(415, 'Unsupported audio filename or media type'));
  },
});

const singleAudio = upload.single('audio');

/**
 * Store one audio upload with private permissions and delete it when the
 * response finishes or the connection closes. Registering cleanup here (and
 * not only inside route handlers) also covers later validation middleware.
 */
export const uploadAudio: RequestHandler = (req, res, next) => {
  singleAudio(req, res, (err) => {
    const file = req.file;

    const unlink = () => {
      if (!file?.path) return;
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkErr) {
        if ((unlinkErr as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Cleanup is best-effort here; the boot janitor is the final fallback.
        }
      }
    };

    if (err) {
      unlink();
      return next(err);
    }

    if (file) {
      try {
        fs.chmodSync(file.path, 0o600);
      } catch (chmodErr) {
        unlink();
        return next(chmodErr);
      }

      let cleaned = false;
      const cleanupOnce = () => {
        if (cleaned) return;
        cleaned = true;
        unlink();
      };
      res.once('finish', cleanupOnce);
      res.once('close', cleanupOnce);
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
  const isoBmff = head.length >= 8 && head.toString('ascii', 4, 8) === 'ftyp';
  const wav = head.length >= 12 && head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WAVE';
  const id3 = head.length >= 3 && head.toString('ascii', 0, 3) === 'ID3';
  const mpegOrAdts = head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
  const ogg = head.length >= 4 && head.toString('ascii', 0, 4) === 'OggS';
  const webm = head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  const flac = head.length >= 4 && head.toString('ascii', 0, 4) === 'fLaC';

  // The container signature must match the already allowlisted extension and
  // MIME pair. Merely finding *some* supported signature is not sufficient.
  const is =
    (['.m4a', '.mp4'].includes(ext) && isoBmff) ||
    (ext === '.wav' && wav) ||
    (ext === '.mp3' && (id3 || mpegOrAdts)) ||
    (['.ogg', '.oga'].includes(ext) && ogg) ||
    (ext === '.webm' && webm) ||
    (ext === '.flac' && flac);

  if (!is) {
    await fsPromises.unlink(filePath).catch(() => {});
    throw new HttpError(415, 'Invalid audio file');
  }
  return true;
}

/** Boot-time janitor: drop orphaned uploads older than maxAgeMs (fire-and-forget). */
export async function cleanupOldUploads(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  const entries = await fsPromises.readdir(uploadsDir).catch(() => [] as string[]);
  for (const name of entries) {
    const full = path.join(uploadsDir, name);
    const stat = await fsPromises.stat(full).catch(() => null);
    if (stat && stat.isFile() && stat.mtimeMs < cutoff) {
      await fsPromises.unlink(full).catch(() => {});
      removed++;
    }
  }
  return removed;
}
