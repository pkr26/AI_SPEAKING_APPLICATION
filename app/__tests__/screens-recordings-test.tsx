import {
  InfiniteQueryObserver,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { BackHandler, FlatList, StyleSheet } from 'react-native';

import RecordingsScreen, {
  formatRecordingDuration,
  formatRecordingSize,
  nextRecordingPageParam,
  RECORDING_MAX_PAGES,
  recordingContextMessageKey,
  RECORDING_DATE_LOCALES,
  recordingsThemedStyles,
} from '../src/app/(tabs)/recordings';
import RecordingPlayback from '../src/components/RecordingPlayback';
import { apiGetRecordings } from '../src/lib/api';
import { type SessionLease, useAuth } from '../src/lib/auth';
import { I18nProvider, translateFor, type UiLanguage } from '../src/lib/i18n';
import {
  colors,
  elevations,
  layout,
  lightColors,
  motion,
  radii,
  spacing,
  type,
} from '../src/lib/theme';
import type { RecordingItem, RecordingPage, User } from '../src/lib/types';

const t = (key: Parameters<typeof translateFor>[1], params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const asMock = (value: unknown) => value as jest.Mock;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const MockFlatList = jest.fn(
    (props: {
      data: unknown[];
      keyExtractor: (item: unknown) => string;
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        actual.View,
        { testID: 'recordings-flat-list' },
        props.ListHeaderComponent,
        ...props.data.map((item, index) =>
          ReactActual.createElement(
            ReactActual.Fragment,
            { key: props.keyExtractor(item) },
            props.renderItem({ item, index }),
          ),
        ),
        props.ListFooterComponent,
      ),
  );
  return new Proxy(actual, {
    get(target, property, receiver) {
      return property === 'FlatList' ? MockFlatList : Reflect.get(target, property, receiver);
    },
  });
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(),
  },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    ReactActual.useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, [callback]);
  },
}));

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Learner',
  email: 'learner@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let leaseCurrent = true;
let leaseSerial = 0;
let capturedLease = { id: leaseSerial } as unknown as SessionLease;
const mockAuth = {
  token: 'token',
  user: USER,
  sessionVersion: 1,
  isRestoring: false,
  restoreError: null,
  retrySessionRestore: jest.fn(),
  resetStoredSession: jest.fn(),
  captureSessionLease: jest.fn(() => capturedLease),
  isSessionLeaseCurrent: jest.fn((lease: SessionLease) => leaseCurrent && lease === capturedLease),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
  setUser: jest.fn(),
};

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: jest.fn(() => mockAuth),
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetRecordings: jest.fn(),
}));

jest.mock('../src/components/RecordingPlayback', () => ({
  __esModule: true,
  default: jest.fn(({ recordingId }: { recordingId: string }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Text: NativeText } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactActual.createElement(NativeText, null, `player:${recordingId}`);
  }),
}));

const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
const SECOND_ID = '550e8400-e29b-41d4-a716-446655440012';
const THIRD_ID = '550e8400-e29b-41d4-a716-446655440013';

function recording(overrides: Partial<RecordingItem> = {}): RecordingItem {
  return {
    id: RECORDING_ID,
    questionId: '550e8400-e29b-41d4-a716-446655440021',
    context: 'practice',
    promptWord: 'courage',
    questionText: 'Describe a time you showed courage.',
    cefrLevel: 'B1',
    contentType: 'audio/mp4',
    sizeBytes: 2_048,
    durationMs: 8_000,
    status: 'available',
    createdAt: '2026-08-25T00:00:00.000Z',
    availableAt: '2026-08-25T00:00:01.000Z',
    ...overrides,
  };
}

const clients: QueryClient[] = [];
async function renderRecordings(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  language: UiLanguage = 'en',
) {
  clients.push(client);
  const view = await render(
    <QueryClientProvider client={client}>
      <I18nProvider accountLanguage={language}>
        <RecordingsScreen />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return Object.assign(view, { client });
}

function expectScrollableState(empty = false): void {
  const [stateScroll] = screen.container.queryAll(
    (candidate) => candidate.props.contentContainerStyle !== undefined,
  );
  expect(stateScroll?.props.contentInsetAdjustmentBehavior).toBe('automatic');
  expect(StyleSheet.flatten(stateScroll?.props.contentContainerStyle)).toEqual(
    empty
      ? // The shared EmptyState host: centered stack on the component's tokens.
        {
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.md,
        }
      : {
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: layout.screenPadding,
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          backgroundColor: colors.background,
        },
  );
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

function flatListProps(): Record<string, unknown> {
  const props = asMock(FlatList).mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
  if (!props) throw new Error('No FlatList rendered');
  return props;
}

beforeEach(() => {
  onlineManager.setOnline(true);
  leaseCurrent = true;
  capturedLease = { id: ++leaseSerial } as unknown as SessionLease;
  mockAuth.user = USER;
  mockAuth.sessionVersion = 1;
  mockAuth.captureSessionLease.mockClear();
  mockAuth.isSessionLeaseCurrent.mockClear();
  mockAuth.captureSessionLease.mockImplementation(() => capturedLease);
  mockAuth.isSessionLeaseCurrent.mockImplementation(
    (lease: SessionLease) => leaseCurrent && lease === capturedLease,
  );
  asMock(useAuth).mockClear();
  asMock(apiGetRecordings).mockReset();
  asMock(RecordingPlayback).mockClear();
  asMock(FlatList).mockClear();
});

afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
    cleanup();
    for (const client of clients.splice(0)) client.clear();
    // TanStack Query batches observer notifications; keep their teardown
    // publication inside the same React act boundary as the mounted list.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  jest.restoreAllMocks();
});

