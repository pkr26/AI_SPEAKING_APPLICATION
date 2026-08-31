// Scenario 9: SETTINGS deep-dive per mother tongue (order: te → hi → zh → es).
// Per language: full settings surface + the UI-language vs mother-tongue
// separation proof (same question, flipped profile languages).
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};
const SCRIPTS = {
  te: /[\u0C00-\u0C7F]/, hi: /[\u0900-\u097F]/, zh: /[\u3400-\u9FFF\uF900-\uFAFF]/,
  es: /[a-záéíóúüñ¿¡]/i,
};
const NATIVE_NAMES = { te: 'తెలుగు నేర్చుకునేవాడు', hi: 'हिन्दी सीखने वाला', zh: '中文学习者', es: 'Estudiante español' };
const ORDER = ['te', 'hi', 'zh', 'es'];
const nextLang = (l) => ORDER[(ORDER.indexOf(l) + 1) % ORDER.length];
const otherUi = (l) => (l === 'zh' ? 'en' : 'zh');

note(`SCENARIO 9 — settings per mother tongue (${ORDER.join(' → ')}) against ${BASE}`);

for (const lang of ORDER) {
  note(`--- ${lang}: settings surface ---`);
  const email = `j9_${lang}_${Date.now()}@example.com`;
  const reg = await step(`[${lang}] Register (native=${lang}, ui=${lang})`, 'POST', '/auth/register', {
    json: { name: `Settings ${lang}`, email, password: 'secret123', nativeLanguage: lang, uiLanguage: lang },
  });
  const token = reg.body.token;
  check(`[${lang}] languages persisted at signup`, reg.body.user.nativeLanguage === lang && reg.body.user.uiLanguage === lang);

  let q = (await step(`[${lang}] Placement question 1`, 'GET', '/diagnostic/next', { token })).body;
  for (let i = 1; i <= 3; i++) {
    const a = await step(`[${lang}] Placement answer ${i}`, 'POST', '/diagnostic/answer', { token, form: audioForm(q.question.id, uuid()) });
    if (a.body.done) break;
    q = { question: a.body.nextQuestion };
  }
  await step(`[${lang}] Acknowledge placement`, 'POST', '/diagnostic/acknowledge', { token });
  const pq = await step(`[${lang}] Practice assignment`, 'GET', '/practice/question', { token });
  const Q = pq.body.question;

  const help1 = await step(`[${lang}] Help (baseline, mother tongue ${lang})`, 'GET', `/practice/question/${Q.id}/help`, { token });
  check(`[${lang}] baseline help in mother-tongue script`, SCRIPTS[lang].test(help1.body.promptWordNative || ''), JSON.stringify(help1.body.promptWordNative));

  // uiLanguage must NOT relocalize learning content.
  const ui1 = await step(`[${lang}] Switch ONLY the interface language to ${otherUi(lang)}`, 'PATCH', '/auth/me', { token, json: { uiLanguage: otherUi(lang) } });
  check(`[${lang}] uiLanguage switch persisted`, ui1.body.user.uiLanguage === otherUi(lang) && ui1.body.user.nativeLanguage === lang);
  const help2 = await step(`[${lang}] Help for the SAME question after the UI switch`, 'GET', `/practice/question/${Q.id}/help`, { token });
  check(`[${lang}] help still in ${lang} (UI language did not touch content)`,
    JSON.stringify(help2.body) === JSON.stringify(help1.body), 'help changed!');

  // nativeLanguage DOES relocalize help for the identical question.
  const nat1 = await step(`[${lang}] Switch MOTHER TONGUE to ${nextLang(lang)}`, 'PATCH', '/auth/me', { token, json: { nativeLanguage: nextLang(lang) } });
  check(`[${lang}] nativeLanguage switch persisted`, nat1.body.user.nativeLanguage === nextLang(lang));
  const help3 = await step(`[${lang}] Help for the SAME question after the mother-tongue switch`, 'GET', `/practice/question/${Q.id}/help`, { token });
  check(`[${lang}] help now in ${nextLang(lang)} script`, SCRIPTS[nextLang(lang)].test(help3.body.promptWordNative || ''), JSON.stringify(help3.body.promptWordNative));
  check(`[${lang}] English wording unchanged across all three fetches`,
    help1.body.promptWord === help2.body.promptWord && help2.body.promptWord === help3.body.promptWord);

  // Every uiLanguage value persists (Settings radio grid).
  for (const ui of ['en', 'te', 'hi', 'es', 'zh']) {
    const r = await step(`[${lang}] App-language radio → ${ui}`, 'PATCH', '/auth/me', { token, json: { uiLanguage: ui } });
    check(`[${lang}] uiLanguage=${ui} persisted`, r.status === 200 && r.body.user.uiLanguage === ui);
  }

  // Name save in the language's own script.
  const nm = await step(`[${lang}] Save a name written in ${lang} script`, 'PATCH', '/auth/me', { token, json: { name: NATIVE_NAMES[lang] } });
  check(`[${lang}] native-script name saved`, nm.status === 200 && nm.body.user.name === NATIVE_NAMES[lang]);

  // Export reflects the languages.
  const exp = await step(`[${lang}] Data export`, 'GET', '/auth/me/data', { token });
  check(`[${lang}] export carries the profile languages`, exp.body.user.nativeLanguage === nextLang(lang) && typeof exp.body.user.uiLanguage === 'string');

  // Full lifecycle tail per language.
  const cp = await step(`[${lang}] Change password`, 'POST', '/auth/change-password', { token, json: { currentPassword: 'secret123', newPassword: 'changed123' } });
  check(`[${lang}] change-password ok`, cp.status === 200 && typeof cp.body.token === 'string');
  await step(`[${lang}] Old token rejected`, 'GET', '/auth/me', { token });
  const lo = await step(`[${lang}] Log out`, 'POST', '/auth/logout', { token: cp.body.token });
  check(`[${lang}] logout 204`, lo.status === 204);
  const relog = await step(`[${lang}] Log in with the new password`, 'POST', '/auth/login', { json: { email, password: 'changed123' } });
  check(`[${lang}] re-login ok`, relog.status === 200);
  const del = await step(`[${lang}] Delete account (final for this learner)`, 'DELETE', '/auth/account', { token: relog.body.token, json: { password: 'changed123' } });
  check(`[${lang}] account deleted`, del.status === 204);
}

console.log(`\n== SCENARIO 9 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
