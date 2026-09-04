import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
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
  // Inline validation waits for the learner to leave the field (NN/g: erroring
  // mid-typing is a hostile pattern; the submit gate still checks live).
  const [emailTouched, setEmailTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  // Bumped on every accepted send/resend so the neutral note re-presents (and
  // its polite live region re-announces) instead of sitting stale after a
  // resend that otherwise changed nothing on screen.
  const [sentNoteKey, setSentNoteKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
  const navigateOnce = (href: '/login') => {
    // A pending request owns the screen: exits stay blocked without consuming
    // the latch, so they work again once the request settles.
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

  const trimmedEmail = email.trim();
  const emailError = emailAddressError(email, t);
  const canSubmit =
    trimmedEmail.length > 0 &&
    trimmedEmail.length <= MAX_EMAIL_LENGTH &&
    emailError === null &&
    !busy;

  const handleSubmit = async () => {
    // A submit attempt (button tap or keyboard "go") counts as leaving the
    // email field: an invalid address must explain its disabled submit instead
    // of failing silently.
    setEmailTouched(true);
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
      if (mountedRef.current) {
        setSentEmail(requestedEmail);
        setSentNoteKey((key) => key + 1);
      }
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
      // A successful resend mirrors the first send: the neutral note is
      // re-presented (keyed remount re-announces the polite live region) so
      // the learner sees the confirmation again.
      if (mountedRef.current) setSentNoteKey((key) => key + 1);
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

  if (sentEmail !== null) {
    return (
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('reset.sentTitle')}
          </Text>
          <Text key={sentNoteKey} accessibilityLiveRegion="polite" style={styles.subtitle}>
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
          {error !== null && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="link"
            accessibilityState={{ disabled: busy }}
            onPress={() => navigateOnce('/login')}
            style={({ pressed }) => [styles.footerLink, pressed && styles.linkPressed]}
          >
            <Text style={styles.footerLinkText}>{t('reset.backToLogin')}</Text>
          </Pressable>
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
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => {
              setEmailFocused(false);
              setEmailTouched(true);
            }}
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
          {emailTouched && emailError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {emailError}
            </Text>
          )}

          {error !== null && (
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

          <Pressable
            accessibilityRole="link"
            accessibilityState={{ disabled: busy }}
            onPress={() => navigateOnce('/login')}
            style={({ pressed }) => [styles.footerLink, pressed && styles.linkPressed]}
          >
            <Text style={styles.footerLinkText}>{t('reset.backToLogin')}</Text>
          </Pressable>
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
  title: {
    fontSize: type.titleLg.fontSize,
    lineHeight: type.titleLg.lineHeight,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.muted,
    textAlign: 'center',
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
  resendButton: {
    marginTop: spacing.sm,
  },
  footerLink: {
    marginTop: spacing.xl,
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
  linkPressed: {
    opacity: 0.6,
  },
}));
