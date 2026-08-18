# Adversarial Review — Assessment Idempotency & Concurrency

Date: 2026-08-14. Tester: adversarial subagent (idempotency mission).
Targets: live dev server `http://localhost:4000` (MOCK_AI=true, limits relaxed) against
throwaway DB `ai_english_adversarial`, plus self-owned probe instances on port 4177
against self-created DB `ai_english_race_probe` (created via `npm run db:setup`).

## Verdict

**No exploitable vulnerability found in the assessment idempotency/concurrency surface.**
Every attack in the mission brief was executed live (or traced to code where noted) and the
system held: exactly-once provider work per requestId, exact replay consistency, per-user
tenant isolation, exact spend-cap enforcement under 50-way concurrency, and clean
claim-abandonment semantics. Two info-level design notes are recorded at the end; both are
deliberate, documented trade-offs with bounded blast radius.

Environment notes:
- `verifyAudioDuration` is skipped under `MOCK_AI=true` (`practice.ts:312`,
  `diagnostic.ts:331`), so the 16-byte ISO-BMFF fixture (`a.m4a`, valid `ftyp` magic)
  passes ingress on the mock server. All quota/attempt accounting still runs (mock mode
  reserves quota before the mock branch — `assess.ts:130`).
- Ports 4100–4105/4110/4120 were occupied by other probe processes; my probe used 4177.
  An early misconfiguration attempt briefly registered one user (`race1@test.dev`) into the
  neighboring agent's `ai_english_rl_probe` DB via their port-4101 server; those rows
  (1 user, 3 usage rows) were deleted again immediately. No other foreign state was touched.

---

## Attack results (all resisted)

### 1. 10 parallel identical submissions, same requestId — exactly one provider call

Setup: user A (`probeA@test.dev`, level A1) practice question `fffe9678-…` ("friend").
Fired 10 concurrent `POST /practice/attempt` multipart requests, identical
`questionId` + `requestId` (`par_$i` captures in `/tmp/idem_probe`).

Observed:
- All 10 responses HTTP 200; canonical (key-sorted) JSON bodies **identical** for all 10
  (same `score:48, attemptNo:1, attemptsLeft:2`). Raw key order differs on replays because
  `response_body` is `jsonb` — cosmetic only.
- DB after: `attempts` (practice, user A) = **1 row**; `assessment_requests` for the
  requestId = **1 row, status=completed**; `assessment_usage` for user A went 3 → 4
  (**exactly one** paid reservation for 10 parallel submissions).

Mechanism (verified in code): `claimAssessmentRequest` (`idempotency.ts:50-58`) does
`INSERT … ON CONFLICT (user_id, request_id) DO NOTHING`; exactly one concurrent claimant
wins, the others block on the unique index until the winner's claim commits, then see the
row via `SELECT … FOR UPDATE` and either 409 (still processing) or replay the stored
response once completed. With MOCK_AI the whole request finishes in milliseconds, so all
nine losers observed the completed row and replayed — which is why all ten got 200 instead
of 1×200 + 9×409. Both paths are correct.

Expected: one provider call, consistent responses, no duplicate rows. **Held.**

### 2. Replay after completion returns the identical original response

`POST /practice/attempt` again with the same requestId+questionId after completion:
HTTP 200, canonical JSON **identical** to the original worker's response
(`json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)` → True).
No new `attempts` row, no new `assessment_usage` row (both counts unchanged).

Also verified on the cap-probe server after cap exhaustion: replaying a completed
requestId still returns 200 with the identical body while fresh requests get 429 —
replays do not consume quota (`usage` stayed 5, `attempts` stayed 5). **Held.**

### 3. Same requestId with a different questionId (confusion)

Same completed requestId + different A1 question `c4bfd168-…`:
HTTP **409** `{"error":"Assessment request identifier was already used"}`
(`idempotency.ts:72-77`). DB unchanged: still 1 attempt, usage 4. No second assessment.

Same requestId + a different *context* (`/diagnostic/answer` while the practice row was
processing): also 409 (context is part of the claim identity). **Held.**

### 4. Cross-tenant requestId replay (user B reuses user A's requestId)

User B (`probeB@test.dev`, taken through the full diagnostic to level C2) submitted
`POST /practice/attempt` with user A's completed requestId and B's own question:
HTTP 200 with B's **own fresh assessment** (score 52, attemptNo 1). The idempotency key is
`(user_id, request_id)` (migration `005`, PK), so cross-user reuse creates an independent
claim paid from B's own quota — no theft, no data flow from A.