describe('recordings library', () => {
  it('shows a terminal safety message when the finite page bound is reached', async () => {
    const pages: RecordingPage[] = Array.from({ length: RECORDING_MAX_PAGES }, (_, index) => ({
      items: index === 0 ? [recording()] : [],
      nextCursor: `cursor-${index}`,
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(['recordings', USER.id], {
      pages,
      pageParams: Array.from({ length: RECORDING_MAX_PAGES }, () => undefined),
    });

    await renderRecordings(client);

    const terminal = screen.getByText(t('pagination.safetyStop'));
    expect(terminal.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByRole('button', { name: t('recordings.loadMore') })).toBeNull();
    expect(apiGetRecordings).not.toHaveBeenCalled();
  });

  it('shows an offline state instead of spinning before the first page', async () => {
    onlineManager.setOnline(false);
    asMock(apiGetRecordings).mockResolvedValue({ items: [], nextCursor: null });
    await renderRecordings();

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(apiGetRecordings).not.toHaveBeenCalled();
  });

  it('previews the list as card skeletons while the first page loads', async () => {
    asMock(apiGetRecordings).mockReturnValue(new Promise(() => undefined));
    await renderRecordings();

    const hidden = { includeHiddenElements: true } as const;
    // The wait is politely announced by a visually hidden live-region line...
    expect(screen.getByText(t('recordings.loading'), hidden).props.accessibilityLiveRegion).toBe(
      'polite',
    );
    // ...while a header bar plus three recording-card blocks mirror the loaded
    // list (the same twin treatment History's first load uses).
    expect(screen.getByTestId('recordings-skeleton-header', hidden)).toBeTruthy();
    expect(screen.getAllByTestId('recordings-skeleton-card', hidden)).toHaveLength(3);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('pins locale, formatting, pagination-boundary, and visual-style contracts', () => {
    expect(RECORDING_DATE_LOCALES).toEqual({
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      es: 'es-ES',
      zh: 'zh-Hans',
    });
    expect([
      recordingContextMessageKey('diagnostic'),
      recordingContextMessageKey('practice-native'),
      recordingContextMessageKey('practice'),
    ]).toEqual([
      'recordings.contextDiagnostic',
      'recordings.contextNative',
      'recordings.contextPractice',
    ]);
    expect([
      formatRecordingDuration(null),
      formatRecordingDuration(0),
      formatRecordingDuration(59_499),
      formatRecordingDuration(59_500),
      formatRecordingDuration(3_600_000),
    ]).toEqual([null, '0:01', '0:59', '1:00', '60:00']);
    expect([
      formatRecordingSize(1_023),
      formatRecordingSize(1_024),
      formatRecordingSize(1_048_575),
      formatRecordingSize(1_048_576),
    ]).toEqual(['1023 B', '1 KB', '1024 KB', '1.0 MB']);

    const page = (nextCursor: string | null): RecordingPage => ({
      items: nextCursor === null ? [] : [recording()],
      nextCursor,
    });
    const terminal = page(null);
    const next = page(RECORDING_ID);
    expect(nextRecordingPageParam(terminal, [terminal])).toBeUndefined();
    expect(nextRecordingPageParam(next, [next])).toBe(RECORDING_ID);
    expect(nextRecordingPageParam(next, [page(RECORDING_ID), next])).toBeUndefined();
    expect(
      nextRecordingPageParam(next, Array.from({ length: 499 }, () => page(SECOND_ID)).concat(next)),
    ).toBeUndefined();
    expect(
      nextRecordingPageParam(next, Array.from({ length: 498 }, () => page(SECOND_ID)).concat(next)),
    ).toBe(RECORDING_ID);

    const styles = recordingsThemedStyles({
      scheme: 'light',
      colors: lightColors,
      layout,
      radii,
      spacing,
      type,
      motion,
      elevation: elevations.light,
    });
    expect(styles).toEqual({
      list: { flex: 1, backgroundColor: lightColors.background },
      listContent: {
        padding: layout.screenPadding,
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        alignSelf: 'center',
      },
      center: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.screenPadding,
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        alignSelf: 'center',
        backgroundColor: lightColors.background,
      },
      title: {
        color: lightColors.text,
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
      },
      muted: {
        marginTop: spacing.sm,
        color: lightColors.muted,
        fontSize: 15,
        textAlign: 'center',
      },
      action: { marginTop: spacing.lg },
      intro: { marginBottom: spacing.lg, gap: spacing.sm },
      introText: { color: lightColors.muted, fontSize: 15, lineHeight: 21 },
      card: {
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: lightColors.border,
        borderRadius: radii.card,
        backgroundColor: lightColors.card,
      },
      cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
      cardTitleWrap: { flex: 1 },
      promptWord: { color: lightColors.text, fontSize: 20, fontWeight: '800' },
      question: {
        marginTop: spacing.xs,
        color: lightColors.text,
        fontSize: 15,
        lineHeight: 21,
      },
      levelBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.input,
        backgroundColor: lightColors.primaryLight,
      },
      levelBadgeText: { color: lightColors.primary, fontSize: 13, fontWeight: '800' },
      metadataRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.sm,
      },
      metadataText: { color: lightColors.muted, fontSize: 13 },
      footer: { paddingVertical: spacing.xl, alignItems: 'center' },
      listSkeleton: { alignSelf: 'stretch', gap: spacing.sm },
      hiddenLoadingText: { height: 0, opacity: 0 },
    });
  });

  it('renders nothing while signed out and recaptures identity-scoped query state', async () => {
    (mockAuth as { user: User | null }).user = null;
    const signedOut = await renderRecordings();
    expect(signedOut.toJSON()).toBeNull();
    expect(apiGetRecordings).not.toHaveBeenCalled();
    await signedOut.unmount();

    (mockAuth as { user: User | null }).user = USER;
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mounted = await renderRecordings(client);
    expect((await screen.findByText('courage')).props.accessibilityLanguage).toBe('en-US');
    expect(
      screen.getByText('Describe a time you showed courage.').props.accessibilityLanguage,
    ).toBe('en-US');
    const firstLease = capturedLease;
    expect(mockAuth.captureSessionLease).toHaveBeenLastCalledWith();

    const nextUser = { ...USER, id: '550e8400-e29b-41d4-a716-446655440099' };
    const nextLease = { id: ++leaseSerial } as unknown as SessionLease;
    capturedLease = nextLease;
    (mockAuth as { user: User | null }).user = nextUser;
    mockAuth.sessionVersion += 1;
    const callsBeforeIdentityChange = mockAuth.captureSessionLease.mock.calls.length;
    await act(async () => {
      mounted.rerender(
        <QueryClientProvider client={client}>
          <I18nProvider accountLanguage="en">
            <RecordingsScreen />
          </I18nProvider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    expect(mockAuth.captureSessionLease).toHaveBeenCalledTimes(callsBeforeIdentityChange + 1);
    expect(firstLease).not.toBe(nextLease);
    await waitFor(() =>
      expect(client.getQueryState(['recordings', nextUser.id])?.status).toBe('success'),
    );
  });

  it('renders a polished loading, empty, and error state with joined manual retries', async () => {
    let resolve!: (value: { items: RecordingItem[]; nextCursor: null }) => void;
    asMock(apiGetRecordings).mockReturnValue(
      new Promise((next) => {
        resolve = next;
      }),
    );
    const loading = await renderRecordings();
    const hidden = { includeHiddenElements: true } as const;
    expect(screen.getByText(t('recordings.loading'), hidden).props.accessibilityLiveRegion).toBe(
      'polite',
    );
    expectScrollableState();
    resolve({ items: [], nextCursor: null });
    await waitFor(() =>
      expect(screen.getByText(t('recordings.emptyTitle')).props.accessibilityRole).toBe('header'),
    );
    expectScrollableState(true);
    expect(screen.getByTestId('recordings-empty')).toBeTruthy();
    expect(screen.getByText(t('recordings.emptyBody'))).toBeTruthy();
    await act(async () => {
      refreshHandler()();
      await Promise.resolve();
    });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await loading.unmount();

    asMock(apiGetRecordings).mockRejectedValueOnce(new Error('internal detail'));
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByText(t('recordings.loadFailedTitle')).props.accessibilityRole).toBe(
        'header',
      ),
    );
    // The failure copy is an assertive live region (not a role=alert text) so
    // screen readers announce the replacement of the loading skeletons.
    expect(screen.getByText(t('recordings.loadFailed')).props.accessibilityLiveRegion).toBe(
      'assertive',
    );
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: t('common.tryAgain') }).props.style),
    ).toMatchObject({ alignSelf: 'stretch', marginTop: spacing.lg });
    expectScrollableState();
    asMock(apiGetRecordings).mockResolvedValueOnce({ items: [], nextCursor: null });
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(refetch).toHaveBeenLastCalledWith({ cancelRefetch: false });
    await waitFor(() => expect(screen.getByText(t('recordings.emptyTitle'))).toBeTruthy());
  });

  it('renders every context/status label, mixed pending controls, and exact playback props', async () => {
    asMock(apiGetRecordings).mockResolvedValue({
      items: [
        recording({ context: 'practice-native', status: 'retention_pending', availableAt: null }),
        recording({
          id: SECOND_ID,
          context: 'diagnostic',
          promptWord: 'placement',
          status: 'available',
        }),
        recording({
          id: THIRD_ID,
          context: 'practice',
          promptWord: 'review',
          status: 'unavailable',
          availableAt: null,
        }),
      ],
      nextCursor: null,
    });
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    await renderRecordings();
    await waitFor(() => expect(screen.getByText('courage')).toBeTruthy());
    expect(screen.getByText('courage').props.accessibilityRole).toBe('header');
    expect(screen.getByText(t('recordings.contextNative'))).toBeTruthy();
    expect(screen.getByText(t('recordings.contextDiagnostic'))).toBeTruthy();
    expect(screen.getByText(t('recordings.contextPractice'))).toBeTruthy();
    expect(screen.getByText(t('recordings.statusPending'))).toBeTruthy();
    expect(screen.getByText(t('recordings.statusAvailable'))).toBeTruthy();
    expect(screen.getByText(t('recordings.statusUnavailable'))).toBeTruthy();
    expect(screen.getAllByText('0:08 · 2 KB')).toHaveLength(3);
    expect(screen.getByText(`player:${RECORDING_ID}`)).toBeTruthy();
    expect(screen.getByText(t('recordings.intro'))).toBeTruthy();
    expect(asMock(FlatList).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        contentInsetAdjustmentBehavior: 'automatic',
        onEndReachedThreshold: 0.4,
      }),
    );
    expect(asMock(RecordingPlayback).mock.calls.map(([props]) => props)).toEqual([
      {
        compact: true,
        ownerId: USER.id,
        recordingId: RECORDING_ID,
        recordingLabel: 'courage',
        recordingStatus: 'retention_pending',
        showStatus: false,
      },
      {
        compact: true,
        ownerId: USER.id,
        recordingId: SECOND_ID,
        recordingLabel: 'placement',
        recordingStatus: 'available',
        showStatus: false,
      },
      {
        compact: true,
        ownerId: USER.id,
        recordingId: THIRD_ID,
        recordingLabel: 'review',
        recordingStatus: 'unavailable',
        showStatus: false,
      },
    ]);
    // The recordings list exposes container semantics to screen readers.
    expect(flatListProps().accessibilityRole).toBe('list');
    const onRefresh = flatListProps().onRefresh as () => void;
    await act(async () => {
      onRefresh();
      await Promise.resolve();
    });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));

    leaseCurrent = false;
    onRefresh();
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);
    leaseCurrent = true;
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.checkPending') }));
    expect(refetch).toHaveBeenLastCalledWith({ cancelRefetch: false });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(3));
  });

  it('retries a failed refresh without replacing cached recordings', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['recordings', USER.id], {
      pages: [{ items: [recording()], nextCursor: null }],
      pageParams: [undefined],
    });
    asMock(apiGetRecordings)
      .mockRejectedValueOnce(new Error('background failure'))
      .mockResolvedValueOnce({ items: [recording()], nextCursor: null });
    await renderRecordings(client);

    expect(await screen.findByRole('alert')).toHaveTextContent(t('refresh.failedUsingSaved'));
    expect(screen.getByText('courage')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    expect(screen.getByText('courage')).toBeTruthy();
  });

  it('formats byte, megabyte, missing-duration, and unavailable metadata', async () => {
    asMock(apiGetRecordings).mockResolvedValue({
      items: [
        recording({ sizeBytes: 500, durationMs: null, status: 'unavailable', availableAt: null }),
        recording({
          id: SECOND_ID,
          promptWord: 'travel',
          sizeBytes: 2 * 1024 * 1024,
          durationMs: 120_000,
        }),
      ],
      nextCursor: null,
    });
    await renderRecordings();
    await waitFor(() => expect(screen.getByText('500 B')).toBeTruthy());
    expect(screen.getByText('2:00 · 2.0 MB')).toBeTruthy();
    expect(screen.getByText(t('recordings.statusUnavailable'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('recordings.checkPending') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('recordings.loadMore') })).toBeNull();
  });

  it('pages older recordings once and rejects cursor cycles', async () => {
    const fetchNextPage = jest.spyOn(InfiniteQueryObserver.prototype, 'fetchNextPage');
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: RECORDING_ID,
      });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(fetchNextPage).toHaveBeenLastCalledWith({ cancelRefetch: false });
    await waitFor(() => expect(screen.getByText('travel')).toBeTruthy());
    expect(screen.queryByRole('button', { name: t('recordings.loadMore') })).toBeNull();
    expect(apiGetRecordings).toHaveBeenNthCalledWith(2, RECORDING_ID, expect.any(AbortSignal));
    const list = asMock(FlatList).mock.calls.at(-1)?.[0];
    expect(list.keyExtractor(recording())).toBe(RECORDING_ID);
  });

  it('uses onEndReached once, coalesces a pending page, and does nothing without a next page', async () => {
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    let resolveOlder!: (value: { items: RecordingItem[]; nextCursor: null }) => void;
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOlder = resolve;
        }),
      );
    const first = await renderRecordings();
    await screen.findByText('courage');
    const list = asMock(FlatList).mock.calls.at(-1)?.[0];
    await act(async () => list.onEndReached());
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByText(t('recordings.loadingMore')).props.accessibilityLiveRegion).toBe(
        'polite',
      ),
    );
    await act(async () => list.onEndReached());
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);
    expect(refetch).not.toHaveBeenCalled();
    await act(async () => {
      resolveOlder({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
      await Promise.resolve();
    });
    expect(await screen.findByText('travel')).toBeTruthy();
    await first.unmount();

    asMock(apiGetRecordings)
      .mockReset()
      .mockResolvedValue({ items: [recording()], nextCursor: null });
    await renderRecordings();
    await screen.findByText('courage');
    await act(async () => asMock(FlatList).mock.calls.at(-1)?.[0].onEndReached());
    expect(apiGetRecordings).toHaveBeenCalledTimes(1);
    // A null cursor is the natural end of the list, not the safety stop.
    expect(screen.queryByText(t('pagination.safetyStop'))).toBeNull();
  });

  it('does not page after its captured session lease expires', async () => {
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: RECORDING_ID });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    leaseCurrent = false;
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(apiGetRecordings).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded recordings visible and requires an explicit retry after an older page fails', async () => {
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockRejectedValueOnce(new Error('internal page failure'))
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await waitFor(() =>
      expect(screen.getByText(t('recordings.loadFailed')).props.accessibilityLiveRegion).toBe(
        'assertive',
      ),
    );
    expect(screen.getByText('courage')).toBeTruthy();
    // The footer retry is a full-width secondary action under the message.
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: t('common.tryAgain') }).props.style),
    ).toMatchObject({ alignSelf: 'stretch' });
    await act(async () => asMock(FlatList).mock.calls.at(-1)?.[0].onEndReached());
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(screen.getByText('travel')).toBeTruthy());
  });

  it('queues one older-page request behind an in-flight ordinary refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['recordings', USER.id], {
      pages: [{ items: [recording()], nextCursor: RECORDING_ID }],
      pageParams: [undefined],
    });
    let resolveRefresh!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
    const refresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
      resolveRefresh = resolve;
    });
    let resolveOlder!: (value: { items: RecordingItem[]; nextCursor: null }) => void;
    const older = new Promise<{ items: RecordingItem[]; nextCursor: null }>((resolve) => {
      resolveOlder = resolve;
    });
    asMock(apiGetRecordings).mockReturnValueOnce(refresh).mockReturnValueOnce(older);
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    const fetchNextPage = jest.spyOn(InfiniteQueryObserver.prototype, 'fetchNextPage');
    await renderRecordings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenLastCalledWith({ cancelRefetch: false });
    await act(async () => {
      resolveRefresh({ items: [recording()], nextCursor: RECORDING_ID });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      resolveOlder({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
      await Promise.resolve();
    });
    expect(fetchNextPage).toHaveBeenLastCalledWith({ cancelRefetch: false });
    expect(await screen.findByText('travel')).toBeTruthy();
  });

  it('drops an errored queued refresh and releases its token for the next refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['recordings', USER.id], {
      pages: [{ items: [recording()], nextCursor: RECORDING_ID }],
      pageParams: [undefined],
    });
    let rejectFirst!: (error: Error) => void;
    const firstRefresh = new Promise<never>((_resolve, reject) => {
      rejectFirst = reject;
    });
    let resolveSecond!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
    const secondRefresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
      resolveSecond = resolve;
    });
    asMock(apiGetRecordings)
      .mockReturnValueOnce(firstRefresh)
      .mockReturnValueOnce(secondRefresh)
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
    await renderRecordings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await act(async () => {
      rejectFirst(new Error('refresh failed'));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(client.getQueryState(['recordings', USER.id])?.fetchStatus).toBe('idle'),
    );
    expect(apiGetRecordings).toHaveBeenCalledTimes(1);

    const secondRun = client.refetchQueries({ queryKey: ['recordings', USER.id], exact: true });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await act(async () => {
      resolveSecond({ items: [recording()], nextCursor: RECORDING_ID });
      await secondRun;
    });
    expect(await screen.findByText('travel')).toBeTruthy();
    expect(apiGetRecordings).toHaveBeenCalledTimes(3);
  });

  it.each(['lease expiry', 'unmount'] as const)(
    'drops a queued page when its refresh finishes after %s',
    async (ending) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      client.setQueryData(['recordings', USER.id], {
        pages: [{ items: [recording()], nextCursor: RECORDING_ID }],
        pageParams: [undefined],
      });
      let resolveRefresh!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
      const refresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
        resolveRefresh = resolve;
      });
      asMock(apiGetRecordings)
        .mockReturnValueOnce(refresh)
        .mockResolvedValueOnce({
          items: [recording({ id: SECOND_ID, promptWord: 'must-not-load' })],
          nextCursor: null,
        });
      const view = await renderRecordings(client);
      const retainedLoadMore = screen.getByRole('button', { name: t('recordings.loadMore') });
      const retainedPress = (
        asMock(FlatList).mock.calls.at(-1)?.[0].ListFooterComponent as React.ReactElement<{
          onPress: () => void;
        }>
      ).props.onPress;
      await fireEvent.press(retainedLoadMore);
      if (ending === 'lease expiry') {
        leaseCurrent = false;
      } else {
        await view.unmount();
        await act(async () => retainedPress());
      }
      await act(async () => {
        resolveRefresh({ items: [recording()], nextCursor: RECORDING_ID });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(apiGetRecordings).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps a new account queue when the old account refresh finalizer settles', async () => {
    const nextUser = { ...USER, id: '550e8400-e29b-41d4-a716-446655440099' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['recordings', USER.id], {
      pages: [{ items: [recording()], nextCursor: RECORDING_ID }],
      pageParams: [undefined],
    });
    client.setQueryData(['recordings', nextUser.id], {
      pages: [
        {
          items: [recording({ id: THIRD_ID, promptWord: 'new-owner' })],
          nextCursor: SECOND_ID,
        },
      ],
      pageParams: [undefined],
    });
    let resolveOld!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
    const oldRefresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
      resolveOld = resolve;
    });
    let resolveNew!: (value: { items: RecordingItem[]; nextCursor: string }) => void;
    const newRefresh = new Promise<{ items: RecordingItem[]; nextCursor: string }>((resolve) => {
      resolveNew = resolve;
    });
    asMock(apiGetRecordings)
      .mockReturnValueOnce(oldRefresh)
      .mockReturnValueOnce(newRefresh)
      .mockResolvedValueOnce({
        items: [recording({ id: SECOND_ID, promptWord: 'travel' })],
        nextCursor: null,
      });
    const refetch = jest.spyOn(InfiniteQueryObserver.prototype, 'refetch');
    const view = await renderRecordings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    expect(refetch).toHaveBeenCalledTimes(1);

    capturedLease = { id: ++leaseSerial } as unknown as SessionLease;
    (mockAuth as { user: User | null }).user = nextUser;
    mockAuth.sessionVersion += 1;
    await view.rerender(
      <QueryClientProvider client={client}>
        <I18nProvider accountLanguage="en">
          <RecordingsScreen />
        </I18nProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    const newLoadMore = screen.getByRole('button', { name: t('recordings.loadMore') });
    await fireEvent.press(newLoadMore);
    expect(refetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveOld({ items: [recording()], nextCursor: RECORDING_ID });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await fireEvent.press(newLoadMore);
    expect(refetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveNew({
        items: [recording({ id: THIRD_ID, promptWord: 'new-owner' })],
        nextCursor: SECOND_ID,
      });
      await Promise.resolve();
    });
    expect(await screen.findByText('travel')).toBeTruthy();
    expect(apiGetRecordings).toHaveBeenNthCalledWith(3, SECOND_ID, expect.any(AbortSignal));
  });

  it('joins an in-flight empty-state refresh and holds it behind the session lease', async () => {
    let resolveRefresh!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRefresh = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockReturnValue(pending);
    await renderRecordings();
    await waitFor(() => expect(screen.getByTestId('recordings-empty')).toBeTruthy());

    await act(async () => refreshHandler()());
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await act(async () => refreshHandler()());
    // The second pull joins the in-flight refresh instead of restarting it.
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);

    leaseCurrent = false;
    await act(async () => refreshHandler()());
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveRefresh({ items: [], nextCursor: null });
      await Promise.resolve();
    });
  });

  it('joins an in-flight list refresh and mirrors the refresh state in the notice', async () => {
    let resolveRefresh!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRefresh = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: null })
      .mockReturnValueOnce(pending);
    await renderRecordings();
    await screen.findByText('courage');
    expect(screen.queryByText(t('refresh.updating'))).toBeNull();

    await act(async () => (flatListProps().onRefresh as () => void)());
    await waitFor(() => expect(screen.getByText(t('refresh.updating'))).toBeTruthy());
    await act(async () => (flatListProps().onRefresh as () => void)());
    expect(apiGetRecordings).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveRefresh({ items: [recording()], nextCursor: null });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByText(t('refresh.updating'))).toBeNull());
  });

  it('joins a notice retry behind the in-flight refresh it reports', async () => {
    let resolveRetry!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRetry = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: null })
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockReturnValueOnce(pending);
    await renderRecordings();
    await screen.findByText('courage');

    await act(async () => (flatListProps().onRefresh as () => void)());
    await waitFor(() => expect(screen.getByText(t('refresh.failedUsingSaved'))).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(3));
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(apiGetRecordings).toHaveBeenCalledTimes(3);
    await act(async () => {
      resolveRetry({ items: [recording()], nextCursor: null });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByText(t('refresh.failedUsingSaved'))).toBeNull());
  });
});

