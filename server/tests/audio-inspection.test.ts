import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertAudioInspectorAvailable,
  MAX_AUDIO_DURATION_SECONDS,
  verifyAudioDuration,
} from '../src/audio-inspection';
import { config } from '../src/config';
import { AUDIO_TYPES, uploadsDir } from '../src/upload';

const files: string[] = [];
const runFile = promisify(execFile);
const configuredFfmpegPath = config.ffmpegPath;
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

function pcmWav(durationSeconds: number, sampleRate = 8_000): Buffer {
  const dataBytes = Math.round(durationSeconds * sampleRate);
  const buffer = Buffer.alloc(44 + dataBytes, 128);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // 8-bit mono byte rate
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
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
    source = 'anullsrc=r=48000:cl=mono',
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
  await Promise.all(files.splice(0).map((file) => fs.rm(file, { force: true })));
});

describe('verifyAudioDuration', () => {
  it('accepts a decodable recording within the product duration limit', async () => {
    await expect(verifyAudioDuration(await fixture('valid.wav', pcmWav(1)))).resolves.toBe(true);
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
    });
    await expect(verifyAudioDuration(await fixture('short.wav', pcmWav(0.25)))).rejects.toMatchObject({
      status: 422,
      message: 'Recording is too short to assess',
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
    });
  });

  it('rejects extensions outside the fixed demuxer allowlist', async () => {
    await expect(verifyAudioDuration(await fixture('valid-audio.bin', pcmWav(1)))).rejects.toMatchObject({
      status: 415,
    });
  });

  it('verifies that the configured executable is FFmpeg', async () => {
    await expect(assertAudioInspectorAvailable()).resolves.toBeUndefined();
  });
});
