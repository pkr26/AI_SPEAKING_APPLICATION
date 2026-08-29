import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import Button from '../src/components/Button';
import { translateFor } from '../src/lib/i18n';
import { colors, layout, radii, spacing } from '../src/lib/theme';

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

function button(name: string): TestInstance {
  return screen.getByRole('button', { name });
}

describe('shared Button', () => {
  it('renders the primary variant with brand fill, label ink, and press feedback', async () => {
    await render(<Button title="Continue" onPress={jest.fn()} />);

    expect(flattenedStyle(button('Continue'))).toMatchObject({
      backgroundColor: colors.primary,
      borderRadius: radii.button,
      minHeight: layout.minimumTarget,
      maxWidth: '100%',
      // Spinner and label sit on one row, gap apart, centred on both axes.
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    });
    expect(flattenedStyle(screen.getByText('Continue'))).toMatchObject({
      color: colors.onPrimary,
      fontSize: 17,
      fontWeight: '600',
      flexShrink: 1,
      // Labels stay centred when a caller stretches the button.
      textAlign: 'center',
    });

    await fireEvent(button('Continue'), 'responderGrant', responderEvent());
    expect(flattenedStyle(button('Continue'))).toMatchObject({
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.985 }],
    });
    await fireEvent(button('Continue'), 'responderTerminate', responderEvent());
    await waitFor(() =>
      expect(flattenedStyle(button('Continue')).backgroundColor).toBe(colors.primary),
    );
  });

  it('renders the secondary variant as an outline that tints when pressed', async () => {
    await render(<Button title="Play" variant="secondary" onPress={jest.fn()} />);

    expect(flattenedStyle(button('Play'))).toMatchObject({
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(button('Play')).backgroundColor).toBeUndefined();
    expect(flattenedStyle(screen.getByText('Play'))).toMatchObject({ color: colors.primary });

    await fireEvent(button('Play'), 'responderGrant', responderEvent());
    expect(flattenedStyle(button('Play'))).toMatchObject({
      backgroundColor: colors.primaryLight,
    });
    await fireEvent(button('Play'), 'responderTerminate', responderEvent());
  });

  it('renders the danger variant with danger fill and pressed dimming', async () => {
    await render(<Button title="Delete" variant="danger" onPress={jest.fn()} />);

    expect(flattenedStyle(button('Delete'))).toMatchObject({
      backgroundColor: colors.danger,
    });
    expect(flattenedStyle(button('Delete')).opacity).toBeUndefined();
    expect(flattenedStyle(screen.getByText('Delete'))).toMatchObject({ color: colors.onDanger });

    await fireEvent(button('Delete'), 'responderGrant', responderEvent());
    expect(flattenedStyle(button('Delete'))).toMatchObject({
      backgroundColor: colors.danger,
      opacity: 0.85,
    });
    await fireEvent(button('Delete'), 'responderTerminate', responderEvent());
    await waitFor(() => expect(flattenedStyle(button('Delete')).opacity).toBeUndefined());
  });

  it('renders the quiet variant without a fill and tints when pressed', async () => {
    await render(<Button title="Re-record" variant="quiet" onPress={jest.fn()} />);

    const resting = flattenedStyle(button('Re-record'));
    expect(resting.backgroundColor).toBeUndefined();
    expect(resting.borderWidth).toBeUndefined();
    expect(flattenedStyle(screen.getByText('Re-record'))).toMatchObject({ color: colors.primary });

    await fireEvent(button('Re-record'), 'responderGrant', responderEvent());
    expect(flattenedStyle(button('Re-record'))).toMatchObject({
      backgroundColor: colors.primaryLight,
    });
    await fireEvent(button('Re-record'), 'responderTerminate', responderEvent());
  });

  it('keeps the small size touch-safe with tighter padding and label', async () => {
    await render(<Button title="Save" size="sm" onPress={jest.fn()} />);

    expect(flattenedStyle(button('Save'))).toMatchObject({
      minHeight: layout.minimumTarget,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.ml,
    });
    expect(flattenedStyle(screen.getByText('Save'))).toMatchObject({ fontSize: 15 });
  });

  it('stretches across the parent only when fullWidth is set', async () => {
    await render(<Button title="Start" onPress={jest.fn()} />);
    expect(flattenedStyle(button('Start')).alignSelf).toBeUndefined();

    await render(<Button title="Wide" fullWidth onPress={jest.fn()} />);
    expect(flattenedStyle(button('Wide'))).toMatchObject({ alignSelf: 'stretch' });
  });

  it('lets long localized labels wrap without making the button wider than its parent', async () => {
    const localizedTitle = translateFor('te', 'recordings.checkPending');
    await render(<Button title={localizedTitle} onPress={jest.fn()} />);

    expect(flattenedStyle(button(localizedTitle))).toMatchObject({ maxWidth: '100%' });
    expect(flattenedStyle(screen.getByText(localizedTitle))).toMatchObject({
      flexShrink: 1,
      textAlign: 'center',
    });
  });

  it('merges caller layout style last', async () => {
    await render(<Button title="Spaced" onPress={jest.fn()} style={{ marginTop: spacing.lg }} />);
    expect(flattenedStyle(button('Spaced'))).toMatchObject({
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
    });
  });

  it('disables presses and dims at 0.5 opacity when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Submit" disabled onPress={onPress} />);

    expect(flattenedStyle(button('Submit'))).toMatchObject({ opacity: 0.5 });
    expect(button('Submit').props.accessibilityState).toEqual({ disabled: true, busy: false });
    await fireEvent.press(button('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a decorative spinner, reports busy, and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Signing in…" loading onPress={onPress} />);

    expect(button('Signing in…').props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
    expect(flattenedStyle(button('Signing in…'))).toMatchObject({ opacity: 0.5 });
    const spinner = screen.getByTestId('button-loading-indicator', {
      includeHiddenElements: true,
    });
    expect(spinner.props.accessibilityElementsHidden).toBe(true);
    expect(spinner.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(spinner.props.color).toBe(colors.onPrimary);
    await fireEvent.press(button('Signing in…'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('colors the loading spinner per variant', async () => {
    const spinner = () =>
      screen.getByTestId('button-loading-indicator', { includeHiddenElements: true });

    await render(<Button title="Deleting…" variant="danger" loading />);
    expect(spinner().props.color).toBe(colors.onDanger);

    await render(<Button title="Loading…" variant="secondary" loading />);
    expect(spinner().props.color).toBe(colors.primary);
  });

  it('exposes accessibility label, hint, and testID, and fires onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(
      <Button
        title="?"
        accessibilityLabel="Open help"
        accessibilityHint="Opens the help screen"
        testID="help-button"
        onPress={onPress}
      />,
    );

    const target = screen.getByLabelText('Open help');
    expect(target.props.accessibilityHint).toBe('Opens the help screen');
    expect(screen.getByTestId('help-button')).toBeTruthy();
    expect(target.props.accessibilityState).toEqual({ disabled: false, busy: false });
    await fireEvent.press(target);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