Post-conditions verified in DB: two rows for the same `request_id` UUID, one per
`user_id`, each with its own `question_id`/`response_body`. **Held** (correct scoping).

### 5. IDOR on `GET /assessments/:requestId`

- Owner A: HTTP 200 `{status:'completed', context:'practice', questionId, response:{…}}`.
- User B with A's requestId (before B ever used it): HTTP **404**
  `{"error":"Assessment request not found"}` — `getAssessmentRequestStatus` filters by
  `user_id` (`idempotency.ts:141-151`), no existence leak.
- After B created his own row with the same UUID, each user's GET returns only their own
  row (A sees score 48/question fffe9678; B sees score 52/question 4a169f46). **Held.**

### 6. Non-UUID / hostile requestIds

- `POST /practice/attempt` with `requestId=not-a-uuid` → HTTP **400**
  `requestId: requestId must be a valid UUID` (zod `validate()`, before any DB work).
- `GET /assessments/not-a-uuid` → HTTP **400** (params schema, `app.ts:88`).
- `GET /assessments/1' OR '1'='1` (URL-encoded) → HTTP **400**, no 500, no SQL reach
  (all queries are parameterized anyway). **Held.**

### 7. Retry-while-in-flight semantics (seeded live `processing` row)

Inserted a live `processing` row for user A (requestId `7e62cba2-…`, claim_id random):
- Same requestId+questionId → HTTP **409**
  `{"error":"Assessment is still processing","retryAfterSeconds":2}`
  (`AssessmentRequestInFlightError`, `idempotency.ts:82`).
- `GET /assessments/7e62cba2-…` → `{status:'processing', …}` (no response body leak).
- Same requestId + different questionId → 409 `already used`; same requestId via the
  diagnostic route → 409 (context mismatch).

Stale-claim takeover: seeded a `processing` row with `started_at = now() - 6 minutes`
→ next POST with that requestId **deleted the stale row and re-claimed** (200, fresh
provider work, new attempt). This is the designed 5-minute lease (`idempotency.ts:45-48`);
a displaced stale worker cannot complete or abandon the replacement claim because
`completeAssessmentRequest`/`abandonAssessmentRequest` match on `claim_id`
(`idempotency.ts:98-106, 109-117`; regression-pinned in
`tests/idempotency.test.ts:155`). **Held.**

### 8. TOCTOU on the per-user daily spend cap — 50 parallel vs cap 5

Probe instance: PORT 4177, own DB `ai_english_race_probe`, `ASSESS_DAILY_CAP=5`,
`AI_MAX_CONCURRENCY=100`, other limits high. One user (B1), usage rows reset to 0 after
its diagnostic, then **50 parallel** `POST /practice/attempt` spread over all six B1
questions (maximizing concurrent entry into the cap check; six `practice_inflight` lanes).

Observed: **5×200, 9×429 `Daily assessment limit reached`, 36×409
`An assessment is already in progress for this question`** (the 409s are per-question
serialization, not cap failures). DB after: `assessment_usage` = **exactly 5**,
practice `attempts` = **exactly 5**, zero stuck `processing` rows, `practice_inflight`
empty. A retry of a 429'd requestId → 429 again with usage unchanged (the 429 path had
correctly abandoned the idempotency claim, so the identifier was reusable).

Mechanism: `assertDailyAssessmentCapacity` (`assess.ts:76-117`) takes
`pg_advisory_xact_lock('assessment-global-cap')` then a per-user advisory lock, then
counts and inserts the reservation in the same transaction — check-and-insert is fully
serialized per user and globally; the reservation is made **before** provider I/O and no
DB client is held during provider work. **More than 5 provider calls cannot happen. Held.**

### 9. TOCTOU on the global daily spend cap — 12 parallel across 2 users vs cap 3

Same probe, `ASSESS_DAILY_CAP=3 ASSESS_GLOBAL_DAILY_CAP=3` (config requires global ≥
per-user). Two users (C2 and B2), usage reset, then 6+6 parallel requests on all six
questions of each level (12 concurrent lanes).

Observed: **3×200, 9×429 `Service daily assessment capacity reached`** (the global-cap
message), `assessment_usage` = **exactly 3** (all three happened to go to the first user;
user 2's per-user budget was untouched yet still blocked — proof the global serializer,
not the per-user one, bound the total; per-user-only enforcement would have allowed 6).
**Held.**

