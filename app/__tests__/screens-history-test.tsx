import {
  InfiniteQueryObserver,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, SectionList, StyleSheet, useColorScheme } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HistoryScreen, {
  groupHistoryByDay,
  HISTORY_MAX_PAGES,
  nextHistoryPageParam,
} from '../src/app/(tabs)/history';
import HistoryNativeAdCard from '../src/components/HistoryNativeAdCard';
import RecordingPlayback from '../src/components/RecordingPlayback';
import { apiGetPracticeHistory, ApiError } from '../src/lib/api';
import { type SessionLease, useAuth } from '../src/lib/auth';
import {
  I18nProvider,
  setActiveLanguage,
  translateFor,
  type MessageKey,
  type UiLanguage,
} from '../src/lib/i18n';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
import {
  PRACTICE_MASTER_SCORE,
  PRACTICE_PASS_SCORE,
  type HistoryItem,
  type HistoryPage,
  type NativeLanguage,
  type User,
} from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const asMock = (fn: unknown) => fn as jest.Mock;

// Keep React Native's real SectionList behavior while retaining the exact
// route-level props that the host RCTScrollView does not expose.
jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const MockSectionList = jest.fn((props: Record<string, unknown>) =>
    ReactActual.createElement(actual.SectionList as React.ElementType, props),
  );
  return new Proxy(actual, {
    get(target, property, receiver) {
      return property === 'SectionList' ? MockSectionList : Reflect.get(target, property, receiver);
    },
  });
});

// History renders in the light palette unless a test flips the OS scheme; the
// dark palette carries its own on-fill ink decisions.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

let mockHistoryIsFocused = true;
let mockHistoryAutoFocus = true;
interface MockHistoryFocusRegistration {
  callback: () => void | (() => void);
  cleanup: (() => void) | null;
}
const mockHistoryFocusRegistrations: MockHistoryFocusRegistration[] = [];

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
        mockHistoryFocusRegistrations.push(registration);
        const cleanup = mockHistoryAutoFocus ? callback() : undefined;
        registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
        return () => {
          registration.cleanup?.();
          const index = mockHistoryFocusRegistrations.indexOf(registration);
          if (index >= 0) mockHistoryFocusRegistrations.splice(index, 1);
        };
      }, [callback]);
    },
    useIsFocused: () => mockHistoryIsFocused,
  };
});

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

const OTHER_USER: User = {
  ...USER,
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Grace Hopper',
  email: 'grace@example.com',
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetPracticeHistory: jest.fn(),
}));

jest.mock('../src/components/RecordingPlayback', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ recordingId }: { recordingId: string }) =>
      ReactActual.createElement(Text, null, `recording-player:${recordingId}`),
    ),
  };
});

jest.mock('../src/components/HistoryNativeAdCard', () => ({
  __esModule: true,
  default: jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactActual = require('react') as typeof import('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native') as typeof import('react-native');
    return ReactActual.createElement(Text, { testID: 'history-native-ad' }, 'history-native-ad');
  }),
}));

const mockGetHistory = apiGetPracticeHistory as jest.Mock;
const mockHistoryRouter = jest.requireMock('expo-router').router as {
  navigate: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
  canGoBack: jest.Mock;
};

/** Hardware-back handlers registered by the mounted screen (mocked native side). */
let backHandlers: (() => boolean)[] = [];

function historyItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: '550e8400-e29b-41d4-a716-446655440031',
    questionId: '550e8400-e29b-41d4-a716-446655440032',
    promptWord: 'courage',
    questionText: 'Describe a time you showed courage.',
    cefrLevel: 'B1',
    context: 'practice',
    nativeLanguage: null,
    cycleId: '550e8400-e29b-41d4-a716-446655440020',
    attemptNo: 2,
    score: 82,
    passed: true,
    understood: null,
    transcript: 'I was brave at work.',
    translatedTranscript: null,
    modelAnswer: null,
    feedback: 'Nice detail.',
    createdAt: '2026-08-15T10:00:00.000Z',
    ...overrides,
  };
}

/** Same formatting the screen uses (en locale under jest). */
function dayHeading(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** The BCP-47 tag each account language must format its day headings with. */
const DATE_TAGS: [NativeLanguage, string][] = [
  ['te', 'te-IN'],
  ['hi', 'hi-IN'],
  ['es', 'es-ES'],
  ['zh', 'zh-Hans'],
];

const queryClients: QueryClient[] = [];

/** Fresh client per test; a non-zero `staleTime` lets a seeded cache render as-is. */
function makeQueryClient(staleTime = 0) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } });
  queryClients.push(client);
  return client;
}

function markOrdinaryFetchInFlight(client: QueryClient, queryKey: readonly unknown[]) {
  const query = client.getQueryCache().find({ queryKey, exact: true });
  if (!query) throw new Error(`No query exists for ${JSON.stringify(queryKey)}`);
  query.setState({ fetchStatus: 'fetching', fetchMeta: null });
}

function renderHistory(queryClient = makeQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryScreen />
    </QueryClientProvider>,
  );
}

/** Mounts the screen for a signed-in learner whose account language is `language`. */
function renderHistoryIn(language: NativeLanguage) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider accountLanguage={language}>
        <HistoryScreen />
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

function centeredStateStyle(node: TestInstance): SemanticStyle {
  const [scrollView] = screen.container.queryAll(
    (candidate) => candidate.props.contentContainerStyle !== undefined,
  );
  if (scrollView) return StyleSheet.flatten(scrollView.props.contentContainerStyle) ?? {};
  let current: TestInstance | null = node.parent;
  while (current) {
    const style = flattenedStyle(current);
    if (style.flexGrow === 1 && style.justifyContent === 'center') return style;
    current = current.parent;
  }
  throw new Error('Centered scroll content was not found');
}

function committedPressHandler(node: TestInstance): () => void {
  type Fiber = {
    memoizedProps: { onPress?: unknown } | null;
    return: Fiber | null;
    type: unknown;
  };
  let fiber = (node as unknown as { unstable_fiber: Fiber | null }).unstable_fiber;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => void;
    }
    if (fiber.return === null || typeof fiber.return.type === 'string') break;
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
}

async function blurHistory(): Promise<void> {
  await act(async () => {
    for (const registration of mockHistoryFocusRegistrations) {
      const cleanup = registration.cleanup;
      registration.cleanup = null;
      cleanup?.();
    }
  });
}

async function focusHistory(): Promise<void> {
  await act(async () => {
    for (const registration of mockHistoryFocusRegistrations) {
      const cleanup = registration.callback();
      registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
    }
  });
}

