import { randomUUID } from 'crypto';
import express from 'express';
import fsSync from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { Writable } from 'stream';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware';
import {
  cleanupOldUploads,
  cleanupOldUploadsInDirectory,
  upload,
  uploadAudio,
  uploadsDir,
  verifyAudioMagicBytes,
} from '../src/upload';

const FTYP = Buffer.from('00000018667479704d34412000000000', 'hex'); // ISO BMFF
const WAV = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WAVEfmt ')]);
const ID3 = Buffer.concat([Buffer.from('ID3'), Buffer.from([4, 0, 0, 0, 0, 0, 0, 0, 0])]);
const MP3_FRAME = Buffer.from([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4, 5, 6, 7, 8]);
const ADTS = Buffer.from([0xff, 0xf1, 0x50, 0x80, 1, 2, 3, 4, 5, 6, 7, 8]);
const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(8)]);
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x93, 0x42, 0x82, 0x88]);
const FLAC = Buffer.concat([Buffer.from('fLaC'), Buffer.alloc(8)]);

async function writeUpload(name: string, content: Buffer): Promise<string> {
  const filePath = path.join(uploadsDir, `${randomUUID()}-${name}`);
  await fs.writeFile(filePath, content);
  return filePath;
}

async function exists(filePath: string): Promise<boolean> {
  return fs.stat(filePath).then(
    () => true,
    () => false,
  );
}

