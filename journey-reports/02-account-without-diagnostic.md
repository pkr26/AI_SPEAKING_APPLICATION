# Scenario 2 — Existing account, diagnostic NOT completed

**Persona:** registered yesterday (mother tongue Hindi), answered ONE
placement question, then force-closed the app. Today they return. Evidence:
[`evidence/scenario2.log`](evidence/scenario2.log) (20 steps, 12 checks
passed) and [`evidence/scenario2-reset.log`](evidence/scenario2-reset.log)
(password-reset addendum).

## What the user sees on return

Signing in lands on the entry gate, which reconstructs state from
`GET /auth/me` + `GET /diagnostic/next`: profile still shows
`diagnosticCompleted:false, cefrLevel:null`, so the app routes to the
diagnostic screen — with the intro card *skipped* (a resumed run shows
"Question 2 of 3" directly) and yesterday's first answer visible in the
per-answer history.

## Step-by-step

### Day 1 — answer one question, abandon (§1–4)
- Register → **201**; `GET /diagnostic/next` → question 1 at **B1**
  (midpoint, `asked:0`).
- Answer 1 scored (72, pass) → `done:false`, next question at **C1**
  ("resilience").
- **True duplicate-submission replay (§4):** re-posting the *identical*
  logical submission — same `requestId` **and** same `questionId` — returned
  **200 with the byte-equal stored response** (score 72, same next question).
  No second assessment ran and the placement did not advance twice. This is
  the contract the app relies on when the OS kills an upload midway and the
  recovery POST retransmits: one logical submission can never be charged
  twice. (Contrast: report 01 §31 — a replay with a *different* question id
  fails closed with 409.)

### Day 2 — fresh install, sign in, resume (§5–8)
- `POST /auth/login` → **200** new token.
- `GET /auth/me` → still `diagnosticCompleted:false`, `cefrLevel:null`.
- `GET /diagnostic/next` → **resumed exactly where day 1 ended**:
  - the **same second question id** is served (durable `current_question_id`),
  - `progress.asked = 1` of 3,
  - `answers[]` replays yesterday's scored answer summary (word, question,
    transcript, score 72, pass, feedback) oldest-first.
- Answering the **stale** day-1 question again → **409 `QUESTION_MISMATCH`**
  (§8): you cannot re-answer a question the run has moved past.

### What remains gated mid-run (§9–11)
- `GET /practice/question` → still **403 `Diagnostic not completed`** —
  finishing the placement is the only key to practice.
- `GET /practice/history` → **200** with the diagnostic answer visible as a
  history row (history is a read-only record, not gated).
- `GET /recordings` → **200** well-formed empty list.

### Restarting the placement (§12–15)
- `POST /diagnostic/restart {confirm:false}` → **400** ("must be true to
  restart the diagnostic") — the client must show an explicit confirmation.
- `{confirm:true}` → **204**. The server then:
  - resets the run (`asked:0`, `answers:[]`, re-anchored at the **B1**
    midpoint, fresh run id),
  - closes any dangling practice cycle,
  - clears `cefrLevel`/`diagnosticCompleted` on the profile (verified via
    `GET /auth/me`),
  - **keeps all attempt history** — nothing learned is deleted by a restart.

### Forgot / reset password while unplaced (§16–18 + addendum log)
- `POST /auth/forgot-password` for the real address and for
  `nobody@example.com` → both **204 empty**: identical responses, no oracle
  for which emails exist. The dev mailer logs the mail
  (`MAIL_MODE=log`): "Your AI English Coach reset code is … expires in 30
  minutes."
- `POST /auth/reset-password` with a wrong code → **400 `RESET_INVALID`**.
- With the real 32-hex code from the mail → **204**. Immediately:
  - the pre-reset bearer token → **401 `TOKEN_REVOKED`** ("Token no longer
    valid — please log in again") — reset signs out every device,
  - login with the new password → **200**, and the response shows the
    placement still pending (`diagnosticCompleted:false`) — a password reset
    never loses learning state.

### Behaviors verified by the pinned suites (mock mode can't produce them over HTTP)
- **Silence is a free retry** (`tests/diagnostic-silence-and-resume.test.ts`,
  15/15 passing): an inaudible take returns `noSpeech:true` with the *same*
  question, writes **no attempt**, and does not consume one of the 3
  questions — the app shows a "record again" card instead of a score. The
  suite also pins: resume summaries across questions, the exact
  three-question completion bound (window still open), window-collapse
  completion before question 3, and the automatic repair/restart of legacy
  counted-silence runs.

## Scenario-2 verdict

**Pass.** A half-finished placement is a first-class durable state: the exact
in-flight question survives an app kill and a fresh install, duplicates
replay for free, restart is explicit and non-destructive, practice stays
locked, and the forgot-password loop works end-to-end without losing
placement state. No defects.
