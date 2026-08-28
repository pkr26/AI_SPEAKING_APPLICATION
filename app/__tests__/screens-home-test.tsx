import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HomeScreen from '../src/app/home';
import HomeBannerAd from '../src/components/HomeBannerAd';
import { apiGetPracticeStats, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { I18nProvider, setActiveLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { colors, layout, radii, spacing } from '../src/lib/theme';
import type { PracticeStats, User } from '../src/lib/types';
import { useHardwareBack } from '../src/lib/use-hardware-back';

// Under jest no I18nProvider is mounted, so the screen falls back to English.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

/** The same copy as a Telugu account sees it. */
const te = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('te', key, params);

interface MockFocusRegistration {
  callback: () => void | (() => void);
  cleanup: (() => void) | null;
}

const mockHomeFocusRegistrations: MockFocusRegistration[] = [];
let mockHomeAutoFocus = true;
let mockHomeIsFocused = true;

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: jest.fn(),
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration = { callback, cleanup: null as (() => void) | null };
        mockHomeFocusRegistrations.push(registration);
        const cleanup = mockHomeAutoFocus ? callback() : undefined;
        registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
        return () => {
          registration.cleanup?.();
          const index = mockHomeFocusRegistrations.indexOf(registration);
          if (index >= 0) mockHomeFocusRegistrations.splice(index, 1);
        };
      }, [callback]);
    },
    useIsFocused: () => mockHomeIsFocused,
  };
});

jest.mock('../src/components/HomeBannerAd', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let mockAuthValue: AuthValue;

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

type PracticeFlowValue = ReturnType<typeof usePracticeFlow>;

let mockPracticeFlow: PracticeFlowValue;

function makePracticeFlow(overrides: Partial<PracticeFlowValue> = {}): PracticeFlowValue {
  return {
    answerMode: 'english',
    feedback: null,
    attemptStatus: null,
    sessionTally: { attempts: 0, passed: 0, mastered: 0, levelUps: 0 },
    setAnswerMode: jest.fn(),
    showFeedback: jest.fn(),
    clearFeedback: jest.fn(),
    resetSessionTally: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
  usePracticeFlow: () => mockPracticeFlow,
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetPracticeStats: jest.fn(),
}));

const mockGetStats = apiGetPracticeStats as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  canGoBack: jest.Mock;
};

const STATS: PracticeStats = {
  level: 'B1',
  progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10, dueCount: 4 },
  streakDays: 5,
  practicedToday: 3,
  totalAttempts: 40,
  lastPracticedAt: '2026-08-15T10:00:00.000Z',
};

let backHandlers: (() => boolean)[];

const queryClients: QueryClient[] = [];

beforeAll(() => {
  // Keep query notifications in the operation's controlled act() turn. This
  // avoids coverage-mode timer batching publishing a Home update between tests.
  notifyManager.setScheduler((notify) => notify());
});

afterAll(() => {
  notifyManager.setScheduler((notify) => setTimeout(notify, 0));
});

function makeQueryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClients.push(client);
  return client;
}

function renderHome(queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

function HardwareBackHarness({ consume }: { consume: boolean }) {
  useHardwareBack(() => consume);
  return null;
}

/** Renders inside the real provider, so the screen translates like a te account. */
function renderHomeInTelugu() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider accountLanguage="te">
        <HomeScreen />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

/** The host view a text, chip, or row is laid out in. */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

function committedPressHandler(node: TestInstance): () => unknown {
  type Fiber = {
    memoizedProps?: { onPress?: unknown };
    return: Fiber | null;
  };
  let fiber = node.unstable_fiber as Fiber | null;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => unknown;
    }
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
}

async function blurHome(): Promise<void> {
  await act(async () => {
    for (const registration of mockHomeFocusRegistrations) {
      const cleanup = registration.cleanup;
      registration.cleanup = null;
      cleanup?.();
    }
  });
}

async function focusHome(): Promise<void> {
  await act(async () => {
    for (const registration of mockHomeFocusRegistrations) {
      const cleanup = registration.callback();
      registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
    }
  });
}

