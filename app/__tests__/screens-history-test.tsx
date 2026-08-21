import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HistoryScreen, { groupHistoryByDay } from '../src/app/history';
import { apiGetPracticeHistory, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { I18nProvider, setActiveLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
import {
  PRACTICE_MASTER_SCORE,
  PRACTICE_PASS_SCORE,
  type HistoryItem,
  type NativeLanguage,
  type User,
} from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const asMock = (fn: unknown) => fn as jest.Mock;

// History renders in the light palette unless a test flips the OS scheme; the
// dark palette carries its own on-fill ink decisions.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
}));

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
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

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetPracticeHistory: jest.fn(),
}));

const mockGetHistory = apiGetPracticeHistory as jest.Mock;

function historyItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: '550e8400-e29b-41d4-a716-446655440031',
    questionId: '550e8400-e29b-41d4-a716-446655440032',
    promptWord: 'courage',
    questionText: 'Describe a time you showed courage.',
    cefrLevel: 'B1',
    context: 'practice',
    attemptNo: 2,
    score: 82,
    passed: true,
    transcript: 'I was brave at work.',
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

function renderHistory() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <HistoryScreen />
    </QueryClientProvider>,
  );
}

/** Mounts the screen for a signed-in learner whose account language is `language`. */
function renderHistoryIn(language: NativeLanguage) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider userLanguage={language}>
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

/**
 * SectionList renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function listView(): TestInstance {
  const [node] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
  if (!node) throw new Error('No SectionList rendered');
  return node;
}

/** The row header, addressed the way a screen reader announces it. */
function rowHeader(promptWord: string, score: number): TestInstance {
  return screen.getByRole('button', {
    name: `${promptWord}. ${t('feedback.scoreLine', { score })}`,
  });
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
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.xl,
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
  lineHeight: 22,
  color: colors.text,
};

const ROW_HEADER: SemanticStyle = {
  minHeight: layout.minimumTarget,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
  padding: 14,
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
  jest.clearAllMocks();
  // Module factory mocks outlive clearAllMocks; re-arm the light default.
  asMock(useColorScheme).mockReset();
  asMock(useColorScheme).mockReturnValue('light');
  // The account-language tests mount the real I18nProvider, whose effect moves
  // the module-level language; pin it back so every test starts in English.
  setActiveLanguage('en');
  mockGetHistory.mockReset();
  mockAuthValue = makeAuth();
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
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
});

describe('history screen', () => {
  it('shows a loading state while the first page loads', async () => {
    mockGetHistory.mockReturnValue(new Promise(() => undefined));
    await renderHistory();
    expect(screen.getByText(t('history.loading'))).toBeTruthy();
    // The spinner itself is the only labelled node: screen readers announce it.
    expect(screen.getByLabelText(t('history.loading'))).toBeTruthy();

    expect(flattenedStyle(screen.getByText(t('history.loading')))).toEqual(MUTED_TEXT);
    expect(flattenedStyle(parentOf(screen.getByText(t('history.loading'))))).toEqual(CENTER_STATE);
  });

  it('shows a retryable error when the first page fails', async () => {
    mockGetHistory
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: null });
    await renderHistory();

    expect(await screen.findByText(t('history.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();

    expect(flattenedStyle(screen.getByText(t('history.loadFailedTitle')))).toEqual(STATE_TITLE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_TEXT);
    expect(flattenedStyle(parentOf(screen.getByText(t('error.serverBusy'))))).toEqual(CENTER_STATE);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('courage')).toBeTruthy();
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
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await renderHistory();

    expect(await screen.findByText(t('history.emptyTitle'))).toBeTruthy();
    expect(screen.getByText(t('history.emptyBody'))).toBeTruthy();

    expect(flattenedStyle(screen.getByText(t('history.emptyTitle')))).toEqual(STATE_TITLE);
    expect(flattenedStyle(screen.getByText(t('history.emptyBody')))).toEqual(MUTED_TEXT);
    expect(flattenedStyle(parentOf(screen.getByText(t('history.emptyBody'))))).toEqual(
      CENTER_STATE,
    );
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
    expect(screen.getByText(dayHeading('2026-08-15T10:00:00.000Z'))).toBeTruthy();
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
      letterSpacing: 0.6,
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

  it('lays each answer out as a card with a touch-safe header', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');

    expect(flattenedStyle(parentOf(rowHeader('courage', 82)))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    });
    expect(flattenedStyle(rowHeader('courage', 82))).toEqual(ROW_HEADER);
    expect(flattenedStyle(parentOf(screen.getByText('courage')))).toEqual({ flex: 1 });
    expect(flattenedStyle(screen.getByText('courage'))).toEqual({
      fontSize: 18,
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

    expect(screen.getByText('“I was brave at work.”')).toBeTruthy();
    expect(screen.getByText('Nice detail.')).toBeTruthy();
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

  it('sets the expanded detail block off from the row header', async () => {
    mockGetHistory.mockResolvedValue({ items: [historyItem()], nextCursor: null });
    await renderHistory();
    await screen.findByText('courage');
    await fireEvent.press(rowHeader('courage', 82));

    expect(flattenedStyle(parentOf(screen.getByText(t('label.question'))))).toEqual({
      paddingHorizontal: 14,
      paddingBottom: 14,
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
      lineHeight: 22,
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

  it('enforces the explicit 500-page walk bound even when another cursor is present', async () => {
    const client = makeQueryClient(Infinity);
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

  it('swaps the load-more button for a footer spinner and skips duplicate requests', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440056';
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

    const footerLabel = screen.getByText(t('history.loadingMore'));
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
      `journey. ${t('feedback.scoreLine', { score: 82 })}`,
      `courage. ${t('feedback.scoreLine', { score: 82 })}`,
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
