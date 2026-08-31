# Scenario 8 — Every frontend control, field, and button: the verification matrix

The complete interactive surface of the app, screen by screen, with what
each control does and how it was verified. Evidence tags:

- **[L §n]** — verified live over HTTP in this journey
  ([`evidence/scenario1-7.log`](evidence/), step numbers)
- **[App]** — behavior implemented in the client and pinned by the app's own
  suite: **3,875/3,875 tests passed** with enforced coverage floors
  (`cd app && npm test`)
- **[Code `file:line`]** — code-verified behavior (stable contract)
- **[Pinned]** — pinned by server suites that passed (69/69 targeted +
  recordings/S3 suites listed in report 06)

Shared `Button` blocks presses while `disabled || loading` with a busy
accessibility state (`app/src/components/Button.tsx`), so every row below
inherits "no double-tap" semantics.

---

## Login (`app/src/app/(auth)/login.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| App-language radio chips | Local SecureStore guest-language write; instant UI switch | [App] |
| Email field | maxLength 254; live regex error (pinned to server Zod email) | [L §5 invalid → 400], [Code `lib/identity-validation.ts`] |
| Password field + Show/Hide | maxLength 72 (bcrypt ceiling); show/hide toggle | [L §6-7 policy], [Code `lib/password-policy.ts`] |
| **Log in** | `POST /auth/login`; success → token saved → `/`; 401 → "wrong credentials"; busy locks back/links | [L §10-12], [App] |
| Forgot password link | → `/forgot-password` | [App] |
| Create account link | → `/signup` | [App] |
| Session-expired / reset-done / registered banners | Display-only | [App] |

## Signup (`(auth)/signup.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Name field | 1..100 trimmed; Telugu/emoji names accepted; controls rejected | [L §4-9 name matrix], [App] |
| Email field | Same validator as login; duplicate → `EMAIL_TAKEN` "email already taken" | [L §9], [App] |
| Password + confirm | Full policy (≥8, letter, number, ≤72 bytes) + match check; all mirrored server-side | [L §6 password matrix], [App] |
| Mother-tongue radio grid (te/hi/es/zh) | Mandatory; invalid → 400 | [L §7], [S5 all four languages] |
| **Create account** | `POST /auth/register` incl. the guest `uiLanguage`; token-save failure after creation → login with "registered" banner (never a dead account) | [L §8 uiLanguage persisted], [App] |
| Privacy/Terms links | Public legal screens | [App] |

## Forgot / Reset password (`(auth)/forgot-password.tsx`, `reset-password.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Email field + **Send code** | `POST /auth/forgot-password` → uniform **204** (real, unknown, and malformed-mail paths each pinned); dev mailer logs the 32-hex code (30-min expiry) | [L §16-17 + reset addendum], [App] |
| Send code again | Re-posts with the pinned address | [App] |
| Code field | 1..128 chars, `one-time-code` autocomplete | [App] |
| New/confirm password fields | Full policy; wrong code → `RESET_INVALID` 400; right code → 204, every old bearer revoked (`TOKEN_REVOKED`), placement state survives | [L reset addendum §1-4] |

## Entry gate (`app/src/app/index.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Try Again (session-restore error) | Re-reads the stored token | [App] |
| Delete saved login (danger) | Wipes token, pending assessment, private artifacts, reminder — the unreadable-store escape hatch | [App] |

