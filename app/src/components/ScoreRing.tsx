import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, useAnimatedValue, View } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

import { useTheme } from '../lib/theme';

const AnimatedRingCircle = Animated.createAnimatedComponent(SvgCircle);

/** Reads the OS Reduce Motion setting and keeps it live. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
    return () => subscription.remove();
  }, []);
  return reduceMotion;
}

export interface ScoreRingProps {
  /** Score to display, 0–100. Values outside the range are clamped. */
  score: number;
  /** Ring diameter in dp. */
  size?: number;
  /** Arc stroke thickness in dp. */
  thickness?: number;
  /** Arc ink; the semantic band color (success/warning/danger/primary). */
  color?: string;
  /** Track ink behind the arc. Defaults to the theme border token. */
  trackColor?: string;
  /** Small caption under the numeral (e.g. "out of 100"). */
  label?: string;
  /** Complete description for assistive tech, e.g. "Score 82 out of 100". */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * An animated circular score: the arc fills from the top clockwise on mount
 * (skipped under Reduce Motion) with the numeral centered inside. The arc and
 * numeral inherit the caller's band color so the ring matches the outcome.
 */
export default function ScoreRing({
  score,
  size = 120,
  thickness = 10,
  color,
  trackColor,
  label,
  accessibilityLabel,
  testID,
}: ScoreRingProps) {
  const theme = useTheme();
  const arcColor = color ?? theme.colors.primary;
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const progress = useAnimatedValue(0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(clamped);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: clamped,
      duration: theme.motion.slow,
      easing: theme.motion.easing.decelerate,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, progress, reduceMotion, theme.motion]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      testID={testID}
      style={{ width: size, height: size + (label ? 20 : 0), alignItems: 'center' }}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor ?? theme.colors.border}
            strokeWidth={thickness}
            fill="none"
          />
          <AnimatedRingCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: Math.round(size * 0.28),
              fontWeight: '800',
              color: arcColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {clamped}
          </Text>
        </View>
      </View>
      {label ? (
        <Text
          style={{
            marginTop: 2,
            fontSize: theme.type.caption.fontSize,
            lineHeight: theme.type.caption.lineHeight,
            fontWeight: '600',
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
