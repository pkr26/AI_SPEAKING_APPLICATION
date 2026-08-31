import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  accumulatePcmS16LeSignal,
  assertAudioInspectorAvailable,
  createPcmS16LeSignalAccumulator,
  hasAssessableAudioSignal,
  MAX_AUDIO_DURATION_SECONDS,
  MIN_AUDIO_PEAK_AMPLITUDE,
  MIN_AUDIO_RMS_AMPLITUDE,
  summarizePcmS16LeSignal,
  verifyAudioDuration,
} from '../src/audio-inspection';
import { config } from '../src/config';
import { AUDIO_TYPES, uploadsDir } from '../src/upload';

const files: string[] = [];
const runFile = promisify(execFile);
const configuredFfmpegPath = config.ffmpegPath;
const configuredFfprobePath = config.ffprobePath;
const supportedAudioFixtures = [
  ['M4A', 'supported.m4a', 'aac', undefined],
  ['MP4', 'supported.mp4', 'aac', undefined],
  ['MP3', 'supported.mp3', 'libmp3lame', undefined],
  ['WAV', 'supported.wav', 'pcm_s16le', undefined],
  ['OGG', 'supported.ogg', 'libopus', undefined],
  ['OGA', 'supported.oga', 'libopus', 'ogg'],
  ['WebM', 'supported.webm', 'libopus', undefined],
  ['FLAC', 'supported.flac', 'flac', undefined],
] as const;

function pcmWav(durationSeconds: number, sampleRate = 8_000, peakAmplitude = 4_096): Buffer {
  const sampleCount = Math.round(durationSeconds * sampleRate);
  const dataBytes = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // 16-bit mono byte rate
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    const sample = Math.round(peakAmplitude * Math.sin((2 * Math.PI * 440 * sampleIndex) / sampleRate));
    buffer.writeInt16LE(sample, 44 + sampleIndex * 2);
  }
  return buffer;
}

async function fixture(name: string, contents: Buffer): Promise<string> {
  const filePath = path.join(uploadsDir, `${process.pid}-${name}`);
  files.push(filePath);
  await fs.writeFile(filePath, contents, { mode: 0o600 });
  return filePath;
}

async function generatedWebm(name: string, durationSeconds: number): Promise<string> {
  const filePath = path.join(uploadsDir, `${process.pid}-${name}`);
  files.push(filePath);
  await runFile(configuredFfmpegPath, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=48000:cl=mono',
    '-t',
    String(durationSeconds),
    '-c:a',
    'libopus',
    '-b:a',
    '12k',
    filePath,
  ]);
  await fs.chmod(filePath, 0o600);
  return filePath;
}

async function generatedAudio(
  name: string,
  {
    bitrate,
    codec,
    durationSeconds = 1,
    format,
    source = 'sine=frequency=440:sample_rate=48000',
  }: { bitrate?: string; codec: string; durationSeconds?: number; format?: string; source?: string },
): Promise<string> {
  const filePath = path.join(uploadsDir, `${process.pid}-${name}`);
  files.push(filePath);
  await runFile(configuredFfmpegPath, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    source,
    '-t',
    String(durationSeconds),
    '-c:a',
    codec,
    ...(bitrate ? ['-b:a', bitrate] : []),
    ...(format ? ['-f', format] : []),
    filePath,
  ]);
  await fs.chmod(filePath, 0o600);
  return filePath;
}

afterEach(async () => {
  config.ffmpegPath = configuredFfmpegPath;
  config.ffprobePath = configuredFfprobePath;
  await Promise.all(files.splice(0).map((file) => fs.rm(file, { force: true })));
});

