import * as SecureStore from "expo-secure-store";

import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  parsePendingAssessment,
  savePendingAssessment,
  type PendingAssessment,
} from "../src/lib/pending-assessment";

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

// See api-test.ts for why fresh module graphs use require instead of import().
declare const require: (id: string) => unknown;

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

describe("pending assessment edge cases", () => {
  const STORAGE_KEY = "pending_assessment_v1";

  beforeEach(() => {
    mockStorage.clear();
  });

  // The module caches state in memory, so each scenario loads a fresh copy
  // against a fresh set of SecureStore mock functions.
  function loadFresh(): {
    secureStore: typeof SecureStore;
    mod: typeof import("../src/lib/pending-assessment");
  } {
    jest.resetModules();
    const secureStore = require("expo-secure-store") as typeof SecureStore;
    const mod = require("../src/lib/pending-assessment") as typeof import("../src/lib/pending-assessment");
    return { secureStore, mod };
  }

  it.each([
    { ...pending, createdAt: 0 },
    { ...pending, createdAt: Number.NaN },
    { ...pending, createdAt: Number.POSITIVE_INFINITY },
    { ...pending, createdAt: "yesterday" },
    { ...pending, delivery: "bogus" },
  ])("rejects malformed metadata %#", (value) => {
    expect(parsePendingAssessment(value)).toBeNull();
  });

  it("defaults a missing delivery marker and strips unknown fields", () => {
    const { delivery: _delivery, ...legacy } = pending;
    expect(parsePendingAssessment({ ...legacy, unexpected: "field" })).toEqual(
      pending,
    );
  });

  it("refuses to persist invalid metadata", async () => {
    const { secureStore, mod } = loadFresh();

    await expect(
      mod.savePendingAssessment({ ...pending, requestId: "not-a-uuid" }),
    ).rejects.toThrow("Invalid pending assessment metadata");
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it("serves loads from memory after a save", async () => {
    const { secureStore, mod } = loadFresh();

    await mod.savePendingAssessment(pending);

    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it("reads secure storage only once per process", async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));

    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it("deletes corrupt JSON and reports no pending assessment", async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, "{not-json");

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.objectContaining({
        keychainService: "ai-english-coach.pending-assessment",
      }),
    );
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
  });

  it("still reports null when deleting corrupt JSON fails", async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, "{not-json");
    jest
      .mocked(secureStore.deleteItemAsync)
      .mockRejectedValueOnce(new Error("keychain locked"));

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.has(STORAGE_KEY)).toBe(true);
  });

  it("deletes well-formed JSON with an invalid shape", async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify({ hello: "world" }));

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it("fails loudly when secure storage is unavailable", async () => {
    const { secureStore, mod } = loadFresh();
    jest
      .mocked(secureStore.getItemAsync)
      .mockRejectedValueOnce(new Error("keychain locked"));

    await expect(mod.loadPendingAssessment()).rejects.toThrow(
      "Secure pending-assessment storage is unavailable",
    );
  });

  it("keeps the record when the clear request id does not match", async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.deleteItemAsync).mockClear();

    await mod.clearPendingAssessment("different-request-id");

    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(mockStorage.has(STORAGE_KEY)).toBe(true);
  });

  it("clears the record when the request id matches", async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await mod.clearPendingAssessment(pending.requestId);

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.size).toBe(0);
  });

  it("clears unconditionally without an expected request id", async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await mod.clearPendingAssessment();

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.size).toBe(0);
  });

  it("loads from storage when clearing without an in-memory value", async () => {
    const { mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));

    await mod.clearPendingAssessment(pending.requestId);

    expect(mockStorage.size).toBe(0);
  });

  it("writes nothing when the reconciliation request id differs", async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(
      mod.markPendingAssessmentForReconciliation("other-request-id"),
    ).resolves.toBe(false);

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
  });

  it("marks a matching record for reconciliation in storage", async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await expect(
      mod.markPendingAssessmentForReconciliation(pending.requestId),
    ).resolves.toBe(true);

    const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? "{}") as {
      delivery?: string;
    };
    expect(stored.delivery).toBe("reconcile");
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      delivery: "reconcile",
    });
  });

  it("returns false when nothing is pending", async () => {
    const { secureStore, mod } = loadFresh();

    await expect(
      mod.markPendingAssessmentForReconciliation(pending.requestId),
    ).resolves.toBe(false);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
