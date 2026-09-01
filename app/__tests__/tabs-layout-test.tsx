import { cleanup, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoRouter from 'expo-router';

import TabLayout from '../src/app/(tabs)/_layout';
import PracticeTabLayout from '../src/app/(tabs)/practice/_layout';
import { setActiveLanguage, translateFor } from '../src/lib/i18n';
import type { User } from '../src/lib/types';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={initialMetrics}>{ui}</SafeAreaProvider>);
}

const asMock = (fn: unknown) => fn as jest.Mock;

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const USER: User = {
  id: 'user-1',
  name: 'Asha',
  email: 'asha@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
  diagnosticAcknowledged: true,
};

let mockAuthValue: ReturnType<typeof makeAuth>;
function makeAuth(overrides: Partial<{ user: typeof USER }> = {}) {
  return {
    user: overrides.user ?? USER,
    token: 'token',
    isRestoring: false,
    restoreError: null,
    sessionVersion: 1,
    captureSessionLease: jest.fn(() => ({ accountId: 'account-1', epoch: 1 })),
    isSessionLeaseCurrent: jest.fn(() => true),
    login: jest.fn(),
    logout: jest.fn(),
  };
}

jest.mock('../src/lib/auth', () => ({
  useAuth: () => mockAuthValue,
}));

// Captured navigator declarations. The mock components and their capture
// arrays live at module level (function declarations hoist above the hoisted
// jest.mock factory, the same pattern as the root-layout gate test), so the
// factory itself stays require-free.
const capturedTabProps: {
  screenOptions?: Record<string, unknown>;
  tabBar?: (props: never) => React.ReactElement | null;
}[] = [];
const capturedTabScreenProps: ({ name?: string; options?: Record<string, unknown> } | undefined)[] =
  [];
const capturedTabProtectedProps: { guard: boolean; screenNames: string[] }[] = [];
const capturedStackProps: { screenOptions?: Record<string, unknown> }[] = [];
const capturedStackScreenProps: (
  { name?: string; options?: Record<string, unknown> } | undefined
)[] = [];

function MockTabs(props: {
  children?: React.ReactNode;
  screenOptions?: Record<string, unknown>;
  tabBar?: (props: never) => React.ReactElement | null;
}) {
  capturedTabProps.push(props);
  return <>{props.children}</>;
}
function MockTabScreen(props: { name?: string; options?: Record<string, unknown> }) {
  capturedTabScreenProps.push(props);
  return null;
}
function MockTabsProtected(props: { guard: boolean; children?: React.ReactNode }) {
  capturedTabProtectedProps.push({
    guard: props.guard,
    screenNames: React.Children.toArray(props.children)
      .filter(React.isValidElement)
      .map((child) => (child.props as { name?: string }).name as string),
  });
  return <>{props.children}</>;
}
function MockStack(props: { children?: React.ReactNode; screenOptions?: Record<string, unknown> }) {
  capturedStackProps.push(props);
  return <>{props.children}</>;
}
function MockStackScreen(props: { name?: string; options?: Record<string, unknown> }) {
  capturedStackScreenProps.push(props);
  return null;
}
MockTabs.Screen = MockTabScreen;
MockTabs.Protected = MockTabsProtected;
MockStack.Screen = MockStackScreen;

jest.mock('expo-router', () => ({
  __esModule: true,
  Tabs: MockTabs,
  Stack: MockStack,
  Redirect: () => null,
  Link: () => null,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    navigate: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  useNavigation: () => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) }),
}));

const captured = {
  capturedTabProps,
  capturedTabScreenProps,
  capturedTabProtectedProps,
  capturedStackProps,
  capturedStackScreenProps,
};

beforeEach(() => {
  jest.clearAllMocks();
  setActiveLanguage('en');
  for (const arrays of Object.values(captured)) arrays.length = 0;
  mockAuthValue = makeAuth();
});

afterEach(() => {
  cleanup();
});

