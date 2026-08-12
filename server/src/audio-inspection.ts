import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { HttpError } from './middleware';

export const MIN_AUDIO_DURATION_SECONDS = 0.5;
// Native encoders may add a fraction of a second of AAC/MP3/WebM padding to a
// take stopped at exactly 120 seconds. This is container tolerance, not extra
// learner speaking time.
export const MAX_AUDIO_DURATION_SECONDS = 120.5;
const INSPECTION_TIMEOUT_MS = 10_000;
const AVAILABILITY_TIMEOUT_MS = 2_000;
const AVAILABILITY_SUCCESS_TTL_MS = 30_000;
const AVAILABILITY_FAILURE_TTL_MS = 2_000;
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
const MAX_VERSION_BYTES = 16 * 1024;
const DECODED_SAMPLE_RATE = 8_000;
const DECODED_BYTES_PER_SAMPLE = 2;
const DECODED_BYTES_PER_SECOND = DECODED_SAMPLE_RATE * DECODED_BYTES_PER_SAMPLE;
const MAX_DECODED_BYTES = Math.floor(MAX_AUDIO_DURATION_SECONDS * DECODED_BYTES_PER_SECOND);

// Native decoding is independently bounded before spawn. Requests fail fast
// rather than queueing and retaining uploaded files/assessment claims while a
// process slot is unavailable.
let inspectionsInFlight = 0;

function acquireInspectionSlot(): () => void {
  if (inspectionsInFlight >= config.audioInspectionMaxConcurrency) {
    throw new HttpError(503, 'Audio inspection capacity busy', { retryAfterSeconds: 2 });
  }
  inspectionsInFlight++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inspectionsInFlight--;
  };
}
// Do not expose database/provider/storage credentials to the native parser.
const INSPECTOR_ENV: NodeJS.ProcessEnv = {
  LANG: 'C',
  LC_ALL: 'C',
  ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
  ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
};

// Select the one demuxer family implied by the already magic-checked upload
// extension. Besides reducing native parser attack surface, this prevents an
// uploaded playlist/manifest from making FFmpeg open secondary resources.
const INPUT_FORMAT_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.m4a': 'mov',
  '.mp4': 'mov',
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.ogg': 'ogg',
  '.oga': 'ogg',
  '.webm': 'matroska,webm',
  '.flac': 'flac',
};

type InspectionFailure = 'invalid' | 'timeout' | 'unavailable';

interface AvailabilityCache {
  expiresAt: number;
  error?: Error;
}

let availabilityCache: AvailabilityCache | undefined;
let availabilityInFlight: Promise<void> | undefined;

class InspectionError extends Error {
  constructor(readonly kind: InspectionFailure) {
    super(kind);
  }
}

/**
 * Decode the first audio stream to mono 8 kHz signed 16-bit PCM and count the
 * streamed bytes. Container duration headers are attacker controlled, while
 * FFmpeg progress timestamps vary across versions for very short/final
 * packets. Counting decoded samples is both version-independent and resistant
 * to forged metadata. A wall-clock deadline, one decoder thread, bounded
 * probe/allocation/diagnostic sizes, disabled network protocols, and a hard
 * decoded-byte cutoff contain malformed-media resource use.
 */
