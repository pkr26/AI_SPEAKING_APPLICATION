import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { AccessibilityInfo, Animated, RefreshControl, StyleSheet } from 'react-native';
import React from 'react';

import Button from '../src/components/Button';
import Confetti from '../src/components/Confetti';
import EmptyState from '../src/components/EmptyState';
import PasswordStrengthMeter, { passwordStrength } from '../src/components/PasswordStrengthMeter';
import PasswordVisibilityToggle from '../src/components/PasswordVisibilityToggle';
import ProgressBar from '../src/components/ProgressBar';
import ScoreRing from '../src/components/ScoreRing';
import Skeleton from '../src/components/Skeleton';
import StatTile from '../src/components/StatTile';
import { darkColors, layout, lightColors, useTheme } from '../src/lib/theme';
import { useReduceMotion } from '../src/lib/use-reduce-motion';
import WordTaggedTranscript from '../src/components/WordTaggedTranscript';

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

// Controllable scheme so the fair-chip dark palette branch is assertable.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light' as const),
}));
const useColorScheme = jest.requireMock('react-native/Libraries/Utilities/useColorScheme')
  .default as jest.Mock;

const mockUseColorScheme = useColorScheme as jest.Mock;
const lightTheme = async () => (await renderHook(() => useTheme())).result.current;

/** Minimal typed view of an RNTL test node's rendered children. */
function childProps(node: { children: unknown[] }, index = 0): Record<string, unknown> {
  return (node.children[index] as { props: Record<string, unknown> }).props;
}
function childAt(
  node: { children: unknown[] },
  index = 0,
): { props: Record<string, unknown>; children: unknown[] } {
  return node.children[index] as { props: Record<string, unknown>; children: unknown[] };
}

/** Authored SVG primitives of an Icon host's Svg element (fragment unwrapped). */
function svgPrimitives(
  svg: React.ReactElement<{ children?: unknown }>,
): React.ReactElement<{ [prop: string]: unknown }>[] {
  const rendered: unknown = svg.props.children;
  if (rendered === undefined || rendered === null) return [];
  const children =
    React.isValidElement(rendered) && rendered.type === React.Fragment
      ? (rendered.props as { children?: unknown }).children
      : rendered;
  if (children === undefined || children === null) return [];
  return (Array.isArray(children) ? children : [children]) as React.ReactElement<{
    [prop: string]: unknown;
  }>[];
}

// Animation-config spies: components must call the Animated factory API with
// the authored toValue/duration/easing/useNativeDriver contracts.
const timingSpy = jest.spyOn(Animated, 'timing');
const loopSpy = jest.spyOn(Animated, 'loop');
const sequenceSpy = jest.spyOn(Animated, 'sequence');
const parallelSpy = jest.spyOn(Animated, 'parallel');
const delaySpy = jest.spyOn(Animated, 'delay');
const interpolateSpy = jest.spyOn(Animated.Value.prototype, 'interpolate');

afterEach(() => {
  timingSpy.mockClear();
  loopSpy.mockClear();
  sequenceSpy.mockClear();
  parallelSpy.mockClear();
  delaySpy.mockClear();
  interpolateSpy.mockClear();
  mockUseColorScheme.mockReturnValue('light');
});

describe('ScoreRing', () => {
  it('renders the clamped numeral, caption, and progressbar semantics', async () => {
    await render(
      <ScoreRing score={182} label="out of 100" accessibilityLabel="Score 82 out of 100" />,
    );

    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('out of 100')).toBeTruthy();
    const ring = screen.getByRole('progressbar', { name: 'Score 82 out of 100' });
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('clamps negative scores to zero', async () => {
    await render(<ScoreRing score={-12} accessibilityLabel="Score" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders a non-finite score as zero, mirroring ProgressBar', async () => {
    await render(<ScoreRing score={Number.NaN} accessibilityLabel="Score" />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Score' }).props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
    });
  });

  it('renders the arc at its final position immediately under Reduce Motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    await render(<ScoreRing score={70} accessibilityLabel="Score" testID="ring" />);
    expect(screen.getByText('70')).toBeTruthy();
  });

  it('uses the supplied band color for the numeral ink', async () => {
    await render(<ScoreRing score={50} color="#123456" accessibilityLabel="Score" />);
    expect(screen.getByText('50').props.style).toMatchObject({ color: '#123456' });
  });
});

describe('Confetti', () => {
  it('renders the requested deterministic burst pieces', async () => {
    await render(<Confetti count={10} testID="confetti" />);
    expect(screen.getAllByTestId('confetti-piece', { includeHiddenElements: true })).toHaveLength(
      10,
    );
  });

  it('clamps an absurd piece count to the fixed ceiling', async () => {
    await render(<Confetti count={5_000} testID="confetti" />);
    expect(screen.getAllByTestId('confetti-piece', { includeHiddenElements: true })).toHaveLength(
      80,
    );
  });

  it('skips the burst entirely under Reduce Motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { toJSON } = await render(<Confetti testID="confetti" />);
    expect(toJSON()).toBeNull();
  });
});

describe('useReduceMotion', () => {
  it('tracks a live Reduce Motion change and unmounts cleanly', async () => {
    let reduceMotionChanged: ((enabled: boolean) => void) | undefined;
    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementationOnce(
      (_event: string, handler: (enabled: boolean) => void) => {
        reduceMotionChanged = handler;
        return { remove: jest.fn() } as never;
      },
    );
    const { result, unmount } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);

    await act(async () => {
      reduceMotionChanged?.(true);
    });
    expect(result.current).toBe(true);

    unmount();
  });

  it('fails closed to motion-enabled when the native probe rejects', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValueOnce(
      new Error('native bridge unavailable'),
    );
    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });
});

