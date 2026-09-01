import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '../lib/theme';
import { useReduceMotion } from './ScoreRing';

export interface ConfettiProps {
  /** Pieces in the burst. Default 26. */
  count?: number;
  testID?: string;
}

/**
 * A one-shot celebration burst. Deterministic pseudo-random placement (derived
 * from the piece index, never Math.random) keeps the effect identical across
 * renders and testable. Under Reduce Motion the burst is skipped entirely —
 * celebration is decoration, never information.
 */
export default function Confetti({ count = 26, testID }: ConfettiProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const animations = useMemo(
    () => Array.from({ length: count }, () => new Animated.Value(0)),
    [count],
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduceMotion || startedRef.current) return;
    startedRef.current = true;
    const timeline = Animated.parallel(
      animations.map((value, index) =>
        Animated.sequence([
          Animated.delay((index * 37) % 240),
          Animated.parallel([
            Animated.timing(value, {
              toValue: 1,
              duration: theme.motion.slow * 4 + ((index * 53) % 320),
              easing: theme.motion.easing.accelerate,
              useNativeDriver: false,
            }),
          ]),
        ]),
      ),
    );
    timeline.start();
    return () => timeline.stop();
  }, [animations, reduceMotion, theme.motion]);

  if (reduceMotion) return null;

  const palette = [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.success,
    theme.colors.primaryDark,
  ];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID={testID}
      style={styles.overlay}
    >
      {animations.map((value, index) => {
        const left = (index * 41) % 100;
        const pieceSize = 7 + ((index * 13) % 6);
        const spin = (index % 2 === 0 ? 1 : -1) * (240 + ((index * 31) % 240));
        const translateX = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, ((index * 29) % 60) - 30],
        });
        const translateY = value.interpolate({
          inputRange: [0, 1],
          outputRange: [-16, 420],
        });
        const rotate = value.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${spin}deg`],
        });
        const opacity = value.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={index}
            testID={testID ? `${testID}-piece` : undefined}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: 0,
              width: pieceSize,
              height: pieceSize + 4,
              borderRadius: 2,
              backgroundColor: palette[index % palette.length],
              transform: [{ translateX }, { translateY }, { rotate }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
});
