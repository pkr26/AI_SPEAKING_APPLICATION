import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { router, useNavigation } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';

import Button from '../../components/Button';
import { ApiError, userMessageForError } from '../../lib/api';
import {
  AccountDeletionUnconfirmedError,
  AccountDeletedCleanupError,
  comparablePasswordError,
  MAX_PASSWORD_UTF8_BYTES,
  useAuth,
} from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { useHardwareBack } from '../../lib/use-hardware-back';

export default function DeleteAccountScreen() {
  const { deleteAccount } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const confirmingRef = useRef<symbol | null>(null);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      confirmingRef.current = null;
    };
  }, []);

  useHardwareBack(() => busyRef.current || confirmingRef.current !== null);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (
        (busyRef.current || confirmingRef.current !== null) &&
        event.data.action.type === 'GO_BACK'
      ) {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // No length guard: comparablePasswordError only enforces the 72-byte bcrypt
  // ceiling, so it already returns null for an empty password.
  const passwordError = comparablePasswordError(password, t);
  const canSubmit = password.length > 0 && passwordError === null && !busy && !confirming;

  const performDelete = async () => {
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      queryClient.clear();
      Alert.alert(t('da.deletedTitle'), t('da.deletedBody'), [
        {
          text: t('common.ok'),
          onPress: () => {
            if (mountedRef.current) router.replace('/');
          },
        },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (mountedRef.current) setError(t('da.wrongPassword'));
      } else if (err instanceof AccountDeletedCleanupError) {
        // The account is gone and the session with it, so the route guard has
        // already unmounted this screen: only a native alert outlives it to
        // deliver the "restart before logging in again" instruction.
        Alert.alert(t('da.deletedTitle'), err.message);
      } else if (err instanceof AccountDeletionUnconfirmedError) {
        if (mountedRef.current) setError(err.message);
      } else if (mountedRef.current) {
        setError(userMessageForError(err, t('da.failed')));
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        navigation.setOptions({ headerBackVisible: true, gestureEnabled: true });
        setBusy(false);
      }
    }
  };

  const handleSubmit = () => {
    // busyRef as well as canSubmit: a keyboard submit is not gated by the
    // button's disabled prop and can land before `busy` has re-rendered.
    if (!mountedRef.current || !canSubmit || busyRef.current || confirmingRef.current !== null) {
      return;
    }
    const confirmationOwner = Symbol();
    confirmingRef.current = confirmationOwner;
    setConfirming(true);
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
    const closeConfirmation = () => {
      if (confirmingRef.current !== confirmationOwner) return;
      confirmingRef.current = null;
      if (!mountedRef.current) return;
      setConfirming(false);
      navigation.setOptions({ headerBackVisible: true, gestureEnabled: true });
    };
    Alert.alert(
      t('da.confirmTitle'),
      t('da.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: closeConfirmation },
        {
          text: t('da.confirmDelete'),
          style: 'destructive',
          onPress: () => {
            if (confirmingRef.current !== confirmationOwner) return;
            confirmingRef.current = null;
            if (!mountedRef.current) return;
            setConfirming(false);
            void performDelete();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: closeConfirmation,
      },
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
        <View style={styles.warningCard}>
          <Text accessibilityRole="header" style={styles.warningTitle}>
            {t('da.warningTitle')}
          </Text>
          <Text style={styles.warningText}>{t('da.warningBody')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('da.passwordLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel={t('da.passwordLabel')}
              style={[styles.input, styles.passwordInput, passwordFocused && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder={t('da.passwordPlaceholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry={!passwordVisible}
              // Revealing a password clears secureTextEntry, which otherwise
              // suppresses keyboard capitalization/correction defaults.
              // Preserve the exact password the learner typed in either mode.
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={MAX_PASSWORD_UTF8_BYTES}
              editable={!busy}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible ? t('common.hidePassword') : t('common.showPassword')
              }
              onPress={() => setPasswordVisible((visible) => !visible)}
              disabled={busy}
              style={[styles.inputAction, busy && styles.controlDisabled]}
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

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? t('da.submitBusy') : t('da.submit')}
            variant="danger"
            disabled={!canSubmit}
            loading={busy}
            onPress={handleSubmit}
            style={styles.deleteButton}
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
  warningCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: radii.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.ml,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
  },
  warningText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
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
  inputAction: {
    flexShrink: 1,
    maxWidth: '45%',
    minHeight: layout.minimumTarget,
    minWidth: layout.minimumTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  inputActionText: {
    flexShrink: 1,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  deleteButton: {
    marginTop: spacing.lg,
  },
}));
