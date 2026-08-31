import * as SecureStore from 'expo-secure-store';

import { isUuid } from './params';
import { audioKeyBelongsToOwner, audioKeyMatchesAssessmentEndpoint } from './types';

/**
 * Every assessment endpoint a durable handoff may target. Adding a member is a
 * schema change: `PENDING_ASSESSMENT_SCHEMA_VERSION` (and therefore the storage
 * key) must be bumped in the same commit so an older, still-supported binary
 * never reads a newer-format record from the old key.
 */
export const PENDING_ASSESSMENT_ENDPOINTS = [
  '/diagnostic/answer',
  '/practice/attempt',
  '/practice/attempt/native',
] as const;

/**
 * Every lifecycle stage a durable handoff may occupy. Adding a member is a
 * schema change: `PENDING_ASSESSMENT_SCHEMA_VERSION` (and therefore the storage
 * key) must be bumped in the same commit so an older, still-supported binary
 * never reads a newer-format record from the old key.
 */
export const PENDING_ASSESSMENT_STAGES = [
  'prepared',
  'direct-posting',
  's3-granted',
  'reconcile',
  'feedback-pending',
] as const;

export type AssessmentEndpoint = (typeof PENDING_ASSESSMENT_ENDPOINTS)[number];
export type PendingAssessmentStage = (typeof PENDING_ASSESSMENT_STAGES)[number];

export interface PendingAssessment {
  ownerId: string;
  endpoint: AssessmentEndpoint;
  questionId: string;
  /** Required for practice so every retry stays bound to the served three-try cycle. */
  cycleId?: string;
  requestId: string;
  createdAt: number;
  /** Explicit per-submission choice; legacy saved handoffs normalize to true. */
  retainRecording: boolean;
  stage: PendingAssessmentStage;
  /** When the server result became ready; present only until feedback is acknowledged. */
  feedbackReadyAt?: number;
  audioKey?: string;
  cancelRequested?: boolean;
  recoveryPostAttempts?: number;
}

/**
 * Runtime schema version of the durable handoff record. Bump it whenever either
 * enum list gains a member: the storage key is derived from this number, so a
 * new enum value lands under a new key and older binaries cannot parse (and
 * then delete) a newer-format handoff — including a pointer to an
 * already-paid assessment result.
 */
export const PENDING_ASSESSMENT_SCHEMA_VERSION = 1;

const STORAGE_KEY = `pending_assessment_v${PENDING_ASSESSMENT_SCHEMA_VERSION}`;
const MAX_STORED_RECOVERY_POST_ATTEMPTS = 3;
export const PENDING_FEEDBACK_RETENTION_MS = 48 * 60 * 60 * 1_000;
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.pending-assessment',
};

let memoryValue: PendingAssessment | ForwardIncompatiblePendingAssessment | null = null;
let memoryLoaded = false;
let storageQueue: Promise<void> = Promise.resolve();
let feedbackReplayRevision = 0;
const feedbackReplayListeners = new Set<() => void>();
// An unconditional clear is an account/session boundary. Bump this before its
// queued SecureStore delete begins so a create that was already waiting on a
// slow read cannot repopulate the slot after logout considers cleanup complete.
let unconditionalClearGeneration = 0;

/**
 * In-process bridge from a Recorder that discovers route-mismatched completed
 * feedback to the root replay provider. The durable SecureStore pointer remains
 * the authority; this revision only makes the already-mounted provider re-read
 * it without requiring an app restart or remount.
 */
export function getPendingAssessmentReplayRevision(): number {
  return feedbackReplayRevision;
}

export function subscribeToPendingAssessmentReplay(listener: () => void): () => void {
  feedbackReplayListeners.add(listener);
  return () => feedbackReplayListeners.delete(listener);
}

export function notifyPendingAssessmentReplayReady(requestId: string): boolean {
  if (!isUuid(requestId)) throw new TypeError('requestId must be a UUID');
  feedbackReplayRevision += 1;
  const hadListeners = feedbackReplayListeners.size > 0;
  for (const listener of feedbackReplayListeners) listener();
  return hadListeners;
}

function serializeStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

