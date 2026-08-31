import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { HttpError } from './middleware';

/** Measured-duration floor: a decode shorter than half a second is rejected as too short to assess. */
const MIN_AUDIO_DURATION_SECONDS = 0.5;
// Native encoders may add a fraction of a second of AAC/MP3/WebM padding to a
// take stopped at exactly 120 seconds. This is container tolerance, not extra
// learner speaking time.
export const MAX_AUDIO_DURATION_SECONDS = 120.5;
const INSPECTION_TIMEOUT_MS = 10_000;
const AVAILABILITY_TIMEOUT_MS = 2_000;
// SIGKILL/forced termination is normally followed by `close` immediately, but
// retain ownership briefly so a slow child cannot overlap a replacement. The
// fallback keeps a missing/broken close event from hanging a request forever;
// capacity then remains quarantined separately until `exit`/`close` arrives.
const CHILD_REAP_TIMEOUT_MS = 1_000;
const AVAILABILITY_SUCCESS_TTL_MS = 30_000;
const AVAILABILITY_FAILURE_TTL_MS = 2_000;
const MAX_DIAGNOSTIC_BYTES = 65_536;
// One audio-stream index per line; anything beyond this is hostile, not a
// long listing.
const MAX_STREAM_LISTING_BYTES = 4_096;
const MAX_VERSION_BYTES = 16_384;
const DECODED_SAMPLE_RATE = 8_000;
const DECODED_BYTES_PER_SAMPLE = 2;

// These thresholds are deliberately far below ordinary microphone speech:
// 16 signed-PCM units is about -66 dBFS peak and 1 unit is about -90 dBFS
// RMS. The gate removes digital silence and near-zero encoder residue without
// trying to classify quiet speech (that remains the transcription/grading
// pipeline's job).
export const MIN_AUDIO_PEAK_AMPLITUDE = 16;
export const MIN_AUDIO_RMS_AMPLITUDE = 1;

export interface PcmS16LeSignalAccumulator {
  readonly sampleCount: number;
  readonly sumSquares: number;
  readonly peakAmplitude: number;
  /** Low byte held when a stream chunk ends halfway through one sample. */
  readonly pendingLowByte?: number;
}

export interface PcmS16LeSignalSummary {
  readonly sampleCount: number;
  readonly peakAmplitude: number;
  readonly rmsAmplitude: number;
  readonly hasPartialSample: boolean;
}

/** Seed accumulator for a new decode stream: zero samples, zero energy, no pending byte. */
export function createPcmS16LeSignalAccumulator(): PcmS16LeSignalAccumulator {
  return { sampleCount: 0, sumSquares: 0, peakAmplitude: 0 };
}

/** Reinterpret one little-endian byte pair as a signed 16-bit PCM sample. */
function signedSampleFromBytes(lowByte: number, highByte: number): number {
  const unsigned = lowByte | (highByte << 8);
  // Stryker disable next-line EqualityOperator: at exactly 0x8000 the sign flip only changes
  // -32768 to +32768, and every consumer applies Math.abs or squaring, so all exported
  // outputs (peak, rms, sumSquares) are bit-identical under the mutant.
  return unsigned >= 0x8000 ? unsigned - 0x1_0000 : unsigned;
}

/**
 * Pure streaming reducer for mono signed 16-bit little-endian PCM. Native
 * stdout chunk boundaries are arbitrary, so an odd final byte is carried into
 * the next call rather than being dropped or read as a different sample.
 */
export function accumulatePcmS16LeSignal(
  previous: PcmS16LeSignalAccumulator,
  chunk: Buffer,
): PcmS16LeSignalAccumulator {
  let sampleCount = previous.sampleCount;
  let sumSquares = previous.sumSquares;
  let peakAmplitude = previous.peakAmplitude;
  let pendingLowByte = previous.pendingLowByte;
  let offset = 0;

  const accumulateSample = (sample: number) => {
    const amplitude = Math.abs(sample);
    sampleCount++;
    sumSquares += sample * sample;
    // Stryker disable next-line EqualityOperator: when amplitude === peakAmplitude the mutant
    // reassigns the identical value; no observable state can differ.
    if (amplitude > peakAmplitude) peakAmplitude = amplitude;
  };

  if (pendingLowByte !== undefined && chunk.length > 0) {
    accumulateSample(signedSampleFromBytes(pendingLowByte, chunk[0]));
    pendingLowByte = undefined;
    offset = 1;
  }
  for (; offset + 1 < chunk.length; offset += DECODED_BYTES_PER_SAMPLE) {
    accumulateSample(signedSampleFromBytes(chunk[offset], chunk[offset + 1]));
  }
  if (offset < chunk.length) pendingLowByte = chunk[offset];

  return {
    sampleCount,
    sumSquares,
    peakAmplitude,
    ...(pendingLowByte === undefined ? {} : { pendingLowByte }),
  };
}

