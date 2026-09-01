import React, { useEffect } from 'react';
import { Animated, useAnimatedValue } from 'react-native';

import { useReduceMotion } from '../lib/use-reduce-motion';
import { useTheme } from '../lib/theme';

export interface SkeletonProps {
  /** Block width in dp, or a percentage string. */
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  testID?: string;
}

/**
 * One shimmering placeholder block (NN/g: skeletons preview structure for
 * 2–10s full-page loads and read as content arriving, where a lone spinner
 * reads as waiting). Under Reduce Motion the block renders statically —
 * continuous pulsing is exactly the motion the setting removes.
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  testID,
}: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const pulse = useAnimatedValue(reduceMotion ? 1 : 0.45);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: theme.motion.base,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: theme.motion.base,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, theme.motion]);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: theme.colors.border,
        opacity: pulse,
      }}
    />
  );
}
