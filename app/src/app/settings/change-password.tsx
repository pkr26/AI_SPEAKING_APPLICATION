import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';

import Button from '../../components/Button';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

type FieldName = 'current' | 'next' | 'confirm';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const headerHeight = useHeaderHeight();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibleFields, setVisibleFields] = useState<Record<FieldName, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const newPasswordError = newPassword.length > 0 ? passwordPolicyError(newPassword, t) : null;
  const currentPasswordError =
    currentPassword.length > 0 ? comparablePasswordError(currentPassword, t) : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== newPassword ? t('cp.mismatch') : null;

  const canSubmit =
    currentPassword.length > 0 &&
    currentPasswordError === null &&
    passwordPolicyError(newPassword) === null &&
    confirmPassword === newPassword &&
    !busy;

  const toggleVisibility = (field: FieldName) => {
    setVisibleFields((fields) => ({ ...fields, [field]: !fields[field] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert(t('cp.updatedTitle'), t('cp.updatedBody'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t('cp.wrongCurrent'));
      } else {
        setError(userMessageForError(err, t('cp.failed')));
      }
    } finally {
      setBusy(false);
    }
  };

  const visibilityToggle = (field: FieldName, visible: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? t('common.hidePassword') : t('common.showPassword')}
      onPress={() => toggleVisibility(field)}
      style={styles.inputAction}
    >
      <Text style={styles.inputActionText}>{visible ? t('common.hide') : t('common.show')}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>{t('cp.currentLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel={t('cp.currentLabel')}
              style={[
                styles.input,
                styles.inputWithAction,
                focusedField === 'current' && styles.inputFocused,
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => setFocusedField('current')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('cp.currentPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.current}
              autoComplete="password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
            />
            {visibilityToggle('current', visibleFields.current)}
          </View>
          {currentPasswordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {currentPasswordError}
            </Text>
          )}

          <Text style={styles.label}>{t('cp.newLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={newPasswordRef}
              accessibilityLabel={t('cp.newLabel')}
              style={[
                styles.input,
                styles.inputWithAction,
                focusedField === 'next' && styles.inputFocused,
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedField('next')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('signup.passwordPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.next}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
            />
            {visibilityToggle('next', visibleFields.next)}
          </View>
          {newPasswordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {newPasswordError}
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
                focusedField === 'confirm' && styles.inputFocused,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('cp.confirmPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.confirm}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
            />
            {visibilityToggle('confirm', visibleFields.confirm)}
          </View>
          {confirmError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {confirmError}
            </Text>
          )}

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? t('cp.submitBusy') : t('cp.submit')}
            disabled={!canSubmit}
            loading={busy}
            onPress={() => void handleSubmit()}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
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
}));
