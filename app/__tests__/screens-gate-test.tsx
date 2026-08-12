import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthLayout from '../src/app/(auth)/_layout';
import NotFoundScreen from '../src/app/+not-found';
import RootLayout, { ErrorBoundary } from '../src/app/_layout';
import Gate from '../src/app/index';
import { ApiError, apiFetch } from '../src/lib/api';
import type { useAuth } from '../src/lib/auth';
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

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
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

function renderGate() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={makeQueryClient()}>
        <Gate />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
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

  it('closes every protected group while the session is restoring', async () => {
    mockAuthValue = makeAuth({ isRestoring: true, token: null, user: null });
    await render(<RootLayout />);
    // Order: (auth), diagnostic, practice, settings.
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
});

describe('root fallback screens', () => {
  it('retries a route crash without exposing the error body', async () => {
    const retry = jest.fn();
    await render(<ErrorBoundary error={new Error('sensitive stack details')} retry={retry} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText(/sensitive stack details/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('returns an invalid deep link to the protected entry gate', async () => {
    await render(<NotFoundScreen />);

    expect(screen.getByText('Page not found')).toBeTruthy();
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
    mockAuthValue = makeAuth({ isRestoring: true, token: null, user: null });
    await renderGate();
    expect(screen.getByText('Restoring your session…')).toBeTruthy();
  });

  it('shows secure-storage recovery instead of redirecting to login', async () => {
    const retrySessionRestore = jest.fn();
    mockAuthValue = makeAuth({
      token: null,
      user: null,
      restoreError:
        'Secure session storage is temporarily unavailable. Unlock your device and try again.',
      retrySessionRestore,
    });
    await renderGate();

    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByText("Can't access your secure session")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(retrySessionRestore).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when there is no token', async () => {
    mockAuthValue = makeAuth({ token: null, user: null });
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
  });

  it('redirects to practice when the diagnostic is complete', async () => {
    mockAuthValue = makeAuth();
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/practice');
  });

  it('redirects to the diagnostic when it is not complete', async () => {
    mockAuthValue = makeAuth({
      user: { ...USER, diagnosticCompleted: false, cefrLevel: null },
    });
    await renderGate();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
  });

  it('loads the profile when a token exists without a user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderGate();
    expect(screen.getByText('Loading your profile…')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('stores the fetched profile and redirects based on it', async () => {
    mockAuthValue = makeAuth({ user: null });
    const fetched = { ...USER, diagnosticCompleted: false, cefrLevel: null };
    mockApiFetch.mockResolvedValue({ user: fetched });
    await renderGate();
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalledWith(fetched));
    expect(screen.getByTestId('redirect')).toHaveTextContent('/diagnostic');
  });

  it('shows a signing-out spinner when the stored token is rejected', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderGate();
    expect(await screen.findByText('Signing you out…')).toBeTruthy();
  });

  it('shows a retryable error when the profile fetch fails', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderGate();
    expect(await screen.findByText("Can't reach the server")).toBeTruthy();
    expect(
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockApiFetch.mockRejectedValue(new Error('parse failure'));
    await renderGate();
    expect(await screen.findByText('Could not load your profile. Please try again.')).toBeTruthy();
  });
});
