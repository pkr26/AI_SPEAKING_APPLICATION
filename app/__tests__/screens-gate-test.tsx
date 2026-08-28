import {
  focusManager,
  notifyManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { AppState, type AppStateStatus, StyleSheet, Text, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthLayout from '../src/app/(auth)/_layout';
import NotFoundScreen from '../src/app/+not-found';
import RootLayout, { ErrorBoundary } from '../src/app/_layout';
import Gate from '../src/app/index';
import { ApiError, apiFetch } from '../src/lib/api';
import type { SessionLease, useAuth } from '../src/lib/auth';
import { refreshDailyReminderLanguage } from '../src/lib/daily-reminder';
import { setActiveLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
import type { User } from '../src/lib/types';

const asMock = (fn: unknown) => fn as jest.Mock;

// ----- color scheme -----

// Every screen here renders in the light palette unless a test flips the OS
// scheme; dark mode re-inks the status bar and the whole navigation chrome.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

// Screens rendered without an I18nProvider (Gate, NotFound, ErrorBoundary)
// translate with the module-level language, which beforeEach pins to English.
// RootLayout mounts the real provider fed by the mocked user's uiLanguage, so
// copy inside it renders in that language instead.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// ----- expo-router mock (captures Stack structure and redirects) -----

const capturedStackProps: { screenOptions?: unknown }[] = [];
const capturedScreenProps: ({ name?: string; options?: unknown } | undefined)[] = [];
const capturedProtectedProps: { guard: boolean }[] = [];

function MockStack(props: { children?: React.ReactNode; screenOptions?: unknown }) {
  capturedStackProps.push(props);
  return <>{props.children}</>;
}
function MockStackScreen(props: { name?: string; options?: unknown }) {
  capturedScreenProps.push(props);
  return null;
}
function MockStackProtected(props: { guard: boolean; children?: React.ReactNode }) {
  capturedProtectedProps.push(props);
  return <>{props.children}</>;
}

function MockRedirect({ href }: { href: string }) {
  return <Text testID="redirect">{href}</Text>;
}

jest.mock('expo-router', () => ({
  // Assembled inside the factory: const-declared bindings are not yet
  // initialized when the factory runs, but function declarations are hoisted.
  Stack: Object.assign(MockStack, {
    Screen: MockStackScreen,
    Protected: MockStackProtected,
  }),
  Redirect: MockRedirect,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));

// ----- expo-status-bar mock (captures the requested status-bar ink) -----

const capturedStatusBarProps: { style?: string }[] = [];

function MockStatusBar(props: { style?: string }) {
  capturedStatusBarProps.push(props);
  return null;
}

jest.mock('expo-status-bar', () => ({ StatusBar: MockStatusBar }));

// The real SafeAreaProvider stays empty in jest until native insets arrive;
// RootLayout mounts its own provider, so substitute a passthrough.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  // Deliberately differs from nativeLanguage: interface copy must never follow
  // the language used for learning help and native-answer assessment.
  uiLanguage: 'hi',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let mockAuthValue: AuthValue;
let rootQueryClient: QueryClient | undefined;

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

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  React.useEffect(() => {
    rootQueryClient = queryClient;
  }, [queryClient]);
  return <>{children}</>;
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
  AuthProvider: MockAuthProvider,
}));

function MockPracticeFlowProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

jest.mock('../src/lib/practice-flow', () => ({
  PracticeFlowProvider: MockPracticeFlowProvider,
  usePracticeFlow: () => ({
    feedback: null,
    showFeedback: jest.fn(),
    clearFeedback: jest.fn(),
  }),
}));

jest.mock('../src/lib/daily-reminder', () => ({
  refreshDailyReminderLanguage: jest.fn(async () => undefined),
}));

// ----- api mock (apiFetch only; keep real ApiError/userMessageForError) -----

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;
const mockRefreshDailyReminderLanguage = refreshDailyReminderLanguage as jest.Mock;

// ----- helpers -----

const queryClients: QueryClient[] = [];

beforeAll(() => {
  // Keep query notifications in the same controlled turn as the operation
  // under test; the production scheduler is restored after this file.
  notifyManager.setScheduler((notify) => notify());
});

afterAll(() => {
  notifyManager.setScheduler((notify) => setTimeout(notify, 0));
});

function makeQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

async function renderGate(queryClient = makeQueryClient()) {
  const tree = () => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Gate />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
  const rendered = await render(tree());
  return {
    ...rendered,
    queryClient,
    rerenderGate: () => rendered.rerender(tree()),
  };
}

/** Reads the currently committed callback so two taps can land before React
 * publishes the refetching render. */
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

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

/** The laid-out container a piece of copy sits in (card, then screen). */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

async function expectPressFeedback(
  getButton: () => TestInstance,
  resting: SemanticStyle,
  pressed: SemanticStyle,
): Promise<void> {
  expect(flattenedStyle(getButton())).toMatchObject(resting);
  await fireEvent(getButton(), 'responderGrant', responderEvent());
  expect(flattenedStyle(getButton())).toMatchObject(pressed);
  await fireEvent(getButton(), 'responderTerminate', responderEvent());
  await waitFor(() => {
    const restored = flattenedStyle(getButton());
    expect(restored).toMatchObject(resting);
    for (const property of Object.keys(pressed)) {
      if (!(property in resting)) expect(restored[property]).toBeUndefined();
    }
  });
}

afterEach(async () => {
  // Unsubscribe every rendered gate before clearing its query cache. RNTL's
  // automatic cleanup can run after this hook, leaving a live observer for a
  // timer-batched clear notification under full-suite scheduling.
  cleanup();
  await act(async () => {
    for (const client of queryClients) client.clear();
    // TanStack can schedule a second notification from the first batch.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  queryClients.length = 0;
});

beforeEach(() => {
  jest.clearAllMocks();
  // RootLayout renders with a Hindi UI user and syncs the module-level language via the
  // real I18nProvider's effect; pin it back so every test starts in English.
  setActiveLanguage('en');
  asMock(useColorScheme).mockReturnValue('light');
  mockApiFetch.mockReset();
  mockRefreshDailyReminderLanguage.mockReset().mockResolvedValue(undefined);
  capturedStackProps.length = 0;
  capturedScreenProps.length = 0;
  capturedProtectedProps.length = 0;
  capturedStatusBarProps.length = 0;
  rootQueryClient = undefined;
  mockAuthValue = makeAuth();
});

describe('root layout route guards', () => {
  function guards(): boolean[] {
    return capturedProtectedProps.map((props) => props.guard);
  }

  it('declares every route screen in order', async () => {
    mockAuthValue = makeAuth();
    await render(<RootLayout />);
    expect(capturedScreenProps.map((props) => props?.name)).toEqual([
      'index',
      '(auth)',
      'diagnostic',
      'home',
      'practice/index',
      'practice/help',
      'practice/attempt',
      'practice/feedback',
      'history',
      'recordings',
      'settings/index',
      'settings/change-password',
      'settings/delete-account',
      'settings/privacy',
      'settings/terms',
    ]);
  });

  it('configures the exact header title for every visible nested route', async () => {
    await render(<RootLayout />);
    const titleFor = (name: string) =>
      (
        capturedScreenProps.find((props) => props?.name === name)?.options as
          { title?: unknown } | undefined
      )?.title;

    expect([
      titleFor('diagnostic'),
      titleFor('home'),
      titleFor('practice/index'),
      titleFor('practice/help'),
      titleFor('practice/attempt'),
      titleFor('practice/feedback'),
      titleFor('history'),
      titleFor('recordings'),
      titleFor('settings/index'),
      titleFor('settings/change-password'),
      titleFor('settings/delete-account'),
      titleFor('settings/privacy'),
      titleFor('settings/terms'),
      // RootLayout mounts the real I18nProvider fed by the mocked user's Hindi
      // UI language, despite the account's Telugu learning language.
    ]).toEqual([
      translateFor('hi', 'header.diagnostic'),
      translateFor('hi', 'header.home'),
      translateFor('hi', 'header.practice'),
      translateFor('hi', 'header.help'),
      translateFor('hi', 'header.attempt'),
      translateFor('hi', 'header.feedback'),
      translateFor('hi', 'header.history'),
      translateFor('hi', 'header.recordings'),
      translateFor('hi', 'header.settings'),
      translateFor('hi', 'header.changePassword'),
      translateFor('hi', 'header.deleteAccount'),
      translateFor('hi', 'header.privacy'),
      translateFor('hi', 'header.terms'),
    ]);
  });

  it('relocalizes and refreshes reminder copy only from UI-language and account changes', async () => {
    const firstUser = { ...USER, nativeLanguage: 'te' as const, uiLanguage: 'hi' as const };
    mockAuthValue = makeAuth({ user: firstUser });
    const rendered = await render(<RootLayout />);
    await waitFor(() =>
      expect(mockRefreshDailyReminderLanguage).toHaveBeenCalledWith(firstUser.uiLanguage),
    );

    const latestTitle = (name: string) =>
      (
        capturedScreenProps.filter((props) => props?.name === name).at(-1)?.options as
          { title?: unknown } | undefined
      )?.title;
    expect(latestTitle('home')).toBe(translateFor('hi', 'header.home'));

    mockRefreshDailyReminderLanguage.mockClear();
    mockAuthValue = makeAuth({
      user: { ...firstUser, nativeLanguage: 'zh' },
    });
    await rendered.rerender(<RootLayout />);
    expect(latestTitle('home')).toBe(translateFor('hi', 'header.home'));
    expect(mockRefreshDailyReminderLanguage).not.toHaveBeenCalled();

    mockAuthValue = makeAuth({
      user: { ...firstUser, nativeLanguage: 'zh', uiLanguage: 'es' },
    });
    await rendered.rerender(<RootLayout />);
    await waitFor(() => expect(mockRefreshDailyReminderLanguage).toHaveBeenCalledWith('es'));
    expect(latestTitle('home')).toBe(translateFor('es', 'header.home'));

    mockRefreshDailyReminderLanguage.mockClear();
    mockAuthValue = makeAuth({
      user: {
        ...firstUser,
        id: '550e8400-e29b-41d4-a716-446655440099',
        nativeLanguage: 'zh',
        uiLanguage: 'es',
      },
    });
    await rendered.rerender(<RootLayout />);
    await waitFor(() => expect(mockRefreshDailyReminderLanguage).toHaveBeenCalledWith('es'));
    expect(mockRefreshDailyReminderLanguage).toHaveBeenCalledTimes(1);
  });

  it('does not refresh reminder copy without a complete signed-in profile', async () => {
    mockAuthValue = makeAuth({ user: null });
    await render(<RootLayout />);
    expect(mockRefreshDailyReminderLanguage).not.toHaveBeenCalled();
  });

  it('configures bounded retries and a five-minute stale window for queries', async () => {
    await render(<RootLayout />);

    expect(rootQueryClient).toBeDefined();
    expect(rootQueryClient?.getDefaultOptions().queries).toEqual(
      expect.objectContaining({
        retry: 1,
        staleTime: 300_000,
      }),
    );
  });

  it('inks the status bar and the whole stack chrome from the light palette', async () => {
    await render(<RootLayout />);

    // Light surfaces need dark status-bar glyphs to stay legible.
    expect(capturedStatusBarProps.map((props) => props.style)).toEqual(['dark']);
    expect(capturedStackProps).toHaveLength(1);
    expect(capturedStackProps[0].screenOptions).toEqual({
      headerTintColor: colors.text,
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    });
  });

  it('inks the status bar and the whole stack chrome from the dark palette', async () => {
    asMock(useColorScheme).mockReturnValue('dark');
    await render(<RootLayout />);

    // Dark surfaces need light status-bar glyphs; the two palettes must not
    // share a single hard-coded value.
    expect(capturedStatusBarProps.map((props) => props.style)).toEqual(['light']);
    expect(capturedStackProps).toHaveLength(1);
    expect(capturedStackProps[0].screenOptions).toEqual({
      headerTintColor: darkColors.text,
      headerStyle: { backgroundColor: darkColors.background },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: darkColors.background },
    });
  });

  it('closes every protected group while the session is restoring', async () => {
    mockAuthValue = makeAuth({ isRestoring: true, token: null, user: null });
    await render(<RootLayout />);
    // Order: (auth), diagnostic, practice, settings.
    expect(guards()).toEqual([false, false, false, false]);
  });

  it('closes every protected group while a populated session is still restoring', async () => {
    mockAuthValue = makeAuth({ isRestoring: true });
    await render(<RootLayout />);
    expect(guards()).toEqual([false, false, false, false]);
  });

  it('opens only the (auth) group when there is no token', async () => {
    mockAuthValue = makeAuth({ token: null, user: null });
    await render(<RootLayout />);
    expect(guards()).toEqual([true, false, false, false]);
  });

  it('keeps every protected group closed after a secure-store restore error', async () => {
    mockAuthValue = makeAuth({
      token: null,
      user: null,
      restoreError: 'Secure session storage is unavailable.',
    });
    await render(<RootLayout />);
    expect(guards()).toEqual([false, false, false, false]);
  });

  it('does not trust a populated profile after secure-store restoration fails', async () => {
    mockAuthValue = makeAuth({ restoreError: 'Secure session storage is unavailable.' });
    await render(<RootLayout />);
    expect(guards()).toEqual([false, false, false, false]);
  });

  it('closes everything while the profile is still loading', async () => {
    mockAuthValue = makeAuth({ user: null });
    await render(<RootLayout />);
    expect(guards()).toEqual([false, false, false, false]);
  });

  it('routes users without a completed diagnostic to the diagnostic screen only', async () => {
    mockAuthValue = makeAuth({
      user: { ...USER, diagnosticCompleted: false, cefrLevel: null },
    });
    await render(<RootLayout />);
    expect(guards()).toEqual([false, true, false, true]);
  });

  it('routes users with a completed diagnostic to practice and settings', async () => {
    mockAuthValue = makeAuth();
    await render(<RootLayout />);
    expect(guards()).toEqual([false, false, true, true]);
  });

  it('locks assessment routes against header-back and swipe-back bypasses', async () => {
    await render(<RootLayout />);
    const optionsFor = (name: string) =>
      capturedScreenProps.find((props) => props?.name === name)?.options;

    expect(optionsFor('index')).toEqual(expect.objectContaining({ headerShown: false }));
    expect(optionsFor('(auth)')).toEqual(expect.objectContaining({ headerShown: false }));
    for (const name of ['diagnostic', 'practice/index', 'practice/feedback']) {
      expect(optionsFor(name)).toEqual(
        expect.objectContaining({ headerBackVisible: false, gestureEnabled: false }),
      );
    }
  });

  it('pins the complete option set of every back-locked route, home included', async () => {
    await render(<RootLayout />);
    const optionsFor = (name: string) =>
      capturedScreenProps.find((props) => props?.name === name)?.options;

    // `home` is the post-diagnostic landing screen: leaving it by back or swipe
    // would strand the user on the assessment they already finished.
    const locked = [
      ['diagnostic', 'header.diagnostic'],
      ['home', 'header.home'],
      ['practice/index', 'header.practice'],
      ['practice/feedback', 'header.feedback'],
    ] as const;
    for (const [name, key] of locked) {
      expect(optionsFor(name)).toEqual({
        title: translateFor('hi', key),
        headerBackVisible: false,
        gestureEnabled: false,
      });
    }

    // Routes the user may leave freely keep the default back affordances.
    for (const name of [
      'practice/help',
      'practice/attempt',
      'history',
      'recordings',
      'settings/index',
    ]) {
      expect(optionsFor(name)).not.toHaveProperty('headerBackVisible');
      expect(optionsFor(name)).not.toHaveProperty('gestureEnabled');
    }
  });

  it('tracks native foreground state and removes the focus bridge on unmount', async () => {
    const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });
    const remove = jest.fn();
    let onChange: ((state: AppStateStatus) => void) | undefined;
    const addListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        onChange = listener;
        return { remove } as ReturnType<typeof AppState.addEventListener>;
      });
    const setFocusedSpy = jest.spyOn(focusManager, 'setFocused');

    try {
      const rendered = await render(<RootLayout />);
      expect(addListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
      expect(setFocusedSpy).toHaveBeenCalledWith(false);

      await act(async () => onChange?.('active'));
      expect(setFocusedSpy).toHaveBeenLastCalledWith(true);
      await act(async () => onChange?.('inactive'));
      expect(setFocusedSpy).toHaveBeenLastCalledWith(false);

      await rendered.unmount();
      expect(remove).toHaveBeenCalledTimes(1);
      expect(setFocusedSpy).toHaveBeenLastCalledWith(undefined);
    } finally {
      addListenerSpy.mockRestore();
      setFocusedSpy.mockRestore();
      if (originalCurrentState) {
        Object.defineProperty(AppState, 'currentState', originalCurrentState);
      } else {
        delete (AppState as unknown as { currentState?: AppStateStatus }).currentState;
      }
    }
  });

  it('does not miss a background transition while installing the focus bridge', async () => {
    const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    const remove = jest.fn();
    const addListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
      // Model the transition in the exact setup gap. Subscribing first means
      // the subsequent currentState sample observes it.
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        value: 'background',
      });
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
    const setFocusedSpy = jest.spyOn(focusManager, 'setFocused');

    try {
      const rendered = await render(<RootLayout />);
      expect(setFocusedSpy).toHaveBeenCalledWith(false);
      await rendered.unmount();
    } finally {
      addListenerSpy.mockRestore();
      setFocusedSpy.mockRestore();
      if (originalCurrentState) {
        Object.defineProperty(AppState, 'currentState', originalCurrentState);
      } else {
        delete (AppState as unknown as { currentState?: AppStateStatus }).currentState;
      }
    }
  });

  it('defaults to focused while the initial native app state is unavailable', async () => {
    const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: undefined,
    });
    const remove = jest.fn();
    const addListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove } as ReturnType<typeof AppState.addEventListener>);
    const setFocusedSpy = jest.spyOn(focusManager, 'setFocused');

    try {
      const rendered = await render(<RootLayout />);
      expect(setFocusedSpy).toHaveBeenCalledWith(true);

      await rendered.unmount();
      expect(remove).toHaveBeenCalledTimes(1);
    } finally {
      addListenerSpy.mockRestore();
      setFocusedSpy.mockRestore();
      if (originalCurrentState) {
        Object.defineProperty(AppState, 'currentState', originalCurrentState);
      } else {
        delete (AppState as unknown as { currentState?: AppStateStatus }).currentState;
      }
    }
  });
});

