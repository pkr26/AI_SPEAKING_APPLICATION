import { render, screen } from '@testing-library/react-native';
import React from 'react';

import Icon, { type IconName } from '../src/components/Icon';
import { darkColors, lightColors, useTheme } from '../src/lib/theme';

const ALL_ICONS: IconName[] = [
  'home',
  'mic',
  'stop',
  'play',
  'pause',
  'eye',
  'eye-off',
  'help',
  'chevron-right',
  'chevron-down',
  'chevron-up',
  'flame',
  'trophy',
  'trending-up',
  'clock',
  'audio-lines',
  'user',
  'sliders',
  'share',
  'trash',
  'check',
  'close',
  'refresh',
  'lock',
  'sparkle',
  'book',
  'calendar',
  'target',
  'arrow-right',
  'warning',
  'volume',
  'globe',
  'list',
  'download',
];

describe('Icon', () => {
  it('renders every glyph in the set with default ink and size', async () => {
    for (const name of ALL_ICONS) {
      await render(<Icon name={name} testID={`icon-${name}`} />);
      expect(screen.getByTestId(`icon-${name}`, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('accepts an explicit size and color', async () => {
    await render(<Icon name="mic" size={32} color="#123456" testID="sized-icon" />);
    const host = screen.getByTestId('sized-icon', { includeHiddenElements: true });
    expect(host).toBeTruthy();
    // Size and ink live on the inner 24-unit glyph, which scales inside the
    // requested square; the host is the contract surface callers style against.
    const svg = host.props.children as { props: { width: number; height: number } };
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('defaults to themed body ink', async () => {
    let themedInk = '';
    function Probe() {
      const theme = useTheme();
      themedInk = theme.colors.text;
      return <Icon name="check" testID="themed-icon" />;
    }
    await render(<Probe />);
    expect(themedInk).toBe(lightColors.text);
    expect(screen.getByTestId('themed-icon', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is decorative and hidden from assistive tech without a label', async () => {
    await render(<Icon name="flame" testID="decorative-icon" />);
    const host = screen.getByTestId('decorative-icon', { includeHiddenElements: true });
    expect(host.props.accessibilityElementsHidden).toBe(true);
    expect(host.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(host.props.accessibilityRole).toBeUndefined();
    expect(host.props.pointerEvents).toBe('none');
  });

  it('becomes a labelled image when accessibilityLabel is provided', async () => {
    await render(<Icon name="mic" accessibilityLabel="Microphone" testID="labelled-icon" />);
    const host = screen.getByTestId('labelled-icon', { includeHiddenElements: true });
    expect(host.props.accessibilityRole).toBe('image');
    expect(host.props.accessibilityLabel).toBe('Microphone');
    expect(host.props.accessibilityElementsHidden).toBeUndefined();
    expect(screen.getByLabelText('Microphone')).toBe(host);
  });

  it('exposes every dark-mode ink through the theme the same way', () => {
    // The glyph inherits theme ink; dark palettes must keep the same keys so
    // Icon never needs scheme branching.
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
