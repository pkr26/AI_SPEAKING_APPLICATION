import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';

import Button from '../../components/Button';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  AccountDeletedCleanupError,
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

export default function DeleteAccountScreen() {
  const { deleteAccount } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = password.length > 0 ? comparablePasswordError(password, t) : null;
  const canSubmit = password.length > 0 && passwordError === null && !busy;

  const performDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      queryClient.clear();
      Alert.alert(t('da.deletedTitle'), t('da.deletedBody'), [
        { text: t('common.ok'), onPress: () => router.replace('/') },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t('da.wrongPassword'));
      } else if (err instanceof AccountDeletedCleanupError) {
        setError(err.message);
      } else {
        setError(userMessageForError(err, t('da.failed')));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Alert.alert(t('da.confirmTitle'), t('da.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('da.confirmDelete'),
        style: 'destructive',
        onPress: () => void performDelete(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.warningCard}>
          <Text accessibilityRole="header" style={styles.warningTitle}>
            {t('da.warningTitle')}
          </Text>
          <Text style={styles.warningText}>{t('da.warningBody')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('da.passwordLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel={t('da.passwordLabel')}
              style={[styles.input, styles.inputWithAction, passwordFocused && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder={t('da.passwordPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible ? t('common.hidePassword') : t('common.showPassword')
              }
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={styles.inputAction}
            >
              <Text style={styles.inputActionText}>
                {passwordVisible ? t('common.hide') : t('common.show')}
              </Text>
            </Pressable>
          </View>
          {passwordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {passwordError}
            </Text>
          )}

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? t('da.submitBusy') : t('da.submit')}
            variant="danger"
            disabled={!canSubmit}
            loading={busy}
            onPress={handleSubmit}
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  warningCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: radii.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.ml,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
  },
  warningText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.md,
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
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithAction: {
    paddingRight: 64,
  },
  inputAction: {
    position: 'absolute',
    right: 4,
    minHeight: layout.minimumTarget,
    minWidth: layout.minimumTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  inputActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  fieldError: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 13,
  },
  deleteButton: {
    marginTop: spacing.lg,
  },
}));
