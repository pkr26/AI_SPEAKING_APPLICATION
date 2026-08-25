import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import Button from '../components/Button';
import RecordingPlayback from '../components/RecordingPlayback';
import { apiGetRecordings, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n, type MessageKey, type UiLanguage } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';
import type { RecordingItem, RecordingPage } from '../lib/types';

const RECORDING_MAX_PAGES = 500;

interface RecordingFetchMeta {
  fetchMore: { direction: 'forward' | 'backward' };
}

export const RECORDING_DATE_LOCALES: Record<UiLanguage, string> = {
  en: 'en-US',
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

export function formatRecordingDuration(durationMs: number | null): string | null {
  if (durationMs === null) return null;
  const seconds = Math.max(1, Math.round(durationMs / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatRecordingSize(sizeBytes: number): string {
  if (sizeBytes < 1_024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1_024) return `${Math.max(1, Math.round(sizeBytes / 1_024))} KB`;
  return `${(sizeBytes / (1024 * 1_024)).toFixed(1)} MB`;
}

export function nextRecordingPageParam(
  lastPage: RecordingPage,
  allPages: RecordingPage[],
): string | undefined {
  const next = lastPage.nextCursor;
  if (next === null || allPages.length >= RECORDING_MAX_PAGES) return undefined;
  return allPages.slice(0, -1).some((page) => page.nextCursor === next) ? undefined : next;
}

export function recordingContextMessageKey(context: RecordingItem['context']): MessageKey {
  if (context === 'diagnostic') return 'recordings.contextDiagnostic';
  if (context === 'practice-native') return 'recordings.contextNative';
  return 'recordings.contextPractice';
}

function RecordingCard({
  item,
  ownerId,
  locale,
}: {
  item: RecordingItem;
  ownerId: string;
  locale: string;
}) {
  const { t } = useI18n();
  const styles = themedStyles(useTheme());
  const contextLabel = t(recordingContextMessageKey(item.context));
  const statusLabel =
    item.status === 'available'
      ? t('recordings.statusAvailable')
      : item.status === 'retention_pending'
        ? t('recordings.statusPending')
        : t('recordings.statusUnavailable');
  const duration = formatRecordingDuration(item.durationMs);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text accessibilityRole="header" style={styles.promptWord}>
            {item.promptWord}
          </Text>
          <Text style={styles.question}>{item.questionText}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{item.cefrLevel}</Text>
        </View>
      </View>
      <View style={styles.metadataRow}>
        <Text style={styles.metadataText}>{contextLabel}</Text>
        <Text style={styles.metadataText}>{new Date(item.createdAt).toLocaleString(locale)}</Text>
      </View>
      <View style={styles.metadataRow}>
        <Text style={styles.metadataText}>{statusLabel}</Text>
        <Text style={styles.metadataText}>
          {[duration, formatRecordingSize(item.sizeBytes)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <RecordingPlayback
        compact
        ownerId={ownerId}
        recordingId={item.id}
        recordingLabel={item.promptWord}
        recordingStatus={item.status}
      />
    </View>
  );
}

export default function RecordingsScreen() {
  const { user, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const queryClient = useQueryClient();
  // Null distinguishes the pre-effect render from both mounted states and
  // avoids lying during React's Strict Effects setup/cleanup/setup probe.
  const mountedRef = useRef<boolean | null>(null);
  const queuedOlderRef = useRef(false);
  const userId = user?.id ?? null;
  const queryKey = useMemo(() => ['recordings', userId] as const, [userId]);
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void userId;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, userId]);

  useEffect(() => {
    mountedRef.current = true;
    queuedOlderRef.current = false;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const recordingsQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => apiGetRecordings(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextRecordingPageParam,
    enabled: !!user,
    retry: false,
  });

  const items = useMemo(
    () => recordingsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [recordingsQuery.data],
  );

  if (!user) return null;

  // TanStack's pending state has no successful page data, so `items` is
  // necessarily empty here. Avoid carrying that library invariant as a
  // redundant branch.
  if (recordingsQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('recordings.loading')}
          size="large"
          color={theme.colors.primary}
        />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          {t('recordings.loading')}
        </Text>
      </View>
    );
  }

  if (items.length === 0 && recordingsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('recordings.loadFailedTitle')}
        </Text>
        <Text accessibilityRole="alert" style={styles.muted}>
          {userMessageForError(recordingsQuery.error, t('recordings.loadFailed'))}
        </Text>
        <Button
          title={t('common.tryAgain')}
          onPress={() => void recordingsQuery.refetch({ cancelRefetch: false })}
          style={styles.action}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('recordings.emptyTitle')}
        </Text>
        <Text style={styles.muted}>{t('recordings.emptyBody')}</Text>
      </View>
    );
  }

  const loadOlder = () => {
    if (!recordingsQuery.hasNextPage || !mountedRef.current || !isSessionLeaseCurrent(sessionLease))
      return;
    // useInfiniteQuery has already created the observer state for this exact
    // key before a rendered list can expose loadOlder.
    const queryState = queryClient.getQueryState(queryKey)!;
    const fetchDirection = (queryState.fetchMeta as RecordingFetchMeta | null)?.fetchMore.direction;
    // fetchMeta changes synchronously when fetchNextPage starts, closing the
    // same-render gap before isFetchingNextPage publishes its next result.
    if (
      recordingsQuery.isFetchingNextPage ||
      (queryState.fetchStatus === 'fetching' && fetchDirection === 'forward')
    ) {
      return;
    }
    if (queryState.fetchStatus === 'fetching') {
      if (queuedOlderRef.current) return;
      queuedOlderRef.current = true;
      void recordingsQuery
        .refetch({ cancelRefetch: false })
        .then((result) => {
          if (result.isError || !mountedRef.current || !isSessionLeaseCurrent(sessionLease)) {
            return;
          }
          return recordingsQuery.fetchNextPage({ cancelRefetch: false });
        })
        .catch(() => undefined)
        .finally(() => {
          // TanStack resolves/cancels the joined observer promise before a
          // query-key replacement can expose another account's load handler.
          queuedOlderRef.current = false;
        });
      return;
    }
    void recordingsQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RecordingCard item={item} ownerId={user.id} locale={RECORDING_DATE_LOCALES[language]} />
      )}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!recordingsQuery.isFetchNextPageError) loadOlder();
      }}
      ListHeaderComponent={
        <View style={styles.intro}>
          <Text style={styles.introText}>{t('recordings.intro')}</Text>
          {items.some((item) => item.status === 'retention_pending') && (
            <Button
              title={t('recordings.checkPending')}
              variant="quiet"
              size="sm"
              onPress={() => void recordingsQuery.refetch({ cancelRefetch: false })}
            />
          )}
        </View>
      }
      ListFooterComponent={
        recordingsQuery.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              {t('recordings.loadingMore')}
            </Text>
          </View>
        ) : recordingsQuery.isFetchNextPageError ? (
          <View style={styles.footer}>
            <Text accessibilityRole="alert" style={styles.muted}>
              {userMessageForError(recordingsQuery.error, t('recordings.loadFailed'))}
            </Text>
            <Button title={t('common.tryAgain')} variant="secondary" onPress={loadOlder} />
          </View>
        ) : recordingsQuery.hasNextPage ? (
          <Button
            title={t('recordings.loadMore')}
            variant="secondary"
            fullWidth
            onPress={loadOlder}
            style={styles.action}
          />
        ) : null
      }
    />
  );
}

export const recordingsThemedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
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
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  muted: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
  intro: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  introText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardTitleWrap: {
    flex: 1,
  },
  promptWord: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  question: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.input,
    backgroundColor: colors.primaryLight,
  },
  levelBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  metadataRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metadataText: {
    color: colors.muted,
    fontSize: 13,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
}));

const themedStyles = recordingsThemedStyles;
