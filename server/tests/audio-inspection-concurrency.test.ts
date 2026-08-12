import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
});

import { assertAudioInspectorAvailable, verifyAudioDuration } from '../src/audio-inspection';
import { config } from '../src/config';
import { uploadsDir } from '../src/upload';

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  killed = false;
  kill = vi.fn(() => {
    this.killed = true;
    return true;
  });
}

const originalMaxConcurrency = config.audioInspectionMaxConcurrency;
let filePath: string;

function startInspection(child = new FakeChild()) {
  spawnMock.mockReturnValueOnce(child);
  return { child, result: verifyAudioDuration(filePath) };
}

function completeSuccessfully(child: FakeChild): void {
  child.stdout.emit('data', Buffer.from('out_time_us=1000000\n'));
  child.emit('close', 0);
}

async function proveNextSlotIsUsable(): Promise<void> {
  const { child, result } = startInspection();
  completeSuccessfully(child);
  await expect(result).resolves.toBe(true);
}

beforeEach(async () => {
  spawnMock.mockReset();
  config.audioInspectionMaxConcurrency = 1;
  filePath = path.join(uploadsDir, `${randomUUID()}.wav`);
  await fs.writeFile(filePath, 'private test media', { mode: 0o600 });
});

afterEach(async () => {
  vi.useRealTimers();
  config.audioInspectionMaxConcurrency = originalMaxConcurrency;
  await fs.unlink(filePath).catch(() => undefined);
});

describe('audio inspection concurrency', () => {
  it('fails fast before spawn at capacity and releases the slot after success', async () => {
    const first = startInspection();

    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({
      status: 503,
      message: 'Audio inspection capacity busy',
      extra: { retryAfterSeconds: 2 },
    });
    expect(spawnMock).toHaveBeenCalledOnce();

    completeSuccessfully(first.child);
    await expect(first.result).resolves.toBe(true);
    await proveNextSlotIsUsable();
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('releases the slot after a synchronous spawn failure', async () => {
    spawnMock.mockImplementationOnce(() => {
      throw new Error('spawn failed');
    });
    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 503 });
    await proveNextSlotIsUsable();
  });

  it('releases the slot after a child-process error', async () => {
    const failed = startInspection();
    failed.child.emit('error', new Error('child error'));
    await expect(failed.result).rejects.toMatchObject({ status: 503 });
    await proveNextSlotIsUsable();
  });

  it('releases the slot after a nonzero decoder exit', async () => {
    const failed = startInspection();
    failed.child.emit('close', 1);
    await expect(failed.result).rejects.toMatchObject({ status: 415 });
    await proveNextSlotIsUsable();
  });

  it('kills a timed-out decoder, settles immediately, and releases its slot', async () => {
    vi.useFakeTimers();
    const timedOut = startInspection();
    const rejection = expect(timedOut.result).rejects.toMatchObject({ status: 415 });

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
});
