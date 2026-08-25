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
import { ApiError, userMessageForError } from '../../lib/api';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import type { NativeLanguage } from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

const LANGUAGES: { code: NativeLanguage; english: string; native: string }[] = [
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'es', english: 'Spanish', native: 'Español' },
  { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
];

export default function SignupScreen() {
  const { register } = useAuth();
  const navigation = useNavigation();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const [busy, setBusy] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
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

  const chooseLanguage = (code: NativeLanguage) => {
    setNativeLanguage(code);
  };

  const passwordError = password.length > 0 ? passwordPolicyError(password, t) : null;

  const canSubmit =
    name.trim().length > 0 &&
    name.trim().length <= MAX_NAME_LENGTH &&
    email.trim().length > 0 &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    passwordPolicyError(password) === null &&
    nativeLanguage !== null &&
    !busy;

  const handleSignup = async () => {
    if (!canSubmit || !nativeLanguage || busyRef.current) return;
    busyRef.current = true;
    publishNavigationLock();
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password, nativeLanguage);
      if (mountedRef.current) router.replace('/');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 409) {
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
          <Text accessibilityRole="header" style={styles.brand}>
            {t('signup.title')}
          </Text>
          <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>

          <View style={styles.form}>
            <Text style={styles.label}>{t('signup.nameLabel')}</Text>
            <TextInput
              accessibilityLabel={t('signup.nameLabel')}
              style={[styles.input, focusedField === 'name' && styles.inputFocused]}
              value={name}
              onChangeText={setName}
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
            />

            <Text style={styles.label}>{t('login.emailLabel')}</Text>
            <TextInput
              ref={emailRef}
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
                returnKeyType="go"
                onSubmitEditing={() => void handleSignup()}
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

            <Text style={styles.label}>{t('signup.languageLabel')}</Text>
            <Text style={styles.languageHelp}>{t('signup.languageHelp')}</Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const selected = nativeLanguage === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    accessibilityRole="button"
                    accessibilityLabel={`${lang.english}, ${lang.native}`}
                    accessibilityState={{ selected }}
                    onPress={() => chooseLanguage(lang.code)}
                    style={[styles.languageChip, selected && styles.languageChipSelected]}
                  >
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

            <Button
              title={busy ? t('signup.submitBusy') : t('signup.submit')}
              disabled={!canSubmit}
              loading={busy}
              onPress={() => void handleSignup()}
              style={styles.submitButton}
            />
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
  footerText: {
    fontSize: 15,
    color: colors.muted,
  },
  footerLink: {
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
}));