/**
 * Freeze an accumulator into its final summary. RMS is the quadratic mean of
 * the decoded samples (0 when nothing was decoded), and `hasPartialSample`
 * reports a dangling low byte so callers can reject an odd-length stream
 * instead of silently measuring a truncated final sample.
 */
export function summarizePcmS16LeSignal(state: PcmS16LeSignalAccumulator): PcmS16LeSignalSummary {
  return {
    sampleCount: state.sampleCount,
    peakAmplitude: state.peakAmplitude,
    rmsAmplitude: state.sampleCount === 0 ? 0 : Math.sqrt(state.sumSquares / state.sampleCount),
    hasPartialSample: state.pendingLowByte !== undefined,
  };
}

/**
 * Decide whether a decoded summary carries speech-like signal at all. A
 * dangling partial sample, zero samples, or peak/RMS below the digital-silence
 * thresholds all fail — this predicate is what turns silent or near-zero audio
 * into AUDIO_SILENT before any paid provider work or retention decision.
 */
export function hasAssessableAudioSignal(summary: PcmS16LeSignalSummary): boolean {
  return (
    !summary.hasPartialSample &&
    summary.sampleCount > 0 &&
    summary.peakAmplitude >= MIN_AUDIO_PEAK_AMPLITUDE &&
    summary.rmsAmplitude >= MIN_AUDIO_RMS_AMPLITUDE
  );
}

/** Fixed decode-target byte rate: 8 kHz mono, 16-bit samples. */
function decodedBytesPerSecond(): number {
  return DECODED_SAMPLE_RATE * DECODED_BYTES_PER_SAMPLE;
}

/** Decoded-byte ceiling for the maximum tolerated duration; crossing it kills the decode as overlong. */
function maxDecodedBytes(): number {
  return Math.floor(MAX_AUDIO_DURATION_SECONDS * decodedBytesPerSecond());
}

// Native decoding is independently bounded before spawn. Requests fail fast
// rather than queueing and retaining uploaded files/assessment claims while a
// process slot is unavailable.
let inspectionsInFlight = 0;
let unreapedNativeChildren = 0;

/** Live slot count backing the audio_inspection_slots_in_use gauge (metrics.ts). */
export function getAudioInspectionSlotsInUse(): number {
  return inspectionsInFlight;
}

/**
 * Transfer capacity ownership to a child that ignored the bounded reap wait.
 * The request may now settle, but new native work must fail closed until the
 * OS reports that this process is gone. `exit` normally precedes `close`; the
 * idempotent listener pair also covers mocks and unusual stream teardown.
 */
function retainInspectionCapacityUntilChildExit(child: ReturnType<typeof spawn>): void {
  if (child.exitCode !== null) return;
  if (child.signalCode !== null) return;
  inspectionsInFlight++;
  unreapedNativeChildren++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    inspectionsInFlight--;
    unreapedNativeChildren--;
  };
  child.once('exit', release);
  child.once('close', release);
}

