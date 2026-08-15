import express from 'express';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware';
import { upload, uploadAudio, uploadsDir } from '../src/upload';

describe('upload storage', () => {
  it('creates accepted audio with private permissions and an allowlisted extension', async () => {
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const a = express();
    a.post('/upload', upload.single('audio'), async (req, res) => {
      const file = req.file!;
      const stat = await fs.stat(file.path);
      await fs.unlink(file.path);
      res.json({ filename: file.filename, mode: stat.mode & 0o777 });
    });

    const before = (await fs.readdir(uploadsDir)).sort();
    try {
      const result = await request(a)
        .post('/upload')
        .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
          filename: 'answer.m4a',
          contentType: 'audio/mp4',
        });

      expect(result.status).toBe(200);
      expect(result.body.mode).toBe(0o600);
      expect(result.body.filename).toMatch(/^[0-9a-f-]{36}\.m4a$/);
      expect(createWriteStream).toHaveBeenCalledWith(expect.stringMatching(/\.m4a$/), {
        flags: 'wx',
        mode: 0o600,
      });
      expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
    } finally {
      createWriteStream.mockRestore();
    }
  });

  it('accepts exactly 25 MiB and rejects the first byte above the multipart limit without residue', async () => {
    const a = express();
    let exactFilename: string | undefined;
    a.post('/upload', uploadAudio, (req, res) => {
      exactFilename = req.file!.filename;
      res.json({ size: req.file!.size });
    });
    a.use(errorHandler);
    const before = (await fs.readdir(uploadsDir)).sort();
    const maxBytes = 25 * 1024 * 1024;

    try {
      const exact = await request(a)
        .post('/upload')
        .attach('audio', Buffer.alloc(maxBytes, 0x61), { filename: 'answer.m4a', contentType: 'audio/mp4' });
      expect(exact.status).toBe(200);
      expect(exact.body.size).toBe(maxBytes);

      const oversized = await request(a)
        .post('/upload')
        .attach('audio', Buffer.alloc(maxBytes + 1, 0x61), { filename: 'answer.m4a', contentType: 'audio/mp4' });
      expect(oversized.status).toBe(413);
      expect(oversized.body).toEqual({ error: 'File too large (max 25MB)', code: 'AUDIO_TOO_LARGE' });
      expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
    } finally {
      if (exactFilename) await fs.rm(path.join(uploadsDir, exactFilename), { force: true });
    }
  }, 30_000);
});