const ENDPOINT_SET: ReadonlySet<string> = new Set<string>(PENDING_ASSESSMENT_ENDPOINTS);
const STAGE_SET: ReadonlySet<string> = new Set<string>(PENDING_ASSESSMENT_STAGES);

/**
 * Parse outcome for a structurally valid record whose stage/endpoint enum was
 * authored by a NEWER schema version under this storage key. Such a record may
 * point at an already-paid assessment result, so this binary must never delete
 * or overwrite it — only an explicit user-driven clear may remove the slot.
 */
export interface ForwardIncompatiblePendingAssessment {
  readonly forwardIncompatible: true;
}

const FORWARD_INCOMPATIBLE: ForwardIncompatiblePendingAssessment = { forwardIncompatible: true };

function isForwardIncompatible(value: unknown): value is ForwardIncompatiblePendingAssessment {
  return value === FORWARD_INCOMPATIBLE;
}

/**
 * True when `value` is structurally valid but carries a stage/endpoint this
 * binary does not know. Callers can use this to distinguish "forward
 * incompatible" from "corrupt" without relying on the null-mapping public
 * parser.
 */
export function pendingAssessmentIsForwardIncompatible(value: unknown): boolean {
  return isForwardIncompatible(parsePendingAssessmentOutcome(value));
}

/** Full parse outcome: a record, a newer-schema record, or structural failure. */
function parsePendingAssessmentOutcome(
  value: unknown,
): PendingAssessment | ForwardIncompatiblePendingAssessment | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PendingAssessment>;
  if (
    !isUuid(candidate.ownerId) ||
    !isUuid(candidate.questionId) ||
    !isUuid(candidate.requestId) ||
    typeof candidate.createdAt !== 'number' ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt <= 0
  ) {
    return null;
  }
  // A non-string endpoint/stage is structural corruption; an unknown STRING is
  // a newer enum member and is deferred to the forward-incompatible outcome
  // below so every other field is validated first.
  if (typeof candidate.endpoint !== 'string') return null;
  const endpointKnown = ENDPOINT_SET.has(candidate.endpoint);
  const isPracticeEndpoint = endpointKnown && candidate.endpoint !== '/diagnostic/answer';
  if (isPracticeEndpoint && !isUuid(candidate.cycleId)) {
    return null;
  }
  if (endpointKnown && !isPracticeEndpoint && candidate.cycleId !== undefined) {
    return null;
  }
  if (!endpointKnown && candidate.cycleId !== undefined && !isUuid(candidate.cycleId)) {
    return null;
  }
  const stageRaw = candidate.stage;
  if (stageRaw !== undefined && typeof stageRaw !== 'string') {
    return null;
  }
  const stageKnown = stageRaw !== undefined && STAGE_SET.has(stageRaw);
  if (candidate.cancelRequested !== undefined && typeof candidate.cancelRequested !== 'boolean') {
    return null;
  }
  if (candidate.retainRecording !== undefined && typeof candidate.retainRecording !== 'boolean') {
    return null;
  }
  if (
    candidate.recoveryPostAttempts !== undefined &&
    (!Number.isSafeInteger(candidate.recoveryPostAttempts) ||
      candidate.recoveryPostAttempts < 0 ||
      candidate.recoveryPostAttempts > MAX_STORED_RECOVERY_POST_ATTEMPTS)
  ) {
    return null;
  }
  const legacyDelivery = (candidate as Partial<PendingAssessment> & { delivery?: string }).delivery;
  if (
    legacyDelivery !== undefined &&
    legacyDelivery !== 'pending' &&
    legacyDelivery !== 'reconcile'
  ) {
    return null;
  }
  // Every field this binary can validate on its own is structurally sound, so
  // an unrecognized enum member means the record was authored by a newer
  // schema. Return the sentinel instead of null: the caller must preserve the
  // slot rather than healing it away.
  if (!endpointKnown || (stageRaw !== undefined && !stageKnown)) {
    return FORWARD_INCOMPATIBLE;
  }
  const stage =
    candidate.stage ?? (legacyDelivery === 'reconcile' ? 'reconcile' : 'direct-posting');
  if (
    (stage === 'feedback-pending' &&
      (!Number.isSafeInteger(candidate.feedbackReadyAt) ||
        candidate.feedbackReadyAt! < candidate.createdAt)) ||
    (stage !== 'feedback-pending' && candidate.feedbackReadyAt !== undefined)
  ) {
    return null;
  }
  if (
    stage === 's3-granted' &&
    (typeof candidate.audioKey !== 'string' ||
      !audioKeyBelongsToOwner(candidate.audioKey, candidate.ownerId) ||
      !audioKeyMatchesAssessmentEndpoint(candidate.audioKey, candidate.endpoint))
  ) {
    return null;
  }
  return {
    ownerId: candidate.ownerId,
    endpoint: candidate.endpoint,
    questionId: candidate.questionId,
    ...(candidate.cycleId === undefined ? {} : { cycleId: candidate.cycleId }),
    requestId: candidate.requestId,
    createdAt: candidate.createdAt,
    // Handoffs created by the pre-choice app were submitted under the
    // server's backward-compatible retain=true contract. Recovery must reuse
    // that exact identity rather than silently opting those requests out.
    retainRecording: candidate.retainRecording ?? true,
    stage,
    ...(stage === 'feedback-pending' ? { feedbackReadyAt: candidate.feedbackReadyAt! } : {}),
    ...(stage === 's3-granted' ? { audioKey: candidate.audioKey } : {}),
    ...(candidate.cancelRequested !== undefined
      ? { cancelRequested: candidate.cancelRequested }
      : {}),
    ...(candidate.recoveryPostAttempts !== undefined
      ? { recoveryPostAttempts: candidate.recoveryPostAttempts }
      : {}),
  };
}

