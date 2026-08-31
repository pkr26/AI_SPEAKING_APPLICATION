import * as SecureStore from 'expo-secure-store';

import {
  acknowledgePendingAssessmentFeedback,
  claimPendingAssessmentRecoveryPost,
  clearPendingAssessment,
  clearPendingAssessmentIfRequestMatches,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentFeedbackPending,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  notifyPendingAssessmentReplayReady,
  parsePendingAssessment,
  pendingAssessmentFeedbackIsExpired,
  PENDING_ASSESSMENT_ENDPOINTS,
  PENDING_ASSESSMENT_STAGES,
  PENDING_ASSESSMENT_SCHEMA_VERSION,
  PENDING_FEEDBACK_RETENTION_MS,
  savePendingAssessment,
  subscribeToPendingAssessmentReplay,
  type PendingAssessment,
} from '../src/lib/pending-assessment';

const mockStorage = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function expectBarrierBeforeSettlement<T>(
  barrier: Promise<void>,
  operation: Promise<T>,
): Promise<void> {
  await Promise.race([
    barrier,
    Promise.resolve(operation).then(
      () => {
        throw new Error('operation settled before reaching the test barrier');
      },
      (error: unknown) => {
        throw error;
      },
    ),
  ]);
}

const pending: PendingAssessment = {
  ownerId: '550e8400-e29b-41d4-a716-446655440000',
  endpoint: '/practice/attempt',
  questionId: '550e8400-e29b-41d4-a716-446655440001',
  cycleId: '550e8400-e29b-41d4-a716-446655440020',
  requestId: '550e8400-e29b-41d4-a716-446655440002',
  createdAt: 1_700_000_000_000,
  retainRecording: false,
  stage: 'direct-posting',
};
const audioKey =
  'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440003.m4a';

function pendingForEndpoint(endpoint: PendingAssessment['endpoint']): PendingAssessment {
  if (endpoint !== '/diagnostic/answer') return { ...pending, endpoint };
  const { cycleId: _cycleId, ...diagnostic } = pending;
  return { ...diagnostic, endpoint };
}

describe('durable assessment handoff', () => {
  it('notifies only live same-session replay subscribers and validates request identity', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToPendingAssessmentReplay(listener);

    expect(notifyPendingAssessmentReplayReady(pending.requestId)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(notifyPendingAssessmentReplayReady(pending.requestId)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => notifyPendingAssessmentReplayReady('not-a-uuid')).toThrow(
      'requestId must be a UUID',
    );
  });

  // The module keeps an in-memory copy, so reset through the public API:
  // clearing only the SecureStore mock would leave stale cached state behind.
  beforeEach(async () => {
    await clearPendingAssessment();
    mockStorage.clear();
  });

  it('persists a reconciliation tombstone before clearing a delivered result', async () => {
    await savePendingAssessment(pending);
    expect(await loadPendingAssessment()).toEqual(pending);

    await expect(markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'reconcile',
    });

    await clearPendingAssessment(pending.requestId);
    expect(await loadPendingAssessment()).toBeNull();
  });

  it('reports whether a request-conditional retirement actually removed the slot', async () => {
    await savePendingAssessment(pending);

    await expect(
      clearPendingAssessmentIfRequestMatches('550e8400-e29b-41d4-a716-446655440099'),
    ).resolves.toBe(false);
    expect(await loadPendingAssessment()).toEqual(pending);
    await expect(clearPendingAssessmentIfRequestMatches('not-a-uuid')).resolves.toBe(false);
    await expect(clearPendingAssessmentIfRequestMatches(pending.requestId)).resolves.toBe(true);
    expect(await loadPendingAssessment()).toBeNull();
  });

  it('keeps a server-replay pointer until the exact learner acknowledges feedback', async () => {
    const readyAt = pending.createdAt + 5_000;
    await savePendingAssessment({
      ...pending,
      stage: 's3-granted',
      audioKey,
      cancelRequested: true,
      recoveryPostAttempts: 1,
    });

    await expect(markPendingAssessmentFeedbackPending(pending.requestId, readyAt)).resolves.toBe(
      true,
    );
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt: readyAt,
      cancelRequested: true,
      recoveryPostAttempts: 1,
    });

    await expect(
      acknowledgePendingAssessmentFeedback(
        '550e8400-e29b-41d4-a716-446655440099',
        pending.requestId,
      ),
    ).resolves.toBe(false);
    await expect(
      acknowledgePendingAssessmentFeedback(pending.ownerId, pending.requestId),
    ).resolves.toBe(true);
    expect(await loadPendingAssessment()).toBeNull();
  });

  it('keeps feedback pending when its secure acknowledgement delete fails', async () => {
    const readyAt = pending.createdAt + 1;
    await savePendingAssessment({
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt: readyAt,
    });
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('keychain locked'));

    await expect(
      acknowledgePendingAssessmentFeedback(pending.ownerId, pending.requestId),
    ).rejects.toThrow('keychain locked');
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt: readyAt,
    });

    await clearPendingAssessment();
  });

  it('expires feedback from handoff creation so delayed discovery cannot outlive server replay', () => {
    const readyAt = pending.createdAt + 25 * 60 * 60_000;
    const feedbackPending: PendingAssessment = {
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt: readyAt,
    };

    expect(
      pendingAssessmentFeedbackIsExpired(
        feedbackPending,
        pending.createdAt + PENDING_FEEDBACK_RETENTION_MS - 1,
      ),
    ).toBe(false);
    expect(
      pendingAssessmentFeedbackIsExpired(
        feedbackPending,
        pending.createdAt + PENDING_FEEDBACK_RETENTION_MS,
      ),
    ).toBe(true);
    expect(
      pendingAssessmentFeedbackIsExpired(feedbackPending, readyAt + PENDING_FEEDBACK_RETENTION_MS),
    ).toBe(true);
    expect(pendingAssessmentFeedbackIsExpired(pending, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('preserves durable cancellation and recovery claims through stage and reconciliation updates', async () => {
    await savePendingAssessment({ ...pending, stage: 'prepared' });

    await expect(claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    await expect(markPendingAssessmentCancelled(pending.requestId)).resolves.toBe(true);
    await expect(
      markPendingAssessmentStage(pending.requestId, 's3-granted', audioKey),
    ).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 's3-granted',
      audioKey,
      cancelRequested: true,
      recoveryPostAttempts: 1,
    });

    await expect(markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'reconcile',
      cancelRequested: true,
      recoveryPostAttempts: 1,
    });
  });

  it('keeps a successful clear authoritative in the instrumented module cache', async () => {
    await savePendingAssessment(pending);
    await clearPendingAssessment(pending.requestId);

    const getItem = jest.mocked(SecureStore.getItemAsync);
    const originalImplementation = getItem.getMockImplementation();
    getItem.mockClear();
    getItem.mockRejectedValue(new Error('a stale secure-store read must not occur'));
    try {
      await expect(loadPendingAssessment()).resolves.toBeNull();
      expect(getItem).not.toHaveBeenCalled();
    } finally {
      getItem.mockReset();
      if (originalImplementation) getItem.mockImplementation(originalImplementation);
    }
  });

  it('drops a stale S3 key when the stage falls back to a direct post', async () => {
    // The caller may pass an audioKey with either stage; only s3-granted may
    // keep one, otherwise a dead object key would outlive its grant.
    await savePendingAssessment({ ...pending, stage: 's3-granted', audioKey });

    await expect(
      markPendingAssessmentStage(pending.requestId, 'direct-posting', audioKey),
    ).resolves.toBe(true);

    expect(await loadPendingAssessment()).toEqual({ ...pending, stage: 'direct-posting' });
  });

  it('replaces the stored S3 key when a fresh grant supersedes it', async () => {
    const supersedingKey =
      'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440004.m4a';
    await savePendingAssessment({ ...pending, stage: 's3-granted', audioKey });

    await expect(
      markPendingAssessmentStage(pending.requestId, 's3-granted', supersedingKey),
    ).resolves.toBe(true);

    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 's3-granted',
      audioKey: supersedingKey,
    });
  });

  it('persists the S3 key before upload and removes it when reconciling', async () => {
    await savePendingAssessment({ ...pending, stage: 'prepared' });

    await expect(
      markPendingAssessmentStage(pending.requestId, 's3-granted', audioKey),
    ).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 's3-granted',
      audioKey,
    });

    await expect(markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(true);
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'reconcile',
    });
  });

  it('keeps the tombstone in memory when secure deletion fails', async () => {
    await savePendingAssessment({ ...pending, stage: 'reconcile' });
    jest
      .mocked(SecureStore.deleteItemAsync)
      .mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(clearPendingAssessment(pending.requestId)).rejects.toThrow('keychain unavailable');
    expect(await loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'reconcile',
    });

    await clearPendingAssessment(pending.requestId);
  });
});

