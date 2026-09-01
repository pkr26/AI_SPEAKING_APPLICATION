import React from 'react';
import { Text, View } from 'react-native';

import { useT, type MessageKey } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';
import type { WordScore, WordScoreStatus } from '../lib/types';

export interface WordTaggedTranscriptProps {
  /** The full transcript, rendered when no word tags are available. */
  transcript: string;
  /** Word-by-word tags; when absent the plain quoted transcript renders. */
  wordScores?: WordScore[];
  /** Accessible language tag for the spoken content (e.g. 'en-US'). */
  accessibilityLanguage?: string;
  /** Wrap the plain fallback transcript in typographic quotes. */
  quoted?: boolean;
  testID?: string;
}

const LEGEND_KEYS: Record<WordScoreStatus, MessageKey> = {
  good: 'feedback.wordGood',
  fair: 'feedback.wordFair',
  poor: 'feedback.wordPoor',
};

/**
 * The color-coded answer view: each transcript word renders as a tinted chip
 * — good / close / needs-practice — so a learner sees exactly which words to
 * work on before reading a word of prose. Deployments that do not tag words
 * (and pre-tag replays) render the plain quoted transcript unchanged. Hue is
 * only one of the cues: the legend names each state and every chip keeps its
 * word text, so the reading never depends on color alone.
 */
export default function WordTaggedTranscript({
  transcript,
  wordScores,
  accessibilityLanguage,
  quoted = false,
  testID,
}: WordTaggedTranscriptProps) {
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);

  if (wordScores === undefined || wordScores.length === 0) {
    return (
      <Text
        accessibilityLanguage={accessibilityLanguage}
        selectable
        style={[styles.quoted, styles.fallbackInk]}
      >
        {quoted ? `“${transcript}”` : transcript}
      </Text>
    );
  }

  return (
    <View style={styles.wrap} testID={testID}>
      <View accessibilityLanguage={accessibilityLanguage} style={styles.chipRow}>
        {wordScores.map((entry, index) => (
          <View key={`${entry.word}-${index}`} style={[styles.chip, styles[entry.status]]}>
            <Text style={[styles.chipText, styles[`${entry.status}Text`]]}>{entry.word}</Text>
          </View>
        ))}
      </View>
      <View
        style={styles.legendRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {(Object.keys(LEGEND_KEYS) as WordScoreStatus[]).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, styles[status]]} />
            <Text style={[styles.legendLabel, styles[`${status}Text`]]}>
              {t(LEGEND_KEYS[status])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing, scheme }) => {
  // 'fair' pairs with the calmer primary register in light mode and the
  // warning tint in dark (both pass text contrast on their chip fills).
  const fairInk = scheme === 'dark' ? colors.warning : colors.primary;
  const fairFill = scheme === 'dark' ? colors.card : colors.primaryLight;
  const fairBorder = scheme === 'dark' ? colors.warning : colors.primary;
  return {
    quoted: {
      marginTop: spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 27,
    },
    fallbackInk: { color: colors.text },
    wrap: {
      marginTop: spacing.sm,
      alignSelf: 'stretch',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
    },
    chip: {
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
    },
    good: { backgroundColor: colors.successLight, borderColor: colors.success },
    goodText: { color: colors.success },
    fair: { backgroundColor: fairFill, borderColor: fairBorder },
    fairText: { color: fairInk },
    poor: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
    poorText: { color: colors.danger },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  };
});