/**
 * ScrollView renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function scrollContentStyle(): SemanticStyle {
  const [node] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
  if (!node) throw new Error('No ScrollView rendered');
  return StyleSheet.flatten(node.props.contentContainerStyle) ?? {};
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStats.mockReset();
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
  // Home is the whole signed-in stack unless a test puts a route beneath it;
  // clearAllMocks keeps recorded return values, so re-arm the default here.
  mockRouter.canGoBack.mockReturnValue(false);
  mockHomeFocusRegistrations.length = 0;
  mockHomeAutoFocus = true;
  mockHomeIsFocused = true;
  jest.mocked(HomeBannerAd).mockClear();
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: jest.fn() };
  });
});

afterEach(async () => {
  // Unsubscribe Home before clearing its query cache. RNTL's automatic cleanup
  // can run after this file's hook, which otherwise leaves a live observer for
  // TanStack's timer-batched clear notification and produces a cross-test act
  // warning under slower/full-suite scheduling.
  cleanup();
  await act(async () => {
    for (const client of queryClients) client.clear();
    // TanStack batches cache-observer notifications through a timer; clearing
    // one query can schedule a second notification from the first batch. Drain
    // both turns while still inside act so a prior screen never updates during
    // the next test.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  queryClients.length = 0;
  // Mounting the provider syncs the module-level language; every other test
  // renders without one and must still fall back to English.
  setActiveLanguage('en');
});

describe('home screen', () => {
  it('shows a loading state while stats load', async () => {
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    await renderHome(queryClient);

    expect(screen.getByText(t('home.loading'))).toBeTruthy();
    expect(screen.getByText(t('practice.greeting', { name: USER.name }))).toBeTruthy();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
  });

  it('recaptures the auth lease when the session version changes for the same user', async () => {
    const captureSessionLease = jest.fn(() => ({}) as never);
    mockAuthValue = makeAuth({ captureSessionLease });
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    const queryClient = makeQueryClient();
    const tree = () => (
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    expect(captureSessionLease).toHaveBeenCalledTimes(1);

    mockAuthValue = makeAuth({ sessionVersion: 2, captureSessionLease });
    await rendered.rerender(tree());

    expect(captureSessionLease).toHaveBeenCalledTimes(2);
  });

  it('uses the current auth lease for navigation after a same-mounted session change', async () => {
    const leaseA = { owner: 'home-a' } as never;
    const leaseB = { owner: 'home-b' } as never;
    let currentLease = leaseA;
    const captureSessionLease = jest.fn(() => currentLease);
    const isSessionLeaseCurrent = jest.fn((lease: unknown) => lease === currentLease);
    mockAuthValue = makeAuth({ captureSessionLease, isSessionLeaseCurrent });
    mockGetStats.mockResolvedValue(STATS);
    const queryClient = makeQueryClient();
    const tree = () => (
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    await screen.findByText('B1');

    currentLease = leaseB;
    mockAuthValue = makeAuth({
      sessionVersion: 2,
      captureSessionLease,
      isSessionLeaseCurrent,
    });
    await rendered.rerender(tree());
    mockRouter.navigate.mockClear();

    await fireEvent.press(screen.getByRole('button', { name: t('home.startPractice') }));

    expect(captureSessionLease).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/practice');
  });

  it('shows a retryable error when stats cannot load', async () => {
    mockGetStats.mockRejectedValueOnce(new ApiError(500, 'boom')).mockResolvedValueOnce(STATS);
    await renderHome();

    expect(await screen.findByText(t('home.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByRole('header', { name: t('home.loadFailedTitle') })).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText(t('home.startPractice'))).toBeTruthy();
    expect(mockGetStats).toHaveBeenCalledTimes(2);
  });

  it('shows the generic load-failure copy for a failure the API cannot classify', async () => {
    mockGetStats.mockRejectedValue(new Error('socket hang up: 10.0.0.7:8443'));
    await renderHome();

    expect(await screen.findByText(t('home.loadFailed'))).toBeTruthy();
    // Transport detail never reaches the learner, and the spinner is gone:
    // the error state replaces the loading state rather than joining it.
    expect(screen.queryByText(/socket hang up/)).toBeNull();
    expect(screen.queryByText(t('home.loading'))).toBeNull();
  });

  it('joins repeated retries after cached empty stats fail in the background', async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-stats', USER.id], null);
    let resolveRetry!: (stats: PracticeStats) => void;
    const retryRequest = new Promise<PracticeStats>((resolve) => {
      resolveRetry = resolve;
    });
    mockGetStats
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockReturnValue(retryRequest);
    await renderHome(queryClient);

    const retryButton = await screen.findByRole('button', { name: t('common.tryAgain') });
    const retry = committedPressHandler(retryButton);
    await act(async () => {
      void retry();
      void retry();
      await Promise.resolve();
      resolveRetry(STATS);
      // refetch() is intentionally voided by the button contract. Drain the
      // query promise and both batched observer-notification turns here instead
      // of leaving a mounted observer pending for global suite teardown.
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetStats).toHaveBeenCalledTimes(2);
    expect(screen.getByText('B1')).toBeTruthy();
  });

  it('keeps cached stats visible when their background refresh fails', async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-stats', USER.id], STATS);
    mockGetStats.mockRejectedValue(new ApiError(500, 'background failure'));
    await renderHome(queryClient);

    await waitFor(() =>
      expect(queryClient.getQueryState(['practice-stats', USER.id])?.status).toBe('error'),
    );
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.queryByText(t('home.loadFailedTitle'))).toBeNull();
    expect(screen.getByRole('button', { name: t('home.startPractice') })).toBeTruthy();
  });

  it('renders level, mastery progress, streak, due chip, and today line from stats', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    expect(await screen.findByText('B1')).toBeTruthy();
    expect(screen.getByText(t('cefr.B1'))).toBeTruthy();

    const bar = screen.getByRole('progressbar', { name: t('home.masteryLabel') });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 3 });
    expect(
      screen.getByText(
        t('practice.progressLine', { mastered: 3, total: 10 }) +
          t('practice.progressLearning', { count: 2 }),
      ),
    ).toBeTruthy();

    expect(screen.getByText(t('home.streakMany', { count: 5 }))).toBeTruthy();
    // The flame is decoration; screen readers get the streak text instead.
    const flame = screen.getByText('🔥', { includeHiddenElements: true });
    expect(flame.props.accessibilityElementsHidden).toBe(true);
    expect(flame.props.importantForAccessibility).toBe('no-hide-descendants');

    expect(screen.getByText(t('home.dueChip', { count: 4 }))).toBeTruthy();
    expect(screen.queryByText(t('home.dueNone'))).toBeNull();
    expect(screen.getByText(t('home.practicedToday', { count: 3 }))).toBeTruthy();
    // Loaded stats replace the loading state instead of rendering beside it.
    expect(screen.queryByText(t('home.loading'))).toBeNull();
  });

  it('paints from the shared per-user stats cache entry without waiting for a fetch', async () => {
    // Practice invalidates ['practice-stats'] after every attempt and Settings
    // drops it on logout, so Home has to sit on exactly that entry, keyed by
    // the signed-in user rather than shared across accounts.
    const client = makeQueryClient();
    client.setQueryData(['practice-stats', USER.id], STATS);
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    await renderHome(client);

    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.getByText(t('home.dueChip', { count: 4 }))).toBeTruthy();
    expect(screen.queryByText(t('home.loading'))).toBeNull();
  });

  it('shows the level from stats, not the account level it may have outgrown', async () => {
    // A level-up mid-session leaves user.cefrLevel stale until the next
    // profile read; the freshly fetched stats are the authority on screen.
    mockGetStats.mockResolvedValue({ ...STATS, level: 'B2' });
    await renderHome();

    expect(await screen.findByText('B2')).toBeTruthy();
    expect(screen.getByText(t('cefr.B2'))).toBeTruthy();
    // 'B1' is the account's stale level; it must not reach the screen.
    expect(screen.queryByText('B1')).toBeNull();
  });

  it('returns to placement when another device has reset the diagnostic', async () => {
    // Stats is authorized from the live server and level:null is its exact
    // pre-placement state. The in-memory profile can be stale after a
    // cross-device retake, so Home must update the route gate rather than
    // offering a practice button that the server will reject.
    const client = makeQueryClient();
    client.setQueryData(['diagnostic-next', 1, USER.id], { done: true, level: 'B1' });
    client.setQueryData(['practice-question', USER.id, USER.cefrLevel], { stale: true });
    client.setQueryData(['unrelated-sentinel'], { keep: true });
    mockGetStats.mockResolvedValue({
      level: null,
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    });

    await renderHome(client);
    // Let React Query deliver the resolved stats and this screen's cache
    // retirement effect inside act; otherwise its scheduled observer update
    // leaks into the next test as an act warning.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalledWith(expect.any(Function)));
    const updateUser = jest.mocked(mockAuthValue.setUser).mock.calls[0][0] as (
      current: User | null,
    ) => User | null;
    expect(updateUser({ ...USER, name: 'Newest profile name' })).toEqual({
      ...USER,
      name: 'Newest profile name',
      diagnosticCompleted: false,
      cefrLevel: null,
    });
    const otherUser = { ...USER, id: '550e8400-e29b-41d4-a716-446655440099' };
    expect(updateUser(otherUser)).toBe(otherUser);
    expect(updateUser(null)).toBeNull();
    expect(screen.getByText(t('gate.loadingProfile')).props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByLabelText(t('gate.loadingProfile'))).toBeTruthy();
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    expect(screen.queryByRole('button', { name: t('home.startPractice') })).toBeNull();
    expect(
      client.getQueryCache().find({
        queryKey: ['diagnostic-next', 1, USER.id],
        exact: true,
      }),
    ).toBeUndefined();
    expect(
      client.getQueryCache().find({
        queryKey: ['practice-question', USER.id, USER.cefrLevel],
        exact: true,
      }),
    ).toBeUndefined();
    expect(client.getQueryData(['unrelated-sentinel'])).toEqual({ keep: true });
  });

  it('does not adopt a cross-device placement reset after its auth lease goes stale', async () => {
    let leaseCurrent = true;
    mockAuthValue = makeAuth({ isSessionLeaseCurrent: jest.fn(() => leaseCurrent) });
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    let resolveStats: (stats: PracticeStats) => void = () => undefined;
    mockGetStats.mockReturnValue(
      new Promise<PracticeStats>((resolve) => {
        resolveStats = resolve;
      }),
    );
    const staleStats: PracticeStats = {
      level: null,
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    };

    await renderHome(queryClient);
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(1));
    leaseCurrent = false;
    await act(async () => {
      resolveStats(staleStats);
      await Promise.resolve();
    });

    await waitFor(() => expect(mockAuthValue.isSessionLeaseCurrent).toHaveBeenCalled());
    expect(removeSpy).not.toHaveBeenCalled();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
  });

  it('drops the revision suffix from the mastery line when nothing is in revision', async () => {
    mockGetStats.mockResolvedValue({
      ...STATS,
      progress: { ...STATS.progress, learningCount: 0 },
    });
    await renderHome();

    // Exact match: the line is the progress sentence and nothing else — no
    // trailing " · 0 to review", and no placeholder text in its place.
    expect(
      await screen.findByText(t('practice.progressLine', { mastered: 3, total: 10 })),
    ).toBeTruthy();
  });

  it('fills the mastery bar proportionally with the success token', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    const bar = await screen.findByRole('progressbar', { name: t('home.masteryLabel') });
    const fill = bar.children[0] as TestInstance;
    expect(flattenedStyle(fill)).toMatchObject({
      width: '30%',
      backgroundColor: colors.success,
    });
  });

  it('renders a zero-width mastery fill when the level total is defensively zero', async () => {
    mockGetStats.mockResolvedValue({
      ...STATS,
      progress: { ...STATS.progress, masteredCount: 0, totalAtLevel: 0 },
    });
    await renderHome();

    const bar = await screen.findByRole('progressbar', { name: t('home.masteryLabel') });
    expect(flattenedStyle(bar.children[0] as TestInstance).width).toBe('0%');
  });

  it('uses the streak-start prompt and singular lines at low counts', async () => {
    mockGetStats.mockResolvedValue({
      ...STATS,
      streakDays: 0,
      practicedToday: 0,
      progress: { ...STATS.progress, dueCount: 0 },
    });
    await renderHome();

    expect(await screen.findByText(t('home.streakNone'))).toBeTruthy();
    expect(screen.getByText(t('home.practicedNoneToday'))).toBeTruthy();
    expect(screen.getByText(t('home.dueNone'))).toBeTruthy();
    expect(screen.queryByText(t('home.dueChip', { count: 0 }))).toBeNull();
  });

  it('uses the singular one-day and one-time lines', async () => {
    mockGetStats.mockResolvedValue({ ...STATS, streakDays: 1, practicedToday: 1 });
    await renderHome();

    expect(await screen.findByText(t('home.streakOne'))).toBeTruthy();
    expect(screen.getByText(t('home.practicedOnceToday'))).toBeTruthy();
  });

  it('takes the singular streak branch in a language that inflects it', async () => {
    // English collapses the two: "1 day streak" is also what the {count}
    // template produces. Telugu marks the plural (రోజు vs రోజుల), so only a
    // localized render can prove the one-day branch is the one taken.
    mockGetStats.mockResolvedValue({ ...STATS, streakDays: 1 });
    await renderHomeInTelugu();

    expect(await screen.findByText(te('home.streakOne'))).toBeTruthy();
    expect(screen.queryByText(te('home.streakMany', { count: 1 }))).toBeNull();
  });

  it.each([
    [t('home.startPractice'), '/practice'],
    [t('header.history'), '/history'],
    [t('header.recordings'), '/recordings'],
    [t('header.settings'), '/settings'],
  ] as const)('navigates once from %s after a rapid double tap', async (label, destination) => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    const press = committedPressHandler(screen.getByRole('button', { name: label }));
    await act(async () => {
      press();
      press();
    });
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(destination);
  });

  it('forwards live route focus to the Home banner across a same-mount rerender', async () => {
    mockGetStats.mockResolvedValue(STATS);
    const client = makeQueryClient();
    const tree = () => (
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    await screen.findByText('B1');

    expect(jest.mocked(HomeBannerAd).mock.calls.at(-1)?.[0]).toEqual({ focused: true });

    mockHomeIsFocused = false;
    await rendered.rerender(tree());
    expect(jest.mocked(HomeBannerAd).mock.calls.at(-1)?.[0]).toEqual({ focused: false });
  });

  it('fails closed until the focus lifecycle grants navigation ownership', async () => {
    mockHomeAutoFocus = false;
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    await fireEvent.press(screen.getByRole('button', { name: t('home.startPractice') }));
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await focusHome();
    await fireEvent.press(screen.getByRole('button', { name: t('home.startPractice') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/practice');
  });

  it('keeps one hardware-back subscription while invoking the latest handler', async () => {
    const remove = jest.fn();
    let subscribedHandler: (() => boolean) | undefined;
    jest.mocked(BackHandler.addEventListener).mockImplementation((_event, handler) => {
      subscribedHandler = handler as () => boolean;
      return { remove };
    });

    const rendered = await render(<HardwareBackHarness consume={false} />);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    expect(subscribedHandler?.()).toBe(false);

    await rendered.rerender(<HardwareBackHarness consume />);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    expect(subscribedHandler?.()).toBe(true);

    await rendered.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('rejects a queued navigation after blur and accepts it after refocus', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');
    const staleNavigation = committedPressHandler(
      screen.getByRole('button', { name: t('home.startPractice') }),
    );

    await blurHome();
    void staleNavigation();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await focusHome();
    await fireEvent.press(screen.getByRole('button', { name: t('home.startPractice') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/practice');
  });

  it('shows the session summary card and dismisses it into the tally reset', async () => {
    mockPracticeFlow = makePracticeFlow({
      sessionTally: { attempts: 5, passed: 3, mastered: 2, levelUps: 1 },
    });
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    expect((await screen.findByText(t('summary.title'))).props.accessibilityRole).toBe('header');
    expect(screen.getByText(t('summary.attempts', { count: 5 }))).toBeTruthy();
    expect(screen.getByText(t('summary.passed', { count: 3 }))).toBeTruthy();
    expect(screen.getByText(t('summary.mastered', { count: 2 }))).toBeTruthy();
    expect(screen.getByText(t('summary.levelUps', { count: 1 }))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('summary.dismiss') }));
    expect(mockPracticeFlow.resetSessionTally).toHaveBeenCalledTimes(1);
  });

  it('hides the level-up line for a session without promotions', async () => {
    mockPracticeFlow = makePracticeFlow({
      sessionTally: { attempts: 2, passed: 1, mastered: 0, levelUps: 0 },
    });
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    expect(await screen.findByText(t('summary.title'))).toBeTruthy();
    expect(screen.queryByText(t('summary.levelUps', { count: 0 }))).toBeNull();
  });

  it('shows no summary card before any scored attempt', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    expect(screen.queryByText(t('summary.title'))).toBeNull();
  });

  it('consumes the Android hardware back press while the entry gate is still beneath Home', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    expect(backHandlers.length).toBeGreaterThan(0);
    // Popping would land on the gate, which redirects straight back here.
    expect(backHandlers[backHandlers.length - 1]()).toBe(true);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('lets the Android hardware back press leave the app when Home is the whole stack', async () => {
    // Nothing to pop: swallowing the press would make back a dead key, since
    // React Native only reaches its exit-the-app default when no handler
    // claims the press.
    mockRouter.canGoBack.mockReturnValue(false);
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    expect(backHandlers.length).toBeGreaterThan(0);
    expect(backHandlers[backHandlers.length - 1]()).toBe(false);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderHome();

    expect(mockGetStats).not.toHaveBeenCalled();
    expect(screen.queryByText(t('home.loading'))).toBeNull();
  });
});

describe('home screen presentation', () => {
  const CARD_LABEL = {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  };

  const CENTERED_STATE = {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  const SUMMARY_DISMISS = {
    marginTop: spacing.md,
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.success,
  };

  async function renderLoadedHome(stats: PracticeStats = STATS) {
    mockGetStats.mockResolvedValue(stats);
    await renderHome();
    await screen.findByText(t('home.masteryLabel'));
  }

  it('lays the screen out on the shared page tokens', async () => {
    await renderLoadedHome();

    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(screen.getByText(t('practice.greeting', { name: USER.name })))).toEqual({
      fontSize: 15,
      color: colors.muted,
      marginBottom: spacing.md,
    });
    // The CTA keeps its own gap from the card above it.
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('home.startPractice') })),
    ).toMatchObject({ marginTop: spacing.xl });
    // History and Settings sit side by side, centred, under the CTA.
    expect(
      flattenedStyle(parentOf(screen.getByRole('button', { name: t('header.history') }))),
    ).toEqual({
      marginTop: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: spacing.xl,
    });
  });

  it('centres the loading state and names the spinner for screen readers', async () => {
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    await renderHome();

    const spinner = screen.getByLabelText(t('home.loading'));
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe(colors.primary);

    const message = screen.getByText(t('home.loading'));
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(message)).toEqual(MUTED_BODY);
    expect(flattenedStyle(parentOf(message))).toEqual(CENTERED_STATE);
  });

  it('centres the error state and its retry action', async () => {
    mockGetStats.mockRejectedValue(new ApiError(500, 'boom'));
    await renderHome();

    const title = await screen.findByRole('header', { name: t('home.loadFailedTitle') });
    expect(flattenedStyle(title)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });

    const message = screen.getByText(t('error.serverBusy'));
    expect(message.props.accessibilityLiveRegion).toBe('assertive');
    expect(flattenedStyle(message)).toEqual(MUTED_BODY);
    expect(flattenedStyle(parentOf(message))).toEqual(CENTERED_STATE);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.xl });
  });

  it('renders the stats card, its labels, and the due chip on the shared tokens', async () => {
    await renderLoadedHome();

    const levelLabel = screen.getByText(t('home.levelLabel'));
    const masteryLabel = screen.getByText(t('home.masteryLabel'));
    expect(flattenedStyle(levelLabel)).toEqual(CARD_LABEL);
    expect(flattenedStyle(masteryLabel)).toEqual(CARD_LABEL);
    // The mastery label sits directly in the card; the level label sits one
    // level deeper, in the row that keeps the due chip on the opposite edge.
    expect(flattenedStyle(parentOf(masteryLabel))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: layout.screenPadding,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(parentOf(parentOf(levelLabel)))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    });
    expect(flattenedStyle(parentOf(levelLabel))).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 160,
    });

    expect(flattenedStyle(screen.getByText('B1'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 30,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('cefr.B1')))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.muted,
    });
    expect(flattenedStyle(screen.getByText(t('home.dueChip', { count: 4 })))).toEqual({
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(screen.getByText(t('home.dueChip', { count: 4 }))))).toEqual({
      maxWidth: '100%',
      flexShrink: 1,
      backgroundColor: colors.primaryLight,
      borderRadius: radii.pill,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginTop: spacing.md,
    });
  });

  it('renders the mastery bar, streak row, and today line on the shared tokens', async () => {
    await renderLoadedHome();

    const bar = screen.getByRole('progressbar', { name: t('home.masteryLabel') });
    expect(flattenedStyle(bar)).toEqual({
      marginTop: spacing.sm,
      height: 12,
      borderRadius: radii.pill,
      backgroundColor: colors.border,
      // The fill is clipped to the rounded track instead of overflowing it.
      overflow: 'hidden',
    });
    // The fill spans the track's full height, so only its width reads as progress.
    expect(flattenedStyle(bar.children[0] as TestInstance)).toEqual({
      width: '30%',
      height: '100%',
      borderRadius: radii.pill,
      backgroundColor: colors.success,
    });

    expect(
      flattenedStyle(
        screen.getByText(
          t('practice.progressLine', { mastered: 3, total: 10 }) +
            t('practice.progressLearning', { count: 2 }),
        ),
      ),
    ).toEqual({ marginTop: spacing.sm, fontSize: 14, color: colors.text });

    const flame = screen.getByText('🔥', { includeHiddenElements: true });
    expect(flattenedStyle(flame)).toEqual({ fontSize: 22 });
    expect(flattenedStyle(parentOf(flame))).toEqual({
      marginTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    expect(flattenedStyle(screen.getByText(t('home.streakMany', { count: 5 })))).toEqual({
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      // A long streak line wraps beside the flame instead of pushing it out.
      flexShrink: 1,
    });
    expect(flattenedStyle(screen.getByText(t('home.practicedToday', { count: 3 })))).toEqual({
      marginTop: spacing.sm,
      fontSize: 14,
      color: colors.muted,
    });
  });

  it('renders the session summary card and tints its dismiss control while pressed', async () => {
    mockPracticeFlow = makePracticeFlow({
      sessionTally: { attempts: 5, passed: 3, mastered: 2, levelUps: 1 },
    });
    await renderLoadedHome();

    const title = screen.getByText(t('summary.title'));
    expect(flattenedStyle(title)).toEqual({ fontSize: 17, fontWeight: '700', color: colors.text });
    expect(flattenedStyle(parentOf(title))).toEqual({
      marginBottom: spacing.md,
      backgroundColor: colors.successLight,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.success,
    });
    expect(flattenedStyle(screen.getByText(t('summary.attempts', { count: 5 })))).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText(t('summary.dismiss')))).toEqual({
      color: colors.success,
      fontSize: 15,
      fontWeight: '700',
    });

    const dismiss = () => screen.getByRole('button', { name: t('summary.dismiss') });
    // At rest the dismiss control is an unfilled, touch-sized outline button.
    expect(flattenedStyle(dismiss())).toEqual(SUMMARY_DISMISS);
    await fireEvent(dismiss(), 'responderGrant', responderEvent());
    expect(flattenedStyle(dismiss())).toEqual({
      ...SUMMARY_DISMISS,
      backgroundColor: colors.card,
    });
    await fireEvent(dismiss(), 'responderTerminate', responderEvent());
    await waitFor(() => expect(flattenedStyle(dismiss()).backgroundColor).toBeUndefined());
  });
});