### 10. Practice progression races

- Same question, two different requestIds, concurrent: **1×200 (attemptNo=2 retry) +
  1×409**; exactly one new `attempts` row (`practice_inflight` PK serializes per
  `(user_id, question_id)`, `practice.ts:90-127`).
- Two different questions, concurrent: both 200, two new attempt rows; the passing
  response's `nextQuestion` (`home`, be25becf) differed from the just-answered question.
  `storePracticeResult` inserts the attempt and selects the next question in the **same
  transaction**, explicitly excluding the answered id (`practice.ts:165-188`) — the audit's
  same-transaction claim checks out; an immediate same-question repeat is structurally
  excluded by the `q.id <> $3` clause evaluated after the attempt insert.
- Pass advancement and final-fail advancement both observed live (attemptNo reset cycle
  1→2→pass; stale-takeover attempt produced `nextQuestion` ≠ answered question).
- Five parallel `GET /diagnostic/next` for a fresh user: all five returned the **same**
  question (state row `FOR UPDATE` serialization, `diagnostic.ts:51-65`). **Held.**

### 11. Diagnostic answer race

Fresh user C, four parallel `/diagnostic/answer` for the current question with distinct
requestIds: **1×200 + 3×409 `An assessment is already in progress`**. DB after:
`attempts`=1, `assessment_usage`=1, `diagnostic_state.questions_asked`=1, next question
served, `processing_claim_id` cleared, exactly one `completed` request row (the three
losers' claims were abandoned — no residue). The binary-search state advanced exactly
once (`diagnostic_state` claim via `processing_claim_id`, `diagnostic.ts:111-143`). **Held.**

### 12. Pre-claim rejections do not burn requestIds

- Missing audio field → 400 `audio file is required`; resubmitting the **same requestId
  with audio** → 200 (claim had been abandoned: route `finally` calls
  `abandonAssessmentRequest` when `completed=false`, `practice.ts:358-361`).
- Wrong-level question (A1 user, C2 question) → 403 **before** `claimAssessmentRequest`;
  zero `assessment_requests` rows for that requestId.
- Nonexistent questionId → 404 before claim; zero rows. **Held.**

---

## Info-level design notes (deliberate, bounded — not vulnerabilities)

1. **Failed paid calls still charge the daily budget; retries are unbounded per
   requestId.** On provider failure the `assessment_usage` reservation is intentionally
   retained (comment at `assess.ts:70-75`: the call "still consumed capacity/cost") while
   the idempotency claim is abandoned, so the client may retry the same requestId any
   number of times; each retry consumes a fresh reservation and a fresh provider call.
   Bound: `ASSESS_DAILY_CAP` per user + `ASSESS_IP_DAILY_CAP` per source IP +
   `ASSESS_GLOBAL_DAILY_CAP`. A provider that fails persistently therefore burns the
   user's daily quota on retries — a documented cost-accounting choice, capped per day.
2. **5-minute stale-claim lease can double-charge one logical request in a wedge
   scenario.** If a worker stays alive but exceeds the 5-minute `processing` lease (e.g.,
   a stalled event loop — note default `OPENAI_TIMEOUT_MS=60s` and the 130s request
   timeout are far below the lease, so a *healthy* worker cannot trigger this), a retry
   takes over the requestId and performs provider work twice for one logical submission.
   Data integrity still holds: the stale worker's `completeAssessmentRequest` fails on the
   `claim_id` guard (409), so at most one `attempts` row and one completed response exist.
   Worst case is one duplicated provider charge per wedged request — negligible and
   self-limiting.

## Notable resistance summary (for the lead auditor)

No duplicates, no double-spend, no cross-tenant visibility, and exact cap enforcement were
observed under genuine concurrency at every layer: the idempotency PK +
`ON CONFLICT` + `FOR UPDATE` claim (`idempotency.ts`), the per-question `practice_inflight`
claim (`practice.ts`), the `diagnostic_state` claim id (`diagnostic.ts`), the
advisory-lock-serialized quota reservation (`assess.ts`), and the `claim_id` ownership
tokens that neutralize stale workers. The transaction helpers
(`transaction.ts`) rollback-and-poison-on-failure semantics held under every induced error
path exercised (400/403/404/409/429) — the pool never wedged and no connection leaks were
observed across ~150 concurrent requests.
