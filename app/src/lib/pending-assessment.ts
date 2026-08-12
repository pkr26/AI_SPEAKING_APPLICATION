import * as SecureStore from 'expo-secure-store';

import { isUuid } from './params';

export type AssessmentEndpoint = '/diagnostic/answer' | '/practice/attempt';

export interface PendingAssessment {
  ownerId: string;
  endpoint: AssessmentEndpoint;
  questionId: string;
  requestId: string;
  createdAt: number;
  stage: 'prepared' | 'direct-posting' | 's3-granted' | 'reconcile';
  audioKey?: string;
}

const STORAGE_KEY = 'pending_assessment_v1';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.pending-assessment',
};

let memoryValue: PendingAssessment | null = null;
let memoryLoaded = false;
let storageQueue: Promise<void> = Promise.resolve();

function isOwnedAudioKey(ownerId: string, audioKey: string): boolean {
  const [prefix, keyOwnerId, filename, extra] = audioKey.split('/');
  return (
    extra === undefined &&
    prefix === 'audio-uploads' &&
    keyOwnerId === ownerId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(m4a|mp4|webm|wav)$/i.test(
      filename ?? '',
    )
  );
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
    (candidate.endpoint !== '/diagnostic/answer' && candidate.endpoint !== '/practice/attempt') ||
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
      !isOwnedAudioKey(candidate.ownerId, candidate.audioKey))
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

export async function loadPendingAssessment(): Promise<PendingAssessment | null> {
  return serializeStorage(loadPendingUnsafe);
}

export async function clearPendingAssessment(expectedRequestId?: string): Promise<void> {
  await serializeStorage(async () => {
    const current = await loadPendingUnsafe();
    if (expectedRequestId && current?.requestId !== expectedRequestId) return;
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
      ...(stage === 's3-granted' ? { audioKey } : { audioKey: undefined }),
    });
    if (!next) throw new Error('Invalid pending assessment metadata');
    await savePendingUnsafe(next);
    return true;
  });
}
