import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import nodeFs from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
});

import {
  assertAudioInspectorAvailable,
  buildAudioInspectorEnvironment,
  verifyAudioDuration,
} from '../src/audio-inspection';
import { config } from '../src/config';
import { uploadsDir } from '../src/upload';

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  killed = false;
  kill = vi.fn((_signal?: string) => {
    this.killed = true;
    return true;
  });
}

const originalMaxConcurrency = config.audioInspectionMaxConcurrency;
let filePath: string;
let activeChildren: FakeChild[];

function completeProbe(child: FakeChild, listing = '0\n'): void {
  child.stdout.emit('data', Buffer.from(listing));
  child.emit('close', 0);
}

async function startInspection(child = new FakeChild(), probeListing = '0\n') {
  const probe = new FakeChild();
  spawnMock.mockReturnValueOnce(probe);
  activeChildren.push(probe);
  // Attach a rejection observer immediately. Some mutants fail synchronously
  // after spawn; waiting until a later assertion to observe that promise makes
  // Node report an unhandled rejection and can crash the mutation worker.
  const result = verifyAudioDuration(filePath).then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  );
  // Probe listeners attach synchronously inside the spawn flow, so the probe
  // can settle immediately. Queue the decoder child only when the probe will
  // pass, so a rejected listing never leaves an unconsumed mock behind.
  completeProbe(probe, probeListing);
  if (probeListing === '0\n') {
    spawnMock.mockReturnValueOnce(child);
    activeChildren.push(child);
  }
  // The decoder then spawns in the following microtasks, which this flush
  // awaits before returning the decoder child.
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  return { child, probe, result };
}

function completeSuccessfully(child: FakeChild): void {
  // One second of mono 8 kHz signed 16-bit PCM.
  child.stdout.emit('data', Buffer.alloc(8_000 * 2));
  child.emit('close', 0);
}

async function proveNextSlotIsUsable(): Promise<void> {
  const { child, result } = await startInspection();
  completeSuccessfully(child);
  await expect(result).resolves.toEqual({ status: 'fulfilled', value: true });
}

beforeEach(async () => {
  spawnMock.mockReset();
  config.audioInspectionMaxConcurrency = 1;
  activeChildren = [];
  filePath = path.join(uploadsDir, `${randomUUID()}.wav`);
  await fs.writeFile(filePath, 'private test media', { mode: 0o600 });
});

afterEach(async () => {
  for (const child of activeChildren) {
    if (!child.killed) {
      child.kill('SIGKILL');
      child.emit('close', null);
    }
  }
  await Promise.resolve();
  vi.useRealTimers();
  config.audioInspectionMaxConcurrency = originalMaxConcurrency;
  await fs.unlink(filePath).catch(() => undefined);
});

