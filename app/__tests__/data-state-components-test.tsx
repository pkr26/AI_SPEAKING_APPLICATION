import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import DataRefreshNotice from '../src/components/DataRefreshNotice';
import OfflineState from '../src/components/OfflineState';
import { I18nProvider, translateFor } from '../src/lib/i18n';
import { lightColors, radii, spacing } from '../src/lib/theme';

function localized(children: React.ReactNode, language: 'en' | 'te' = 'en') {
  return render(<I18nProvider accountLanguage={language}>{children}</I18nProvider>);
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

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

describe('shared data states', () => {
  it('renders a localized semantic offline state without a dead retry action', async () => {
    await localized(<OfflineState />, 'te');

    const title = screen.getByRole('header', { name: translateFor('te', 'network.offlineTitle') });
    expect(title).toBeTruthy();
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      color: lightColors.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    });
    const body = screen.getByText(translateFor('te', 'network.offlineBody'));
    expect(body.props.accessibilityLiveRegion).toBe('polite');
    expect(StyleSheet.flatten(body.props.style)).toMatchObject({
      marginTop: spacing.sm,
      color: lightColors.muted,
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
    });
    // The centered block keeps its reserved height even before copy loads.
    expect(flattenedStyle(title.parent!)).toMatchObject({
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('accepts caller-supplied title and body copy for the entry gate', async () => {
    await localized(<OfflineState title="Gate title" body="Gate body" />);

    const title = screen.getByRole('header', { name: 'Gate title' });
    expect(title).toBeTruthy();
    const body = screen.getByText('Gate body');
    // A11y semantics stay unchanged with custom copy.
    expect(body.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText(translateFor('en', 'network.offlineTitle'))).toBeNull();
    expect(screen.queryByText(translateFor('en', 'network.offlineBody'))).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('announces a background update without showing Retry', async () => {
    await localized(<DataRefreshNotice updating failed={false} onRetry={jest.fn()} />);

    const updating = screen.getByText(translateFor('en', 'refresh.updating'));
    expect(updating.props.accessibilityLiveRegion).toBe('polite');
    expect(updating.props.accessibilityRole).toBeUndefined();
    // The in-progress note keeps the primary information tint.
    expect(StyleSheet.flatten(updating.props.style)).toMatchObject({
      color: lightColors.primary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(flattenedStyle(updating.parent!)).toMatchObject({
      borderWidth: 1,
      borderColor: lightColors.primary,
      borderRadius: radii.input,
      backgroundColor: lightColors.primaryLight,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps cached content in place and exposes a working refresh retry', async () => {
    const onRetry = jest.fn();
    await localized(<DataRefreshNotice updating={false} failed onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(translateFor('en', 'refresh.failedUsingSaved'));
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    // The failed note swaps the information tint for the warning treatment.
    expect(StyleSheet.flatten(alert.props.style)).toMatchObject({
      color: lightColors.warning,
      fontSize: 14,
      lineHeight: 20,
    });
    expect(flattenedStyle(alert.parent!)).toMatchObject({
      borderWidth: 1,
      borderColor: lightColors.warning,
      borderRadius: radii.input,
      backgroundColor: lightColors.card,
      marginBottom: spacing.md,
    });
    // The inline retry is the quiet, small variant of the shared button.
    const retry = buttonProps(translateFor('en', 'common.tryAgain'));
    expect(retry.variant).toBe('quiet');
    expect(retry.size).toBe('sm');
    await fireEvent.press(
      screen.getByRole('button', { name: translateFor('en', 'common.tryAgain') }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when loaded data is current', async () => {
    const view = await localized(
      <DataRefreshNotice updating={false} failed={false} onRetry={jest.fn()} />,
    );
    expect(view.toJSON()).toBeNull();
  });
});
