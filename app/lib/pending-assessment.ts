import * as SecureStore from "expo-secure-store";

import { isUuid } from "./params";

export type AssessmentEndpoint =
  | "/diagnostic/answer"
  | "/practice/attempt";

export interface PendingAssessment {
  ownerId: string;
  endpoint: AssessmentEndpoint;
  questionId: string;
  requestId: string;
  createdAt: number;
  delivery: "pending" | "reconcile";
}

const STORAGE_KEY = "pending_assessment_v1";
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: "ai-english-coach.pending-assessment",
};

let memoryValue: PendingAssessment | null = null;
let memoryLoaded = false;

export function parsePendingAssessment(
  value: unknown,
): PendingAssessment | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PendingAssessment>;
  if (
    !isUuid(candidate.ownerId) ||
    !isUuid(candidate.questionId) ||
    !isUuid(candidate.requestId) ||
    (candidate.endpoint !== "/diagnostic/answer" &&
      candidate.endpoint !== "/practice/attempt") ||
    typeof candidate.createdAt !== "number" ||
    !Number.isFinite(candidate.createdAt) ||
    candidate.createdAt <= 0
  ) {
    return null;
  }
  if (
    candidate.delivery !== undefined &&
    candidate.delivery !== "pending" &&
    candidate.delivery !== "reconcile"
  ) {
    return null;
  }
  return {
    ownerId: candidate.ownerId,
    endpoint: candidate.endpoint,
    questionId: candidate.questionId,
    requestId: candidate.requestId,
    createdAt: candidate.createdAt,
    // Backward-compatible with a pending record written by the immediately
    // preceding app build before the delivery marker was introduced.
    delivery: candidate.delivery ?? "pending",
  };
}

export async function savePendingAssessment(
  pending: PendingAssessment,
): Promise<void> {
  const parsed = parsePendingAssessment(pending);
  if (!parsed) throw new Error("Invalid pending assessment metadata");
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify(parsed),
    STORAGE_OPTIONS,
  );
  memoryValue = parsed;
  memoryLoaded = true;
}

export async function loadPendingAssessment(): Promise<PendingAssessment | null> {
  if (memoryLoaded) return memoryValue;
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch (error) {
    throw new Error("Secure pending-assessment storage is unavailable", {
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
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(
    () => undefined,
  );
  return null;
}

export async function clearPendingAssessment(
  expectedRequestId?: string,
): Promise<void> {
  const current = memoryValue ?? (await loadPendingAssessment());
  if (expectedRequestId && current?.requestId !== expectedRequestId) return;
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  memoryValue = null;
  memoryLoaded = true;
}

/**
 * Persist a handoff tombstone before UI delivery. If navigation, backgrounding,
 * or process death races delivery, the next focused screen refreshes canonical
 * state rather than polling/replaying or enabling another paid submission.
 */
export async function markPendingAssessmentForReconciliation(
  requestId: string,
): Promise<boolean> {
  const current = await loadPendingAssessment();
  if (!current || current.requestId !== requestId) return false;
  await savePendingAssessment({ ...current, delivery: "reconcile" });
  return true;
}
