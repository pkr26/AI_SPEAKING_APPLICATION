import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { ApiError, userMessageForError } from '../../lib/api';
import {
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  useAuth,
} from '../../lib/auth';
import { colors, layout } from '../../lib/theme';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newPasswordError = newPassword.length > 0 ? passwordPolicyError(newPassword) : null;
  const currentPasswordError =
    currentPassword.length > 0 ? comparablePasswordError(currentPassword) : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== newPassword
      ? 'Passwords do not match.'
      : null;

  const canSubmit =
    currentPassword.length > 0 &&
    currentPasswordError === null &&
    passwordPolicyError(newPassword) === null &&
    confirmPassword === newPassword &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Current password is incorrect.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts, please try again later.');
      } else {
        setError(userMessageForError(err, 'Could not change your password. Please try again.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Current password</Text>
          <TextInput
            accessibilityLabel="Current password"
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Your current password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="password"
            maxLength={MAX_PASSWORD_UTF8_BYTES}
          />
          {currentPasswordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {currentPasswordError}
            </Text>
          )}

          <Text style={styles.label}>New password</Text>
          <TextInput
            accessibilityLabel="New password"
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters, with a letter and a number"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="newPassword"
            maxLength={MAX_PASSWORD_UTF8_BYTES}
          />
          {newPasswordError && <Text style={styles.fieldError}>{newPasswordError}</Text>}

          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            accessibilityLabel="Confirm new password"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat the new password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="newPassword"
            maxLength={MAX_PASSWORD_UTF8_BYTES}
          />
          {confirmError && <Text style={styles.fieldError}>{confirmError}</Text>}

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{busy ? 'Updating…' : 'Update Password'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
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
  button: {
    marginTop: 20,
    minHeight: layout.minimumTarget,
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
});
