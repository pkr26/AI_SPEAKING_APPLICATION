import * as SecureStore from "expo-secure-store";

import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  savePendingAssessment,
  type PendingAssessment,
} from "../lib/pending-assessment";

const mockStorage = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
  getItemAsync: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
}));

const pending: PendingAssessment = {
  ownerId: "550e8400-e29b-41d4-a716-446655440000",
  endpoint: "/practice/attempt",
  questionId: "550e8400-e29b-41d4-a716-446655440001",
  requestId: "550e8400-e29b-41d4-a716-446655440002",
  createdAt: 1_700_000_000_000,
  delivery: "pending",
};

describe("durable assessment handoff", () => {
  it("persists a reconciliation tombstone before clearing a delivered result", async () => {
    await savePendingAssessment(pending);
    expect(await loadPendingAssessment()).toEqual(pending);

    await expect(
      markPendingAssessmentForReconciliation(pending.requestId),
    ).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      delivery: "reconcile",
    });

    await clearPendingAssessment(pending.requestId);
    expect(await loadPendingAssessment()).toBeNull();
  });

  it("keeps the tombstone in memory when secure deletion fails", async () => {
    await savePendingAssessment({ ...pending, delivery: "reconcile" });
    jest
      .mocked(SecureStore.deleteItemAsync)
      .mockRejectedValueOnce(new Error("keychain unavailable"));

    await expect(clearPendingAssessment(pending.requestId)).rejects.toThrow(
      "keychain unavailable",
    );
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      delivery: "reconcile",
    });

    await clearPendingAssessment(pending.requestId);
  });
});