describe('recordings visual and control wiring', () => {
  const hidden = { includeHiddenElements: true } as const;
  // StyleSheet.create caches per scheme, so the test reuses the exact style
  // objects the rendered screen passes to its hosts.
  const styles = recordingsThemedStyles({
    scheme: 'light',
    colors: lightColors,
    layout,
    radii,
    spacing,
    type,
    motion,
    elevation: elevations.light,
  });
  const createdAt = recording().createdAt;
  const localeDate = (locale: string) => new Date(createdAt).toLocaleString(locale);

  it('pins the recording card styles from the shared tokens', async () => {
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: null });
    await renderRecordings();
    await waitFor(() => expect(screen.getByText('courage')).toBeTruthy());

    const promptWord = screen.getByText('courage');
    expect(promptWord.props.style).toBe(styles.promptWord);
    const titleWrap = promptWord.parent;
    expect(titleWrap?.props.style).toBe(styles.cardTitleWrap);
    expect(screen.getByText('Describe a time you showed courage.').props.style).toBe(
      styles.question,
    );
    const cardHeader = titleWrap?.parent;
    expect(cardHeader?.props.style).toBe(styles.cardHeader);
    const card = cardHeader?.parent;
    expect(card?.props.style).toBe(styles.card);

    const levelBadgeText = screen.getByText('B1');
    expect(levelBadgeText.props.style).toBe(styles.levelBadgeText);
    expect(levelBadgeText.parent?.props.style).toBe(styles.levelBadge);

    const contextRow = screen.getByText(t('recordings.contextPractice')).parent;
    expect(contextRow?.props.style).toBe(styles.metadataRow);
    expect(screen.getByText(t('recordings.contextPractice')).props.style).toBe(styles.metadataText);
    expect(screen.getByText(localeDate('en-US')).props.style).toBe(styles.metadataText);

    const statusRow = screen.getByText(t('recordings.statusAvailable')).parent;
    expect(statusRow?.props.style).toBe(styles.metadataRow);
    expect(screen.getByText(t('recordings.statusAvailable')).props.style).toBe(styles.metadataText);
    expect(screen.getByText('0:08 · 2 KB').props.style).toBe(styles.metadataText);
  });

  it('pins the loading skeleton dimensions and hidden loading copy style', async () => {
    asMock(apiGetRecordings).mockReturnValue(new Promise(() => undefined));
    await renderRecordings();

    const loadingText = screen.getByText(t('recordings.loading'), hidden);
    expect(loadingText.props.style).toBe(styles.hiddenLoadingText);
    expect(loadingText.parent?.props.style).toBe(styles.listSkeleton);

    const headerSkeleton = screen.getByTestId('recordings-skeleton-header', hidden);
    expect(StyleSheet.flatten(headerSkeleton.props.style)).toMatchObject({
      width: 120,
      height: 16,
      borderRadius: 4,
    });
    const cardSkeleton = screen.getAllByTestId('recordings-skeleton-card', hidden)[0];
    expect(StyleSheet.flatten(cardSkeleton.props.style)).toMatchObject({
      height: 84,
      borderRadius: 16,
    });
  });

  it('pins the load-failure title and copy styles', async () => {
    asMock(apiGetRecordings).mockRejectedValue(new Error('internal detail'));
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByText(t('recordings.loadFailedTitle')).props.accessibilityRole).toBe(
        'header',
      ),
    );

    expect(screen.getByText(t('recordings.loadFailedTitle')).props.style).toBe(styles.title);
    expect(screen.getByText(t('recordings.loadFailed')).props.style).toBe(styles.muted);
  });

  it('pins the empty-state glyph and pull-to-refresh control wiring', async () => {
    let resolveRefresh!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRefresh = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockReturnValue(pending);
    await renderRecordings();
    await waitFor(() => expect(screen.getByTestId('recordings-empty')).toBeTruthy());

    // The empty state draws the audio-lines glyph: five vertical strokes.
    // Every step of the positional walk asserts existence first so any
    // rewiring (a removed refresh control shifts the host's children) dies
    // on a matcher instead of a raw dereference.
    const emptyHost = screen.getByTestId('recordings-empty');
    const contentWrap = emptyHost.children.filter(
      (child): child is TestInstance => typeof child !== 'string',
    )[1];
    expect(contentWrap).toBeDefined();
    const markBadge = contentWrap.children.find(
      (child): child is TestInstance => typeof child !== 'string',
    );
    expect(markBadge).toBeDefined();
    const iconView = markBadge?.children.find(
      (child): child is TestInstance => typeof child !== 'string',
    );
    expect(iconView).toBeDefined();
    const glyph = iconView?.children.find(
      (child): child is TestInstance => typeof child !== 'string',
    );
    const strokes = glyph?.children.find(
      (child): child is TestInstance => typeof child !== 'string',
    );
    expect(strokes?.children).toHaveLength(5);
    expect((strokes?.children[0] as TestInstance | undefined)?.props?.x1).toBe(4);

    const refreshControl = emptyHost.props.refreshControl as React.ReactElement<
      Record<string, unknown>
    >;
    // The control element itself must exist before its props are read, so a
    // removed refreshControl wiring dies on this matcher, never a deref.
    expect(refreshControl).toBeDefined();
    expect(refreshControl.props.refreshing).toBe(false);
    expect(refreshControl.props.tintColor).toBe(lightColors.primary);

    await act(async () => {
      refreshHandler()();
      await Promise.resolve();
    });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        (emptyHost.props.refreshControl as React.ReactElement<Record<string, unknown>>).props
          .refreshing,
      ).toBe(true),
    );
    await act(async () => {
      resolveRefresh({ items: [], nextCursor: null });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        (emptyHost.props.refreshControl as React.ReactElement<Record<string, unknown>>).props
          .refreshing,
      ).toBe(false),
    );
  });

  it('pins the list surface styles and the FlatList refresh wiring', async () => {
    let resolveRefresh!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRefresh = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: null })
      .mockReturnValueOnce(pending);
    await renderRecordings();
    await screen.findByText('courage');

    expect(flatListProps().style).toBe(styles.list);
    expect(flatListProps().contentContainerStyle).toBe(styles.listContent);
    expect(flatListProps().refreshing).toBe(false);

    await act(async () => {
      (flatListProps().onRefresh as () => void)();
      await Promise.resolve();
    });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(flatListProps().refreshing).toBe(true));
    await act(async () => {
      resolveRefresh({ items: [recording()], nextCursor: null });
      await Promise.resolve();
    });
    await waitFor(() => expect(flatListProps().refreshing).toBe(false));
  });

  it('pins the header refresh notice and intro card wiring', async () => {
    let resolveRefresh!: (value: RecordingPage) => void;
    const pending = new Promise<RecordingPage>((resolve) => {
      resolveRefresh = resolve;
    });
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({
        items: [recording({ status: 'retention_pending', availableAt: null })],
        nextCursor: null,
      })
      .mockReturnValueOnce(pending);
    await renderRecordings();
    await screen.findByText('courage');

    const header = flatListProps().ListHeaderComponent as React.ReactElement<{
      children: React.ReactElement<Record<string, unknown>>[];
    }>;
    // The header slot itself must exist before its children are read, so a
    // removed ListHeaderComponent wiring dies on this matcher, never a deref.
    expect(header).toBeDefined();
    const [notice, intro] = header.props.children;
    expect(notice.props.updating).toBe(false);
    expect(notice.props.failed).toBe(false);
    expect(intro.props.style).toBe(styles.intro);
    const introChildren = intro.props.children as React.ReactElement<Record<string, unknown>>[];
    expect(introChildren[0].props.style).toBe(styles.introText);
    expect(introChildren[0].props.children).toBe(t('recordings.intro'));
    expect(introChildren[1].props.title).toBe(t('recordings.checkPending'));
    expect(introChildren[1].props.variant).toBe('quiet');
    expect(introChildren[1].props.size).toBe('sm');

    await act(async () => {
      (flatListProps().onRefresh as () => void)();
      await Promise.resolve();
    });
    await waitFor(() => expect(apiGetRecordings).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      const updatingHeader = flatListProps().ListHeaderComponent as React.ReactElement<{
        children: React.ReactElement<Record<string, unknown>>[];
      }>;
      expect(updatingHeader.props.children[0].props.updating).toBe(true);
      expect(updatingHeader.props.children[0].props.failed).toBe(false);
    });
    await act(async () => {
      resolveRefresh({
        items: [recording({ status: 'retention_pending', availableAt: null })],
        nextCursor: null,
      });
      await Promise.resolve();
    });
  });

  it('pins the fetching footer spinner and copy wiring', async () => {
    let resolveOlder!: (value: RecordingPage) => void;
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOlder = resolve;
        }),
      );
    await renderRecordings();
    await screen.findByText('courage');
    await act(async () => asMock(FlatList).mock.calls.at(-1)?.[0].onEndReached());
    await waitFor(() => expect(screen.getByText(t('recordings.loadingMore'))).toBeTruthy());

    const footer = flatListProps().ListFooterComponent as React.ReactElement<{
      style?: unknown;
      children: React.ReactElement<Record<string, unknown>>[];
    }>;
    // The footer slot itself must exist before its style and children are
    // read, so a removed ListFooterComponent wiring dies on this matcher.
    expect(footer).toBeDefined();
    expect(footer.props.style).toBe(styles.footer);
    expect(footer.props.children[0].props.color).toBe(lightColors.primary);
    expect(footer.props.children[1].props.style).toBe(styles.muted);
    expect(footer.props.children[1].props.accessibilityLiveRegion).toBe('polite');
    await act(async () => {
      resolveOlder({ items: [recording({ id: SECOND_ID })], nextCursor: null });
      await Promise.resolve();
    });
  });

  it('pins the failed-page footer retry wiring', async () => {
    asMock(apiGetRecordings)
      .mockResolvedValueOnce({ items: [recording()], nextCursor: RECORDING_ID })
      .mockRejectedValueOnce(new Error('page failure'));
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.loadMore') }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('common.tryAgain') })).toBeTruthy(),
    );

    const footer = flatListProps().ListFooterComponent as React.ReactElement<{
      style?: unknown;
      children: React.ReactElement<Record<string, unknown>>[];
    }>;
    // The footer slot itself must exist before its style and children are
    // read, so a removed ListFooterComponent wiring dies on this matcher.
    expect(footer).toBeDefined();
    expect(footer.props.style).toBe(styles.footer);
    expect(footer.props.children[0].props.style).toBe(styles.muted);
    expect(footer.props.children[0].props.accessibilityLiveRegion).toBe('assertive');
    const retry = footer.props.children[1];
    expect(retry.props.title).toBe(t('common.tryAgain'));
    expect(retry.props.variant).toBe('secondary');
    expect(retry.props.fullWidth).toBe(true);
  });

  it('pins the safety-stop footer styles', async () => {
    const pages: RecordingPage[] = Array.from({ length: RECORDING_MAX_PAGES }, (_, index) => ({
      items: index === 0 ? [recording()] : [],
      nextCursor: `cursor-${index}`,
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(['recordings', USER.id], {
      pages,
      pageParams: Array.from({ length: RECORDING_MAX_PAGES }, () => undefined),
    });

    await renderRecordings(client);

    const footer = flatListProps().ListFooterComponent as React.ReactElement<{
      style?: unknown;
      children: unknown;
    }>;
    // The footer slot itself must exist before its props are read, so a
    // removed ListFooterComponent wiring dies on this matcher, never a deref.
    expect(footer).toBeDefined();
    expect(footer.props.style).toBe(styles.footer);
    expect(React.Children.toArray(footer.props.children as React.ReactNode)[0]).toMatchObject({
      props: { style: styles.muted },
    });
  });

  it('pins the load-more action wiring with a next page', async () => {
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: RECORDING_ID });
    await renderRecordings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('recordings.loadMore') })).toBeTruthy(),
    );

    const loadMore = flatListProps().ListFooterComponent as React.ReactElement<
      Record<string, unknown>
    >;
    expect(loadMore.props.title).toBe(t('recordings.loadMore'));
    expect(loadMore.props.variant).toBe('secondary');
    expect(loadMore.props.fullWidth).toBe(true);
    expect(loadMore.props.style).toBe(styles.action);
  });

  it('formats card dates in the active UI locale', async () => {
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: null });
    await renderRecordings(undefined, 'te');
    await waitFor(() => expect(screen.getByText('courage')).toBeTruthy());

    expect(screen.getByText(localeDate('te-IN'))).toBeTruthy();
    expect(screen.queryByText(localeDate('en-US'))).toBeNull();
  });
});

