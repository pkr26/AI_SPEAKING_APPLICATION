# Scenario 1 — First-time user (fresh install → placed at a CEFR level)

**Persona:** new learner, no account. Journey covers first launch, sign-up,
sign-in, the locked pre-test state, the spoken placement test, and the level
reveal. Evidence: [`evidence/scenario1.log`](evidence/scenario1.log) (39
steps); UI narrative from the app's actual screens.

## What the user sees first

There is no onboarding carousel. The app restores a device-level interface
language behind the splash (English by default), then lands on **Login**. The
login screen has an interface-language picker (English, తెలుగు, हिन्दी,
Español, 中文 — persisted per device), a "create account" path, and
forgot-password. Sign-up asks for name, email, password + confirmation, and a
mandatory mother-tongue choice (Telugu / Hindi / Spanish / Chinese).

## Step-by-step

### Discovery (§1–3)
- `GET /client-config` → **200**: ads fully disabled
  (`{"ads":{"enabled":false,...,"placements":{"homeBanner":false,"historyNative":false}}}`),
  `no-store`. The app cannot show ads today by design.
- `GET /health` → **200 `{"ok":true}`** — the app's connectivity probe.
- `GET /nope` → **404 `{"error":"Not found","code":"NOT_FOUND"}`** — clean
  JSON 404, no stack traces.

### Registration validation (§4–7) — the form blocks bad input server-side too
| Attempt | Server answer |
| --- | --- |
| Missing password | **400** `password: Required` (`VALIDATION_FAILED`) |
| Malformed email | **400** `email: a valid email is required` |
| Password with no number | **400** `password must contain at least one number` |
| Mother tongue `xx` | **400** `nativeLanguage must be one of 'te','hi','es','zh'` |

These mirror the client's own `passwordPolicyError` (min 8, a letter, a
number) — the client disables Submit until valid, and the server enforces the
same rules as the authority.

### Account creation and first login (§8–12)
- Valid registration → **201** with `{ token, user }`. The user contract:
  `id, name, email, nativeLanguage:"te", uiLanguage:"en", cefrLevel:null,
  diagnosticCompleted:false, diagnosticAcknowledged:false`. You are signed in
  immediately (JWT returned).
