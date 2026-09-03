import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';

import Button from '../../components/Button';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import PasswordVisibilityToggle from '../../components/PasswordVisibilityToggle';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { useHardwareBack } from '../../lib/use-hardware-back';

type FieldName = 'current' | 'next' | 'confirm';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const busyRef = useRef(false);
  // One-shot guard for the post-success Done button: router.back() must never
  // fire twice off one confirmation, even for a same-frame double press.
  const donePressedRef = useRef(false);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useHardwareBack(() => busyRef.current);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (busyRef.current && event.data.action.type === 'GO_BACK') event.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  const newPasswordError = newPassword.length > 0 ? passwordPolicyError(newPassword, t) : null;
  // No length guard, unlike newPasswordError above: passwordPolicyError reports
  // "too short" for an empty string, but comparablePasswordError only enforces
  // the 72-byte bcrypt ceiling and so already returns null for one.
  const currentPasswordError = comparablePasswordError(currentPassword, t);
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== newPassword ? t('cp.mismatch') : null;
  const samePasswordError =
    newPassword.length > 0 && newPassword === currentPassword ? t('cp.sameAsCurrent') : null;

  const canSubmit =
    currentPassword.length > 0 &&
    currentPasswordError === null &&
    passwordPolicyError(newPassword) === null &&
    samePasswordError === null &&
    confirmPassword === newPassword &&
    !busy &&
    !saved;

  const toggleVisibility = (field: FieldName) => {
    setVisibleFields((fields) => ({ ...fields, [field]: !fields[field] }));
  };

  // Editing any field retracts a stale summary failure (login pattern): the
  // learner sees which entry the next submit will actually send.
  const handleFieldEdit = (field: FieldName, value: string) => {
    if (field === 'current') setCurrentPassword(value);
    else if (field === 'next') setNewPassword(value);
    else setConfirmPassword(value);
    setError(null);
  };

  const handleDonePress = () => {
    // The mounted guard matches the former Alert handler: a stale captured
    // callback must never navigate a screen that has already gone away.
    if (donePressedRef.current || !mountedRef.current) return;
    donePressedRef.current = true;
    router.back();
  };

  const handleSubmit = async () => {
    // canSubmit reads the render-time `busy`, so two presses landing before
    // React re-renders both pass it. The second would throw out of the auth
    // transition guard, painting a failure over the saved note and freeing
    // the button while the real request is still in flight.
    if (!canSubmit || busyRef.current) return;
    busyRef.current = true;
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
    setBusy(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      if (!mountedRef.current) return;
      // A reversible save confirms inline (the app-wide success-feedback rule):
      // modal alerts stay reserved for irreversible exits and failures.
      setSaved(true);
      AccessibilityInfo.announceForAccessibility(t('cp.updatedBody'));
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        setError(t('cp.wrongCurrent'));
      } else {
        setError(userMessageForError(err, t('cp.failed')));
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        navigation.setOptions({ headerBackVisible: true, gestureEnabled: true });
        setBusy(false);
      }
    }
  };

  const visibilityToggle = (field: FieldName, visible: boolean) => {
    const fieldLabel =
      field === 'current'
        ? t('cp.currentLabel')
        : field === 'next'
          ? t('cp.newLabel')
          : t('cp.confirmLabel');
    const actionLabel = visible ? t('common.hidePassword') : t('common.showPassword');
    return (
      <PasswordVisibilityToggle
        visible={visible}
        accessibilityLabel={`${fieldLabel}: ${actionLabel}`}
        disabled={busy || saved}
        onToggle={() => toggleVisibility(field)}
      />
    );
  };

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
            {/* Every field here carries autoCapitalize/autoCorrect for the same
                reason: Show clears secureTextEntry, which is what suppresses
                the keyboard's sentence-capitalization and autocorrect
                defaults, and a capitalized new password would be saved. */}
            <TextInput
              accessibilityLabel={t('cp.currentLabel')}
              style={[
                styles.input,
                styles.passwordInput,
                focusedField === 'current' && styles.inputFocused,
              ]}
              value={currentPassword}
              onChangeText={(value) => handleFieldEdit('current', value)}
              onFocus={() => setFocusedField('current')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('cp.currentPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.current}
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
              editable={!busy && !saved}
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
                styles.passwordInput,
                focusedField === 'next' && styles.inputFocused,
              ]}
              value={newPassword}
              onChangeText={(value) => handleFieldEdit('next', value)}
              onFocus={() => setFocusedField('next')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('signup.passwordPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.next}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
              editable={!busy && !saved}
            />
            {visibilityToggle('next', visibleFields.next)}
          </View>
          <PasswordStrengthMeter password={newPassword} testID="change-password-strength" />
          {newPasswordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {newPasswordError}
            </Text>
          )}
          {samePasswordError && (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {samePasswordError}
            </Text>
          )}

          <Text style={styles.label}>{t('cp.confirmLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={confirmPasswordRef}
              accessibilityLabel={t('cp.confirmLabel')}
              style={[
                styles.input,
                styles.passwordInput,
                focusedField === 'confirm' && styles.inputFocused,
              ]}
              value={confirmPassword}
              onChangeText={(value) => handleFieldEdit('confirm', value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              placeholder={t('cp.confirmPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!visibleFields.confirm}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void handleSubmit()}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
              editable={!busy && !saved}
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

          {/* The explicit announceForAccessibility call owns the success
              announcement; a live region here would double-speak on Android. */}
          {saved && <Text style={styles.savedNote}>{t('cp.updatedBody')}</Text>}

          <Button
            title={saved ? t('cp.done') : busy ? t('cp.submitBusy') : t('cp.submit')}
            disabled={saved ? false : !canSubmit}
            loading={busy}
            onPress={saved ? handleDonePress : () => void handleSubmit()}
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
    padding: layout.screenPadding,
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
  passwordInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  fieldError: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 13,
  },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  savedNote: {
    marginTop: spacing.sm,
    color: colors.success,
    fontSize: 13,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
}));