describe('bottom tab layout', () => {
  it('declares the four section tabs in order', async () => {
    await renderWithProviders(<TabLayout />);
    expect(captured.capturedTabScreenProps.map((props) => props?.name)).toEqual([
      'home',
      'practice',
      'history',
      'recordings',
    ]);
    expect(captured.capturedTabProps.at(-1)?.screenOptions).toMatchObject({
      headerShown: true,
      tabBarShowLabel: true,
    });
  });

  it('titles every visible tab from the catalog', async () => {
    await renderWithProviders(<TabLayout />);
    const titleFor = (name: string) =>
      captured.capturedTabScreenProps.find((props) => props?.name === name)?.options?.title;
    expect(titleFor('home')).toBe(translateFor('en', 'header.home'));
    // practice owns its nested stack, so it has no tab-level title.
    expect(titleFor('practice')).toBeUndefined();
    expect(titleFor('history')).toBe(translateFor('en', 'header.history'));
    expect(titleFor('recordings')).toBe(translateFor('en', 'header.recordings'));
  });

  it('gates home, practice, and history behind a completed placement', async () => {
    mockAuthValue = makeAuth({
      user: { ...USER, diagnosticCompleted: false, cefrLevel: null },
    });
    await renderWithProviders(<TabLayout />);
    expect(captured.capturedTabProtectedProps).toEqual([
      { guard: false, screenNames: ['home', 'practice', 'history'] },
    ]);
  });

  it('unlocks the learning tabs once the placement is acknowledged', async () => {
    await renderWithProviders(<TabLayout />);
    expect(captured.capturedTabProtectedProps).toEqual([
      { guard: true, screenNames: ['home', 'practice', 'history'] },
    ]);
  });

  it('keeps the learning tabs closed while a placement reveal is pending', async () => {
    mockAuthValue = makeAuth({ user: { ...USER, diagnosticAcknowledged: false } });
    await renderWithProviders(<TabLayout />);
    expect(captured.capturedTabProtectedProps[0]?.guard).toBe(false);
  });

  it('renders the Home header settings action and navigates on press', async () => {
    await renderWithProviders(<TabLayout />);
    const homeOptions = captured.capturedTabScreenProps.find(
      (props) => props?.name === 'home',
    )?.options;
    expect(typeof homeOptions?.headerRight).toBe('function');
    const HeaderRight = homeOptions?.headerRight as () => React.ReactElement;
    const header = await render(React.createElement(HeaderRight));
    const settings = header.getByRole('button', { name: translateFor('en', 'header.settings') });
    await fireEvent.press(settings);
    expect(asMock(ExpoRouter.router.navigate)).toHaveBeenCalledWith('/settings');
  });

  it('installs a custom themed tab bar renderer', async () => {
    await renderWithProviders(<TabLayout />);
    const props = captured.capturedTabProps.at(-1);
    expect(typeof props?.tabBar).toBe('function');
  });

  it('renders the custom tab bar with accessible tab buttons', async () => {
    await renderWithProviders(<TabLayout />);
    const lastProps = captured.capturedTabProps.at(-1);
    const TabBar = lastProps?.tabBar as unknown as (props: {
      state: { index: number; routes: { key: string; name: string }[] };
      descriptors: Record<string, { options?: { title?: string } }>;
      navigation: { emit: jest.Mock; navigate: jest.Mock };
    }) => React.ReactElement | null;

    // A minimal navigator surface: two routes, first focused, real option maps.
    const optionsByRoute: Record<string, { title?: string }> = {
      'home-route': { title: translateFor('en', 'header.home') },
      'recordings-route': { title: translateFor('en', 'header.recordings') },
    };
    const emit = jest.fn(() => ({ target: 'home-route', defaultPrevented: false }));
    const navigate = jest.fn();
    const bar = TabBar?.({
      state: {
        index: 0,
        routes: [
          { key: 'home-route', name: 'home' },
          { key: 'recordings-route', name: 'recordings' },
        ],
      },
      descriptors: Object.fromEntries(
        Object.entries(optionsByRoute).map(([key, options]) => [key, { options }]),
      ),
      navigation: { emit, navigate },
    } as never);

    expect(bar).not.toBeNull();
    const barView = await render(bar as React.ReactElement);
    const homeTab = barView.getByRole('tab', { name: translateFor('en', 'header.home') });
    expect(homeTab.props.accessibilityState).toEqual({ selected: true });
    expect(
      barView.getByRole('tab', { name: translateFor('en', 'header.recordings') }).props
        .accessibilityState,
    ).toEqual({ selected: false });

    // Tapping the unfocused tab navigates; tapping the focused tab does not.
    await fireEvent.press(
      barView.getByRole('tab', { name: translateFor('en', 'header.recordings') }),
    );
    expect(navigate).toHaveBeenCalledWith('recordings');
    await fireEvent.press(homeTab);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe('practice tab stack', () => {
  it('locks the practice home and feedback exits and leaves help/attempt free', async () => {
    await renderWithProviders(<PracticeTabLayout />);
    const optionsFor = (name: string) =>
      captured.capturedStackScreenProps.find((props) => props?.name === name)?.options;
    expect(optionsFor('index')).toEqual({
      title: translateFor('en', 'header.practice'),
      headerBackVisible: false,
      gestureEnabled: false,
    });
    expect(optionsFor('feedback')).toEqual({
      title: translateFor('en', 'header.feedback'),
      headerBackVisible: false,
      gestureEnabled: false,
    });
    expect(optionsFor('attempt')).toEqual({ title: translateFor('en', 'header.attempt') });
    expect(optionsFor('help')).toEqual({ title: translateFor('en', 'header.help') });
  });
});
