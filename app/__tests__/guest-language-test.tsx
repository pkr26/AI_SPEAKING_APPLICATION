import * as SecureStore from 'expo-secure-store';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';

import UiLanguagePicker from '../src/components/UiLanguagePicker';
import { NATIVE_LANGUAGE_OPTIONS, UI_LANGUAGE_OPTIONS } from '../src/lib/language-options';
import { useTheme } from '../src/lib/theme';
import {
  GuestLanguageProvider,
  guestLanguageStorage,
  useGuestLanguage,
} from '../src/lib/guest-language';
import {
  deviceLanguage,
  I18nProvider,
  setActiveLanguage,
  translateFor,
  useI18n,
} from '../src/lib/i18n';
import type { UiLanguage } from '../src/lib/types';

// Snapshot of UI_LANGUAGE_OPTIONS' codes: the each-table (and every test title
// it generates) must stay invariant while Stryker mutates language-options.ts.
// A title interpolating mutated production data renames the test under the
// mutant, leaving killedBy references that match no dry-run test ID and failing
// the strict lane merge. Lookup-based assertions still kill every code mutant
// because the picker renders from the mutated production list.
const EXPECTED_UI_LANGUAGE_CODES: readonly UiLanguage[] = ['en', 'te', 'hi', 'es', 'zh'];

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockGetItem = jest.mocked(SecureStore.getItemAsync);
const mockSetItem = jest.mocked(SecureStore.setItemAsync);
const mockDeleteItem = jest.mocked(SecureStore.deleteItemAsync);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let preference: ReturnType<typeof useGuestLanguage> | null = null;

function PreferenceProbe() {
  const guest = useGuestLanguage();
  useEffect(() => {
    preference = guest;
  }, [guest]);
  return (
    <>
      <Text testID="guest-language">{guest.language}</Text>
      <Text testID="guest-restoring">{String(guest.isRestoring)}</Text>
      <Text testID="guest-error">{guest.persistenceError ?? 'none'}</Text>
    </>
  );
}

function PickerHarness({ accountLanguage = null }: { accountLanguage?: UiLanguage | null }) {
  const guest = useGuestLanguage();
  useEffect(() => {
    preference = guest;
  }, [guest]);
  return (
    <I18nProvider accountLanguage={accountLanguage} guestLanguage={guest.language}>
      <UiLanguagePicker
        value={guest.language}
        onChange={guest.setLanguage}
        error={guest.persistenceError}
      />
      <LocalizedCopyProbe />
    </I18nProvider>
  );
}

function LocalizedCopyProbe() {
  const { language, t } = useI18n();
  return <Text testID="localized-language">{`${language}:${t('login.submit')}`}</Text>;
}

function provider(child: React.ReactNode) {
  return <GuestLanguageProvider>{child}</GuestLanguageProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  preference = null;
  // Reset (not just clear) the SecureStore mocks: a test aborted mid-flight by
  // a mutation kill must not leak a queued once-return deferred into the next
  // test, where an awaited write would hang the suite forever.
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockDeleteItem.mockReset();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  setActiveLanguage('en');
});

afterEach(() => {
  setActiveLanguage('en');
});

