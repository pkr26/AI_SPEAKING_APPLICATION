import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const multipart = vi.hoisted(() => ({
  error: undefined as unknown,
  file: undefined as { path: string } | undefined,
}));

vi.mock('multer', () => {
  class MockMulterError extends Error {}
  const mockedMulter = Object.assign(
    vi.fn(() => ({
      single: vi.fn(() => (req: Request, _res: Response, callback: (error?: unknown) => void): void => {
        req.file = multipart.file as Express.Multer.File | undefined;
        callback(multipart.error);
      }),
    })),
    { MulterError: MockMulterError },
  );
  return { default: mockedMulter };
});

import { HttpError } from '../src/middleware';
import { ownSubmittedAudioFile, uploadAudio } from '../src/upload';

beforeEach(() => {
  multipart.error = undefined;
  multipart.file = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('upload response lifecycle cleanup', () => {
  it('continues without chmod or cleanup when a valid multipart body has no file', () => {
    const response = new EventEmitter() as unknown as Response;
    const next = vi.fn();
    const chmod = vi.spyOn(fs, 'chmodSync');
    const unlink = vi.spyOn(fs, 'unlinkSync');

    uploadAudio({} as Request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(chmod).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });

  it('maps a plain multipart framing failure to the exact safe 400 error without a file cleanup attempt', () => {
    const framingError = new Error('raw parser detail');
    multipart.error = framingError;
    const response = new EventEmitter() as unknown as Response;
    const next = vi.fn();
    const unlink = vi.spyOn(fs, 'unlinkSync');

    expect(() => uploadAudio({} as Request, response, next)).not.toThrow();

    expect(unlink).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    const forwarded = next.mock.calls[0][0] as HttpError;
    expect(forwarded).toBeInstanceOf(HttpError);
    expect(forwarded).toMatchObject({ status: 400, message: 'Malformed multipart body' });
  });

  it('deletes an attached file while preserving an uncoded HttpError from multipart handling', () => {
    const httpError = new HttpError(422, 'purposeful upload rejection');
    const filePath = path.join(os.tmpdir(), 'purposeful-upload-rejection.m4a');
    multipart.error = httpError;
    multipart.file = { path: filePath };
    const response = new EventEmitter() as unknown as Response;
    const next = vi.fn();
    const unlink = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

    uploadAudio({} as Request, response, next);

    expect(unlink).toHaveBeenCalledOnce();
    expect(unlink).toHaveBeenCalledWith(filePath);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(httpError);
  });

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

  it('defers close cleanup after the assessment runner takes ownership', async () => {
    const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'ai-english-upload-owned-'));
    const filePath = path.join(directory, `${randomUUID()}.m4a`);
    await fsPromises.writeFile(filePath, 'audio');
    multipart.file = { path: filePath };
    const response = new EventEmitter() as unknown as Response;
    const next = vi.fn();

    try {
      uploadAudio({} as Request, response, next);
      ownSubmittedAudioFile(response);

      response.emit('close');
      expect(fs.existsSync(filePath)).toBe(true);

      // A normal response completion is still a cleanup boundary. In the real
      // runner its outer finally normally removes the file first.
      response.emit('finish');
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      await fsPromises.rm(directory, { recursive: true, force: true });
    }
  });
});
