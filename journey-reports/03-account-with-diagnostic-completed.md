# Scenario 3 — Account WITH a completed diagnostic (the full learner loop)

**Persona:** the scenario-1 learner, placed at **C1**, returning for their
first real practice sessions. Evidence:
[`evidence/scenario3.log`](evidence/scenario3.log) (69 steps, 41 checks
passed). UI narrative from the app's Home/Practice/History/Recordings/
Settings screens.

## Home (§1–3)

Signing in shows the Home dashboard: CEFR level + description, mastery
progress bar, 🔥 streak, "practiced today", due-for-review chip.
`GET /practice/stats?timeZone=Asia/Kolkata` → **200**
`{level:"C1", progress:{masteredCount:0, learningCount:0, totalAtLevel:100,
dueCount:0}, streakDays:0, practicedToday:0, totalAttempts:0}` — 100 words
at the placed level, timezone-aware day bucketing (the app passes the
device timezone).

## The diagnostic is definitively closed (§4–5)

`GET /practice/question` now works and hands me my first assignment.
Submitting a **diagnostic** answer carrying a real catalog question id →
**400 `{"error":"Diagnostic already completed","code":"DIAGNOSTIC_DONE"}`**.
No route back into placement except an explicit retake (§48).

## Durable practice cycles (§4, §6)

