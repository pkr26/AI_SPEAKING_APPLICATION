import * as SecureStore from 'expo-secure-store';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { Text } from 'react-native';

import UiLanguagePicker from '../src/components/UiLanguagePicker';
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
import { UI_LANGUAGE_OPTIONS } from '../src/lib/language-options';
import type { UiLanguage } from '../src/lib/types';

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
  it.each(UI_LANGUAGE_OPTIONS.map(({ code }) => [code]))(
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
        selected: true,
        disabled: false,
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
