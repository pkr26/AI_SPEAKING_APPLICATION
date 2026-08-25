import * as SecureStore from 'expo-secure-store';

import { isUuid } from './params';
import { audioKeyBelongsToOwner, audioKeyMatchesAssessmentEndpoint } from './types';

export type AssessmentEndpoint =
  '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';

export interface PendingAssessment {
  ownerId: string;
  endpoint: AssessmentEndpoint;
  questionId: string;
  requestId: string;
  createdAt: number;
  stage: 'prepared' | 'direct-posting' | 's3-granted' | 'reconcile';
  audioKey?: string;
  cancelRequested?: boolean;
  recoveryPostAttempts?: number;
}

const STORAGE_KEY = 'pending_assessment_v1';
const MAX_STORED_RECOVERY_POST_ATTEMPTS = 3;
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.pending-assessment',
};

let memoryValue: PendingAssessment | null = null;
let memoryLoaded = false;
let storageQueue: Promise<void> = Promise.resolve();
// An unconditional clear is an account/session boundary. Bump this before its
// queued SecureStore delete begins so a create that was already waiting on a
// slow read cannot repopulate the slot after logout considers cleanup complete.
let unconditionalClearGeneration = 0;

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
  if (
    candidate.stage !== undefined &&
    candidate.stage !== 'prepared' &&
    candidate.stage !== 'direct-posting' &&
    candidate.stage !== 's3-granted' &&
    candidate.stage !== 'reconcile'
  ) {
    return null;
  }
  if (candidate.cancelRequested !== undefined && typeof candidate.cancelRequested !== 'boolean') {
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
    requestId: candidate.requestId,
    createdAt: candidate.createdAt,
    stage,
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
    await savePendingUnsafe({
      ...current,
      stage: 'reconcile',
      audioKey: undefined,
    });
    return true;
  });
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
    const next = parsePendingAssessment({
      ...current,
      stage,
      // The parser is the single normalization boundary: it requires the key
      // for S3 and strips it from every other stage.
      audioKey,
    });
    if (!next) throw new Error('Invalid pending assessment metadata');
    await savePendingUnsafe(next);
    return true;
  });
}
