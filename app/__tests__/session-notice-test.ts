import * as SecureStore from 'expo-secure-store';

import { translateFor } from '../src/lib/i18n';
import { consumeSessionExpiredNotice, markSessionExpiredNotice } from '../src/lib/session-notice';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockedGetItem = jest.mocked(SecureStore.getItemAsync);
const mockedSetItem = jest.mocked(SecureStore.setItemAsync);
const mockedDeleteItem = jest.mocked(SecureStore.deleteItemAsync);

const EXPECTED_OPTIONS = {
  keychainAccessible: 'device-only',
  keychainService: 'ai-english-coach.session-notice',
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetItem.mockResolvedValue(null);
  mockedSetItem.mockResolvedValue(undefined);
  mockedDeleteItem.mockResolvedValue(undefined);
});

describe('session expired notice', () => {
  it('uses simple A1 copy for the sign-out explanation', () => {
    // Deliberate literal pin: this is critical safety copy shown after a
    // forced sign-out. Any wording change must be reviewed here on purpose,
    // so we assert the catalog string itself rather than a t(...) round-trip.
    expect(translateFor('en', 'auth.sessionExpired')).toBe(
      'You were logged out to keep your account safe. Please log in again.',
    );
  });

  it('persists the one-shot flag in its own keychain service', async () => {
    await markSessionExpiredNotice();

    expect(mockedSetItem).toHaveBeenCalledWith('session_expired_notice_v1', '1', EXPECTED_OPTIONS);
  });

  it('propagates a persist failure so callers can treat it as best effort', async () => {
    mockedSetItem.mockRejectedValue(new Error('keychain unavailable'));

    await expect(markSessionExpiredNotice()).rejects.toThrow('keychain unavailable');
  });

  it('keeps the storage queue usable after a persist failure', async () => {
    mockedSetItem.mockRejectedValueOnce(new Error('keychain unavailable'));
    await expect(markSessionExpiredNotice()).rejects.toThrow('keychain unavailable');
    mockedGetItem.mockResolvedValueOnce('1');

    await expect(consumeSessionExpiredNotice()).resolves.toBe(true);
  });

  it('orders login consumption after an in-flight expiry mark', async () => {
    let stored: string | null = null;
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    mockedSetItem.mockImplementationOnce(async () => {
      writeStarted.resolve();
      await allowWrite.promise;
      stored = '1';
    });
    mockedGetItem.mockImplementation(async () => stored);
    mockedDeleteItem.mockImplementation(async () => {
      stored = null;
    });

    const marking = markSessionExpiredNotice();
    await writeStarted.promise;
    const consuming = consumeSessionExpiredNotice();
    await Promise.resolve();
    expect(mockedGetItem).not.toHaveBeenCalled();

    allowWrite.resolve();
    await expect(marking).resolves.toBeUndefined();
    await expect(consuming).resolves.toBe(true);
    expect(stored).toBeNull();
  });

  it('consumes a stored flag exactly once', async () => {
    mockedGetItem.mockResolvedValueOnce('1');

    await expect(consumeSessionExpiredNotice()).resolves.toBe(true);
    expect(mockedGetItem).toHaveBeenCalledWith('session_expired_notice_v1', EXPECTED_OPTIONS);
    expect(mockedDeleteItem).toHaveBeenCalledWith('session_expired_notice_v1', EXPECTED_OPTIONS);

    await expect(consumeSessionExpiredNotice()).resolves.toBe(false);
  });

  it('allows only one of two concurrent consumers to claim the one-shot flag', async () => {
    let stored: string | null = '1';
    mockedGetItem.mockImplementation(async () => stored);
    mockedDeleteItem.mockImplementation(async () => {
      stored = null;
    });

    await expect(
      Promise.all([consumeSessionExpiredNotice(), consumeSessionExpiredNotice()]),
    ).resolves.toEqual([true, false]);
    expect(mockedDeleteItem).toHaveBeenCalledTimes(1);
  });

  it('reports no notice when nothing was stored', async () => {
    await expect(consumeSessionExpiredNotice()).resolves.toBe(false);
    expect(mockedDeleteItem).not.toHaveBeenCalled();
  });

  it('reports no notice when the credential store cannot be read', async () => {
    mockedGetItem.mockRejectedValue(new Error('keychain unavailable'));

    await expect(consumeSessionExpiredNotice()).resolves.toBe(false);
    expect(mockedDeleteItem).not.toHaveBeenCalled();
  });

  it('still shows the notice when clearing the flag fails', async () => {
    mockedGetItem.mockResolvedValue('1');
    mockedDeleteItem.mockRejectedValue(new Error('keychain unavailable'));

    await expect(consumeSessionExpiredNotice()).resolves.toBe(true);
  });
});
