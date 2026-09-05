import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { AccessibilityInfo, Linking, Platform, StyleSheet, Text } from 'react-native';
import type { TestInstance } from 'test-renderer';

import ClientUpgradeModal, {
  ANDROID_PLAY_STORE_FALLBACK,
  clientUpgradeStoreUrl,
  IOS_STORE_SEARCH_FALLBACK,
} from '../src/components/ClientUpgradeModal';
import {
  getClientUpgradeSnapshot,
  latchClientUpgradeRequired,
  resetClientUpgradeModuleForTests,
  subscribeToClientUpgrade,
} from '../src/lib/client-upgrade-store';
import { I18nProvider, translateFor } from '../src/lib/i18n';
import { darkColors, lightColors, spacing } from '../src/lib/theme';

const useColorScheme = jest.requireMock('react-native/Libraries/Utilities/useColorScheme')
  .default as jest.Mock;

/** Whole-manifest stub: `undefined` models a build with no expoConfig at all. */
const mockExpoConfig: { value: unknown } = { value: { extra: undefined } };

jest.mock('expo-constants', () => ({
  get expoConfig() {
    return mockExpoConfig.value;
  },
}));

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderModal(language: 'en' | 'te' | 'hi' | 'es' | 'zh' = 'en') {
  return render(
    <I18nProvider accountLanguage={language}>
      <ClientUpgradeModal />
    </I18nProvider>,
  );
}

function visibleModalNode() {
  const [modal] = screen.container.queryAll(
    (node) => node.props.visible === true && typeof node.props.onRequestClose === 'function',
  );
  if (!modal) throw new Error('visible client-upgrade modal was not rendered');
  return modal;
}

function committedPressHandler(node: TestInstance): () => void {
  type Fiber = {
    memoizedProps?: { onPress?: unknown };
    return: Fiber | null;
  };
  let fiber = node.unstable_fiber as Fiber | null;
  let handler: (() => void) | undefined;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      handler = fiber.memoizedProps.onPress as () => void;
      break;
    }
    fiber = fiber.return;
  }
  // Assert instead of throwing raw: a missing handler is the observable
  // behavior under a wiring mutant and must fail as a kill, never an error.
  expect(handler).toBeInstanceOf(Function);
  return handler as () => void;
}

/**
 * Authored props of the shared Button that rendered the named control, found
 * the same way RNT's own fireEvent resolves handlers: by walking the fiber
 * chain above the host element. Reading the call-site attributes keeps
 * prop-wiring assertions on exactly what the state/prop supplements force.
 */
function buttonProps(name: string): Record<string, unknown> {
  type Fiber = {
    memoizedProps?: Record<string, unknown> | null;
    type?: unknown;
    return: Fiber | null;
  };
  const node = screen.getByRole('button', { name });
  let fiber = node.unstable_fiber as Fiber | null;
  let props: Record<string, unknown> | undefined;
  while (fiber) {
    const candidate = fiber.memoizedProps as Record<string, unknown> | null;
    if (
      candidate &&
      typeof candidate.title === 'string' &&
      typeof candidate.onPress === 'function'
    ) {
      props = candidate;
      break;
    }
    if (fiber.return === null || typeof fiber.return.type === 'string') break;
    fiber = fiber.return;
  }
  // A control whose authored Button props cannot be found is itself the
  // observable wiring failure; fail on assertion evidence, never a crash.
  expect(props).toBeDefined();
  return props!;
}

let openUrlSpy: jest.SpiedFunction<typeof Linking.openURL>;

beforeEach(() => {
  cleanup();
  resetClientUpgradeModuleForTests();
  mockExpoConfig.value = { extra: undefined };
  openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

afterEach(() => {
  cleanup();
  openUrlSpy.mockRestore();
  resetClientUpgradeModuleForTests();
});

it('is a stable one-way latch and notifies each subscriber only once', () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToClientUpgrade(listener);
  const before = getClientUpgradeSnapshot();

  latchClientUpgradeRequired();
  const after = getClientUpgradeSnapshot();
  latchClientUpgradeRequired();

  expect(before).toEqual({ required: false });
  expect(after).toEqual({ required: true });
  expect(getClientUpgradeSnapshot()).toBe(after);
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});

it('stops delivering change notifications to an unsubscribed listener', () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToClientUpgrade(listener);
  unsubscribe();
  latchClientUpgradeRequired();
  expect(listener).not.toHaveBeenCalled();
});