describe('verifyAudioDuration', () => {
  it('measures signed PCM energy across arbitrary odd stream boundaries', () => {
    const samples = [0, -32_768, 123, -456, 16];
    const pcm = Buffer.alloc(samples.length * 2);
    samples.forEach((sample, index) => pcm.writeInt16LE(sample, index * 2));

    let accumulator = createPcmS16LeSignalAccumulator();
    for (const chunk of [pcm.subarray(0, 1), pcm.subarray(1, 4), pcm.subarray(4, 7), pcm.subarray(7)]) {
      accumulator = accumulatePcmS16LeSignal(accumulator, chunk);
    }
    const summary = summarizePcmS16LeSignal(accumulator);

    expect(summary).toEqual({
      sampleCount: samples.length,
      peakAmplitude: 32_768,
      rmsAmplitude: Math.sqrt(samples.reduce((total, sample) => total + sample * sample, 0) / samples.length),
      hasPartialSample: false,
    });
    expect(hasAssessableAudioSignal(summary)).toBe(true);

    const incomplete = summarizePcmS16LeSignal(
      accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), Buffer.from([0x7f])),
    );
    expect(incomplete).toMatchObject({ sampleCount: 0, hasPartialSample: true });
    expect(hasAssessableAudioSignal(incomplete)).toBe(false);
  });

  it('accepts a decodable recording within the product duration limit', async () => {
    await expect(verifyAudioDuration(await fixture('valid.wav', pcmWav(1)))).resolves.toBe(true);
  });

  it('rejects digital silence and near-zero residue but accepts an extremely quiet real tone', async () => {
    await expect(verifyAudioDuration(await fixture('silent.wav', pcmWav(1, 8_000, 0)))).rejects.toMatchObject({
      status: 422,
      message: 'No audible signal was detected in the recording',
      code: 'AUDIO_SILENT',
    });
    await expect(
      verifyAudioDuration(await fixture('near-zero.wav', pcmWav(1, 8_000, MIN_AUDIO_PEAK_AMPLITUDE - 1))),
    ).rejects.toMatchObject({ status: 422, code: 'AUDIO_SILENT' });
    await expect(
      verifyAudioDuration(await fixture('quiet-tone.wav', pcmWav(1, 8_000, MIN_AUDIO_PEAK_AMPLITUDE * 2))),
    ).resolves.toBe(true);
  });

  it('accepts the exact minimum and maximum decoded-duration boundaries', async () => {
    await expect(verifyAudioDuration(await fixture('exact-minimum.wav', pcmWav(0.5)))).resolves.toBe(true);
    await expect(
      verifyAudioDuration(await fixture('exact-maximum.wav', pcmWav(MAX_AUDIO_DURATION_SECONDS))),
    ).resolves.toBe(true);
  });

  it('rejects malformed media and recordings that are too short', async () => {
    await expect(verifyAudioDuration(await fixture('invalid.wav', Buffer.from('not audio')))).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
    await expect(verifyAudioDuration(await fixture('short.wav', pcmWav(0.25)))).rejects.toMatchObject({
      status: 422,
      message: 'Recording is too short to assess',
      code: 'AUDIO_INVALID',
    });
    await expect(
      verifyAudioDuration(await generatedAudio('generated-short.wav', { codec: 'pcm_s16le', durationSeconds: 0.25 })),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('rejects media whose decoded samples exceed the recorder limit by one input sample', async () => {
    const overLimit = pcmWav(MAX_AUDIO_DURATION_SECONDS + 1 / 8_000);
    await expect(verifyAudioDuration(await fixture('long.wav', overLimit))).rejects.toMatchObject({
      status: 413,
      message: 'Recording must be two minutes or shorter',
      code: 'AUDIO_TOO_LONG',
    });
  });

  it('rejects overlong WebM decoded audio even when its Segment Info duration claims one second', async () => {
    const filePath = await generatedWebm('spoofed-duration.webm', MAX_AUDIO_DURATION_SECONDS + 0.5);
    const contents = await fs.readFile(filePath);
    // Matroska Duration element (0x4489) with an eight-byte float payload.
    // FFmpeg writes TimecodeScale=1,000,000ns, so 1,000 ticks claims 1 second.
    const durationElement = Buffer.from([0x44, 0x89, 0x88]);
    const durationOffset = contents.indexOf(durationElement);
    expect(durationOffset).toBeGreaterThanOrEqual(0);
    expect(contents.indexOf(durationElement, durationOffset + 1)).toBe(-1);
    expect(contents.readDoubleBE(durationOffset + durationElement.length)).toBeGreaterThan(120_000);
    contents.writeDoubleBE(1_000, durationOffset + durationElement.length);
    expect(contents.readDoubleBE(durationOffset + durationElement.length)).toBe(1_000);
    await fs.writeFile(filePath, contents);

    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 413 });
  });

  it('rejects an overlong M4A whose edit list forges a short presentation window', async () => {
    // FFmpeg writes an elst atom for AAC-in-MOV; patching entry0's
    // segment_duration (12 bytes past the atom type, in movie-timescale units
    // of 1/1000s) makes default edit-list handling present only that window.
    // The gate must ignore the edit list and measure the full audio payload.
    const filePath = await generatedAudio('forged-edit-list.m4a', {
      bitrate: '32k',
      codec: 'aac',
      durationSeconds: MAX_AUDIO_DURATION_SECONDS + 30,
    });
    const contents = await fs.readFile(filePath);
    const elstType = Buffer.from('elst', 'ascii');
    const elstOffset = contents.indexOf(elstType);
    expect(elstOffset).toBeGreaterThanOrEqual(0);
    expect(contents.indexOf(elstType, elstOffset + 1)).toBe(-1);
    expect(contents.readUInt32BE(elstOffset + 12)).toBeGreaterThan(120_000);
    contents.writeUInt32BE(10_000, elstOffset + 12);
    await fs.writeFile(filePath, contents);

    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 413 });

    // An honest short M4A from the same encoder still passes the gate.
    await expect(
      verifyAudioDuration(
        await generatedAudio('honest-short.m4a', { bitrate: '32k', codec: 'aac', durationSeconds: 2 }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects a FIFO without ever blocking the event loop on open', async () => {
    // Opening a FIFO for read blocks synchronously until a writer appears, so
    // the gate must reject non-regular files before any open attempt.
    const filePath = path.join(uploadsDir, `${process.pid}-fifo.wav`);
    files.push(filePath);
    await runFile('mkfifo', [filePath]);

    const startedAt = Date.now();
    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 415 });
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it('rejects multi-track containers whose uninspected streams would reach the paid transcriber', async () => {
    // Two mono sine tracks in one M4A: the first decodes to ~1s and would pass
    // a first-stream-only gate, while the second would still be uploaded to
    // Whisper. The gate must fail the whole container closed.
    const filePath = path.join(uploadsDir, `${process.pid}-two-audio-streams.m4a`);
    files.push(filePath);
    await runFile(configuredFfmpegPath, [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=880:duration=1',
      '-map',
      '0:a',
      '-map',
      '1:a',
      '-c:a',
      'aac',
      filePath,
    ]);
    await fs.chmod(filePath, 0o600);

    await expect(verifyAudioDuration(filePath)).rejects.toMatchObject({ status: 415 });
  });

  it('keeps inspector fixture coverage aligned with every accepted extension', () => {
    expect(supportedAudioFixtures.map(([, name]) => path.extname(name)).sort()).toEqual(
      Object.keys(AUDIO_TYPES).sort(),
    );
  });

  it.each(supportedAudioFixtures)(
    'accepts supported %s audio through the seekable descriptor input',
    async (_label, name, codec, format) => {
      await expect(verifyAudioDuration(await generatedAudio(name, { codec, format }))).resolves.toBe(true);
    },
  );

  it('accepts a non-faststart M4A whose tail metadata requires seekable input', async () => {
    const filePath = await generatedAudio('tail-moov.m4a', {
      bitrate: '512k',
      codec: 'aac',
      durationSeconds: 3,
      source: 'anoisesrc=r=48000:amplitude=0.5',
    });
    const contents = await fs.readFile(filePath);
    expect(contents.indexOf(Buffer.from('mdat'))).toBeLessThan(contents.indexOf(Buffer.from('moov')));
    // Keep this above FFmpeg's small non-seekable probe buffer. fd:3 is both
    // pathless and seekable, so ordinary tail-moov recordings still work.
    expect(contents.length).toBeGreaterThan(64 * 1024);
    await expect(verifyAudioDuration(filePath)).resolves.toBe(true);
  });

  it('refuses a symlink instead of letting the inspector follow it', async () => {
    const target = await fixture('symlink-target.wav', pcmWav(1));
    const symlink = path.join(uploadsDir, `${process.pid}-symlink.wav`);
    files.push(symlink);
    await fs.symlink(target, symlink);
    await expect(verifyAudioDuration(symlink)).rejects.toMatchObject({ status: 415 });
  });

  it('maps a missing inspector executable to service unavailable', async () => {
    config.ffmpegPath = path.join(uploadsDir, 'missing-ffmpeg');
    await expect(
      verifyAudioDuration(await fixture('valid-for-missing-inspector.wav', pcmWav(1))),
    ).rejects.toMatchObject({
      status: 503,
      message: 'Audio inspection is temporarily unavailable',
      code: 'PROVIDER_FAILED',
    });
  });

  it('maps an exhausted inspection wall clock to a retryable 503, never a file-blaming 415', async () => {
    // A probe that never answers burns the fixed 10s inspection budget; the
    // child is SIGKILLed when the timeout settles.
    const hangingProbe = path.join(uploadsDir, `${process.pid}-hanging-ffprobe`);
    files.push(hangingProbe);
    await fs.writeFile(hangingProbe, '#!/bin/sh\nexec sleep 30\n', { mode: 0o700 });
    config.ffprobePath = hangingProbe;
    await expect(verifyAudioDuration(await fixture('valid-for-timeout.wav', pcmWav(1)))).rejects.toMatchObject({
      status: 503,
      message: 'Audio inspection timed out; please try again',
      extra: { retryAfterSeconds: 5 },
      code: 'CAPACITY_BUSY',
    });
  }, 25_000);

  it('rejects a decoder that exits nonzero after emitting decodable bytes', async () => {
    // The probe stage succeeds on a genuine WAV, while a fake decoder emits one
    // even sample (0xffff = -1) and then exits 1. The close handler must blame
    // the file with 415 on the nonzero exit; skipping that branch would fall
    // through to the duration gates and answer 422 "too short" instead.
    const failingDecoder = path.join(uploadsDir, `${process.pid}-failing-ffmpeg`);
    files.push(failingDecoder);
    await fs.writeFile(failingDecoder, "#!/bin/sh\nprintf '\\377\\377'\nexit 1\n", { mode: 0o700 });
    config.ffmpegPath = failingDecoder;
    await expect(verifyAudioDuration(await fixture('valid-for-failing-decoder.wav', pcmWav(1)))).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
  });

  it('rejects a decoder that exits zero without decoding any samples', async () => {
    // Zero decoded bytes with a successful exit code is still an unusable
    // decode (415), not an empty recording that reaches the duration gate.
    const emptyDecoder = path.join(uploadsDir, `${process.pid}-empty-ffmpeg`);
    files.push(emptyDecoder);
    await fs.writeFile(emptyDecoder, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    config.ffmpegPath = emptyDecoder;
    await expect(verifyAudioDuration(await fixture('valid-for-empty-decoder.wav', pcmWav(1)))).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
  });

  it('rejects a successful decode that ends on an odd trailing byte', async () => {
    // One complete sample plus one dangling byte: the byte-count parity check
    // rejects it, and the signal-consistency settle is the second, independent
    // defense (the accumulator holds the pending low byte), so both layers of
    // the close handler must agree on the same stable 415.
    const oddDecoder = path.join(uploadsDir, `${process.pid}-odd-ffmpeg`);
    files.push(oddDecoder);
    await fs.writeFile(oddDecoder, "#!/bin/sh\nprintf '\\377\\377\\001'\nexit 0\n", { mode: 0o700 });
    config.ffmpegPath = oddDecoder;
    await expect(verifyAudioDuration(await fixture('valid-for-odd-decoder.wav', pcmWav(1)))).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
  });

  it('rejects a failing decode that ends on an odd trailing byte', async () => {
    // The nonzero exit owns the rejection regardless of the byte count, so an
    // odd trailing byte must never soften the failure into a duration answer.
    const oddFailingDecoder = path.join(uploadsDir, `${process.pid}-odd-failing-ffmpeg`);
    files.push(oddFailingDecoder);
    await fs.writeFile(oddFailingDecoder, "#!/bin/sh\nprintf '\\377\\377\\001'\nexit 1\n", { mode: 0o700 });
    config.ffmpegPath = oddFailingDecoder;
    await expect(
      verifyAudioDuration(await fixture('valid-for-odd-failing-decoder.wav', pcmWav(1))),
    ).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
  });

  it('rejects extensions outside the fixed demuxer allowlist', async () => {
    await expect(verifyAudioDuration(await fixture('valid-audio.bin', pcmWav(1)))).rejects.toMatchObject({
      status: 415,
      code: 'AUDIO_UNREADABLE',
    });
  });

  it('verifies that the configured executable is FFmpeg', async () => {
    await expect(assertAudioInspectorAvailable()).resolves.toBeUndefined();
  });
});

describe('PCM signal accumulator mutation boundaries', () => {
  it('creates the exact zeroed accumulator shape', () => {
    expect(createPcmS16LeSignalAccumulator()).toStrictEqual({
      sampleCount: 0,
      sumSquares: 0,
      peakAmplitude: 0,
    });
  });

  it('decodes the negative full-scale sample 0x8000 as amplitude 32768', () => {
    // Bytes 0x00 (low) + 0x80 (high) are the signed value -32768; its
    // amplitude, square (32768^2 = 1073741824, float64 exact), and RMS are
    // all exactly 32768, and it alone satisfies the signal gate.
    const summary = summarizePcmS16LeSignal(
      accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), Buffer.from([0x00, 0x80])),
    );
    expect(summary).toStrictEqual({
      sampleCount: 1,
      peakAmplitude: 32_768,
      rmsAmplitude: 32_768,
      hasPartialSample: false,
    });
    expect(hasAssessableAudioSignal(summary)).toBe(true);
  });

  it('computes exact RMS for zero samples and for a known multi-sample buffer', () => {
    expect(summarizePcmS16LeSignal(createPcmS16LeSignalAccumulator()).rmsAmplitude).toBe(0);
    const samples = [3, -4, 0, 12];
    const pcm = Buffer.alloc(samples.length * 2);
    samples.forEach((sample, index) => pcm.writeInt16LE(sample, index * 2));
    // (9 + 16 + 0 + 144) / 4 = 42.25 and sqrt(42.25) is exactly 6.5.
    expect(summarizePcmS16LeSignal(accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), pcm))).toStrictEqual({
      sampleCount: 4,
      peakAmplitude: 12,
      rmsAmplitude: 6.5,
      hasPartialSample: false,
    });
  });

  it('carries an odd trailing low byte across an intervening empty chunk', () => {
    let state = accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), Buffer.from([0x7f]));
    expect(state).toStrictEqual({ sampleCount: 0, sumSquares: 0, peakAmplitude: 0, pendingLowByte: 0x7f });

    // An empty chunk must neither consume the pending low byte nor count.
    state = accumulatePcmS16LeSignal(state, Buffer.alloc(0));
    expect(state).toStrictEqual({ sampleCount: 0, sumSquares: 0, peakAmplitude: 0, pendingLowByte: 0x7f });

    // 0x7f (low) + 0x01 (high) close out the single sample 383 (146689 = 383^2).
    state = accumulatePcmS16LeSignal(state, Buffer.from([0x01]));
    expect(state).toStrictEqual({ sampleCount: 1, sumSquares: 146_689, peakAmplitude: 383 });
    expect(summarizePcmS16LeSignal(state).hasPartialSample).toBe(false);
  });

  it('accepts exactly the minimum peak and RMS amplitudes and rejects one step below each gate', () => {
    const passing = {
      sampleCount: 2,
      peakAmplitude: MIN_AUDIO_PEAK_AMPLITUDE,
      rmsAmplitude: MIN_AUDIO_RMS_AMPLITUDE,
      hasPartialSample: false,
    };
    expect(hasAssessableAudioSignal(passing)).toBe(true);
    expect(hasAssessableAudioSignal({ ...passing, peakAmplitude: MIN_AUDIO_PEAK_AMPLITUDE - 1 })).toBe(false);
    expect(hasAssessableAudioSignal({ ...passing, rmsAmplitude: 0.9 })).toBe(false);
    expect(hasAssessableAudioSignal({ ...passing, sampleCount: 0 })).toBe(false);
    expect(hasAssessableAudioSignal({ ...passing, hasPartialSample: true })).toBe(false);
  });

  it('derives an RMS of exactly one from samples 1 and -1 and accepts it end to end', () => {
    // sqrt((1 + 1) / 2) === 1, so the raw RMS boundary is met by real samples.
    const summary = summarizePcmS16LeSignal(
      accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), Buffer.from([0x01, 0x00, 0xff, 0xff])),
    );
    expect(summary).toStrictEqual({
      sampleCount: 2,
      peakAmplitude: 1,
      rmsAmplitude: 1,
      hasPartialSample: false,
    });
    expect(hasAssessableAudioSignal({ ...summary, peakAmplitude: MIN_AUDIO_PEAK_AMPLITUDE })).toBe(true);
  });

  it('accepts a decoded buffer whose peak lands exactly on the minimum', () => {
    // Samples 16 and -16: peak exactly MIN_AUDIO_PEAK_AMPLITUDE and
    // sqrt((256 + 256) / 2) === 16, so the peak boundary is met by real samples.
    const summary = summarizePcmS16LeSignal(
      accumulatePcmS16LeSignal(createPcmS16LeSignalAccumulator(), Buffer.from([0x10, 0x00, 0xf0, 0xff])),
    );
    expect(summary).toStrictEqual({
      sampleCount: 2,
      peakAmplitude: MIN_AUDIO_PEAK_AMPLITUDE,
      rmsAmplitude: 16,
      hasPartialSample: false,
    });
    expect(hasAssessableAudioSignal(summary)).toBe(true);
  });
});