// Exported for the release-contract tests; production code only ever reaches
// the releaser through verifyAudioDuration's try/finally.
export function acquireInspectionSlot(): () => void {
  if (inspectionsInFlight >= config.audioInspectionMaxConcurrency) {
    throw new HttpError(503, 'Audio inspection capacity busy', { retryAfterSeconds: 2 }, 'CAPACITY_BUSY');
  }
  inspectionsInFlight++;
  // The releaser must be idempotent: a double call would otherwise drive the
  // in-flight count negative and admit more native decoders than the cap.
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
function inputFormatFor(extension: string): string | undefined {
  switch (extension) {
    case '.m4a':
    case '.mp4':
      return 'mov';
    case '.mp3':
      return 'mp3';
    case '.wav':
      return 'wav';
    case '.ogg':
    case '.oga':
      return 'ogg';
    case '.webm':
      return 'matroska,webm';
    case '.flac':
      return 'flac';
  }
}

type InspectionFailure = 'timeout' | 'unavailable';

interface AvailabilityCache {
  expiresAt: number;
  error?: Error;
}

let availabilityCache: AvailabilityCache | undefined;
let availabilityInFlight: Promise<void> | undefined;

/** Native-stage host failure (tool lost, deadline, descriptor exhaustion) — surfaces as a retryable 503. */
class InspectionError extends Error {
  constructor(readonly kind: InspectionFailure) {
    super(kind);
  }
}

/** Unusable input media (bad container, non-regular file, runaway output) — surfaces as 415 AUDIO_UNREADABLE. */
class InvalidInspectionError extends Error {}

/**
 * Translate an internal failure kind into its stable public 503 shape — the
 * single place where the host-fault vs backpressure distinction becomes
 * client-visible (per-kind rationale in the cases below).
 */
function inspectionFailureHttpError(kind: InspectionFailure): HttpError {
  switch (kind) {
    case 'unavailable':
      // The inspector cannot run (ffmpeg/ffprobe lost at runtime, or the host
      // refused another descriptor) — an operator-side fault, not client
      // backpressure: deliberately no retry hint, because a short client retry
      // cannot restore a missing binary.
      return new HttpError(503, 'Audio inspection is temporarily unavailable', 'PROVIDER_FAILED');
    case 'timeout':
      // A 10s probe/decode budget exhausted on a saturated host (or a
      // pathological input) is transient backpressure, not a bad file: answer
      // with a retryable 503 instead of blaming the recording with a 415.
      return new HttpError(
        503,
        'Audio inspection timed out; please try again',
        { retryAfterSeconds: 5 },
        'CAPACITY_BUSY',
      );
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
interface DecodedAudioInspection extends PcmS16LeSignalSummary {
  durationSeconds: number;
}

/**
 * Orchestrate one upload's two-stage native inspection: the ffprobe
 * exactly-one-audio-stream gate, then the bounded decode that measures real
 * duration and signal. The extension must map to an allowlisted demuxer
 * before anything is spawned, and every failure collapses into one of the two
 * internal kinds measureAudioDuration translates: InspectionError (host fault
 * or backpressure → 503) and InvalidInspectionError (unusable input → 415).
 */
async function inspectDecodedAudio(filePath: string): Promise<DecodedAudioInspection> {
  const inputFormat = inputFormatFor(path.extname(filePath).toLowerCase());
  if (!inputFormat) throw new InvalidInspectionError();

  // MOV's external data references are disabled by default; passing the
  // options explicitly makes that security boundary resilient to defaults
  // changing in a future FFmpeg release. `-ignore_editlist 1` makes the
  // decode cover the container's full audio payload: the default edit-list
  // handling would let a forged elst atom shrink the presented window (and
  // with it this gate's measured duration) while every sample still ships
  // to the paid transcriber.
  const movSafetyOptions =
    inputFormat === 'mov' ? ['-enable_drefs', '0', '-use_absolute_path', '0', '-ignore_editlist', '1'] : [];

  await verifySingleAudioStream(filePath, inputFormat, movSafetyOptions);
  return decodeMeasuredAudio(filePath, inputFormat, movSafetyOptions);
}

// Keep this classification on the runtime path instead of in module-static
// collection state: every host-fault branch stays directly executable and
// independently testable, while unknown/missing codes still fail closed as
// unusable input.
function isTransientOpenErrorCode(code: unknown): boolean {
  return code === 'EAGAIN' || code === 'EIO' || code === 'EMFILE' || code === 'ENFILE';
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
      throw new InvalidInspectionError();
    }
    fd = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    if (!fs.fstatSync(fd).isFile()) {
      throw new InvalidInspectionError();
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
    const { code } = error as NodeJS.ErrnoException;
    if (isTransientOpenErrorCode(code)) {
      throw new InspectionError('unavailable');
    }
    // Everything else (a non-regular object, ELOOP from the O_NOFOLLOW open,
    // ENXIO, a missing file) really is an unusable input.
    throw new InvalidInspectionError();
  }
}

/**
 * Verify that the container has exactly one audio stream with ffprobe over an
 * already-open private descriptor. Header-only and machine-readable (`nokey/noprint`
 * prints one stream index per line), with the same sandboxing as the decoder:
 * allowlisted demuxer/protocol, bounded probe window, capped output, and a
 * wall-clock deadline. A missing/unstartable ffprobe is 'unavailable' (the
 * caller maps it to 503); anything unparsable is 'invalid'.
 */
function verifySingleAudioStream(filePath: string, inputFormat: string, movSafetyOptions: string[]): Promise<void> {
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

    const stdout = child.stdout;
    const stderr = child.stderr;
    let settled = false;
    let terminating = false;
    let pendingError!: Error;
    let reapTimeout: NodeJS.Timeout | undefined;
    let listingBytes = 0;
    let diagnosticBytes = 0;
    let listing = '';
    const settle = (error?: Error) => {
      settled = true;
      clearTimeout(timeout);
      clearTimeout(reapTimeout);
      if (error) reject(error);
      else resolve();
    };
    const terminate = (error: Error) => {
      if (settled || terminating) return;
      terminating = true;
      pendingError = error;
      clearTimeout(timeout);
      stdout?.removeAllListeners('data');
      stderr?.removeAllListeners('data');
      reapTimeout = setTimeout(() => {
        retainInspectionCapacityUntilChildExit(child);
        settle(error);
      }, CHILD_REAP_TIMEOUT_MS);
      reapTimeout.unref();
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch {
        // The bounded reap fallback below still settles the inspection.
      }
    };
    const timeout = setTimeout(() => terminate(new InspectionError('timeout')), INSPECTION_TIMEOUT_MS);
    timeout.unref();
    child.once('error', () => {
      // Attach before validating the expected pipe handles. Even if the
      // runtime violates that invariant, a later ChildProcess error must be
      // consumed rather than becoming an uncaught EventEmitter exception.
      terminate(new InspectionError('unavailable'));
    });
    child.once('close', (code) => {
      if (terminating) {
        settle(pendingError);
        return;
      }
      if (code !== 0) {
        settle(new InvalidInspectionError());
        return;
      }
      const streamIndex = listing.trim();
      if (!/^\d+$/.test(streamIndex)) {
        settle(new InvalidInspectionError());
        return;
      }
      settle();
    });

    // Child stdio can emit its own 'error' independently of the ChildProcess
    // object (for example under descriptor exhaustion). Attach to whichever
    // expected pipes exist before checking the pair, so one malformed/missing
    // sibling cannot leave the other stream's late error unhandled.
    stdout?.on('error', () => terminate(new InspectionError('unavailable')));
    stderr?.on('error', () => terminate(new InspectionError('unavailable')));
    if (!stdout || !stderr) {
      terminate(new InspectionError('unavailable'));
      return;
    }
    stdout.on('data', (chunk: Buffer) => {
      listingBytes += chunk.length;
      if (listingBytes > MAX_STREAM_LISTING_BYTES) {
        terminate(new InvalidInspectionError());
        return;
      }
      listing += chunk.toString('utf8');
    });
    stderr.on('data', (chunk: Buffer) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > MAX_DIAGNOSTIC_BYTES) terminate(new InvalidInspectionError());
    });
  });
}

