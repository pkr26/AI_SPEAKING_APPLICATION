import { onlineManager } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { TestInstance } from 'test-renderer';

import NetworkStatusBanner from '../src/components/NetworkStatusBanner';
import { I18nProvider, translateFor } from '../src/lib/i18n';
import {
  getNetworkStatusSnapshot,
  NetworkStatusBridge,
  resetNetworkStatusModuleForTests,
} from '../src/lib/network-status';
import { darkColors } from '../src/lib/theme';

const asMock = (value: unknown) => value as jest.Mock;

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 20, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-network', () => ({
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    WIFI: 'WIFI',
  },
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => new Promise(() => undefined)),
}));

const addNetworkStateListener = jest.mocked(Network.addNetworkStateListener);
const getNetworkStateAsync = jest.mocked(Network.getNetworkStateAsync);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function listener(): (state: Network.NetworkState) => void {
  const registered = addNetworkStateListener.mock.calls.at(-1)?.[0];
  if (!registered) throw new Error('network listener was not registered');
  return registered;
}

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function statusDot(): TestInstance {
  const [dot] = screen.container.queryAll((node) => {
    const style = flattenedStyle(node);
    return style.width === 8 && style.height === 8 && style.borderRadius === 4;
  });
  if (!dot) throw new Error('network status dot was not rendered');
  return dot;
}

beforeEach(() => {
  cleanup();
  resetNetworkStatusModuleForTests();
  addNetworkStateListener.mockReset();
  addNetworkStateListener.mockImplementation(() => ({ remove: jest.fn() }));
  getNetworkStateAsync.mockReset();
  getNetworkStateAsync.mockImplementation(() => new Promise(() => undefined));
  asMock(useColorScheme).mockReset().mockReturnValue('light');
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  resetNetworkStatusModuleForTests();
});

it('subscribes before sampling, ignores a stale sample, and announces reconnect globally', async () => {
  jest.useFakeTimers();
  // The light palette intentionally uses white ink for both semantic fills;
  // dark mode distinguishes the warning and success dot/text branches.
  asMock(useColorScheme).mockReturnValue('dark');
  const initial = deferred<Network.NetworkState>();
  getNetworkStateAsync.mockReturnValue(initial.promise);

  const rendered = await render(
    <>
      <NetworkStatusBridge />
      <I18nProvider accountLanguage="es">
        <NetworkStatusBanner />
      </I18nProvider>
    </>,
  );

  await waitFor(() => expect(getNetworkStateAsync).toHaveBeenCalledTimes(1));
  expect(addNetworkStateListener.mock.invocationCallOrder[0]).toBeLessThan(
    getNetworkStateAsync.mock.invocationCallOrder[0],
  );
  const remove = addNetworkStateListener.mock.results[0]?.value.remove as jest.Mock;

  await act(async () => {
    listener()({ isConnected: true, isInternetReachable: false });
  });
  expect(onlineManager.isOnline()).toBe(false);
  const offlineMessage = translateFor('es', 'network.offline');
  expect(screen.getByRole('alert')).toHaveTextContent(offlineMessage);
  expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('assertive');
  expect(flattenedStyle(screen.getByRole('alert')).backgroundColor).toBe(darkColors.warning);
  expect(flattenedStyle(statusDot()).backgroundColor).toBe(darkColors.onWarning);
  expect(flattenedStyle(screen.getByText(offlineMessage)).color).toBe(darkColors.onWarning);

  await act(async () => {
    initial.resolve({ isConnected: true, isInternetReachable: true });
    await initial.promise;
  });
  expect(getNetworkStatusSnapshot().reachability).toBe('offline');

  await act(async () => {
    listener()({ isConnected: true, isInternetReachable: true });
  });
  expect(onlineManager.isOnline()).toBe(true);
  expect(getNetworkStatusSnapshot().reconnectCount).toBe(1);
  const onlineMessage = translateFor('es', 'network.backOnline');
  expect(screen.getByRole('alert')).toHaveTextContent(onlineMessage);
  expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('polite');
  expect(flattenedStyle(screen.getByRole('alert')).backgroundColor).toBe(darkColors.success);
  expect(flattenedStyle(statusDot()).backgroundColor).toBe(darkColors.onSuccess);
  expect(flattenedStyle(screen.getByText(onlineMessage)).color).toBe(darkColors.onSuccess);

  await act(async () => jest.advanceTimersByTime(4_000));
  expect(screen.queryByTestId('network-status-banner')).toBeNull();

  await rendered.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('uses explicit reachability first, falls back to connection state, and ignores unknown states', async () => {
  const initial = deferred<Network.NetworkState>();
  getNetworkStateAsync.mockReturnValue(initial.promise);
  const rendered = await render(<NetworkStatusBridge />);
  await waitFor(() => expect(addNetworkStateListener).toHaveBeenCalledTimes(1));

  const unknown = getNetworkStatusSnapshot();
  await act(async () => listener()({ type: Network.NetworkStateType.UNKNOWN }));
  expect(getNetworkStatusSnapshot()).toBe(unknown);

  await act(async () => listener()({ isConnected: true }));
  expect(getNetworkStatusSnapshot().reachability).toBe('online');
  const online = getNetworkStatusSnapshot();
  await act(async () => listener()({ isConnected: true }));
  expect(getNetworkStatusSnapshot()).toBe(online);

  await act(async () => listener()({ isConnected: true, isInternetReachable: false }));
  expect(getNetworkStatusSnapshot().reachability).toBe('offline');
  await act(async () => listener()({ isConnected: false, isInternetReachable: true }));
  expect(getNetworkStatusSnapshot().reachability).toBe('online');

  await rendered.unmount();
  await act(async () => {
    initial.resolve({ isConnected: false });
    await initial.promise;
  });
  expect(getNetworkStatusSnapshot().reachability).toBe('online');
});

it('falls back to the initial sample when listener registration throws', async () => {
  addNetworkStateListener.mockImplementationOnce(() => {
    throw new Error('native listener unavailable');
  });
  getNetworkStateAsync.mockResolvedValueOnce({
    type: Network.NetworkStateType.NONE,
    isInternetReachable: undefined,
  });

  await render(<NetworkStatusBridge />);

  await waitFor(() => expect(getNetworkStatusSnapshot().reachability).toBe('offline'));
  expect(onlineManager.isOnline()).toBe(false);
});

it('keeps the prior safe state when the initial native sample rejects', async () => {
  getNetworkStateAsync.mockRejectedValueOnce(new Error('native sample unavailable'));

  await render(<NetworkStatusBridge />);

  await waitFor(() => expect(getNetworkStateAsync).toHaveBeenCalledTimes(1));
  await act(async () => Promise.resolve());
  expect(getNetworkStatusSnapshot()).toEqual({ reachability: 'unknown', reconnectCount: 0 });
  expect(onlineManager.isOnline()).toBe(true);
});

it('contains synchronous sample and native cleanup failures during teardown', async () => {
  const remove = jest.fn(() => {
    throw new Error('native cleanup unavailable');
  });
  addNetworkStateListener.mockReturnValueOnce({ remove });
  getNetworkStateAsync.mockImplementationOnce(() => {
    throw new Error('native sample threw synchronously');
  });

  const rendered = await render(<NetworkStatusBridge />);

  expect(getNetworkStatusSnapshot().reachability).toBe('unknown');
  await expect(rendered.unmount()).resolves.toBeUndefined();
  expect(remove).toHaveBeenCalledTimes(1);
});