it.each([
  [
    'a valid iOS listing',
    'ios',
    { ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890' },
    'https://apps.apple.com/us/app/ai-english-coach/id1234567890',
  ],
  ['a missing iOS listing', 'ios', undefined, IOS_STORE_SEARCH_FALLBACK],
  [
    'an iOS search URL without a numeric product ID',
    'ios',
    { ios: IOS_STORE_SEARCH_FALLBACK },
    IOS_STORE_SEARCH_FALLBACK,
  ],
  [
    'an iOS look-alike host',
    'ios',
    { ios: 'https://apps.apple.com.attacker.test/app/coach/id1234567890' },
    IOS_STORE_SEARCH_FALLBACK,
  ],
  [
    'a valid Android listing',
    'android',
    { android: ANDROID_PLAY_STORE_FALLBACK },
    ANDROID_PLAY_STORE_FALLBACK,
  ],
  [
    'the wrong Android package',
    'android',
    { android: 'https://play.google.com/store/apps/details?id=com.attacker.app' },
    ANDROID_PLAY_STORE_FALLBACK,
  ],
  ['a malformed Android URL', 'android', { android: 'not a url' }, ANDROID_PLAY_STORE_FALLBACK],
  [
    'a credential-bearing Android URL',
    'android',
    { android: 'https://user@play.google.com/store/apps/details?id=com.aienglish.coach' },
    ANDROID_PLAY_STORE_FALLBACK,
  ],
  ['a blank iOS URL', 'ios', { ios: '   ' }, IOS_STORE_SEARCH_FALLBACK],
  [
    'an Android URL with a fragment',
    'android',
    { android: `${ANDROID_PLAY_STORE_FALLBACK}#wrong-app` },
    ANDROID_PLAY_STORE_FALLBACK,
  ],
  [
    'an Android URL with a custom port',
    'android',
    { android: 'https://play.google.com:444/store/apps/details?id=com.aienglish.coach' },
    ANDROID_PLAY_STORE_FALLBACK,
  ],
])('resolves %s safely', (_label, platform, urls, expected) => {
  expect(clientUpgradeStoreUrl(platform, urls)).toBe(expected);
});

it('pins the reviewed last-resort store destinations byte for byte', () => {
  // Literal expectations, never the exported constants: these two strings are
  // the security-reviewed destinations a hostile or missing manifest must land
  // on, so a mutated fallback constant has to fail on its own text.
  expect(IOS_STORE_SEARCH_FALLBACK).toBe(
    'https://apps.apple.com/us/search?term=AI%20English%20Coach',
  );
  expect(ANDROID_PLAY_STORE_FALLBACK).toBe(
    'https://play.google.com/store/apps/details?id=com.aienglish.coach',
  );
  expect(clientUpgradeStoreUrl('ios', undefined)).toBe(
    'https://apps.apple.com/us/search?term=AI%20English%20Coach',
  );
  expect(clientUpgradeStoreUrl('android', undefined)).toBe(
    'https://play.google.com/store/apps/details?id=com.aienglish.coach',
  );
});

it('treats hostile manifest shapes as no configured store URLs', () => {
  // A build without an expoConfig manifest at all falls back instead of
  // dereferencing undefined.
  mockExpoConfig.value = undefined;
  expect(clientUpgradeStoreUrl('ios')).toBe(IOS_STORE_SEARCH_FALLBACK);

  // `null` extra passes a typeof-object check, so only the falsy guard can
  // reject it before the property read.
  mockExpoConfig.value = { extra: null };
  expect(clientUpgradeStoreUrl('android')).toBe(ANDROID_PLAY_STORE_FALLBACK);

  // A callable carrier is not a plain-object manifest, whatever it carries:
  // its cargo must be ignored, not opened.
  const manifestCarrier = Object.assign(() => undefined, {
    storeUrls: { ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890' },
  });
  mockExpoConfig.value = { extra: manifestCarrier };
  expect(clientUpgradeStoreUrl('ios')).toBe(IOS_STORE_SEARCH_FALLBACK);
});

it('validates the configured listing itself as hostile input', () => {
  // A null storeUrls value must fall back, not dereference null.
  expect(clientUpgradeStoreUrl('ios', null)).toBe(IOS_STORE_SEARCH_FALLBACK);

  // A callable storeUrls carrier is not a storeUrls record; its listing is
  // ignored even though property access would happily find it.
  const listingCarrier = Object.assign(() => undefined, {
    ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890',
  });
  expect(clientUpgradeStoreUrl('ios', listingCarrier)).toBe(IOS_STORE_SEARCH_FALLBACK);

  // Non-string listings never reach URL parsing.
  expect(clientUpgradeStoreUrl('ios', { ios: 42 })).toBe(IOS_STORE_SEARCH_FALLBACK);

  // Surrounding whitespace is trimmed from the accepted destination.
  expect(
    clientUpgradeStoreUrl('ios', {
      ios: '  https://apps.apple.com/us/app/ai-english-coach/id1234567890  ',
    }),
  ).toBe('https://apps.apple.com/us/app/ai-english-coach/id1234567890');

  // Plain HTTP is refused even on the genuine host.
  expect(
    clientUpgradeStoreUrl('ios', {
      ios: 'http://apps.apple.com/us/app/ai-english-coach/id1234567890',
    }),
  ).toBe(IOS_STORE_SEARCH_FALLBACK);

  // The product id must END the path: extra segments after it are refused.
  expect(
    clientUpgradeStoreUrl('ios', {
      ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890/extra',
    }),
  ).toBe(IOS_STORE_SEARCH_FALLBACK);

  // An Apple listing parked in the Android slot is not an Android listing.
  expect(
    clientUpgradeStoreUrl('android', {
      android: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890',
    }),
  ).toBe(ANDROID_PLAY_STORE_FALLBACK);
});

it('accepts only the exact Play Store details page for the Android listing', () => {
  // The host comparison runs on the URL-normalized (lowercased) hostname, so
  // mixed-case input resolves to its own trimmed spelling, not the fallback.
  expect(
    clientUpgradeStoreUrl('android', {
      android: 'https://Play.Google.Com/store/apps/details?id=com.aienglish.coach',
    }),
  ).toBe('https://Play.Google.Com/store/apps/details?id=com.aienglish.coach');

  // A look-alike host with the exact path and package is still refused.
  expect(
    clientUpgradeStoreUrl('android', {
      android: 'https://evil.test/store/apps/details?id=com.aienglish.coach',
    }),
  ).toBe(ANDROID_PLAY_STORE_FALLBACK);

  // The genuine host on any other details page is refused as well.
  expect(
    clientUpgradeStoreUrl('android', {
      android: 'https://play.google.com/store/apps/editorial?id=com.aienglish.coach',
    }),
  ).toBe(ANDROID_PLAY_STORE_FALLBACK);
});

it('latches a localized, non-dismissible modal without unmounting the active screen', async () => {
  const underlyingUnmounted = jest.fn();
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => undefined);
  function UnderlyingScreen() {
    useEffect(() => () => underlyingUnmounted(), []);
    return <Text testID="underlying-screen">active recording screen</Text>;
  }
  await render(
    <I18nProvider accountLanguage="hi">
      <UnderlyingScreen />
      <ClientUpgradeModal />
    </I18nProvider>,
  );
  expect(screen.queryByText(translateFor('hi', 'upgrade.title'))).toBeNull();

  await act(async () => latchClientUpgradeRequired());

  expect(screen.getByTestId('underlying-screen')).toBeTruthy();
  expect(underlyingUnmounted).not.toHaveBeenCalled();
  expect(screen.getByRole('header', { name: translateFor('hi', 'upgrade.title') })).toBeTruthy();
  expect(screen.getByText(translateFor('hi', 'upgrade.body'))).toBeTruthy();
  expect(screen.queryByText(translateFor('hi', 'common.cancel'))).toBeNull();
  expect(
    screen.container.queryAll((node) => node.props.accessibilityViewIsModal === true),
  ).toHaveLength(1);

  const modal = visibleModalNode();
  await act(async () => modal.props.onRequestClose());
  expect(announce).toHaveBeenCalledWith(translateFor('hi', 'upgrade.title'));
  expect(modal.props.visible).toBe(true);
  expect(screen.getByTestId('underlying-screen')).toBeTruthy();
  announce.mockRestore();
});

it('opens the validated platform store URL and blocks repeat taps while opening', async () => {
  const opening = deferred<void>();
  openUrlSpy.mockReturnValueOnce(opening.promise);
  const storeUrls = {
    ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890',
    android: ANDROID_PLAY_STORE_FALLBACK,
  };
  mockExpoConfig.value = { extra: { storeUrls } };
  await renderModal();
  await act(async () => latchClientUpgradeRequired());

  const button = screen.getByRole('button', { name: translateFor('en', 'upgrade.action') });
  expect(button.props.accessibilityHint).toBe(translateFor('en', 'upgrade.actionHint'));
  const onPress = committedPressHandler(button);
  await act(async () => {
    onPress();
    onPress();
    await Promise.resolve();
  });

  expect(openUrlSpy).toHaveBeenCalledTimes(1);
  expect(openUrlSpy).toHaveBeenCalledWith(clientUpgradeStoreUrl(Platform.OS, storeUrls));
  expect(
    screen.getByRole('button', { name: translateFor('en', 'upgrade.action') }).props
      .accessibilityState,
  ).toEqual({ disabled: true, busy: true });

  await act(async () => {
    opening.resolve();
    await opening.promise;
  });
  expect(
    screen.getByRole('button', { name: translateFor('en', 'upgrade.action') }).props
      .accessibilityState,
  ).toEqual({ disabled: false, busy: false });
});

it('offers local sign-out without dismissing the required-update state', async () => {
  const onLocalSignOut = jest.fn();
  await render(
    <I18nProvider accountLanguage="en">
      <ClientUpgradeModal onLocalSignOut={onLocalSignOut} />
    </I18nProvider>,
  );
  await act(async () => latchClientUpgradeRequired());

  await fireEvent.press(
    screen.getByRole('button', { name: translateFor('en', 'logout.thisDevice') }),
  );

  expect(onLocalSignOut).toHaveBeenCalledTimes(1);
  expect(visibleModalNode().props.visible).toBe(true);
});

it('awaits local sign-out, blocks repeat taps, and reports a localized failure', async () => {
  const signOut = deferred<void>();
  const onLocalSignOut = jest.fn(() => signOut.promise);
  await render(
    <I18nProvider accountLanguage="es">
      <ClientUpgradeModal onLocalSignOut={onLocalSignOut} />
    </I18nProvider>,
  );
  await act(async () => latchClientUpgradeRequired());

  const button = screen.getByRole('button', {
    name: translateFor('es', 'logout.thisDevice'),
  });
  const onPress = committedPressHandler(button);
  await act(async () => {
    onPress();
    onPress();
    await Promise.resolve();
  });

  expect(onLocalSignOut).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('button', { name: translateFor('es', 'logout.thisDevice') }).props
      .accessibilityState,
  ).toEqual({ disabled: true, busy: true });

  await act(async () => {
    signOut.resolve();
    await signOut.promise;
  });
  expect(
    screen.getByRole('button', { name: translateFor('es', 'logout.thisDevice') }).props
      .accessibilityState,
  ).toEqual({ disabled: false, busy: false });

  onLocalSignOut.mockRejectedValueOnce(new Error('secure token remains'));
  await fireEvent.press(
    screen.getByRole('button', { name: translateFor('es', 'logout.thisDevice') }),
  );

  const localFailure = await screen.findByRole('alert');
  expect(localFailure).toHaveTextContent(translateFor('es', 'error.internal'));
  // The retry explanation announces itself assertively, like the store error.
  expect(localFailure.props.accessibilityLiveRegion).toBe('assertive');
  expect(visibleModalNode().props.visible).toBe(true);
});

