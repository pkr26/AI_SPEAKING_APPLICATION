import React, { useEffect } from 'react';
import { Animated, StyleSheet, useAnimatedValue, View } from 'react-native';

import { useTheme } from '../lib/theme';
import { useReduceMotion } from './ScoreRing';

export interface ProgressBarProps {
  /** Fill fraction 0–1; values outside the range are clamped. */
  progress: number;
  /** Accessible description of what is progressing. */
  accessibilityLabel: string;
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
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      testID={testID}
      style={[
        styles.track,
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