describe('root fallback screens', () => {
  it('retries a route crash without exposing the error body', async () => {
    const retry = jest.fn();
    await render(<ErrorBoundary error={new Error('sensitive stack details')} retry={retry} />);

    expect(screen.getByRole('header', { name: t('boundary.title') })).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(t('boundary.body'));
    expect(screen.queryByText(/sensitive stack details/)).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        minHeight: layout.minimumTarget,
        // The call-site override that separates the CTA from the body copy.
        marginTop: spacing.xl,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('lays the route-crash card out as a centered themed card', async () => {
    await render(<ErrorBoundary error={new Error('sensitive stack details')} retry={jest.fn()} />);

    const title = screen.getByRole('header', { name: t('boundary.title') });
    const card = parentOf(title);

    expect(flattenedStyle(parentOf(card))).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(card)).toEqual({
      width: '100%',
      maxWidth: layout.formMaxWidth,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.card,
      padding: spacing.xl,
      alignItems: 'center',
    });
    expect(flattenedStyle(title)).toEqual({
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByRole('alert'))).toEqual({
      marginTop: 10,
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
      textAlign: 'center',
    });
  });

  it('returns an invalid deep link to the protected entry gate', async () => {
    await render(<NotFoundScreen />);

    expect(screen.getByRole('header', { name: t('notFound.title') })).toBeTruthy();
    // The body explains that the link is dead — without it the screen is a
    // bare title with a button.
    expect(screen.getByText(t('notFound.body'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('notFound.goHome') }),
      {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        minHeight: layout.minimumTarget,
        marginTop: spacing.xl,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('notFound.goHome') }));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('titles the dead-link header from the catalog instead of the +not-found route name', async () => {
    await render(<NotFoundScreen />);

    // The route is declared nowhere in the root Stack, so without options of
    // its own the native stack would print the raw route name in the header.
    expect(capturedScreenProps).toHaveLength(1);
    expect(capturedScreenProps[0]?.name).toBeUndefined();
    expect(capturedScreenProps[0]?.options).toEqual({ title: t('notFound.title') });
  });

  it('lays the dead-link screen out as a centered themed card', async () => {
    await render(<NotFoundScreen />);

    const title = screen.getByRole('header', { name: t('notFound.title') });
    const card = parentOf(title);

    expect(flattenedStyle(parentOf(card))).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(card)).toEqual({
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.card,
      backgroundColor: colors.card,
      padding: spacing.xl,
    });
    expect(flattenedStyle(title)).toEqual({
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('notFound.body')))).toEqual({
      marginTop: 10,
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
      textAlign: 'center',
    });
  });
});