it('draws the scrim and the scheme-aware card shadow from the theme tokens', async () => {
  const view = await render(
    <I18nProvider accountLanguage="en">
      <ClientUpgradeModal />
    </I18nProvider>,
  );
  await act(async () => latchClientUpgradeRequired());

  // Assert-existence-first: reading the card off an empty query (a wiring
  // mutant that drops accessibilityViewIsModal) must fail on matcher evidence,
  // never crash a deref.
  const modalCard = () => {
    const [card] = screen.container.queryAll(
      (node) => node.props.accessibilityViewIsModal === true,
    );
    expect(card).toBeDefined();
    return card as TestInstance;
  };
  const backdrop = modalCard().parent;
  expect(backdrop).toBeDefined();
  expect(StyleSheet.flatten(backdrop!.props.style)).toMatchObject({
    backgroundColor: lightColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  });
  expect(StyleSheet.flatten(modalCard().props.style)).toMatchObject({
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    backgroundColor: lightColors.card,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  });

  // Dark keeps the stronger cast: black shadows vanish on the dark background
  // (the same reason the shared Button's filled key darkens its shadow).
  useColorScheme.mockReturnValue('dark');
  await act(async () => {
    await view.rerender(
      <I18nProvider accountLanguage="en">
        <ClientUpgradeModal />
      </I18nProvider>,
    );
  });
  expect(StyleSheet.flatten(modalCard().props.style)).toMatchObject({
    backgroundColor: darkColors.card,
    shadowOpacity: 0.55,
    elevation: 20,
  });
  useColorScheme.mockReturnValue('light');
});

