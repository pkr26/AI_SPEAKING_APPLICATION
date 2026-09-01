import { Link, router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import PasswordVisibilityToggle from '../../components/PasswordVisibilityToggle';
import UiLanguagePicker from '../../components/UiLanguagePicker';
import { apiResetPassword, userMessageForError } from '../../lib/api';
import {
  emailAddressError,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
} from '../../lib/auth';
import { useGuestLanguage } from '../../lib/guest-language';
import { useT } from '../../lib/i18n';
import { firstParam } from '../../lib/params';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { useHardwareBack } from '../../lib/use-hardware-back';

const MAX_RESET_CODE_LENGTH = 128;

/**
 * Password reset, step 2: the emailed code plus the new password (normal
 * password rules with show/hide). Success returns to login with a banner.
 */
export default function ResetPasswordScreen() {
  const t = useT();
  const { language: guestLanguage, persistenceError, setLanguage } = useGuestLanguage();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(() => firstParam(params.email) ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'email' | 'code' | 'password' | 'confirmPassword' | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
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

  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();
  const passwordError = password.length > 0 ? passwordPolicyError(password, t) : null;
  const emailError = emailAddressError(email, t);
  const confirmationError =
    confirmPassword.length > 0 && confirmPassword !== password ? t('cp.mismatch') : null;
  const canSubmit =
    trimmedEmail.length > 0 &&
    trimmedEmail.length <= MAX_EMAIL_LENGTH &&
    emailError === null &&
    trimmedCode.length > 0 &&
    trimmedCode.length <= MAX_RESET_CODE_LENGTH &&
    passwordPolicyError(password) === null &&
    confirmPassword.length > 0 &&
    confirmPassword === password &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit || busyRef.current) return;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      await apiResetPassword(trimmedEmail, trimmedCode, password);
      // One-shot success banner on the login screen; no secrets in the URL.
      // dismissTo, not replace: the code is spent, so the request step and its
      // "check your email" state must leave the stack with this screen instead
      // of staying one back-gesture away with a code that now fails.
      if (mountedRef.current) {
        router.dismissTo({ pathname: '/login', params: { notice: 'reset' } });
      }
    } catch (err) {
      if (mountedRef.current) setError(userMessageForError(err, t('cp.failed')));
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
          <Text accessibilityRole="header" style={styles.title}>
            {t('reset.newTitle')}
          </Text>
          <UiLanguagePicker
            value={guestLanguage}
            onChange={setLanguage}
            disabled={busy}
            error={persistenceError}
          />

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
            onSubmitEditing={() => codeRef.current?.focus()}
            maxLength={MAX_EMAIL_LENGTH}
            editable={!busy}
          />
          {emailError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {emailError}
            </Text>
          )}

          <Text style={styles.label}>{t('reset.codeLabel')}</Text>
          <TextInput
            ref={codeRef}
            accessibilityLabel={t('reset.codeLabel')}
            style={[styles.input, focusedField === 'code' && styles.inputFocused]}
            value={code}
            onChangeText={setCode}
            onFocus={() => setFocusedField('code')}
            onBlur={() => setFocusedField(null)}
            placeholder={t('reset.codePlaceholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="one-time-code"
            autoCorrect={false}
            textContentType="oneTimeCode"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            maxLength={MAX_RESET_CODE_LENGTH}
            editable={!busy}
          />

          <Text style={styles.label}>{t('cp.newLabel')}</Text>
          <View style={styles.inputRow}>
            {/* Show clears secureTextEntry, which is what suppresses the
                keyboard's sentence-capitalization and autocorrect defaults;
                without these two props the reset would store a password with
                a capital first letter the user never typed. */}
            <TextInput
              ref={passwordRef}
              accessibilityLabel={t('cp.newLabel')}
              style={[
                styles.input,
                styles.inputWithAction,
                focusedField === 'password' && styles.inputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('signup.passwordPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
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

          <Text style={styles.label}>{t('cp.confirmLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={confirmPasswordRef}
              accessibilityLabel={t('cp.confirmLabel')}
              style={[
                styles.input,
                styles.inputWithAction,
                focusedField === 'confirmPassword' && styles.inputFocused,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('cp.confirmPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!confirmPasswordVisible}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
              editable={!busy}
            />
            <PasswordVisibilityToggle
              visible={confirmPasswordVisible}
              accessibilityLabel={
                confirmPasswordVisible
                  ? t('password.hideConfirmation')
                  : t('password.showConfirmation')
              }
              disabled={busy}
              onToggle={() => setConfirmPasswordVisible((visible) => !visible)}
            />
          </View>
          {confirmationError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {confirmationError}
            </Text>
          )}

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? t('reset.submitNewBusy') : t('reset.submitNew')}
            disabled={!canSubmit}
            loading={busy}
            onPress={() => void handleSubmit()}
            style={styles.submitButton}
          />

          <Link
            href="/login"
            accessibilityState={{ disabled: busy }}
            onPress={blockLinkWhileBusy}
            style={styles.footerLink}
          >
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.lg,
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
  inputAction: {
    flexShrink: 1,
    maxWidth: '45%',
    minHeight: layout.minimumTarget,
    minWidth: layout.minimumTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  inputActionText: {
    flexShrink: 1,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlDisabled: {
    opacity: 0.5,
  },
  fieldError: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 13,
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
    minHeight: layout.minimumTarget,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
