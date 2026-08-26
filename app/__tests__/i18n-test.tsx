import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import {
  deviceLanguage,
  dictionaries,
  formatTemplate,
  getActiveLanguage,
  I18nProvider,
  languageForLocale,
  setActiveLanguage,
  SUPPORTED_UI_LANGUAGES,
  translate,
  translateFor,
  useI18n,
  useT,
  type MessageKey,
  type UiLanguage,
} from '../src/lib/i18n';

// Resolved per test rather than at module load: a catalog broken badly enough
// that `dictionaries.en` is missing must fail a test, not crash the file before
// jest can attribute the failure to anything.
function enKeys(): string[] {
  return Object.keys(dictionaries.en).sort();
}

function placeholderNames(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
}

afterEach(() => {
  // Keep the module-level active language deterministic across tests.
  setActiveLanguage('en');
});

describe('catalog completeness', () => {
  it('covers exactly the five supported languages', () => {
    expect(Object.keys(dictionaries).sort()).toEqual(['en', 'es', 'hi', 'te', 'zh']);
    expect([...SUPPORTED_UI_LANGUAGES].sort()).toEqual(['en', 'es', 'hi', 'te', 'zh']);
  });

  it.each(SUPPORTED_UI_LANGUAGES.map((language) => [language]))(
    '%s has no missing and no extra keys',
    (language) => {
      expect(Object.keys(dictionaries[language]).sort()).toEqual(enKeys());
    },
  );

  it.each(SUPPORTED_UI_LANGUAGES.map((language) => [language]))(
    '%s has no empty strings',
    (language) => {
      for (const [key, value] of Object.entries(dictionaries[language])) {
        expect({ key, empty: value.trim().length === 0 }).toEqual({ key, empty: false });
      }
    },
  );

  it.each(SUPPORTED_UI_LANGUAGES.map((language) => [language]))(
    '%s keeps every {placeholder} of the English source',
    (language) => {
      for (const key of enKeys() as MessageKey[]) {
        expect({ key, placeholders: placeholderNames(dictionaries[language][key]) }).toEqual({
          key,
          placeholders: placeholderNames(dictionaries.en[key]),
        });
      }
    },
  );

  it('keeps CEFR level codes untranslated in every language', () => {
    for (const language of SUPPORTED_UI_LANGUAGES) {
      for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
        expect(dictionaries[language][`cefr.${level}`]).toContain(level);
      }
    }
  });
});

describe('A1-English source copy pins for critical safety strings', () => {
  // Deliberate literal pins: this copy protects the learner's data and
  // privacy, so changes must be conscious, not incidental.
  it('pins the recorder privacy note', () => {
    expect(dictionaries.en['recorder.privacyNote']).toBe(
      'We send your recording only after you tap Send Answer.',
    );
  });

  it('pins retained-recording and temporary-upload privacy disclosures without removing the legal placeholder', () => {
    expect(dictionaries.en['privacy.p1']).toBe(
      'We store your name, email, practice answers, and successful submitted recordings so you can replay them until you delete the recording or your account.',
    );
    expect(dictionaries.en['privacy.p2']).toBe(
      'Failed or abandoned uploads are temporary. AI providers process submitted audio and its transcript to assess your answer.',
    );
    expect(dictionaries.en['legal.placeholderNote']).toContain('must review and replace');
  });

  it('pins the delete-account warning', () => {
    expect(dictionaries.en['da.warningBody']).toBe(
      'Deleting your account removes your profile, your test results, and your practice history. This cannot be undone.',
    );
  });

  it('pins the surprise-logout explanation', () => {
    expect(dictionaries.en['auth.sessionExpired']).toBe(
      'You were logged out to keep your account safe. Please log in again.',
    );
  });

  it('pins the double-submission guard copy', () => {
    expect(dictionaries.en['recorder.errNothingToConfirm']).toBe(
      'We could not check if your answer was saved. If you do not see it, please record it again.',
    );
  });

  it('pins the expired-reset-code copy to the code the mail actually carries', () => {
    expect(dictionaries.en['error.resetInvalid']).toBe(
      'This code does not work or it is too old. Please ask for a new code.',
    );
  });
});

