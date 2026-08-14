import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const multipart = vi.hoisted(() => ({
  error: undefined as unknown,
  file: undefined as { path: string } | undefined,
}));

vi.mock('multer', () => ({
  default: vi.fn(() => ({
    single: vi.fn(() => (req: Request, _res: Response, callback: (error?: unknown) => void): void => {
      req.file = multipart.file as Express.Multer.File | undefined;
      callback(multipart.error);
    }),
  })),
}));

import { uploadAudio } from '../src/upload';

beforeEach(() => {
  multipart.error = undefined;
  multipart.file = undefined;
});

describe('upload response lifecycle cleanup', () => {
  it.each(['finish', 'close'] as const)('deletes the upload when the response emits only %s', async (event) => {
    const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'ai-english-upload-lifecycle-'));
    const filePath = path.join(directory, `${randomUUID()}.m4a`);
    await fsPromises.writeFile(filePath, 'audio');
    multipart.file = { path: filePath };
    const response = new EventEmitter() as unknown as Response;
    const next = vi.fn();

    try {
      uploadAudio({} as Request, response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(fs.existsSync(filePath)).toBe(true);
      response.emit(event);
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      await fsPromises.rm(directory, { recursive: true, force: true });
    }
  });
});
