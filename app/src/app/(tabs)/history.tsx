import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
} from 'react-native';

import Button from '../../components/Button';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import DataRefreshNotice from '../../components/DataRefreshNotice';
import HistoryNativeAdCard from '../../components/HistoryNativeAdCard';
import OfflineState from '../../components/OfflineState';
import RecordingPlayback from '../../components/RecordingPlayback';
import { apiGetPracticeHistory, userMessageForError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n, type Translator, type UiLanguage } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import {
  PRACTICE_MASTER_SCORE,
  PRACTICE_PASS_SCORE,
  type HistoryItem,
  type HistoryPage,
  type NativeLanguage,
} from '../../lib/types';

/** BCP-47 tags for day headings, matching the app's UI languages. */
const DATE_LOCALES: Record<UiLanguage, string> = {
  en: 'en-US',
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

const NATIVE_ACCESSIBILITY_LANGUAGES: Record<NativeLanguage, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

interface DaySection {
  title: string;
  data: HistoryItem[];
}

export const HISTORY_MAX_PAGES = 500;

export function nextHistoryPageParam(
  lastPage: HistoryPage,
  allPages: HistoryPage[],
): string | undefined {
  const next = lastPage.nextCursor ?? undefined;
  if (!next || allPages.length >= HISTORY_MAX_PAGES) return undefined;
  // A malformed server must not keep onEndReached walking the same cursor (or
  // a cursor cycle) forever and appending duplicate pages.
  return allPages.slice(0, -1).some((page) => page.nextCursor === next) ? undefined : next;
}

function historyPaginationStopped(pages: HistoryPage[] | undefined): boolean {
  if (!pages?.length || pages.at(-1)?.nextCursor === null) return false;
  return nextHistoryPageParam(pages[pages.length - 1]!, pages) === undefined;
}

interface HistoryFetchMeta {
  fetchMore?: { direction?: 'forward' | 'backward' };
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

function HistoryRow({ item, ownerId, t }: { item: HistoryItem; ownerId: string; t: Translator }) {
  const theme = useTheme();
  const styles = themedStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const native = item.context === 'practice-native';
  const scoreLabel =
    item.score === null
      ? item.understood
        ? t('feedback.nativeUnderstoodTitle')
        : t('feedback.nativeMissedTitle')
      : t('feedback.scoreLine', { score: item.score });
  const contextLabel =
    item.context === 'diagnostic'
      ? t('history.contextDiagnostic')
      : native
        ? t('history.contextNative')
        : t('history.contextPractice');
  const attemptLabel =
    item.context === 'diagnostic' ? null : t('history.attemptNo', { number: item.attemptNo });
  const detailsLabel = expanded ? t('history.hideDetails') : t('history.showDetails');
  const chip =
    item.score === null
      ? {
          chip: item.understood ? styles.scoreChipMastered : styles.scoreChipFailed,
          text: item.understood ? styles.scoreChipMasteredText : styles.scoreChipFailedText,
        }
      : scoreChipStyles(styles, item.score);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={t('history.detailsHint')}
        accessibilityLabel={[item.promptWord, scoreLabel, contextLabel, attemptLabel, detailsLabel]
          .filter((part): part is string => part !== null)
          .join('. ')}
        style={({ pressed }) => [styles.rowHeader, pressed && styles.rowHeaderPressed]}
        onPress={() => setExpanded((current) => !current)}
      >
        <View style={styles.rowHeaderText}>
          <Text accessibilityLanguage="en-US" style={styles.promptWord}>
            {item.promptWord}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.scoreChip, chip.chip]}>
              <Text style={[styles.scoreChipText, chip.text]}>{scoreLabel}</Text>
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
                {contextLabel}
              </Text>
            </View>
            {item.context !== 'diagnostic' && (
              <Text style={styles.attemptText}>
                {t('history.attemptNo', { number: item.attemptNo })}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.expandHintRow}>
          <Text style={styles.expandHint}>
            {expanded ? t('history.hideDetails') : t('history.showDetails')}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.primary}
          />
        </View>
      </Pressable>
      {expanded && (
        <View style={styles.rowDetails}>
          <Text style={styles.detailLabel}>{t('label.question')}</Text>
          <Text accessibilityLanguage="en-US" style={styles.detailText}>
            {item.questionText}
          </Text>
          {!!item.transcript && (
            <>
              <Text style={styles.detailLabel}>
                {native
                  ? t('feedback.originalTranscript', {
                      language: t(`language.${item.nativeLanguage!}`),
                    })
                  : t('feedback.weHeard')}
              </Text>
              <Text
                accessibilityLanguage={
                  native ? NATIVE_ACCESSIBILITY_LANGUAGES[item.nativeLanguage!] : 'en-US'
                }
                selectable
                style={styles.transcript}
              >
                “{item.transcript}”
              </Text>
            </>
          )}
          {native && item.translatedTranscript && (
            <>
              <Text style={styles.detailLabel}>{t('feedback.englishTranslation')}</Text>
              <Text accessibilityLanguage="en-US" selectable style={styles.detailText}>
                {item.translatedTranscript}
              </Text>
            </>
          )}
          <Text style={styles.detailLabel}>{t('feedback.feedbackLabel')}</Text>
          <Text accessibilityLanguage="en-US" style={styles.detailText}>
            {item.feedback}
          </Text>
          {native && item.modelAnswer && (
            <>
              <Text style={styles.detailLabel}>{t('feedback.exampleEnglishAnswer')}</Text>
              <Text accessibilityLanguage="en-US" selectable style={styles.detailText}>
                {item.modelAnswer}
              </Text>
            </>
          )}
          {item.recordingId && (
            <>
              <Text style={styles.detailLabel}>{t('recordings.yourRecording')}</Text>
              <RecordingPlayback
                compact
                ownerId={ownerId}
                recordingId={item.recordingId}
                recordingLabel={item.promptWord}
                recordingStatus={item.recordingStatus}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** Day-grouped, cursor-paged attempt history for the signed-in learner. */
export default function HistoryScreen() {
  const { user, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const focused = useIsFocused();
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const queryClient = useQueryClient();
  const mountedRef = useRef(false);
  const queuedOlderRef = useRef<symbol | null>(null);
  const userId = user?.id ?? null;
  const queryKey = useMemo(() => ['practice-history', userId] as const, [userId]);
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void userId;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, userId]);
  // Match Home's focus-owned navigation contract: an empty-state tap may only
  // leave the currently focused account's screen, and rapid taps share one
  // synchronous claim before React or the router can publish a new render.
  const navigationStartedRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      navigationStartedRef.current = false;
      return () => {
        navigationStartedRef.current = true;
      };
    }, []),
  );
  const startPractice = useCallback(() => {
    if (navigationStartedRef.current || !isSessionLeaseCurrent(sessionLease)) return;
    navigationStartedRef.current = true;
    router.navigate('/practice');
  }, [isSessionLeaseCurrent, sessionLease]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queuedOlderRef.current = null;
    };
  }, []);

  useEffect(() => {
    queuedOlderRef.current = null;
  }, [queryKey]);

  const historyQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => apiGetPracticeHistory(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextHistoryPageParam,
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
  const historyAdAnchorId = items[7]?.id ?? null;
  const paginationStopped = historyPaginationStopped(historyQuery.data?.pages);

  // The route gate redirects after logout/session expiry.
  if (!user) return null;

  if (items.length === 0 && historyQuery.isPending) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        {historyQuery.fetchStatus === 'paused' ? (
          <OfflineState />
        ) : (
          // Row skeletons preview the day sections and answer cards the list
          // will fill, with a hidden polite line announcing the wait.
          <View style={styles.historySkeleton}>
            <Text
              accessibilityLiveRegion="polite"
              accessibilityElementsHidden
              style={styles.hiddenLoadingText}
            >
              {t('history.loading')}
            </Text>
            <Skeleton width={120} height={16} borderRadius={4} testID="history-skeleton-header" />
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} height={84} borderRadius={16} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  if (items.length === 0 && historyQuery.isError) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('history.loadFailedTitle')}
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.muted}>
          {userMessageForError(historyQuery.error, t('history.loadFailed'))}
        </Text>
        <Button
          title={t('common.tryAgain')}
          onPress={() => void historyQuery.refetch({ cancelRefetch: false })}
          style={styles.retryButton}
        />
      </ScrollView>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title={t('history.emptyTitle')}
        body={t('history.emptyBody')}
        testID="history-empty"
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isRefetching}
            onRefresh={() => {
              if (isSessionLeaseCurrent(sessionLease)) {
                void historyQuery.refetch({ cancelRefetch: false });
              }
            }}
            tintColor={theme.colors.primary}
          />
        }
        action={
          <Button
            title={t('home.startPractice')}
            fullWidth
            onPress={startPractice}
            style={styles.emptyAction}
          />
        }
      />
    );
  }

  const loadOlder = () => {
    if (!historyQuery.hasNextPage || !mountedRef.current || !isSessionLeaseCurrent(sessionLease)) {
      return;
    }
    const queryState = queryClient.getQueryState(queryKey);
    const fetchDirection = (queryState?.fetchMeta as HistoryFetchMeta | null)?.fetchMore?.direction;
    // fetchMeta changes synchronously when fetchNextPage starts, closing the
    // same-render gap before isFetchingNextPage can publish a new result.
    if (
      historyQuery.isFetchingNextPage ||
      (queryState?.fetchStatus === 'fetching' && fetchDirection === 'forward')
    ) {
      return;
    }

    if (queryState?.fetchStatus === 'fetching') {
      if (queuedOlderRef.current !== null) return;
      const queueToken = Symbol('queued-history-page');
      queuedOlderRef.current = queueToken;
      // This is an ordinary loaded-page refresh. Join it without cancellation,
      // then issue one distinct forward fetch against the refreshed cursor.
      const joinedRefresh = historyQuery.refetch({ cancelRefetch: false });
      void joinedRefresh
        .then((result) => {
          if (
            result.isError ||
            queuedOlderRef.current !== queueToken ||
            !mountedRef.current ||
            !isSessionLeaseCurrent(sessionLease)
          ) {
            return;
          }
          return historyQuery.fetchNextPage({ cancelRefetch: false });
        })
        .catch(() => undefined)
        .finally(() => {
          if (queuedOlderRef.current === queueToken) queuedOlderRef.current = null;
        });
      return;
    }

    void historyQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  };
  // A rejected page leaves hasNextPage set, so scrolling to the end again would
  // silently re-fire the same failing request; after a failure the next attempt
  // has to be an explicit tap on the footer's retry.
  const loadOlderOnScroll = () => {
    if (!historyQuery.isFetchNextPageError) loadOlder();
  };

  return (
    <SectionList
      accessibilityRole="list"
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      // Include enough initial cells for eight real rows even when day headers
      // split them, so the audited ad anchor is not deferred by virtualization.
      initialNumToRender={12}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <>
          <HistoryRow item={item} ownerId={user.id} t={t} />
          {item.id === historyAdAnchorId ? <HistoryNativeAdCard focused={focused} /> : null}
        </>
      )}
      renderSectionHeader={({ section }) => (
        <Text accessibilityRole="header" style={styles.sectionHeader}>
          {section.title}
        </Text>
      )}
      onEndReachedThreshold={0.4}
      onEndReached={loadOlderOnScroll}
      refreshing={historyQuery.isRefetching}
      onRefresh={() => {
        if (mountedRef.current && isSessionLeaseCurrent(sessionLease)) {
          void historyQuery.refetch({ cancelRefetch: false });
        }
      }}
      ListHeaderComponent={
        <DataRefreshNotice
          updating={historyQuery.isRefetching && !historyQuery.isRefetchError}
          failed={historyQuery.isRefetchError}
          onRetry={() => void historyQuery.refetch({ cancelRefetch: false })}
        />
      }
      ListFooterComponent={
        <>
          {historyQuery.isFetchingNextPage ? (
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
          ) : paginationStopped ? (
            <View style={styles.footer}>
              <Text accessibilityLiveRegion="polite" style={styles.muted}>
                {t('pagination.safetyStop')}
              </Text>
            </View>
          ) : historyQuery.hasNextPage ? (
            <Button
              title={t('history.loadMore')}
              variant="secondary"
              fullWidth
              onPress={loadOlder}
              style={styles.loadMoreButton}
            />
          ) : null}
        </>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
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
  emptyAction: {
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
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  historySkeleton: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  hiddenLoadingText: {
    height: 0,
    opacity: 0,
  },
  loadMoreButton: {
    marginTop: spacing.md,
  },
}));