describe('audio inspection concurrency', () => {
  it('builds a minimal native-process environment from an explicit allowlist', () => {
    expect(
      buildAudioInspectorEnvironment({
        PATH: '/trusted/bin',
        SystemRoot: 'C:\\Windows',
        DATABASE_URL: 'postgres://secret',
        JWT_SECRET: 'secret',
        OPENAI_API_KEY: 'secret',
        S3_SECRET_ACCESS_KEY: 'secret',
      }),
    ).toEqual({
      LANG: 'C',
      LC_ALL: 'C',
      PATH: '/trusted/bin',
      SystemRoot: 'C:\\Windows',
    });
    expect(buildAudioInspectorEnvironment({})).toEqual({ LANG: 'C', LC_ALL: 'C' });
  });

  it('spawns the decoder with only the private descriptor and bounded security options', async () => {
    const inspection = await startInspection();
    expect(spawnMock).toHaveBeenCalledTimes(2);
    const [probeExecutable, probeArgs, probeOptions] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { env: NodeJS.ProcessEnv; shell: boolean; stdio: unknown[]; windowsHide: boolean },
    ];
    expect(probeExecutable).toBe(config.ffprobePath);
    expect(probeArgs).toEqual([
      '-hide_banner',
      '-v',
      'error',
      '-probesize',
      String(5 * 1024 * 1024),
      '-analyzeduration',
      String(5 * 1_000_000),
      '-protocol_whitelist',
      'fd',
      '-format_whitelist',
      'wav',
      '-fd',
      '3',
      '-i',
      'fd:',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'default=nokey=1:noprint_wrappers=1',
    ]);
    expect(probeArgs).not.toContain(filePath);
    expect(probeOptions.stdio).toEqual(['ignore', 'pipe', 'pipe', expect.any(Number)]);

    const [executable, args, options] = spawnMock.mock.calls[1] as [
      string,
      string[],
      { env: NodeJS.ProcessEnv; shell: boolean; stdio: unknown[]; windowsHide: boolean },
    ];
    expect(executable).toBe(config.ffmpegPath);
    expect(args).toEqual([
      '-hide_banner',
      '-nostdin',
      '-v',
      'error',
      '-xerror',
      '-threads',
      '1',
      '-filter_threads',
      '1',
      '-max_alloc',
      String(32 * 1024 * 1024),
      '-probesize',
      String(5 * 1024 * 1024),
      '-analyzeduration',
      String(5 * 1_000_000),
      '-protocol_whitelist',
      'fd',
      '-format_whitelist',
      'wav',
      '-fd',
      '3',
      '-i',
      'fd:',
      '-map',
      '0:a?',
      '-vn',
      '-sn',
      '-dn',
      '-ac',
      '1',
      '-ar',
      '8000',
      '-c:a',
      'pcm_s16le',
      '-f',
      's16le',
      'pipe:1',
    ]);
    expect(args).not.toContain(filePath);
    expect(options).toMatchObject({
      env: buildAudioInspectorEnvironment(process.env),
      shell: false,
      windowsHide: true,
    });
    expect(options.stdio).toEqual(['ignore', 'pipe', 'pipe', expect.any(Number)]);
    expect(typeof options.stdio[3]).toBe('number');
    expect(options.env).not.toHaveProperty('DATABASE_URL');
    expect(options.env).not.toHaveProperty('JWT_SECRET');
    expect(options.env).not.toHaveProperty('OPENAI_API_KEY');
    expect(options.env).not.toHaveProperty('S3_SECRET_ACCESS_KEY');

    completeSuccessfully(inspection.child);
    await expect(inspection.result).resolves.toEqual({ status: 'fulfilled', value: true });
  });

  it('fails fast before spawn at capacity and releases the slot after success', async () => {
    const first = await startInspection();

    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({
      status: 503,
      message: 'Audio inspection capacity busy',
      extra: { retryAfterSeconds: 2 },
    });
    expect(spawnMock).toHaveBeenCalledTimes(2);

    completeSuccessfully(first.child);
    await expect(first.result).resolves.toEqual({ status: 'fulfilled', value: true });
    await proveNextSlotIsUsable();
    expect(spawnMock).toHaveBeenCalledTimes(4);
  });

  it('releases the slot after a synchronous spawn failure', async () => {
    spawnMock.mockImplementationOnce(() => {
      throw new Error('spawn failed');
    });
    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 503 });
    await proveNextSlotIsUsable();
  });

  it('does not close an unrelated descriptor when opening the private input fails', async () => {
    const open = vi.spyOn(nodeFs, 'openSync').mockImplementationOnce(() => {
      throw new Error('open failed');
    });
    const close = vi.spyOn(nodeFs, 'closeSync');
    try {
      await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 415 });
      expect(open).toHaveBeenCalledOnce();
      expect(close).not.toHaveBeenCalled();
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      open.mockRestore();
      close.mockRestore();
    }
    await proveNextSlotIsUsable();
  });

  it('releases the slot after a child-process error', async () => {
    const failed = await startInspection();
    failed.child.emit('error', new Error('child error'));
    await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 503 } });
    await proveNextSlotIsUsable();
  });

  it('rejects multi-track media on the probed stream count without decoding', async () => {
    // The multi-track invariant must not depend on muxer behavior (FFmpeg 8
    // errors on multi-stream s16le, 6.1 decodes it): the ffprobe count alone
    // fails the container closed and the decoder never spawns.
    const rejected = await startInspection(new FakeChild(), '0\n1\n');
    await expect(rejected.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    expect(spawnMock).toHaveBeenCalledOnce();
    await proveNextSlotIsUsable();
  });

  it('rejects an unparsable stream listing without decoding', async () => {
    const rejected = await startInspection(new FakeChild(), 'not-a-stream-index\n');
    await expect(rejected.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    expect(spawnMock).toHaveBeenCalledOnce();
    await proveNextSlotIsUsable();
  });

  it('maps a prober process error to unavailable without decoding', async () => {
    const probe = new FakeChild();
    spawnMock.mockReturnValueOnce(probe);
    activeChildren.push(probe);
    const result = verifyAudioDuration(filePath).then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    probe.emit('error', new Error('missing ffprobe'));
    await expect(result).resolves.toMatchObject({ status: 'rejected', reason: { status: 503 } });
    expect(spawnMock).toHaveBeenCalledOnce();
    await proveNextSlotIsUsable();
  });

  it('releases the slot after a nonzero decoder exit', async () => {
    const failed = await startInspection();
    failed.child.stdout.emit('data', Buffer.alloc(8_000 * 2));
    failed.child.emit('close', 1);
    await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    await proveNextSlotIsUsable();
  });

  it('adds MOV external-reference defenses for M4A without exposing the path', async () => {
    const originalPath = filePath;
    filePath = path.join(uploadsDir, `${randomUUID()}.m4a`);
    await fs.rename(originalPath, filePath);
    const inspection = await startInspection();
    // The decoder is the second spawn (the ffprobe stream count runs first).
    const [, args] = spawnMock.mock.calls[1] as [string, string[]];
    const formatIndex = args.indexOf('-format_whitelist');
    expect(args.slice(formatIndex, formatIndex + 12)).toEqual([
      '-format_whitelist',
      'mov',
      '-enable_drefs',
      '0',
      '-use_absolute_path',
      '0',
      // Edit lists are attacker-controlled presentation metadata: the gate must
      // decode the container's full audio payload, not a forged window of it.
      '-ignore_editlist',
      '1',
      '-fd',
      '3',
      '-i',
      'fd:',
    ]);
    expect(args).not.toContain(filePath);

    completeSuccessfully(inspection.child);
    await expect(inspection.result).resolves.toEqual({ status: 'fulfilled', value: true });
  });

  it('rejects a directory before spawning a native decoder', async () => {
    await fs.unlink(filePath);
    await fs.mkdir(filePath);
    try {
      await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 415 });
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      await fs.rmdir(filePath);
      await fs.writeFile(filePath, 'private test media', { mode: 0o600 });
    }
    await proveNextSlotIsUsable();
  });

  it('rejects an unsupported extension before native spawn and releases the slot', async () => {
    const supportedPath = filePath;
    const unsupportedPath = path.join(uploadsDir, `${randomUUID()}.txt`);
    await fs.rename(supportedPath, unsupportedPath);
    filePath = unsupportedPath;

    try {
      await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({
        status: 415,
        message: 'Invalid or unsupported audio file',
      });
      expect(spawnMock).not.toHaveBeenCalled();
    } finally {
      await fs.rename(unsupportedPath, supportedPath);
      filePath = supportedPath;
    }

    await proveNextSlotIsUsable();
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('closes each stage descriptor exactly once even when closeSync throws', async () => {
    const close = vi.spyOn(nodeFs, 'closeSync').mockImplementationOnce(() => {
      throw new Error('close failed');
    });
    try {
      const inspection = await startInspection();
      completeSuccessfully(inspection.child);
      await expect(inspection.result).resolves.toEqual({ status: 'fulfilled', value: true });
      // One close per stage (probe, decoder); the throwing first close is tolerated.
      expect(close).toHaveBeenCalledTimes(2);
    } finally {
      close.mockRestore();
    }
  });

  it('does not signal a decoder that is already marked as killed while settling', async () => {
    const failed = await startInspection();
    failed.child.killed = true;

    failed.child.stderr.emit('data', Buffer.alloc(64 * 1024 + 1));

    await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    expect(failed.child.kill).not.toHaveBeenCalled();
  });

  it('ignores repeated decoder terminal output after the first settlement', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    try {
      const failed = await startInspection();
      failed.child.stderr.emit('data', Buffer.alloc(64 * 1024 + 1));
      await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
      expect(failed.child.kill).toHaveBeenCalledTimes(1);
      const clearCallsAfterSettlement = clearTimeoutSpy.mock.calls.length;

      failed.child.stderr.emit('data', Buffer.from('late diagnostic output'));

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(clearCallsAfterSettlement);
      expect(failed.child.kill).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it('rejects diagnostic stderr only after the exact 64 KiB boundary is exceeded', async () => {
    const accepted = await startInspection();
    accepted.child.stderr.emit('data', Buffer.alloc(64 * 1024));
    completeSuccessfully(accepted.child);
    await expect(accepted.result).resolves.toEqual({ status: 'fulfilled', value: true });

    const rejected = await startInspection();
    rejected.child.stderr.emit('data', Buffer.alloc(64 * 1024 + 1));
    await expect(rejected.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    expect(rejected.child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it.each([
    ['no decoded samples', Buffer.alloc(0)],
    ['an incomplete signed 16-bit sample', Buffer.alloc(1)],
  ])('rejects %s and releases the slot', async (_caseName, decoded) => {
    const failed = await startInspection();
    if (decoded.length > 0) failed.child.stdout.emit('data', decoded);
    failed.child.emit('close', 0);
    await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });
    await proveNextSlotIsUsable();
  });

  it('kills and rejects decoded audio beyond the exact maximum', async () => {
    const failed = await startInspection();
    failed.child.stdout.emit('data', Buffer.alloc(Math.floor(120.5 * 8_000 * 2) + 1));
    expect(failed.child.kill).toHaveBeenCalledWith('SIGKILL');
    failed.child.emit('close', null);
    await expect(failed.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 413 } });
    await proveNextSlotIsUsable();
  });

  it('kills a timed-out decoder, settles immediately, and releases its slot', async () => {
    vi.useFakeTimers();
    const timedOut = await startInspection();
    const rejection = expect(timedOut.result).resolves.toMatchObject({ status: 'rejected', reason: { status: 415 } });

    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    expect(timedOut.child.kill).toHaveBeenCalledWith('SIGKILL');

    await proveNextSlotIsUsable();
  });
});

describe('audio inspector readiness coalescing', () => {
  it('coalesces concurrent probes, caches success, and allows startup to force a fresh check', async () => {
    const first = new FakeChild();
    spawnMock.mockReturnValueOnce(first);
    const concurrent = [
      assertAudioInspectorAvailable({ force: true }),
      assertAudioInspectorAvailable(),
      assertAudioInspectorAvailable(),
    ];
    expect(spawnMock).toHaveBeenCalledOnce();
    const [executable, args, options] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { env: NodeJS.ProcessEnv; shell: boolean; stdio: unknown[]; windowsHide: boolean },
    ];
    expect(executable).toBe(config.ffmpegPath);
    expect(args).toEqual(['-hide_banner', '-version']);
    expect(options).toEqual({
      env: buildAudioInspectorEnvironment(process.env),
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      shell: false,
    });
    first.stdout.emit('data', Buffer.from('ffmpeg version test-build\n'));
    first.emit('close', 0);
    await expect(Promise.all(concurrent)).resolves.toEqual([undefined, undefined, undefined]);

    await expect(assertAudioInspectorAvailable()).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledOnce();

    const forced = new FakeChild();
    spawnMock.mockReturnValueOnce(forced);
    const forcedCheck = assertAudioInspectorAvailable({ force: true });
    expect(spawnMock).toHaveBeenCalledTimes(2);
    forced.stdout.emit('data', Buffer.from('ffmpeg version test-build\n'));
    forced.emit('close', 0);
    await expect(forcedCheck).resolves.toBeUndefined();
  });

  it('coalesces failures and caches them briefly without another spawn', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const failed = new FakeChild();
    spawnMock.mockReturnValueOnce(failed);
    const concurrent = [assertAudioInspectorAvailable({ force: true }), assertAudioInspectorAvailable()];
    failed.emit('error', new Error('missing'));
    const results = await Promise.allSettled(concurrent);
    expect(results.every(({ status }) => status === 'rejected')).toBe(true);
    expect(spawnMock).toHaveBeenCalledOnce();

    await expect(assertAudioInspectorAvailable()).rejects.toThrow('FFmpeg is unavailable');
    expect(spawnMock).toHaveBeenCalledOnce();
  });

  it('expires both success and failure readiness caches at their exact TTLs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));

    const success = new FakeChild();
    spawnMock.mockReturnValueOnce(success);
    const successCheck = assertAudioInspectorAvailable({ force: true });
    success.stdout.emit('data', Buffer.from('ffmpeg version test-build\n'));
    success.emit('close', 0);
    await successCheck;

    await vi.advanceTimersByTimeAsync(29_999);
    await expect(assertAudioInspectorAvailable()).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    const failed = new FakeChild();
    spawnMock.mockReturnValueOnce(failed);
    const failedCheck = assertAudioInspectorAvailable();
    failed.emit('error', new Error('missing'));
    await expect(failedCheck).rejects.toThrow('FFmpeg is unavailable');
    expect(spawnMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_999);
    await expect(assertAudioInspectorAvailable()).rejects.toThrow('FFmpeg is unavailable');
    expect(spawnMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    const recovered = new FakeChild();
    spawnMock.mockReturnValueOnce(recovered);
    const recoveredCheck = assertAudioInspectorAvailable();
    recovered.stdout.emit('data', Buffer.from('ffmpeg version recovered\n'));
    recovered.emit('close', 0);
    await expect(recoveredCheck).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledTimes(3);
  });

  it('kills and rejects a readiness probe at the exact two-second deadline', async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    spawnMock.mockReturnValueOnce(child);
    const check = assertAudioInspectorAvailable({ force: true });
    const outcome = check.then(
      () => ({ status: 'fulfilled' as const }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );

    await vi.advanceTimersByTimeAsync(1_999);
    expect(child.kill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await expect(outcome).resolves.toMatchObject({
      status: 'rejected',
      reason: expect.objectContaining({ message: 'FFmpeg availability check timed out' }),
    });
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('normalizes a non-Error synchronous readiness failure', async () => {
    const nonErrorFailure: unknown = 'native spawn failed without an Error';
    spawnMock.mockImplementationOnce(() => {
      throw nonErrorFailure;
    });

    await expect(assertAudioInspectorAvailable({ force: true })).rejects.toThrow('FFmpeg is unavailable');
  });

  it('does not signal a readiness child that is already marked as killed while settling', async () => {
    const child = new FakeChild();
    child.killed = true;
    spawnMock.mockReturnValueOnce(child);
    const check = assertAudioInspectorAvailable({ force: true });
    child.stdout.emit('data', Buffer.from('ffmpeg version test-build\n'));
    child.emit('close', 0);

    await expect(check).resolves.toBeUndefined();
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('ignores repeated readiness output after the first settlement', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    try {
      const child = new FakeChild();
      spawnMock.mockReturnValueOnce(child);
      const check = assertAudioInspectorAvailable({ force: true });
      child.stdout.emit('data', Buffer.alloc(16 * 1024 + 1));
      await expect(check).rejects.toThrow('FFmpeg availability check returned unexpected output');
      expect(child.kill).toHaveBeenCalledTimes(1);
      const clearCallsAfterSettlement = clearTimeoutSpy.mock.calls.length;

      child.stdout.emit('data', Buffer.from('late version output'));

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(clearCallsAfterSettlement);
      expect(child.kill).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it.each([
    ['a successful exit without an FFmpeg version', Buffer.from('not the expected tool\n'), 0],
    ['an unsuccessful exit with an FFmpeg version', Buffer.from('ffmpeg version test-build\n'), 1],
    ['oversized version output', Buffer.alloc(16 * 1024 + 1, 0x78), 0],
  ])('rejects %s', async (_caseName, output, exitCode) => {
    const child = new FakeChild();
    spawnMock.mockReturnValueOnce(child);
    const check = assertAudioInspectorAvailable({ force: true });
    child.stdout.emit('data', output);
    child.emit('close', exitCode);
    await expect(check).rejects.toThrow();
  });

  it('accepts exactly 16 KiB of valid version output and rejects the first cumulative byte beyond it', async () => {
    const prefix = Buffer.from('ffmpeg version test-build\n');
    const exactOutput = Buffer.concat([prefix, Buffer.alloc(16 * 1024 - prefix.length, 0x78)]);
    const exact = new FakeChild();
    spawnMock.mockReturnValueOnce(exact);
    const exactCheck = assertAudioInspectorAvailable({ force: true });
    exact.stdout.emit('data', exactOutput.subarray(0, 9_000));
    exact.stdout.emit('data', exactOutput.subarray(9_000));
    exact.emit('close', 0);
    await expect(exactCheck).resolves.toBeUndefined();

    const oversized = new FakeChild();
    spawnMock.mockReturnValueOnce(oversized);
    const oversizedCheck = assertAudioInspectorAvailable({ force: true });
    oversized.stdout.emit('data', exactOutput.subarray(0, 9_000));
    oversized.stdout.emit('data', Buffer.concat([exactOutput.subarray(9_000), Buffer.from('x')]));
    await expect(oversizedCheck).rejects.toThrow('FFmpeg availability check returned unexpected output');
    expect(oversized.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('accepts multiple horizontal separators in the FFmpeg identity line', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValueOnce(child);
    const check = assertAudioInspectorAvailable({ force: true });
    child.stdout.emit('data', Buffer.from('ffmpeg version   test-build\n'));
    child.emit('close', 0);

    await expect(check).resolves.toBeUndefined();
  });

  it.each([
    ['an identity line after unrelated output', 'not ffmpeg\nffmpeg version test-build\n'],
    ['a version label without a build identifier', 'ffmpeg version\n'],
    ['a lookalike plural label', 'ffmpeg versions test-build\n'],
  ])('rejects %s', async (_caseName, output) => {
    const child = new FakeChild();
    spawnMock.mockReturnValueOnce(child);
    const check = assertAudioInspectorAvailable({ force: true });
    child.stdout.emit('data', Buffer.from(output));
    child.emit('close', 0);
    await expect(check).rejects.toThrow('FFmpeg is unavailable');
  });
});