- Duplicate email → **409 `EMAIL_TAKEN`** (the app shows "email already
  taken").
- Wrong password and unknown account both → **401** `Invalid email or
  password` (`INVALID_CREDENTIALS`) — identical bodies, so login cannot be
  used to enumerate accounts.
- Correct login → **200** `{ token, user }`.

### Session handling (§13–15)
- `GET /auth/me` → **200** full profile; without a token → **401
  `UNAUTHENTICATED`** ("Missing or invalid Authorization header"); with a
  garbage token → **401** ("Invalid or expired token"). The app reacts to 401
  centrally by clearing the session and showing the "session expired" notice.

### The world before the placement test (§16–19)
- `GET /practice/question` → **403 `Diagnostic not completed`** and
  `POST /practice/skip` likewise **403** — practice is hard-gated; the router
  keeps the user on the diagnostic screen, so these calls only occur if
  someone tries to jump ahead.
- `GET /practice/stats` → **200** with `level:null, totalAtLevel:0,
  streakDays:0` and `GET /practice/history` → **200 `{items:[],nextCursor:null}`**.
  Read-only surfaces degrade gracefully instead of erroring.

### Audio upload grant — step 1 of the two-step upload (§20–23)
- `POST /uploads/audio-url {contentType:"audio/mp4",
  assessmentEndpoint:"/diagnostic/answer"}` → **200
  `{"mode":"direct","assessmentEndpoint":"/diagnostic/answer"}`**: in dev
  (no split S3 buckets) the server answers "direct" and the app posts one
  multipart form to the assessment route. The endpoint is echoed back so the
  client can validate the grant as hostile input.
- `text/plain` content type → **415 `Unsupported audio media type`**.
- Unknown endpoint `/diagnostic/wrong` → **400** with an explicit enum
  message (only `/diagnostic/answer`, `/practice/attempt`,
  `/practice/attempt/native` exist).
- No bearer → **401**.

### The placement test (§24–30) — adaptive, spoken, exactly 3 questions max
UI: an intro card ("what it is, 2–3 recorded questions, speak English"),
then per question a card with the **Word** (e.g. `SPORT`) and **Question**
("What is your favourite sport, and why do you like it?"), a big record
button with live level meter and 2-minute auto-stop, and — only in the
post-take review — a **Save this recording** switch that defaults **off**
(the journey always sent `retainRecording=false`, matching the app's
default-off privacy choice).

- `GET /diagnostic/next` → **200** `{done:false, question, progress:{asked:0,
  maxQuestions:3}, answers:[]}`. The first question is served at **B1** — the
  binary-search midpoint of A1..C2. Fetching again (§25) returns the *same*
  question: the served question is stored server-side, so re-opening the app
  cannot reshuffle the test.
- **Anti-cheat:** answering a question I was never served → **409
  `QUESTION_MISMATCH`** (§26).
- **Fake audio:** a text file renamed `.m4a` → **415 `Invalid audio file`**
  (magic-byte gate, §27).
- The three scored answers (mock scores are random 40–95; pass ≥ 60):

| # | Level served | Word | Score | Result | Next |
| --- | --- | --- | --- | --- | --- |
| 1 | B1 | sport | 94 | pass | C1 "globalization" |
| 2 | C1 | globalization | 78 | pass | C2 "conformity" |
| 3 | C2 | conformity | 50 | fail | — **done, level C1** |

This is the binary search working as designed: pass raises the floor, fail
lowers the ceiling; a 6-level range always converges within 3 questions. Each
answer response carries `{passed, score, transcript, feedback}` and either
`nextQuestion` or `done:true, level`. After each answer the app shows a
result card ("Answer checked", score, transcript, feedback).

### Crash/retry safety around a submission (§31–34)
- Re-posting a completed request's `requestId` with a **different**
  questionId → **409 `QUESTION_MISMATCH`**: a replay is only honored for the
  exact same logical submission (see report 02 §4 for the true replay).
- `GET /assessments/{requestId}` (the app's interrupted-handoff recovery
  poll) → **200** with `status:"completed"`, the original question, and the
  entire response body stored at completion — a killed app can reconcile the
  already-paid result. Unknown id → **404**; malformed UUID → **400**.

### Completion and the level reveal (§35–39)
- `GET /diagnostic/next` after completion → **200 `{done:true, level:"C1",
  answers:[ …3 summaries with word/question/transcript/score/pass/feedback ]}`**
  — the completion screen can rebuild the per-answer reveal even after a
  relaunch.
- Submitting more diagnostic answers is closed: an unknown question id gets
  **409 QUESTION_MISMATCH** (§36), and a *real* catalog question id gets
  **400 `DIAGNOSTIC_DONE`** (verified in report 03 §5).
- `GET /auth/me` now shows `cefrLevel:"C1", diagnosticCompleted:true,
  diagnosticAcknowledged:false`.
- `POST /diagnostic/acknowledge` → **204**, and a second call is also **204**
  (idempotent — the app retries safely). Acknowledgement is what the app
  requires before unlocking Home: a user who kills the app between the final
  answer and tapping "Start Practicing" resumes on the reveal screen, never
  skipping it silently.

## Also observed (default-limits side quest)

During setup, before assessment/register budgets were relaxed, the very act
of running registration *validation probes* exhausted the default per-network
register budget and the 11th `POST /auth/register` was shed with **429 +
`Retry-After: 3590`** — see
[`evidence/rate-limit-observation.md`](evidence/rate-limit-observation.md).
Intended anti-abuse behavior, and the app has a matching inline UI ("when you
can try again").

## Scenario-1 verdict

**Pass.** Signup/login validation, gating, grants, the adaptive placement
(3 questions → C1), submission replay/reconciliation, and the durable level
reveal all behaved exactly per contract. No defects.
