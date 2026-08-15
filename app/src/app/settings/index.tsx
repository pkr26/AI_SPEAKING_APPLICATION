import { useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import Button from '../../components/Button';
import {
  apiExportUserData,
  apiRestartDiagnostic,
  apiUpdateProfile,
  userMessageForError,
} from '../../lib/api';
import { LogoutCleanupError, MAX_NAME_LENGTH, useAuth } from '../../lib/auth';
import {
  DEFAULT_REMINDER_HOUR,
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
} from '../../lib/daily-reminder';
import { useT, useI18n, type UiLanguage } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import type { NativeLanguage } from '../../lib/types';

const LANGUAGES: { code: NativeLanguage; english: string; native: string }[] = [
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'es', english: 'Spanish', native: 'Español' },
  { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
];

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
 * name + native-language editing (the language drives the whole UI language),
 * data export, daily reminder, placement-test retake, legal pages, log out,
 * and delete account.
 */
export default function SettingsScreen() {
  const { user, setUser, logout } = useAuth();
  const t = useT();
  const { language } = useI18n();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const queryClient = useQueryClient();

  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [nameFocused, setNameFocused] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [languageBusy, setLanguageBusy] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [reminder, setReminder] = useState<ReminderState | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [retakeBusy, setRetakeBusy] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getDailyReminder().then((stored) => {
      if (active) {
        setReminder({ enabled: stored !== null, hour: stored?.hour ?? DEFAULT_REMINDER_HOUR });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // The route gate redirects after logout/session expiry.
  if (!user) return null;

  const trimmedName = nameDraft.trim();
  const canSaveName =
    trimmedName.length > 0 &&
    trimmedName.length <= MAX_NAME_LENGTH &&
    trimmedName !== user.name &&
    !nameBusy;

  const saveName = async () => {
    if (!canSaveName) return;
    setNameBusy(true);
    setNameError(null);
    setNameSaved(false);
    try {
      const updated = await apiUpdateProfile({ name: trimmedName });
      setUser(updated);
      setNameDraft(updated.name);
      setNameSaved(true);
    } catch (error) {
      setNameError(userMessageForError(error, t('settings.updateFailed')));
    } finally {
      setNameBusy(false);
    }
  };

  const chooseLanguage = async (code: NativeLanguage) => {
    if (code === user.nativeLanguage || languageBusy) return;
    setLanguageBusy(true);
    setLanguageError(null);
    try {
      // The server confirms first; setUser then re-renders the whole UI in the
      // new language immediately (nativeLanguage drives the i18n provider).
      const updated = await apiUpdateProfile({ nativeLanguage: code });
      setUser(updated);
      // Question help and native-mode content are keyed by language.
      void queryClient.invalidateQueries({ queryKey: ['question-help'] });
      // The scheduled reminder copy was baked in the old language. Re-schedule
      // it in the new one — explicitly, because the module-level active
      // language only updates on the render after setUser. Best effort: the
      // language change already succeeded, so a failed re-schedule must not
      // surface as a language error.
      if (reminder?.enabled) {
        try {
          await enableDailyReminder(reminder.hour, code);
        } catch {
          // The reminder keeps its previous language until the next toggle.
        }
      }
    } catch (error) {
      setLanguageError(userMessageForError(error, t('settings.updateFailed')));
    } finally {
      setLanguageBusy(false);
    }
  };

  const exportData = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    setExportError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setExportError(t('settings.exportUnavailable'));
        return;
      }
      const data = await apiExportUserData();
      const file = new File(Paths.cache, `ai-english-coach-data-${Date.now()}.json`);
      file.write(JSON.stringify(data, null, 2));
      try {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: t('settings.export'),
        });
      } finally {
        // The export contains PII; never leave it in the app cache once the
        // share sheet is done. Cleanup failure must not mask the share outcome.
        try {
          file.delete();
        } catch {
          // The OS cache eviction will reclaim it eventually.
        }
      }
    } catch (error) {
      setExportError(userMessageForError(error, t('settings.exportFailed')));
    } finally {
      setExportBusy(false);
    }
  };

  const applyReminder = async (next: ReminderState) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderError(null);
    try {
      if (next.enabled) {
        const outcome = await enableDailyReminder(next.hour);
        if (outcome === 'denied') {
          setReminder((current) => ({
            enabled: false,
            hour: next.hour ?? current?.hour ?? DEFAULT_REMINDER_HOUR,
          }));
          setReminderError(t('reminder.denied'));
          return;
        }
      } else {
        await disableDailyReminder();
      }
      setReminder(next);
    } catch {
      setReminderError(t('reminder.failed'));
    } finally {
      setReminderBusy(false);
    }
  };

  const toggleReminder = () => {
    if (!reminder) return;
    void applyReminder({ enabled: !reminder.enabled, hour: reminder.hour });
  };

  const shiftReminderHour = (delta: number) => {
    if (!reminder || !reminder.enabled) return;
    void applyReminder({ enabled: true, hour: (reminder.hour + delta + 24) % 24 });
  };

  const confirmRetake = () => {
    Alert.alert(t('retake.confirmTitle'), t('retake.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('retake.confirm'), style: 'destructive', onPress: () => void retakeTest() },
    ]);
  };

  const retakeTest = async () => {
    if (retakeBusy) return;
    setRetakeBusy(true);
    setRetakeError(null);
    try {
      await apiRestartDiagnostic();
      // The level being retired owned these caches; drop them before the gate
      // guards flip so no stale question or count can flash afterwards.
      queryClient.removeQueries({ queryKey: ['practice-question'] });
      queryClient.removeQueries({ queryKey: ['practice-stats'] });
      queryClient.removeQueries({ queryKey: ['practice-history'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      setUser({ ...user, diagnosticCompleted: false, cefrLevel: null });
      router.replace('/diagnostic');
    } catch (error) {
      setRetakeError(userMessageForError(error, t('retake.failed')));
    } finally {
      setRetakeBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      if (error instanceof LogoutCleanupError) {
        Alert.alert(t('logout.cleanupTitle'), error.message);
      } else {
        Alert.alert(t('logout.failedTitle'), t('logout.failedBody'));
      }
    }
  };

  const selectedLanguage = LANGUAGES.find((lang) => lang.code === user.nativeLanguage);

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
              setNameDraft(value);
              setNameSaved(false);
            }}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
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
            disabled={!canSaveName}
            loading={nameBusy}
            onPress={() => void saveName()}
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

        <Text style={styles.label}>{t('signup.languageLabel')}</Text>
        <View style={styles.languageGrid}>
          {LANGUAGES.map((lang) => {
            const selected = user.nativeLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                accessibilityRole="button"
                accessibilityLabel={`${lang.english}, ${lang.native}`}
                accessibilityState={{ selected, disabled: languageBusy }}
                disabled={languageBusy}
                onPress={() => void chooseLanguage(lang.code)}
                style={[
                  styles.languageChip,
                  selected && styles.languageChipSelected,
                  languageBusy && !selected && styles.controlDisabled,
                ]}
              >
                <Text style={[styles.languageNative, selected && styles.languageTextSelected]}>
                  {lang.native}
                </Text>
                <Text style={[styles.languageEnglish, selected && styles.languageTextSelected]}>
                  {lang.english}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedLanguage && languageBusy && (
          <ActivityIndicator style={styles.languageSpinner} color={colors.primary} />
        )}
        {languageError && (
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
                disabled: reminderBusy,
                busy: reminderBusy,
              }}
              disabled={reminderBusy}
              onPress={toggleReminder}
              style={[
                styles.reminderToggle,
                reminder.enabled && styles.reminderToggleOn,
                reminderBusy && styles.controlDisabled,
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
                  accessibilityState={{ disabled: reminderBusy }}
                  disabled={reminderBusy}
                  onPress={() => shiftReminderHour(-1)}
                  style={({ pressed }) => [
                    styles.hourButton,
                    reminderBusy && styles.controlDisabled,
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
                  accessibilityState={{ disabled: reminderBusy }}
                  disabled={reminderBusy}
                  onPress={() => shiftReminderHour(1)}
                  style={({ pressed }) => [
                    styles.hourButton,
                    reminderBusy && styles.controlDisabled,
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

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {t('menu.accountTitle')}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          onPress={() => router.push('/settings/change-password')}
        >
          <Text style={styles.actionText}>{t('header.changePassword')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: exportBusy, busy: exportBusy }}
          disabled={exportBusy}
          style={({ pressed }) => [
            styles.actionRow,
            exportBusy && styles.controlDisabled,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => void exportData()}
        >
          <Text style={styles.actionText}>
            {exportBusy ? t('settings.exportBusy') : t('settings.export')}
          </Text>
        </Pressable>
        {exportError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {exportError}
          </Text>
        )}

        {user.diagnosticCompleted && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: retakeBusy, busy: retakeBusy }}
            disabled={retakeBusy}
            style={({ pressed }) => [
              styles.actionRow,
              retakeBusy && styles.controlDisabled,
              pressed && styles.actionRowPressed,
            ]}
            onPress={confirmRetake}
          >
            <Text style={styles.actionText}>{t('settings.retake')}</Text>
          </Pressable>
        )}
        {retakeError && (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {retakeError}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          onPress={() => router.push('/settings/privacy')}
        >
          <Text style={styles.actionText}>{t('header.privacy')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          onPress={() => router.push('/settings/terms')}
        >
          <Text style={styles.actionText}>{t('header.terms')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          onPress={() => void handleLogout()}
        >
          <Text style={styles.actionText}>{t('common.logOut')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionRow,
            styles.actionRowLast,
            pressed && styles.actionRowPressed,
          ]}
          onPress={() => router.push('/settings/delete-account')}
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
    borderWidth: 2,
    borderColor: colors.primary,
  },
  nameInput: {
    flex: 1,
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
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    flexBasis: '47%',
    flexGrow: 1,
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
  languageSpinner: {
    marginTop: spacing.sm,
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
  },
  hourButton: {
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
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
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
  actionTextDanger: {
    color: colors.danger,
  },
}));
