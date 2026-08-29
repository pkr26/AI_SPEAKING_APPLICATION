import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import Button from '../../components/Button';
import { useAds } from '../../lib/ads';
import {
  apiConsumeAccountExportPages,
  apiDeleteAllRecordings,
  apiRestartDiagnostic,
  apiUpdateProfile,
  userMessageForError,
} from '../../lib/api';
import { LogoutCleanupError, MAX_NAME_LENGTH, useAuth, type SessionLease } from '../../lib/auth';
import {
  DEFAULT_REMINDER_HOUR,
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
  refreshDailyReminderLanguage,
} from '../../lib/daily-reminder';
import { useGuestLanguage } from '../../lib/guest-language';
import { translateFor, useT, useI18n, type UiLanguage } from '../../lib/i18n';
import { NATIVE_LANGUAGE_OPTIONS, UI_LANGUAGE_OPTIONS } from '../../lib/language-options';
import { usePracticeFlow } from '../../lib/practice-flow';
import { claimPrivateExportFile, type OwnedPrivateFile } from '../../lib/private-artifacts';
import { createThemedStyles, useTheme } from '../../lib/theme';
import type { NativeLanguage, User } from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

export function formatReminderHour(hour: number, language: UiLanguage = 'en'): string {
  try {
    return new Intl.DateTimeFormat(language, { hour: 'numeric' }).format(
      new Date(2020, 0, 1, hour, 0),
    );
  } catch {
    // Intl unavailable or unknown tag: fall back to zero-padded 24-hour HH:00.
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}

interface ReminderState {
  enabled: boolean;
  hour: number;
}

/**
 * Real settings/profile screen replacing the old Alert menus: profile facts,
 * name plus independent app-language and learning-language editing,
 * data export, daily reminder, placement-test retake, legal pages, log out,
 * and delete account.
 */
export default function SettingsScreen() {
  const {
    user,
    setUser,
    logout,
    resetStoredSession,
    sessionVersion,
    captureSessionLease,
    isSessionLeaseCurrent,
  } = useAuth();
  const t = useT();
  const { mirrorAccountLanguage } = useGuestLanguage();
  const { language } = useI18n();
  const { privacyOptionsRequired, showPrivacyOptions } = useAds();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const queryClient = useQueryClient();
  const { resetPracticeFlow } = usePracticeFlow();
  const navigation = useNavigation();
  // Bind callbacks to the session that rendered them. A stale native event
  // must not be able to call captureSessionLease later and mint authority for
  // whichever account happens to be active by then.
  const renderSessionLease: SessionLease = captureSessionLease();
  const activeIdentity = sessionVersion;
  const canonicalName = user?.name ?? '';

  const [nameDraft, setNameDraft] = useState(canonicalName);
  const [nameFocused, setNameFocused] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [languageBusy, setLanguageBusy] = useState(false);
  const [languageTarget, setLanguageTarget] = useState<
    { scope: 'ui'; code: UiLanguage } | { scope: 'native'; code: NativeLanguage } | null
  >(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [languageErrorScope, setLanguageErrorScope] = useState<'ui' | 'native' | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [recordingsDeleteBusy, setRecordingsDeleteBusy] = useState(false);
  const [recordingsDeleteConfirming, setRecordingsDeleteConfirming] = useState(false);
  const [recordingsDeleteSucceeded, setRecordingsDeleteSucceeded] = useState(false);
  const [recordingsDeleteError, setRecordingsDeleteError] = useState<string | null>(null);

  const [reminder, setReminder] = useState<ReminderState | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  const [retakeBusy, setRetakeBusy] = useState(false);
  const [retakeConfirming, setRetakeConfirming] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);

  const [logoutBusy, setLogoutBusy] = useState(false);

  // Re-entrancy latches. Each `disabled={xBusy}` prop and the handler it gates
  // read the same render's state, so a second press landing before React has
  // re-rendered would still see `false` and fire the request twice. A ref
  // updates synchronously, which is what these guards were always meant to do.
  const nameBusyRef = useRef(false);
  const languageBusyRef = useRef(false);
  const exportBusyRef = useRef(false);
  const exportControllerRef = useRef<AbortController | null>(null);
  const recordingsDeleteBusyRef = useRef<symbol | null>(null);
  const recordingsDeleteConfirmingRef = useRef<symbol | null>(null);
  const recordingsDeleteControllerRef = useRef<AbortController | null>(null);
  const reminderBusyRef = useRef(false);
  const privacyBusyRef = useRef<symbol | null>(null);
  const retakeBusyRef = useRef(false);
  const retakeConfirmingRef = useRef<symbol | null>(null);
  const logoutBusyRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const navigationRef = useRef(navigation);
  // Mirrors nameFocused for the re-sync effect below: keying the effect on the
  // focus state itself would wipe an unsaved edit the moment the field blurs.
  const nameFocusedRef = useRef(false);
  const nameDirtyRef = useRef(false);
  const nameDraftRef = useRef(canonicalName);
  const userRef = useRef(user);
  const activeIdentityRef = useRef<number | null>(activeIdentity);

  const blockingOperationActive = useCallback(
    () =>
      nameBusyRef.current ||
      languageBusyRef.current ||
      exportBusyRef.current ||
      recordingsDeleteBusyRef.current !== null ||
      recordingsDeleteConfirmingRef.current !== null ||
      reminderBusyRef.current ||
      privacyBusyRef.current !== null ||
      retakeBusyRef.current ||
      retakeConfirmingRef.current !== null ||
      logoutBusyRef.current,
    [],
  );

  const publishNavigationLock = useCallback(() => {
    const locked = blockingOperationActive();
    navigation.setOptions(
      locked
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  }, [blockingOperationActive, navigation]);

  const screenBusy =
    nameBusy ||
    languageBusy ||
    exportBusy ||
    recordingsDeleteBusy ||
    recordingsDeleteConfirming ||
    reminderBusy ||
    privacyBusy ||
    retakeBusy ||
    retakeConfirming ||
    logoutBusy;

  useHardwareBack(blockingOperationActive);
  useLayoutEffect(() => {
    navigation.setOptions(
      screenBusy
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  }, [navigation, screenBusy]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (blockingOperationActive() && event.data.action.type === 'GO_BACK') {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [blockingOperationActive, navigation]);
  useFocusEffect(
    useCallback(() => {
      navigationStartedRef.current = false;
      return () => {
        navigationStartedRef.current = true;
        exportControllerRef.current?.abort();
        recordingsDeleteControllerRef.current?.abort();
      };
    }, []),
  );
  // The committed session user. A write that lands after an await must rebuild
  // from this, never from the closure that started it: a name or language
  // change that resolved in between would be reverted, and nothing refetches
  // /me while a user is set to repair it.
  useLayoutEffect(() => {
    userRef.current = user;
  }, [user]);
  // A profile request can finish after logout or another identity transition.
  // Update this guard in the layout phase of every committed identity change,
  // before promise continuations can run, so delayed success cannot restore a
  // signed-out account into context.
  useLayoutEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);
  useLayoutEffect(() => {
    if (activeIdentityRef.current !== activeIdentity) {
      // A replacement identity must never inherit a native confirmation or
      // the header lock owned by the account that just left this route.
      retakeConfirmingRef.current = null;
      recordingsDeleteConfirmingRef.current = null;
      recordingsDeleteControllerRef.current?.abort();
      recordingsDeleteControllerRef.current = null;
      recordingsDeleteBusyRef.current = null;
      privacyBusyRef.current = null;
      languageBusyRef.current = false;
      setRetakeConfirming(false);
      setRecordingsDeleteConfirming(false);
      setRecordingsDeleteBusy(false);
      setRecordingsDeleteSucceeded(false);
      setRecordingsDeleteError(null);
      setPrivacyBusy(false);
      setPrivacyError(null);
      setLanguageBusy(false);
      setLanguageTarget(null);
      setLanguageError(null);
      setLanguageErrorScope(null);
      navigationRef.current.setOptions({ headerBackVisible: true, gestureEnabled: true });
    }
    activeIdentityRef.current = activeIdentity;
    return () => {
      activeIdentityRef.current = null;
      exportControllerRef.current?.abort();
      recordingsDeleteControllerRef.current?.abort();
      retakeConfirmingRef.current = null;
      recordingsDeleteConfirmingRef.current = null;
    };
  }, [activeIdentity]);

  const renderOwnsIdentity = useCallback(
    () => activeIdentityRef.current === activeIdentity && isSessionLeaseCurrent(renderSessionLease),
    [activeIdentity, isSessionLeaseCurrent, renderSessionLease],
  );
  const renderOwnsIdentityRef = useRef(renderOwnsIdentity);
  useLayoutEffect(() => {
    renderOwnsIdentityRef.current = renderOwnsIdentity;
  }, [renderOwnsIdentity]);

  const renderCanHandle = useCallback(
    () => !navigationStartedRef.current && renderOwnsIdentity(),
    [renderOwnsIdentity],
  );

  const renderIsMountedIdentity = useCallback(
    () => activeIdentityRef.current === activeIdentity,
    [activeIdentity],
  );

  const navigateOnce = useCallback(
    (
      destination:
        | '/settings/change-password'
        | '/recordings'
        | '/settings/privacy'
        | '/settings/terms'
        | '/settings/delete-account',
    ) => {
      if (!renderCanHandle() || blockingOperationActive()) return;
      navigationStartedRef.current = true;
      router.navigate(destination);
    },
    [blockingOperationActive, renderCanHandle],
  );

  const commitUser = (next: User): boolean => {
    if (!renderOwnsIdentity()) return false;
    userRef.current = next;
    setUser(next);
    return true;
  };

  const mergeProfileField = (
    updated: User,
    field: Pick<User, 'name'> | Pick<User, 'nativeLanguage'> | Pick<User, 'uiLanguage'>,
  ): boolean => {
    const current = userRef.current;
    if (!renderCanHandle() || !current || current.id !== updated.id) return false;
    // Name and language are independently editable. Merge only the field this
    // request owns into the newest local profile so out-of-order PATCH replies
    // cannot undo a concurrent profile edit.
    return commitUser({ ...current, ...field });
  };

  // Re-sync the draft when the canonical name changes outside this field (a
  // refreshed /me, another session), but never clobber text being typed.
  useLayoutEffect(() => {
    if (!nameFocusedRef.current) {
      nameDirtyRef.current = false;
      nameDraftRef.current = canonicalName;
      setNameDraft(canonicalName);
    }
  }, [canonicalName]);

  useEffect(() => {
    let active = true;
    const reconcileReminder = () => {
      void getDailyReminder().then((stored) => {
        if (!active || !renderOwnsIdentityRef.current()) return;
        setReminder((current) => ({
          enabled: stored !== null,
          // Preserve the learner's chosen hour when a revoked OS permission
          // makes the preference disappear; re-enabling resumes there.
          hour: stored?.hour ?? current?.hour ?? DEFAULT_REMINDER_HOUR,
        }));
      });
    };
    reconcileReminder();
    let previousState: AppStateStatus | null = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToForeground = nextState === 'active' && previousState !== 'active';
      previousState = nextState;
      if (returnedToForeground) reconcileReminder();
    });
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, [activeIdentity]);

  // The route gate redirects after logout/session expiry.
  if (!user) return null;

  const trimmedName = nameDraft.trim();
  const canSaveName =
    trimmedName.length > 0 &&
    trimmedName.length <= MAX_NAME_LENGTH &&
    trimmedName !== user.name &&
    !nameBusy;

  const saveName = async () => {
    if (!renderCanHandle() || !canSaveName || nameBusyRef.current || logoutBusyRef.current) return;
    const submittedDraft = nameDraftRef.current;
    const submittedName = submittedDraft.trim();
    const current = userRef.current;
    if (
      !current ||
      submittedName.length === 0 ||
      submittedName.length > MAX_NAME_LENGTH ||
      submittedName === current.name
    ) {
      return;
    }
    nameBusyRef.current = true;
    publishNavigationLock();
    setNameBusy(true);
    setNameError(null);
    setNameSaved(false);
    try {
      const updated = await apiUpdateProfile({ name: submittedName });
      if (mergeProfileField(updated, { name: updated.name })) {
        // Text remains editable while the PATCH is in flight. Confirm the
        // submitted draft only if the learner has not already started the next
        // edit; otherwise preserve that newer input against the new canonical
        // name instead of clobbering it with a stale continuation.
        if (nameDraftRef.current === submittedDraft) {
          nameDraftRef.current = updated.name;
          nameDirtyRef.current = false;
          setNameDraft(updated.name);
          setNameSaved(true);
        } else {
          nameDirtyRef.current = nameDraftRef.current.trim() !== updated.name;
        }
      }
    } catch (error) {
      if (renderCanHandle()) {
        setNameError(userMessageForError(error, t('settings.updateFailed')));
      }
    } finally {
      nameBusyRef.current = false;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setNameBusy(false);
      }
    }
  };

  const chooseNativeLanguage = async (code: NativeLanguage) => {
    if (
      !renderCanHandle() ||
      code === user.nativeLanguage ||
      languageBusyRef.current ||
      logoutBusyRef.current
    ) {
      return;
    }
    languageBusyRef.current = true;
    publishNavigationLock();
    setLanguageBusy(true);
    setLanguageTarget({ scope: 'native', code });
    setLanguageError(null);
    setLanguageErrorScope(null);
    try {
      const updated = await apiUpdateProfile({ nativeLanguage: code });
      if (!mergeProfileField(updated, { nativeLanguage: updated.nativeLanguage })) {
        return;
      }
      // Help content is selected by the learning language, so every cached
      // translation from the former choice must be retired. UI copy and local
      // reminder text deliberately remain in user.uiLanguage.
      queryClient.removeQueries({ queryKey: ['question-help'] });
    } catch (error) {
      if (renderCanHandle()) {
        setLanguageErrorScope('native');
        setLanguageError(userMessageForError(error, t('settings.updateFailed')));
      }
    } finally {
      languageBusyRef.current = false;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setLanguageBusy(false);
        setLanguageTarget(null);
      }
    }
  };

  const chooseUiLanguage = async (code: UiLanguage) => {
    if (
      !renderCanHandle() ||
      code === user.uiLanguage ||
      languageBusyRef.current ||
      logoutBusyRef.current
    ) {
      return;
    }
    languageBusyRef.current = true;
    publishNavigationLock();
    setLanguageBusy(true);
    setLanguageTarget({ scope: 'ui', code });
    setLanguageError(null);
    setLanguageErrorScope(null);
    try {
      const updated = await apiUpdateProfile({ uiLanguage: code });
      if (!mergeProfileField(updated, { uiLanguage: updated.uiLanguage })) return;
      mirrorAccountLanguage(updated.uiLanguage);

      // Notification title/body/channel copy is baked into the OS schedule.
      // Rebuild it in the confirmed UI language. This is best effort: the
      // account preference already committed and must not be rolled back.
      const ownsReminderLatch = !reminderBusyRef.current;
      if (ownsReminderLatch) {
        reminderBusyRef.current = true;
        setReminderBusy(true);
      }
      try {
        const survived = await refreshDailyReminderLanguage(code);
        if (renderCanHandle()) {
          setReminder({
            enabled: survived !== null,
            hour: survived?.hour ?? reminder?.hour ?? DEFAULT_REMINDER_HOUR,
          });
        }
      } catch {
        const survived = await getDailyReminder();
        if (renderCanHandle()) {
          setReminder({
            enabled: survived !== null,
            hour: survived?.hour ?? reminder?.hour ?? DEFAULT_REMINDER_HOUR,
          });
          setReminderError(translateFor(code, 'reminder.failed'));
        }
      } finally {
        if (ownsReminderLatch) {
          reminderBusyRef.current = false;
          if (renderOwnsIdentity()) setReminderBusy(false);
        }
      }
    } catch (error) {
      if (renderCanHandle()) {
        setLanguageErrorScope('ui');
        setLanguageError(userMessageForError(error, t('settings.updateFailed')));
      }
    } finally {
      languageBusyRef.current = false;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setLanguageBusy(false);
        setLanguageTarget(null);
      }
    }
  };

  const exportData = async () => {
    if (!renderCanHandle() || exportBusyRef.current || logoutBusyRef.current) return;
    const controller = new AbortController();
    exportControllerRef.current = controller;
    exportBusyRef.current = true;
    publishNavigationLock();
    setExportBusy(true);
    setExportError(null);
    const exportArtifact: { current: OwnedPrivateFile | null } = { current: null };
    try {
      if (!(await Sharing.isAvailableAsync())) {
        if (!renderCanHandle()) return;
        setExportError(t('settings.exportUnavailable'));
        return;
      }
      if (!renderCanHandle()) return;
      let documentStarted = false;
      let hasAttempts = false;
      let attemptsFinished = false;
      let practiceCyclesStarted = false;
      let hasPracticeCycles = false;
      let practiceCyclesFinished = false;
      let recordingsStarted = false;
      let hasRecordings = false;
      await apiConsumeAccountExportPages(
        (page) => {
          if (controller.signal.aborted || !renderCanHandle() || page.user.id !== user.id) {
            controller.abort();
            throw new DOMException('The export session expired.', 'AbortError');
          }
          let encodedAttempts: (string | undefined)[] | null = null;
          if (!attemptsFinished) {
            encodedAttempts = page.attempts.map((attempt) => JSON.stringify(attempt));
            if (encodedAttempts.some((attempt) => typeof attempt !== 'string')) {
              throw new Error('The export contains an invalid attempt.');
            }
          }
          if (!documentStarted) {
            const encodedUser = JSON.stringify(page.user);
            const encodedPracticeProgress = JSON.stringify(page.practiceProgress);
            const encodedDiagnosticState = JSON.stringify(page.diagnosticState);
            if (
              typeof encodedUser !== 'string' ||
              typeof encodedPracticeProgress !== 'string' ||
              typeof encodedDiagnosticState !== 'string'
            ) {
              throw new Error('The export snapshots are invalid.');
            }
            exportArtifact.current = claimPrivateExportFile(user.id);
            exportArtifact.current.file.write(
              `{"user":${encodedUser},"practiceProgress":${encodedPracticeProgress},"diagnosticState":${encodedDiagnosticState},"attempts":[`,
              { encoding: 'utf8' },
            );
            documentStarted = true;
          }

          if (!attemptsFinished) {
            if (encodedAttempts && encodedAttempts.length > 0) {
              exportArtifact.current!.file.write(
                `${hasAttempts ? ',' : ''}${encodedAttempts.join(',')}`,
                {
                  append: true,
                  encoding: 'utf8',
                },
              );
              hasAttempts = true;
            }
            if (page.attemptsDone) {
              exportArtifact.current!.file.write('],"practiceCycles":[', {
                append: true,
                encoding: 'utf8',
              });
              attemptsFinished = true;
              practiceCyclesStarted = true;
            }
            return;
          }

          const encodedPracticeCycles = page.practiceCycles.map((cycle) => JSON.stringify(cycle));
          if (encodedPracticeCycles.some((cycle) => typeof cycle !== 'string')) {
            throw new Error('The export contains an invalid practice cycle.');
          }
          if (encodedPracticeCycles.length > 0) {
            exportArtifact.current!.file.write(
              `${hasPracticeCycles ? ',' : ''}${encodedPracticeCycles.join(',')}`,
              { append: true, encoding: 'utf8' },
            );
            hasPracticeCycles = true;
          }
          practiceCyclesFinished = page.practiceCyclesDone;
        },
        (page) => {
          if (
            controller.signal.aborted ||
            !renderCanHandle() ||
            !documentStarted ||
            !attemptsFinished ||
            !practiceCyclesStarted ||
            !practiceCyclesFinished ||
            !exportArtifact.current
          ) {
            controller.abort();
            throw new DOMException('The export session expired.', 'AbortError');
          }
          if (!recordingsStarted) {
            exportArtifact.current.file.write('],"recordings":[', {
              append: true,
              encoding: 'utf8',
            });
            recordingsStarted = true;
          }
          const encodedRecordings = page.recordings.map((recording) => JSON.stringify(recording));
          if (encodedRecordings.some((recording) => typeof recording !== 'string')) {
            throw new Error('The export contains an invalid recording.');
          }
          if (encodedRecordings.length > 0) {
            exportArtifact.current.file.write(
              `${hasRecordings ? ',' : ''}${encodedRecordings.join(',')}`,
              {
                append: true,
                encoding: 'utf8',
              },
            );
            hasRecordings = true;
          }
        },
        controller.signal,
      );
      if (!renderCanHandle()) return;
      // A successful walker always emits its final (possibly empty) page.
      // Fail closed if a mocked or incompatible implementation violates that
      // contract instead of sharing a malformed file.
      if (!documentStarted) throw new Error('The export returned no pages.');
      if (!attemptsFinished) throw new Error('The attempt export did not finish.');
      if (!practiceCyclesStarted || !practiceCyclesFinished) {
        throw new Error('The practice-cycle export did not finish.');
      }
      if (!recordingsStarted) throw new Error('The recording export returned no pages.');
      const completedArtifact = exportArtifact.current;
      if (completedArtifact === null) throw new Error('The export file is unavailable.');
      completedArtifact.file.write(']}', { append: true, encoding: 'utf8' });
      await Sharing.shareAsync(completedArtifact.file.uri, {
        mimeType: 'application/json',
        dialogTitle: t('settings.export'),
      });
    } catch (error) {
      if (renderCanHandle() && !controller.signal.aborted) {
        setExportError(userMessageForError(error, t('settings.exportFailed')));
      }
    } finally {
      // The export contains PII; delete every created cache file after success,
      // page/write/share failure, or a session-triggered abort. Cleanup failure
      // must not mask the original outcome.
      try {
        exportArtifact.current?.release();
      } catch {
        // The OS cache eviction will reclaim it eventually.
      }
      exportControllerRef.current = null;
      exportBusyRef.current = false;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setExportBusy(false);
      }
    }
  };

  const deleteAllRecordings = (): boolean => {
    if (!renderCanHandle() || blockingOperationActive()) return false;
    const operation = Symbol('delete-all-recordings');
    const controller = new AbortController();
    recordingsDeleteBusyRef.current = operation;
    recordingsDeleteControllerRef.current = controller;
    publishNavigationLock();
    setRecordingsDeleteBusy(true);
    setRecordingsDeleteSucceeded(false);
    setRecordingsDeleteError(null);
    void (async () => {
      const operationIsCurrent = () =>
        recordingsDeleteBusyRef.current === operation &&
        recordingsDeleteControllerRef.current === controller &&
        !controller.signal.aborted &&
        renderCanHandle();
      try {
        await apiDeleteAllRecordings(controller.signal);
        if (!operationIsCurrent()) return;
        await Promise.all([
          queryClient.cancelQueries({ queryKey: ['recordings', user.id], exact: true }),
          queryClient.cancelQueries({ queryKey: ['practice-history', user.id], exact: true }),
        ]);
        if (!operationIsCurrent()) return;

        // Retire inactive pages immediately so navigating back can never flash
        // an audio action that no longer exists. Active pages stay mounted and
        // are invalidated below, which lets their observers refetch safely.
        queryClient.removeQueries({
          queryKey: ['recordings', user.id],
          exact: true,
          type: 'inactive',
        });
        queryClient.removeQueries({
          queryKey: ['practice-history', user.id],
          exact: true,
          type: 'inactive',
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['recordings', user.id], exact: true }),
          queryClient.invalidateQueries({
            queryKey: ['practice-history', user.id],
            exact: true,
          }),
        ]);
        if (!operationIsCurrent()) return;
        setRecordingsDeleteSucceeded(true);
        AccessibilityInfo.announceForAccessibility(t('settings.recordingsDeleteAllSuccess'));
      } catch (error) {
        if (operationIsCurrent()) {
          setRecordingsDeleteError(
            userMessageForError(error, t('settings.recordingsDeleteAllFailed')),
          );
        }
      } finally {
        if (recordingsDeleteControllerRef.current === controller) {
          recordingsDeleteControllerRef.current = null;
        }
        if (recordingsDeleteBusyRef.current !== operation) return;
        recordingsDeleteBusyRef.current = null;
        if (renderOwnsIdentity()) {
          publishNavigationLock();
          setRecordingsDeleteBusy(false);
        }
      }
    })();
    return true;
  };

  const confirmDeleteAllRecordings = () => {
    if (!renderCanHandle() || blockingOperationActive()) return;
    const confirmationOwner = Symbol('confirm-delete-all-recordings');
    recordingsDeleteConfirmingRef.current = confirmationOwner;
    setRecordingsDeleteConfirming(true);
    setRecordingsDeleteSucceeded(false);
    setRecordingsDeleteError(null);
    publishNavigationLock();
    const closeConfirmation = () => {
      if (recordingsDeleteConfirmingRef.current !== confirmationOwner) return;
      recordingsDeleteConfirmingRef.current = null;
      if (!renderOwnsIdentity()) return;
      setRecordingsDeleteConfirming(false);
      publishNavigationLock();
    };
    Alert.alert(
      t('settings.recordingsDeleteAllTitle'),
      t('settings.recordingsDeleteAllBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: closeConfirmation },
        {
          text: t('settings.recordingsDeleteAllConfirm'),
          style: 'destructive',
          onPress: () => {
            if (recordingsDeleteConfirmingRef.current !== confirmationOwner) return;
            recordingsDeleteConfirmingRef.current = null;
            if (!renderOwnsIdentity()) return;
            setRecordingsDeleteConfirming(false);
            if (!deleteAllRecordings()) publishNavigationLock();
          },
        },
      ],
      { cancelable: true, onDismiss: closeConfirmation },
    );
  };

  const applyReminder = async (next: ReminderState) => {
    if (
      !renderCanHandle() ||
      reminderBusyRef.current ||
      languageBusyRef.current ||
      logoutBusyRef.current
    ) {
      return;
    }
    reminderBusyRef.current = true;
    publishNavigationLock();
    setReminderBusy(true);
    setReminderError(null);
    try {
      if (next.enabled) {
        const outcome = await enableDailyReminder(next.hour, language);
        if (!renderCanHandle()) return;
        if (outcome === 'denied') {
          setReminder({ enabled: false, hour: next.hour });
          setReminderError(t('reminder.denied'));
          return;
        }
      } else {
        await disableDailyReminder();
        if (!renderCanHandle()) return;
      }
      setReminder(next);
    } catch {
      if (renderCanHandle()) setReminderError(t('reminder.failed'));
    } finally {
      reminderBusyRef.current = false;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setReminderBusy(false);
      }
    }
  };

  const toggleReminder = (current: ReminderState) => {
    if (!renderCanHandle()) return;
    void applyReminder({ enabled: !current.enabled, hour: current.hour });
  };

  const shiftReminderHour = (current: ReminderState, delta: number) => {
    if (!renderCanHandle() || !current.enabled) return;
    void applyReminder({ enabled: true, hour: (current.hour + delta + 24) % 24 });
  };

  const openAdPrivacyOptions = async () => {
    if (!renderCanHandle() || blockingOperationActive()) return;
    const operationOwner = Symbol('ad-privacy-options');
    privacyBusyRef.current = operationOwner;
    publishNavigationLock();
    setPrivacyBusy(true);
    setPrivacyError(null);
    try {
      if (!(await showPrivacyOptions()) && renderCanHandle()) {
        setPrivacyError(t('ads.privacyFailed'));
      }
    } catch {
      if (renderCanHandle()) setPrivacyError(t('ads.privacyFailed'));
    } finally {
      if (privacyBusyRef.current !== operationOwner) return;
      privacyBusyRef.current = null;
      if (renderOwnsIdentity()) {
        publishNavigationLock();
        setPrivacyBusy(false);
      }
    }
  };

  const retakeTest = (): boolean => {
    if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {
      return false;
    }
    retakeBusyRef.current = true;
    publishNavigationLock();
    setRetakeBusy(true);
    setRetakeError(null);
    void (async () => {
      try {
        await apiRestartDiagnostic();
        if (!renderCanHandle()) return;
        // The level being retired owned these caches; drop them before the gate
        // guards flip so no stale question or count can flash afterwards. The
        // placement test's own /next payload is retired too: its key is unchanged
        // by a retake, so a fresh entry would re-serve the question the learner
        // already answered (or the old completion screen) into the reset test,
        // costing a 409 mismatch and minutes of recovery lock.
        queryClient.removeQueries({ queryKey: ['diagnostic-next'] });
        queryClient.removeQueries({ queryKey: ['practice-question'] });
        // Home can remain mounted underneath this settings route during the
        // guard transition. Do not delete its live observer out from under it;
        // diagnostic completion clears the now-inactive stats cache before Home
        // is allowed back at a newly assigned level.
        queryClient.removeQueries({ queryKey: ['practice-stats'], type: 'inactive' });
        queryClient.removeQueries({ queryKey: ['practice-history'] });
        resetPracticeFlow();
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        // Rebuild from the ref, not from this handler's closure: a name or
        // language change that resolved while the restart was in flight is
        // already the session user, and the stale copy would revert it.
        const current = userRef.current;
        if (!current || !commitUser({ ...current, diagnosticCompleted: false, cefrLevel: null })) {
          return;
        }
        navigationStartedRef.current = true;
        router.replace('/diagnostic');
      } catch (error) {
        if (renderCanHandle()) {
          setRetakeError(userMessageForError(error, t('retake.failed')));
        }
      } finally {
        retakeBusyRef.current = false;
        if (renderOwnsIdentity()) {
          publishNavigationLock();
          setRetakeBusy(false);
        }
      }
    })();
    return true;
  };

  const confirmRetake = () => {
    if (
      !renderCanHandle() ||
      retakeBusyRef.current ||
      retakeConfirmingRef.current !== null ||
      logoutBusyRef.current
    ) {
      return;
    }
    const confirmationOwner = Symbol();
    retakeConfirmingRef.current = confirmationOwner;
    setRetakeConfirming(true);
    publishNavigationLock();
    const closeConfirmation = () => {
      if (retakeConfirmingRef.current !== confirmationOwner) return;
      retakeConfirmingRef.current = null;
      if (!renderOwnsIdentity()) return;
      setRetakeConfirming(false);
      publishNavigationLock();
    };
    Alert.alert(
      t('retake.confirmTitle'),
      t('retake.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: closeConfirmation },
        {
          text: t('retake.confirm'),
          style: 'destructive',
          onPress: () => {
            if (retakeConfirmingRef.current !== confirmationOwner) return;
            retakeConfirmingRef.current = null;
            if (!renderOwnsIdentity()) return;
            setRetakeConfirming(false);
            if (!retakeTest()) publishNavigationLock();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: closeConfirmation,
      },
    );
  };

  const handleLogout = async () => {
    // A slow logout runs to the request timeout, and a second tap would throw
    // out of the auth transition guard — alerting a logout failure over a
    // logout that is in fact succeeding.
    if (!renderCanHandle() || blockingOperationActive()) return;
    logoutBusyRef.current = true;
    publishNavigationLock();
    setLogoutBusy(true);
    try {
      await logout();
      if (renderIsMountedIdentity()) {
        navigationStartedRef.current = true;
        router.replace('/');
      }
    } catch (error) {
      if (error instanceof LogoutCleanupError) {
        Alert.alert(t('logout.cleanupTitle'), error.message);
      } else if (renderIsMountedIdentity()) {
        Alert.alert(t('logout.failedTitle'), t('logout.localBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('logout.thisDevice'),
            style: 'destructive',
            onPress: () => {
              if (!renderIsMountedIdentity()) return;
              resetStoredSession();
              router.replace('/');
            },
          },
        ]);
      }
    } finally {
      logoutBusyRef.current = false;
      if (renderIsMountedIdentity()) {
        publishNavigationLock();
        setLogoutBusy(false);
      }
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {t('settings.profileTitle')}
        </Text>

        <Text style={styles.label}>{t('signup.nameLabel')}</Text>
        <View style={styles.nameRow}>
          <TextInput
            accessibilityLabel={t('signup.nameLabel')}
            style={[styles.input, styles.nameInput, nameFocused && styles.inputFocused]}
            value={nameDraft}
            onChangeText={(value) => {
              if (!renderCanHandle()) return;
              nameDraftRef.current = value;
              nameDirtyRef.current = value !== (userRef.current?.name ?? '');
              setNameDraft(value);
              setNameSaved(false);
            }}
            onFocus={() => {
              if (!renderCanHandle()) return;
              nameFocusedRef.current = true;
              setNameFocused(true);
            }}
            onBlur={() => {
              if (!renderOwnsIdentity()) return;
              nameFocusedRef.current = false;
              setNameFocused(false);
              if (!nameDirtyRef.current) {
                const currentName = userRef.current?.name ?? '';
                nameDraftRef.current = currentName;
                setNameDraft(currentName);
              }
            }}
            placeholder={t('signup.namePlaceholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={() => void saveName()}
            maxLength={MAX_NAME_LENGTH}
          />
          <Button
            title={nameBusy ? t('settings.saveNameBusy') : t('settings.saveName')}
            size="sm"
            disabled={!canSaveName || logoutBusy}
            loading={nameBusy}
            onPress={() => void saveName()}
            style={styles.nameAction}
          />
        </View>
        {nameSaved && (
          <Text accessibilityLiveRegion="polite" style={styles.savedNote}>
            {t('settings.saved')}
          </Text>
        )}
        {nameError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {nameError}
          </Text>
        )}

        <Text style={styles.label}>{t('login.emailLabel')}</Text>
        <Text style={styles.valueText}>{user.email}</Text>

        <Text style={styles.label}>{t('settings.levelLabel')}</Text>
        <Text style={styles.valueText}>
          {user.cefrLevel
            ? `${user.cefrLevel} — ${t(`cefr.${user.cefrLevel}`)}`
            : t('settings.levelPending')}
        </Text>

        <Text style={styles.label}>{t('settings.appLanguageLabel')}</Text>
        <Text style={styles.languageHelp}>{t('settings.appLanguageHelp')}</Text>
        <View style={styles.languageGrid}>
          {UI_LANGUAGE_OPTIONS.map((lang) => {
            const selected = user.uiLanguage === lang.code;
            const saving =
              languageBusy && languageTarget?.scope === 'ui' && languageTarget.code === lang.code;
            return (
              <Pressable
                key={lang.code}
                accessibilityRole="button"
                accessibilityLabel={`${t('settings.appLanguageLabel')}: ${lang.english}, ${lang.native}`}
                accessibilityState={{ selected, busy: saving }}
                disabled={languageBusy || logoutBusy}
                onPress={() => void chooseUiLanguage(lang.code)}
                style={[
                  styles.languageChip,
                  selected && styles.languageChipSelected,
                  (languageBusy || logoutBusy) && !selected && styles.controlDisabled,
                ]}
              >
                <Text style={[styles.languageNative, selected && styles.languageTextSelected]}>
                  {lang.native}
                </Text>
                <Text style={[styles.languageEnglish, selected && styles.languageTextSelected]}>
                  {lang.english}
                </Text>
                <View testID={`app-language-status-${lang.code}`} style={styles.languageChipStatus}>
                  {saving && (
                    <ActivityIndicator
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      size="small"
                      color={colors.primary}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        {languageError && languageErrorScope === 'ui' && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {languageError}
          </Text>
        )}

        <Text style={styles.label}>{t('settings.learningLanguageLabel')}</Text>
        <Text style={styles.languageHelp}>{t('settings.learningLanguageHelp')}</Text>
        <View style={styles.languageGrid}>
          {NATIVE_LANGUAGE_OPTIONS.map((lang) => {
            const selected = user.nativeLanguage === lang.code;
            const saving =
              languageBusy &&
              languageTarget?.scope === 'native' &&
              languageTarget.code === lang.code;
            return (
              <Pressable
                key={lang.code}
                accessibilityRole="button"
                accessibilityLabel={`${lang.english}, ${lang.native}`}
                accessibilityState={{ selected, busy: saving }}
                disabled={languageBusy || logoutBusy}
                onPress={() => void chooseNativeLanguage(lang.code)}
                style={[
                  styles.languageChip,
                  selected && styles.languageChipSelected,
                  (languageBusy || logoutBusy) && !selected && styles.controlDisabled,
                ]}
              >
                <Text style={[styles.languageNative, selected && styles.languageTextSelected]}>
                  {lang.native}
                </Text>
                <Text style={[styles.languageEnglish, selected && styles.languageTextSelected]}>
                  {lang.english}
                </Text>
                <View
                  testID={`learning-language-status-${lang.code}`}
                  style={styles.languageChipStatus}
                >
                  {saving && (
                    <ActivityIndicator
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      size="small"
                      color={colors.primary}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        {languageError && languageErrorScope === 'native' && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {languageError}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {t('reminder.toggleLabel')}
        </Text>
        {reminder && (
          <>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('reminder.toggleLabel')}
              accessibilityState={{
                checked: reminder.enabled,
                busy: reminderBusy,
              }}
              disabled={reminderBusy || languageBusy || logoutBusy}
              onPress={() => toggleReminder(reminder)}
              style={[
                styles.reminderToggle,
                reminder.enabled && styles.reminderToggleOn,
                (reminderBusy || languageBusy || logoutBusy) && styles.controlDisabled,
              ]}
            >
              <Text
                style={[styles.reminderToggleText, reminder.enabled && styles.reminderToggleTextOn]}
              >
                {t('reminder.toggleLabel')}
              </Text>
            </Pressable>
            {reminder.enabled && (
              <View style={styles.reminderTimeRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('reminder.earlier')}
                  disabled={reminderBusy || languageBusy || logoutBusy}
                  onPress={() => shiftReminderHour(reminder, -1)}
                  style={({ pressed }) => [
                    styles.hourButton,
                    (reminderBusy || languageBusy || logoutBusy) && styles.controlDisabled,
                    pressed && styles.hourButtonPressed,
                  ]}
                >
                  <Text style={styles.hourButtonText}>−</Text>
                </Pressable>
                <Text style={styles.reminderTimeText}>
                  {t('reminder.timeLabel', { time: formatReminderHour(reminder.hour, language) })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('reminder.later')}
                  disabled={reminderBusy || languageBusy || logoutBusy}
                  onPress={() => shiftReminderHour(reminder, 1)}
                  style={({ pressed }) => [
                    styles.hourButton,
                    (reminderBusy || languageBusy || logoutBusy) && styles.controlDisabled,
                    pressed && styles.hourButtonPressed,
                  ]}
                >
                  <Text style={styles.hourButtonText}>+</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
        {reminderError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {reminderError}
          </Text>
        )}
      </View>

      {(privacyOptionsRequired || privacyBusy || privacyError) && (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {t('ads.privacyOptions')}
          </Text>
          {privacyOptionsRequired && (
            <>
              <Text style={styles.privacyHelp}>{t('ads.privacyOptionsHelp')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: privacyBusy, disabled: screenBusy }}
                disabled={screenBusy}
                onPress={() => void openAdPrivacyOptions()}
                style={({ pressed }) => [
                  styles.actionRow,
                  screenBusy && styles.controlDisabled,
                  pressed && styles.actionRowPressed,
                ]}
              >
                <Text style={styles.actionText}>{t('ads.privacyOptions')}</Text>
              </Pressable>
            </>
          )}
          {privacyBusy && (
            <ActivityIndicator
              accessibilityLabel={t('ads.privacyOptions')}
              style={styles.privacySpinner}
              color={colors.primary}
            />
          )}
          {privacyError && (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {privacyError}
            </Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {t('menu.accountTitle')}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => navigateOnce('/recordings')}
        >
          <Text style={styles.actionText}>{t('header.recordings')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('settings.recordingsDeleteAllHint')}
          accessibilityState={{ busy: recordingsDeleteBusy, disabled: screenBusy }}
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={confirmDeleteAllRecordings}
        >
          <Text style={[styles.actionText, styles.actionTextDanger]}>
            {recordingsDeleteBusy
              ? t('settings.recordingsDeleteAllBusy')
              : t('settings.recordingsDeleteAll')}
          </Text>
        </Pressable>
        <Text style={styles.actionHelp}>{t('settings.recordingsDeleteAllHint')}</Text>
        {recordingsDeleteSucceeded && (
          <Text accessibilityLiveRegion="polite" style={styles.savedNote}>
            {t('settings.recordingsDeleteAllSuccess')}
          </Text>
        )}
        {recordingsDeleteError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {recordingsDeleteError}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => navigateOnce('/settings/change-password')}
        >
          <Text style={styles.actionText}>{t('header.changePassword')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: exportBusy }}
          disabled={exportBusy || logoutBusy}
          style={({ pressed }) => [
            styles.actionRow,
            (exportBusy || logoutBusy) && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => void exportData()}
        >
          <Text style={styles.actionText}>
            {exportBusy ? t('settings.exportBusy') : t('settings.export')}
          </Text>
        </Pressable>
        <Text style={styles.actionHelp}>{t('settings.exportHelp')}</Text>
        {exportError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {exportError}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: retakeBusy }}
          disabled={retakeBusy || retakeConfirming || logoutBusy}
          style={({ pressed }) => [
            styles.actionRow,
            (retakeBusy || retakeConfirming || logoutBusy) && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={confirmRetake}
        >
          <Text style={styles.actionText}>{t('settings.retake')}</Text>
        </Pressable>
        {retakeError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {retakeError}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => navigateOnce('/settings/privacy')}
        >
          <Text style={styles.actionText}>{t('header.privacy')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => navigateOnce('/settings/terms')}
        >
          <Text style={styles.actionText}>{t('header.terms')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: logoutBusy }}
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => void handleLogout()}
        >
          <Text style={styles.actionText}>{t('common.logOut')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={screenBusy}
          style={({ pressed }) => [
            styles.actionRow,
            styles.actionRowLast,
            screenBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => navigateOnce('/settings/delete-account')}
        >
          <Text style={[styles.actionText, styles.actionTextDanger]}>
            {t('header.deleteAccount')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  container: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: layout.screenPadding,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  valueText: {
    fontSize: 16,
    color: colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBackground,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  nameInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    minWidth: 0,
  },
  nameAction: {
    flexShrink: 0,
  },
  savedNote: {
    marginTop: 6,
    color: colors.success,
    fontSize: 13,
  },
  fieldError: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 13,
  },
  languageHelp: {
    marginBottom: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    flexBasis: '47%',
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  languageChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  languageNative: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  languageEnglish: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  languageTextSelected: {
    color: colors.primary,
  },
  languageChipStatus: {
    height: spacing.lg,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: {
    opacity: 0.5,
  },
  reminderToggle: {
    marginTop: spacing.md,
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.ml,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  privacyHelp: {
    marginTop: spacing.md,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  privacySpinner: {
    marginTop: spacing.sm,
  },
  reminderToggleOn: {
    backgroundColor: colors.primary,
  },
  reminderToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  reminderToggleTextOn: {
    color: colors.onPrimary,
  },
  reminderTimeRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  hourButton: {
    flexShrink: 0,
    width: layout.minimumTarget,
    height: layout.minimumTarget,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
  hourButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  reminderTimeText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionRow: {
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionRowPressed: {
    backgroundColor: colors.background,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  actionHelp: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionTextDanger: {
    color: colors.danger,
  },
}));