describe('pending assessment edge cases', () => {
  const STORAGE_KEY = 'pending_assessment_v1';

  beforeEach(() => {
    mockStorage.clear();
  });

  // The module caches state in memory, so each scenario loads a fresh copy
  // against a fresh set of SecureStore mock functions.
  function loadFresh(): {
    secureStore: typeof SecureStore;
    mod: typeof import('../src/lib/pending-assessment');
  } {
    jest.resetModules();
    const secureStore = require('expo-secure-store') as typeof SecureStore;
    const mod =
      require('../src/lib/pending-assessment') as typeof import('../src/lib/pending-assessment');
    return { secureStore, mod };
  }

  it.each([null, undefined, false, true, 0, 1, 'pending', Symbol('pending')])(
    'rejects primitive metadata %# without throwing',
    (value) => {
      expect(parsePendingAssessment(value)).toBeNull();
    },
  );

  it('rejects callable metadata even when it exposes every valid field', () => {
    const callable = () => undefined;
    for (const [key, value] of Object.entries(pending)) {
      Object.defineProperty(callable, key, { configurable: true, enumerable: true, value });
    }

    expect(parsePendingAssessment(callable)).toBeNull();
  });

  it.each([
    { ...pending, createdAt: 0 },
    { ...pending, createdAt: Number.NaN },
    { ...pending, createdAt: Number.POSITIVE_INFINITY },
    { ...pending, createdAt: 'yesterday' },
    { ...pending, stage: 'bogus' },
    { ...pending, stage: 'feedback-pending' },
    { ...pending, stage: 'feedback-pending', feedbackReadyAt: 0 },
    { ...pending, stage: 'feedback-pending', feedbackReadyAt: pending.createdAt - 1 },
    { ...pending, stage: 'feedback-pending', feedbackReadyAt: pending.createdAt + 0.5 },
    { ...pending, stage: 'direct-posting', feedbackReadyAt: pending.createdAt + 1 },
    { ...pending, stage: 's3-granted' },
    { ...pending, stage: 's3-granted', audioKey: '' },
    { ...pending, stage: 's3-granted', audioKey: [audioKey] },
    { ...pending, stage: 's3-granted', audioKey: '../another-user/a.m4a' },
    {
      ...pending,
      stage: 's3-granted',
      audioKey:
        'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440099/550e8400-e29b-41d4-a716-446655440003.m4a',
    },
    {
      ...pending,
      stage: 's3-granted',
      audioKey:
        'other-uploads/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440003.m4a',
    },
    { ...pending, stage: 's3-granted', audioKey: `${audioKey}/extra` },
    { ...pending, stage: 's3-granted', audioKey: `${audioKey}.bak` },
    {
      ...pending,
      stage: 's3-granted',
      audioKey:
        'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/prefix-550e8400-e29b-41d4-a716-446655440003.m4a',
    },
    { ...pending, delivery: 'unknown' },
    { ...pending, cancelRequested: null },
    { ...pending, cancelRequested: 0 },
    { ...pending, cancelRequested: 1 },
    { ...pending, cancelRequested: 'true' },
    { ...pending, cancelRequested: {} },
    { ...pending, retainRecording: null },
    { ...pending, retainRecording: 0 },
    { ...pending, retainRecording: 'false' },
    { ...pending, recoveryPostAttempts: null },
    { ...pending, recoveryPostAttempts: -1 },
    { ...pending, recoveryPostAttempts: 1.5 },
    { ...pending, recoveryPostAttempts: 4 },
    { ...pending, recoveryPostAttempts: Number.NaN },
    { ...pending, recoveryPostAttempts: Number.POSITIVE_INFINITY },
    { ...pending, recoveryPostAttempts: '1' },
  ])('rejects malformed metadata %#', (value) => {
    expect(parsePendingAssessment(value)).toBeNull();
  });

  it('normalizes a pre-choice handoff to the legacy retain-audio identity', () => {
    const { retainRecording: _retainRecording, ...legacy } = pending;

    expect(parsePendingAssessment(legacy)).toEqual({ ...pending, retainRecording: true });
  });

  it.each(['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'] as const)(
    'accepts the server assessment endpoint %s',
    (endpoint) => {
      const value = pendingForEndpoint(endpoint);
      expect(parsePendingAssessment(value)).toEqual(value);
    },
  );

  it.each(['/practice/answer', '/practice/attempt/phonetic', '/attempt', ''])(
    'rejects the unknown assessment endpoint %p',
    (endpoint) => {
      expect(parsePendingAssessment({ ...pending, endpoint })).toBeNull();
    },
  );

  it('upgrades a legacy pending delivery marker', () => {
    const { stage: _stage, ...legacy } = pending;
    expect(parsePendingAssessment({ ...legacy, delivery: 'pending' })).toEqual(pending);
    expect(parsePendingAssessment({ ...legacy, delivery: 'reconcile' })).toEqual({
      ...pending,
      stage: 'reconcile',
    });
  });

  it('accepts legacy metadata without a cancellation marker and preserves explicit booleans', () => {
    expect(parsePendingAssessment(pending)).toEqual(pending);
    expect(parsePendingAssessment({ ...pending, cancelRequested: false })).toEqual({
      ...pending,
      cancelRequested: false,
    });
    expect(parsePendingAssessment({ ...pending, cancelRequested: true })).toEqual({
      ...pending,
      cancelRequested: true,
    });
  });

  it('accepts a missing legacy recovery counter and every bounded integer value', () => {
    const withoutOptionalFields = parsePendingAssessment(pending);
    expect(withoutOptionalFields).toEqual(pending);
    expect(Object.hasOwn(withoutOptionalFields!, 'cancelRequested')).toBe(false);
    expect(Object.hasOwn(withoutOptionalFields!, 'recoveryPostAttempts')).toBe(false);
    for (const recoveryPostAttempts of [0, 1, 2, 3]) {
      expect(parsePendingAssessment({ ...pending, recoveryPostAttempts })).toEqual({
        ...pending,
        recoveryPostAttempts,
      });
    }
  });

  it.each(['prepared', 'direct-posting', 'reconcile'] as const)(
    'strips an S3 key from the non-S3 stage %s',
    (stage) => {
      const parsed = parsePendingAssessment({ ...pending, stage, audioKey });

      expect(parsed).toEqual({ ...pending, stage });
      expect(parsed).not.toHaveProperty('audioKey');
    },
  );

  it('accepts a feedback pointer without audio metadata', () => {
    const feedbackReadyAt = pending.createdAt + 1;
    expect(
      parsePendingAssessment({
        ...pending,
        stage: 'feedback-pending',
        feedbackReadyAt,
        audioKey,
      }),
    ).toEqual({
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt,
    });
  });

  it('accepts an owned S3 key case-insensitively', () => {
    const uppercaseFilenameKey = `${audioKey.slice(0, audioKey.lastIndexOf('/') + 1)}${audioKey
      .slice(audioKey.lastIndexOf('/') + 1)
      .toUpperCase()}`;
    expect(
      parsePendingAssessment({
        ...pending,
        stage: 's3-granted',
        audioKey: uppercaseFilenameKey,
      }),
    ).toEqual({ ...pending, stage: 's3-granted', audioKey: uppercaseFilenameKey });
  });

  it.each([
    ['/diagnostic/answer', 'diagnostic'],
    ['/practice/attempt', 'practice'],
    ['/practice/attempt/native', 'practice'],
  ] as const)('requires endpoint %s to match the durable %s key scope', (endpoint, scope) => {
    const endpointPending = pendingForEndpoint(endpoint);
    const matchingKey = `audio-uploads/${scope}/${pending.ownerId}/550e8400-e29b-41d4-a716-446655440003.m4a`;
    const otherScope = scope === 'diagnostic' ? 'practice' : 'diagnostic';
    const mismatchedKey = `audio-uploads/${otherScope}/${pending.ownerId}/550e8400-e29b-41d4-a716-446655440003.m4a`;

    expect(
      parsePendingAssessment({
        ...endpointPending,
        stage: 's3-granted',
        audioKey: matchingKey,
      }),
    ).toEqual({ ...endpointPending, stage: 's3-granted', audioKey: matchingKey });
    expect(
      parsePendingAssessment({
        ...endpointPending,
        stage: 's3-granted',
        audioKey: mismatchedKey,
      }),
    ).toBeNull();
  });

  it('refuses to persist invalid metadata', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(
      mod.savePendingAssessment({ ...pending, requestId: 'not-a-uuid' }),
    ).rejects.toThrow('Invalid pending assessment metadata');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it('serves loads from memory after a save', async () => {
    const { secureStore, mod } = loadFresh();

    await mod.savePendingAssessment(pending);

    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('reads secure storage only once per process', async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));

    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('does not issue a delete for empty secure storage and caches the empty result', async () => {
    const { secureStore, mod } = loadFresh();

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('deletes corrupt JSON and reports no pending assessment', async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, '{not-json');

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.objectContaining({
        keychainService: 'ai-english-coach.pending-assessment',
      }),
    );
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
  });

  it('still reports null when deleting corrupt JSON fails', async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, '{not-json');
    jest.mocked(secureStore.deleteItemAsync).mockRejectedValueOnce(new Error('keychain locked'));

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.has(STORAGE_KEY)).toBe(true);
  });

  it('deletes well-formed JSON with an invalid shape', async () => {
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify({ hello: 'world' }));

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it('fails loudly when secure storage is unavailable', async () => {
    const { secureStore, mod } = loadFresh();
    const cause = new Error('keychain locked');
    jest.mocked(secureStore.getItemAsync).mockRejectedValueOnce(cause);

    await expect(mod.loadPendingAssessment()).rejects.toMatchObject({
      message: 'Secure pending-assessment storage is unavailable',
      cause,
    });
  });

  it('keeps the record when the clear request id does not match', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.deleteItemAsync).mockClear();

    await mod.clearPendingAssessment('different-request-id');

    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(mockStorage.has(STORAGE_KEY)).toBe(true);
  });

  it('does not delete or throw when an expected request id has no pending record', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.clearPendingAssessment(pending.requestId)).resolves.toBeUndefined();

    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it('clears the record when the request id matches', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await mod.clearPendingAssessment(pending.requestId);

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.size).toBe(0);

    // A completed clear is authoritative for this process. Do not resurrect a
    // stale value from a later external write to the same keychain slot.
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));
    jest.mocked(secureStore.getItemAsync).mockClear();
    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('clears unconditionally without an expected request id', async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await mod.clearPendingAssessment();

    expect(await mod.loadPendingAssessment()).toBeNull();
    expect(mockStorage.size).toBe(0);
  });

  it('deletes an unreadable record when no request id is expected', async () => {
    // An undecryptable but deletable entry (an Android backup restored without
    // its Keystore key) has to be healed here: gating the unconditional delete
    // on a read would make session-expiry cleanup fail and block the next login.
    const { secureStore, mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));
    jest.mocked(secureStore.getItemAsync).mockRejectedValue(new Error('keychain locked'));

    await expect(mod.clearPendingAssessment()).resolves.toBeUndefined();

    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    await expect(mod.loadPendingAssessment()).resolves.toBeNull();
  });

  it('loads from storage when clearing without an in-memory value', async () => {
    const { mod } = loadFresh();
    mockStorage.set(STORAGE_KEY, JSON.stringify(pending));

    await mod.clearPendingAssessment(pending.requestId);

    expect(mockStorage.size).toBe(0);
  });

  it('writes nothing when the reconciliation request id differs', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(mod.markPendingAssessmentForReconciliation('other-request-id')).resolves.toBe(
      false,
    );

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
  });

  it('never downgrades delivered feedback into reconciliation or upload recovery', async () => {
    const { secureStore, mod } = loadFresh();
    const feedbackPending = {
      ...pending,
      stage: 'feedback-pending' as const,
      feedbackReadyAt: pending.createdAt + 1,
    };
    await mod.savePendingAssessment(feedbackPending);
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(mod.markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(
      false,
    );
    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(false);
    await expect(mod.markPendingAssessmentStage(pending.requestId, 'direct-posting')).resolves.toBe(
      false,
    );

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(feedbackPending);
  });

  it('rejects invalid feedback timestamps and normalizes a backward wall-clock correction', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.markPendingAssessmentFeedbackPending(pending.requestId, 0)).rejects.toThrow(
      'feedbackReadyAt must be a positive safe integer',
    );
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(
      mod.markPendingAssessmentFeedbackPending(pending.requestId, pending.createdAt - 1),
    ).resolves.toBe(true);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'feedback-pending',
      feedbackReadyAt: pending.createdAt,
    });
  });

  it('conditionally acknowledges only a feedback-pending request', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.deleteItemAsync).mockClear();

    await expect(
      mod.acknowledgePendingAssessmentFeedback(pending.ownerId, pending.requestId),
    ).resolves.toBe(false);
    await expect(
      mod.acknowledgePendingAssessmentFeedback('not-a-user', pending.requestId),
    ).resolves.toBe(false);
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('marks feedback only for the matching request and treats a repeat as idempotent', async () => {
    const { secureStore, mod } = loadFresh();
    const readyAt = pending.createdAt + 1;

    await expect(
      mod.markPendingAssessmentFeedbackPending(pending.requestId, readyAt),
    ).resolves.toBe(false);
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(
      mod.markPendingAssessmentFeedbackPending('different-request-id', readyAt),
    ).resolves.toBe(false);
    await expect(
      mod.markPendingAssessmentFeedbackPending(pending.requestId, readyAt),
    ).resolves.toBe(true);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(
      mod.markPendingAssessmentFeedbackPending(pending.requestId, readyAt + 1),
    ).resolves.toBe(true);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid feedback expiry time %p',
    (now) => {
      expect(() => pendingAssessmentFeedbackIsExpired(pending, now)).toThrow(
        'now must be a positive safe integer',
      );
    },
  );

  it('marks a matching record for reconciliation in storage', async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await expect(mod.markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(true);

    const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}') as {
      stage?: string;
    };
    expect(stored.stage).toBe('reconcile');
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      stage: 'reconcile',
    });
  });

  it('returns false when nothing is pending', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.markPendingAssessmentForReconciliation(pending.requestId)).resolves.toBe(
      false,
    );
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('marks only the matching pending request as cancelled in memory and secure storage', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(mod.markPendingAssessmentCancelled('different-request-id')).resolves.toBe(false);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);

    await expect(mod.markPendingAssessmentCancelled(pending.requestId)).resolves.toBe(true);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      cancelRequested: true,
    });
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual({
      ...pending,
      cancelRequested: true,
    });
  });

  it('returns false without writing when cancellation has no pending record', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.markPendingAssessmentCancelled(pending.requestId)).resolves.toBe(false);

    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('treats repeated cancellation of the same request as an idempotent success', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await expect(mod.markPendingAssessmentCancelled(pending.requestId)).resolves.toBe(true);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(mod.markPendingAssessmentCancelled(pending.requestId)).resolves.toBe(true);

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      cancelRequested: true,
    });
  });

  it('claims at most one recovery POST by default and persists the counter', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(false);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 1,
    });
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual({
      ...pending,
      recoveryPostAttempts: 1,
    });
  });

  it('honors bounded custom recovery POST limits', async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);

    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId, 3)).resolves.toBe(true);
    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId, 3)).resolves.toBe(true);
    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId, 3)).resolves.toBe(true);
    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId, 3)).resolves.toBe(false);

    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 3,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 4, Number.MAX_SAFE_INTEGER + 1])(
    'rejects the invalid recovery POST maximum %p before storage access',
    async (maxAttempts) => {
      const { secureStore, mod } = loadFresh();

      await expect(
        mod.claimPendingAssessmentRecoveryPost(pending.requestId, maxAttempts),
      ).rejects.toThrow('maxAttempts must be a positive safe integer no greater than 3');
      expect(secureStore.getItemAsync).not.toHaveBeenCalled();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    },
  );

  it('does not claim for an absent or stale pending request', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(false);
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(mod.claimPendingAssessmentRecoveryPost('different-request-id')).resolves.toBe(
      false,
    );

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
  });

  it('refunds a matching recovery claim without crossing below zero', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment({ ...pending, recoveryPostAttempts: 2 });
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 0,
    });
  });

  it('does not refund an absent or stale pending request', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(false);
    await mod.savePendingAssessment({ ...pending, recoveryPostAttempts: 1 });
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(mod.refundPendingAssessmentRecoveryPost('different-request-id')).resolves.toBe(
      false,
    );

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 1,
    });
  });

  it('does not advance an absent or different pending request', async () => {
    const { secureStore, mod } = loadFresh();

    await expect(mod.markPendingAssessmentStage(pending.requestId, 'direct-posting')).resolves.toBe(
      false,
    );
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockClear();
    await expect(
      mod.markPendingAssessmentStage('different-request-id', 'direct-posting'),
    ).resolves.toBe(false);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual(pending);
  });

  it('removes the S3 key when a matching request returns to direct posting', async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment({ ...pending, stage: 's3-granted', audioKey });

    await expect(mod.markPendingAssessmentStage(pending.requestId, 'direct-posting')).resolves.toBe(
      true,
    );

    const current = await mod.loadPendingAssessment();
    expect(current).toEqual(pending);
    expect(current).not.toHaveProperty('audioKey');
  });

  it('rejects an invalid S3 transition without overwriting the durable record', async () => {
    const { secureStore, mod } = loadFresh();
    await mod.savePendingAssessment({ ...pending, stage: 'prepared' });
    jest.mocked(secureStore.setItemAsync).mockClear();

    await expect(
      mod.markPendingAssessmentStage(
        pending.requestId,
        's3-granted',
        'audio-uploads/another-user/not-owned.m4a',
      ),
    ).rejects.toThrow('Invalid pending assessment metadata');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await mod.loadPendingAssessment()).toEqual({ ...pending, stage: 'prepared' });
  });

  it('atomically lets only the first of two concurrent creators install a handoff', async () => {
    const { secureStore, mod } = loadFresh();
    const first = { ...pending, stage: 'prepared' as const };
    const second = {
      ...first,
      requestId: '550e8400-e29b-41d4-a716-446655440004',
    };
    const setItem = jest.mocked(secureStore.setItemAsync);
    setItem.mockClear();
    const generation = mod.capturePendingAssessmentGeneration();

    const creatingFirst = mod.ensurePendingAssessment(first, generation);
    const creatingSecond = mod.ensurePendingAssessment(second, generation);

    await expect(Promise.all([creatingFirst, creatingSecond])).resolves.toEqual([first, first]);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(await mod.loadPendingAssessment()).toEqual(first);
  });

  it('does not recreate a handoff when an unconditional clear starts during its deferred read', async () => {
    const { secureStore, mod } = loadFresh();
    const read = deferred<string | null>();
    const getItem = jest.mocked(secureStore.getItemAsync);
    const setItem = jest.mocked(secureStore.setItemAsync);
    const deleteItem = jest.mocked(secureStore.deleteItemAsync);
    getItem.mockImplementationOnce(async () => read.promise);
    setItem.mockClear();
    deleteItem.mockClear();
    const generation = mod.capturePendingAssessmentGeneration();
    const candidate = { ...pending, stage: 'prepared' as const };

    const creating = mod.ensurePendingAssessment(candidate, generation);
    await Promise.resolve();
    const readsBeforeClear = getItem.mock.calls.length;
    const clearing = mod.clearPendingAssessment();
    const generationAfterClear = mod.capturePendingAssessmentGeneration();

    read.resolve(null);
    await expect(creating).resolves.toBeNull();
    await expect(clearing).resolves.toBeUndefined();

    expect(readsBeforeClear).toBe(1);
    expect(generationAfterClear).toBe(generation + 1);
    expect(setItem).not.toHaveBeenCalled();
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(await mod.loadPendingAssessment()).toBeNull();
  });

  it('rejects an invalid atomic candidate before touching secure storage', async () => {
    const { secureStore, mod } = loadFresh();
    const getItem = jest.mocked(secureStore.getItemAsync);
    const setItem = jest.mocked(secureStore.setItemAsync);
    getItem.mockClear();
    setItem.mockClear();

    await expect(
      mod.ensurePendingAssessment(
        { ...pending, requestId: 'not-a-request-id' },
        mod.capturePendingAssessmentGeneration(),
      ),
    ).rejects.toThrow('Invalid pending assessment metadata');
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('rejects an already stale creator before reading or writing secure storage', async () => {
    const { secureStore, mod } = loadFresh();
    const staleGeneration = mod.capturePendingAssessmentGeneration();
    await mod.clearPendingAssessment();
    const getItem = jest.mocked(secureStore.getItemAsync);
    const setItem = jest.mocked(secureStore.setItemAsync);
    getItem.mockClear();
    setItem.mockClear();

    await expect(
      mod.ensurePendingAssessment({ ...pending, stage: 'prepared' }, staleGeneration),
    ).resolves.toBeNull();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('rejects a creator made stale by a failed unconditional clear without reading storage', async () => {
    const { secureStore, mod } = loadFresh();
    const staleGeneration = mod.capturePendingAssessmentGeneration();
    const deleteItem = jest.mocked(secureStore.deleteItemAsync);
    deleteItem.mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(mod.clearPendingAssessment()).rejects.toThrow('keychain unavailable');
    const getItem = jest.mocked(secureStore.getItemAsync);
    const setItem = jest.mocked(secureStore.setItemAsync);
    getItem.mockClear();
    setItem.mockClear();

    await expect(
      mod.ensurePendingAssessment({ ...pending, stage: 'prepared' }, staleGeneration),
    ).resolves.toBeNull();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('suppresses a creator whose secure write is overtaken by an unconditional clear', async () => {
    const { secureStore, mod } = loadFresh();
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    const setItem = jest.mocked(secureStore.setItemAsync);
    setItem.mockImplementationOnce(async (key: string, value: string) => {
      writeStarted.resolve();
      await allowWrite.promise;
      mockStorage.set(key, value);
    });
    const generation = mod.capturePendingAssessmentGeneration();
    const candidate = { ...pending, stage: 'prepared' as const };

    const creating = mod.ensurePendingAssessment(candidate, generation);
    await expectBarrierBeforeSettlement(writeStarted.promise, creating);
    const clearing = mod.clearPendingAssessment();
    allowWrite.resolve();

    await expect(creating).resolves.toBeNull();
    await expect(clearing).resolves.toBeUndefined();
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
  });

  it('does not invalidate creators when conditionally clearing one request', async () => {
    const { mod } = loadFresh();
    await mod.savePendingAssessment(pending);
    const generation = mod.capturePendingAssessmentGeneration();

    await mod.clearPendingAssessment(pending.requestId);

    expect(mod.capturePendingAssessmentGeneration()).toBe(generation);
  });

  it('serializes a deferred save before a concurrently requested clear', async () => {
    const { secureStore, mod } = loadFresh();
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    const storageEvents: string[] = [];
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('save-started');
        writeStarted.resolve();
        await allowWrite.promise;
        mockStorage.set(key, value);
        storageEvents.push('save-finished');
      });
    jest.mocked(secureStore.deleteItemAsync).mockImplementationOnce(async (key: string) => {
      storageEvents.push('cleared');
      mockStorage.delete(key);
    });

    const saving = mod.savePendingAssessment(pending);
    await expectBarrierBeforeSettlement(writeStarted.promise, saving);
    const clearing = mod.clearPendingAssessment(pending.requestId);

    expect(storageEvents).toEqual(['save-started']);
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();

    allowWrite.resolve();
    await expect(Promise.all([saving, clearing])).resolves.toEqual([undefined, undefined]);

    expect(storageEvents).toEqual(['save-started', 'save-finished', 'cleared']);
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    await expect(mod.loadPendingAssessment()).resolves.toBeNull();
  });

  it('atomically allows only one of two concurrent default recovery claims', async () => {
    const { secureStore, mod } = loadFresh();
    const claimWriteStarted = deferred<void>();
    const allowClaimWrite = deferred<void>();
    await mod.savePendingAssessment(pending);
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        claimWriteStarted.resolve();
        await allowClaimWrite.promise;
        mockStorage.set(key, value);
      });

    const firstClaim = mod.claimPendingAssessmentRecoveryPost(pending.requestId);
    await expectBarrierBeforeSettlement(claimWriteStarted.promise, firstClaim);
    const secondClaim = mod.claimPendingAssessmentRecoveryPost(pending.requestId);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2); // Initial save plus first claim.
    allowClaimWrite.resolve();
    await expect(Promise.all([firstClaim, secondClaim])).resolves.toEqual([true, false]);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 1,
    });
  });

  it('orders a concurrent refund after its in-flight recovery claim', async () => {
    const { secureStore, mod } = loadFresh();
    const claimWriteStarted = deferred<void>();
    const allowClaimWrite = deferred<void>();
    const storageEvents: string[] = [];
    await mod.savePendingAssessment(pending);
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('claim-started');
        claimWriteStarted.resolve();
        await allowClaimWrite.promise;
        mockStorage.set(key, value);
        storageEvents.push('claim-finished');
      })
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('refunded');
        mockStorage.set(key, value);
      });

    const claim = mod.claimPendingAssessmentRecoveryPost(pending.requestId);
    await expectBarrierBeforeSettlement(claimWriteStarted.promise, claim);
    const refund = mod.refundPendingAssessmentRecoveryPost(pending.requestId);

    expect(storageEvents).toEqual(['claim-started']);
    allowClaimWrite.resolve();
    await expect(Promise.all([claim, refund])).resolves.toEqual([true, true]);

    expect(storageEvents).toEqual(['claim-started', 'claim-finished', 'refunded']);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 0,
    });
  });

  it('keeps the counter unchanged after a failed recovery claim write', async () => {
    const { secureStore, mod } = loadFresh();
    const storageFailure = new Error('keychain write failed');
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockRejectedValueOnce(storageFailure);

    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).rejects.toBe(
      storageFailure,
    );
    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(pending);

    await expect(mod.claimPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 1,
    });
  });

  it('keeps the counter unchanged after a failed recovery refund write', async () => {
    const { secureStore, mod } = loadFresh();
    const claimed = { ...pending, recoveryPostAttempts: 1 };
    const storageFailure = new Error('keychain write failed');
    await mod.savePendingAssessment(claimed);
    jest.mocked(secureStore.setItemAsync).mockRejectedValueOnce(storageFailure);

    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).rejects.toBe(
      storageFailure,
    );
    expect(await mod.loadPendingAssessment()).toEqual(claimed);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(claimed);

    await expect(mod.refundPendingAssessmentRecoveryPost(pending.requestId)).resolves.toBe(true);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      recoveryPostAttempts: 0,
    });
  });

  it('serializes cancellation behind an in-flight save and marks that saved request', async () => {
    const { secureStore, mod } = loadFresh();
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    const storageEvents: string[] = [];
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('save-started');
        writeStarted.resolve();
        await allowWrite.promise;
        mockStorage.set(key, value);
        storageEvents.push('save-finished');
      })
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('cancelled');
        mockStorage.set(key, value);
      });

    const saving = mod.savePendingAssessment(pending);
    await expectBarrierBeforeSettlement(writeStarted.promise, saving);
    const cancelling = mod.markPendingAssessmentCancelled(pending.requestId);

    expect(storageEvents).toEqual(['save-started']);
    allowWrite.resolve();
    await expect(Promise.all([saving, cancelling])).resolves.toEqual([undefined, true]);

    expect(storageEvents).toEqual(['save-started', 'save-finished', 'cancelled']);
    expect(await mod.loadPendingAssessment()).toEqual({
      ...pending,
      cancelRequested: true,
    });
  });

  it('does not let a queued cancellation mark a newer request with a stale id', async () => {
    const { secureStore, mod } = loadFresh();
    const replacement: PendingAssessment = {
      ...pending,
      requestId: '550e8400-e29b-41d4-a716-446655440004',
      stage: 'prepared',
    };
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        writeStarted.resolve();
        await allowWrite.promise;
        mockStorage.set(key, value);
      });

    const savingReplacement = mod.savePendingAssessment(replacement);
    await expectBarrierBeforeSettlement(writeStarted.promise, savingReplacement);
    const cancellingStaleRequest = mod.markPendingAssessmentCancelled(pending.requestId);
    allowWrite.resolve();

    await expect(savingReplacement).resolves.toBeUndefined();
    await expect(cancellingStaleRequest).resolves.toBe(false);
    expect(await mod.loadPendingAssessment()).toEqual(replacement);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(replacement);
  });

  it('lets a replacement saved after cancellation become authoritative', async () => {
    const { secureStore, mod } = loadFresh();
    const replacement: PendingAssessment = {
      ...pending,
      requestId: '550e8400-e29b-41d4-a716-446655440004',
      stage: 'prepared',
    };
    const cancellationStarted = deferred<void>();
    const allowCancellation = deferred<void>();
    const storageEvents: string[] = [];
    await mod.savePendingAssessment(pending);
    jest
      .mocked(secureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('cancel-started');
        cancellationStarted.resolve();
        await allowCancellation.promise;
        mockStorage.set(key, value);
        storageEvents.push('cancel-finished');
      })
      .mockImplementationOnce(async (key: string, value: string) => {
        storageEvents.push('replacement-saved');
        mockStorage.set(key, value);
      });

    const cancelling = mod.markPendingAssessmentCancelled(pending.requestId);
    await expectBarrierBeforeSettlement(cancellationStarted.promise, cancelling);
    const savingReplacement = mod.savePendingAssessment(replacement);

    expect(storageEvents).toEqual(['cancel-started']);
    allowCancellation.resolve();
    await expect(Promise.all([cancelling, savingReplacement])).resolves.toEqual([true, undefined]);

    expect(storageEvents).toEqual(['cancel-started', 'cancel-finished', 'replacement-saved']);
    expect(await mod.loadPendingAssessment()).toEqual(replacement);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(replacement);
  });

  it('keeps the prior record authoritative when persisting cancellation fails', async () => {
    const { secureStore, mod } = loadFresh();
    const storageFailure = new Error('keychain write failed');
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockRejectedValueOnce(storageFailure);

    await expect(mod.markPendingAssessmentCancelled(pending.requestId)).rejects.toBe(
      storageFailure,
    );

    expect(await mod.loadPendingAssessment()).toEqual(pending);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(pending);
  });

  it('preserves the prior memory and durable record when a queued save fails', async () => {
    const { secureStore, mod } = loadFresh();
    const replacement: PendingAssessment = {
      ...pending,
      requestId: '550e8400-e29b-41d4-a716-446655440004',
      stage: 'prepared',
    };
    const storageFailure = new Error('keychain write failed');
    await mod.savePendingAssessment(pending);
    jest.mocked(secureStore.setItemAsync).mockRejectedValueOnce(storageFailure);

    const saving = mod.savePendingAssessment(replacement);
    const loadingAfterFailure = mod.loadPendingAssessment();

    await expect(saving).rejects.toBe(storageFailure);
    await expect(loadingAfterFailure).resolves.toEqual(pending);
    expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(pending);
  });

  it('pins the enum-list plus schema-version digest: adding a stage/endpoint enum requires bumping PENDING_ASSESSMENT_SCHEMA_VERSION (storage key) and updating this pinned digest — an older binary must never parse-and-delete a newer-format handoff', () => {
    // Deterministic FNV-1a over the canonical JSON of the runtime enum lists
    // and the schema version that derives the storage key. Any enum addition
    // that skips the version bump fails here instead of silently letting an
    // older supported binary destroy a newer-format handoff.
    function fnv1a32(input: string): string {
      let hash = 0x811c9dc5;
      for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }

    const canonical = JSON.stringify({
      schemaVersion: PENDING_ASSESSMENT_SCHEMA_VERSION,
      stages: PENDING_ASSESSMENT_STAGES,
      endpoints: PENDING_ASSESSMENT_ENDPOINTS,
    });

    expect(fnv1a32(canonical)).toBe('0xe24761b5');
  });

  describe('forward-incompatible (newer-schema) stored handoffs', () => {
    it('does not delete a stored handoff whose stage enum is newer than this binary', async () => {
      const { secureStore, mod } = loadFresh();
      const newerStage = { ...pending, stage: 'handed-off-v2' };
      mockStorage.set(STORAGE_KEY, JSON.stringify(newerStage));
      jest.mocked(secureStore.getItemAsync).mockClear();
      jest.mocked(secureStore.deleteItemAsync).mockClear();

      expect(await mod.loadPendingAssessment()).toBeNull();
      expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(mockStorage.has(STORAGE_KEY)).toBe(true);

      // The cached forward-incompatible outcome keeps later loads from both
      // deleting the newer-format record and re-reading the store for it.
      expect(await mod.loadPendingAssessment()).toBeNull();
      expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
      expect(mockStorage.has(STORAGE_KEY)).toBe(true);
    });

    it('does not delete a stored handoff whose endpoint enum is newer than this binary', async () => {
      const { secureStore, mod } = loadFresh();
      mockStorage.set(
        STORAGE_KEY,
        JSON.stringify({ ...pending, endpoint: '/practice/attempt/mnemonic' }),
      );

      expect(await mod.loadPendingAssessment()).toBeNull();
      expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(mockStorage.has(STORAGE_KEY)).toBe(true);
    });

    it('refuses to overwrite a forward-incompatible handoff instead of installing a candidate', async () => {
      const { secureStore, mod } = loadFresh();
      const newerRecord = { ...pending, stage: 'graded-v2' };
      mockStorage.set(STORAGE_KEY, JSON.stringify(newerRecord));
      const generation = mod.capturePendingAssessmentGeneration();
      jest.mocked(secureStore.setItemAsync).mockClear();

      await expect(
        mod.ensurePendingAssessment(
          {
            ...pending,
            requestId: '550e8400-e29b-41d4-a716-446655440044',
            stage: 'prepared',
          },
          generation,
        ),
      ).resolves.toBeNull();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
      expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}')).toEqual(newerRecord);
    });

    it('still deletes a structurally invalid record even when its stage enum is unknown', async () => {
      const { secureStore, mod } = loadFresh();
      mockStorage.set(
        STORAGE_KEY,
        JSON.stringify({ ...pending, stage: 'graded-v2', createdAt: 0 }),
      );

      expect(await mod.loadPendingAssessment()).toBeNull();
      expect(secureStore.deleteItemAsync).toHaveBeenCalled();
      expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    });

    it('still deletes a record whose endpoint is not a string at all', async () => {
      const { secureStore, mod } = loadFresh();
      mockStorage.set(STORAGE_KEY, JSON.stringify({ ...pending, endpoint: 7 }));

      expect(await mod.loadPendingAssessment()).toBeNull();
      expect(secureStore.deleteItemAsync).toHaveBeenCalled();
      expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    });

    it('still lets an explicit unconditional clear remove a forward-incompatible handoff', async () => {
      const { secureStore, mod } = loadFresh();
      mockStorage.set(STORAGE_KEY, JSON.stringify({ ...pending, stage: 'graded-v2' }));
      jest.mocked(secureStore.deleteItemAsync).mockClear();

      await mod.clearPendingAssessment();

      expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
      expect(mockStorage.has(STORAGE_KEY)).toBe(false);
    });

    it('keeps a forward-incompatible handoff through a request-conditional clear', async () => {
      const { secureStore, mod } = loadFresh();
      mockStorage.set(STORAGE_KEY, JSON.stringify({ ...pending, stage: 'graded-v2' }));
      jest.mocked(secureStore.deleteItemAsync).mockClear();

      await expect(mod.clearPendingAssessmentIfRequestMatches(pending.requestId)).resolves.toBe(
        false,
      );
      await expect(mod.clearPendingAssessment(pending.requestId)).resolves.toBeUndefined();

      expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
      expect(mockStorage.has(STORAGE_KEY)).toBe(true);
    });

    it('identifies forward-incompatible records without exposing a parse result', () => {
      const { mod } = loadFresh();

      expect(mod.pendingAssessmentIsForwardIncompatible({ ...pending, stage: 'graded-v2' })).toBe(
        true,
      );
      expect(
        mod.pendingAssessmentIsForwardIncompatible({
          ...pending,
          endpoint: '/practice/attempt/mnemonic',
        }),
      ).toBe(true);
      expect(mod.pendingAssessmentIsForwardIncompatible(pending)).toBe(false);
      expect(
        mod.pendingAssessmentIsForwardIncompatible({
          ...pending,
          stage: 'graded-v2',
          createdAt: 0,
        }),
      ).toBe(false);
      expect(mod.pendingAssessmentIsForwardIncompatible('{not-json')).toBe(false);
      expect(mod.pendingAssessmentIsForwardIncompatible(null)).toBe(false);
    });
  });

  describe('synchronous unconditional-clear generation advance', () => {
    it('advances the generation synchronously without any storage access', async () => {
      const { secureStore, mod } = loadFresh();
      const generation = mod.capturePendingAssessmentGeneration();
      jest.mocked(secureStore.getItemAsync).mockClear();
      jest.mocked(secureStore.deleteItemAsync).mockClear();

      mod.advanceUnconditionalClearGeneration();

      expect(mod.capturePendingAssessmentGeneration()).toBe(generation + 1);
      expect(secureStore.getItemAsync).not.toHaveBeenCalled();
      expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('refuses an old-generation creator once the generation advanced synchronously', async () => {
      const { secureStore, mod } = loadFresh();
      const staleGeneration = mod.capturePendingAssessmentGeneration();
      mod.advanceUnconditionalClearGeneration();
      const getItem = jest.mocked(secureStore.getItemAsync);
      const setItem = jest.mocked(secureStore.setItemAsync);
      getItem.mockClear();
      setItem.mockClear();

      await expect(
        mod.ensurePendingAssessment({ ...pending, stage: 'prepared' }, staleGeneration),
      ).resolves.toBeNull();
      expect(getItem).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
    });
  });
});
