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
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Icon from '../../components/Icon';
import LanguageChipGrid from '../../components/LanguageChipGrid';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import PasswordVisibilityToggle from '../../components/PasswordVisibilityToggle';
import UiLanguagePicker from '../../components/UiLanguagePicker';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  emailAddressError,
  passwordPolicyError,
  RegistrationCompletedLoginRequiredError,
  useAuth,
} from '../../lib/auth';
import { useGuestLanguage } from '../../lib/guest-language';
import { useT } from '../../lib/i18n';
import { nameError } from '../../lib/identity-validation';
import { NATIVE_LANGUAGE_OPTIONS } from '../../lib/language-options';
import { createThemedStyles, useTheme } from '../../lib/theme';
import type { NativeLanguage } from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

export default function SignupScreen() {
  const { register } = useAuth();
  const { language: guestLanguage, persistenceError, setLanguage } = useGuestLanguage();
  const navigation = useNavigation();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'name' | 'email' | 'password' | 'confirmPassword' | null
  >(null);
  // Inline email/name validation waits for the learner to leave the field
  // (NN/g: erroring mid-typing is a hostile pattern; the submit gate still
  // checks live). A tap on the disabled submit also reveals it (see
  // handleSignup).
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
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
  const navigateOnce = (href: '/settings/privacy' | '/settings/terms' | '/login') => {
    // A pending registration owns the screen: exits stay blocked without
    // consuming the latch, so they work again once the request settles.
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

  const chooseLanguage = (code: NativeLanguage) => {
    setNativeLanguage(code);
    setError(null);
  };

  const passwordError = password.length > 0 ? passwordPolicyError(password, t) : null;
  const emailError = emailAddressError(email, t);
  const nameValidationError = nameError(name, t);
  const confirmationError =
    confirmPassword.length > 0 && confirmPassword !== password ? t('cp.mismatch') : null;

  const canSubmit =
    name.trim().length > 0 &&
    name.trim().length <= MAX_NAME_LENGTH &&
    nameValidationError === null &&
    email.trim().length > 0 &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    emailError === null &&
    passwordPolicyError(password) === null &&
    confirmPassword.length > 0 &&
    confirmPassword === password &&
    nativeLanguage !== null &&
    !busy;

  const handleSignup = async () => {
    // A submit attempt (button tap or keyboard "go") counts as leaving the
    // email and name fields: an autofilled-but-invalid value must explain its
    // disabled submit instead of failing silently.
    setEmailTouched(true);
    setNameTouched(true);
    if (!canSubmit || !nativeLanguage || busyRef.current) return;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password, nativeLanguage, guestLanguage);
      if (mountedRef.current) router.replace('/');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof RegistrationCompletedLoginRequiredError) {
        router.replace({ pathname: '/login', params: { notice: 'registered' } });
      } else if (err instanceof ApiError && err.status === 409) {
        setError(t('error.emailTaken'));
      } else {
        setError(userMessageForError(err, t('signup.failed')));
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
            <Icon name="mic" size={26} color={theme.colors.primary} strokeWidth={2.1} />
          </View>
          <Text accessibilityRole="header" style={styles.brand}>
            {t('signup.title')}
          </Text>
          <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>
          <UiLanguagePicker
            value={guestLanguage}
            onChange={setLanguage}
            disabled={busy}
            error={persistenceError}
          />

          <View style={styles.form}>
            <Text style={styles.label}>{t('signup.nameLabel')}</Text>
            <TextInput
              accessibilityLabel={t('signup.nameLabel')}
              style={[styles.input, focusedField === 'name' && styles.inputFocused]}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              onFocus={() => setFocusedField('name')}
              onBlur={() => {
                setFocusedField(null);
                setNameTouched(true);
              }}
              placeholder={t('signup.namePlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              maxLength={MAX_NAME_LENGTH}
              editable={!busy}
            />
            {nameTouched && nameValidationError && (
              <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                {nameValidationError}
              </Text>
            )}

            <Text style={styles.label}>{t('login.emailLabel')}</Text>
            <TextInput
              ref={emailRef}
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
                  without these two props a revealed password is registered
                  with a capital first letter the user never typed. */}
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
            <PasswordStrengthMeter password={password} testID="signup-strength" />
            {passwordError && (
              <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                {passwordError}
              </Text>
            )}

            <Text style={styles.label}>{t('password.confirmLabel')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={confirmPasswordRef}
                accessibilityLabel={t('password.confirmLabel')}
                style={[
                  styles.input,
                  styles.inputWithAction,
                  focusedField && focusedField === 'confirmPassword' && styles.inputFocused,
                ]}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                placeholder={t('password.confirmPlaceholder')}
                placeholderTextColor={colors.muted}
                secureTextEntry={!confirmPasswordVisible}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void handleSignup()}
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

            <Text style={styles.label}>{t('signup.languageLabel')}</Text>
            <Text style={styles.languageHelp}>{t('signup.languageHelp')}</Text>
            <LanguageChipGrid
              options={NATIVE_LANGUAGE_OPTIONS}
              selected={nativeLanguage}
              onSelect={chooseLanguage}
              disabled={busy}
              groupAccessibilityLabel={t('signup.languageLabel')}
              chipTestIDPrefix="signup-language"
              accessibilityLabelFor={(option, localizedLabel) =>
                `${localizedLabel}, ${option.native}`
              }
              renderOverlay={(code, selected) =>
                selected ? (
                  <Text
                    testID={`signup-language-check-${code}`}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.languageCheck}
                  >
                    ✓
                  </Text>
                ) : null
              }
            />

            {error !== null && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {/* The wrapper receives the tap when the Button inside is disabled
                by validation, so pressing a blocked submit reveals the email
                and name errors instead of failing silently; an enabled Button
                consumes its own press. */}
            <Pressable
              accessible={false}
              onPress={() => {
                setEmailTouched(true);
                setNameTouched(true);
              }}
            >
              <Button
                title={busy ? t('signup.submitBusy') : t('signup.submit')}
                disabled={!canSubmit}
                loading={busy}
                onPress={() => void handleSignup()}
                style={styles.submitButton}
              />
            </Pressable>

            <View style={styles.legalLinks}>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ disabled: busy }}
                onPress={() => navigateOnce('/settings/privacy')}
                style={({ pressed }) => [styles.legalLink, pressed && styles.linkPressed]}
              >
                <Text style={styles.legalLinkText}>{t('header.privacy')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ disabled: busy }}
                onPress={() => navigateOnce('/settings/terms')}
                style={({ pressed }) => [styles.legalLink, pressed && styles.linkPressed]}
              >
                <Text style={styles.legalLinkText}>{t('header.terms')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('signup.footerPrompt')}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ disabled: busy }}
              onPress={() => navigateOnce('/login')}
              style={({ pressed }) => [styles.footerLink, pressed && styles.linkPressed]}
            >
              <Text style={styles.footerLinkText}>{t('signup.footerLink')}</Text>
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
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.muted,
    textAlign: 'center',
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
  languageHelp: {
    marginBottom: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  languageCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  linkPressed: {
    opacity: 0.6,
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
  legalLinks: {
    marginTop: spacing.sm,
    minHeight: layout.minimumTarget,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legalLink: {
    minHeight: layout.minimumTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  legalLinkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    minHeight: layout.minimumTarget,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
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
}));
