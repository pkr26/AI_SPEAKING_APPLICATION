import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HomeScreen from '../src/app/home';
import { apiGetPracticeStats, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { colors } from '../src/lib/theme';
import type { PracticeStats, User } from '../src/lib/types';

// Under jest no I18nProvider is mounted, so the screen falls back to English.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

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
  replace: jest.Mock;
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

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStats.mockReset();
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: jest.fn() };
  });
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
});

describe('home screen', () => {
  it('shows a loading state while stats load', async () => {
    mockGetStats.mockReturnValue(new Promise(() => undefined));
    await renderHome();

    expect(screen.getByText(t('home.loading'))).toBeTruthy();
    expect(screen.getByText(t('practice.greeting', { name: USER.name }))).toBeTruthy();
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

  it('navigates to practice, history, and settings', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    await fireEvent.press(screen.getByRole('button', { name: t('home.startPractice') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/practice');

    await fireEvent.press(screen.getByRole('button', { name: t('header.history') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/history');

    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows the session summary card and dismisses it into the tally reset', async () => {
    mockPracticeFlow = makePracticeFlow({
      sessionTally: { attempts: 5, passed: 3, mastered: 2, levelUps: 1 },
    });
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();

    expect(await screen.findByText(t('summary.title'))).toBeTruthy();
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

  it('consumes the Android hardware back press so the signed-in root is never popped', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText('B1');

    expect(backHandlers.length).toBeGreaterThan(0);
    expect(backHandlers[backHandlers.length - 1]()).toBe(true);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderHome();

    expect(mockGetStats).not.toHaveBeenCalled();
    expect(screen.queryByText(t('home.loading'))).toBeNull();
  });
});
