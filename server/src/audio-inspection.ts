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
// One audio-stream index per line; anything beyond this is hostile, not a
// long listing.
const MAX_STREAM_LISTING_BYTES = 4 * 1024;
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
/** Build the complete, allowlisted environment passed to the native parser. */
export function buildAudioInspectorEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    LANG: 'C',
    LC_ALL: 'C',
    ...(source.PATH ? { PATH: source.PATH } : {}),
    ...(source.SystemRoot ? { SystemRoot: source.SystemRoot } : {}),
  };
}

// Do not expose database/provider/storage credentials to the native parser.
const INSPECTOR_ENV = buildAudioInspectorEnvironment(process.env);

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
 * Decode the audio to mono 8 kHz signed 16-bit PCM and count the streamed
 * bytes. Container duration headers are attacker controlled, while FFmpeg
 * progress timestamps vary across versions for very short/final packets.
 * Counting decoded samples is both version-independent and resistant to
 * forged metadata. A wall-clock deadline, one decoder thread, bounded
 * probe/allocation/diagnostic sizes, disabled network protocols, and a hard
 * decoded-byte cutoff contain malformed-media resource use.
 *
 * Before decoding, ffprobe counts the container's audio streams and anything
 * but exactly one is rejected: an uninspected track would still be sent to
 * the paid transcriber, and relying on the raw-PCM muxer to refuse multiple
 * mapped streams is not version-independent (FFmpeg 8 errors, 6.1 decodes),
 * while CLI map fallbacks can silently duplicate the first stream into a
 * per-stream tripwire output. A machine-readable stream count is the only
 * behavior-stable gate. With exactly one audio stream known to exist,
 * `-map 0:a?` in the decoder decodes that single stream for measurement, so
 * multi-stream muxer behavior is moot.
 *
 * Each stage opens its own descriptor: duplicated descriptors share the file
 * offset, so the prober would otherwise leave the decoder at EOF. The upload
 * directory is server-private (mode 0700), so a hostile swap between the two
 * opens is not reachable; both opens still re-verify a regular file.
 */
async function inspectDecodedDuration(filePath: string): Promise<number> {
  const inputFormat = INPUT_FORMAT_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!inputFormat) throw new InspectionError('invalid');

  // MOV's external data references are disabled by default; passing the
  // options explicitly makes that security boundary resilient to defaults
  // changing in a future FFmpeg release. `-ignore_editlist 1` makes the
  // decode cover the container's full audio payload: the default edit-list
  // handling would let a forged elst atom shrink the presented window (and
  // with it this gate's measured duration) while every sample still ships
  // to the paid transcriber.
  const movSafetyOptions =
    inputFormat === 'mov' ? ['-enable_drefs', '0', '-use_absolute_path', '0', '-ignore_editlist', '1'] : [];

  const audioStreamCount = await probeAudioStreamCount(filePath, inputFormat, movSafetyOptions);
  if (audioStreamCount !== 1) throw new InspectionError('invalid');
  return decodeMeasuredDuration(filePath, inputFormat, movSafetyOptions);
}

/**
 * Open the private upload for one native stage. A FIFO or blocking device
 * node wedges the whole event loop inside openSync until a writer appears,
 * before O_NOFOLLOW or fstat could run, so reject non-regular files up front.
 * The post-open fstat stays as defense in depth: it verifies the object
 * actually opened. Unlike stdin the descriptor remains seekable for ordinary
 * tail-moov MP4/M4A files; unlike `file`, FFmpeg has no protocol capable of
 * opening another local path from hostile metadata.
 */
function openPrivateInput(filePath: string): number {
  let fd: number | undefined;
  try {
    if (!fs.lstatSync(filePath).isFile()) {
      throw new InspectionError('invalid');
    }
    fd = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    if (!fs.fstatSync(fd).isFile()) {
      throw new InspectionError('invalid');
    }
    const opened = fd;
    fd = undefined;
    return opened;
  } catch (error) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best-effort cleanup on the failure path.
      }
    }
    throw error instanceof InspectionError ? error : new InspectionError('invalid');
  }
}

/**
 * Count the container's audio streams with ffprobe over an already-open
 * private descriptor. Header-only and machine-readable (`nokey/noprint`
 * prints one stream index per line), with the same sandboxing as the decoder:
 * allowlisted demuxer/protocol, bounded probe window, capped output, and a
 * wall-clock deadline. A missing/unstartable ffprobe is 'unavailable' (the
 * caller maps it to 503); anything unparsable is 'invalid'.
 */
