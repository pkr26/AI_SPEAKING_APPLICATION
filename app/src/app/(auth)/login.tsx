import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  comparablePasswordError,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { firstParam } from '../../lib/params';
import { consumeSessionExpiredNotice } from '../../lib/session-notice';
import { createThemedStyles, useTheme } from '../../lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const params = useLocalSearchParams<{ notice?: string }>();
  // One-shot success banner set by the reset-password screen's redirect.
  const resetDone = firstParam(params.notice) === 'reset';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  // One-shot explanation for a 401-driven sign-out (revoked/expired token).
  useEffect(() => {
    let active = true;
    void consumeSessionExpiredNotice().then((hadNotice) => {
      if (active && hadNotice) setSessionNotice(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const passwordError = password.length > 0 ? comparablePasswordError(password) : null;
  const canSubmit =
    email.trim().length > 0 &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    password.length > 0 &&
    passwordError === null &&
    !busy;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t('error.wrongCredentials'));
      } else {
        setError(userMessageForError(err, t('login.failed')));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.brand}>
            {t('login.title')}
          </Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

          {sessionNotice && (
            <Text accessibilityRole="alert" style={styles.noticeBanner}>
              {t('auth.sessionExpired')}
            </Text>
          )}

          {resetDone && (
            <Text accessibilityRole="alert" style={styles.successBanner}>
              {t('reset.doneBanner')}
            </Text>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>{t('login.emailLabel')}</Text>
            <TextInput
              accessibilityLabel={t('login.emailLabel')}
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              maxLength={MAX_EMAIL_LENGTH}
            />

            <Text style={styles.label}>{t('login.passwordLabel')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={passwordRef}
                accessibilityLabel={t('login.passwordLabel')}
                style={[
                  styles.input,
                  styles.inputWithAction,
                  focusedField === 'password' && styles.inputFocused,
                ]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={colors.muted}
                secureTextEntry={!passwordVisible}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void handleLogin()}
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
              title={busy ? t('login.submitBusy') : t('login.submit')}
              disabled={!canSubmit}
              loading={busy}
              onPress={() => void handleLogin()}
              style={styles.submitButton}
            />

            <Link href="/forgot-password" style={styles.forgotLink}>
              {t('login.forgot')}
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('login.footerPrompt')}</Text>
            <Link href="/signup" style={styles.footerLink}>
              {t('login.footerLink')}
            </Link>
          </View>
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
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  noticeBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  successBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  forgotLink: {
    marginTop: spacing.ml,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    marginTop: 36,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
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
  submitButton: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
    minHeight: layout.minimumTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 15,
    color: colors.muted,
  },
}));
