import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { AppState, type AppStateStatus, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthLayout from '../src/app/(auth)/_layout';
import NotFoundScreen from '../src/app/+not-found';
import RootLayout, { ErrorBoundary } from '../src/app/_layout';
import Gate from '../src/app/index';
import { ApiError, apiFetch } from '../src/lib/api';
import type { useAuth } from '../src/lib/auth';
import { colors, layout } from '../src/lib/theme';
import type { User } from '../src/lib/types';

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

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

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

// ----- api mock (apiFetch only; keep real ApiError/userMessageForError) -----

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

// ----- helpers -----

const queryClients: QueryClient[] = [];

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

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
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
  // Flush TanStack Query's batched notifications inside act().
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // Cancel cache-gc timers so the jest process can exit promptly.
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockReset();
  capturedStackProps.length = 0;
  capturedScreenProps.length = 0;
  capturedProtectedProps.length = 0;
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
      'practice/index',
      'practice/help',
      'practice/attempt',
      'practice/feedback',
      'settings/change-password',
      'settings/delete-account',
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
      titleFor('practice/index'),
      titleFor('practice/help'),
      titleFor('practice/attempt'),
      titleFor('practice/feedback'),
      titleFor('settings/change-password'),
      titleFor('settings/delete-account'),
    ]).toEqual([
      'Diagnostic Test',
      'Practice',
      'Help',
      'Practice Mode',
      'Feedback',
      'Change Password',
      'Delete Account',
    ]);
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

    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your learning data is safe. Try this screen again.',
    );
    expect(screen.queryByText(/sensitive stack details/)).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        minHeight: layout.minimumTarget,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('returns an invalid deep link to the protected entry gate', async () => {
    await render(<NotFoundScreen />);

    expect(screen.getByRole('header', { name: 'Page not found' })).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Return Home' }),
      {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        minHeight: layout.minimumTarget,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Return Home' }));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('(auth) layout', () => {
  it('hides headers for the auth stack', async () => {
    await render(<AuthLayout />);
    expect(capturedStackProps).toHaveLength(1);
    expect(capturedStackProps[0].screenOptions).toEqual({
      headerShown: false,
    });
  });
});

describe('index gate', () => {
  it('shows a restoring message while the session is being read', async () => {
    mockAuthValue = makeAuth({ isRestoring: true });
    await renderGate();
    expect(screen.getByText('Restoring your session…')).toBeTruthy();
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
    expect(screen.getByText("Can't access your secure session")).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(mockAuthValue.restoreError!);
    expect(mockApiFetch).not.toHaveBeenCalled();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { backgroundColor: colors.primary, minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
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
      () => screen.getByRole('button', { name: 'Reset saved session' }),
      {
        backgroundColor: colors.card,
        borderColor: colors.danger,
        minHeight: layout.minimumTarget,
      },
      { backgroundColor: colors.dangerLight },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Reset saved session' }));
    expect(resetStoredSession).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when there is no token', async () => {
    mockAuthValue = makeAuth({ token: null, user: null });
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('redirects to practice when the diagnostic is complete', async () => {
    mockAuthValue = makeAuth();
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/practice');
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
    expect(screen.getByText('Loading your profile…')).toBeTruthy();
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
    expect(screen.getByText('Loading your profile…')).toBeTruthy();

    const currentProfile = { ...USER, name: 'Current User' };
    await act(async () => resolveSecond({ user: currentProfile }));
    await waitFor(() => expect(secondSetUser).toHaveBeenCalledWith(currentProfile));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/practice');
  });

  it('shows a signing-out spinner when the stored token is rejected', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderGate();
    expect(await screen.findByText('Signing you out…')).toBeTruthy();
  });

  it('does not treat a non-ApiError status property as an authenticated rejection', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue({ status: 401, message: 'not an ApiError' });
    await renderGate();

    expect(await screen.findByText("Can't reach the server")).toBeTruthy();
    expect(screen.queryByText('Signing you out…')).toBeNull();
  });

  it('shows a retryable error when the profile fetch fails', async () => {
    mockAuthValue = makeAuth({ user: null });
    const fetched = { ...USER, diagnosticCompleted: false, cefrLevel: null };
    mockApiFetch
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce({ user: fetched });
    await renderGate();
    expect(await screen.findByText("Can't reach the server")).toBeTruthy();
    expect(
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { backgroundColor: colors.primary, minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalledWith(fetched));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new Error('parse failure'));
    await renderGate();
    expect(await screen.findByText('Could not load your profile. Please try again.')).toBeTruthy();
  });
});
