# Scenario 4 — Every settings/profile FIELD at its boundaries

**Persona:** a learner opening Settings (and the signup/login/forgot/reset
forms) and exercising every field and radio the UI exposes. Evidence:
[`evidence/scenario4.log`](evidence/scenario4.log) — 27/27 checks passed.
The client-side rules cited come from `app/src/lib/password-policy.ts`,
`identity-validation.ts`, and the screen validators, which mirror these
server rules.

## Signup form fields (`POST /auth/register`)

**Guest interface-language picker** — the app sends the pre-signup language
choice as `uiLanguage`; registering with `uiLanguage:"te"` persisted it
(`user.uiLanguage === "te"`). Omitting it defaults to `en`.

**Name field** (`PATCH /auth/me {name}` — same rules as signup):

| Input | Result |
| --- | --- |
| empty string | 400 `name is required` (trim runs first) |
| `"   "` whitespace only | 400 `name is required` |
| `"A"` single character | **200** persisted |
| exactly 100 chars | **200** |
| 101 chars | 400 `name must be at most 100 characters` |
| `"bad\u2028name"` (line separator) | 400 `name must not contain control characters` |
| Telugu-script name `పవన్ కుమార్` | **200** persisted |
| emoji name `🙂📚` | **200** persisted (export shows it verbatim) |

**Email field:** registered as `Mixed.Case.<ts>@EXAMPLE.COM` → stored
lowercase (`mixed.case.<ts>@example.com`), and logging in later with the
**fully uppercase** form of the address returned **200** — email is
trimmed + lowercased on both register and login, so case can never lock
anyone out.

**Password field** (server-enforced, identical to the app's
`passwordPolicyError`):

| Input | Result |
| --- | --- |
| 7 chars with a number | 400 |
| exactly 8 (`abcd1234`) | **201** |
| no letter (`12345678`) | 400 |
| no number (`abcdefgh`) | 400 |
| exactly 72 ASCII bytes | **201** (bcrypt ceiling) |
| 73 ASCII bytes | 400 `at most 72 UTF-8 bytes` |

**Mother-tongue radio grid:** only `te/hi/es/zh` accepted (see report 05 for
the four-language matrix).

## Settings screen fields

**Profile name editor (Save button):** all name rows above. Two hostile
extras:
- `PATCH /auth/me {}` (empty save) → **400 "at least one of name,
  nativeLanguage, or uiLanguage is required"** — a blank save cannot wipe
  anything.
- `PATCH /auth/me {role:"admin"}` (unknown field) → **400** with the same
  message — unknown fields are rejected rather than silently stored; there is
  no mass-assignment path.

**App-language radios (`uiLanguage`)**: `en`, `te`, `hi`, `es`, `zh` each →
**200** and persisted in the returned user (the app switches all copy
instantly). Uppercase `"TE"` → **400** (the enum is case-sensitive).

**Learning-language radios (`nativeLanguage`)**: all four mother tongues →
**200**; `en` → **400** (English is the target language, not a mother
tongue).

**Daily reminder toggle + hour stepper:** purely device-local
(SecureStore + local notification copy); no API call exists for it — verified
from the app source (the Settings screen writes the preference locally; only
`name`/`nativeLanguage`/`uiLanguage` go to `PATCH /auth/me`).

**Ads privacy options card:** driven by `/client-config` (ads hard-disabled)
and the local UMP consent flow; no per-account ad API exists today.

## Change-password form (`POST /auth/change-password`)

| Input | Result |
| --- | --- |
| new password == current | **400** `new password must be different from the current password` |
| weak new password | 400 `at least 8 characters` |
| missing currentPassword field | 400 |
| correct current + valid distinct new | **200** `{token}` (fresh bearer; old one revoked) |

## Forgot / reset forms

- `POST /auth/forgot-password {email:"not-an-email"}` → **400** (a malformed
  address is a client error; a *well-formed unknown* address still gets the
  uniform 204 — report 02).
- `POST /auth/reset-password` with a weak `newPassword` → **400** (the same
  policy as signup).

## "Export my data" (`GET /auth/me/data`) — paging contract

- `limit=501` → **400** "Number must be less than or equal to 500" (the
  server maximum; the app requests 500 and stops after 10,000 pages).
- `limit=500` → **200**. Full shape of the export, worth knowing:
  `{user, attempts[], practiceProgress[], practiceCycles[],
  diagnosticState{lowIndex,highIndex,questionsAsked,currentQuestionId},
  nextCursor, nextPracticeCycleCursor, attemptsDone, practiceCyclesDone}` —
  the export walks THREE collections with independent cursors.
- `cursor=not-a-uuid` → **400**; a valid cursor pages correctly (page 1 →
  page 2, no overlap observed).
- `user.password_hash` never appears.

## Verdict

**Pass, 27/27.** Every field enforces the same rules the client previews,
normalization (trim/case) is consistent between register and login, hostile
PATCH bodies are rejected, and every boundary (7/8 chars, 72/73 bytes,
100/101 name chars, 500/501 export rows) lands exactly on the documented
edge.
