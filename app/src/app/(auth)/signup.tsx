import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Icon from '../../components/Icon';
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
  // Inline email validation waits for the learner to leave the field (NN/g:
  // erroring mid-typing is a hostile pattern; the submit gate still checks
  // live). A tap on the disabled submit also reveals it (see handleSignup).
  const [emailTouched, setEmailTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
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

  const chooseLanguage = (code: NativeLanguage) => {
    setNativeLanguage(code);
    setError(null);
  };

  const passwordError = password.length > 0 ? passwordPolicyError(password, t) : null;
  const emailError = emailAddressError(email, t);
  const confirmationError =
    confirmPassword.length > 0 && confirmPassword !== password ? t('password.mismatch') : null;

  const canSubmit =
    name.trim().length > 0 &&
    name.trim().length <= MAX_NAME_LENGTH &&
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
    // email field: an autofilled-but-invalid address must explain its
    // disabled submit instead of failing silently.
    setEmailTouched(true);
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
              onBlur={() => setFocusedField(null)}
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
                  focusedField === 'password' && styles.inputFocused,
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
                  focusedField === 'confirmPassword' && styles.inputFocused,
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
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('signup.languageLabel')}
              style={styles.languageGrid}
            >
              {NATIVE_LANGUAGE_OPTIONS.map((lang) => {
                const selected = nativeLanguage === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    accessibilityRole="radio"
                    accessibilityLabel={`${lang.english}, ${lang.native}`}
                    accessibilityState={{ checked: selected, selected, disabled: busy }}
                    disabled={busy}
                    onPress={() => chooseLanguage(lang.code)}
                    style={[
                      styles.languageChip,
                      selected && styles.languageChipSelected,
                      busy && styles.controlDisabled,
                    ]}
                  >
                    {selected && (
                      <Text
                        testID={`signup-language-check-${lang.code}`}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={styles.languageCheck}
                      >
                        ✓
                      </Text>
                    )}
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

            {error && (
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
                title={busy ? t('signup.submitBusy') : t('signup.submit')}
                disabled={!canSubmit}
                loading={busy}
                onPress={() => void handleSignup()}
                style={styles.submitButton}
              />
            </Pressable>

            <View style={styles.legalLinks}>
              <Link
                href="/settings/privacy"
                accessibilityState={{ disabled: busy }}
                onPress={blockLinkWhileBusy}
                style={styles.legalLink}
              >
                {t('header.privacy')}
              </Link>
              <Link
                href="/settings/terms"
                accessibilityState={{ disabled: busy }}
                onPress={blockLinkWhileBusy}
                style={styles.legalLink}
              >
                {t('header.terms')}
              </Link>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('signup.footerPrompt')}</Text>
            <Link
              href="/login"
              accessibilityState={{ disabled: busy }}
              onPress={blockLinkWhileBusy}
              style={styles.footerLink}
            >
              {t('signup.footerLink')}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  form: {
    marginTop: 28,
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
  languageHelp: {
    marginBottom: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    position: 'relative',
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    // The chip fill is the form's own card color, so this border is the only
    // thing that makes a mandatory tap target visible. `border` is a
    // decorative hairline (1.24:1 on card in light, 1.27:1 in dark); the
    // form-field token clears the 3:1 non-text threshold and is what the same
    // control uses in Settings.
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
  languageCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  controlDisabled: {
    opacity: 0.5,
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
    paddingVertical: spacing.md,
    color: colors.primary,
    fontSize: 14,
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
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
