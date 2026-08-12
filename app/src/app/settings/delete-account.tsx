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
import { useQueryClient } from '@tanstack/react-query';

import { ApiError, userMessageForError } from '../../lib/api';
import {
  AccountDeletedCleanupError,
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  useAuth,
} from '../../lib/auth';
import { colors, layout } from '../../lib/theme';

export default function DeleteAccountScreen() {
  const { deleteAccount } = useAuth();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = password.length > 0 ? comparablePasswordError(password) : null;
  const canSubmit = password.length > 0 && passwordError === null && !busy;

  const performDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      queryClient.clear();
      Alert.alert('Account deleted', 'Your account and all its data have been deleted.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect password.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts, please try again later.');
      } else if (err instanceof AccountDeletedCleanupError) {
        setError(
          'Your account was deleted, but local session cleanup failed. Restart the app before signing in again.',
        );
      } else {
        setError(userMessageForError(err, 'Could not delete your account. Please try again.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void performDelete(),
        },
      ],
    );
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
        <View style={styles.warningCard}>
          <Text accessibilityRole="header" style={styles.warningTitle}>
            This action is permanent
          </Text>
          <Text style={styles.warningText}>
            Deleting your account removes your profile, diagnostic results, and practice history.
            This cannot be undone.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Confirm your password</Text>
          <TextInput
            accessibilityLabel="Confirm your password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="password"
            maxLength={MAX_PASSWORD_UTF8_BYTES}
          />
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

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.deleteButton,
              !canSubmit && styles.deleteButtonDisabled,
              pressed && canSubmit && styles.deleteButtonPressed,
            ]}
          >
            <Text style={styles.deleteButtonText}>{busy ? 'Deleting…' : 'Delete My Account'}</Text>
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
  warningCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
  },
  warningText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
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
  deleteButton: {
    marginTop: 20,
    minHeight: layout.minimumTarget,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