## Diagnostic (`app/src/app/diagnostic.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Intro card **Start Test** | Local; shown only on a fresh run (`asked===0`) | [App] |
| Mic button (record/stop) | Permission flow + banner + **Open Settings**; ≥500 ms takes only; 120 s auto-stop; live meter/timer | [App], gates [Pinned audio-inspection] |
| **Save this recording** switch | Defaults OFF per take; immutable for that request; sent as `retainRecording` | [L every submission `false`], [Pinned retention] |
| Play/Pause preview, **Record Again**, **Discard** (confirm) | Local review actions; discard clears the durable handoff too | [App] |
| **Send Answer** | Two-step upload: grant → (S3 form \| direct multipart) → assessment POST; 503 `CAPACITY_BUSY` retried with Retry-After; cancel marks intent before abort | [L §20-30], [App] |
| Cancel Sending / Stop Waiting | Pre-POST abort returns the take; post-POST cancel parks into recovery instead of double-submitting | [App] |
| Try Again / **Check Later** (recovery) | Bounded recovery poll vs parked handoff; reconciliation via `GET /assessments/{requestId}` | [L §32-34], [App] |
| Result card: **Record Again** (noSpeech) / **Next Question** / **See My Level** | Acknowledges the durable feedback pointer (SecureStore) then advances; silence retries the same question free | [L §28-30], silence [Pinned diagnostic-silence] |
| **Start Practicing** | `POST /diagnostic/acknowledge` → unlocks Home; idempotent | [L §38-39] |
| Settings / Log out footer | Locked while the recorder is active | [App] |
| Android hardware back | Blocked mid-test (would 409 on re-entry) | [App] |

## Home (`app/src/app/home.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Pull-to-refresh / DataRefreshNotice retry | Refetch stats (`cancelRefetch:false` — joins the in-flight request) | [App] |
| Session summary **Got it** | Local tally reset | [App] |
| **Start Practice** / History / My recordings / Settings | One-shot navigation (`navigateOnce`) | [L the whole journey], [App] |
| Stats card data | `GET /practice/stats?timeZone=…` — level, mastery bar, streak, practiced today, due count | [L §3 S1, §34 S3] |

## Practice (`app/src/app/practice/index.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| First-visit intro **Got it** | Per-account local flag | [App] |
| **?** help button | → `/practice/help` with validated params | [L §7-10 S3] |
| **Answer in my language** toggle | Swaps recorder endpoint `/practice/attempt` ↔ `/practice/attempt/native`; one shared 3-try budget | [L §18-21 S3], [S5 all languages] |
| Recorder (same component) | Identical contract to diagnostic + 429 inline rate-limit card | [L §13-15 S3], [App] |
| **Skip this word** | `POST /practice/skip {questionId, cycleId}` → 204 + new cycle; wrong ids rejected; 409 → revalidate | [L §22-25 S3] |
| Footer Settings / Log out | Locked while recording/uploading/recovering | [App] |

## Practice feedback (`practice/feedback.tsx`) — 9 variants

| Variant → button | Behavior | Verified |
| --- | --- | --- |
| retry → **Try Again** | Acknowledge pointer → back to the same question | [L §13-15 S3] |
| nospeech → **Try Again** / **See translation and examples** | Free retry / opens help | silence [Pinned] |
| native → **Try in English** / **Try Again in My Language** | Mode switch, shared budget | [L §18-20 S3], [S5] |
| native-nospeech / native-final | Retry natively / next question | [Pinned stuck-cases] |
| passed / mastered / levelup / final → **Next Question** | Writes the next question into cache; level-change path updates user level; success haptic on mastered/levelup | [L §13-15, §26-34 S3] |

## Practice help (`practice/help.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Pull-to-refresh / Try Again | Refetch `GET /practice/question/{id}/help` | [L §7-8 S3] |
| **Start Practice** | Return to practice | [App] |
| (data) | EN wording + native word/question + exactly 3 bilingual examples; ETag/304; `Vary: Authorization` | [L §7-8 S3], [S5 script check] |

## History (`app/src/app/history.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Row header (expand/collapse) | Shows question, transcript/translation, feedback, model answer | [App] + [L §35 S3 row shape] |
| In-row audio playback | Rendered **only when `recordingId` is set**; Play disabled when status `unavailable` | [L S6: recordingId null → no audio in direct mode], design [Code `history.tsx:227`] |
| **Show older answers** (+ auto-load) | Cursor paging, page bound 500, cycle protection, terminal copy on safety stop | [L §35-38 S3: limit cap 50, cursor 400, identical repeat page], [App] |
| Empty state **Start Practice** / Try Again / pull-to-refresh | As labeled | [App] |

