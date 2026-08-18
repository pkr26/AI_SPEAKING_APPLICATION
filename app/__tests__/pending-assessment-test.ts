import * as SecureStore from 'expo-secure-store';

import {
  claimPendingAssessmentRecoveryPost,
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  parsePendingAssessment,
  savePendingAssessment,
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

const pending: PendingAssessment = {
  ownerId: '550e8400-e29b-41d4-a716-446655440000',
  endpoint: '/practice/attempt',
  questionId: '550e8400-e29b-41d4-a716-446655440001',
  requestId: '550e8400-e29b-41d4-a716-446655440002',
  createdAt: 1_700_000_000_000,
  stage: 'direct-posting',
};
const audioKey =
  'audio-uploads/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440003.m4a';

describe('durable assessment handoff', () => {
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
      'audio-uploads/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440004.m4a';
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
    { ...pending, stage: 's3-granted' },
    { ...pending, stage: 's3-granted', audioKey: '' },
    { ...pending, stage: 's3-granted', audioKey: '../another-user/a.m4a' },
    {
      ...pending,
      stage: 's3-granted',
      audioKey:
        'audio-uploads/550e8400-e29b-41d4-a716-446655440099/550e8400-e29b-41d4-a716-446655440003.m4a',
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
        'audio-uploads/550e8400-e29b-41d4-a716-446655440000/prefix-550e8400-e29b-41d4-a716-446655440003.m4a',
    },
    { ...pending, delivery: 'unknown' },
    { ...pending, cancelRequested: null },
    { ...pending, cancelRequested: 0 },
    { ...pending, cancelRequested: 1 },
    { ...pending, cancelRequested: 'true' },
    { ...pending, cancelRequested: {} },
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

  it.each(['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'] as const)(
    'accepts the server assessment endpoint %s',
    (endpoint) => {
      expect(parsePendingAssessment({ ...pending, endpoint })).toEqual({ ...pending, endpoint });
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
    expect(parsePendingAssessment(pending)).toEqual(pending);
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
    await writeStarted.promise;
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
    await claimWriteStarted.promise;
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
    await claimWriteStarted.promise;
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
    await writeStarted.promise;
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
    await writeStarted.promise;
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
    await cancellationStarted.promise;
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
});
