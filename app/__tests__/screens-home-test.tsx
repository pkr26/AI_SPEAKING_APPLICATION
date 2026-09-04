import {
  notifyManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated, BackHandler, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HomeScreen from '../src/app/(tabs)/home';
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
    restoreFeedback: jest.fn(),
    clearRecordingReferences: jest.fn(),
    clearFeedback: jest.fn(),
    resetSessionTally: jest.fn(),
    resetPracticeFlow: jest.fn(),
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

/** The nth child of a host view, asserted so a dropped layout piece dies as a kill. */
function childViewAt(node: TestInstance, index: number): TestInstance {
  const child = node.children[index];
  // Assert, never dereference: a wiring mutant that removes the layout this
  // pin walks into must fail on the matcher, not on a raw TypeError.
  expect(child && typeof child).toBe('object');
  return child as TestInstance;
}

type SvgGlyphElement = React.ReactElement<{ width?: number; height?: number; children?: unknown }>;

/** The Svg element an Icon host view renders — the authored glyph wiring surface. */
function svgOf(host: TestInstance): SvgGlyphElement {
  const svg: unknown = host.props.children;
  expect(React.isValidElement(svg)).toBe(true);
  return svg as SvgGlyphElement;
}

/** Authored SVG primitives of a glyph (fragment unwrapped), as in icon-test. */
function svgPrimitives(svg: SvgGlyphElement): React.ReactElement<{ [prop: string]: unknown }>[] {
  const rendered: unknown = svg.props.children;
  if (rendered === undefined || rendered === null) return [];
  const children =
    React.isValidElement(rendered) && rendered.type === React.Fragment
      ? (rendered.props as { children?: unknown }).children
      : rendered;
  if (children === undefined || children === null) return [];
  return (Array.isArray(children) ? children : [children]) as React.ReactElement<{
    [prop: string]: unknown;
  }>[];
}

function committedPressHandler(node: TestInstance): () => unknown {
  type Fiber = {
    memoizedProps?: { onPress?: unknown };
    return: Fiber | null;
  };
  let fiber = node.unstable_fiber as Fiber | null;
  let handler: (() => unknown) | undefined;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      handler = fiber.memoizedProps.onPress as () => unknown;
      break;
    }
    fiber = fiber.return;
  }
  // Assert instead of throwing raw: a missing handler is the observable
  // behavior under a wiring mutant and must fail as a kill, never an error.
  expect(handler).toBeInstanceOf(Function);
  return handler as () => unknown;
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

