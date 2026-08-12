import express from 'express';
import fs from 'fs/promises';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { upload, uploadsDir } from '../src/upload';

describe('upload storage', () => {
  it('creates accepted audio with private permissions and an allowlisted extension', async () => {
    const a = express();
    a.post('/upload', upload.single('audio'), async (req, res) => {
      const file = req.file!;
      const stat = await fs.stat(file.path);
      await fs.unlink(file.path);
      res.json({ filename: file.filename, mode: stat.mode & 0o777 });
    });

    const before = (await fs.readdir(uploadsDir)).sort();
    const result = await request(a)
      .post('/upload')
      .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      });

    expect(result.status).toBe(200);
    expect(result.body.mode).toBe(0o600);
    expect(result.body.filename).toMatch(/^[0-9a-f-]{36}\.m4a$/);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
  });
});