describe('reset-failure copy names the emailed code', () => {
  // The reset mail contains a one-time code and no link at all, and the screen
  // asks the learner to paste that code; copy that says "link" leaves them with
  // nothing to connect the failure to.
  const codeWord: Record<UiLanguage, string> = {
    en: 'code',
    te: 'కోడ్',
    hi: 'कोड',
    es: 'código',
    zh: '验证码',
  };
  const linkWord: Record<UiLanguage, string> = {
    en: 'link',
    te: 'లింక్',
    hi: 'लिंक',
    es: 'enlace',
    zh: '链接',
  };

  it.each(SUPPORTED_UI_LANGUAGES.map((language) => [language]))(
    '%s speaks of a code, never a link',
    (language) => {
      expect(dictionaries[language]['error.resetInvalid']).toContain(codeWord[language]);
      expect(dictionaries[language]['error.resetInvalid']).not.toContain(linkWord[language]);
    },
  );
});

describe('unified auth terminology', () => {
  it('pins the English auth actions to Log in / Create account / Log out', () => {
    expect(dictionaries.en['login.submit']).toBe('Log in');
    expect(dictionaries.en['signup.submit']).toBe('Create account');
    expect(dictionaries.en['common.logOut']).toBe('Log out');
  });

  it.each(SUPPORTED_UI_LANGUAGES.map((language) => [language]))(
    '%s uses the same words for an action and the link that leads to it',
    (language) => {
      // The signup footer links to the login action and vice versa; divergent
      // wording for the same action confuses A1 learners.
      expect(dictionaries[language]['signup.footerLink']).toBe(
        dictionaries[language]['login.submit'],
      );
      expect(dictionaries[language]['login.footerLink']).toBe(
        dictionaries[language]['signup.submit'],
      );
    },
  );
});

describe('formatTemplate', () => {
  it('replaces named placeholders with strings and numbers', () => {
    expect(formatTemplate('Hi, {name}! Score {score}.', { name: 'Ada', score: 72 })).toBe(
      'Hi, Ada! Score 72.',
    );
  });

  it('replaces repeated placeholders everywhere', () => {
    expect(formatTemplate('{n} and {n}', { n: 2 })).toBe('2 and 2');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(formatTemplate('Hi, {name}!', { other: 'x' })).toBe('Hi, {name}!');
  });

  it('returns the template unchanged without params', () => {
    expect(formatTemplate('Hi, {name}!')).toBe('Hi, {name}!');
  });
});

describe('translateFor and translate', () => {
  it('defaults a fresh module to English before any language setter runs', () => {
    jest.isolateModules(() => {
      const isolated = jest.requireActual<typeof import('../src/lib/i18n')>('../src/lib/i18n');
      expect(isolated.getActiveLanguage()).toBe('en');
    });
  });

  it('formats parameters for an explicit language', () => {
    expect(translateFor('en', 'practice.greeting', { name: 'Ada' })).toBe('Hi, Ada');
    expect(translateFor('zh', 'practice.greeting', { name: 'Ada' })).toBe('你好，Ada');
  });

  it('translate follows the active language at call time', () => {
    expect(translate('login.submit')).toBe(dictionaries.en['login.submit']);
    setActiveLanguage('te');
    expect(getActiveLanguage()).toBe('te');
    expect(translate('login.submit')).toBe(dictionaries.te['login.submit']);
  });
});

describe('languageForLocale', () => {
  it.each([
    ['te', 'te'],
    ['te-IN', 'te'],
    ['hi-IN', 'hi'],
    ['es', 'es'],
    ['es-419', 'es'],
    ['zh-Hans-CN', 'zh'],
    ['ZH-CN', 'zh'],
    ['en-US', 'en'],
    ['fr-FR', 'en'],
    ['', 'en'],
    ['tel', 'en'],
    // Padded tags reach us from OS locale APIs; they must still match.
    ['  es  ', 'es'],
    ['\thi-IN\n', 'hi'],
  ] as [string, UiLanguage][])('maps %s to %s', (locale, expected) => {
    expect(languageForLocale(locale)).toBe(expected);
  });
});