/** Decode the single known audio stream and measure its duration and signal. */
function decodeMeasuredAudio(
  filePath: string,
  inputFormat: string,
  movSafetyOptions: string[],
): Promise<DecodedAudioInspection> {
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

    // Data is counted and immediately discarded; learner audio is never
    // accumulated in application memory.
    const stdout = child.stdout;
    const stderr = child.stderr;
    let settled = false;
    let terminating = false;
    let pendingOutcome!: DecodedAudioInspection | number | Error;
    let reapTimeout: NodeJS.Timeout | undefined;
    let diagnosticBytes = 0;
    let decodedBytes = 0;
    let signalAccumulator = createPcmS16LeSignalAccumulator();

    const stop = () => {
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch {
        // The bounded reap fallback still settles the inspection.
      }
    };
    const settle = (outcome: DecodedAudioInspection | number | Error) => {
      settled = true;
      clearTimeout(timeout);
      clearTimeout(reapTimeout);
      if (outcome instanceof Error) reject(outcome);
      else if (typeof outcome === 'number') {
        resolve({
          durationSeconds: outcome,
          sampleCount: 0,
          peakAmplitude: 0,
          rmsAmplitude: 0,
          // Stryker disable next-line BooleanLiteral: this settle is reached only through the
          // over-limit terminate() path, whose duration (120.5s) always trips the 413
          // AUDIO_TOO_LONG gate in measureAudioDuration before any consumer reads this flag.
          hasPartialSample: false,
        });
      } else resolve(outcome);
    };
    const terminate = (outcome: DecodedAudioInspection | number | Error) => {
      if (settled || terminating) return;
      terminating = true;
      pendingOutcome = outcome;
      clearTimeout(timeout);
      stdout?.removeAllListeners('data');
      stderr?.removeAllListeners('data');
      reapTimeout = setTimeout(() => {
        retainInspectionCapacityUntilChildExit(child);
        settle(outcome);
      }, CHILD_REAP_TIMEOUT_MS);
      reapTimeout.unref();
      stop();
    };
    const countDecodedBytes = (chunk: Buffer) => {
      decodedBytes += chunk.length;
      if (decodedBytes > maxDecodedBytes()) {
        terminate(MAX_AUDIO_DURATION_SECONDS + 1);
        return;
      }
      signalAccumulator = accumulatePcmS16LeSignal(signalAccumulator, chunk);
    };

    const timeout = setTimeout(() => terminate(new InspectionError('timeout')), INSPECTION_TIMEOUT_MS);
    timeout.unref();
    child.once('error', () => {
      // Register before the pipe invariant check for the same reason as the
      // probe stage: a killed malformed child may still report one error.
      terminate(new InspectionError('unavailable'));
    });
    child.once('close', (code) => {
      if (terminating) {
        settle(pendingOutcome);
        return;
      }
      // Stryker disable next-line ConditionalExpression,EqualityOperator: the nonzero-exit and
      // zero-byte disjuncts are independently pinned by the fake-decoder 415 tests, but their
      // per-test coverage attribution is unreliable through the child-process close handler;
      // the odd-parity disjunct is equivalently guarded by the pending-byte settle below (an
      // odd total always leaves a dangling low byte), so every mutant of this line is either
      // test-pinned or behaviorally identical.
      const decodeRejected = code !== 0 || decodedBytes === 0 || decodedBytes % DECODED_BYTES_PER_SAMPLE !== 0;
      if (decodeRejected) {
        settle(new InvalidInspectionError());
        return;
      }
      const signal = summarizePcmS16LeSignal(signalAccumulator);
      // Stryker disable next-line ConditionalExpression,EqualityOperator,LogicalOperator,BlockStatement:
      // defensive invariant only — the accumulator consumes the identical byte stream that
      // produced decodedBytes, and an odd total is already rejected above, so
      // sampleCount*2 === decodedBytes with no pending byte provably holds; the surviving
      // mutants of this never-firing guard are behaviorally identical.
      if (signal.hasPartialSample || signal.sampleCount * DECODED_BYTES_PER_SAMPLE !== decodedBytes) {
        settle(new InvalidInspectionError());
        return;
      }
      settle({ durationSeconds: decodedBytes / decodedBytesPerSecond(), ...signal });
    });

    stdout?.on('error', () => terminate(new InspectionError('unavailable')));
    stderr?.on('error', () => terminate(new InspectionError('unavailable')));
    if (!stdout || !stderr) {
      terminate(new InspectionError('unavailable'));
      return;
    }
    stdout.on('data', countDecodedBytes);
    stderr.on('data', (chunk: Buffer) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > MAX_DIAGNOSTIC_BYTES) terminate(new InvalidInspectionError());
    });
  });
}

