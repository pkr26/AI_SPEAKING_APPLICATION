import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
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
  // One navigation per focus: a double-tap on any exit must not push twice,
  // and the latch re-arms when this screen regains focus after a back gesture.
  const navigationStartedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navigationStartedRef.current = false;
      return () => undefined;
    }, []),
  );
  const navigateOnce = (href: '/forgot-password' | '/signup') => {
    // A pending login owns the screen: exits stay blocked without consuming
    // the latch, so they work again the moment the request settles.
    if (busyRef.current) return;
    if (navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    router.navigate(href);
  };

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
    // A submit attempt (button tap or keyboard "go") counts as leaving the
    // email field: an autofilled-but-invalid address must explain its
    // disabled submit instead of failing silently.
    setEmailTouched(true);
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
                  focusedField && focusedField === 'password' && styles.inputFocused,
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

            {error !== null && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {/* The wrapper receives the tap when the Button inside is disabled
                by validation, so pressing a blocked submit reveals the email
                error instead of failing silently; an enabled Button consumes
                its own press. */}
            <Pressable accessible={false} onPress={() => setEmailTouched(true)}>
              <Button
                title={busy ? t('login.submitBusy') : t('login.submit')}
                disabled={!canSubmit}
                loading={busy}
                onPress={() => void handleLogin()}
                style={styles.submitButton}
              />
            </Pressable>

            <Pressable
              accessibilityRole="link"
              accessibilityState={{ disabled: busy }}
              onPress={() => navigateOnce('/forgot-password')}
              style={({ pressed }) => [styles.forgotLink, pressed && styles.linkPressed]}
            >
              <Text style={styles.forgotLinkText}>{t('login.forgot')}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('login.footerPrompt')}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ disabled: busy }}
              onPress={() => navigateOnce('/signup')}
              style={({ pressed }) => [styles.footerLink, pressed && styles.linkPressed]}
            >
              <Text style={styles.footerLinkText}>{t('login.footerLink')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type }) => ({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  brandMark: {
    width: layout.brandMark,
    height: layout.brandMark,
    borderRadius: layout.brandMark / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  brand: {
    fontSize: type.titleLg.fontSize,
    lineHeight: type.titleLg.lineHeight,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  forgotLinkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkPressed: {
    opacity: 0.6,
  },
  form: {
    marginTop: spacing.xl,
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
    marginBottom: spacing.sm,
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
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  fieldError: {
    marginTop: spacing.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  footerLinkText: {
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