describe('ProgressBar', () => {
  it('exposes progressbar semantics with the clamped percent', async () => {
    await render(<ProgressBar progress={0.42} accessibilityLabel="Test progress" testID="bar" />);

    const bar = screen.getByRole('progressbar', { name: 'Test progress' });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('skips the fill animation under Reduce Motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { toJSON } = await render(
      <ProgressBar progress={0.8} accessibilityLabel="Progress" testID="bar" />,
    );
    expect(toJSON()).not.toBeNull();
    const bar = screen.getByRole('progressbar', { name: 'Progress' });
    // Assert the whole value object: reading `.now` off a removed value would
    // crash the test instead of failing on matcher evidence.
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 80 });
  });

  it('clamps non-finite and out-of-range progress', async () => {
    await render(<ProgressBar progress={Number.NaN} accessibilityLabel="Progress" />);
    expect(screen.getByRole('progressbar', { name: 'Progress' }).props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
    });
  });

  it('exposes count semantics instead of a percent when counts are supplied', async () => {
    await render(
      <ProgressBar
        progress={0.3}
        accessibilityLabel="Words mastered"
        accessibilityCount={{ min: 0, max: 40, now: 12 }}
      />,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Words mastered' }).props.accessibilityValue,
    ).toEqual({ min: 0, max: 40, now: 12 });
  });
});