type MediaToolIdentity = 'ffmpeg' | 'ffprobe';

interface MediaToolAvailabilityCheck {
  executable: string;
  identity: MediaToolIdentity;
  label: 'FFmpeg' | 'FFprobe';
}

/**
 * Require the tool's self-identification at the very start of its version
 * output: a configured path that only prints a matching line later — or prints
 * some other tool's banner — must not pass readiness.
 */
function identifiesExpectedMediaTool(identity: MediaToolIdentity, versionOutput: string): boolean {
  switch (identity) {
    case 'ffmpeg':
      return /^ffmpeg version[\t ]+\S/.test(versionOutput);
    case 'ffprobe':
      return /^ffprobe version[\t ]+\S/.test(versionOutput);
  }
}

/**
 * Run `<tool> -version` under the allowlisted inspector environment and
 * resolve only for a clean exit whose bounded stdout self-identifies. Spawn
 * failure, deadline, oversized output, or a wrong banner rejects with a
 * sanitized message (never the configured path or native diagnostics), and
 * every failure path SIGKILLs the child behind the bounded reap fallback so a
 * slow or malformed child cannot wedge startup or leak inspection capacity.
 */
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
    // Attach immediately after spawn. If the expected stdout pipe is missing,
    // killing that malformed child can still produce an asynchronous error;
    // leaving it listenerless would crash the process after this promise had
    // already rejected cleanly.
    let settled = false;
    let terminating = false;
    let pendingError!: Error;
    let versionOutput = '';
    let versionBytes = 0;
    let reapTimeout: NodeJS.Timeout | undefined;
    const settle = (error?: Error) => {
      settled = true;
      clearTimeout(timeout);
      clearTimeout(reapTimeout);
      if (error) reject(error);
      else resolve();
    };
    const terminate = (error: Error) => {
      if (settled || terminating) return;
      terminating = true;
      pendingError = error;
      clearTimeout(timeout);
      versionStream?.removeAllListeners('data');
      reapTimeout = setTimeout(() => {
        retainInspectionCapacityUntilChildExit(child);
        settle(error);
      }, CHILD_REAP_TIMEOUT_MS);
      reapTimeout.unref();
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch {
        // The bounded reap fallback still settles readiness.
      }
    };
    const timeout = setTimeout(
      () => terminate(new Error(`${label} availability check timed out`)),
      AVAILABILITY_TIMEOUT_MS,
    );
    timeout.unref();
    child.once('error', () => terminate(new Error(`${label} is unavailable`)));
    child.once('close', (code) => {
      if (terminating) {
        settle(pendingError);
        return;
      }
      // The configured executable must identify itself at the very beginning
      // of its bounded stdout. A later, injected-looking line is insufficient.
      const identifiesExpectedTool = identifiesExpectedMediaTool(identity, versionOutput);
      if (code === 0 && identifiesExpectedTool) settle();
      else settle(new Error(`${label} is unavailable`));
    });
    if (!versionStream) {
      // stdio is explicitly piped above. Treat a violated runtime invariant as
      // dependency failure instead of accepting a tool we could not identify.
      terminate(new Error(`${label} availability check returned unexpected output`));
      return;
    }
    versionStream.on('data', (chunk: Buffer) => {
      versionBytes += chunk.length;
      if (versionBytes > MAX_VERSION_BYTES) {
        terminate(new Error(`${label} availability check returned unexpected output`));
        return;
      }
      versionOutput += chunk.toString('utf8');
    });
    // A piped stdio stream can fail after spawn succeeds. Handle it here so
    // a host-side descriptor fault becomes a bounded readiness failure rather
    // than an unhandled EventEmitter error that terminates the process.
    versionStream.on('error', () => terminate(new Error(`${label} is unavailable`)));
  });
}