describe('deviceLanguage', () => {
  const realDateTimeFormat = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = realDateTimeFormat;
  });

  /**
   * `deviceLanguage` memoises into module state, so each case needs its own
   * copy of the module. `resolvedOptions` is stubbed rather than the whole
   * Intl object so the rest of the module behaves normally.
   */
  function deviceLanguageWith(
    resolvedOptions: () => { locale?: unknown },
  ): typeof import('../src/lib/i18n') {
    Intl.DateTimeFormat = (() => ({ resolvedOptions })) as unknown as typeof Intl.DateTimeFormat;
    let isolated: typeof import('../src/lib/i18n') | undefined;
    jest.isolateModules(() => {
      isolated = jest.requireActual('../src/lib/i18n');
    });
    if (!isolated) throw new Error('Failed to load an isolated i18n module');
    return isolated;
  }

  it('maps the jest locale to a supported language and caches it', () => {
    const first = deviceLanguage();
    expect(SUPPORTED_UI_LANGUAGES).toContain(first);
    expect(deviceLanguage()).toBe(first);
    // Under jest the Intl locale is an English variant.
    expect(first).toBe('en');
  });

  it('maps a non-English device locale onto its supported language', () => {
    const isolated = deviceLanguageWith(() => ({ locale: 'es-ES' }));
    expect(isolated.deviceLanguage()).toBe('es');
  });

  it('answers from the cache instead of re-reading the locale', () => {
    const isolated = deviceLanguageWith(() => ({ locale: 'es-ES' }));
    expect(isolated.deviceLanguage()).toBe('es');

    // The OS locale changes underneath us; the memoised answer must win.
    Intl.DateTimeFormat = (() => ({
      resolvedOptions: () => ({ locale: 'hi-IN' }),
    })) as unknown as typeof Intl.DateTimeFormat;
    expect(isolated.deviceLanguage()).toBe('es');
  });

  it('falls back to English when the platform reports a non-string locale', () => {
    const isolated = deviceLanguageWith(() => ({ locale: 42 }));
    expect(isolated.deviceLanguage()).toBe('en');
  });

  it('ignores a locale that only looks like a string', () => {
    // A boxed String (what some Intl polyfills hand back) has working trim and
    // toLowerCase, so it would map to a language if the typeof guard were
    // dropped. The guard exists to keep detection on real primitives.
    const isolated = deviceLanguageWith(() => ({ locale: Object('es-ES') }));
    expect(isolated.deviceLanguage()).toBe('en');
  });

  it('falls back to English when reading the locale throws', () => {
    const isolated = deviceLanguageWith(() => {
      throw new Error('no locale information on this platform');
    });
    expect(isolated.deviceLanguage()).toBe('en');
  });
});

// ----- Provider / hook language selection -----

function Probe() {
  const { language, t } = useI18n();
  return (
    <>
      <Text testID="lang">{language}</Text>
      <Text testID="msg">{t('login.submit')}</Text>
    </>
  );
}

function HookProbe() {
  const t = useT();
  return <Text testID="msg">{t('common.tryAgain')}</Text>;
}

describe('I18nProvider language selection', () => {
  it("uses the signed-in account's UI language and syncs event-time copy", async () => {
    await render(
      <I18nProvider accountLanguage="te">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('te');
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.te['login.submit']);
    // The provider effect keeps module-level translate() in sync.
    expect(getActiveLanguage()).toBe('te');
    expect(translate('login.submit')).toBe(dictionaries.te['login.submit']);
  });

  it('always uses English when signed out', async () => {
    await render(
      <I18nProvider accountLanguage={null}>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.en['login.submit']);
  });

  it('supports an account UI language independently of learning language', async () => {
    await render(
      <I18nProvider accountLanguage="hi">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('hi');
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.hi['login.submit']);
    expect(getActiveLanguage()).toBe('hi');
  });

  it('switches languages when the user changes', async () => {
    const view = await render(
      <I18nProvider accountLanguage="es">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.es['login.submit']);
    await view.rerender(
      <I18nProvider accountLanguage={null}>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.en['login.submit']);
    expect(getActiveLanguage()).toBe('en');
  });
});

describe('useI18n / useT without a provider', () => {
  it('falls back to the active language instead of throwing', async () => {
    setActiveLanguage('hi');
    await render(<HookProbe />);
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.hi['common.tryAgain']);
  });

  it('exposes the live active language without a provider', async () => {
    setActiveLanguage('es');
    await render(<Probe />);
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(screen.getByTestId('msg')).toHaveTextContent(dictionaries.es['login.submit']);
  });
});