One assigned question per "cycle": the response carries `{question, cycleId,
kind:"new", progress}`. Re-opening the app (§6) returns the **same question
and the same `cycleId`** — assignments are durable rows (`practice_cycles`),
not client state. The UI shows a first-visit intro card ("master at 75, three
tries per word, silence is free, native-language mode"), the word card with a
"Try N of 3" chip, and a help button.

## Bilingual help (§7–10)

`GET /practice/question/{id}/help` → **200** with the English wording, native
(Telugu) `promptWordNative`/`questionTextNative`, and exactly **3 example
pairs** `{en, native}`. Headers: `private, no-cache` + `Vary: Authorization`
+ ETag — sending `If-None-Match` back yields **304** (fresh check, no
re-download). Unknown question id → **404**; malformed UUID → **400**.

## Cycle guards (§11–12)

- Attempt with an arbitrary `cycleId` → **409
  `{"error":"This practice question is no longer active","code":"PRACTICE_CYCLE_CLOSED"}`**.
- Attempt with a question that exists in the catalog but is not my
  assignment → **404 `Question not found`**.

Both are the app's cue to revalidate its assignment.

## English attempts: the 3-try budget and mastery (§13–15)

Question "well-being", three recorded tries:

| Try | Score | Outcome |
| --- | --- | --- |
| 1 | 40 | fail (`attemptsLeft:2`, no `next`) |
| 2 | 48 | fail (`attemptsLeft:1`) |
| 3 | **89** | **pass + `mastered:true`** → `next{question, cycleId}` |

Exactly per spec: pass ≥ 60 ends the cycle; **mastery needs ≥ 75** (a 60–74
pass returns `mastered:false` and moves on without mastering); a third failed
try returns `attemptsLeft:0` plus `finalFeedback` — the authored
encouragement with a model answer ("Don't worry — … A good answer could be:
…") — and the next assignment. The app's feedback screen has distinct
variants for retry / passed / mastered / final, and mastery fires a success
haptic and invalidates the stats/history queries.

**Duplicate-submission replay (§16–17):** a retransmit of the identical
submission (same `requestId`, `questionId`, `cycleId`) → **200 identical
stored response**, no second assessment, no budget double-charge.

## Mother-tongue mode shares the same budget (§18–21)

The UI toggle "Answer in my language" swaps the upload endpoint to
`/practice/attempt/native`. On "motivation":

- Native try 1 → **200** `{mode:"native", nativeLanguage:"te",
  understood:true, transcript, translatedTranscript, modelAnswer, feedback,
  attemptNo:1, attemptsLeft:2}` — comprehension check, not an English score.
- Native try 2 → `attemptNo:2`.
- English try 3 → `attemptNo:3` — **the three tries are one shared budget**;
  native tries consume but never master/demote/SRS.
- A fourth submission on the now-closed cycle → **409
  `PRACTICE_CYCLE_CLOSED`**.

The app's feedback screen for native mode shows the native transcript, its
English translation, and the model English answer.

## Skip (§22–25)

`POST /practice/skip {questionId, cycleId}` → **204**; the next fetch hands a
**new `cycleId` and a new question**. Skipping a question that isn't my
current assignment is rejected. (Skipped words are parked ~a week and return
as revision — exercised here as "skip moves on"; the scheduling internals are
pinned by the server suite.)

## Mastery / SRS bookkeeping in stats (§26–34)

Six more scored cycles (words like transparency, accountability, circular
economy), 3 additional mastery events observed. Stats before → after:

```
masteredCount 0 → 5, learningCount 0 → 2, totalAtLevel 100, dueCount 0
streakDays 0 → 1, practicedToday 0 → 15, totalAttempts 0 → 15
```

Mastery is one pass ≥ 75; a 60–74 pass leaves the word "learning" with SRS
review scheduling; failed words come back due-first. Promotion (level-up at
⌈0.85 × 100⌉ = 85 mastered words) is by design out of reach of a single
session and was not reached here.

## History paging (§35–38)

- `GET /practice/history?limit=5` → newest-first rows carrying
  `promptWord, questionText, cefrLevel, context ("practice" /
  "practice-native"), attemptNo, score, passed, transcript, feedback,
  createdAt` + `nextCursor`.
- Following the cursor → the next page, no overlap.
- Garbage cursor `not-a-uuid` → **400** (`cursor must be a valid UUID`) — a
  corrupted cursor is a clean error, never a silently truncated page.
- `limit=5000` → **400** ("Number must be less than or equal to 50") — the
  server caps page size; the app never asks for more.

## Language settings (§39–43)

- `PATCH /auth/me {uiLanguage:"te"}` → **200** — interface language switches
  instantly app-wide (learning content is not invalidated by design).
- `PATCH /auth/me {nativeLanguage:"es"}` → **200**, and help for my current
  word immediately rendered its native column in **Spanish** (§41) — native
  help follows the mother-tongue preference.
- Unsupported `uiLanguage:"xx"` → **400**; a 101-character name → **400**.

## Recordings (dev direct mode) (§44–47)

With local direct uploads nothing is retained, by design: the list is a
well-formed **200** empty page; a playback-url grant for an id I don't have →
**404**; single delete of a nonexistent id → **204** (deletion is deliberately
idempotent — owner-scoped, silent when there is nothing to delete);
**`DELETE /recordings` (delete all — the privacy exit) → 204** even when
empty. (In production S3 mode this same endpoint atomically advances the
retention epoch and queues durable cleanup — covered by the S3-gated
acceptance tooling, not runnable here.)

## Retake the placement test (§48–57)

- `POST /diagnostic/restart {confirm:true}` → **204**; profile is unplaced
  again (`cefrLevel:null, diagnosticCompleted:false`), and
  `GET /practice/question` is back to **403 `Diagnostic not completed`**.
- **Progress survives:** stats still reported `streakDays:1,
  practicedToday:15, totalAttempts:15` (§51 vs §34 — identical totals).
- Second placement ran the binary search downward this time: **B1 "gift"
  fail → A1 "ticket" pass → A2 "aunt" pass → placed A2** (§52–55), then
  `POST /diagnostic/acknowledge` → **204** (§56).
- Mastery is **per level**: stats at A2 show `0/100` while the 5 mastered
  words belong to C1 (§57). That matches the documented rule — re-placement
  *resumes* mastery already earned **at the newly assigned level**; had the
  learner been re-placed at C1, the 5 mastered words would count. (My driver
  initially flagged this as a failure; it was comparing across levels — the
  product is correct.)

## Account lifecycle (§58–69)

| Action | Result |
| --- | --- |
| Change password, wrong current | **401** |
| Change password, correct | **200** `{token}` — old bearer → **401 `TOKEN_REVOKED`**, new token works, old password can no longer log in |
| `GET /auth/me/data` export | **200** full user + every attempt (incl. `practice-native` rows), **no `password_hash`** |
| `POST /auth/logout` | **204**; the bearer is dead afterward (server-side revocation) |
| Log back in | **200** with the changed password |
| `DELETE /auth/account`, wrong password | **401** |
| `DELETE /auth/account`, correct | **204** — token → **401**, and login for the deleted address → **401** |

Deletion is password-confirmed, immediate, and cascades (history, cycles,
assessment requests — the load-test reconciliation tooling independently
verifies the cascade).

## Scenario-3 verdict

**Pass.** The placed-learner loop — durable assignment, shared 3-try budget
across English and mother-tongue modes, mastery/SRS bookkeeping, honest
paging, live language switching, privacy exits, retake-without-data-loss,
and the full account lifecycle — behaves per contract at every step. The only
"failure" was my own cross-level mastery comparison; the product's per-level
mastery is the documented, correct behavior.