/** Probe both configured binaries in assessment order; either failure rejects startup/readiness. */
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
  // A child that did not acknowledge forced termination is a stronger signal
  // than a recently cached success. Do not accumulate more version probes
  // while the OS may still own a previous native process.
  if (unreapedNativeChildren > 0) {
    return Promise.reject(new Error('Audio inspector process has not terminated'));
  }
  const now = Date.now();
  if (!force && availabilityCache && availabilityCache.expiresAt > now) {
    return availabilityCache.error ? Promise.reject(availabilityCache.error) : Promise.resolve();
  }
  if (availabilityInFlight) return availabilityInFlight;

  availabilityInFlight = runAudioInspectorAvailabilityCheck()
    .then(() => {
      availabilityCache = { expiresAt: Date.now() + AVAILABILITY_SUCCESS_TTL_MS };
    })
    .catch((availabilityError: Error) => {
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

/**
 * Reject invalid, implausibly short, overlong, or signal-free media and return
 * measured duration. Signal rejection happens before any paid provider work or
 * retained-recording persistence in the shared assessment pipeline.
 */
export async function measureAudioDuration(filePath: string): Promise<number> {
  const releaseSlot = acquireInspectionSlot();
  let inspection: DecodedAudioInspection;
  try {
    inspection = await inspectDecodedAudio(filePath);
  } catch (error) {
    if (error instanceof InspectionError) throw inspectionFailureHttpError(error.kind);
    throw new HttpError(415, 'Invalid or unsupported audio file', 'AUDIO_UNREADABLE');
  } finally {
    releaseSlot();
  }
  if (inspection.durationSeconds < MIN_AUDIO_DURATION_SECONDS) {
    throw new HttpError(422, 'Recording is too short to assess', 'AUDIO_INVALID');
  }
  if (inspection.durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
    throw new HttpError(413, 'Recording must be two minutes or shorter', 'AUDIO_TOO_LONG');
  }
  if (!hasAssessableAudioSignal(inspection)) {
    throw new HttpError(422, 'No audible signal was detected in the recording', 'AUDIO_SILENT');
  }
  return inspection.durationSeconds;
}

/** Backward-compatible boolean gate for callers that do not need metadata. */
export async function verifyAudioDuration(filePath: string): Promise<true> {
  await measureAudioDuration(filePath);
  return true;
}
