import * as SecureStore from 'expo-secure-store';

import { isUuid } from './params';
import { audioKeyBelongsToOwner, audioKeyMatchesAssessmentEndpoint } from './types';

export type AssessmentEndpoint =
  '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';

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
  stage: 'prepared' | 'direct-posting' | 's3-granted' | 'reconcile' | 'feedback-pending';
  /** When the server result became ready; present only until feedback is acknowledged. */
  feedbackReadyAt?: number;
  audioKey?: string;
  cancelRequested?: boolean;
  recoveryPostAttempts?: number;
}

const STORAGE_KEY = 'pending_assessment_v1';
const MAX_STORED_RECOVERY_POST_ATTEMPTS = 3;
export const PENDING_FEEDBACK_RETENTION_MS = 48 * 60 * 60 * 1_000;
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.pending-assessment',
};

let memoryValue: PendingAssessment | null = null;
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

export function parsePendingAssessment(value: unknown): PendingAssessment | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PendingAssessment>;
  if (
    !isUuid(candidate.ownerId) ||
    !isUuid(candidate.questionId) ||
    !isUuid(candidate.requestId) ||
    (candidate.endpoint !== '/diagnostic/answer' &&
      candidate.endpoint !== '/practice/attempt' &&
      candidate.endpoint !== '/practice/attempt/native') ||
    typeof candidate.createdAt !== 'number' ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt <= 0
  ) {
    return null;
  }
  const isPracticeEndpoint = candidate.endpoint !== '/diagnostic/answer';
  if (
    (isPracticeEndpoint && !isUuid(candidate.cycleId)) ||
    (!isPracticeEndpoint && candidate.cycleId !== undefined)
  ) {
    return null;
  }
  if (
    candidate.stage !== undefined &&
    candidate.stage !== 'prepared' &&
    candidate.stage !== 'direct-posting' &&
    candidate.stage !== 's3-granted' &&
    candidate.stage !== 'reconcile' &&
    candidate.stage !== 'feedback-pending'
  ) {
    return null;
  }
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

async function loadPendingUnsafe(): Promise<PendingAssessment | null> {
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
    const parsed = parsePendingAssessment(JSON.parse(stored) as unknown);
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
 * Atomically installs `candidate` only when no handoff already exists.
 *
 * The returned record is authoritative: concurrent creators all observe the
 * first record, rather than separately reading `null` and overwriting one
 * another. `null` means an unconditional account/session clear began after the
 * caller captured `expectedGeneration`; no older submission may write or send.
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
  return serializeStorage(loadPendingUnsafe);
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
      const current = await loadPendingUnsafe();
      if (current?.requestId !== expectedRequestId) return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
    memoryValue = null;
    memoryLoaded = true;
  });
}

/**
 * Persist a handoff tombstone before UI delivery. If navigation, backgrounding,
 * or process death races delivery, the next focused screen refreshes canonical
 * state rather than polling/replaying or enabling another paid submission.
 */
export async function markPendingAssessmentForReconciliation(requestId: string): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadPendingUnsafe();
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
    const current = await loadPendingUnsafe();
    if (!current || current.requestId !== requestId) return false;
    if (feedbackReadyAt < current.createdAt) {
      throw new RangeError('feedbackReadyAt cannot predate the assessment');
    }
    if (current.stage === 'feedback-pending') return true;
    const next = parsePendingAssessment({
      ...current,
      stage: 'feedback-pending',
      audioKey: undefined,
      feedbackReadyAt,
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
    const current = await loadPendingUnsafe();
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

/** True once a delivered feedback pointer falls outside the server replay SLA. */
export function pendingAssessmentFeedbackIsExpired(
  pending: PendingAssessment,
  now = Date.now(),
): boolean {
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new RangeError('now must be a positive safe integer');
  }
  return (
    pending.stage === 'feedback-pending' &&
    now >= pending.feedbackReadyAt! + PENDING_FEEDBACK_RETENTION_MS
  );
}

/**
 * Durably records cancellation intent for only the expected logical request.
 * The marker is monotonic: subsequent stage and reconciliation writes preserve
 * it until that request is conditionally cleared.
 */
export async function markPendingAssessmentCancelled(requestId: string): Promise<boolean> {
  return serializeStorage(async () => {
    const current = await loadPendingUnsafe();
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
    const current = await loadPendingUnsafe();
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
    const current = await loadPendingUnsafe();
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
    const current = await loadPendingUnsafe();
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
