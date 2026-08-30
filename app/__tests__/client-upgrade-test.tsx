import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { AccessibilityInfo, Linking, Platform, Text } from 'react-native';
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

const mockExpoExtra: { value: unknown } = { value: undefined };

jest.mock('expo-constants', () => ({
  get expoConfig() {
    return { extra: mockExpoExtra.value };
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
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => void;
    }
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
}

let openUrlSpy: jest.SpiedFunction<typeof Linking.openURL>;

beforeEach(() => {
  cleanup();
  resetClientUpgradeModuleForTests();
  mockExpoExtra.value = undefined;
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
  mockExpoExtra.value = {
    storeUrls: {
      ios: 'https://apps.apple.com/us/app/ai-english-coach/id1234567890',
      android: ANDROID_PLAY_STORE_FALLBACK,
    },
  };
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
  expect(openUrlSpy).toHaveBeenCalledWith(
    clientUpgradeStoreUrl(Platform.OS, (mockExpoExtra.value as { storeUrls: unknown }).storeUrls),
  );
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

it('keeps the modal latched and reports a localized store-opening failure', async () => {
  openUrlSpy.mockRejectedValueOnce(new Error('native store unavailable'));
  await renderModal('zh');
  await act(async () => latchClientUpgradeRequired());

  await fireEvent.press(screen.getByRole('button', { name: translateFor('zh', 'upgrade.action') }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(translateFor('zh', 'upgrade.openFailed'));
  expect(alert.props.accessibilityLiveRegion).toBe('assertive');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: translateFor('zh', 'upgrade.action') }).props
        .accessibilityState,
    ).toEqual({ disabled: false, busy: false }),
  );
  expect(visibleModalNode().props.visible).toBe(true);
});
