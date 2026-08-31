# Scenario 5 — The same journey in all four mother tongues (te / hi / es / zh)

**Persona:** four learners, one per supported mother tongue, each running the
complete loop: signup (with the interface language preset to their tongue),
placement, bilingual help, a native-language attempt, an English attempt,
history, and data export. Evidence:
[`evidence/scenario5.log`](evidence/scenario5.log) — **40/40 checks passed**
(10 per language). Script identity was asserted by Unicode range, so a
wrong-language translation cannot pass.

## The matrix (identical for every language)

| Step | te (Telugu) | hi (Hindi) | es (Spanish) | zh (Chinese) |
| --- | --- | --- | --- | --- |
| Register `nativeLanguage` + `uiLanguage` | ✓ persisted | ✓ | ✓ | ✓ |
| 3-question placement → level assigned | ✓ | ✓ | ✓ | ✓ |
| `GET /practice/question/:id/help` native column in the right script | ✓ తెలుగు | ✓ हिन्दी | ✓ español | ✓ 中文 |
| 3 bilingual examples, each native column in script | ✓ | ✓ | ✓ | ✓ |
| Native attempt echoes `nativeLanguage` | ✓ te | ✓ hi | ✓ es | ✓ zh |
| Native attempt returns transcript + English translation + model answer | ✓ | ✓ | ✓ | ✓ |
| English attempt as try 2 of the shared budget | ✓ attemptNo 2 | ✓ | ✓ | ✓ |
| History `practice-native` rows snapshot the language | ✓ | ✓ | ✓ | ✓ |
| Data export includes the native rows with the snapshot | ✓ | ✓ | ✓ | ✓ |
| `uiLanguage` round-trip (switch away and back) | ✓ | ✓ | ✓ | ✓ |

## Sampled real content (from the evidence log)

- **te** — word "collectivism": `సమూహవాదం`; question "వ్యక్తి కంటే సమూహానికి
  ప్రాధాన్యం ఇచ్చినప్పుడు సమాజాలు ఏమి పొందుతాయి, ఏమి కోల్పోతాయి?"
- **hi** — word "dress": `पोशाक`; example pair `"My sister has a red dress."
  → "मेरी बहन के पास एक लाल पोशाक है।"`
- **es** — word "language": `idioma`; question "¿Por qué estás aprendiendo
  inglés y cómo lo practicas?"
- **zh** — word "hotel": `酒店`; example `"去年我们住在海边的一家小酒店。"`

## Behaviors worth calling out

- **Native first, English second:** the driver originally ran the English
  attempt first; when it passed on try 1 the cycle correctly closed
  (`409 PRACTICE_CYCLE_CLOSED` for the native attempt) — a pass always ends
  the cycle, `attemptsLeft` drops to 0 immediately. Re-ordered native-first,
  the shared budget showed `attemptNo 2` for the English try in all four
  languages. (The product was right; the driver was wrong.)
- **Language is snapshotted, not relabeled:** history and export rows carry
  the `nativeLanguage` that owned the assessment at submit time — changing
  the mother tongue later (report 03 §40) never rewrites old native rows.
- **Whisper hint pinning** (code-verified, `server/src/assess.ts`,
  `assessNativeComprehension`): `transcriptionLanguage =
  nativeLanguage === 'te' ? undefined : nativeLanguage` — Hindi, Spanish,
  and Chinese speech is transcribed with an exact `whisper-1` language code;
  Telugu omits the hint because whisper-1 rejects `te`, and the model
  auto-detects instead. This distinction only affects live transcription
  (mock mode simulates it identically for all four).
- **Interface vs mother tongue:** `uiLanguage` (5 values incl. `en`) and
  `nativeLanguage` (4 values) are independent axes; both persisted every
  legal value and rejected everything else (report 04).

## Verdict

**Pass, 40/40.** All four mother tongues produce genuinely distinct
native-language content in the correct script, identical assessment
contracts, correct language snapshots in history/export, and independent
interface-language switching. No language is a second-class citizen.
