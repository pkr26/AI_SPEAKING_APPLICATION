import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';

import Button from '../components/Button';
import { apiGetPracticeHistory, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n, type Translator, type UiLanguage } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';
import { PRACTICE_MASTER_SCORE, PRACTICE_PASS_SCORE, type HistoryItem } from '../lib/types';

/** BCP-47 tags for day headings, matching the app's UI languages. */
const DATE_LOCALES: Record<UiLanguage, string> = {
  en: 'en-US',
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

interface DaySection {
  title: string;
  data: HistoryItem[];
}

/** Groups newest-first items into day sections using the device's local day. */
export function groupHistoryByDay(items: HistoryItem[], locale: string): DaySection[] {
  const sections: DaySection[] = [];
  let currentKey: string | null = null;
  for (const item of items) {
    const created = new Date(item.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
    if (key !== currentKey) {
      currentKey = key;
      sections.push({
        title: created.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        data: [],
      });
    }
    sections[sections.length - 1].data.push(item);
  }
  return sections;
}

type HistoryStyles = ReturnType<typeof themedStyles>;

function scoreChipStyles(styles: HistoryStyles, score: number) {
  if (score >= PRACTICE_MASTER_SCORE) {
    return { chip: styles.scoreChipMastered, text: styles.scoreChipMasteredText };
  }
  if (score >= PRACTICE_PASS_SCORE) {
    return { chip: styles.scoreChipPassed, text: styles.scoreChipPassedText };
  }
  return { chip: styles.scoreChipFailed, text: styles.scoreChipFailedText };
}

function HistoryRow({ item, t }: { item: HistoryItem; t: Translator }) {
  const styles = themedStyles(useTheme());
  const [expanded, setExpanded] = useState(false);
  const chip = scoreChipStyles(styles, item.score);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.promptWord}. ${t('feedback.scoreLine', { score: item.score })}`}
        style={({ pressed }) => [styles.rowHeader, pressed && styles.rowHeaderPressed]}
        onPress={() => setExpanded((current) => !current)}
      >
        <View style={styles.rowHeaderText}>
          <Text style={styles.promptWord}>{item.promptWord}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.scoreChip, chip.chip]}>
              <Text style={[styles.scoreChipText, chip.text]}>
                {t('feedback.scoreLine', { score: item.score })}
              </Text>
            </View>
            <View
              style={[
                styles.contextBadge,
                item.context === 'diagnostic' && styles.contextBadgeDiagnostic,
              ]}
            >
              <Text
                style={[
                  styles.contextBadgeText,
                  item.context === 'diagnostic' && styles.contextBadgeDiagnosticText,
                ]}
              >
                {item.context === 'diagnostic'
                  ? t('history.contextDiagnostic')
                  : t('history.contextPractice')}
              </Text>
            </View>
            {item.context === 'practice' && (
              <Text style={styles.attemptText}>
                {t('history.attemptNo', { number: item.attemptNo })}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.expandHint}>
          {expanded ? t('history.hideDetails') : t('history.showDetails')}
        </Text>
      </Pressable>
      {expanded && (
        <View style={styles.rowDetails}>
          <Text style={styles.detailLabel}>{t('label.question')}</Text>
          <Text style={styles.detailText}>{item.questionText}</Text>
          {!!item.transcript && (
            <>
              <Text style={styles.detailLabel}>{t('feedback.weHeard')}</Text>
              <Text style={styles.transcript}>“{item.transcript}”</Text>
            </>
          )}
          <Text style={styles.detailLabel}>{t('feedback.feedbackLabel')}</Text>
          <Text style={styles.detailText}>{item.feedback}</Text>
        </View>
      )}
    </View>
  );
}

/** Day-grouped, cursor-paged attempt history for the signed-in learner. */
export default function HistoryScreen() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = themedStyles(theme);

  const historyQuery = useInfiniteQuery({
    queryKey: ['practice-history', user?.id],
    queryFn: async ({ pageParam, signal }) => apiGetPracticeHistory(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user,
    retry: false,
  });

  const items = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [historyQuery.data],
  );
  const sections = useMemo(
    () => groupHistoryByDay(items, DATE_LOCALES[language]),
    [items, language],
  );

  // The route gate redirects after logout/session expiry.
  if (!user) return null;

  if (items.length === 0 && historyQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('history.loading')}
          size="large"
          color={theme.colors.primary}
        />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          {t('history.loading')}
        </Text>
      </View>
    );
  }

  if (items.length === 0 && historyQuery.isError) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('history.loadFailedTitle')}
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.muted}>
          {userMessageForError(historyQuery.error, t('history.loadFailed'))}
        </Text>
        <Button
          title={t('common.tryAgain')}
          onPress={() => void historyQuery.refetch()}
          style={styles.retryButton}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('history.emptyTitle')}
        </Text>
        <Text style={styles.muted}>{t('history.emptyBody')}</Text>
      </View>
    );
  }

  const loadOlder = () => {
    if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
      void historyQuery.fetchNextPage();
    }
  };
  // A rejected page leaves hasNextPage set, so scrolling to the end again would
  // silently re-fire the same failing request; after a failure the next attempt
  // has to be an explicit tap on the footer's retry.
  const loadOlderOnScroll = () => {
    if (!historyQuery.isFetchNextPageError) loadOlder();
  };

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <HistoryRow item={item} t={t} />}
      renderSectionHeader={({ section }) => (
        <Text accessibilityRole="header" style={styles.sectionHeader}>
          {section.title}
        </Text>
      )}
      onEndReachedThreshold={0.4}
      onEndReached={loadOlderOnScroll}
      ListFooterComponent={
        historyQuery.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              {t('history.loadingMore')}
            </Text>
          </View>
        ) : historyQuery.isFetchNextPageError ? (
          // The loaded answers stay on screen, so the full-screen error state
          // above never runs for a failed older page: report it here instead of
          // dropping back to a "Show older answers" button that says nothing.
          <View style={styles.footer}>
            <Text accessibilityLiveRegion="assertive" style={styles.muted}>
              {userMessageForError(historyQuery.error, t('history.loadFailed'))}
            </Text>
            <Button
              title={t('common.tryAgain')}
              variant="secondary"
              fullWidth
              onPress={loadOlder}
              style={styles.retryButton}
            />
          </View>
        ) : historyQuery.hasNextPage ? (
          <Button
            title={t('history.loadMore')}
            variant="secondary"
            fullWidth
            onPress={loadOlder}
            style={styles.loadMoreButton}
          />
        ) : null
      }
    />
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  muted: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    // Day headers stick to the top of the list on iOS, so the band has to be
    // opaque and own its spacing as padding — with margins the pinned label
    // would sit transparently over the rows scrolling underneath it.
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  rowHeader: {
    minHeight: layout.minimumTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: 14,
  },
  rowHeaderPressed: {
    backgroundColor: colors.background,
  },
  rowHeaderText: {
    flex: 1,
  },
  promptWord: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  badgeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreChip: {
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreChipMastered: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  scoreChipMasteredText: {
    color: colors.success,
  },
  scoreChipPassed: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scoreChipPassedText: {
    color: colors.primary,
  },
  scoreChipFailed: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  scoreChipFailedText: {
    color: colors.danger,
  },
  contextBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.badge,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  contextBadgeDiagnostic: {
    backgroundColor: colors.warning,
  },
  contextBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  contextBadgeDiagnosticText: {
    color: colors.onWarning,
  },
  attemptText: {
    fontSize: 12,
    color: colors.muted,
  },
  expandHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  rowDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  },
  detailText: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  transcript: {
    marginTop: spacing.xs,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    color: colors.text,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginTop: spacing.md,
  },
}));