describe('verifyAudioMagicBytes', () => {
  const valid: Array<[string, Buffer]> = [
    ['a.m4a', FTYP],
    ['a.mp4', FTYP],
    ['a.wav', WAV],
    ['a.mp3', ID3],
    ['a.mp3', MP3_FRAME],
    ['a.ogg', OGG],
    ['a.oga', OGG],
    ['a.webm', WEBM],
    ['a.flac', FLAC],
  ];

  it.each(valid)('accepts %s with its matching container signature', async (name, content) => {
    const filePath = await writeUpload(name, content);
    await expect(verifyAudioMagicBytes(filePath)).resolves.toBe(true);
    await fs.unlink(filePath);
  });

  const invalid: Array<[string, Buffer, string]> = [
    // Truncated below each signature's minimum length.
    ['a.m4a', FTYP.subarray(0, 7), 'shorter than the ftyp box'],
    ['a.wav', WAV.subarray(0, 11), 'shorter than RIFF....WAVE'],
    ['a.mp3', Buffer.from('ID'), 'shorter than an ID3 header'],
    ['a.ogg', Buffer.from('Ogg'), 'shorter than OggS'],
    ['a.webm', WEBM.subarray(0, 3), 'shorter than the EBML magic'],
    ['a.flac', Buffer.from('fLa'), 'shorter than fLaC'],
    // Corrupted signatures.
    ['a.m4a', Buffer.concat([Buffer.alloc(4), Buffer.from('ftYp'), Buffer.alloc(4)]), 'wrong box name'],
    ['a.wav', Buffer.concat([Buffer.from('RIFX'), Buffer.alloc(4), Buffer.from('WAVE')]), 'not a RIFF container'],
    ['a.wav', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVX')]), 'not a WAVE form type'],
    ['a.mp3', Buffer.from([0x00, 0xfb, 0x90, 0x00, 1, 2, 3, 4, 5, 6, 7, 8]), 'frame sync without 0xff'],
    ['a.mp3', Buffer.from([0xff, 0x1f, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'frame sync without the 0xe0 mask'],
    ['a.m4b', FTYP, 'unsupported audiobook extension'],
    ['a.aac', ADTS, 'unsupported raw AAC extension'],
    ['a.webm', Buffer.from([0x1b, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]), 'wrong EBML first byte'],
    ['a.webm', Buffer.from([0x1a, 0x46, 0xdf, 0xa3, 0, 0, 0, 0]), 'wrong EBML second byte'],
    ['a.webm', Buffer.from([0x1a, 0x45, 0xde, 0xa3, 0, 0, 0, 0]), 'wrong EBML third byte'],
    ['a.webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa4, 0, 0, 0, 0]), 'wrong EBML fourth byte'],
    ['a.flac', Buffer.from('flac-is-lowercase'), 'lowercase fLaC'],
    // Extension/signature mismatches: a valid signature for the WRONG container.
    ['a.wav', FTYP, 'ISO BMFF bytes in a .wav'],
    ['a.mp3', OGG, 'OggS bytes in a .mp3'],
    ['a.aac', ID3, 'ID3 is only valid for .mp3, not .aac'],
    ['a.ogg', MP3_FRAME, 'MPEG frame sync in a .ogg'],
    ['a.webm', FLAC, 'fLaC bytes in a .webm'],
    ['a.flac', FTYP, 'ISO BMFF bytes in a .flac'],
    ['a.m4a', Buffer.from('plain text, not audio'), 'no signature at all'],
    ['a.mp3', Buffer.alloc(0), 'empty file'],
  ];

  it.each(invalid)('rejects %s (%s) with 415 and deletes the file', async (name, content) => {
    const filePath = await writeUpload(name, content);
    await expect(verifyAudioMagicBytes(filePath)).rejects.toMatchObject({
      status: 415,
      message: 'Invalid audio file',
    });
    expect(await exists(filePath)).toBe(false);
  });

  const containerFamilies: Array<[string, Buffer, string[]]> = [
    ['ISO BMFF', FTYP, ['m4a', 'mp4']],
    ['WAV', WAV, ['wav']],
    ['ID3-tagged MP3', ID3, ['mp3']],
    ['MPEG-frame MP3', MP3_FRAME, ['mp3']],
    ['Ogg', OGG, ['ogg', 'oga']],
    ['WebM', WEBM, ['webm']],
    ['FLAC', FLAC, ['flac']],
  ];
  const supportedExtensions = ['m4a', 'mp4', 'wav', 'mp3', 'ogg', 'oga', 'webm', 'flac'];
  const crossContainerCases = containerFamilies.flatMap(([family, signature, matchingExtensions]) =>
    supportedExtensions
      .filter((extension) => !matchingExtensions.includes(extension))
      .map((extension) => [family, signature, extension] as const),
  );

  it.each(crossContainerCases)(
    'rejects a real %s signature stored under the incompatible .%s extension',
    async (_family, signature, extension) => {
      const filePath = await writeUpload(`cross-container.${extension}`, signature);
      await expect(verifyAudioMagicBytes(filePath)).rejects.toMatchObject({ status: 415 });
      expect(await exists(filePath)).toBe(false);
    },
  );

  it('closes the private file descriptor when reading its header fails', async () => {
    const readFailure = new Error('read failed');
    const close = vi.fn().mockResolvedValue(undefined);
    const open = vi.spyOn(fs, 'open').mockResolvedValueOnce({
      read: vi.fn().mockRejectedValue(readFailure),
      close,
    } as never);
    try {
      await expect(verifyAudioMagicBytes('/private/unreadable.wav')).rejects.toBe(readFailure);
      expect(close).toHaveBeenCalledOnce();
    } finally {
      open.mockRestore();
    }
  });
});

describe('upload fileFilter extension/MIME matrix', () => {
  function buildApp() {
    const a = express();
    a.post('/upload', upload.single('audio'), (req, res) => {
      res.json({ filename: req.file!.filename });
    });
    a.use(errorHandler);
    return a;
  }

  const accepted: Array<[string, string]> = [
    ['answer.m4a', 'audio/mp4'],
    ['answer.M4A', 'audio/mp4'], // extension is lowercased
    ['answer.mp3', 'AUDIO/MPEG'], // MIME is lowercased
    ['answer.oga', 'application/ogg'],
    ['answer.webm', 'video/webm'],
    ['answer.flac', 'audio/x-flac'],
  ];

  it('keeps strict multipart resource limits and only one byte of boundary headroom', () => {
    expect((upload as unknown as { limits: Record<string, number> }).limits).toEqual({
      // Multer/Busboy raises LIMIT_FILE_SIZE when its stream reaches the
      // configured value, so 25 MiB + 1 implements a public inclusive 25 MiB
      // maximum without permitting any additional payload byte.
      fileSize: 25 * 1024 * 1024 + 1,
      files: 1,
      fields: 2,
      parts: 4,
      fieldNameSize: 64,
      fieldSize: 128,
      headerPairs: 50,
    });
  });

  it.each(accepted)('accepts %s as %s', async (filename, contentType) => {
    const res = await request(buildApp()).post('/upload').attach('audio', FTYP, { filename, contentType });
    expect(res.status).toBe(200);
    expect(path.extname(res.body.filename)).toBe(path.extname(filename).toLowerCase());
    if (res.status === 200) await fs.unlink(path.join(uploadsDir, res.body.filename));
  });

  const rejected: Array<[string, string]> = [
    ['answer.m4a', 'audio/mpeg'], // MIME not allowlisted for .m4a
    ['answer.mp3', 'audio/mp4'], // MIME not allowlisted for .mp3
    ['answer.txt', 'audio/mp4'], // extension not allowlisted
    ['answer', 'audio/mp4'], // no extension
    ['answer.wav.exe', 'audio/wav'], // final extension wins
    ['answer.m4b', 'audio/mp4'], // not accepted by the transcription provider
    ['answer.aac', 'audio/aac'], // raw AAC is not accepted by the transcription provider
  ];

  it.each(rejected)('rejects %s as %s with 415', async (filename, contentType) => {
    const res = await request(buildApp()).post('/upload').attach('audio', FTYP, { filename, contentType });
    expect(res.status).toBe(415);
    expect(res.body.error).toBe('Unsupported audio filename or media type');
  });
});

describe('uploadAudio cleanup', () => {
  it('propagates an output-stream failure exactly once and attempts to remove the partial file', async () => {
    const outputFailure = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream').mockImplementationOnce(() => {
      const output = new Writable({
        write(_chunk, _encoding, callback) {
          callback(outputFailure);
        },
      });
      return output as unknown as fsSync.WriteStream;
    });
    const unlink = vi.spyOn(fsSync, 'unlink');
    const a = express();
    a.post('/upload', uploadAudio, (_req, res) => res.json({ ok: true }));
    a.use(errorHandler);

    try {
      const res = await request(a)
        .post('/upload')
        .attach('audio', FTYP, { filename: 'answer.m4a', contentType: 'audio/mp4' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(unlink).toHaveBeenCalledOnce();
    } finally {
      createWriteStream.mockRestore();
      unlink.mockRestore();
    }
  });

  it('removes the upload and propagates a failure to enforce mode 0600', async () => {
    const before = (await fs.readdir(uploadsDir)).sort();
    const chmodFailure = Object.assign(new Error('chmod failed'), { code: 'EIO' });
    const chmod = vi.spyOn(fsSync, 'chmodSync').mockImplementationOnce(() => {
      throw chmodFailure;
    });
    const a = express();
    a.post('/upload', uploadAudio, (_req, res) => res.json({ ok: true }));
    a.use(errorHandler);

    try {
      const res = await request(a)
        .post('/upload')
        .attach('audio', FTYP, { filename: 'answer.m4a', contentType: 'audio/mp4' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
    } finally {
      chmod.mockRestore();
    }
  });

  it('deletes the stored file once the response finishes', async () => {
    const a = express();
    a.post('/upload', uploadAudio, (req, res) => {
      res.json({ path: req.file!.path });
    });
    a.use(errorHandler);

    const res = await request(a)
      .post('/upload')
      .attach('audio', FTYP, { filename: 'answer.m4a', contentType: 'audio/mp4' });
    expect(res.status).toBe(200);
    expect(await exists(res.body.path)).toBe(false);
  });

  it('tolerates the file already being gone (ENOENT) during cleanup', async () => {
    const a = express();
    a.post('/upload', uploadAudio, (req, res) => {
      // The route consumed and deleted the file itself; response-finish
      // cleanup must not turn that into a 500.
      fs.unlink(req.file!.path)
        .catch(() => {})
        .then(() => res.json({ ok: true }));
    });
    a.use(errorHandler);

    const res = await request(a)
      .post('/upload')
      .attach('audio', FTYP, { filename: 'answer.m4a', contentType: 'audio/mp4' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('uses mode 0600 and unlinks the file only once across response events', async () => {
    const unlinkSync = vi.spyOn(fsSync, 'unlinkSync');
    const a = express();
    a.post('/upload', uploadAudio, (req, res) => {
      res.json({ path: req.file!.path, mode: fsSync.statSync(req.file!.path).mode & 0o777 });
    });
    a.use(errorHandler);

    try {
      const res = await request(a)
        .post('/upload')
        .attach('audio', FTYP, { filename: 'answer.m4a', contentType: 'audio/mp4' });
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe(0o600);
      expect(unlinkSync.mock.calls.filter(([filePath]) => filePath === res.body.path)).toHaveLength(1);
    } finally {
      unlinkSync.mockRestore();
    }
  });
});

describe('cleanupOldUploads', () => {
  it('uses a one-hour default retention boundary', async () => {
    const now = Math.floor(Date.now() / 1_000) * 1_000;
    const oldFile = path.join(uploadsDir, `${randomUUID()}-default-old.m4a`);
    const recentFile = path.join(uploadsDir, `${randomUUID()}-default-recent.m4a`);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      await Promise.all([fs.writeFile(oldFile, FTYP), fs.writeFile(recentFile, FTYP)]);
      await Promise.all([
        fs.utimes(oldFile, (now - 61 * 60 * 1_000) / 1_000, (now - 61 * 60 * 1_000) / 1_000),
        fs.utimes(recentFile, (now - 59 * 60 * 1_000) / 1_000, (now - 59 * 60 * 1_000) / 1_000),
      ]);

      await cleanupOldUploads();
      await expect(fs.stat(oldFile)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(fs.stat(recentFile)).resolves.toBeDefined();
    } finally {
      nowSpy.mockRestore();
      await Promise.all([fs.rm(oldFile, { force: true }), fs.rm(recentFile, { force: true })]);
    }
  });

  it('removes only regular files strictly older than the cutoff', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-english-upload-janitor-'));
    // Align to a whole second so filesystems with coarser timestamp precision
    // can represent the exact-cutoff boundary without rounding it downward.
    const now = Math.floor(Date.now() / 1_000) * 1_000;
    const oldFile = path.join(directory, 'old.m4a');
    const exactCutoff = path.join(directory, 'exact.m4a');
    const recentFile = path.join(directory, 'recent.m4a');
    const oldDirectory = path.join(directory, 'nested');
    const brokenLink = path.join(directory, 'broken.m4a');
    try {
      await Promise.all([
        fs.writeFile(oldFile, FTYP),
        fs.writeFile(exactCutoff, FTYP),
        fs.writeFile(recentFile, FTYP),
        fs.mkdir(oldDirectory),
      ]);
      await Promise.all([
        fs.utimes(oldFile, (now - 1_001) / 1_000, (now - 1_001) / 1_000),
        fs.utimes(exactCutoff, (now - 1_000) / 1_000, (now - 1_000) / 1_000),
        fs.utimes(recentFile, now / 1_000, now / 1_000),
        fs.utimes(oldDirectory, (now - 2_000) / 1_000, (now - 2_000) / 1_000),
      ]);
      await fs.symlink(path.join(directory, 'missing-target'), brokenLink);

      await expect(cleanupOldUploadsInDirectory(directory, 1_000, now)).resolves.toBe(1);
      await expect(fs.stat(oldFile)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(fs.stat(exactCutoff)).resolves.toBeDefined();
      await expect(fs.stat(recentFile)).resolves.toBeDefined();
      await expect(fs.stat(oldDirectory)).resolves.toMatchObject({});
      await expect(fs.lstat(brokenLink)).resolves.toBeDefined();
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('treats a missing upload directory as empty', async () => {
    const missing = path.join(os.tmpdir(), `missing-ai-english-uploads-${randomUUID()}`);
    await expect(cleanupOldUploadsInDirectory(missing, 1_000, Date.now())).resolves.toBe(0);
  });

  it('surfaces an unreadable upload directory so the caller can alert', async () => {
    const failure = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    const readdir = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(failure);
    try {
      await expect(cleanupOldUploads(1_000)).rejects.toBe(failure);
    } finally {
      readdir.mockRestore();
    }
  });

  it('does not report a file as removed when unlinking fails', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-english-upload-janitor-'));
    const filePath = path.join(directory, 'locked.m4a');
    const now = Math.floor(Date.now() / 1_000) * 1_000;
    await fs.writeFile(filePath, FTYP);
    await fs.utimes(filePath, (now - 2_000) / 1_000, (now - 2_000) / 1_000);
    const unlink = vi.spyOn(fs, 'unlink').mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'EBUSY' }));
    try {
      await expect(cleanupOldUploadsInDirectory(directory, 1_000, now)).resolves.toBe(0);
      await expect(fs.stat(filePath)).resolves.toBeDefined();
    } finally {
      unlink.mockRestore();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
