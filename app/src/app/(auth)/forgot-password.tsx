import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import { apiForgotPassword, userMessageForError } from '../../lib/api';
import { MAX_EMAIL_LENGTH } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

/**
 * Password reset, step 1: email entry. A successful request always advances to
 * the same neutral "if an account exists" state — the server never reveals
 * whether the email has an account, and neither does this screen.
 */
export default function ForgotPasswordScreen() {
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.length > 0 && trimmedEmail.length <= MAX_EMAIL_LENGTH && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await apiForgotPassword(trimmedEmail);
      setSent(true);
    } catch (err) {
      // Only transport/rate-limit failures surface; the 204 contract itself
      // never distinguishes existing from unknown accounts.
      setError(userMessageForError(err, t('reset.requestFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('reset.sentTitle')}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
            {t('reset.sentBody')}
          </Text>
          <Button
            title={t('reset.continue')}
            onPress={() =>
              router.push({ pathname: '/reset-password', params: { email: trimmedEmail } })
            }
            style={styles.submitButton}
          />
          <Link href="/login" style={styles.footerLink}>
            {t('reset.backToLogin')}
          </Link>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            {t('reset.requestTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('reset.requestBody')}</Text>

          <Text style={styles.label}>{t('login.emailLabel')}</Text>
          <TextInput
            accessibilityLabel={t('login.emailLabel')}
            style={[styles.input, emailFocused && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder={t('login.emailPlaceholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
            maxLength={MAX_EMAIL_LENGTH}
          />

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? t('reset.submitRequestBusy') : t('reset.submitRequest')}
            disabled={!canSubmit}
            loading={busy}
            onPress={() => void handleSubmit()}
            style={styles.submitButton}
          />

          <Link href="/login" style={styles.footerLink}>
            {t('reset.backToLogin')}
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.xl,
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
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  footerLink: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