## Recordings (`app/src/app/recordings.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Per-card Play/Share/Delete | Grant (`POST /recordings/{id}/playback-url`) → private cache file → local player; 409 in-flight waits + bounded retries; share passes only a local URI | grant path [Pinned recordings/S3], empty topology [L S6] |
| **Check pending recordings** | One fresh `GET /recordings` — server re-evaluates `retention_pending` rows | [L S6 list], [Pinned retention window] |
| Show older recordings / Try Again | Cursor paging like History | [L S6 limit cap 50] |

## Settings (`app/src/app/settings/index.tsx`)

| Control | Behavior | Verified |
| --- | --- | --- |
| Name editor + **Save** | `PATCH /auth/me {name}`; 1..100; boundaries live-tested | [L §4-11 S4] |
| App-language radios | `PATCH {uiLanguage}` + device mirror + reminder re-schedule in the new language; 5 values; case-sensitive | [L §30-31 S4], [S5 round-trip] |
| Learning-language radios | `PATCH {nativeLanguage}`; invalidates native help caches | [L §19-28 S4], [L §40-41 S3] |
| Daily-reminder toggle + hour −/+ | **Purely local** (expo-notifications + SecureStore); no API exists; revocation fails closed to OFF | [Code `lib/daily-reminder.ts`] |
| Ad privacy choices | Google UMP form; only when UMP requires it | [App], ads hard-off [L §1 S1] |
| My recordings row | → `/recordings` | [L S6] |
| **Delete all recordings** | Confirm alert → `DELETE /recordings` → 204; epoch instantly hides every old recording everywhere | [L §47 S3, S6], epoch fence [Code `practice.ts` JOIN] |
| **Change Password** row | → dedicated screen | [L §58-61 S3], [L §31-35 S4] |
| **Export my data** | Streams `/auth/me/data` + `/recordings/export` pages (≤500 rows/page, 10,000-page bound) into a shared JSON file; always released | [L §62 S3], [L §37-39 S4] |
| **Restart Level Test** | Confirm alert → `POST /diagnostic/restart {confirm:true}`; keeps history/progress; app resets its caches | [L §48-57 S3], [L §12-15 S2] |
| Privacy / Terms | Static legal screens | [App] |
| **Log out on all devices** | `POST /auth/logout`; transport failure offers fail-closed local sign-out | [L §63-64 S3] |
| **Delete Account** row | → dedicated screen | [L §66-69 S3] |

## Change password / Delete account screens

| Control | Behavior | Verified |
| --- | --- | --- |
| Current/new/confirm fields | Policy + same-as-current + match checks; server: same-password 400, wrong-current 401, success rotates token | [L §31-35 S4], [L §58-61 S3] |
| **Delete My Account** | Alert confirm → `DELETE /auth/account {password}`; wrong password 401; success 204 + cascade; unconfirmed transport keeps the session | [L §66-69 S3] |

## Global surfaces

| Control | Behavior | Verified |
| --- | --- | --- |
| ClientUpgradeModal: **Update App** / **Sign Out on This Device** | Non-dismissable; validated store URLs; local sign-out fails closed | [L S7 — 426 matrix] |
| NetworkStatusBanner / OfflineState | Informational only | [App] |
| `+not-found` **Go Home** | → `/` | [App], server 404 shape [L §3 S1] |
| Root ErrorBoundary **Try Again** | React remount | [App] |

---

## Cross-cutting guarantees every control relies on

1. **Errors are uniform** `{error, code}` + `Retry-After` when retryable
   [L throughout]; **401 centrally expires the session** [Code `api.ts`].
2. **No double submits:** one-way operation tokens + durable
   `requestId` replay — identical retransmit returns the stored response
   [L §4 S2, §16-17 S3]; different-question replay fails closed 409
   [L §31 S1].
3. **Every list is bounded:** page-size caps (50/500) [L §37-38 S3, S6],
   cursor validation [L §34 S1, §37 S3], foreign cursors rejected [L §17 S6].
4. **Privacy exits never require the upgrade** [L S7] and never require a
   password except account deletion itself (recordings deletes are
   deliberately bearer-only).

## Verdict

**Every control in the app is accounted for**: each maps to a live-verified
API behavior in these reports, a client behavior pinned by the 3,875-test
app suite, or an explicitly documented code contract — and no control
produced an unexpected result anywhere in the sweep.