describe('(auth) layout', () => {
  it('hides headers and themes the card background for the auth stack', async () => {
    await render(<AuthLayout />);
    expect(capturedStackProps).toHaveLength(1);
    expect(capturedStackProps[0].screenOptions).toEqual({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    });
  });
});

describe('index gate', () => {
  it('shows a restoring message while the session is being read', async () => {
    mockAuthValue = makeAuth({ isRestoring: true });
    await renderGate();
    const message = screen.getByText(t('gate.restoring'));
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByLabelText(t('gate.restoring')).props.accessibilityLabel).toBe(
      t('gate.restoring'),
    );
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows secure-storage recovery instead of redirecting to login', async () => {
    const retrySessionRestore = jest.fn();
    mockAuthValue = makeAuth({
      restoreError:
        'Secure session storage is temporarily unavailable. Unlock your device and try again.',
      retrySessionRestore,
    });
    await renderGate();

    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText(t('gate.sessionErrorTitle'))).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(mockAuthValue.restoreError!);
    expect(mockApiFetch).not.toHaveBeenCalled();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { backgroundColor: colors.primary, minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(retrySessionRestore).toHaveBeenCalledTimes(1);
  });

  it('offers an explicit session-reset escape when secure storage stays unreadable', async () => {
    const resetStoredSession = jest.fn();
    mockAuthValue = makeAuth({
      token: null,
      user: null,
      restoreError:
        'Secure session storage is temporarily unavailable. Unlock your device and try again.',
      resetStoredSession,
    });
    await renderGate();

    expect(screen.queryByTestId('redirect')).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('gate.resetSession') }),
      {
        backgroundColor: colors.danger,
        minHeight: layout.minimumTarget,
        // Sits closer to the retry CTA above it than a full section gap.
        marginTop: spacing.ml,
      },
      { backgroundColor: colors.danger, opacity: 0.85 },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('gate.resetSession') }));
    expect(resetStoredSession).toHaveBeenCalledTimes(1);
  });

  it('centers the session-error copy and spaces its two recovery actions', async () => {
    mockAuthValue = makeAuth({
      restoreError: 'Secure session storage is temporarily unavailable.',
    });
    await renderGate();

    const title = screen.getByRole('header', { name: t('gate.sessionErrorTitle') });
    expect(flattenedStyle(parentOf(title))).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(title)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByRole('alert'))).toEqual({
      marginTop: spacing.md,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.xl });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('gate.resetSession') })),
    ).toMatchObject({ marginTop: spacing.ml });
  });

  it('centers the loading state on the same themed screen', async () => {
    mockAuthValue = makeAuth({ isRestoring: true });
    await renderGate();

    const label = screen.getByText(t('gate.restoring'));
    expect(flattenedStyle(parentOf(label))).toEqual({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    });
    expect(flattenedStyle(label)).toEqual({
      marginTop: spacing.md,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
  });

  it('redirects to login when there is no token', async () => {
    mockAuthValue = makeAuth({ token: null, user: null });
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('redirects to the home progress screen when the diagnostic is complete', async () => {
    mockAuthValue = makeAuth();
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/home');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('redirects to the diagnostic when it is not complete', async () => {
    mockAuthValue = makeAuth({
      user: { ...USER, diagnosticCompleted: false, cefrLevel: null },
    });
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('loads the profile when a token exists without a user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    const queryClient = makeQueryClient();
    await renderGate(queryClient);
    expect(screen.getByText(t('gate.loadingProfile'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(queryClient.getQueryCache().find({ queryKey: ['me', 1], exact: true })).toBeDefined();
  });

  it('stores the fetched profile and redirects based on it', async () => {
    mockAuthValue = makeAuth({ user: null });
    const fetched = { ...USER, diagnosticCompleted: false, cefrLevel: null };
    mockApiFetch.mockResolvedValue({ user: fetched });
    await renderGate();
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalledWith(fetched));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
  });

  it('does not apply a profile response from a superseded auth session', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const firstResponse = new Promise<unknown>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<unknown>((resolve) => {
      resolveSecond = resolve;
    });
    const firstSetUser = jest.fn();
    mockAuthValue = makeAuth({ user: null, sessionVersion: 1, setUser: firstSetUser });
    mockApiFetch.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    const rendered = await renderGate();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    const secondSetUser = jest.fn();
    mockAuthValue = makeAuth({ user: null, sessionVersion: 2, setUser: secondSetUser });
    await rendered.rerenderGate();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));

    await act(async () => resolveFirst({ user: { ...USER, name: 'Stale User' } }));
    expect(firstSetUser).not.toHaveBeenCalled();
    expect(secondSetUser).not.toHaveBeenCalled();
    expect(screen.getByText(t('gate.loadingProfile'))).toBeTruthy();

    const currentProfile = { ...USER, name: 'Current User' };
    await act(async () => resolveSecond({ user: currentProfile }));
    await waitFor(() => expect(secondSetUser).toHaveBeenCalledWith(currentProfile));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/home');
  });

  it('recaptures the lease when its capture function changes during one profile request', async () => {
    let resolveProfile!: (value: unknown) => void;
    const profileRequest = new Promise<unknown>((resolve) => {
      resolveProfile = resolve;
    });
    const leaseA = { owner: 'gate-a' } as never;
    const leaseB = { owner: 'gate-b' } as never;
    let currentLease: unknown = leaseA;
    const captureA = jest.fn(() => leaseA);
    const captureB = jest.fn(() => leaseB);
    const isSessionLeaseCurrent = jest.fn((lease: SessionLease) => lease === currentLease);
    const firstSetUser = jest.fn();
    mockAuthValue = makeAuth({
      user: null,
      setUser: firstSetUser,
      captureSessionLease: captureA,
      isSessionLeaseCurrent,
    });
    mockApiFetch.mockReturnValue(profileRequest);
    const rendered = await renderGate();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(captureA).toHaveBeenCalledTimes(1);

    const replacementSetUser = jest.fn();
    currentLease = leaseB;
    mockAuthValue = makeAuth({
      user: null,
      setUser: replacementSetUser,
      captureSessionLease: captureB,
      isSessionLeaseCurrent,
    });
    await rendered.rerenderGate();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(captureB).toHaveBeenCalledTimes(1);

    const currentProfile = { ...USER, name: 'Current Lease' };
    await act(async () => {
      resolveProfile({ user: currentProfile });
      await Promise.resolve();
    });

    await waitFor(() => expect(replacementSetUser).toHaveBeenCalledWith(currentProfile));
    expect(firstSetUser).not.toHaveBeenCalled();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/home');
  });

  it('does not commit or route from /auth/me after the render-captured lease expires', async () => {
    let resolveProfile!: (value: unknown) => void;
    const profile = new Promise<unknown>((resolve) => {
      resolveProfile = resolve;
    });
    const renderLease = { owner: 'gate-render' } as never;
    let currentLease: unknown = renderLease;
    const setUser = jest.fn();
    mockAuthValue = makeAuth({
      user: null,
      setUser,
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockReturnValue(profile);
    await renderGate();
    expect(screen.getByText(t('gate.loadingProfile'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.captureSessionLease).toHaveBeenCalledTimes(1);

    // Invalidate Auth synchronously without granting React a rerender first.
    // A query-key/sessionVersion guard alone cannot cover this interval.
    currentLease = { owner: 'replacement-session' };
    await act(async () => {
      resolveProfile({ user: USER });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setUser).not.toHaveBeenCalled();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText(t('gate.loadingProfile'))).toBeTruthy();
  });

  it('shows a signing-out spinner when the stored token is rejected', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderGate();
    expect(await screen.findByText(t('gate.signingOut'))).toBeTruthy();
  });

  it('does not treat a non-ApiError status property as an authenticated rejection', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue({ status: 401, message: 'not an ApiError' });
    await renderGate();

    expect(await screen.findByText(t('gate.serverErrorTitle'))).toBeTruthy();
    expect(screen.queryByText(t('gate.signingOut'))).toBeNull();
  });

  it('shows a retryable error when the profile fetch fails', async () => {
    mockAuthValue = makeAuth({ user: null });
    const fetched = { ...USER, diagnosticCompleted: false, cefrLevel: null };
    mockApiFetch
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({ user: fetched });
    await renderGate();
    expect(await screen.findByText(t('gate.serverErrorTitle'))).toBeTruthy();
    // The error title is a screen-reader landmark for the failure state.
    expect(screen.getByRole('header', { name: t('gate.serverErrorTitle') })).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy')).props.accessibilityLiveRegion).toBe('assertive');
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { backgroundColor: colors.primary, minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalledWith(fetched));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('joins repeated retries after a cached empty profile fails in the background', async () => {
    mockAuthValue = makeAuth({ user: null });
    const queryClient = makeQueryClient();
    // `null` is hostile cached input, but it is still defined query data. That
    // distinction makes TanStack cancel and restart an active refetch unless
    // the screen explicitly opts into joining it.
    queryClient.setQueryData(['me', 1], null);
    const retryRequest = new Promise<unknown>(() => undefined);
    mockApiFetch
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockReturnValue(retryRequest);
    await renderGate(queryClient);

    const button = await screen.findByRole('button', { name: t('common.tryAgain') });
    const retry = committedPressHandler(button);
    await act(async () => {
      void retry();
      void retry();
      await Promise.resolve();
    });

    // One failed background fetch plus one joined manual retry. The second tap
    // must not abort that retry and create a third profile request.
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new Error('parse failure'));
    await renderGate();
    expect(await screen.findByText(t('gate.profileFailed'))).toBeTruthy();
  });
});
