import * as SecureStore from 'expo-secure-store';

import { hasSeenPracticeIntro, markPracticeIntroSeen } from '../src/lib/practice-intro';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '650e8400-e29b-41d4-a716-446655440111';

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
  getItemAsync.mockImplementation(async () => null);
  setItemAsync.mockImplementation(async () => undefined);
});

describe('hasSeenPracticeIntro', () => {
  it('reports not seen when nothing is stored', async () => {
    await expect(hasSeenPracticeIntro(USER_ID)).resolves.toBe(false);
    expect(getItemAsync).toHaveBeenCalledWith(
      `practice_intro_seen_v1_${USER_ID}`,
      expect.objectContaining({ keychainService: 'ai-english-coach.practice-intro' }),
    );
  });

  it('reports seen when the flag is stored', async () => {
    getItemAsync.mockImplementation(async () => '1');
    await expect(hasSeenPracticeIntro(USER_ID)).resolves.toBe(true);
  });

  it('keys the flag per account', async () => {
    await hasSeenPracticeIntro(OTHER_USER_ID);
    expect(getItemAsync).toHaveBeenCalledWith(
      `practice_intro_seen_v1_${OTHER_USER_ID}`,
      expect.anything(),
    );
  });

  it('treats an unreadable store as seen so practice is never blocked', async () => {
    getItemAsync.mockImplementation(async () => {
      throw new Error('keychain locked');
    });
    await expect(hasSeenPracticeIntro(USER_ID)).resolves.toBe(true);
  });
});

describe('markPracticeIntroSeen', () => {
  it('stores the per-account flag', async () => {
    await markPracticeIntroSeen(USER_ID);
    expect(setItemAsync).toHaveBeenCalledWith(
      `practice_intro_seen_v1_${USER_ID}`,
      '1',
      expect.objectContaining({ keychainService: 'ai-english-coach.practice-intro' }),
    );
  });

  it('swallows write failures (the card may just show once more)', async () => {
    setItemAsync.mockImplementation(async () => {
      throw new Error('keychain locked');
    });
    await expect(markPracticeIntroSeen(USER_ID)).resolves.toBeUndefined();
  });

  it('orders a later seen-check after an in-flight mark', async () => {
    let stored: string | null = null;
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    setItemAsync.mockImplementationOnce(async () => {
      writeStarted.resolve();
      await allowWrite.promise;
      stored = '1';
    });
    getItemAsync.mockImplementation(async () => stored);

    const marking = markPracticeIntroSeen(USER_ID);
    await writeStarted.promise;
    const checking = hasSeenPracticeIntro(USER_ID);
    await Promise.resolve();
    expect(getItemAsync).not.toHaveBeenCalled();

    allowWrite.resolve();
    await expect(marking).resolves.toBeUndefined();
    await expect(checking).resolves.toBe(true);
  });
});
