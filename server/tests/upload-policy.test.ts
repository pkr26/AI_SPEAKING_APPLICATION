import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const multerMocks = vi.hoisted(() => ({
  factory: vi.fn(),
  single: vi.fn(),
}));

vi.mock('multer', () => ({
  default: Object.assign(multerMocks.factory, {
    MulterError: class MockMulterError extends Error {},
  }),
}));

// This test exercises upload.ts's static policy only. Keeping the middleware
// dependency small avoids creating an unrelated PostgreSQL pool and Prometheus
// registry when the module is deliberately reloaded under a static mutant.
vi.mock('../src/middleware', () => ({
  HttpError: class MockHttpError extends Error {
    constructor(
      public status: number,
      message: string,
      public code?: string,
    ) {
      super(message);
    }
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  multerMocks.factory.mockReset();
  multerMocks.single.mockReset();
});

describe('upload static security policy', () => {
  it('initializes the exact private-storage, MIME, size, and multipart policy at runtime', async () => {
    const expectedUploadsDir = path.join(__dirname, '..', 'uploads');
    const mkdir = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as never);
    const chmod = vi.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);
    multerMocks.single.mockReturnValue(vi.fn());
    multerMocks.factory.mockImplementation((options: Record<string, unknown>) => ({
      ...options,
      single: multerMocks.single,
    }));

    // Static mutants are activated after Vitest collects top-level imports.
    // Reloading only from inside the test makes those policy initializers
    // observable without repeating the 25 MiB end-to-end boundary test.
    vi.resetModules();
    const { AUDIO_TYPES, MAX_AUDIO_BYTES, upload, uploadsDir } = await import('../src/upload');

    expect(uploadsDir).toBe(expectedUploadsDir);
    expect(mkdir).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledWith(expectedUploadsDir, { recursive: true, mode: 0o700 });
    expect(chmod).toHaveBeenCalledOnce();
    expect(chmod).toHaveBeenCalledWith(expectedUploadsDir, 0o700);
    expect(MAX_AUDIO_BYTES).toBe(25 * 1024 * 1024);
    expect(AUDIO_TYPES).toEqual({
      '.m4a': ['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'video/mp4'],
      '.mp4': ['audio/mp4', 'video/mp4'],
      '.mp3': ['audio/mpeg', 'audio/mp3'],
      '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
      '.ogg': ['audio/ogg', 'application/ogg'],
      '.oga': ['audio/ogg', 'application/ogg'],
      '.webm': ['audio/webm', 'video/webm'],
      '.flac': ['audio/flac', 'audio/x-flac'],
    });

    expect(multerMocks.factory).toHaveBeenCalledOnce();
    const options = multerMocks.factory.mock.calls[0][0] as {
      storage: Record<string, unknown>;
      limits: Record<string, number>;
      fileFilter: unknown;
    };
    expect(options.storage).toEqual({
      _handleFile: expect.any(Function),
      _removeFile: expect.any(Function),
    });
    expect(options.limits).toEqual({
      fileSize: 25 * 1024 * 1024 + 1,
      files: 1,
      fields: 4,
      parts: 6,
      fieldNameSize: 64,
      fieldSize: 128,
      headerPairs: 50,
    });
    expect(options.fileFilter).toEqual(expect.any(Function));
    expect(upload).toMatchObject({ single: multerMocks.single });
    expect(multerMocks.single).toHaveBeenCalledOnce();
    expect(multerMocks.single).toHaveBeenCalledWith('audio');
  });
});