export function parsePendingAssessment(value: unknown): PendingAssessment | null {
  const parsed = parsePendingAssessmentOutcome(value);
  return isForwardIncompatible(parsed) ? null : parsed;
}

async function loadPendingUnsafe(): Promise<
  PendingAssessment | ForwardIncompatiblePendingAssessment | null
> {
  if (memoryLoaded) return memoryValue;
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch (error) {
    throw new Error('Secure pending-assessment storage is unavailable', {
      cause: error,
    });
  }
  memoryLoaded = true;
  if (!stored) return null;
  try {
    const parsed = parsePendingAssessmentOutcome(JSON.parse(stored) as unknown);
    if (isForwardIncompatible(parsed)) {
      // A structurally valid record with a newer-schema enum may point at an
      // already-paid assessment result. Preserve it: this binary must never
      // delete it, and a later load must not re-read the store to rediscover
      // that same forward incompatibility.
      memoryValue = parsed;
      return parsed;
    }
    if (parsed) {
      memoryValue = parsed;
      return parsed;
    }
  } catch {
    // Invalid local metadata is deleted below and never sent to the API.
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(() => undefined);
  memoryValue = null;
  return null;
}

/**
 * Loads the current record for request-matching consumers, collapsing a
 * forward-incompatible (newer-schema) record to null WITHOUT deleting it: no
 * stage write, conditional clear, or claim may match a record this binary
 * cannot understand.
 */
async function loadParseableUnsafe(): Promise<PendingAssessment | null> {
  const current = await loadPendingUnsafe();
  return isForwardIncompatible(current) ? null : current;
}

async function savePendingUnsafe(pending: PendingAssessment): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(pending), STORAGE_OPTIONS);
  memoryValue = pending;
  memoryLoaded = true;
}

export async function savePendingAssessment(pending: PendingAssessment): Promise<void> {
  const parsed = parsePendingAssessment(pending);
  if (!parsed) throw new Error('Invalid pending assessment metadata');
  await serializeStorage(async () => {
    await savePendingUnsafe(parsed);
  });
}

/** Captures the account-cleanup generation a new assessment handoff belongs to. */
export function capturePendingAssessmentGeneration(): number {
  return unconditionalClearGeneration;
}

/**
 * Synchronously advances the unconditional-clear generation without touching
 * storage. Auth's account/session boundaries call this at the moment they
 * SCHEDULE their deferred `clearPendingAssessment()` delete — which may sit
 * behind an earlier, potentially hung cleanup tail — so the generation fence is
 * closed synchronously and a creator that already captured the old generation
 * is refused even while the durable delete has not run yet. A plain number
 * bump, therefore trivially safe alongside the serialized storage queue; the
 * deferred clear itself still runs exactly as before.
 */
