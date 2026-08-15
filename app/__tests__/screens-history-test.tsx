import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HistoryScreen, { groupHistoryByDay } from '../src/app/history';
import { apiGetPracticeHistory, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { colors } from '../src/lib/theme';
import type { HistoryItem, User } from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

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

const queryClients: QueryClient[] = [];

function makeQueryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

beforeEach(() => {
  jest.clearAllMocks();
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
  });

  it('shows a retryable error when the first page fails', async () => {
    mockGetHistory
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({ items: [historyItem()], nextCursor: null });
    await renderHistory();

    expect(await screen.findByText(t('history.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('courage')).toBeTruthy();
  });

  it('shows the empty state for a learner with no attempts', async () => {
    mockGetHistory.mockResolvedValue({ items: [], nextCursor: null });
    await renderHistory();

    expect(await screen.findByText(t('history.emptyTitle'))).toBeTruthy();
    expect(screen.getByText(t('history.emptyBody'))).toBeTruthy();
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

    await fireEvent.press(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('“I was brave at work.”')).toBeNull();
    expect(screen.getByText(t('history.showDetails'))).toBeTruthy();
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

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('history.loadMore') }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetHistory).toHaveBeenCalledWith(cursor, expect.anything());
    expect(await screen.findByText('journey')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.queryByText(t('history.loadMore'))).toBeNull();
  });

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderHistory();

    expect(mockGetHistory).not.toHaveBeenCalled();
    expect(screen.queryByText(t('history.loading'))).toBeNull();
  });
});