describe('GuestLanguageProvider restore and persistence', () => {
  it('keeps restoration explicit, then uses the validated stored language', async () => {
    const restore = deferred<string | null>();
    mockGetItem.mockReturnValueOnce(restore.promise);
    await render(provider(<PreferenceProbe />));

    expect(screen.getByTestId('guest-restoring')).toHaveTextContent('true');
    expect(screen.getByTestId('guest-language')).toHaveTextContent(deviceLanguage());
    expect(mockGetItem).toHaveBeenCalledWith(
      guestLanguageStorage.key,
      guestLanguageStorage.options,
    );

    await act(async () => restore.resolve('es'));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('es');
  });

  it('falls back to the device language for invalid or unreadable storage', async () => {
    mockGetItem.mockResolvedValueOnce('fr');
    const invalid = await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent(deviceLanguage());
    await invalid.unmount();

    mockGetItem.mockRejectedValueOnce(new Error('keychain locked'));
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent(deviceLanguage());
    expect(screen.getByTestId('guest-error')).toHaveTextContent('none');
  });

  it('serializes rapid choices and lets only the newest operation publish an error', async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    mockSetItem.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise);
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));

    await act(async () => {
      preference!.setLanguage('te');
      preference!.setLanguage('es');
    });
    expect(screen.getByTestId('guest-language')).toHaveTextContent('es');
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(1));
    expect(mockSetItem).toHaveBeenNthCalledWith(
      1,
      guestLanguageStorage.key,
      'te',
      guestLanguageStorage.options,
    );

    await act(async () => firstWrite.reject(new Error('old write failed')));
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('guest-error')).toHaveTextContent('none');
    expect(mockSetItem).toHaveBeenNthCalledWith(
      2,
      guestLanguageStorage.key,
      'es',
      guestLanguageStorage.options,
    );

    await act(async () => secondWrite.resolve());
    expect(screen.getByTestId('guest-language')).toHaveTextContent('es');
    expect(screen.getByTestId('guest-error')).toHaveTextContent('none');
  });

  it('keeps a failed current choice visible and explains that it was not saved', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('store unavailable'));
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));

    await act(async () => preference!.setLanguage('zh'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('zh');
    await waitFor(() =>
      expect(screen.getByTestId('guest-error')).toHaveTextContent(
        translateFor('zh', 'language.saveFailed'),
      ),
    );
  });

  it('orders a remount restore behind a write from the prior provider lifetime', async () => {
    const oldWrite = deferred<void>();
    mockSetItem.mockReturnValueOnce(oldWrite.promise);
    const first = await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    await act(async () => preference!.setLanguage('hi'));
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(1));
    await first.unmount();

    mockGetItem.mockClear();
    mockGetItem.mockResolvedValueOnce('hi');
    await render(provider(<PreferenceProbe />));
    await act(async () => Promise.resolve());
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('guest-restoring')).toHaveTextContent('true');

    await act(async () => oldWrite.resolve());
    await waitFor(() => expect(mockGetItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('hi');
  });

  it('mirrors a new account language but skips a redundant confirmed mirror', async () => {
    mockGetItem.mockResolvedValueOnce('te');
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-language')).toHaveTextContent('te'));

    await act(async () => preference!.mirrorAccountLanguage('te'));
    expect(mockSetItem).not.toHaveBeenCalled();

    await act(async () => preference!.mirrorAccountLanguage('hi'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('hi');
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(1));
    expect(mockSetItem).toHaveBeenCalledWith(
      guestLanguageStorage.key,
      'hi',
      guestLanguageStorage.options,
    );
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('lets a signed-in caller observe a failed account-language mirror', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('store unavailable'));
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));

    await act(async () => {
      await expect(preference!.mirrorAccountLanguage('hi')).rejects.toThrow('store unavailable');
    });

    expect(screen.getByTestId('guest-language')).toHaveTextContent('hi');
    expect(screen.getByTestId('guest-error')).toHaveTextContent(
      translateFor('hi', 'language.saveFailed'),
    );
  });

  it('does not join a stale same-language mirror across an intervening device choice', async () => {
    const firstHi = deferred<void>();
    const spanish = deferred<void>();
    const finalHi = deferred<void>();
    mockSetItem
      .mockReturnValueOnce(firstHi.promise)
      .mockReturnValueOnce(spanish.promise)
      .mockReturnValueOnce(finalHi.promise);
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));

    let firstMirror!: Promise<void>;
    let secondMirror!: Promise<void>;
    await act(async () => {
      firstMirror = preference!.mirrorAccountLanguage('hi');
      await Promise.resolve();
      preference!.setLanguage('es');
      secondMirror = preference!.mirrorAccountLanguage('hi');
      await Promise.resolve();
    });
    expect(mockSetItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstHi.resolve();
      await firstMirror;
      await Promise.resolve();
    });
    expect(mockSetItem).toHaveBeenCalledTimes(2);
    expect(mockSetItem.mock.calls[1]?.[1]).toBe('es');

    await act(async () => {
      spanish.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSetItem).toHaveBeenCalledTimes(3);
    expect(mockSetItem.mock.calls[2]?.[1]).toBe('hi');

    await act(async () => {
      finalHi.resolve();
      await secondMirror;
    });
    expect(screen.getByTestId('guest-language')).toHaveTextContent('hi');
    expect(screen.getByTestId('guest-error')).toHaveTextContent('none');
  });

  it('ignores invalid runtime values and stale callbacks after unmount', async () => {
    const rendered = await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    const stale = preference!;
    await act(async () => stale.setLanguage('fr' as UiLanguage));
    expect(mockSetItem).not.toHaveBeenCalled();

    await rendered.unmount();
    await act(async () => {
      stale.setLanguage('te');
      stale.mirrorAccountLanguage('hi');
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('public app-language picker', () => {
  it.each(EXPECTED_UI_LANGUAGE_CODES.map((code) => [code]))(
    'switches, announces, and persists %s independently',
    async (language) => {
      await render(provider(<PickerHarness />));
      await waitFor(() => expect(preference?.isRestoring).toBe(false));

      const option = screen.getByTestId(`ui-language-${language}`);
      expect(option.props.accessibilityRole).toBe('radio');
      await fireEvent.press(option);

      await waitFor(() =>
        expect(mockSetItem).toHaveBeenCalledWith(
          guestLanguageStorage.key,
          language,
          guestLanguageStorage.options,
        ),
      );
      expect(screen.getByTestId('localized-language')).toHaveTextContent(
        `${language}:${translateFor(language as UiLanguage, 'login.submit')}`,
      );
      expect(screen.getByTestId(`ui-language-${language}`).props.accessibilityState).toEqual({
        checked: true,
        disabled: false,
        busy: false,
      });
    },
  );

  it('keeps the signed-in account language authoritative over the device preference', async () => {
    mockGetItem.mockResolvedValueOnce('es');
    await render(provider(<PickerHarness accountLanguage="hi" />));
    await waitFor(() => expect(preference?.isRestoring).toBe(false));

    expect(screen.getByTestId('localized-language')).toHaveTextContent(
      `hi:${translateFor('hi', 'login.submit')}`,
    );
  });

  it('exposes a radio group, disabled states, and persistence failures', async () => {
    mockGetItem.mockResolvedValueOnce('es');
    mockSetItem.mockRejectedValueOnce(new Error('store unavailable'));
    function ToggleHarness({ disabled }: { disabled: boolean }) {
      const guest = useGuestLanguage();
      useEffect(() => {
        preference = guest;
      }, [guest]);
      return (
        <I18nProvider accountLanguage={null} guestLanguage={guest.language}>
          <UiLanguagePicker
            value={guest.language}
            onChange={guest.setLanguage}
            disabled={disabled}
            error={guest.persistenceError}
          />
        </I18nProvider>
      );
    }
    const rendered = await render(provider(<ToggleHarness disabled />));
    await waitFor(() => expect(preference?.isRestoring).toBe(false));
    const [radioGroup] = screen.container.queryAll(
      (node) => node.props.accessibilityRole === 'radiogroup',
    );
    expect(radioGroup?.props.accessibilityLabel).toBe(translateFor('es', 'language.appLabel'));
    expect(radioGroup?.props.accessibilityHint).toBe(translateFor('es', 'language.appHelp'));
    expect(screen.getByTestId('ui-language-hi').props.accessibilityLabel).toBe(
      `${translateFor('es', 'language.appLabel')}: ${translateFor('es', 'language.hi')}, हिन्दी`,
    );
    expect(screen.getByTestId('ui-language-hi').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('ui-language-hi'));
    expect(mockSetItem).not.toHaveBeenCalled();

    await rendered.rerender(provider(<ToggleHarness disabled={false} />));
    await fireEvent.press(screen.getByTestId('ui-language-zh'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        translateFor('zh', 'language.saveFailed'),
      ),
    );
  });

  it('provides a safe inert English fallback outside the root provider', async () => {
    await render(<PreferenceProbe />);
    expect(screen.getByTestId('guest-language')).toHaveTextContent('en');
    expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false');
    await act(async () => {
      preference!.setLanguage('te');
      preference!.mirrorAccountLanguage('hi');
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Language catalog pins: the exported option tables are contracts (codes,
// stable English names, autonyms) consumed by pickers and tests alike.
// ---------------------------------------------------------------------------

// Probe the live light theme for token values; call BEFORE rendering (a later
// renderHook detaches earlier trees in this RNTL version).
const lightTheme = async () => (await renderHook(() => useTheme())).result.current;

describe('language option tables', () => {
  it('pins the mother-tongue catalog exactly', () => {
    expect(NATIVE_LANGUAGE_OPTIONS).toEqual([
      { code: 'te', english: 'Telugu', native: 'తెలుగు' },
      { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
      { code: 'es', english: 'Spanish', native: 'Español' },
      { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
    ]);
  });

  it('offers the five interface languages as English plus the mother tongues', () => {
    expect(UI_LANGUAGE_OPTIONS).toEqual([
      { code: 'en', english: 'English', native: 'English' },
      ...NATIVE_LANGUAGE_OPTIONS,
    ]);
    expect(UI_LANGUAGE_OPTIONS.map(({ code }) => code)).toEqual(['en', 'te', 'hi', 'es', 'zh']);
  });
});

describe('guest language storage contract', () => {
  it('pins the key, keychain service, and device-unlocked accessibility', () => {
    expect(guestLanguageStorage.key).toBe('ui_language_preference');
    expect(guestLanguageStorage.options).toEqual({
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      keychainService: 'ai-english-coach.ui-language',
    });
  });
});

describe('guest-language ordering and mirror contracts', () => {
  it('lets a newer explicit choice win over the restore it interrupts', async () => {
    const gate = deferred<string | null>();
    mockGetItem.mockReturnValueOnce(gate.promise);
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('true'));
    preference?.setLanguage('es');
    await act(async () => {
      gate.resolve('te');
    });
    await waitFor(() => expect(screen.getByTestId('guest-language')).toHaveTextContent('es'));
    expect(mockSetItem).toHaveBeenCalledWith(
      guestLanguageStorage.key,
      'es',
      guestLanguageStorage.options,
    );
  });

  it('never rewrites an already-confirmed account language', async () => {
    mockGetItem.mockResolvedValueOnce('te');
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    mockSetItem.mockClear();
    await act(async () => {
      await preference?.mirrorAccountLanguage('te');
    });
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('writes an unconfirmed same-language device fallback exactly once', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('en');
    mockSetItem.mockClear();
    await act(async () => {
      await preference?.mirrorAccountLanguage('en');
    });
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(
      guestLanguageStorage.key,
      'en',
      guestLanguageStorage.options,
    );
  });

  it('joins an identical in-flight mirror instead of issuing a second write', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    const gate = deferred<void>();
    mockSetItem.mockReturnValueOnce(gate.promise);
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = preference!.mirrorAccountLanguage('te');
      second = preference!.mirrorAccountLanguage('te');
    });
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    await act(async () => {
      gate.resolve();
      await first;
      await second;
    });
    expect(screen.getByTestId('guest-language')).toHaveTextContent('te');
    // The pending mirror is cleared, so a later different mirror still runs.
    mockSetItem.mockClear();
    await act(async () => {
      await preference?.mirrorAccountLanguage('hi');
    });
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it('ignores a mirror value outside the five supported languages', async () => {
    mockGetItem.mockResolvedValueOnce('te');
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    mockSetItem.mockClear();
    await act(async () => {
      await preference?.mirrorAccountLanguage('fr' as UiLanguage);
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('guest-language')).toHaveTextContent('te');
  });

  it('falls back to the device language when the stored read rejects', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('keychain locked'));
    await render(provider(<PreferenceProbe />));
    await waitFor(() => expect(screen.getByTestId('guest-restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('guest-language')).toHaveTextContent('en');
    expect(screen.getByTestId('guest-error')).toHaveTextContent('none');
  });
});

// ---------------------------------------------------------------------------
// Picker presentation: radiogroup semantics, spoken names, chip styling.
// ---------------------------------------------------------------------------
function StyledPickerHarness({
  value,
  disabled = false,
  error = null,
}: {
  value: UiLanguage;
  disabled?: boolean;
  error?: string | null;
}) {
  return (
    <I18nProvider accountLanguage={null} guestLanguage="en">
      <UiLanguagePicker value={value} onChange={jest.fn()} disabled={disabled} error={error} />
    </I18nProvider>
  );
}

describe('UiLanguagePicker presentation', () => {
  it('labels the group and every option with a spoken, readable name', async () => {
    const theme = await lightTheme();
    await render(<StyledPickerHarness value="te" />);
    const group = screen.getByTestId('ui-language-te').parent!;
    expect(group?.props.accessibilityRole).toBe('radiogroup');
    expect(group?.props.accessibilityLabel).toBe('App language');
    expect(group?.props.accessibilityHint).toBe(
      'Choose the language used by the app on this device.',
    );
    expect(screen.getByText('Choose the language used by the app on this device.')).toBeTruthy();
    expect(screen.getByText('App language')).toBeTruthy();

    // The autonym-only option (English) carries no second line; every other
    // chip speaks its localized name and autonym together.
    expect(screen.getByRole('radio', { name: 'App language: English' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'App language: Telugu, తెలుగు' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'App language: Hindi, हिन्दी' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'App language: Spanish, Español' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'App language: Chinese, 简体中文' })).toBeTruthy();

    const te = screen.getByTestId('ui-language-te');
    expect(te.props.accessibilityState).toEqual({ checked: true, disabled: false, busy: false });
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
      busy: false,
    });
    // Exactly the selected chip wears the selected fill and border.
    expect(StyleSheet.flatten(te.props.style)).toMatchObject({
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    });
    const en = screen.getByTestId('ui-language-en');
    expect(StyleSheet.flatten(en.props.style)).toMatchObject({
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.card,
      borderWidth: 1.5,
      borderRadius: theme.radii.input,
      minHeight: theme.layout.minimumTarget,
      minWidth: theme.layout.minimumTarget,
      flexGrow: 1,
      flexBasis: '30%',
      maxWidth: '48%',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    });
    // Grid and container composition.
    expect(StyleSheet.flatten(group.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    });
    expect(StyleSheet.flatten(group.parent!.props.style)).toMatchObject({
      marginTop: theme.spacing.lg,
      width: '100%',
    });
    // Label and help copy styles.
    expect(StyleSheet.flatten(screen.getByText('App language').props.style)).toMatchObject({
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    });
    expect(
      StyleSheet.flatten(
        screen.getByText('Choose the language used by the app on this device.').props.style,
      ),
    ).toMatchObject({
      marginTop: 4,
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    });
  });

  it('shows the localized second line only where it differs from the autonym', async () => {
    const theme = await lightTheme();
    await render(<StyledPickerHarness value="en" />);
    const en = screen.getByTestId('ui-language-en');
    expect(en.children).toHaveLength(1);
    expect(screen.getByText('English')).toBeTruthy();
    const te = screen.getByTestId('ui-language-te');
    // The Telugu chip shows autonym first, localized name second.
    expect(te.children).toHaveLength(2);
    expect(
      StyleSheet.flatten(
        (te.children[0] as unknown as { props: { style: unknown[] } }).props.style,
      ),
    ).toMatchObject({
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    });
    expect(
      StyleSheet.flatten(
        (te.children[1] as unknown as { props: { style: unknown[] } }).props.style,
      ),
    ).toMatchObject({ marginTop: 2, color: theme.colors.muted, fontSize: 13, textAlign: 'center' });
    // The selected English chip inks both names with the primary color.
    expect(
      StyleSheet.flatten(
        (en.children[0] as unknown as { props: { style: unknown[] } }).props.style,
      ),
    ).toMatchObject({ color: theme.colors.primary });
  });

  it('dims every chip while disabled and reports the state', async () => {
    const theme = await lightTheme();
    await render(<StyledPickerHarness value="te" disabled />);
    const te = screen.getByTestId('ui-language-te');
    expect(te.props.accessibilityState).toEqual({ checked: true, disabled: true, busy: false });
    expect(StyleSheet.flatten(te.props.style)).toMatchObject({ opacity: 0.5 });
    expect(StyleSheet.flatten(screen.getByTestId('ui-language-en').props.style)).toMatchObject({
      opacity: 0.5,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.card,
    });
  });

  it('styles the persistence error as a centered danger alert', async () => {
    const theme = await lightTheme();
    await render(<StyledPickerHarness value="en" error="Could not save" />);
    const alert = screen.getByRole('alert');
    expect(alert.props.children).toBe('Could not save');
    expect(StyleSheet.flatten(alert.props.style)).toMatchObject({
      marginTop: theme.spacing.sm,
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    });
  });
});
