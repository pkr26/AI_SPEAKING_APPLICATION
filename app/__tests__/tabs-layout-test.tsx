import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoRouter from 'expo-router';

import TabLayout from '../src/app/(tabs)/_layout';
import PracticeTabLayout from '../src/app/(tabs)/practice/_layout';
import { setActiveLanguage, translateFor } from '../src/lib/i18n';
import {
  getPracticeExitLockServerSnapshot,
  getPracticeExitLocked,
  resetPracticeExitLockForTests,
  setPracticeExitLocked,
  subscribeToPracticeExitLock,
} from '../src/lib/practice-exit-lock';
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
  resetPracticeExitLockForTests();
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
    // The tab-level title feeds the tab bar label and its accessible name;
    // the nested stack's own titles never propagate up to it.
    expect(titleFor('practice')).toBe(translateFor('en', 'header.practice'));
    expect(titleFor('history')).toBe(translateFor('en', 'header.history'));
    expect(titleFor('recordings')).toBe(translateFor('en', 'header.recordings'));
  });

  it('relocalizes every tab title when the UI language changes', async () => {
    setActiveLanguage('hi');
    await renderWithProviders(<TabLayout />);
    const titleFor = (name: string) =>
      captured.capturedTabScreenProps.find((props) => props?.name === name)?.options?.title;
    // The raw route name must never leak into the tab bar, including the
    // practice tab whose title lives at the tab level (not its nested stack).
    expect(titleFor('home')).toBe(translateFor('hi', 'header.home'));
    expect(titleFor('practice')).toBe(translateFor('hi', 'header.practice'));
    expect(titleFor('history')).toBe(translateFor('hi', 'header.history'));
    expect(titleFor('recordings')).toBe(translateFor('hi', 'header.recordings'));
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

  it('renders the Home header settings action and navigates once per burst', async () => {
    await renderWithProviders(<TabLayout />);
    const homeOptions = captured.capturedTabScreenProps.find(
      (props) => props?.name === 'home',
    )?.options;
    expect(typeof homeOptions?.headerRight).toBe('function');
    const HeaderRight = homeOptions?.headerRight as () => React.ReactElement;
    const header = await render(React.createElement(HeaderRight));
    const settings = header.getByRole('button', {
      name: translateFor('en', 'header.settings'),
    });
    await fireEvent.press(settings);
    expect(asMock(ExpoRouter.router.navigate)).toHaveBeenCalledTimes(1);
    expect(asMock(ExpoRouter.router.navigate)).toHaveBeenCalledWith('/settings');

    // The once-latch swallows a double-tap inside the navigation window.
    await fireEvent.press(settings);
    expect(asMock(ExpoRouter.router.navigate)).toHaveBeenCalledTimes(1);

    // After the 400ms push window re-arms the latch, another press navigates
    // again (real timers: the timer callback itself is what re-arms).
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 420);
      });
    });
    await fireEvent.press(settings);
    expect(asMock(ExpoRouter.router.navigate)).toHaveBeenCalledTimes(2);
  });

  it('hides the custom tab bar while the Android soft keyboard is shown', async () => {
    const platformSpy = jest.replaceProperty(Platform, 'OS', 'android');
    const keyboardHandlers: Record<string, () => void> = {};
    const keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      handler: () => void,
    ) => {
      keyboardHandlers[event] = handler;
      return { remove: jest.fn() };
    }) as never);
    try {
      await renderWithProviders(<TabLayout />);
      expect(keyboardSpy).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
      expect(keyboardSpy).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));

      // keyboardDidShow swaps the custom bar for a null renderer.
      await act(async () => {
        keyboardHandlers['keyboardDidShow']?.();
      });
      const hiddenBar = captured.capturedTabProps.at(-1)?.tabBar as () => null;
      expect(hiddenBar()).toBeNull();

      // keyboardDidHide restores the themed bar.
      await act(async () => {
        keyboardHandlers['keyboardDidHide']?.();
      });
      const restoredBar = captured.capturedTabProps.at(-1)?.tabBar as unknown as (props: {
        state: { index: number; routes: { key: string; name: string }[] };
        descriptors: Record<string, { options?: { title?: string } }>;
        navigation: { emit: jest.Mock; navigate: jest.Mock };
      }) => React.ReactElement | null;
      expect(
        restoredBar({
          state: { index: 0, routes: [{ key: 'home-route', name: 'home' }] },
          descriptors: { 'home-route': { options: { title: translateFor('en', 'header.home') } } },
          navigation: { emit: jest.fn(), navigate: jest.fn() },
        } as never),
      ).not.toBeNull();
    } finally {
      keyboardSpy.mockRestore();
      platformSpy.restore();
    }
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
    expect(homeTab.props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(
      barView.getByRole('tab', { name: translateFor('en', 'header.recordings') }).props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: false });

    // Tapping the unfocused tab navigates; tapping the focused tab does not.
    await fireEvent.press(
      barView.getByRole('tab', { name: translateFor('en', 'header.recordings') }),
    );
    expect(navigate).toHaveBeenCalledWith('recordings');
    await fireEvent.press(homeTab);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('locks every other tab while the practice flow holds an exit lock', async () => {
    setPracticeExitLocked(true);
    await renderWithProviders(<TabLayout />);
    const lastProps = captured.capturedTabProps.at(-1);
    const TabBar = lastProps?.tabBar as unknown as (props: {
      state: { index: number; routes: { key: string; name: string }[] };
      descriptors: Record<string, { options?: { title?: string } }>;
      navigation: { emit: jest.Mock; navigate: jest.Mock };
    }) => React.ReactElement | null;

    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigate = jest.fn();
    // The practice tab is focused and holds the lock (a recording, upload,
    // recovery, or the statically locked feedback card).
    const bar = TabBar?.({
      state: {
        index: 1,
        routes: [
          { key: 'home-route', name: 'home' },
          { key: 'practice-route', name: 'practice' },
        ],
      },
      descriptors: {
        'home-route': { options: { title: translateFor('en', 'header.home') } },
        'practice-route': { options: { title: translateFor('en', 'header.practice') } },
      },
      navigation: { emit, navigate },
    } as never);

    expect(bar).not.toBeNull();
    const barView = await render(bar as React.ReactElement);
    const homeTab = barView.getByRole('tab', { name: translateFor('en', 'header.home') });
    // The locked-away tab is disabled for both touch and assistive tech, and
    // a press cannot navigate away from the focused practice flow.
    expect(homeTab.props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(homeTab.props.accessibilityHint).toBe(translateFor('en', 'hint.finishRecordingFirst'));
    await fireEvent.press(homeTab);
    expect(navigate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();

    // The tab that owns the lock stays reachable so the learner can return.
    const practiceTab = barView.getByRole('tab', { name: translateFor('en', 'header.practice') });
    expect(practiceTab.props.accessibilityState).toEqual({ selected: true, disabled: false });

    // Releasing the lock restores normal tab switching (the layout re-rendered
    // with a fresh, unlocked tab bar closure).
    setPracticeExitLocked(false);
    await act(async () => {
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    });
    const UnlockedTabBar = captured.capturedTabProps.at(-1)?.tabBar as unknown as (props: {
      state: { index: number; routes: { key: string; name: string }[] };
      descriptors: Record<string, { options?: { title?: string } }>;
      navigation: { emit: jest.Mock; navigate: jest.Mock };
    }) => React.ReactElement | null;
    const unlockedBar = UnlockedTabBar?.({
      state: {
        index: 1,
        routes: [
          { key: 'home-route', name: 'home' },
          { key: 'practice-route', name: 'practice' },
        ],
      },
      descriptors: {
        'home-route': { options: { title: translateFor('en', 'header.home') } },
        'practice-route': { options: { title: translateFor('en', 'header.practice') } },
      },
      navigation: { emit, navigate },
    } as never);
    const unlockedView = await render(unlockedBar as React.ReactElement);
    const unlockedHomeTab = unlockedView.getByRole('tab', {
      name: translateFor('en', 'header.home'),
    });
    expect(unlockedHomeTab.props.accessibilityState).toEqual({ selected: false, disabled: false });
    await fireEvent.press(unlockedHomeTab);
    expect(navigate).toHaveBeenCalledWith('home');
  });
});

describe('practice exit lock store', () => {
  it('notifies subscribers only on real changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToPracticeExitLock(listener);
    expect(getPracticeExitLocked()).toBe(false);
    setPracticeExitLocked(true);
    setPracticeExitLocked(true);
    expect(getPracticeExitLocked()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    setPracticeExitLocked(false);
    expect(getPracticeExitLocked()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setPracticeExitLocked(true);
    expect(listener).toHaveBeenCalledTimes(2);
    resetPracticeExitLockForTests();
  });

  it('reports an always-unlocked server snapshot (navigation is client-only)', () => {
    expect(getPracticeExitLockServerSnapshot()).toBe(false);
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