function probeAudioStreamCount(filePath: string, inputFormat: string, movSafetyOptions: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    let inputFd: number;
    try {
      inputFd = openPrivateInput(filePath);
    } catch (error) {
      reject(error);
      return;
    }
    const closeInput = () => {
      try {
        fs.closeSync(inputFd);
      } catch {
        // The child has its own duplicate after spawn; this is best-effort.
      }
    };
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        config.ffprobePath,
        [
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
          inputFormat,
          ...movSafetyOptions,
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
    let listingBytes = 0;
    let diagnosticBytes = 0;
    let listing = '';
    const finish = (result: number | InspectionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!child.killed) child.kill('SIGKILL');
      if (result instanceof InspectionError) reject(result);
      else resolve(result);
    };
    const timeout = setTimeout(() => finish(new InspectionError('timeout')), INSPECTION_TIMEOUT_MS);
    timeout.unref();

    child.stdout!.on('data', (chunk: Buffer) => {
      listingBytes += chunk.length;
      // One line per audio stream; far more lines than any honest container
      // can hold means hostile media, not a long listing.
      if (listingBytes > MAX_STREAM_LISTING_BYTES) {
        finish(new InspectionError('invalid'));
        return;
      }
      listing += chunk.toString('utf8');
    });
    child.stderr!.on('data', (chunk: Buffer) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > MAX_DIAGNOSTIC_BYTES) finish(new InspectionError('invalid'));
    });
    child.once('error', () => {
      // A ChildProcess error here is an inability to start/control the
      // configured prober, not evidence that the learner's media is bad.
      finish(new InspectionError('unavailable'));
    });
    child.once('close', (code) => {
      if (settled) return;
      if (code !== 0) {
        finish(new InspectionError('invalid'));
        return;
      }
      const lines = listing
        .trim()
        .split('\n')
        .filter((line) => line !== '');
      if (!lines.every((line) => /^\d+$/.test(line))) {
        finish(new InspectionError('invalid'));
        return;
      }
      finish(lines.length);
    });
  });
}

/** Decode the single known audio stream and measure it by counted PCM bytes. */
function decodeMeasuredDuration(filePath: string, inputFormat: string, movSafetyOptions: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    let inputFd: number;
    try {
      inputFd = openPrivateInput(filePath);
    } catch (error) {
      reject(error);
      return;
    }
    const closeInput = () => {
      try {
        fs.closeSync(inputFd);
      } catch {
        // The child has its own duplicate after spawn; this is best-effort.
      }
    };
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
          // The probe above has already proven exactly one audio stream.
          '-map',
          '0:a?',
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

type MediaToolIdentity = 'ffmpeg' | 'ffprobe';

interface MediaToolAvailabilityCheck {
  executable: string;
  identity: MediaToolIdentity;
  label: 'FFmpeg' | 'FFprobe';
}

function runMediaToolAvailabilityCheck({ executable, identity, label }: MediaToolAvailabilityCheck): Promise<void> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executable, ['-hide_banner', '-version'], {
        env: INSPECTOR_ENV,
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
        shell: false,
      });
    } catch {
      // Do not expose a configured path (which can contain deployment details)
      // or a native spawn diagnostic through startup/readiness errors.
      reject(new Error(`${label} is unavailable`));
      return;
    }
    const versionStream = child.stdout;
    if (!versionStream) {
      // stdio is explicitly piped above. Treat a violated runtime invariant as
      // dependency failure instead of accepting a tool we could not identify.
      if (!child.killed) child.kill('SIGKILL');
      reject(new Error(`${label} availability check returned unexpected output`));
      return;
    }
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
    const timeout = setTimeout(
      () => finish(new Error(`${label} availability check timed out`)),
      AVAILABILITY_TIMEOUT_MS,
    );
    timeout.unref();
    versionStream.on('data', (chunk: Buffer) => {
      versionBytes += chunk.length;
      if (versionBytes > MAX_VERSION_BYTES) {
        finish(new Error(`${label} availability check returned unexpected output`));
        return;
      }
      versionOutput += chunk.toString('utf8');
    });
    child.once('error', () => finish(new Error(`${label} is unavailable`)));
    child.once('close', (code) => {
      // The configured executable must identify itself at the very beginning
      // of its bounded stdout. A later, injected-looking line is insufficient.
      const identifiesExpectedTool =
        identity === 'ffmpeg'
          ? /^ffmpeg version[\t ]+\S/.test(versionOutput)
          : /^ffprobe version[\t ]+\S/.test(versionOutput);
      if (code === 0 && identifiesExpectedTool) finish();
      else finish(new Error(`${label} is unavailable`));
    });
  });
}

async function runAudioInspectorAvailabilityCheck(): Promise<void> {
  // Validate in the same order used for an assessment: ffprobe gates the
  // container before FFmpeg decodes it. Both configured commands must prove
  // their identity before startup/readiness succeeds.
  await runMediaToolAvailabilityCheck({
    executable: config.ffprobePath,
    identity: 'ffprobe',
    label: 'FFprobe',
  });
  await runMediaToolAvailabilityCheck({
    executable: config.ffmpegPath,
    identity: 'ffmpeg',
    label: 'FFmpeg',
  });
}

/**
 * Fail-fast dependency check used at startup and by readiness. Concurrent
 * callers share one bounded dependency-check sequence; short result TTLs
 * prevent ordinary probes from repeatedly spawning native tools while still
 * detecting runtime loss quickly.
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
      const availabilityError =
        error instanceof Error ? error : new Error('Audio inspection dependencies are unavailable');
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
    // A 10s probe/decode budget exhausted on a saturated host (or a
    // pathological input) is transient backpressure, not a bad file: answer
    // with a retryable 503 instead of blaming the recording with a 415.
    if (error instanceof InspectionError && error.kind === 'timeout') {
      throw new HttpError(503, 'Audio inspection timed out; please try again', { retryAfterSeconds: 5 });
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
