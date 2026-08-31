import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { deviceLanguage, setActiveLanguage, translateFor } from './i18n';
import type { UiLanguage } from './types';

const LANGUAGE_KEY = 'ui_language_preference';
const LANGUAGE_KEYCHAIN_SERVICE = 'ai-english-coach.ui-language';
const LANGUAGE_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: LANGUAGE_KEYCHAIN_SERVICE,
};

/** Type guard for the five supported UI language codes. */
function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'en' || value === 'te' || value === 'hi' || value === 'es' || value === 'zh';
}

// One process-wide tail orders old-provider writes, a new provider's restore,
// and every later choice. A remount can therefore never read before an older
// write or let that older write land after a newer provider's selection.
let languageStorageTail: Promise<void> = Promise.resolve();

/** Loads the persisted preference through the tail so it waits for older writes. */
function readStoredLanguage(): Promise<string | null> {
  const read = languageStorageTail.then(() =>
    SecureStore.getItemAsync(LANGUAGE_KEY, LANGUAGE_STORAGE_OPTIONS),
  );
  languageStorageTail = read.then(
    () => undefined,
    () => undefined,
  );
  return read;
}

/** Persists the preference through the tail, ordering it after every queued access. */
function writeStoredLanguage(language: UiLanguage): Promise<void> {
  const write = languageStorageTail.then(() =>
    SecureStore.setItemAsync(LANGUAGE_KEY, language, LANGUAGE_STORAGE_OPTIONS),
  );
  languageStorageTail = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

interface GuestLanguageContextValue {
  /** Signed-out and pre-profile UI language for this device. */
  language: UiLanguage;
  /** True until the persisted preference has either loaded or safely fallen back. */
  isRestoring: boolean;
  /** Current-language explanation when a user choice could not be persisted. */
  persistenceError: string | null;
  /** Optimistically changes and durably saves the device preference. */
  setLanguage: (language: UiLanguage) => void;
  /** Saves a confirmed account preference for the next restore/sign-out. */
  mirrorAccountLanguage: (language: UiLanguage) => Promise<void>;
}

/** Deterministic English fallback for provider-less tests and boundary renders. */
const FALLBACK_CONTEXT: GuestLanguageContextValue = {
  language: 'en',
  isRestoring: false,
  persistenceError: null,
  setLanguage: () => undefined,
  mirrorAccountLanguage: async () => undefined,
};

const GuestLanguageContext = createContext<GuestLanguageContextValue | null>(null);

/**
 * Owns the one non-sensitive language value that must remain available before
 * an account profile can be fetched. Writes are serialized, and every async
 * continuation checks an epoch so an older restore/failure cannot overwrite a
 * newer tap or a confirmed account language.
 */
export function GuestLanguageProvider({ children }: { children: React.ReactNode }) {
  const fallback = deviceLanguage();
  const [language, setLanguageState] = useState<UiLanguage>(fallback);
  const [isRestoring, setIsRestoring] = useState(true);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const epochRef = useRef(0);
  const languageRef = useRef<UiLanguage>(fallback);
  const confirmedRef = useRef<UiLanguage | null>(null);
  const pendingMirrorRef = useRef<{ language: UiLanguage; promise: Promise<void> } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const restoreEpoch = ++epochRef.current;
    void readStoredLanguage()
      .then((stored) => {
        if (!mountedRef.current || restoreEpoch !== epochRef.current) return;
        let storedLanguage: UiLanguage | null = null;
        if (isUiLanguage(stored)) storedLanguage = stored;
        const restored = storedLanguage ?? fallback;
        confirmedRef.current = storedLanguage;
        languageRef.current = restored;
        setActiveLanguage(restored);
        setLanguageState(restored);
        setPersistenceError(null);
      })
      .catch(() => {
        if (!mountedRef.current || restoreEpoch !== epochRef.current) return;
        languageRef.current = fallback;
        confirmedRef.current = null;
        setActiveLanguage(fallback);
        setLanguageState(fallback);
        setPersistenceError(null);
      })
      .finally(() => {
        if (mountedRef.current && restoreEpoch === epochRef.current) setIsRestoring(false);
      });

    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
    };
  }, [fallback]);

  /**
   * Optimistically applies and durably saves a language. Claims a new epoch so
   * a stale restore or an older queued write can never overwrite the choice;
   * only the in-epoch write failure surfaces `persistenceError` and rethrows.
   */
  const persistLanguage = useCallback(async (nextLanguage: UiLanguage): Promise<void> => {
    if (!mountedRef.current || !isUiLanguage(nextLanguage)) return;
    const operationEpoch = ++epochRef.current;
    languageRef.current = nextLanguage;
    setActiveLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    setPersistenceError(null);

    try {
      await writeStoredLanguage(nextLanguage);
      if (!mountedRef.current || operationEpoch !== epochRef.current) return;
      confirmedRef.current = nextLanguage;
    } catch (error) {
      if (mountedRef.current && operationEpoch === epochRef.current) {
        setPersistenceError(translateFor(nextLanguage, 'language.saveFailed'));
      }
      throw error;
    }
  }, []);

  /** Learner-facing pick: applies the choice and never rejects to the caller. */
  const setLanguage = useCallback(
    (nextLanguage: UiLanguage) => {
      // Public signed-out pickers render persistenceError themselves. Absorb
      // the promise rejection here so an event callback never creates an
      // unhandled rejection.
      // A later account mirror must not join a same-language write that this
      // explicit intervening choice has already superseded.
      pendingMirrorRef.current = null;
      void persistLanguage(nextLanguage).catch(() => undefined);
    },
    [persistLanguage],
  );

  /**
   * Records a confirmed account `uiLanguage` for the next restore/sign-out.
   * Skips the keychain write when the same value is already confirmed, and
   * joins an identical in-flight write instead of issuing a second one.
   */
  const mirrorAccountLanguage = useCallback(
    async (accountLanguage: UiLanguage): Promise<void> => {
      if (!isUiLanguage(accountLanguage)) return;
      // Avoid a keychain write on every profile refresh. A different in-memory
      // value still updates immediately; an unconfirmed same-language device
      // fallback is written once so a later locale change cannot replace it.
      if (languageRef.current === accountLanguage && confirmedRef.current === accountLanguage) {
        return;
      }
      const existing = pendingMirrorRef.current;
      if (existing?.language === accountLanguage && languageRef.current === accountLanguage) {
        await existing.promise;
        return;
      }
      const promise = persistLanguage(accountLanguage);
      const pending = { language: accountLanguage, promise };
      pendingMirrorRef.current = pending;
      try {
        await promise;
      } finally {
        if (pendingMirrorRef.current === pending) pendingMirrorRef.current = null;
      }
    },
    [persistLanguage],
  );

  // New identity only when observable state changes; the setters are stable.
  const value = useMemo<GuestLanguageContextValue>(
    () => ({
      language,
      isRestoring,
      persistenceError,
      setLanguage,
      mirrorAccountLanguage,
    }),
    [isRestoring, language, mirrorAccountLanguage, persistenceError, setLanguage],
  );

  return <GuestLanguageContext.Provider value={value}>{children}</GuestLanguageContext.Provider>;
}

/** A fallback keeps isolated component tests and error boundaries deterministic. */
export function useGuestLanguage(): GuestLanguageContextValue {
  return useContext(GuestLanguageContext) ?? FALLBACK_CONTEXT;
}

/** Exposes the key and keychain options so tests can seed and reset the store. */
export const guestLanguageStorage = Object.freeze({
  key: LANGUAGE_KEY,
  options: LANGUAGE_STORAGE_OPTIONS,
});