describe('StatTile', () => {
  it('renders icon badge, value, and label', async () => {
    await render(<StatTile icon="flame" value="7" label="Day streak" tint="accent" />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Day streak')).toBeTruthy();
  });

  it('keeps the caption on the contrast-verified on-tint ink', async () => {
    await render(<StatTile icon="target" value="B1" label="Current level" tint="primary" />);
    // The label sits on the primaryLight tint fill, where plain muted ink
    // misses 4.5:1 in light mode (4.32) — the on-tint token is pinned here.
    expect(StyleSheet.flatten(screen.getByText('Current level').props.style).color).toBe(
      lightColors.mutedTint,
    );
  });
});

describe('WordTaggedTranscript', () => {
  const TAGS = [
    { word: 'I', status: 'good' as const },
    { word: 'showed', status: 'good' as const },
    { word: 'brung', status: 'poor' as const },
    { word: 'courage', status: 'fair' as const },
  ];

  it('renders the plain transcript verbatim when no tags are provided', async () => {
    await render(
      <WordTaggedTranscript transcript="I showed courage." accessibilityLanguage="en-US" />,
    );
    expect(screen.getByText('I showed courage.')).toBeTruthy();
    // The fallback text itself carries the spoken content's language tag so a
    // screen reader pronounces the untagged transcript with the right voice.
    expect(screen.getByText('I showed courage.').props.accessibilityLanguage).toBe('en-US');
    expect(screen.queryByTestId('word-chip-row')).toBeNull();
  });

  it('wraps the fallback in typographic quotes only when asked', async () => {
    await render(<WordTaggedTranscript transcript="I tried." quoted />);
    expect(screen.getByText('“I tried.”')).toBeTruthy();
  });

  it('renders one tinted chip per tagged word with the localized legend', async () => {
    await render(
      <WordTaggedTranscript transcript="I brung courage." wordScores={TAGS} testID="tagged" />,
    );
    expect(screen.getByText('brung')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    // The legend is decorative (the chips carry the words), so it hides from
    // default queries exactly like the other celebration marks.
    const hidden = { includeHiddenElements: true } as const;
    expect(screen.getByText('Good', hidden)).toBeTruthy();
    expect(screen.getByText('Close', hidden)).toBeTruthy();
    expect(screen.getByText('Practice', hidden)).toBeTruthy();
    // The plain merged transcript never renders beside the chips.
    expect(screen.queryByText('I brung courage.')).toBeNull();
  });

  it('names each chip with its word and localized status for screen readers', async () => {
    await render(<WordTaggedTranscript transcript="I brung courage." wordScores={TAGS} />);
    // Status is not color-only for assistive tech: the legend is hidden, so
    // the chip's own accessible name carries the verdict. Each chip View is
    // itself the focusable element carrying that merged name.
    const chip = screen.getByLabelText('I, Good');
    expect(chip.props.accessible).toBe(true);
    expect(screen.getByLabelText('brung, Practice')).toBeTruthy();
    expect(screen.getByLabelText('courage, Close')).toBeTruthy();
  });

  it('pairs hue with a non-color cue: check glyphs on good, dashed underline on poor', async () => {
    await render(<WordTaggedTranscript transcript="I brung courage." wordScores={TAGS} />);
    const hidden = { includeHiddenElements: true } as const;
    // Exactly the good chips carry the check glyph.
    expect(screen.getAllByTestId('word-tag-check', hidden)).toHaveLength(2);
    // The poor word wears a dashed underline; the good word does not.
    expect(StyleSheet.flatten(screen.getByText('brung').props.style)).toMatchObject({
      textDecorationLine: 'underline',
      textDecorationStyle: 'dashed',
    });
    expect(StyleSheet.flatten(screen.getByText('showed').props.style)).not.toMatchObject({
      textDecorationLine: 'underline',
    });
  });
});

describe('PasswordStrengthMeter', () => {
  it('tiers candidates against the server policy and beyond it', () => {
    expect(passwordStrength('')).toBe('empty');
    // Everything the server would reject is weak.
    expect(passwordStrength('short1')).toBe('weak');
    expect(passwordStrength('allletters')).toBe('weak');
    expect(passwordStrength('12345678')).toBe('weak');
    // Policy-satisfying passwords are fair.
    expect(passwordStrength('password1')).toBe('fair');
    // Length plus variety earns strong.
    expect(passwordStrength('Str0ng!Phrase')).toBe('strong');
  });

  it('rates Unicode-letter passwords against the same letter rule as the server policy', () => {
    // The policy's letter class is \p{L}, not [a-zA-Z]: Telugu, Hindi, and
    // Cyrillic letters with a digit satisfy it and must rate fairly instead
    // of being mislabeled "Weak" beside a working submit.
    expect(passwordStrength('తెలుగు123')).toBe('fair');
    expect(passwordStrength('पासवर्ड123')).toBe('fair');
    expect(passwordStrength('пароль123')).toBe('fair');
    // A Unicode password the policy WOULD reject (no digit) stays weak.
    expect(passwordStrength('తెలుగుమాట')).toBe('weak');
  });

  it('renders nothing for an empty candidate', async () => {
    const { toJSON } = await render(<PasswordStrengthMeter password="" />);
    expect(toJSON()).toBeNull();
  });

  it('hides beside a candidate the field already rejects as too long', async () => {
    // Past the 72-UTF-8-byte bcrypt ceiling the adjacent "too long" error is
    // the only useful feedback — a tier label beside it would contradict it.
    const { toJSON } = await render(<PasswordStrengthMeter password={`${'pass'.repeat(19)}1`} />);
    expect(toJSON()).toBeNull();
  });

  it('fills one danger segment with the weak label', async () => {
    await render(<PasswordStrengthMeter password="short" testID="meter" />);
    expect(screen.getByLabelText('Weak')).toBeTruthy();
    expect(screen.getByTestId('meter-segment-on')).toBeTruthy();
    expect(screen.getAllByTestId('meter-segment-off')).toHaveLength(2);
  });

  it('fills all three success segments for a strong candidate', async () => {
    await render(<PasswordStrengthMeter password="Str0ng!Phrase" testID="meter" />);
    expect(screen.getByLabelText('Strong')).toBeTruthy();
    expect(screen.getAllByTestId('meter-segment-on')).toHaveLength(3);
    expect(screen.queryByTestId('meter-segment-off')).toBeNull();
  });

  it('announces tier changes politely while typing', async () => {
    await render(<PasswordStrengthMeter password="short" />);
    expect(screen.getByLabelText('Weak').props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('PasswordVisibilityToggle', () => {
  it('flips its glyph testID with the visible state and stays labelled', async () => {
    const onToggle = jest.fn();
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show password"
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.props.testID).toBe('password-toggle-show');
    await fireEvent.press(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reports the revealed glyph and honours a custom testID', async () => {
    await render(
      <PasswordVisibilityToggle
        visible
        accessibilityLabel="Hide password"
        onToggle={jest.fn()}
        testID="reveal"
      />,
    );
    expect(screen.getByTestId('reveal').props.testID).toBe('reveal');
  });

  it('blocks presses and dims while disabled', async () => {
    const onToggle = jest.fn();
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show password"
        onToggle={onToggle}
        disabled
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.props.accessibilityState).toEqual({ disabled: true });
    expect(StyleSheet.flatten(toggle.props.style)).toMatchObject({
      opacity: 0.5,
    });
    await fireEvent.press(toggle);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('renders mark, title, body, and the single action', async () => {
    const onPractice = jest.fn();
    await render(
      <EmptyState
        icon="clock"
        title="No answers yet"
        body="Your practice history will appear here."
        action={<Button title="Start Practice" onPress={onPractice} />}
      />,
    );

    expect(screen.getByRole('header', { name: 'No answers yet' })).toBeTruthy();
    expect(screen.getByText('Your practice history will appear here.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start Practice' }));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  it('renders without an action', async () => {
    await render(<EmptyState icon="mic" title="Empty" body="Nothing here." />);
    expect(screen.queryByRole('button')).toBeNull();
    await waitFor(() => expect(screen.getByText('Nothing here.')).toBeTruthy());
  });
});

describe('Skeleton', () => {
  it('renders one hidden placeholder block with the requested geometry', async () => {
    await render(<Skeleton width={120} height={20} borderRadius={6} testID="skel" />);
    const block = screen.getByTestId('skel', { includeHiddenElements: true });
    expect(block.props.accessibilityElementsHidden).toBe(true);
    expect(block.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(StyleSheet.flatten(block.props.style)).toMatchObject({
      width: 120,
      height: 20,
      borderRadius: 6,
      backgroundColor: lightColors.border,
    });
  });

  it('defaults to a full-width 16dp block with an 8dp radius', async () => {
    await render(<Skeleton testID="skel-default" />);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('skel-default', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({
      width: '100%',
      height: 16,
      borderRadius: 8,
    });
  });

  it('pulses between 0.45 and 1 through a looping two-phase timing', async () => {
    const theme = await await lightTheme();
    await render(<Skeleton testID="skel-pulse" />);
    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(sequenceSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledTimes(2);
    expect(timingSpy).toHaveBeenNthCalledWith(1, expect.anything(), {
      toValue: 1,
      duration: theme.motion.base,
      useNativeDriver: false,
    });
    expect(timingSpy).toHaveBeenNthCalledWith(2, expect.anything(), {
      toValue: 0.45,
      duration: theme.motion.base,
      useNativeDriver: false,
    });
  });

  it('stops pulsing as soon as Reduce Motion resolves', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    await render(<Skeleton testID="skel-static" />);
    await act(async () => {});
    // Exactly the pre-probe loop ran; the flip must not schedule another.
    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledTimes(2);
  });
});

describe('StatTile tints', () => {
  const TINT_MATRIX = [
    { tint: 'primary', fill: lightColors.primaryLight, ink: lightColors.primary },
    { tint: 'accent', fill: lightColors.accentLight, ink: lightColors.accent },
    { tint: 'success', fill: lightColors.successLight, ink: lightColors.success },
    { tint: 'neutral', fill: lightColors.card, ink: lightColors.muted },
  ] as const;

  it.each(TINT_MATRIX)(
    'styles the $tint tile with its tint fill and ink',
    async ({ tint, fill, ink }) => {
      const theme = await lightTheme();
      await render(
        <StatTile icon="flame" value="7" label="Streak" tint={tint} testID={`tile-${tint}`} />,
      );
      const tile = screen.getByTestId(`tile-${tint}`);
      expect(StyleSheet.flatten(tile.props.style)).toMatchObject({
        backgroundColor: fill,
        borderColor: tint === 'neutral' ? lightColors.border : 'transparent',
        borderWidth: 1,
        borderRadius: theme.radii.card,
        alignItems: 'center',
      });
      // The icon badge keeps the card fill and hairline border on every tint.
      const badge = childAt(tile);
      expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: lightColors.card,
        borderColor: lightColors.border,
        borderWidth: 1,
      });
      // The glyph inside the badge carries the tint ink and badge geometry.
      const iconElement = badge.props.children as React.ReactElement<{
        color?: string;
        strokeWidth?: number;
        size?: number;
      }>;
      expect(iconElement.props.color).toBe(ink);
      expect(iconElement.props.size).toBe(18);
      expect(iconElement.props.strokeWidth).toBe(2.2);
      // The numeral uses the headline type register with tabular figures.
      expect(StyleSheet.flatten(within(tile).getByText('7').props.style)).toMatchObject({
        color: lightColors.text,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
      });
    },
  );

  it('defaults to the neutral tint', async () => {
    await render(<StatTile icon="clock" value="0" label="Minutes" testID="tile-default" />);
    expect(StyleSheet.flatten(screen.getByTestId('tile-default').props.style)).toMatchObject({
      backgroundColor: lightColors.card,
      borderColor: lightColors.border,
    });
  });
});

describe('Confetti choreography', () => {
  it('staggers each piece by its deterministic delay and duration', async () => {
    const theme = await await lightTheme();
    await render(<Confetti count={3} testID="burst" />);
    expect(delaySpy).toHaveBeenCalledTimes(3);
    expect(delaySpy).toHaveBeenNthCalledWith(1, 0);
    expect(delaySpy).toHaveBeenNthCalledWith(2, 37);
    expect(delaySpy).toHaveBeenNthCalledWith(3, 74);
    expect(timingSpy).toHaveBeenCalledTimes(3);
    expect(timingSpy).toHaveBeenNthCalledWith(1, expect.anything(), {
      toValue: 1,
      duration: theme.motion.slow * 4,
      easing: theme.motion.easing.accelerate,
      useNativeDriver: false,
    });
    expect(timingSpy).toHaveBeenNthCalledWith(2, expect.anything(), {
      toValue: 1,
      duration: theme.motion.slow * 4 + 53,
      easing: theme.motion.easing.accelerate,
      useNativeDriver: false,
    });
    expect(timingSpy).toHaveBeenNthCalledWith(3, expect.anything(), {
      toValue: 1,
      duration: theme.motion.slow * 4 + 106,
      easing: theme.motion.easing.accelerate,
      useNativeDriver: false,
    });
  });

  it('places and sizes every piece deterministically from its index', async () => {
    await render(<Confetti count={3} testID="place" />);
    const pieces = screen.getAllByTestId('place-piece', { includeHiddenElements: true });
    const palette = [
      lightColors.primary,
      lightColors.accent,
      lightColors.success,
      lightColors.primaryDark,
    ];
    const expected = [
      { left: '0%', size: 7, color: palette[0] },
      { left: '41%', size: 7 + 1, color: palette[1] },
      { left: '82%', size: 7 + 2, color: palette[2] },
    ];
    pieces.forEach((piece, index) => {
      expect(StyleSheet.flatten(piece.props.style)).toMatchObject({
        position: 'absolute',
        left: expected[index].left,
        top: 0,
        width: expected[index].size,
        height: expected[index].size + 4,
        borderRadius: 2,
        backgroundColor: expected[index].color,
      });
    });
    // Fall + spin interpolations span the authored ranges.
    expect(interpolateSpy).toHaveBeenCalledWith({
      inputRange: [0, 1],
      outputRange: [-16, 420],
    });
    expect(interpolateSpy).toHaveBeenCalledWith({
      inputRange: [0, 1],
      outputRange: ['0deg', '240deg'],
    });
  });

  it('schedules exactly one pre-probe timeline under Reduce Motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    await render(<Confetti testID="still" />);
    await act(async () => {});
    // Default burst of 26 pieces: the pre-probe timeline (26 piece-level
    // parallels inside one top-level parallel) and no second schedule.
    expect(parallelSpy).toHaveBeenCalledTimes(27);
    expect(timingSpy).toHaveBeenCalledTimes(26);
    expect(delaySpy).toHaveBeenCalledTimes(26);
  });
});

describe('ProgressBar styling', () => {
  it('draws the hairline track at the requested height with a pill radius', async () => {
    await render(<ProgressBar progress={0.5} accessibilityLabel="P" height={12} testID="bar12" />);
    expect(StyleSheet.flatten(screen.getByTestId('bar12').props.style)).toMatchObject({
      overflow: 'hidden',
      alignSelf: 'stretch',
      height: 12,
      backgroundColor: lightColors.border,
      borderRadius: 6,
    });
    const fill = screen.getByTestId('bar12-fill');
    expect(StyleSheet.flatten(fill.props.style)).toMatchObject({
      height: '100%',
      borderRadius: 6,
      backgroundColor: lightColors.success,
    });
  });

  it('honours a custom fill ink and the default 8dp height', async () => {
    await render(
      <ProgressBar progress={0.2} accessibilityLabel="P" fill="#abcdef" testID="bar-fill" />,
    );
    expect(StyleSheet.flatten(screen.getByTestId('bar-fill').props.style)).toMatchObject({
      height: 8,
      borderRadius: 4,
    });
    expect(StyleSheet.flatten(screen.getByTestId('bar-fill-fill').props.style)).toMatchObject({
      backgroundColor: '#abcdef',
      borderRadius: 4,
    });
  });

  it('animates the fill to the clamped fraction with the base motion token', async () => {
    const theme = await await lightTheme();
    await render(<ProgressBar progress={0.42} accessibilityLabel="P" />);
    expect(timingSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0.42,
        duration: theme.motion.base,
        easing: theme.motion.easing.decelerate,
        useNativeDriver: false,
      }),
    );
    // The fill width is the animated 0–100% interpolation.
    expect(interpolateSpy).toHaveBeenCalledWith({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
  });

  it('settles statically on the clamped value under Reduce Motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    await render(<ProgressBar progress={0.8} accessibilityLabel="P" />);
    // The single timing call belongs to the pre-probe render; after the probe
    // resolves, the effect re-runs and sets the value instead of animating, so
    // no second timing is ever scheduled.
    await act(async () => {});
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreRing geometry', () => {
  it('derives the ring radius, circumference, and dash arc from size and thickness', async () => {
    await render(<ScoreRing score={50} size={100} thickness={10} accessibilityLabel="S" />);
    const radius = (100 - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const host = screen.getByRole('progressbar', { name: 'S' });
    expect(StyleSheet.flatten(host.props.style)).toMatchObject({
      width: 100,
      height: 100,
      alignItems: 'center',
    });
    const ringBox = host.props.children[0];
    const svg = ringBox.props.children[0];
    const [track, arc] = svg.props.children as React.ReactElement<{ [k: string]: unknown }>[];
    expect(track.props).toMatchObject({
      cx: 50,
      cy: 50,
      r: radius,
      stroke: lightColors.border,
      strokeWidth: 10,
      fill: 'none',
    });
    expect(arc.props).toMatchObject({
      cx: 50,
      cy: 50,
      r: radius,
      stroke: lightColors.primary,
      strokeWidth: 10,
      fill: 'none',
      strokeLinecap: 'round',
    });
    expect(arc.props.strokeDasharray).toBeCloseTo(circumference, 9);
    expect(arc.props.transform).toBe('rotate(-90 50 50)');
    // The numeral is proportionally sized and inked with the arc color.
    expect(StyleSheet.flatten(screen.getByText('50').props.style)).toMatchObject({
      fontSize: 28,
      fontWeight: '800',
      color: lightColors.primary,
      fontVariant: ['tabular-nums'],
    });
  });

  it('reserves exactly 20dp under the ring for the caption', async () => {
    await render(<ScoreRing score={10} size={80} label="of 100" accessibilityLabel="S" />);
    const host = screen.getByRole('progressbar', { name: 'S' });
    expect(StyleSheet.flatten(host.props.style)).toMatchObject({ width: 80, height: 100 });
    expect(StyleSheet.flatten(screen.getByText('of 100').props.style)).toMatchObject({
      marginTop: 2,
      color: lightColors.muted,
      textAlign: 'center',
    });
  });

  it('animates the dash offset from the full circumference under motion', async () => {
    const theme = await await lightTheme();
    await render(<ScoreRing score={70} size={100} accessibilityLabel="S" />);
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 70,
        duration: theme.motion.slow,
        easing: theme.motion.easing.decelerate,
        useNativeDriver: false,
      }),
    );
    expect(interpolateSpy).toHaveBeenCalledWith({
      inputRange: [0, 100],
      outputRange: [2 * Math.PI * 45, 0],
    });
  });
});

describe('WordTaggedTranscript styling', () => {
  it('styles each chip and its ink by verdict', async () => {
    await render(
      <WordTaggedTranscript
        transcript="I brung courage."
        wordScores={[
          { word: 'I', status: 'good' },
          { word: 'brung', status: 'poor' },
          { word: 'courage', status: 'fair' },
        ]}
      />,
    );
    const chips = [
      screen.getByLabelText('I, Good'),
      screen.getByLabelText('brung, Practice'),
      screen.getByLabelText('courage, Close'),
    ];
    expect(StyleSheet.flatten(chips[0].props.style)).toMatchObject({
      backgroundColor: lightColors.successLight,
      borderColor: lightColors.success,
      borderWidth: 1,
      borderRadius: (await lightTheme()).radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 8,
    });
    expect(StyleSheet.flatten(chips[1].props.style)).toMatchObject({
      backgroundColor: lightColors.dangerLight,
      borderColor: lightColors.danger,
    });
    expect(StyleSheet.flatten(chips[2].props.style)).toMatchObject({
      backgroundColor: lightColors.primaryLight,
      borderColor: lightColors.primary,
    });
    expect(StyleSheet.flatten(childProps(chips[0]).style)).toMatchObject({
      color: lightColors.success,
      fontSize: 16,
      fontWeight: '600',
    });
    expect(StyleSheet.flatten(childProps(chips[2]).style)).toMatchObject({
      color: lightColors.primary,
    });
  });

  it('switches the fair register to warning ink on the card fill in dark mode', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    await render(
      <WordTaggedTranscript
        transcript="courage"
        wordScores={[{ word: 'courage', status: 'fair' }]}
      />,
    );
    expect(StyleSheet.flatten(screen.getByLabelText('courage, Close').props.style)).toMatchObject({
      backgroundColor: darkColors.card,
      borderColor: darkColors.warning,
    });
    expect(StyleSheet.flatten(screen.getByText('courage').props.style)).toMatchObject({
      color: darkColors.warning,
    });
  });

  it('renders the decorative legend with tinted dots and uppercase captions', async () => {
    const theme = await lightTheme();
    await render(
      <WordTaggedTranscript transcript="x" wordScores={[{ word: 'x', status: 'good' }]} />,
    );
    const hidden = { includeHiddenElements: true } as const;
    const legendItem = screen.getByText('Good', hidden).parent!;
    expect(StyleSheet.flatten(legendItem.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    });
    const legendRow = legendItem.parent!;
    expect(StyleSheet.flatten(legendRow.props.style)).toMatchObject({
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
    });
    // The legend is pure visual redundancy for the chip names, so it hides
    // from assistive tech entirely on both platforms.
    expect(legendRow.props.accessibilityElementsHidden).toBe(true);
    expect(legendRow.props.importantForAccessibility).toBe('no-hide-descendants');
    const dot = childAt(legendItem);
    expect(StyleSheet.flatten(dot.props.style)).toMatchObject({
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: lightColors.successLight,
      borderColor: lightColors.success,
    });
    expect(StyleSheet.flatten(screen.getByText('Good', hidden).props.style)).toMatchObject({
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    });
  });

  it('falls back to the plain transcript for an empty tag list', async () => {
    await render(
      <WordTaggedTranscript transcript="Empty tags." wordScores={[]} testID="empty-tags" />,
    );
    expect(screen.getByText('Empty tags.')).toBeTruthy();
    const hidden = { includeHiddenElements: true } as const;
    expect(screen.queryByText('Good', hidden)).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('Empty tags.').props.style)).toMatchObject({
      marginTop: (await lightTheme()).spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      color: lightColors.text,
    });
  });
});

describe('PasswordStrengthMeter boundaries', () => {
  it('holds every tier boundary exactly', () => {
    // Exactly eight policy-satisfying characters rate fair (not weak).
    expect(passwordStrength('abcd1234')).toBe('fair');
    // Twelve characters with exactly three character classes rate strong.
    expect(passwordStrength('Abcdef123ghi')).toBe('strong');
    // Eleven characters with three classes stay fair (length still < 12).
    expect(passwordStrength('Abcdef123gh')).toBe('fair');
    // Lower + digit (two classes) at twelve characters stays fair.
    expect(passwordStrength('abcdef123456')).toBe('fair');
    // The symbol class is the fourth variety contributor.
    expect(passwordStrength('Abcdef123g!i')).toBe('strong');
  });

  it('counts lower, upper, digit, and symbol variety independently', () => {
    // Two classes (lower + digit) is fair, never strong, at any length.
    expect(passwordStrength('abcdefghij12')).toBe('fair');
    // Adding the upper class reaches three and promotes at >= 12 chars.
    expect(passwordStrength('abcdefghij12A')).toBe('strong');
    // Adding a symbol instead also reaches three.
    expect(passwordStrength('abcdefghij12!')).toBe('strong');
  });

  it('stays visible at exactly the 72-byte ceiling and hides one byte past it', async () => {
    const exactly72 = `${'a'.repeat(69)}A1b`; // 69 + 3 = 72 UTF-8 bytes
    expect(Buffer.byteLength(exactly72, 'utf8')).toBe(72);
    const atCeiling = await render(<PasswordStrengthMeter password={exactly72} />);
    expect(atCeiling.toJSON()).not.toBeNull();
    const seventyThree = `${'a'.repeat(69)}A1bc`;
    expect(Buffer.byteLength(seventyThree, 'utf8')).toBe(73);
    const pastCeiling = await render(<PasswordStrengthMeter password={seventyThree} />);
    expect(pastCeiling.toJSON()).toBeNull();
  });

  it('labels the fair tier and fills exactly two segments for it', async () => {
    await render(<PasswordStrengthMeter password="password1" testID="meter-fair" />);
    expect(screen.getByLabelText('Good')).toBeTruthy();
    expect(screen.getAllByTestId('meter-fair-segment-on')).toHaveLength(2);
    expect(screen.getAllByTestId('meter-fair-segment-off')).toHaveLength(1);
  });
});

describe('PasswordVisibilityToggle styling', () => {
  it('centers its glyph, dims to 60% while pressed, and 50% while disabled', async () => {
    const theme = await lightTheme();
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show"
        onToggle={jest.fn()}
        testID="vt"
      />,
    );
    const toggle = screen.getByTestId('vt');
    expect(StyleSheet.flatten(toggle.props.style)).toMatchObject({
      width: theme.layout.minimumTarget,
      height: theme.layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(toggle.props.style).opacity).toBeUndefined();
  });

  it('halves the opacity when disabled', async () => {
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show"
        onToggle={jest.fn()}
        disabled
        testID="vt-disabled"
      />,
    );
    const toggle = screen.getByTestId('vt-disabled');
    expect(StyleSheet.flatten(toggle.props.style)).toMatchObject({ opacity: 0.5 });
  });

  it('draws the revealed eye as four strokes and the masked eye as two', async () => {
    await render(
      <PasswordVisibilityToggle visible accessibilityLabel="Hide" onToggle={jest.fn()} />,
    );
    const hiddenToggle = screen.getByRole('button', { name: 'Hide' });
    // Icon host View instance -> Svg instance -> rendered primitives.
    const glyphCount = (button: { children: unknown[] }) => {
      // Walk to the authored Svg element: the host View instance's props carry
      // the JSX children, whose fragment keeps the raw primitives.
      const svg = (button.children[0] as { props: { children: React.ReactElement } }).props
        .children;
      const rendered: unknown = (svg.props as { children?: unknown }).children;
      if (rendered === undefined || rendered === null) return 0;
      const children =
        React.isValidElement(rendered) && rendered.type === React.Fragment
          ? (rendered.props as { children?: unknown }).children
          : rendered;
      if (children === undefined || children === null) return 0;
      return (Array.isArray(children) ? children : [children]).length;
    };
    expect(glyphCount(hiddenToggle)).toBe(4);
    await render(
      <PasswordVisibilityToggle visible={false} accessibilityLabel="Show2" onToggle={jest.fn()} />,
    );
    expect(glyphCount(screen.getByRole('button', { name: 'Show2' }))).toBe(2);
  });
});

describe('EmptyState styling', () => {
  it('centers its column and types the title and body', async () => {
    await render(<EmptyState icon="clock" title="No answers yet" body="History appears here." />);
    const title = screen.getByRole('header', { name: 'No answers yet' });
    const contentHost = title.parent!;
    const scrollHost = contentHost.parent!;
    expect(StyleSheet.flatten(scrollHost.props.contentContainerStyle)).toMatchObject({
      alignItems: 'center',
    });
    // The friendly mark rides in the shared brand-mark circle diameter.
    const markBadge = childAt(contentHost, 0);
    expect(StyleSheet.flatten(markBadge.props.style)).toMatchObject({
      width: layout.brandMark,
      height: layout.brandMark,
      borderRadius: layout.brandMark / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: lightColors.primaryLight,
    });
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(StyleSheet.flatten(screen.getByText('History appears here.').props.style)).toMatchObject(
      {
        textAlign: 'center',
        color: lightColors.muted,
      },
    );
  });

  it('stretches the action row when an action is provided', async () => {
    const theme = await lightTheme();
    await render(
      <EmptyState
        icon="mic"
        title="Empty"
        body="Nothing."
        action={<Button title="Go" onPress={jest.fn()} />}
      />,
    );
    const action = screen.getByRole('button', { name: 'Go' });
    expect(StyleSheet.flatten(action.parent!.props.style)).toMatchObject({
      alignSelf: 'stretch',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    });
  });
});

describe('useReduceMotion wiring', () => {
  it('subscribes to the exact reduceMotionChanged accessibility event', async () => {
    await renderHook(() => useReduceMotion());
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function),
    );
  });
});

describe('optional testID and slot wiring', () => {
  it('leaves Confetti pieces untagged when no testID is supplied', async () => {
    await render(<Confetti count={2} />);
    // The overlay host is the root; its children are the burst pieces.
    const root = screen.root;
    expect(root).not.toBeNull();
    const pieces = root!.children;
    expect(pieces).toHaveLength(2);
    for (const piece of pieces) {
      expect((piece as { props: { testID?: string } }).props.testID).toBeUndefined();
    }
  });

  it('renders no EmptyState action row without an action', async () => {
    await render(<EmptyState icon="mic" title="Empty" body="Nothing here." />);
    const contentHost = screen.getByText('Nothing here.').parent!;
    // Mark badge, title, and body only — no trailing action-row container.
    expect(contentHost.children).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('leaves PasswordStrengthMeter segments untagged when no testID is supplied', async () => {
    await render(<PasswordStrengthMeter password="short" />);
    const row = screen.getByLabelText('Weak');
    const segments = (row.children[0] as unknown as { children: unknown[] }).children;
    expect(segments).toHaveLength(3);
    for (const segment of segments) {
      expect((segment as { props: { testID?: string } }).props.testID).toBeUndefined();
    }
  });

  it('reports the revealed password-toggle testID without a custom override', async () => {
    await render(
      <PasswordVisibilityToggle visible accessibilityLabel="Hide password" onToggle={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Hide password' }).props.testID).toBe(
      'password-toggle-hide',
    );
  });

  it('leaves the ProgressBar fill untagged when no testID is supplied', async () => {
    await render(<ProgressBar progress={0.5} accessibilityLabel="Untagged progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Untagged progress' });
    const fill = bar.children[0] as unknown as { props: { testID?: string } };
    expect(fill).toBeTruthy();
    expect(fill.props.testID).toBeUndefined();
  });

  it('renders no ScoreRing caption slot without a label', async () => {
    await render(<ScoreRing score={50} accessibilityLabel="Untitled ring" />);
    const host = screen.getByRole('progressbar', { name: 'Untitled ring' });
    // The caption slot after the ring box stays null: no caption Text is
    // mounted below the ring when no label is supplied.
    expect(host.props.children[1]).toBeNull();
    expect(screen.getByText('50')).toBeTruthy();
  });
});

describe('Confetti overlay wiring', () => {
  it('pins the overlay pointer-events, testID, and full-bleed style', async () => {
    await render(<Confetti count={2} testID="burst-overlay" />);
    const overlay = screen.getByTestId('burst-overlay', { includeHiddenElements: true });
    // Celebration is decoration: the overlay never intercepts touches and
    // stays fully hidden from assistive tech.
    expect(overlay.props.pointerEvents).toBe('none');
    expect(overlay.props.accessibilityElementsHidden).toBe(true);
    expect(overlay.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      zIndex: 10,
    });
  });
});

describe('EmptyState scroll wiring', () => {
  it('forwards the automatic inset behavior and the live refresh control', async () => {
    const onRefresh = jest.fn();
    await render(
      <EmptyState
        icon="clock"
        title="No answers yet"
        body="History appears here."
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        testID="empty-scroll"
      />,
    );
    const scroll = screen.getByTestId('empty-scroll');
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe('automatic');
    const forwarded = scroll.props.refreshControl as
      { props: { refreshing: boolean; onRefresh: typeof onRefresh } } | undefined;
    expect(forwarded).toBeDefined();
    expect(forwarded?.props.onRefresh).toBe(onRefresh);
    expect(forwarded?.props.refreshing).toBe(false);
  });

  it('draws the mark glyph at the authored badge size', async () => {
    await render(<EmptyState icon="home" title="No answers yet" body="Nothing here." />);
    const contentHost = screen.getByRole('header', { name: 'No answers yet' }).parent!;
    const markBadge = childAt(contentHost, 0);
    const iconHost = childAt(markBadge, 0);
    const svg = iconHost.props.children as React.ReactElement<{
      width?: number;
      height?: number;
      children?: unknown;
    }>;
    // The home glyph draws as three stroked paths at the friendly-mark size.
    const primitives = svgPrimitives(svg);
    expect(primitives).toHaveLength(3);
    expect(primitives[0].props.d).toBe('M3.5 10.5 12 3.5l8.5 7');
    expect(svg.props.width).toBe(30);
    expect(svg.props.height).toBe(30);
  });

  it('caps dynamic type growth on the title and body', async () => {
    await render(<EmptyState icon="clock" title="No answers yet" body="Nothing here." />);
    expect(screen.getByRole('header', { name: 'No answers yet' }).props.maxFontSizeMultiplier).toBe(
      1.8,
    );
    expect(screen.getByText('Nothing here.').props.maxFontSizeMultiplier).toBe(1.8);
  });
});

describe('PasswordStrengthMeter wiring', () => {
  it('pins the row testID and strip layout', async () => {
    const theme = await lightTheme();
    await render(<PasswordStrengthMeter password="short" testID="meter-wired" />);
    const row = screen.getByTestId('meter-wired');
    // The row itself is the screen-reader element: the merged tier label is
    // announced once for the whole strip, not per decorative segment.
    expect(row.props.accessible).toBe(true);
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.xs,
    });
  });

  it('pins the segment strip geometry and the weak tier fills', async () => {
    const theme = await lightTheme();
    await render(<PasswordStrengthMeter password="short" />);
    const row = screen.getByLabelText('Weak');
    const segmentsHost = childAt(row, 0);
    expect(StyleSheet.flatten(segmentsHost.props.style)).toMatchObject({
      flexDirection: 'row',
      gap: theme.spacing.xs,
      flex: 1,
    });
    expect(segmentsHost.children).toHaveLength(3);
    for (let index = 0; index < 3; index += 1) {
      const segment = childAt(segmentsHost, index);
      const segmentStyle = StyleSheet.flatten(
        segment.props.style as { backgroundColor?: string },
      ) as { backgroundColor?: string } | undefined;
      expect(segmentStyle).toMatchObject({
        flex: 1,
        height: 5,
        borderRadius: theme.radii.pill,
      });
      expect(segmentStyle?.backgroundColor).toBe(
        index === 0 ? lightColors.danger : lightColors.border,
      );
    }
    expect(StyleSheet.flatten(screen.getByText('Weak').props.style)).toMatchObject({
      color: lightColors.danger,
      fontSize: theme.type.caption.fontSize,
      fontWeight: '700',
    });
  });
});

describe('PasswordVisibilityToggle wiring', () => {
  it('widens the tap target around the glyph with a hit slop', async () => {
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show password"
        onToggle={jest.fn()}
        testID="vt-wired"
      />,
    );
    expect(screen.getByTestId('vt-wired').props.hitSlop).toBe(4);
  });

  it('draws the masked eye at the affordance size in primary ink', async () => {
    await render(
      <PasswordVisibilityToggle
        visible={false}
        accessibilityLabel="Show password"
        onToggle={jest.fn()}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Show password' });
    const iconHost = childAt(toggle, 0);
    const svg = iconHost.props.children as React.ReactElement<{
      width?: number;
      height?: number;
      children?: unknown;
    }>;
    expect(svg.props.width).toBe(22);
    expect(svg.props.height).toBe(22);
    const primitives = svgPrimitives(svg);
    expect(primitives).toHaveLength(2);
    for (const primitive of primitives) {
      expect(primitive.props.stroke).toBe(lightColors.primary);
    }
  });
});

describe('ScoreRing wiring', () => {
  it('tags the ring host and pins the ring box square', async () => {
    await render(
      <ScoreRing score={50} size={100} accessibilityLabel="Wired ring" testID="ring-wired" />,
    );
    const host = screen.getByTestId('ring-wired');
    const ringBox = host.props.children[0];
    expect(StyleSheet.flatten(ringBox.props.style)).toMatchObject({ width: 100, height: 100 });
  });

  it('scales the svg canvas to the requested diameter', async () => {
    await render(<ScoreRing score={50} size={100} accessibilityLabel="Canvas ring" />);
    const host = screen.getByRole('progressbar', { name: 'Canvas ring' });
    const ringBox = host.props.children[0];
    const svg = ringBox.props.children[0];
    expect(svg.props.width).toBe(100);
    expect(svg.props.height).toBe(100);
  });

  it('wires the arc dash offset to the animated progress value', async () => {
    await render(<ScoreRing score={50} size={100} accessibilityLabel="Offset ring" />);
    const host = screen.getByRole('progressbar', { name: 'Offset ring' });
    const ringBox = host.props.children[0];
    const svg = ringBox.props.children[0];
    const arc = svg.props.children[1];
    expect(arc.props.strokeDashoffset).toBeDefined();
  });

  it('pins the centered numeral overlay pointer-events and geometry', async () => {
    await render(<ScoreRing score={50} size={100} accessibilityLabel="Overlay ring" />);
    const host = screen.getByRole('progressbar', { name: 'Overlay ring' });
    const ringBox = host.props.children[0];
    const overlay = ringBox.props.children[1];
    expect(overlay.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('caps dynamic type growth on the numeral and caption', async () => {
    await render(<ScoreRing score={50} label="of 100" accessibilityLabel="Capped ring" />);
    expect(screen.getByText('50').props.maxFontSizeMultiplier).toBe(1.4);
    expect(screen.getByText('of 100').props.maxFontSizeMultiplier).toBe(1.4);
  });
});

describe('StatTile wiring', () => {
  it('pins the badge glyph name and the clamped, type-capped texts', async () => {
    await render(<StatTile icon="flame" value="7" label="Day streak" testID="tile-wired" />);
    const tile = screen.getByTestId('tile-wired');
    const badge = childAt(tile, 0);
    const iconElement = badge.props.children as React.ReactElement<{ name?: string }>;
    expect(iconElement.props.name).toBe('flame');
    const value = within(tile).getByText('7');
    expect(value.props.numberOfLines).toBe(1);
    expect(value.props.maxFontSizeMultiplier).toBe(1.4);
    const caption = within(tile).getByText('Day streak');
    expect(caption.props.numberOfLines).toBe(2);
    expect(caption.props.maxFontSizeMultiplier).toBe(1.6);
  });
});

describe('WordTaggedTranscript wiring', () => {
  it('keeps the plain fallback transcript selectable', async () => {
    await render(<WordTaggedTranscript transcript="Plain words." />);
    expect(screen.getByText('Plain words.').props.selectable).toBe(true);
  });

  it('pins the tagged wrapper testID and the chip row layout', async () => {
    const theme = await lightTheme();
    await render(
      <WordTaggedTranscript
        transcript="I try."
        wordScores={[{ word: 'I', status: 'good' }]}
        accessibilityLanguage="en-US"
        testID="tagged-wired"
      />,
    );
    const wrap = screen.getByTestId('tagged-wired');
    expect(StyleSheet.flatten(wrap.props.style)).toMatchObject({
      marginTop: theme.spacing.sm,
      alignSelf: 'stretch',
    });
    const chipRow = wrap.props.children[0];
    expect(StyleSheet.flatten(chipRow.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      alignItems: 'center',
    });
    // The spoken words sit on the chip row itself, so every chip inherits the
    // authored language tag instead of announcing in the UI language.
    expect(chipRow.props.accessibilityLanguage).toBe('en-US');
  });

  it('keeps each chip word selectable with the simple break strategy', async () => {
    await render(
      <WordTaggedTranscript transcript="I try." wordScores={[{ word: 'I', status: 'good' }]} />,
    );
    const chip = screen.getByLabelText('I, Good');
    const word = within(chip).getByText('I');
    expect(word.props.selectable).toBe(true);
    expect(word.props.textBreakStrategy).toBe('simple');
  });

  it('pins the good-chip check glyph name, size, ink, and weight', async () => {
    await render(
      <WordTaggedTranscript transcript="I try." wordScores={[{ word: 'I', status: 'good' }]} />,
    );
    const chip = screen.getByLabelText('I, Good');
    const iconElement = (
      chip.props.children as React.ReactElement<{
        [prop: string]: unknown;
      }>[]
    )[1];
    expect(iconElement.props.name).toBe('check');
    expect(iconElement.props.size).toBe(11);
    expect(iconElement.props.color).toBe(lightColors.success);
    expect(iconElement.props.strokeWidth).toBe(3);
  });
});