function refreshHandler(): () => void {
  const [scroll] = screen.container.queryAll(
    (candidate) => typeof candidate.props.refreshControl?.props?.onRefresh === 'function',
  );
  const onRefresh = scroll?.props.refreshControl?.props?.onRefresh;
  if (typeof onRefresh !== 'function') {
    // Assert instead of throwing raw so a wiring mutant that never mounts the
    // refresh control dies as a kill, never an infrastructure error.
    expect(onRefresh).toBeInstanceOf(Function);
    return () => undefined;
  }
  return onRefresh as () => void;
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

beforeEach(() => {
  onlineManager.setOnline(true);
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
  it('shows an auto-resuming offline state instead of an endless first-load spinner', async () => {
    onlineManager.setOnline(false);
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(screen.getByText(t('network.offlineBody'))).toBeTruthy();
    expect(mockGetStats).not.toHaveBeenCalled();
  });

  it('shows a loading state while stats load', async () => {
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    await renderHome(queryClient);

    const hidden = { includeHiddenElements: true } as const;
    expect(screen.getByText(t('home.loading'), hidden).props.accessibilityLiveRegion).toBe(
      'polite',
    );
    // The dashboard skeleton mirrors the loaded layout: three tiles + card.
    expect(screen.getAllByTestId('home-skeleton-tile', hidden)).toHaveLength(1);
    expect(screen.getByTestId('home-skeleton-card', hidden)).toBeTruthy();
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
    mockGetStats
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockResolvedValueOnce(STATS);
    await renderHome(queryClient);

    await waitFor(() =>
      expect(queryClient.getQueryState(['practice-stats', USER.id])?.status).toBe('error'),
    );
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.queryByText(t('home.loadFailedTitle'))).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(t('refresh.failedUsingSaved'));
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: t('home.startPractice') })).toBeTruthy();
  });

  it('pulls loaded stats to refresh only while the rendered session lease is current', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    await act(async () => {
      refreshHandler()();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledTimes(2));

    jest.mocked(mockAuthValue.isSessionLeaseCurrent).mockReturnValue(false);
    refreshHandler()();
    expect(mockGetStats).toHaveBeenCalledTimes(2);
  });

  it('pins the dashboard scroll container and idle refresh control wiring', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    const [scroll] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
    expect(scroll?.props.contentInsetAdjustmentBehavior).toBe('automatic');
    // The mounted pull-to-refresh control carries the brand tint and sits idle
    // (refreshing false) while nothing is in flight.
    const control = scroll?.props.refreshControl as
      { props?: { refreshing?: unknown; tintColor?: unknown } } | undefined;
    expect(control?.props?.refreshing).toBe(false);
    expect(control?.props?.tintColor).toBe(colors.primary);
  });

  it('marks the refresh control and freshness notice while a background refresh is in flight', async () => {
    const client = makeQueryClient();
    client.setQueryData(['practice-stats', USER.id], STATS);
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    await renderHome(client);

    expect(screen.getByText('B1')).toBeTruthy();
    const [scroll] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
    expect(scroll?.props.refreshControl?.props?.refreshing).toBe(true);
    // The nonblocking notice announces the update without replacing the data.
    expect(screen.getByText(t('refresh.updating'))).toBeTruthy();
  });

  it('drives the mastery bar fill from the mastered share of the level total', async () => {
    // The RN jest preset resolves the Reduce Motion probe to false, so the bar
    // takes its animated path deterministically.
    const timingSpy = jest.spyOn(Animated, 'timing');
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    // 3 of 10 words mastered: the bar animates to the 0.3 fraction. A dropped
    // progress prop collapses the bar to 0 instead.
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.3, useNativeDriver: false }),
    );
    timingSpy.mockRestore();
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
    // The flame is a themed decorative icon; screen readers get the streak text.
    const flame = screen.getByTestId('home-streak-flame', { includeHiddenElements: true });
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

  it('pins the placement-reset wait surface wiring', async () => {
    mockGetStats.mockResolvedValue({
      level: null,
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    });
    await renderHome();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The wait surface scrolls with automatic content insets, centres a large
    // brand spinner, and captions it with the shared muted body style.
    const [gateScroll] = screen.container.queryAll(
      (candidate) => candidate.type === 'RCTScrollView',
    );
    expect(gateScroll?.props.contentInsetAdjustmentBehavior).toBe('automatic');
    const spinner = screen.getByLabelText(t('gate.loadingProfile'));
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe(colors.primary);
    expect(flattenedStyle(screen.getByText(t('gate.loadingProfile')))).toEqual({
      marginTop: spacing.md,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
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

    // The shared bar reports the mastered share as a percent and paints the
    // fill with the success token.
    const bar = await screen.findByRole('progressbar', { name: t('home.masteryLabel') });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 3 });
    const fill = screen.getByTestId('home-mastery-bar-fill', { includeHiddenElements: true });
    expect(flattenedStyle(fill)).toMatchObject({
      height: '100%',
      backgroundColor: colors.success,
    });
  });

  it('reports an empty mastery bar when the level total is defensively zero', async () => {
    mockGetStats.mockResolvedValue({
      ...STATS,
      progress: { ...STATS.progress, masteredCount: 0, totalAtLevel: 0 },
    });
    await renderHome();

    const bar = await screen.findByRole('progressbar', { name: t('home.masteryLabel') });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 0, now: 0 });
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
    // The all-caught-up line shares the muted today-line style.
    expect(flattenedStyle(screen.getByText(t('home.dueNone')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 14,
      color: colors.muted,
    });
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

  it.each([[t('home.startPractice'), '/practice']] as const)(
    'navigates once from %s after a rapid double tap',
    async (label, destination) => {
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
    },
  );

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

  const SUMMARY_LINE = {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
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
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.md,
    });
    // The CTA keeps its own gap from the card above it, wears the hero size,
    // and stretches across the content column (fullWidth).
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('home.startPractice') })),
    ).toMatchObject({ marginTop: spacing.xl, paddingVertical: spacing.ml, alignSelf: 'stretch' });
    // Peer destinations moved to the bottom tab bar; the surface ends at the CTA.
    for (const label of [t('header.history'), t('header.recordings'), t('header.settings')]) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('mirrors the dashboard as a skeleton while politely announcing the wait', async () => {
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    await renderHome();

    const hidden = { includeHiddenElements: true } as const;
    const message = screen.getByText(t('home.loading'), hidden);
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    // The wait line itself is visually hidden (zero height and opacity) while
    // staying in the accessibility tree.
    expect(flattenedStyle(message)).toEqual({ height: 0, opacity: 0 });
    expect(flattenedStyle(parentOf(message))).toEqual({
      alignSelf: 'stretch',
      gap: spacing.md,
    });

    // The skeleton previews the loaded structure: the tile row, then the card.
    expect(screen.getByTestId('home-skeleton-card', hidden)).toBeTruthy();
    const tileRow = parentOf(screen.getByTestId('home-skeleton-tile', hidden));
    expect(flattenedStyle(tileRow)).toEqual({
      flexDirection: 'row',
      gap: spacing.sm,
    });
    // Every tile block previews a 96dp stat tile with the card radius; the
    // trailing block previews the 120dp detail card.
    const tiles = tileRow.children.filter(
      (child): child is TestInstance => typeof child !== 'string',
    );
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) {
      expect(flattenedStyle(tile)).toMatchObject({ height: 96, borderRadius: 16 });
    }
    expect(flattenedStyle(screen.getByTestId('home-skeleton-card', hidden))).toMatchObject({
      height: 120,
      borderRadius: 16,
    });
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
    // The full-width retry action owns the centered error column.
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.xl, alignSelf: 'stretch' });
  });

  it('renders the stat tiles, detail card, and due chip on the shared tokens', async () => {
    await renderLoadedHome();

    // The glanceable row: three tiles, each naming its own figure.
    expect(screen.getByTestId('home-level-tile')).toBeTruthy();
    expect(screen.getByTestId('home-streak-tile')).toBeTruthy();
    expect(screen.getByTestId('home-mastery-tile')).toBeTruthy();
    expect(screen.getByText(t('home.levelLabel'))).toBeTruthy();
    expect(screen.getByText(t('home.streakLabel'))).toBeTruthy();
    expect(screen.getByText(t('home.masteryLabel'))).toBeTruthy();
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    const explain = screen.getByText(t('cefr.B1'));
    expect(flattenedStyle(explain)).toEqual({
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primaryLight,
      borderRadius: radii.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    });

    // The glanceable row lays its three tiles out as a spaced strip.
    expect(flattenedStyle(parentOf(screen.getByTestId('home-level-tile')))).toEqual({
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    });

    // Tile tints: level primary, streak accent, mastery success — each a tinted
    // fill carrying a transparent hairline.
    expect(flattenedStyle(screen.getByTestId('home-level-tile'))).toMatchObject({
      backgroundColor: colors.primaryLight,
      borderColor: 'transparent',
    });
    expect(flattenedStyle(screen.getByTestId('home-streak-tile'))).toMatchObject({
      backgroundColor: colors.accentLight,
      borderColor: 'transparent',
    });
    expect(flattenedStyle(screen.getByTestId('home-mastery-tile'))).toMatchObject({
      backgroundColor: colors.successLight,
      borderColor: 'transparent',
    });

    // Each tile badge carries its own glyph in its tint ink: target (three
    // circles), flame (one path), trophy (three paths).
    const badgeGlyph = (tile: TestInstance) =>
      svgPrimitives(svgOf(childViewAt(childViewAt(tile, 0), 0)));
    const levelGlyph = badgeGlyph(screen.getByTestId('home-level-tile'));
    expect(levelGlyph).toHaveLength(3);
    // The bullseye's innermost dot is filled, not stroked.
    for (const primitive of levelGlyph) {
      if (primitive.props.stroke !== undefined) {
        expect(primitive.props.stroke).toBe(colors.primary);
      }
    }
    const streakGlyph = badgeGlyph(screen.getByTestId('home-streak-tile'));
    expect(streakGlyph).toHaveLength(1);
    expect(streakGlyph[0]?.props.stroke).toBe(colors.accent);
    const masteryGlyph = badgeGlyph(screen.getByTestId('home-mastery-tile'));
    expect(masteryGlyph).toHaveLength(3);
    for (const primitive of masteryGlyph) expect(primitive.props.stroke).toBe(colors.success);

    // The detail card nests the level summary row with the shared card tokens.
    expect(flattenedStyle(parentOf(explain))).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 160,
    });
    expect(flattenedStyle(parentOf(parentOf(explain)))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    });
    expect(flattenedStyle(parentOf(parentOf(parentOf(explain))))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: layout.screenPadding,
      borderWidth: 1,
      borderColor: colors.border,
    });

    // The due chip leads with the small refresh glyph in brand ink.
    const dueChip = parentOf(screen.getByText(t('home.dueChip', { count: 4 })));
    const refreshSvg = svgOf(childViewAt(dueChip, 0));
    expect(refreshSvg.props.width).toBe(13);
    expect(refreshSvg.props.height).toBe(13);
    const refreshGlyph = svgPrimitives(refreshSvg);
    expect(refreshGlyph).toHaveLength(4);
    for (const primitive of refreshGlyph) {
      expect(primitive.props.stroke).toBe(colors.primary);
      expect(primitive.props.strokeWidth).toBe(2.4);
    }
  });

  it('renders the mastery bar, streak row, and today line on the shared tokens', async () => {
    await renderLoadedHome();

    const bar = screen.getByRole('progressbar', { name: t('home.masteryLabel') });
    expect(flattenedStyle(bar)).toEqual({
      alignSelf: 'stretch',
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: 'hidden',
    });
    const fill = screen.getByTestId('home-mastery-bar-fill', { includeHiddenElements: true });
    expect(flattenedStyle(fill)).toMatchObject({
      height: '100%',
      borderRadius: 4,
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

    // The flame is the themed decorative icon in the streak row.
    const flame = screen.getByTestId('home-streak-flame', { includeHiddenElements: true });
    expect(flame.props.accessibilityElementsHidden).toBe(true);
    expect(flame.props.importantForAccessibility).toBe('no-hide-descendants');
    // Its glyph scales to the authored 22dp square in accent ink at the
    // authored stroke weight (one path).
    const flameSvg = svgOf(flame);
    expect(flameSvg.props.width).toBe(22);
    expect(flameSvg.props.height).toBe(22);
    const flameGlyph = svgPrimitives(flameSvg);
    expect(flameGlyph).toHaveLength(1);
    expect(flameGlyph[0]?.props.stroke).toBe(colors.accent);
    expect(flameGlyph[0]?.props.strokeWidth).toBe(2.2);
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
    expect(flattenedStyle(screen.getByText(t('summary.attempts', { count: 5 })))).toEqual(
      SUMMARY_LINE,
    );
    expect(flattenedStyle(screen.getByText(t('summary.passed', { count: 3 })))).toEqual(
      SUMMARY_LINE,
    );
    expect(flattenedStyle(screen.getByText(t('summary.mastered', { count: 2 })))).toEqual(
      SUMMARY_LINE,
    );
    expect(flattenedStyle(screen.getByText(t('summary.levelUps', { count: 1 })))).toEqual(
      SUMMARY_LINE,
    );
    // The dismiss control is the shared quiet Button: primary text, no fill.
    const dismiss = () => screen.getByRole('button', { name: t('summary.dismiss') });
    expect(flattenedStyle(screen.getByText(t('summary.dismiss')))).toEqual({
      flexShrink: 1,
      fontWeight: '700',
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 21,
      color: colors.primary,
    });
    expect(flattenedStyle(dismiss())).toMatchObject({
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    });
    await fireEvent(dismiss(), 'responderGrant', responderEvent());
    expect(flattenedStyle(dismiss())).toMatchObject({ backgroundColor: colors.primaryLight });
    await fireEvent(dismiss(), 'responderTerminate', responderEvent());
    await waitFor(() => expect(flattenedStyle(dismiss()).backgroundColor).toBeUndefined());
  });
});
