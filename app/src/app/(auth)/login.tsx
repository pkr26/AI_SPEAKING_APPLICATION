import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Icon from '../../components/Icon';
import PasswordVisibilityToggle from '../../components/PasswordVisibilityToggle';
import UiLanguagePicker from '../../components/UiLanguagePicker';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  comparablePasswordError,
  emailAddressError,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  useAuth,
} from '../../lib/auth';
import { useGuestLanguage } from '../../lib/guest-language';
import { useT } from '../../lib/i18n';
import { firstParam } from '../../lib/params';
import { consumeSessionExpiredNotice } from '../../lib/session-notice';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { useHardwareBack } from '../../lib/use-hardware-back';

export default function LoginScreen() {
  const { login } = useAuth();
  const { language: guestLanguage, persistenceError, setLanguage } = useGuestLanguage();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const params = useLocalSearchParams<{ notice?: string }>();
  const navigation = useNavigation();
  // One-shot success banner set by the reset-password screen's redirect.
  const resetDone = firstParam(params.notice) === 'reset';
  const registrationNeedsLogin = firstParam(params.notice) === 'registered';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  // Inline validation waits for the learner to leave the field (NN/g: erroring
  // mid-typing is a hostile pattern; the submit gate still checks live).
  const [emailTouched, setEmailTouched] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const publishNavigationLock = () => {
    if (!mountedRef.current) return;
    navigation.setOptions(
      busyRef.current
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  };
  useHardwareBack(() => busyRef.current);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (busyRef.current && event.data.action.type === 'GO_BACK') event.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);
  const blockLinkWhileBusy = (event: { preventDefault: () => void }) => {
    if (busyRef.current) event.preventDefault();
  };

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

  // No length guard: unlike signup's policy check, comparablePasswordError only
  // reports the 72-byte bcrypt ceiling, so it already returns null for an empty
  // password. Guarding it was dead code.
  const passwordError = comparablePasswordError(password);
  const emailError = emailAddressError(email, t);
  const canSubmit =
    email.trim().length > 0 &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    emailError === null &&
    password.length > 0 &&
    passwordError === null &&
    !busy;

  const handleLogin = async () => {
    if (!canSubmit || busyRef.current) return;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      if (mountedRef.current) router.replace('/');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        setError(t('error.wrongCredentials'));
      } else {
        setError(userMessageForError(err, t('login.failed')));
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        publishNavigationLock();
        setBusy(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}>
            <Icon name="mic" size={30} color={theme.colors.primary} strokeWidth={2.1} />
          </View>
          <Text accessibilityRole="header" style={styles.brand}>
            {t('login.title')}
          </Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          <UiLanguagePicker
            value={guestLanguage}
            onChange={setLanguage}
            disabled={busy}
            error={persistenceError}
          />

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

          {registrationNeedsLogin && (
            <Text accessibilityRole="alert" style={styles.successBanner}>
              {t('signup.createdLoginBanner')}
            </Text>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>{t('login.emailLabel')}</Text>
            <TextInput
              accessibilityLabel={t('login.emailLabel')}
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => {
                setFocusedField(null);
                setEmailTouched(true);
              }}
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
              editable={!busy}
            />
            {emailTouched && emailError && (
              <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                {emailError}
              </Text>
            )}

            <Text style={styles.label}>{t('login.passwordLabel')}</Text>
            <View style={styles.inputRow}>
              {/* Show clears secureTextEntry, which is what suppresses the
                  keyboard's sentence-capitalization and autocorrect defaults;
                  without these two props the "retype it visibly" recovery
                  gesture sends a capitalized password and fails again. */}
              <TextInput
                ref={passwordRef}
                accessibilityLabel={t('login.passwordLabel')}
                style={[
                  styles.input,
                  styles.inputWithAction,
                  focusedField === 'password' && styles.inputFocused,
                ]}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={colors.muted}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void handleLogin()}
                maxLength={MAX_PASSWORD_UTF8_BYTES}
                editable={!busy}
              />
              <PasswordVisibilityToggle
                visible={passwordVisible}
                accessibilityLabel={
                  passwordVisible ? t('common.hidePassword') : t('common.showPassword')
                }
                disabled={busy}
                onToggle={() => setPasswordVisible((visible) => !visible)}
              />
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

            <Link
              href="/forgot-password"
              accessibilityState={{ disabled: busy }}
              onPress={blockLinkWhileBusy}
              style={styles.forgotLink}
            >
              {t('login.forgot')}
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('login.footerPrompt')}</Text>
            <Link
              href="/signup"
              accessibilityState={{ disabled: busy }}
              onPress={blockLinkWhileBusy}
              style={styles.footerLink}
            >
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
  brandMark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
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
    minHeight: layout.minimumTarget,
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
    borderColor: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWithAction: {
    flex: 1,
    minWidth: 0,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    flexShrink: 1,
    minHeight: layout.minimumTarget,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
}));