function inspectDecodedDuration(filePath: string): Promise<number> {
  const inputFormat = INPUT_FORMAT_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!inputFormat) return Promise.reject(new InspectionError('invalid'));

  let inputFd = -1;
  const closeInput = () => {
    if (inputFd < 0) return;
    try {
      fs.closeSync(inputFd);
    } catch {
      // The child has its own duplicate after spawn; this is best-effort.
    }
    inputFd = -1;
  };
  try {
    // Open the private upload ourselves, refuse a final-component symlink, and
    // hand FFmpeg only this already-open descriptor. Unlike stdin this remains
    // seekable for ordinary tail-moov MP4/M4A files; unlike `file`, FFmpeg has
    // no protocol capable of opening another local path from hostile metadata.
    inputFd = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    if (!fs.fstatSync(inputFd).isFile()) {
      closeInput();
      return Promise.reject(new InspectionError('invalid'));
    }
  } catch {
    closeInput();
    return Promise.reject(new InspectionError('invalid'));
  }

  return new Promise((resolve, reject) => {
    // MOV's external data references are disabled by default; passing the
    // options explicitly makes that security boundary resilient to defaults
    // changing in a future FFmpeg release.
    const movSafetyOptions = inputFormat === 'mov' ? ['-enable_drefs', '0', '-use_absolute_path', '0'] : [];
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        config.ffmpegPath,
        [
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
          inputFormat,
          ...movSafetyOptions,
          '-fd',
          '3',
          '-i',
          'fd:',
          '-map',
          '0:a:0',
          '-vn',
          '-sn',
          '-dn',
          '-ac',
          '1',
          '-ar',
          String(DECODED_SAMPLE_RATE),
          '-c:a',
          'pcm_s16le',
          '-f',
          's16le',
          'pipe:1',
        ],
        {
          env: INSPECTOR_ENV,
          stdio: ['ignore', 'pipe', 'pipe', inputFd],
          windowsHide: true,
          shell: false,
        },
      );
    } catch {
      closeInput();
      reject(new InspectionError('unavailable'));
      return;
    }
    // spawn(2) duplicated the descriptor into the child before returning.
    closeInput();

    let settled = false;
    let overlong = false;
    let diagnosticBytes = 0;
    let decodedBytes = 0;

    const stop = () => {
      if (!child.killed) child.kill('SIGKILL');
    };
    const finish = (duration: number | InspectionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stop();
      if (duration instanceof InspectionError) reject(duration);
      else resolve(duration);
    };
    const countDecodedBytes = (chunk: Buffer) => {
      decodedBytes += chunk.length;
      if (decodedBytes > MAX_DECODED_BYTES) {
        overlong = true;
        stop();
      }
    };

    const timeout = setTimeout(() => finish(new InspectionError('timeout')), INSPECTION_TIMEOUT_MS);
    timeout.unref();

    // Data is counted and immediately discarded; learner audio is never
    // accumulated in application memory.
    child.stdout!.on('data', countDecodedBytes);
    child.stderr!.on('data', (chunk: Buffer) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > MAX_DIAGNOSTIC_BYTES) finish(new InspectionError('invalid'));
    });
    child.once('error', () => {
      // A ChildProcess error here is an inability to start/control the
      // configured inspector, not evidence that the learner's media is bad.
      finish(new InspectionError('unavailable'));
    });
    child.once('close', (code) => {
      if (settled) return;
      if (overlong) {
        finish(MAX_AUDIO_DURATION_SECONDS + 1);
      } else if (code !== 0 || decodedBytes === 0 || decodedBytes % DECODED_BYTES_PER_SAMPLE !== 0) {
        finish(new InspectionError('invalid'));
      } else {
        finish(decodedBytes / DECODED_BYTES_PER_SECOND);
      }
    });
  });
}

function runAudioInspectorAvailabilityCheck(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(config.ffmpegPath, ['-hide_banner', '-version'], {
      env: INSPECTOR_ENV,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      shell: false,
    });
    let settled = false;
    let versionOutput = '';
    let versionBytes = 0;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!child.killed) child.kill('SIGKILL');
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => finish(new Error('FFmpeg availability check timed out')), AVAILABILITY_TIMEOUT_MS);
    timeout.unref();
    child.stdout.on('data', (chunk: Buffer) => {
      versionBytes += chunk.length;
      if (versionBytes > MAX_VERSION_BYTES) {
        finish(new Error('FFmpeg availability check returned unexpected output'));
        return;
      }
      versionOutput += chunk.toString('utf8');
    });
    child.once('error', () => finish(new Error('FFmpeg is unavailable')));
    child.once('close', (code) => {
      if (code === 0 && /^ffmpeg version\s+/m.test(versionOutput)) finish();
      else finish(new Error('FFmpeg is unavailable'));
    });
  });
}

/**
 * Fail-fast dependency check used at startup and by readiness. Concurrent
 * callers share one native process; short result TTLs prevent ordinary probes
 * from repeatedly spawning FFmpeg while still detecting runtime loss quickly.
 */
export function assertAudioInspectorAvailable({ force = false }: { force?: boolean } = {}): Promise<void> {
  const now = Date.now();
  if (!force && availabilityCache && availabilityCache.expiresAt > now) {
    return availabilityCache.error ? Promise.reject(availabilityCache.error) : Promise.resolve();
  }
  if (availabilityInFlight) return availabilityInFlight;

  availabilityInFlight = runAudioInspectorAvailabilityCheck()
    .then(() => {
      availabilityCache = { expiresAt: Date.now() + AVAILABILITY_SUCCESS_TTL_MS };
    })
    .catch((error: unknown) => {
      const availabilityError = error instanceof Error ? error : new Error('FFmpeg is unavailable');
      availabilityCache = {
        expiresAt: Date.now() + AVAILABILITY_FAILURE_TTL_MS,
        error: availabilityError,
      };
      throw availabilityError;
    })
    .finally(() => {
      availabilityInFlight = undefined;
    });
  return availabilityInFlight;
}

/** Reject invalid, implausibly short, or overlong media before paid AI work. */
export async function verifyAudioDuration(filePath: string): Promise<true> {
  const releaseSlot = acquireInspectionSlot();
  let duration: number;
  try {
    duration = await inspectDecodedDuration(filePath);
  } catch (error) {
    if (error instanceof InspectionError && error.kind === 'unavailable') {
      throw new HttpError(503, 'Audio inspection is temporarily unavailable');
    }
    throw new HttpError(415, 'Invalid or unsupported audio file');
  } finally {
    releaseSlot();
  }
  if (duration < MIN_AUDIO_DURATION_SECONDS) {
    throw new HttpError(422, 'Recording is too short to assess');
  }
  if (duration > MAX_AUDIO_DURATION_SECONDS) {
    throw new HttpError(413, 'Recording must be two minutes or shorter');
  }
  return true;
}
