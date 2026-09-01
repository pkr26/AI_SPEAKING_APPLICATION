import React, { useEffect } from 'react';
import { Animated, StyleSheet, useAnimatedValue, View } from 'react-native';

import { useReduceMotion } from '../lib/use-reduce-motion';
import { useTheme } from '../lib/theme';

export interface ProgressBarProps {
  /** Fill fraction 0–1; values outside the range are clamped. */
  progress: number;
  /** Accessible description of what is progressing. */
  accessibilityLabel: string;
  /**
   * Count semantics for assistive tech (e.g. {min: 0, max: 40, now: 12} for
   * "12 of 40 words mastered"). When provided it replaces the default percent
   * value, so screen-reader users keep count granularity, not just a percent.
   */
  accessibilityCount?: { min: number; max: number; now: number };
  /** Fill ink for the completed fraction. */
  fill?: string;
  height?: number;
  testID?: string;
}

/**
 * A determinate progress bar whose fill animates to its new value (HIG: keep
 * progress moving; M3: 4dp linear indicator). Reduce Motion renders the same
 * bar statically.
 */
export default function ProgressBar({
  progress,
  accessibilityLabel,
  accessibilityCount,
  fill,
  height = 8,
  testID,
}: ProgressBarProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const animated = useAnimatedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      animated.setValue(clamped);
      return;
    }
    const animation = Animated.timing(animated, {
      toValue: clamped,
      duration: theme.motion.base,
      easing: theme.motion.easing.decelerate,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animated, clamped, reduceMotion, theme.motion]);

  const width = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        accessibilityCount ?? { min: 0, max: 100, now: Math.round(clamped * 100) }
      }
      testID={testID}
      style={[
        styles.track,
        // The decorative track keeps the border hairline: the FILL is the
        // indicator and clears 3:1 against this track in both schemes (pinned
        // in theme-test), while the value itself is exposed accessibly.
        { height, backgroundColor: theme.colors.border },
        { borderRadius: height / 2 },
      ]}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        style={{
          height: '100%',
          width,
          borderRadius: height / 2,
          backgroundColor: fill ?? theme.colors.success,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
});