export function advanceUnconditionalClearGeneration(): void {
  unconditionalClearGeneration += 1;
}

/**
 * Atomically installs `candidate` only when no handoff already exists.
 *
 * The returned record is authoritative: concurrent creators all observe the
 * first record, rather than separately reading `null` and overwriting one
 * another. `null` means an unconditional account/session clear began after the
 * caller captured `expectedGeneration` — or the slot holds a forward-incompatible
 * newer-schema handoff — so no older submission may write or send.
 */
export async function ensurePendingAssessment(
  candidate: PendingAssessment,
  expectedGeneration: number,
): Promise<PendingAssessment | null> {
  const parsed = parsePendingAssessment(candidate);
  if (!parsed) throw new Error('Invalid pending assessment metadata');
  return serializeStorage(async () => {
    if (expectedGeneration !== unconditionalClearGeneration) return null;
    const current = await loadPendingUnsafe();
    if (expectedGeneration !== unconditionalClearGeneration) return null;
    // An older binary must never destroy a newer-format handoff (which may
    // point at an already-paid result): refuse instead of overwriting it.
    if (isForwardIncompatible(current)) return null;
    if (current) return current;
    await savePendingUnsafe(parsed);
    // A clear invoked while SecureStore was writing is already queued behind
    // this operation. Suppress network work now; that clear remains responsible
    // for deleting the just-finished durable write.
    if (expectedGeneration !== unconditionalClearGeneration) return null;
    return parsed;
  });
}

export async function loadPendingAssessment(): Promise<PendingAssessment | null> {
  const loaded = await serializeStorage(loadPendingUnsafe);
  return isForwardIncompatible(loaded) ? null : loaded;
}

/**
 * Deletes only the expected record when one is supplied, mirroring clearToken.
 * An unconditional clear never reads first: an entry that is undecryptable but
 * deletable (an Android backup restored without its Keystore key) must still be
 * healed, otherwise session-expiry cleanup would fail and block the next login.
 */
export async function clearPendingAssessment(expectedRequestId?: string): Promise<void> {
  if (expectedRequestId === undefined) unconditionalClearGeneration += 1;
  await serializeStorage(async () => {
    if (expectedRequestId !== undefined) {
      const current = await loadParseableUnsafe();
      if (current?.requestId !== expectedRequestId) return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
    memoryValue = null;
    memoryLoaded = true;
  });
}

/**
 * Deletes the slot only when it still contains the expected logical request.
 * Unlike the backward-compatible void clear API, the result lets replay
 * consumers distinguish a successful retirement from a race they must re-read.
 */
export async function clearPendingAssessmentIfRequestMatches(
  expectedRequestId: string,
): Promise<boolean> {
  if (!isUuid(expectedRequestId)) return false;
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (current?.requestId !== expectedRequestId) return false;
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
    memoryValue = null;
    memoryLoaded = true;
    return true;
  });
}

/**
 * Persist a handoff tombstone before UI delivery. If navigation, backgrounding,
 * or process death races delivery, the next focused screen refreshes canonical
 * state rather than polling/replaying or enabling another paid submission.
 */
export async function markPendingAssessmentForReconciliation(requestId: string): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    // A delivered result is monotonic. A stale reconciliation callback must
    // never downgrade it and re-enable recovery POST logic.
    if (current.stage === 'feedback-pending') return false;
    await savePendingUnsafe({
      ...current,
      stage: 'reconcile',
      audioKey: undefined,
      feedbackReadyAt: undefined,
    });
    return true;
  });
}

/**
 * Marks a validated server result as awaiting learner acknowledgement before
 * publishing its in-memory card. The pointer contains no transcript/feedback;
 * a cold start replays the completed response from the server by requestId.
 */