it('keeps the modal latched and reports a localized store-opening failure', async () => {
  openUrlSpy.mockRejectedValueOnce(new Error('native store unavailable'));
  await renderModal('zh');
  await act(async () => latchClientUpgradeRequired());

  await fireEvent.press(screen.getByRole('button', { name: translateFor('zh', 'upgrade.action') }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(translateFor('zh', 'upgrade.openFailed'));
  expect(alert.props.accessibilityLiveRegion).toBe('assertive');
  // The failure note uses the shared error styling, not the body copy.
  expect(StyleSheet.flatten(alert.props.style)).toMatchObject({
    marginTop: spacing.ml,
    color: lightColors.danger,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: translateFor('zh', 'upgrade.action') }).props
        .accessibilityState,
    ).toEqual({ disabled: false, busy: false }),
  );
  expect(visibleModalNode().props.visible).toBe(true);
});

it('retires the stale store-opening failure when a retry succeeds', async () => {
  openUrlSpy.mockRejectedValueOnce(new Error('native store unavailable'));
  await renderModal();
  await act(async () => latchClientUpgradeRequired());

  const storeButton = () =>
    screen.getByRole('button', { name: translateFor('en', 'upgrade.action') });
  await fireEvent.press(storeButton());
  expect(await screen.findByRole('alert')).toHaveTextContent(
    translateFor('en', 'upgrade.openFailed'),
  );

  await fireEvent.press(storeButton());
  await waitFor(() => expect(openUrlSpy).toHaveBeenCalledTimes(2));
  // Each attempt starts from a clean slate: a successful retry must clear the
  // previous failure note instead of leaving a stale error on screen.
  expect(screen.queryByRole('alert')).toBeNull();
});

