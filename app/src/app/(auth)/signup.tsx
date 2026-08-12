import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, userMessageForError } from '../../lib/api';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  useAuth,
} from '../../lib/auth';
import { colors } from '../../lib/theme';
import type { NativeLanguage } from '../../lib/types';

const LANGUAGES: { code: NativeLanguage; english: string; native: string }[] = [
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'es', english: 'Spanish', native: 'Español' },
  { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
];

export default function SignupScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError =
    password.length > 0 ? passwordPolicyError(password) : null;

  const canSubmit =
    name.trim().length > 0 &&
    name.trim().length <= MAX_NAME_LENGTH &&
    email.trim().length > 0 &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    passwordPolicyError(password) === null &&
    nativeLanguage !== null &&
    !busy;

  const handleSignup = async () => {
    if (!canSubmit || !nativeLanguage) return;
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password, nativeLanguage);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with this email already exists.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts, please try again later.');
      } else {
        setError(
          userMessageForError(
            err,
            'Could not create your account. Check your information and try again.',
          ),
        );
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
        <Text accessibilityRole="header" style={styles.brand}>
          Create your account
        </Text>
        <Text style={styles.subtitle}>
          We&apos;ll tailor your practice to your native language.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            accessibilityLabel="Name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            textContentType="name"
            maxLength={MAX_NAME_LENGTH}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            maxLength={MAX_EMAIL_LENGTH}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters, with a letter and a number"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="newPassword"
            maxLength={MAX_PASSWORD_UTF8_BYTES}
          />
          {passwordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {passwordError}
            </Text>
          )}

          <Text style={styles.label}>Native language</Text>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => {
              const selected = nativeLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  accessibilityRole="button"
                  accessibilityLabel={`${lang.english}, ${lang.native}`}
                  accessibilityState={{ selected }}
                  onPress={() => setNativeLanguage(lang.code)}
                  style={[
                    styles.languageChip,
                    selected && styles.languageChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageNative,
                      selected && styles.languageTextSelected,
                    ]}
                  >
                    {lang.native}
                  </Text>
                  <Text
                    style={[
                      styles.languageEnglish,
                      selected && styles.languageTextSelected,
                    ]}
                  >
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

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
            disabled={!canSubmit}
            onPress={handleSignup}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Creating account…' : 'Sign Up'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" style={styles.footerLink}>
            Sign in
          </Link>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  form: {
    marginTop: 28,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#FFFFFF',
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
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  button: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    color: colors.muted,
  },
  footerLink: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
});