export async function markPendingAssessmentFeedbackPending(
  requestId: string,
  feedbackReadyAt: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(feedbackReadyAt) || feedbackReadyAt <= 0) {
    throw new RangeError('feedbackReadyAt must be a positive safe integer');
  }
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    if (current.stage === 'feedback-pending') return true;
    // Date.now() can move backwards while an assessment is in flight (manual
    // clock correction, NTP, or simulator time changes). Preserve the schema's
    // ordering invariant without turning an already-paid result into a pointer
    // that can never be persisted.
    const normalizedFeedbackReadyAt = Math.max(feedbackReadyAt, current.createdAt);
    const next = parsePendingAssessment({
      ...current,
      stage: 'feedback-pending',
      audioKey: undefined,
      feedbackReadyAt: normalizedFeedbackReadyAt,
    });
    if (!next) throw new Error('Invalid pending assessment metadata');
    await savePendingUnsafe(next);
    return true;
  });
}

/** Deletes only the exact account/request result pointer after card action. */
export async function acknowledgePendingAssessmentFeedback(
  ownerId: string,
  requestId: string,
): Promise<boolean> {
  if (!isUuid(ownerId) || !isUuid(requestId)) return false;
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (
      !current ||
      current.ownerId !== ownerId ||
      current.requestId !== requestId ||
      current.stage !== 'feedback-pending'
    ) {
      return false;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
    memoryValue = null;
    memoryLoaded = true;
    return true;
  });
}

/**
 * True once a delivered feedback pointer falls outside the server replay SLA.
 *
 * The server's 48-hour retention starts when it completes the assessment, not
 * when this client eventually rediscovers it. The handoff is created before
 * that completion, so anchoring the local deadline to `createdAt` can expire a
 * pointer early but can never intentionally extend it beyond the server's
 * guarantee after a delayed recovery.
 */
export function pendingAssessmentFeedbackIsExpired(
  pending: PendingAssessment,
  now = Date.now(),
): boolean {
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new RangeError('now must be a positive safe integer');
  }
  return (
    pending.stage === 'feedback-pending' && now >= pending.createdAt + PENDING_FEEDBACK_RETENTION_MS
  );
}

/**
 * Durably records cancellation intent for only the expected logical request.
 * The marker is monotonic: subsequent stage and reconciliation writes preserve
 * it until that request is conditionally cleared.
 */
export async function markPendingAssessmentCancelled(requestId: string): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    if (current.cancelRequested === true) return true;
    await savePendingUnsafe({
      ...current,
      cancelRequested: true,
    });
    return true;
  });
}

/** Atomically reserves one bounded recovery POST before any network work begins. */
export async function claimPendingAssessmentRecoveryPost(
  requestId: string,
  maxAttempts = 1,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts <= 0 ||
    maxAttempts > MAX_STORED_RECOVERY_POST_ATTEMPTS
  ) {
    throw new RangeError(
      `maxAttempts must be a positive safe integer no greater than ${MAX_STORED_RECOVERY_POST_ATTEMPTS}`,
    );
  }
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    if (current.stage === 'feedback-pending') return false;
    const attempts = current.recoveryPostAttempts ?? 0;
    if (attempts >= maxAttempts) return false;
    await savePendingUnsafe({
      ...current,
      recoveryPostAttempts: attempts + 1,
    });
    return true;
  });
}

/**
 * Refunds a claimed recovery POST that definitively failed before provider work.
 * A matching zero balance is already fully refunded and succeeds without I/O.
 */
export async function refundPendingAssessmentRecoveryPost(requestId: string): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    const attempts = current.recoveryPostAttempts ?? 0;
    if (attempts === 0) return true;
    await savePendingUnsafe({
      ...current,
      recoveryPostAttempts: attempts - 1,
    });
    return true;
  });
}

/** Advance the durable upload handoff before starting the corresponding I/O. */
export async function markPendingAssessmentStage(
  requestId: string,
  stage: 'direct-posting' | 's3-granted',
  audioKey?: string,
): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadParseableUnsafe();
    if (!current || current.requestId !== requestId) return false;
    if (current.stage === 'feedback-pending') return false;
    const next = parsePendingAssessment({
      ...current,
      stage,
      // The parser is the single normalization boundary: it requires the key
      // for S3 and strips it from every other stage.
      audioKey,
      feedbackReadyAt: undefined,
    });
    if (!next) throw new Error('Invalid pending assessment metadata');
    await savePendingUnsafe(next);
    return true;
  });
}
