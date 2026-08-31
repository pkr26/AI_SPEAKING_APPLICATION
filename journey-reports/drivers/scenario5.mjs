// Scenario 5: the SAME learner journey in all four mother tongues
// (te, hi, es, zh): signup, placement, bilingual help per script, English
// attempt, native-language attempt, history/export language snapshots,
// uiLanguage persistence.
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};

const SCRIPTS = {
  te: { re: /[\u0C00-\u0C7F]/, label: 'Telugu script' },
  hi: { re: /[\u0900-\u097F]/, label: 'Devanagari' },
  es: { re: /[a-záéíóúüñ¿¡]/i, label: 'Latin/Spanish' },
  zh: { re: /[\u3400-\u9FFF\uF900-\uFAFF]/, label: 'CJK' },
};

note(`SCENARIO 5 — four-language matrix against ${BASE}`);

for (const lang of ['te', 'hi', 'es', 'zh']) {
  note(`--- learner with mother tongue: ${lang} (${SCRIPTS[lang].label}) ---`);
  const email = `journey5_${lang}_${Date.now()}@example.com`;
  const reg = await step(`[${lang}] Register (uiLanguage=${lang} from the guest picker)`, 'POST', '/auth/register', {
    json: { name: `Learner ${lang}`, email, password: 'secret123', nativeLanguage: lang, uiLanguage: lang },
  });
  const token = reg.body.token;
  check(`[${lang}] register echoes native+ui language`, reg.body.user.nativeLanguage === lang && reg.body.user.uiLanguage === lang);

  // quick placement (3 answers)
  let q = (await step(`[${lang}] Placement question 1`, 'GET', '/diagnostic/next', { token })).body;
  for (let i = 1; i <= 3; i++) {
    const a = await step(`[${lang}] Placement answer ${i}`, 'POST', '/diagnostic/answer', {
      token, form: audioForm(q.question.id, uuid()),
    });
    if (a.body.done) break;
    q = { question: a.body.nextQuestion };
  }
  await step(`[${lang}] Acknowledge placement`, 'POST', '/diagnostic/acknowledge', { token });

  const pq = await step(`[${lang}] First practice assignment`, 'GET', '/practice/question', { token });
  const Q = pq.body.question, cycle = pq.body.cycleId;

  const help = await step(`[${lang}] Bilingual help — native column must be ${SCRIPTS[lang].label}`, 'GET', `/practice/question/${Q.id}/help`, { token });
  check(`[${lang}] promptWordNative in ${SCRIPTS[lang].label}`, SCRIPTS[lang].re.test(help.body.promptWordNative || ''), JSON.stringify(help.body.promptWordNative));
  check(`[${lang}] questionTextNative in ${SCRIPTS[lang].label}`, SCRIPTS[lang].re.test(help.body.questionTextNative || ''), JSON.stringify(help.body.questionTextNative).slice(0, 120));
  check(`[${lang}] all 3 examples native in ${SCRIPTS[lang].label}`,
    (help.body.examples || []).length === 3 && help.body.examples.every((e) => SCRIPTS[lang].re.test(e.native || '')),
    JSON.stringify(help.body.examples).slice(0, 200));

  // Native FIRST on the fresh cycle (as the app's toggle does), then English:
  // a passing English try closes the cycle, so the reverse order would 409.
  const nat = await step(`[${lang}] Native attempt first (speak in my language)`, 'POST', '/practice/attempt/native', {
    token, form: audioForm(Q.id, uuid(), cycle),
  });
  check(`[${lang}] native attempt echoes the account language`, nat.status === 200 && nat.body.nativeLanguage === lang && nat.body.mode === 'native', JSON.stringify(nat.body).slice(0, 150));
  check(`[${lang}] native attempt carries transcript + translation + model answer`,
    typeof nat.body.transcript === 'string' && typeof nat.body.translatedTranscript === 'string' && typeof nat.body.modelAnswer === 'string');

  const eng = await step(`[${lang}] English attempt (try 2 of the shared budget)`, 'POST', '/practice/attempt', {
    token, form: audioForm(Q.id, uuid(), cycle),
  });
  check(`[${lang}] English attempt scores normally (shared budget: attemptNo 2)`, eng.status === 200 && typeof eng.body.score === 'number' && eng.body.attemptNo === 2, JSON.stringify(eng.body).slice(0, 150));

  const hist = await step(`[${lang}] History shows the native row with its language snapshot`, 'GET', '/practice/history', { token });
  const nativeRows = (hist.body.items || []).filter((i) => i.context === 'practice-native');
  check(`[${lang}] history native rows snapshot nativeLanguage=${lang}`, nativeRows.length > 0 && nativeRows.every((r) => r.nativeLanguage === lang), JSON.stringify(nativeRows[0] || {}).slice(0, 150));

  const exp = await step(`[${lang}] Data export includes the native rows`, 'GET', '/auth/me/data', { token });
  const expNative = (exp.body.attempts || []).filter((i) => i.context === 'practice-native');
  check(`[${lang}] export native rows carry nativeLanguage=${lang}`, expNative.length > 0 && expNative.every((r) => r.nativeLanguage === lang));

  // switch the interface language away and back (Settings radio grid)
  const away = lang === 'en' ? 'te' : 'en';
  await step(`[${lang}] Switch interface language to ${away} and back`, 'PATCH', '/auth/me', { token, json: { uiLanguage: away } });
  const back = await step(`[${lang}] Restore interface language ${lang}`, 'PATCH', '/auth/me', { token, json: { uiLanguage: lang } });
  check(`[${lang}] uiLanguage round-trips`, back.body.user.uiLanguage === lang);
}

// Whisper hint pinning (code-verified, assess.ts): hi/es/zh pass their exact
// whisper-1 language code; Telugu omits the code because whisper-1 rejects 'te'.
console.log('\n== NOTE (code-verified in server/src/assess.ts assessNativeComprehension):');
console.log('==   transcriptionLanguage = (nativeLanguage === "te") ? undefined : nativeLanguage');
console.log('==   -> hi/es/zh get an exact Whisper language hint; te is auto-detected by the model.');

console.log(`\n== SCENARIO 5 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
