import { Link, router, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import UiLanguagePicker from '../../components/UiLanguagePicker';
import { apiForgotPassword, userMessageForError } from '../../lib/api';
import { emailAddressError, MAX_EMAIL_LENGTH } from '../../lib/auth';
import { useGuestLanguage } from '../../lib/guest-language';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { useHardwareBack } from '../../lib/use-hardware-back';

/**
 * Password reset, step 1: email entry. A successful request always advances to
 * the same neutral "if an account exists" state — the server never reveals
 * whether the email has an account, and neither does this screen.
 */
export default function ForgotPasswordScreen() {
  const t = useT();
  const { language: guestLanguage, persistenceError, setLanguage } = useGuestLanguage();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const emailError = emailAddressError(email, t);
  const canSubmit =
    trimmedEmail.length > 0 &&
    trimmedEmail.length <= MAX_EMAIL_LENGTH &&
    emailError === null &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit || busyRef.current) return;
    const requestedEmail = trimmedEmail;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      await apiForgotPassword(requestedEmail);
      // The field remains editable while the request is in flight. Pin the
      // address that actually received the code so a late edit cannot prefill
      // the next step with a different account.
      if (mountedRef.current) setSentEmail(requestedEmail);
    } catch (err) {
      // Only transport/rate-limit failures surface; the 204 contract itself
      // never distinguishes existing from unknown accounts.
      if (mountedRef.current) setError(userMessageForError(err, t('reset.requestFailed')));
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        publishNavigationLock();
        setBusy(false);
      }
    }
  };

  const handleResend = async () => {
    if (!sentEmail || busyRef.current) return;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      // Same uniform endpoint and pinned address as the first request: this
      // remains non-enumerating while recovering from transient mail delivery.
      await apiForgotPassword(sentEmail);
    } catch (err) {
      if (mountedRef.current) setError(userMessageForError(err, t('reset.requestFailed')));
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        publishNavigationLock();
        setBusy(false);
      }
    }
  };
  const continueWithCode = () => {
    if (!sentEmail || busyRef.current) return;
    router.navigate({ pathname: '/reset-password', params: { email: sentEmail } });
  };

  if (sentEmail) {
    return (
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('reset.sentTitle')}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
            {t('reset.sentBody')}
          </Text>
          <UiLanguagePicker
            value={guestLanguage}
            onChange={setLanguage}
            disabled={busy}
            error={persistenceError}
          />
          {/* navigate, not push: a double-tap on this one unguarded target
              would otherwise stack a second, empty reset form behind the one
              the user fills in. navigate dedupes the identical route. */}
          <Button
            title={t('reset.continue')}
            disabled={busy}
            onPress={continueWithCode}
            style={styles.submitButton}
          />
          <Button
            title={busy ? t('reset.resendBusy') : t('reset.resend')}
            variant="secondary"
            disabled={busy}
            loading={busy}
            onPress={() => void handleResend()}
            style={styles.resendButton}
          />
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Link
            href="/login"
            accessibilityState={{ disabled: busy }}
            onPress={blockLinkWhileBusy}
            style={styles.footerLink}
          >
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
          <UiLanguagePicker
            value={guestLanguage}
            onChange={setLanguage}
            disabled={busy}
            error={persistenceError}
          />

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
          {emailError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {emailError}
            </Text>
          )}

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
    borderColor: colors.primary,
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
  resendButton: {
    marginTop: spacing.sm,
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