/**
 * SectionList renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function listView(): TestInstance {
  const [node] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
  if (!node) throw new Error('No SectionList rendered');
  return node;
}

function refreshHandler(): () => void {
  const [scroll] = screen.container.queryAll(
    (candidate) => typeof candidate.props.refreshControl?.props?.onRefresh === 'function',
  );
  const onRefresh = scroll?.props.refreshControl?.props?.onRefresh;
  if (typeof onRefresh !== 'function') throw new Error('No RefreshControl rendered');
  return onRefresh as () => void;
}

function sectionListProps(): Record<string, unknown> {
  const props = asMock(SectionList).mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  if (!props) throw new Error('No SectionList rendered');
  return props;
}

/** The row header, addressed the way a screen reader announces it. */
function rowHeader(promptWord: string, score: number): TestInstance {
  return screen.getByRole('button', {
    name: `${promptWord}. ${t('feedback.scoreLine', { score })}. ${t(
      'history.contextPractice',
    )}. ${t('history.attemptNo', { number: 2 })}. ${t('history.showDetails')}`,
  });
}

/** The expand/collapse hint every row header carries for screen readers. */
function expectRowHint(promptWord: string, score: number): void {
  expect(rowHeader(promptWord, score).props.accessibilityHint).toBe(t('history.detailsHint'));
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

/** The centered full-screen slot the loading, error, and empty states sit in. */
const CENTER_STATE: SemanticStyle = {
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: layout.screenPadding,
  width: '100%',
  maxWidth: layout.contentMaxWidth,
  alignSelf: 'center',
  backgroundColor: colors.background,
};

/** Secondary copy under a state title, and under the footer spinner. */
const MUTED_TEXT: SemanticStyle = {
  marginTop: spacing.md,
  fontSize: 15,
  color: colors.muted,
  textAlign: 'center',
};

const STATE_TITLE: SemanticStyle = {
  fontSize: 20,
  fontWeight: '700',
  color: colors.text,
  textAlign: 'center',
};

const DETAIL_LABEL: SemanticStyle = {
  fontSize: 12,
  fontWeight: '700',
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginTop: spacing.md,
};

const DETAIL_TEXT: SemanticStyle = {
  marginTop: spacing.xs,
  fontSize: 15,
  lineHeight: 21,
  color: colors.text,
};

const ROW_HEADER: SemanticStyle = {
  minHeight: layout.minimumTarget,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
  padding: spacing.lg,
};

const SCORE_CHIP: SemanticStyle = {
  borderRadius: radii.pill,
  paddingVertical: 3,
  paddingHorizontal: 10,
};

const SCORE_CHIP_TEXT: SemanticStyle = { fontSize: 12, fontWeight: '700' };

const CONTEXT_BADGE: SemanticStyle = {
  backgroundColor: colors.primary,
  borderRadius: radii.badge,
  paddingVertical: 3,
  paddingHorizontal: 10,
};

const CONTEXT_BADGE_TEXT: SemanticStyle = {
  fontSize: 12,
  fontWeight: '700',
  color: colors.onPrimary,
};

beforeEach(() => {
  onlineManager.setOnline(true);
  jest.clearAllMocks();
  // Module factory mocks outlive clearAllMocks; re-arm the light default.
  asMock(useColorScheme).mockReset();
  asMock(useColorScheme).mockReturnValue('light');
  // clearAllMocks keeps recorded return values, so re-arm the rooted default:
  // History is the whole signed-in stack unless a test puts a route beneath it.
  mockHistoryRouter.canGoBack.mockReturnValue(false);
  // The account-language tests mount the real I18nProvider, whose effect moves
  // the module-level language; pin it back so every test starts in English.
  setActiveLanguage('en');
  mockGetHistory.mockReset();
  mockAuthValue = makeAuth();
  mockHistoryIsFocused = true;
  mockHistoryAutoFocus = true;
  mockHistoryFocusRegistrations.length = 0;
  asMock(SectionList).mockClear();
  asMock(RecordingPlayback).mockClear();
  asMock(HistoryNativeAdCard).mockClear();
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: jest.fn() };
  });
});

