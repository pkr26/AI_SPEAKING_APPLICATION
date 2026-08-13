import * as SecureStore from 'expo-secure-store';

import {
  clearPendingAssessment,
  loadPendingAssessment,
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
  ])('rejects malformed metadata %#', (value) => {
    expect(parsePendingAssessment(value)).toBeNull();
  });

  it('upgrades a legacy pending delivery marker', () => {
    const { stage: _stage, ...legacy } = pending;
    expect(parsePendingAssessment({ ...legacy, delivery: 'pending' })).toEqual(pending);
    expect(parsePendingAssessment({ ...legacy, delivery: 'reconcile' })).toEqual({
      ...pending,
      stage: 'reconcile',
    });
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
});
