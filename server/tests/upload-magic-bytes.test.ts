import { describe, expect, it } from 'vitest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { errorHandler } from '../src/middleware';
import { upload, uploadAudio, uploadsDir, verifyAudioMagicBytes } from '../src/upload';

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
    ['a.m4b', FTYP],
    ['a.mp4', FTYP],
    ['a.wav', WAV],
    ['a.mp3', ID3],
    ['a.mp3', MP3_FRAME],
    ['a.aac', ADTS],
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
    ['a.wav', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVX')]), 'not a WAVE form type'],
    ['a.mp3', Buffer.from([0xff, 0x1f, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'frame sync without the 0xe0 mask'],
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

  it.each(accepted)('accepts %s as %s', async (filename, contentType) => {
    const res = await request(buildApp()).post('/upload').attach('audio', FTYP, { filename, contentType });
    expect(res.status).toBe(200);
    if (res.status === 200) await fs.unlink(path.join(uploadsDir, res.body.filename));
  });

  const rejected: Array<[string, string]> = [
    ['answer.m4a', 'audio/mpeg'], // MIME not allowlisted for .m4a
    ['answer.mp3', 'audio/mp4'], // MIME not allowlisted for .mp3
    ['answer.txt', 'audio/mp4'], // extension not allowlisted
    ['answer', 'audio/mp4'], // no extension
    ['answer.wav.exe', 'audio/wav'], // final extension wins
  ];

  it.each(rejected)('rejects %s as %s with 415', async (filename, contentType) => {
    const res = await request(buildApp()).post('/upload').attach('audio', FTYP, { filename, contentType });
    expect(res.status).toBe(415);
    expect(res.body.error).toBe('Unsupported audio filename or media type');
  });
});

describe('uploadAudio cleanup', () => {
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
});
