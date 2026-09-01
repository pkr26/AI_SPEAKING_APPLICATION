import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import React from 'react';

import Button from '../src/components/Button';
import Confetti from '../src/components/Confetti';
import EmptyState from '../src/components/EmptyState';
import PasswordStrengthMeter, { passwordStrength } from '../src/components/PasswordStrengthMeter';
import PasswordVisibilityToggle from '../src/components/PasswordVisibilityToggle';
import ProgressBar from '../src/components/ProgressBar';
import ScoreRing from '../src/components/ScoreRing';
import StatTile from '../src/components/StatTile';
import { lightColors } from '../src/lib/theme';
import { useReduceMotion } from '../src/lib/use-reduce-motion';
import WordTaggedTranscript from '../src/components/WordTaggedTranscript';

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

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
    expect(bar.props.accessibilityValue.now).toBe(80);
  });

  it('clamps non-finite and out-of-range progress', async () => {
    await render(<ProgressBar progress={Number.NaN} accessibilityLabel="Progress" />);
    expect(screen.getByRole('progressbar', { name: 'Progress' }).props.accessibilityValue.now).toBe(
      0,
    );
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
    // the chip's own accessible name carries the verdict.
    expect(screen.getByLabelText('I, Good')).toBeTruthy();
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
