# Scenario 9 — Settings deep-dive per mother tongue (te → hi → zh → es)

**Persona:** four learners — Telugu first, then Hindi, then Chinese, then
Spanish — each running the ENTIRE settings surface plus the
interface-vs-mother-tongue separation proof. Evidence:
[`evidence/scenario9.log`](evidence/scenario9.log) — **72/72 checks passed**
(18 per language). UI-layer behavior additionally pinned by the app's own
targeted suites: `i18n-test.tsx`, `screens-settings-test.tsx`,
`screens-settings-profile-test.tsx`, `guest-language-test.tsx`,
`daily-reminder-test.ts` — **409/409 passing** (part of the 3,875-test run).

## The separation proof (run per language)

Three help fetches for the **same question id**, with profile flips between
them:

| Step | uiLanguage | nativeLanguage | Help native column |
| --- | --- | --- | --- |
| 1 | lang | lang | **lang** script ✓ |
| 2 | switched (e.g. zh) | lang (unchanged) | **still lang** — byte-identical response ✓ |
| 3 | zh | switched to next language | **new language** script ✓ |

Verified in all four languages: switching the **interface** language never
relocalizes learning content (the help responses were *JSON-identical*), while
switching the **mother tongue** re-renders the identical question in the new
language, English wording unchanged. This is exactly the documented
"UI vs mother tongue" contract, now proven live in every language.

## Per-language settings matrix (identical results ×4)

- **Signup languages persist**: register with `nativeLanguage=lang,
  uiLanguage=lang` → both echoed in the user contract.
- **All five interface-language radios** (en/te/hi/es/zh) persist per
  language-owner; uppercase/case-mismatched codes rejected (report 04).
- **Native-script profile names** save and persist: `తెలుగు నేర్చుకునేవాడు`,
  `हिन्दी सीखने वाला`, `中文学习者`, `Estudiante español`.
- **Data export** reflects the live language pair.
- **Full lifecycle tail per language**: change password (old token revoked) →
  logout → re-login with the new password → account deletion — all green in
  all four languages.

## What this settles

Every Settings control that touches the network behaves identically for all
four mother tongues — no language is a second-class citizen, and the
language-sensitive surface (help/translations) follows the mother tongue
only. The daily-reminder toggle/hour stepper and the UMP ad-privacy card
remain device-local by design (no API exists; pinned by the app suites
above).

## Verdict

**Pass, 72/72.**
