/**
 * U-M8: proves the theme hook actually flips a real screen to the dark
 * palette when the OS reports a dark color scheme.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import HomeScreen from '../src/app/home';
import { apiGetPracticeStats } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { darkColors, lightColors } from '../src/lib/theme';
import type { PracticeStats, User } from '../src/lib/types';

// The OS reports dark mode for this whole suite.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'dark'),
}));

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
    useIsFocused: () => true,
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

let mockAuthValue: AuthValue;

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

type PracticeFlowValue = ReturnType<typeof usePracticeFlow>;

let mockPracticeFlow: PracticeFlowValue;

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
  usePracticeFlow: () => mockPracticeFlow,
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetPracticeStats: jest.fn(),
}));

const mockGetStats = apiGetPracticeStats as jest.Mock;

const STATS: PracticeStats = {
  level: 'B1',
  progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10, dueCount: 4 },
  streakDays: 5,
  practicedToday: 3,
  totalAttempts: 40,
  lastPracticedAt: '2026-08-15T10:00:00.000Z',
};

const queryClients: QueryClient[] = [];

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClients.push(client);
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
  mockAuthValue = {
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
  };
  mockPracticeFlow = {
    answerMode: 'english',
    feedback: null,
    attemptStatus: null,
    sessionTally: { attempts: 0, passed: 0, mastered: 0, levelUps: 0 },
    setAnswerMode: jest.fn(),
    showFeedback: jest.fn(),
    restoreFeedback: jest.fn(),
    clearFeedback: jest.fn(),
    resetSessionTally: jest.fn(),
    resetPracticeFlow: jest.fn(),
  };
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
});

describe('home screen in dark mode', () => {
  it('renders the dark surfaces, ink, and re-tuned accents from useTheme()', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    await screen.findByText(t('home.dueChip', { count: 4 }));

    // Greeting uses the dark muted ink.
    expect(
      flattenedStyle(screen.getByText(t('practice.greeting', { name: USER.name }))),
    ).toMatchObject({ color: darkColors.muted });

    // The primary CTA picks the dark accent fill and dark on-fill ink.
    const cta = screen.getByRole('button', { name: t('home.startPractice') });
    expect(flattenedStyle(cta)).toMatchObject({ backgroundColor: darkColors.primary });
    expect(flattenedStyle(screen.getByText(t('home.startPractice')))).toMatchObject({
      color: darkColors.onPrimary,
    });

    // The mastery progress bar uses the dark success fill on the dark track.
    const progressbar = screen.getByRole('progressbar');
    expect(flattenedStyle(progressbar)).toMatchObject({
      backgroundColor: darkColors.border,
    });

    // Level accent text is the light indigo tint, not the light-mode indigo.
    expect(flattenedStyle(screen.getByText('B1'))).toMatchObject({
      color: darkColors.primary,
    });
    expect(darkColors.primary).not.toBe(lightColors.primary);
  });

  it('keeps the due chip legible with the dark tint pair', async () => {
    mockGetStats.mockResolvedValue(STATS);
    await renderHome();
    const chipText = await screen.findByText(t('home.dueChip', { count: 4 }));

    expect(flattenedStyle(chipText)).toMatchObject({ color: darkColors.primary });
    expect(flattenedStyle(chipText.parent as TestInstance)).toMatchObject({
      backgroundColor: darkColors.primaryLight,
    });
  });
});