afterEach(async () => {
  await act(async () => {
    // Let any query completion already queued by the test publish while the
    // mounted observer is still inside React's act boundary. Cleaning up first
    // leaves that publication racing the next test and produces a false
    // "not wrapped in act" warning in the full-suite order.
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    cleanup();
    for (const client of queryClients) client.clear();
    // TanStack Query batches observer notifications onto timers. Drain both
    // the clear publication and any timer it schedules before Jest tears down
    // this screen's React environment.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  queryClients.length = 0;
  jest.restoreAllMocks();
});

describe('groupHistoryByDay', () => {
  it('groups consecutive same-day items and keeps the newest-first order', () => {
    const items = [
      historyItem({ id: '550e8400-e29b-41d4-a716-446655440041' }),
      historyItem({
        id: '550e8400-e29b-41d4-a716-446655440042',
        createdAt: '2026-08-15T08:00:00.000Z',
      }),
      historyItem({
        id: '550e8400-e29b-41d4-a716-446655440043',
        createdAt: '2026-08-13T10:00:00.000Z',
      }),
    ];
    const sections = groupHistoryByDay(items, 'en-US');
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe(dayHeading('2026-08-15T10:00:00.000Z'));
    expect(sections[0].data.map((item) => item.id)).toEqual([items[0].id, items[1].id]);
    expect(sections[1].title).toBe(dayHeading('2026-08-13T10:00:00.000Z'));
    expect(sections[1].data.map((item) => item.id)).toEqual([items[2].id]);
  });

  it('returns no sections for no items', () => {
    expect(groupHistoryByDay([], 'en-US')).toEqual([]);
  });

  it('bounds cursor pagination and rejects repeated cursor cycles', () => {
    const page = (nextCursor: string | null): HistoryPage => ({ items: [], nextCursor });
    const first = page('cursor-first');
    expect(nextHistoryPageParam(page(null), [page(null)])).toBeUndefined();
    expect(nextHistoryPageParam(first, [first])).toBe('cursor-first');
    expect(
      nextHistoryPageParam(page('cursor-first'), [first, page('cursor-first')]),
    ).toBeUndefined();

    const bounded = Array.from({ length: HISTORY_MAX_PAGES }, (_, index) =>
      page(`cursor-${index}`),
    );
    expect(nextHistoryPageParam(bounded.at(-1)!, bounded)).toBeUndefined();
    expect(nextHistoryPageParam(bounded.at(-2)!, bounded.slice(0, -1))).toBe(
      `cursor-${HISTORY_MAX_PAGES - 2}`,
    );
  });
});

describe('history screen', () => {
  it('shows the offline first-load state and waits for automatic reconnect', async () => {
    onlineManager.setOnline(false);
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await renderHistory();

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('previews the list as row skeletons while the first page loads', async () => {
    mockGetHistory.mockReturnValue(new Promise(() => undefined));
    await renderHistory();
    const hidden = { includeHiddenElements: true } as const;
    expect(screen.getByText(t('history.loading'), hidden).props.accessibilityLiveRegion).toBe(
      'polite',
    );
    // Day header + three answer-card blocks mirror the loaded list.
    expect(screen.getByTestId('history-skeleton-header', hidden)).toBeTruthy();
    expect(
      flattenedStyle(parentOf(screen.getByTestId('history-skeleton-header', hidden))),
    ).toMatchObject({ gap: spacing.sm });
  });

  it('shows a retryable error when the first page fails', async () => {
    mockGetHistory
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: null });
    await renderHistory();

    expect((await screen.findByText(t('history.loadFailedTitle'))).props.accessibilityRole).toBe(
      'header',
    );
    expect(screen.getByText(t('error.serverBusy')).props.accessibilityLiveRegion).toBe('assertive');

    expect(flattenedStyle(screen.getByText(t('history.loadFailedTitle')))).toEqual(STATE_TITLE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_TEXT);
    expect(centeredStateStyle(screen.getByText(t('error.serverBusy')))).toEqual(CENTER_STATE);
    // The full-screen retry is a full-width primary action under the message.
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ alignSelf: 'stretch', marginTop: spacing.lg });

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect((await screen.findByText('courage')).props.accessibilityLanguage).toBe('en-US');
  });

  it('falls back to the screen copy when the failure carries no API status', async () => {
    mockGetHistory.mockRejectedValue(new TypeError('offline'));
    await renderHistory();

    expect(await screen.findByText(t('history.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('history.loadFailed'))).toBeTruthy();
  });

  it('reports a failed older page in the footer without losing the loaded answers', async () => {
    mockGetHistory
      .mockResolvedValueOnce({
        items: [historyItem()],
        nextCursor: '550e8400-e29b-41d4-a716-446655440053',
      })
      .mockRejectedValueOnce(new ApiError(500, 'boom'));
    await renderHistory();
    await screen.findByText('courage');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('courage')).toBeTruthy();
    // The list survives, so the full-screen error state must stay away — but
    // the footer has to say the older page failed instead of falling silently
    // back to the same 'Show older answers' button.
    expect(screen.queryByText(t('history.loadFailedTitle'))).toBeNull();
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
    expect(screen.queryByText(t('history.loadingMore'))).toBeNull();

    const message = screen.getByText(t('error.serverBusy'));
    expect(message.props.accessibilityLiveRegion).toBe('assertive');
    expect(flattenedStyle(message)).toEqual(MUTED_TEXT);
    expect(flattenedStyle(parentOf(message))).toEqual({
      paddingVertical: spacing.lg,
      alignItems: 'center',
    });
    // The retry is a full-width outlined action under the message.
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({
      borderWidth: 1,
      borderColor: colors.primary,
      alignSelf: 'stretch',
      marginTop: spacing.lg,
    });
  });

  it('falls back to the screen copy when a failed older page carries no API status', async () => {
    mockGetHistory
      .mockResolvedValueOnce({
        items: [historyItem()],
        nextCursor: '550e8400-e29b-41d4-a716-446655440061',
      })
      .mockRejectedValueOnce(new TypeError('offline'));
    await renderHistory();
    await screen.findByText('courage');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(t('history.loadFailed'))).toBeTruthy();
    // Transport detail never reaches the learner.
    expect(screen.queryByText(/offline/)).toBeNull();
  });

  it('waits for an explicit retry after a failed page instead of re-firing on scroll', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440062';
    mockGetHistory
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: cursor })
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440063',
            promptWord: 'journey',
            createdAt: '2026-08-13T10:00:00.000Z',
          }),
        ],
        nextCursor: null,
      });
    await renderHistory();
    await screen.findByText('courage');

    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockGetHistory).toHaveBeenCalledTimes(2);

    // Scrolling to the end again must not hammer the failing request.
    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockGetHistory).toHaveBeenCalledTimes(2);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetHistory).toHaveBeenCalledTimes(3);
    expect(mockGetHistory).toHaveBeenLastCalledWith(cursor, expect.anything());
    expect(await screen.findByText('journey')).toBeTruthy();
    expect(screen.queryByText(t('error.serverBusy'))).toBeNull();
    expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
  });

  it('shows the empty state for a learner with no attempts', async () => {
    mockGetHistory
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    await renderHistory();

    expect((await screen.findByText(t('history.emptyTitle'))).props.accessibilityRole).toBe(
      'header',
    );
    expect(screen.getByText(t('history.emptyBody'))).toBeTruthy();

    // The shared EmptyState carries the illustrated mark beside the copy.
    expect(screen.getByTestId('history-empty')).toBeTruthy();
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('home.startPractice') })),
    ).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
    });

    await act(async () => {
      refreshHandler()();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledTimes(2));
  });

  it('pulls a loaded answer list only while its rendered session lease is current', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');
    const onRefresh = sectionListProps().onRefresh as () => void;

    await act(async () => {
      onRefresh();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledTimes(2));

    jest.mocked(mockAuthValue.isSessionLeaseCurrent).mockReturnValue(false);
    onRefresh();
    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });

  it('retries a failed refresh without replacing a cached answer list', async () => {
    const client = makeQueryClient();
    client.setQueryData(['practice-history', USER.id], {
      pages: [{ items: [historyItem()], nextCursor: null }],
      pageParams: [undefined],
    });
    mockGetHistory
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: null });
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(t('refresh.failedUsingSaved'));
    expect(screen.getByText('courage')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledTimes(2));
    expect(screen.getByText('courage')).toBeTruthy();
  });

  it('navigates to Practice only once after a rapid empty-state double tap', async () => {
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await renderHistory();
    const startPractice = committedPressHandler(
      await screen.findByRole('button', { name: t('home.startPractice') }),
    );

    await act(async () => {
      startPractice();
      startPractice();
    });

    expect(mockHistoryRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockHistoryRouter.navigate).toHaveBeenCalledWith('/practice');
  });

  it('rejects empty-state navigation before focus and after blur, then accepts refocus', async () => {
    mockHistoryAutoFocus = false;
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await renderHistory();
    const startPracticeButton = await screen.findByRole('button', {
      name: t('home.startPractice'),
    });
    const retainedStartPractice = committedPressHandler(startPracticeButton);

    retainedStartPractice();
    expect(mockHistoryRouter.navigate).not.toHaveBeenCalled();

    await focusHistory();
    await blurHistory();
    retainedStartPractice();
    expect(mockHistoryRouter.navigate).not.toHaveBeenCalled();

    await focusHistory();
    await fireEvent.press(startPracticeButton);
    expect(mockHistoryRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockHistoryRouter.navigate).toHaveBeenCalledWith('/practice');
  });

  it('consumes the Android hardware back press while the entry gate is still beneath History', async () => {
    mockHistoryRouter.canGoBack.mockReturnValue(true);
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expect(backHandlers.length).toBeGreaterThan(0);
    // Popping would land on the gate, which redirects straight back into the
    // signed-in area.
    expect(backHandlers[backHandlers.length - 1]()).toBe(true);
    expect(mockHistoryRouter.back).not.toHaveBeenCalled();
    expect(mockHistoryRouter.replace).not.toHaveBeenCalled();
  });

  it('lets the Android hardware back press fall through when History is the whole stack', async () => {
    // Nothing to pop: swallowing the press would make back a dead key, since
    // React Native only reaches its exit-the-app default when no handler
    // claims the press.
    mockHistoryRouter.canGoBack.mockReturnValue(false);
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expect(backHandlers.length).toBeGreaterThan(0);
    expect(backHandlers[backHandlers.length - 1]()).toBe(false);
    expect(mockHistoryRouter.back).not.toHaveBeenCalled();
    expect(mockHistoryRouter.replace).not.toHaveBeenCalled();
  });

  it('renders rows grouped by day with score chips and context badges', async () => {
    mockGetHistory.mockResolvedValue({
      items: [
        historyItem(),
        historyItem({
          id: '550e8400-e29b-41d4-a716-446655440044',
          promptWord: 'journey',
          context: 'diagnostic',
          attemptNo: 1,
          score: 55,
          passed: false,
          createdAt: '2026-08-13T10:00:00.000Z',
        }),
      ],
      nextCursor: null,
    });
    await renderHistory();

    expect(await screen.findByText('courage')).toBeTruthy();
    expect(screen.getByText(dayHeading('2026-08-15T10:00:00.000Z')).props.accessibilityRole).toBe(
      'header',
    );
    expect(screen.getByText(dayHeading('2026-08-13T10:00:00.000Z'))).toBeTruthy();

    expect(screen.getByText(t('feedback.scoreLine', { score: 82 }))).toBeTruthy();
    expect(screen.getByText(t('feedback.scoreLine', { score: 55 }))).toBeTruthy();
    expect(screen.getByText(t('history.contextPractice'))).toBeTruthy();
    expect(screen.getByText(t('history.contextDiagnostic'))).toBeTruthy();
    // The attempt counter only makes sense for practice retries.
    expect(screen.getByText(t('history.attemptNo', { number: 2 }))).toBeTruthy();
    expect(screen.queryByText(t('history.attemptNo', { number: 1 }))).toBeNull();

    expect(flattenedStyle(listView())).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(StyleSheet.flatten(listView().props.contentContainerStyle)).toEqual({
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    const listProps = sectionListProps();
    expect(listProps).toMatchObject({
      accessibilityRole: 'list',
      contentInsetAdjustmentBehavior: 'automatic',
      initialNumToRender: 12,
      onEndReachedThreshold: 0.4,
    });
    const sectionData = listProps.sections as { title: string; data: HistoryItem[] }[];
    expect(sectionData.map((section) => section.data.map((item) => item.id))).toEqual([
      ['550e8400-e29b-41d4-a716-446655440031'],
      ['550e8400-e29b-41d4-a716-446655440044'],
    ]);
    const keyExtractor = listProps.keyExtractor as (item: HistoryItem) => string;
    expect(keyExtractor(sectionData[1].data[0])).toBe('550e8400-e29b-41d4-a716-446655440044');
    // The day header pins to the top of the list while its rows scroll past on
    // iOS, so it pads its own opaque band rather than floating on margins.
    expect(flattenedStyle(screen.getByText(dayHeading('2026-08-15T10:00:00.000Z')))).toEqual({
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      fontSize: 14,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    });
  });

  it.each(DATE_TAGS)('writes day headings with the %s BCP-47 tag', async (language, tag) => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistoryIn(language);
    await screen.findByText('courage');

    const heading = new Date('2026-08-15T10:00:00.000Z').toLocaleDateString(tag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.queryByText(dayHeading('2026-08-15T10:00:00.000Z'))).toBeNull();
  });

  it('re-groups dates and retranslates rows when the UI language changes in place', async () => {
    const client = makeQueryClient(Infinity);
    client.setQueryData(['practice-history', USER.id], {
      pages: [{ items: [historyItem()], nextCursor: null }],
      pageParams: [undefined],
    });
    let language: UiLanguage = 'en';
    const tree = () => (
      <QueryClientProvider client={client}>
        <I18nProvider accountLanguage={language}>
          <HistoryScreen />
        </I18nProvider>
      </QueryClientProvider>
    );
    const rendered = await render(tree());

    const englishHeading = dayHeading('2026-08-15T10:00:00.000Z');
    expect(screen.getByText(englishHeading)).toBeTruthy();
    expect(screen.getByText(translateFor('en', 'history.contextPractice'))).toBeTruthy();

    language = 'es';
    await rendered.rerender(tree());

    const spanishHeading = new Date('2026-08-15T10:00:00.000Z').toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(screen.getByText(spanishHeading)).toBeTruthy();
    expect(screen.getByText(translateFor('es', 'history.contextPractice'))).toBeTruthy();
    if (spanishHeading !== englishHeading) expect(screen.queryByText(englishHeading)).toBeNull();
  });

  it('lays each answer out as a card with a touch-safe header', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expectRowHint('courage', 82);
    expect(flattenedStyle(parentOf(rowHeader('courage', 82)))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
    });
    expect(flattenedStyle(rowHeader('courage', 82))).toEqual(ROW_HEADER);
    expect(flattenedStyle(parentOf(screen.getByText('courage')))).toEqual({ flex: 1 });
    expect(flattenedStyle(screen.getByText('courage'))).toEqual({
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    });
    expect(
      flattenedStyle(parentOf(parentOf(screen.getByText(t('feedback.scoreLine', { score: 82 }))))),
    ).toEqual({
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    });
    expect(flattenedStyle(screen.getByText(t('history.attemptNo', { number: 2 })))).toEqual({
      fontSize: 12,
      color: colors.muted,
    });
    expect(flattenedStyle(screen.getByText(t('history.showDetails')))).toEqual({
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    });
  });

  it('tints the row header only while it is pressed', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expect(flattenedStyle(rowHeader('courage', 82))).toEqual(ROW_HEADER);
    await fireEvent(rowHeader('courage', 82), 'responderGrant', responderEvent());
    expect(flattenedStyle(rowHeader('courage', 82))).toEqual({
      ...ROW_HEADER,
      backgroundColor: colors.background,
    });
    await fireEvent(rowHeader('courage', 82), 'responderTerminate', responderEvent());
    await waitFor(() =>
      expect(flattenedStyle(rowHeader('courage', 82)).backgroundColor).toBeUndefined(),
    );
  });

  it('colors the score chip by mastery, pass, and fail using theme tokens', async () => {
    mockGetHistory.mockResolvedValue({
      items: [
        historyItem({ score: 82 }),
        historyItem({ id: '550e8400-e29b-41d4-a716-446655440045', score: 65 }),
        historyItem({
          id: '550e8400-e29b-41d4-a716-446655440046',
          score: 40,
          passed: false,
        }),
      ],
      nextCursor: null,
    });
    await renderHistory();
    await screen.findAllByText('courage');

    expect(flattenedStyle(screen.getByText(t('feedback.scoreLine', { score: 82 })))).toMatchObject({
      color: colors.success,
    });
    expect(flattenedStyle(screen.getByText(t('feedback.scoreLine', { score: 65 })))).toMatchObject({
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('feedback.scoreLine', { score: 40 })))).toMatchObject({
      color: colors.danger,
    });
  });

  it('treats the mastery and pass scores as inclusive chip thresholds', async () => {
    mockGetHistory.mockResolvedValue({
      items: [
        historyItem({ score: PRACTICE_MASTER_SCORE }),
        historyItem({
          id: '550e8400-e29b-41d4-a716-446655440047',
          score: PRACTICE_PASS_SCORE,
        }),
        historyItem({
          id: '550e8400-e29b-41d4-a716-446655440048',
          score: PRACTICE_PASS_SCORE - 1,
          passed: false,
        }),
      ],
      nextCursor: null,
    });
    await renderHistory();
    await screen.findAllByText('courage');

    const chipText = (score: number) => screen.getByText(t('feedback.scoreLine', { score }));

    expect(flattenedStyle(chipText(PRACTICE_MASTER_SCORE))).toEqual({
      ...SCORE_CHIP_TEXT,
      color: colors.success,
    });
    expect(flattenedStyle(parentOf(chipText(PRACTICE_MASTER_SCORE)))).toEqual({
      ...SCORE_CHIP,
      backgroundColor: colors.successLight,
      borderWidth: 1,
      borderColor: colors.success,
    });

    expect(flattenedStyle(chipText(PRACTICE_PASS_SCORE))).toEqual({
      ...SCORE_CHIP_TEXT,
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(chipText(PRACTICE_PASS_SCORE)))).toEqual({
      ...SCORE_CHIP,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    });

    expect(flattenedStyle(chipText(PRACTICE_PASS_SCORE - 1))).toEqual({
      ...SCORE_CHIP_TEXT,
      color: colors.danger,
    });
    expect(flattenedStyle(parentOf(chipText(PRACTICE_PASS_SCORE - 1)))).toEqual({
      ...SCORE_CHIP,
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.danger,
    });
  });

  it('badges a practice attempt in the brand fill', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    const badge = screen.getByText(t('history.contextPractice'));
    expect(screen.queryByText(t('history.contextDiagnostic'))).toBeNull();
    expect(flattenedStyle(badge)).toEqual(CONTEXT_BADGE_TEXT);
    expect(flattenedStyle(parentOf(badge))).toEqual(CONTEXT_BADGE);
  });

  it('badges a diagnostic attempt in the warning fill', async () => {
    mockGetHistory.mockResolvedValue({
      items: [historyItem({ context: 'diagnostic', attemptNo: 1 })],
      nextCursor: null,
    });
    await renderHistory();
    await screen.findByText('courage');

    const badge = screen.getByText(t('history.contextDiagnostic'));
    expect(screen.queryByText(t('history.contextPractice'))).toBeNull();
    expect(flattenedStyle(badge)).toEqual({ ...CONTEXT_BADGE_TEXT, color: colors.onWarning });
    expect(flattenedStyle(parentOf(badge))).toEqual({
      ...CONTEXT_BADGE,
      backgroundColor: colors.warning,
    });
  });

  it('keeps each context badge ink paired with its own fill in the dark palette', async () => {
    // The light palette paints both on-fill inks white, so only the dark
    // palette can show whether the diagnostic badge takes its own ink.
    expect(darkColors.onPrimary).not.toBe(darkColors.onWarning);
    asMock(useColorScheme).mockReturnValue('dark');
    mockGetHistory.mockResolvedValue({
      items: [
        historyItem(),
        historyItem({
          id: '550e8400-e29b-41d4-a716-446655440060',
          promptWord: 'journey',
          context: 'diagnostic',
          attemptNo: 1,
          createdAt: '2026-08-13T10:00:00.000Z',
        }),
      ],
      nextCursor: null,
    });
    await renderHistory();
    await screen.findByText('courage');

    const practiceBadge = screen.getByText(t('history.contextPractice'));
    expect(flattenedStyle(practiceBadge)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onPrimary,
    });
    expect(flattenedStyle(parentOf(practiceBadge))).toMatchObject({
      backgroundColor: darkColors.primary,
    });

    const diagnosticBadge = screen.getByText(t('history.contextDiagnostic'));
    expect(flattenedStyle(diagnosticBadge)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onWarning,
    });
    expect(flattenedStyle(parentOf(diagnosticBadge))).toMatchObject({
      backgroundColor: darkColors.warning,
    });
  });

  it('expands and collapses a row to reveal transcript and feedback', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expect(screen.queryByText('“I was brave at work.”')).toBeNull();
    expect(screen.queryByText('Nice detail.')).toBeNull();

    const row = screen.getByRole('button', { expanded: false });
    await fireEvent.press(row);

    expect(screen.getByText('“I was brave at work.”').props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText('Nice detail.').props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText(t('history.hideDetails'))).toBeTruthy();
    expect(screen.getByRole('button', { expanded: true })).toBeTruthy();

    // Each answer is labelled so the transcript and feedback are not orphaned.
    expect(screen.getByText(t('label.question'))).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('“I was brave at work.”')).toBeNull();
    expect(screen.queryByText(t('feedback.weHeard'))).toBeNull();
    expect(screen.getByText(t('history.showDetails'))).toBeTruthy();
  });

  it.each(DATE_TAGS)(
    'shows %s native history with a named transcript language and semantic speech tags',
    async (nativeLanguage, accessibilityLanguage) => {
      const currentProfileLanguage = nativeLanguage === 'te' ? 'hi' : 'te';
      mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: currentProfileLanguage } });
      const native = historyItem({
        context: 'practice-native',
        nativeLanguage,
        attemptNo: 2,
        score: null,
        passed: null,
        understood: true,
        transcript: 'ఆమె ధైర్యంగా ఉంది.',
        translatedTranscript: 'She was brave.',
        modelAnswer: 'She showed courage when she spoke up.',
        feedback: 'You understood the question.',
      });
      mockGetHistory.mockResolvedValue({ items: [native], nextCursor: null });
      await renderHistory();
      await screen.findByText('courage');

      expect(screen.getByText(t('history.contextNative'))).toBeTruthy();
      expect(screen.getByText(t('feedback.nativeUnderstoodTitle'))).toBeTruthy();
      expect(screen.queryByText(/\/ 100/)).toBeNull();
      expect(screen.getByText(t('history.attemptNo', { number: 2 }))).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { expanded: false }));
      expect(screen.getByText(native.questionText).props.accessibilityLanguage).toBe('en-US');
      expect(
        screen.getByText(
          t('feedback.originalTranscript', { language: t(`language.${nativeLanguage}`) }),
        ),
      ).toBeTruthy();
      expect(screen.getByText(`“${native.transcript}”`).props).toMatchObject({
        selectable: true,
        accessibilityLanguage,
      });
      expect(screen.getByText(t('feedback.englishTranslation'))).toBeTruthy();
      expect(screen.getByText(native.translatedTranscript!).props).toMatchObject({
        selectable: true,
        accessibilityLanguage: 'en-US',
      });
      expect(screen.getByText(t('feedback.exampleEnglishAnswer'))).toBeTruthy();
      expect(screen.getByText(native.modelAnswer!).props).toMatchObject({
        selectable: true,
        accessibilityLanguage: 'en-US',
      });
    },
  );

  it('inserts one native ad only after the eighth real history item', async () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      historyItem({
        id: `550e8400-e29b-41d4-a716-4466554401${String(index).padStart(2, '0')}`,
        promptWord: `word-${index + 1}`,
        createdAt:
          index < 4
            ? `2026-08-15T${String(12 - index).padStart(2, '0')}:00:00.000Z`
            : `2026-08-14T${String(20 - index).padStart(2, '0')}:00:00.000Z`,
      }),
    );
    mockGetHistory.mockResolvedValue({ items: items.slice(0, 7), nextCursor: null });
    const view = await renderHistory();
    await screen.findByText('word-7');
    expect(screen.queryByTestId('history-native-ad')).toBeNull();
    await view.unmount();

    mockGetHistory.mockResolvedValue({ items, nextCursor: null });
    await renderHistory();
    await waitFor(() => expect(screen.getByTestId('history-native-ad')).toBeTruthy());
    expect(screen.getAllByTestId('history-native-ad')).toHaveLength(1);
    // Spacing now belongs to the real ad/placeholder itself, so a null ad
    // cannot leave an otherwise empty 48-point route-owned wrapper behind.
    expect(flattenedStyle(parentOf(screen.getByTestId('history-native-ad')))).not.toMatchObject({
      marginTop: 24,
      marginBottom: 24,
    });
  });

  it('forwards live route focus to the anchored native ad across a same-mount rerender', async () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      historyItem({
        id: `550e8400-e29b-41d4-a716-4466554402${String(index).padStart(2, '0')}`,
        promptWord: `focus-word-${index + 1}`,
      }),
    );
    mockGetHistory.mockResolvedValue({ items, nextCursor: null });
    const client = makeQueryClient();
    const tree = () => (
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    await screen.findByTestId('history-native-ad');
    expect(asMock(HistoryNativeAdCard).mock.calls.at(-1)?.[0]).toEqual({ focused: true });

    mockHistoryIsFocused = false;
    await rendered.rerender(tree());
    expect(asMock(HistoryNativeAdCard).mock.calls.at(-1)?.[0]).toEqual({ focused: false });
  });

  it('mounts contextual owner playback only while an expanded row has a recording', async () => {
    const recordingId = '550e8400-e29b-41d4-a716-446655440090';
    mockGetHistory.mockResolvedValue({
      items: [historyItem({ recordingId, recordingStatus: 'available' })],
      nextCursor: null,
    });
    await renderHistory();
    await screen.findByText('courage');
    expect(screen.queryByText(`recording-player:${recordingId}`)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText(t('recordings.yourRecording'))).toBeTruthy();
    expect(screen.getByText(`recording-player:${recordingId}`)).toBeTruthy();
    expect(asMock(RecordingPlayback).mock.calls.map(([props]) => props)).toEqual([
      {
        compact: true,
        ownerId: USER.id,
        recordingId,
        recordingLabel: 'courage',
        recordingStatus: 'available',
      },
    ]);
    await fireEvent.press(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText(`recording-player:${recordingId}`)).toBeNull();
  });

  it('keeps expansion while replacing every payload field for the same history id', async () => {
    const firstRecordingId = '550e8400-e29b-41d4-a716-446655440090';
    const nextRecordingId = '550e8400-e29b-41d4-a716-446655440091';
    const first = historyItem({
      recordingId: firstRecordingId,
      recordingStatus: 'available',
    });
    const replacement = historyItem({
      promptWord: 'bravery',
      questionText: 'How did your bravery help somebody?',
      transcript: 'I helped a teammate.',
      feedback: 'Clear updated detail.',
      recordingId: nextRecordingId,
      recordingStatus: 'retention_pending',
    });
    mockGetHistory
      .mockResolvedValueOnce({ items: [first], nextCursor: null })
      .mockResolvedValueOnce({ items: [replacement], nextCursor: null });
    const client = makeQueryClient();
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    await screen.findByText('courage');
    await fireEvent.press(rowHeader('courage', 82));
    expect(screen.getByText('“I was brave at work.”')).toBeTruthy();

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['practice-history', USER.id], exact: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(screen.getByText('bravery')).toBeTruthy());
    expect(screen.getByRole('button', { expanded: true })).toBeTruthy();
    expect(screen.getByText('How did your bravery help somebody?')).toBeTruthy();
    expect(screen.getByText('“I helped a teammate.”')).toBeTruthy();
    expect(screen.getByText('Clear updated detail.')).toBeTruthy();
    expect(screen.queryByText('“I was brave at work.”')).toBeNull();
    expect(asMock(RecordingPlayback).mock.calls.at(-1)?.[0]).toEqual({
      compact: true,
      ownerId: USER.id,
      recordingId: nextRecordingId,
      recordingLabel: 'bravery',
      recordingStatus: 'retention_pending',
    });
  });

  it('sets the expanded detail block off from the row header', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');
    await fireEvent.press(rowHeader('courage', 82));

    expect(flattenedStyle(parentOf(screen.getByText(t('label.question'))))).toEqual({
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    });
    expect(flattenedStyle(screen.getByText(t('label.question')))).toEqual(DETAIL_LABEL);
    expect(flattenedStyle(screen.getByText(t('feedback.weHeard')))).toEqual(DETAIL_LABEL);
    expect(flattenedStyle(screen.getByText(t('feedback.feedbackLabel')))).toEqual(DETAIL_LABEL);
    expect(flattenedStyle(screen.getByText('Describe a time you showed courage.'))).toEqual(
      DETAIL_TEXT,
    );
    expect(flattenedStyle(screen.getByText('Nice detail.'))).toEqual(DETAIL_TEXT);
    expect(flattenedStyle(screen.getByText('“I was brave at work.”'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 15,
      fontStyle: 'italic',
      lineHeight: 21,
      color: colors.text,
    });
  });

  it('pages older answers through the cursor and hides the button on the last page', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440050';
    mockGetHistory
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: cursor })
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440051',
            promptWord: 'journey',
            createdAt: '2026-08-13T10:00:00.000Z',
          }),
        ],
        nextCursor: null,
      });
    await renderHistory();
    await screen.findByText('courage');

    expect(mockGetHistory).toHaveBeenCalledWith(undefined, expect.anything());
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('history.loadMore') })),
    ).toMatchObject({ marginTop: spacing.md });

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetHistory).toHaveBeenCalledWith(cursor, expect.anything());
    expect(await screen.findByText('journey')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
  });

  it('walks distinct cursors across three pages before stopping', async () => {
    const firstCursor = '550e8400-e29b-41d4-a716-446655440061';
    const secondCursor = '550e8400-e29b-41d4-a716-446655440062';
    mockGetHistory
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: firstCursor })
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440063',
            promptWord: 'journey',
          }),
        ],
        nextCursor: secondCursor,
      })
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440064',
            promptWord: 'wisdom',
          }),
        ],
        nextCursor: null,
      });
    await renderHistory();
    await screen.findByText('courage');

    await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
    await screen.findByText('journey');
    await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));

    expect(await screen.findByText('wisdom')).toBeTruthy();
    expect(mockGetHistory).toHaveBeenNthCalledWith(2, firstCursor, expect.anything());
    expect(mockGetHistory).toHaveBeenNthCalledWith(3, secondCursor, expect.anything());
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
  });

  it('stops visibly at 500 pages even when the cursor remains distinct', async () => {
    const client = makeQueryClient(Infinity);
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    const pages = Array.from({ length: 500 }, (_, index) => ({
      items: index === 0 ? [historyItem()] : [],
      nextCursor: `cursor-${index + 1}`,
    }));
    client.setQueryData(['practice-history', USER.id], {
      pages,
      pageParams: Array.from({ length: pages.length }, (_, index) =>
        index === 0 ? undefined : `cursor-${index}`,
      ),
    });
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText('courage')).toBeTruthy();
    const terminal = screen.getByText(t('pagination.safetyStop'));
    expect(terminal.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
    await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('pages older answers when the list is scrolled to its end', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440054';
    mockGetHistory
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: cursor })
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440055',
            promptWord: 'journey',
            createdAt: '2026-08-13T10:00:00.000Z',
          }),
        ],
        nextCursor: null,
      });
    await renderHistory();
    await screen.findByText('courage');

    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetHistory).toHaveBeenCalledWith(cursor, expect.anything());
    expect(await screen.findByText('journey')).toBeTruthy();
  });

  it('stops pagination when the server repeats an already-consumed cursor', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440054';
    mockGetHistory
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: cursor })
      .mockResolvedValueOnce({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440055',
            promptWord: 'journey',
            createdAt: '2026-08-13T10:00:00.000Z',
          }),
        ],
        nextCursor: cursor,
      });
    await renderHistory();
    await screen.findByText('courage');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('journey')).toBeTruthy();
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();

    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });

  it('stops asking for older answers once the last page is in', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    const client = makeQueryClient();
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    await screen.findByText('courage');

    const passes = () => client.getQueryState(['practice-history', USER.id])?.dataUpdateCount ?? 0;
    const before = passes();

    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
    expect(mockGetHistory).toHaveBeenCalledTimes(1);
    // Scrolling past the end of the last page must not start another pass.
    expect(passes()).toBe(before);
  });

  it('switches the cached history and captured lease at a same-mount account boundary', async () => {
    const firstLease = { owner: 'first-history-account' } as never;
    const secondLease = { owner: 'second-history-account' } as never;
    let currentLease: SessionLease = firstLease;
    const captureSessionLease = jest.fn(() => currentLease);
    const isSessionLeaseCurrent = jest.fn((lease: SessionLease) => lease === currentLease);
    mockAuthValue = makeAuth({ captureSessionLease, isSessionLeaseCurrent });

    const client = makeQueryClient(Infinity);
    const firstKey = ['practice-history', USER.id] as const;
    const secondKey = ['practice-history', OTHER_USER.id] as const;
    const secondCursor = '550e8400-e29b-41d4-a716-446655440067';
    client.setQueryData(firstKey, {
      pages: [{ items: [historyItem({ promptWord: 'first-account' })], nextCursor: null }],
      pageParams: [undefined],
    });
    client.setQueryData(secondKey, {
      pages: [
        {
          items: [
            historyItem({
              id: '550e8400-e29b-41d4-a716-446655440068',
              promptWord: 'second-account',
            }),
          ],
          nextCursor: secondCursor,
        },
      ],
      pageParams: [undefined],
    });
    const tree = () => (
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    expect(screen.getByText('first-account')).toBeTruthy();
    expect(captureSessionLease).toHaveBeenCalledTimes(1);

    currentLease = secondLease;
    mockAuthValue = makeAuth({
      user: OTHER_USER,
      sessionVersion: 2,
      captureSessionLease,
      isSessionLeaseCurrent,
    });
    await rendered.rerender(tree());

    expect(screen.getByText('second-account')).toBeTruthy();
    expect(screen.queryByText('first-account')).toBeNull();
    expect(captureSessionLease).toHaveBeenCalledTimes(2);

    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
    await waitFor(() =>
      expect(mockGetHistory).toHaveBeenCalledWith(secondCursor, expect.anything()),
    );
    expect(isSessionLeaseCurrent).toHaveBeenCalledWith(secondLease);
  });

  it('rejects a retained Load More handler after the history screen unmounts', async () => {
    const client = makeQueryClient(Infinity);
    const queryKey = ['practice-history', USER.id] as const;
    client.setQueryData(queryKey, {
      pages: [
        {
          items: [historyItem()],
          nextCursor: '550e8400-e29b-41d4-a716-446655440069',
        },
      ],
      pageParams: [undefined],
    });
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    const fetchNextPageSpy = jest
      .spyOn(InfiniteQueryObserver.prototype, 'fetchNextPage')
      .mockResolvedValue({} as never);
    const rendered = await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    const retainedLoadMore = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );

    await rendered.unmount();
    await act(async () => {
      retainedLoadMore();
      await Promise.resolve();
    });

    expect(fetchNextPageSpy).not.toHaveBeenCalled();
  });

  it('swaps the load-more button for a footer spinner and skips duplicate requests', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440056';
    const refetchSpy = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    let releaseOlder: () => void = () => undefined;
    mockGetHistory.mockResolvedValueOnce({ items: [historyItem()], nextCursor: cursor });
    mockGetHistory.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseOlder = () =>
            resolve({
              items: [
                historyItem({
                  id: '550e8400-e29b-41d4-a716-446655440057',
                  promptWord: 'journey',
                  createdAt: '2026-08-13T10:00:00.000Z',
                }),
              ],
              nextCursor: null,
            });
        }),
    );
    await renderHistory();
    await screen.findByText('courage');

    const committedPress = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );
    await act(async () => {
      committedPress();
      committedPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockGetHistory).toHaveBeenCalledTimes(2);
    expect(refetchSpy).not.toHaveBeenCalled();

    const footerLabel = screen.getByText(t('history.loadingMore'));
    expect(footerLabel.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
    expect(flattenedStyle(footerLabel)).toEqual(MUTED_TEXT);
    expect(flattenedStyle(parentOf(footerLabel))).toEqual({
      paddingVertical: spacing.lg,
      alignItems: 'center',
    });

    // Reaching the end again while that page is in flight must not re-request it.
    await act(async () => {
      await fireEvent(listView(), 'endReached', { distanceFromEnd: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockGetHistory).toHaveBeenCalledTimes(2);

    await act(async () => {
      releaseOlder();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('journey')).toBeTruthy();
    expect(screen.queryByText(t('history.loadingMore'))).toBeNull();
  });

  it('queues Load More behind a loaded-page refresh and then fetches the older cursor', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440065';
    const refetchSpy = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    const client = makeQueryClient();
    client.setQueryData(['practice-history', USER.id], {
      pages: [{ items: [historyItem()], nextCursor: cursor }],
      pageParams: [undefined],
    });
    let resolveRefresh!: (value: { items: HistoryItem[]; nextCursor: string }) => void;
    const refresh = new Promise<{ items: HistoryItem[]; nextCursor: string }>((resolve) => {
      resolveRefresh = resolve;
    });
    let resolveOlder!: (value: { items: HistoryItem[]; nextCursor: null }) => void;
    const older = new Promise<{ items: HistoryItem[]; nextCursor: null }>((resolve) => {
      resolveOlder = resolve;
    });
    mockGetHistory.mockReturnValueOnce(refresh).mockReturnValueOnce(older);
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    expect(screen.getByText('courage')).toBeTruthy();
    expect(mockGetHistory).toHaveBeenCalledTimes(1);

    const loadMore = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );
    await act(async () => {
      loadMore();
      loadMore();
      await Promise.resolve();
    });
    const callsBeforeRefreshSettled = mockGetHistory.mock.calls.length;
    expect(refetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh({ items: [historyItem()], nextCursor: cursor });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const callsAfterRefreshSettled = mockGetHistory.mock.calls.length;
    await act(async () => {
      resolveOlder({
        items: [
          historyItem({
            id: '550e8400-e29b-41d4-a716-446655440066',
            promptWord: 'journey',
            createdAt: '2026-08-13T10:00:00.000Z',
          }),
        ],
        nextCursor: null,
      });
      await Promise.resolve();
    });

    expect(callsBeforeRefreshSettled).toBe(1);
    expect(callsAfterRefreshSettled).toBe(2);
    expect(mockGetHistory.mock.calls[1][0]).toBe(cursor);
    expect(await screen.findByText('journey')).toBeTruthy();
  });

  it('keeps a new account queue owned when the previous account refresh settles', async () => {
    const firstRefresh = deferred<{ isError: boolean }>();
    const secondRefresh = deferred<{ isError: boolean }>();
    const extraRefresh = deferred<{ isError: boolean }>();
    const refetchSpy = jest
      .spyOn(InfiniteQueryObserver.prototype, 'refetch')
      .mockImplementationOnce(() => firstRefresh.promise as never)
      .mockImplementationOnce(() => secondRefresh.promise as never)
      .mockImplementation(() => extraRefresh.promise as never);
    const fetchNextPageSpy = jest
      .spyOn(InfiniteQueryObserver.prototype, 'fetchNextPage')
      .mockResolvedValue({} as never);
    mockAuthValue = makeAuth({ isSessionLeaseCurrent: jest.fn(() => true) });

    const client = makeQueryClient(Infinity);
    const firstKey = ['practice-history', USER.id] as const;
    const secondKey = ['practice-history', OTHER_USER.id] as const;
    client.setQueryData(firstKey, {
      pages: [
        {
          items: [historyItem({ promptWord: 'first-account' })],
          nextCursor: '550e8400-e29b-41d4-a716-446655440070',
        },
      ],
      pageParams: [undefined],
    });
    client.setQueryData(secondKey, {
      pages: [
        {
          items: [
            historyItem({
              id: '550e8400-e29b-41d4-a716-446655440071',
              promptWord: 'second-account',
            }),
          ],
          nextCursor: '550e8400-e29b-41d4-a716-446655440072',
        },
      ],
      pageParams: [undefined],
    });
    const tree = () => (
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>
    );
    const rendered = await render(tree());
    const firstLoadMore = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );
    await act(async () => {
      markOrdinaryFetchInFlight(client, firstKey);
      firstLoadMore();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(1);

    mockAuthValue = makeAuth({
      user: OTHER_USER,
      sessionVersion: 2,
      isSessionLeaseCurrent: jest.fn(() => true),
    });
    await rendered.rerender(tree());
    const secondLoadMore = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );
    await act(async () => {
      markOrdinaryFetchInFlight(client, secondKey);
      secondLoadMore();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstRefresh.resolve({ isError: false });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchNextPageSpy).not.toHaveBeenCalled();

    await act(async () => {
      secondLoadMore();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      secondRefresh.resolve({ isError: true });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('releases its queued refresh token after that owner settles with an error', async () => {
    const firstRefresh = deferred<{ isError: boolean }>();
    const secondRefresh = deferred<{ isError: boolean }>();
    const refetchSpy = jest
      .spyOn(InfiniteQueryObserver.prototype, 'refetch')
      .mockImplementationOnce(() => firstRefresh.promise as never)
      .mockImplementationOnce(() => secondRefresh.promise as never);
    const client = makeQueryClient(Infinity);
    const queryKey = ['practice-history', USER.id] as const;
    client.setQueryData(queryKey, {
      pages: [
        {
          items: [historyItem()],
          nextCursor: '550e8400-e29b-41d4-a716-446655440073',
        },
      ],
      pageParams: [undefined],
    });
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    const loadMore = committedPressHandler(
      screen.getByRole('button', { name: t('history.loadMore') }),
    );
    await act(async () => {
      markOrdinaryFetchInFlight(client, queryKey);
      loadMore();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRefresh.resolve({ isError: true });
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      loadMore();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      secondRefresh.resolve({ isError: true });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('joins repeated retries after a cached empty page fails in the background', async () => {
    const client = makeQueryClient();
    client.setQueryData(['practice-history', USER.id], {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    });
    const retryRequest = new Promise<{ items: HistoryItem[]; nextCursor: null }>(() => undefined);
    mockGetHistory
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockReturnValue(retryRequest);
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );

    const button = await screen.findByRole('button', { name: t('common.tryAgain') });
    const retry = committedPressHandler(button);
    await act(async () => {
      retry();
      retry();
      await Promise.resolve();
    });

    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });

  it('renders the cached page for the signed-in learner without refetching', async () => {
    const client = makeQueryClient(Infinity);
    client.setQueryData(['practice-history', USER.id], {
      pages: [{ items: [historyItem({ promptWord: 'cached' })], nextCursor: null }],
      pageParams: [undefined],
    });
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText('cached')).toBeTruthy();
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('keeps an expanded row tied to its answer when the order changes', async () => {
    const courage = historyItem({ id: '550e8400-e29b-41d4-a716-446655440058' });
    const journey = historyItem({
      id: '550e8400-e29b-41d4-a716-446655440059',
      promptWord: 'journey',
      transcript: 'I travelled alone.',
      createdAt: '2026-08-15T09:00:00.000Z',
    });
    mockGetHistory.mockResolvedValueOnce({ items: [courage, journey], nextCursor: null });
    const client = makeQueryClient();
    await render(
      <QueryClientProvider client={client}>
        <HistoryScreen />
      </QueryClientProvider>,
    );
    await screen.findByText('courage');

    await fireEvent.press(rowHeader('courage', 82));
    expect(screen.getByText('“I was brave at work.”')).toBeTruthy();

    mockGetHistory.mockResolvedValueOnce({ items: [journey, courage], nextCursor: null });
    await act(async () => {
      await client.invalidateQueries();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getAllByRole('button').map((node) => node.props.accessibilityLabel)).toEqual([
      `journey. ${t('feedback.scoreLine', { score: 82 })}. ${t(
        'history.contextPractice',
      )}. ${t('history.attemptNo', { number: 2 })}. ${t('history.showDetails')}`,
      `courage. ${t('feedback.scoreLine', { score: 82 })}. ${t(
        'history.contextPractice',
      )}. ${t('history.attemptNo', { number: 2 })}. ${t('history.hideDetails')}`,
    ]);
    expect(screen.getByText('“I was brave at work.”')).toBeTruthy();
    expect(screen.queryByText('“I travelled alone.”')).toBeNull();
  });

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderHistory();

    expect(mockGetHistory).not.toHaveBeenCalled();
    expect(screen.queryByText(t('history.loading'))).toBeNull();
  });
});