describe('recordings Android hardware back', () => {
  const backHandlers: (() => boolean)[] = [];
  let backHandlerSpy: jest.SpyInstance;

  beforeEach(() => {
    backHandlers.length = 0;
    backHandlerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, handler) => {
        backHandlers.push(handler as () => boolean);
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    backHandlerSpy.mockRestore();
  });

  it('consumes the back press while the entry gate is still beneath Recordings', async () => {
    asMock(jest.requireMock('expo-router').router.canGoBack).mockReturnValue(true);
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: null });
    await renderRecordings();
    await waitFor(() => expect(screen.queryByText(t('recordings.loading'))).toBeNull());

    expect(backHandlers.length).toBeGreaterThan(0);
    // Popping would land on the gate, which redirects straight back into the
    // signed-in area.
    expect(backHandlers[backHandlers.length - 1]()).toBe(true);
  });

  it('lets the back press fall through when Recordings is the whole stack', async () => {
    asMock(jest.requireMock('expo-router').router.canGoBack).mockReturnValue(false);
    asMock(apiGetRecordings).mockResolvedValue({ items: [recording()], nextCursor: null });
    await renderRecordings();
    await waitFor(() => expect(screen.queryByText(t('recordings.loading'))).toBeNull());

    // Nothing to pop: swallowing the press would make back a dead key, since
    // React Native only reaches its exit-the-app default when no handler
    // claims the press.
    expect(backHandlers[backHandlers.length - 1]()).toBe(false);
  });
});