it('retires the stale local sign-out failure when a retry succeeds', async () => {
  const onLocalSignOut = jest.fn().mockRejectedValueOnce(new Error('secure token remains'));
  await render(
    <I18nProvider accountLanguage="en">
      <ClientUpgradeModal onLocalSignOut={onLocalSignOut} />
    </I18nProvider>,
  );
  await act(async () => latchClientUpgradeRequired());

  const signOutButton = () =>
    screen.getByRole('button', { name: translateFor('en', 'logout.thisDevice') });
  await fireEvent.press(signOutButton());
  const failure = await screen.findByRole('alert');
  expect(failure).toHaveTextContent(translateFor('en', 'error.internal'));
  // The local retry note shares the store failure's error styling.
  expect(StyleSheet.flatten(failure.props.style)).toMatchObject({
    marginTop: spacing.ml,
    color: lightColors.danger,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  });

  await fireEvent.press(signOutButton());
  await waitFor(() => expect(onLocalSignOut).toHaveBeenCalledTimes(2));
  // A later successful local sign-out retires the retry note entirely.
  expect(screen.queryByRole('alert')).toBeNull();
});

it('pins the overlay surface, scroll, typography, and action wiring', async () => {
  await render(
    <I18nProvider accountLanguage="en">
      <ClientUpgradeModal onLocalSignOut={jest.fn()} />
    </I18nProvider>,
  );
  await act(async () => latchClientUpgradeRequired());

  // The overlay fades in over the app without dimming the status bar.
  const modal = visibleModalNode();
  expect(modal.props.animationType).toBe('fade');
  expect(modal.props.presentationStyle).toBe('overFullScreen');
  expect(modal.props.statusBarTranslucent).toBe(true);
  expect(modal.props.transparent).toBe(true);

  // The card scrolls without bounce or scrollbar chrome and centers content.
  const [scroll] = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  expect(scroll).toBeDefined();
  expect(scroll!.props.bounces).toBe(false);
  expect(scroll!.props.showsVerticalScrollIndicator).toBe(false);
  expect(StyleSheet.flatten(scroll!.props.contentContainerStyle)).toEqual({
    padding: spacing.xl,
    alignItems: 'center',
  });

  const title = screen.getByRole('header', { name: translateFor('en', 'upgrade.title') });
  expect(StyleSheet.flatten(title.props.style)).toEqual({
    color: lightColors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  });
  const body = screen.getByText(translateFor('en', 'upgrade.body'));
  expect(StyleSheet.flatten(body.props.style)).toEqual({
    marginTop: spacing.md,
    color: lightColors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  });

  const store = buttonProps(translateFor('en', 'upgrade.action'));
  expect(store.fullWidth).toBe(true);
  expect(StyleSheet.flatten(store.style)).toEqual({ marginTop: spacing.xl });

  const signOut = buttonProps(translateFor('en', 'logout.thisDevice'));
  expect(signOut.fullWidth).toBe(true);
  expect(signOut.variant).toBe('secondary');
  expect(StyleSheet.flatten(signOut.style)).toEqual({ marginTop: spacing.md });
});
