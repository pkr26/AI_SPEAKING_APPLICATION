# Adversarial Review — S3 Grant Contract & Assess Pipeline

Date: 2026-08-14. Scope: `server/src/audio-upload.ts`, `assess.ts`, `app.ts`, `practice.ts`, `diagnostic.ts`, `idempotency.ts`, `config.ts`, `rate-limit.ts`, `audio-inspection.ts`, `app/src/lib/api.ts`, `app/src/lib/types.ts`, `app/src/components/Recorder.tsx`.

Method: full code trace plus live confirmation against (a) the running direct-mode dev server on :4000 and (b) a probe instance on :4102 booted with `S3_BUCKET=probe-bucket-does-not-exist-a1b2c3d4` + fake static credentials + `MOCK_AI=true` + `LOG_LEVEL=warn` (S3 mode active; every S3 call fails fast with NoSuchBucket, which makes every `DeleteObject` attempt observable as the warn line `failed to delete S3 audio object`). Boot-refusal probes used `env -i` with explicit production-ish env. No real AWS/OpenAI credentials were used; no real paid calls were made.

Evidence trick used throughout: in S3 mode the deletion hook's `discardPresignedAudio` is the only code path that issues `DeleteObject`, and each attempt logs exactly one warn line against the nonexistent bucket. Counting that line before/after each request proves delete vs preserve per response path.

## Live evidence base

- User `53395d28-d648-466c-b0ab-4d8ee15aa0d6` (B1, diagnostic force-completed via SQL) on probe :4102.
- Grant response (decoded `uploadFields.Policy`, base64):

```json
{
  "expiration": "2026-08-14T17:35:57Z",          // issued 17:30:57Z => 300s TTL
  "conditions": [
    ["eq", "$Content-Type", "audio/mp4"],
    ["content-length-range", 1, 26214400],
    {"Content-Type": "audio/mp4"},
    {"bucket": "probe-bucket-does-not-exist-a1b2c3d4"},
    {"X-Amz-Algorithm": "AWS4-HMAC-SHA256"},
    {"X-Amz-Credential": "..."},
    {"X-Amz-Date": "20260814T173057Z"},
    {"key": "audio-uploads/53395d28-d648-466c-b0ab-4d8ee15aa0d6/efc228f2-...m4a"}
  ]
}
```

Exact key (not `starts-with`), content-type equality, S3-side size range [1, 26214400], pinned bucket. Any extra form field (e.g. injected `acl=public-read`) is rejected by S3 policy semantics, which fail closed on fields not present in the policy.

- Ownership gate fuzz against `POST /practice/attempt` (each with fresh valid requestId, valid B1 questionId): other-user prefix, `..` segment, `//`, `../../admin/` escape, missing prefix, `.exe`, `.m4a.exe`, v7-format UUID, over-long UUID segment → all `400 audioKey is missing or invalid` (rejected *before* any S3 I/O). Only the owned, correctly-shaped key (and an uppercase-extension variant) reached S3 I/O → `502 Audio storage unavailable` against the nonexistent bucket.
- Deletion matrix, live (warn-count delta in parentheses = deletion attempts):
  - 404 `Question not found` (pre-claim) → delete (+1). Correct.
  - 502 S3-fetch failure (post-claim, post-`own`) → delete (+1 per request, 7 observed). Correct.
  - Pre-claim 409 duplicate of an in-flight requestId (row inserted manually: `assessment_requests`, status `processing`) → `409 Assessment is still processing` → preserve (+0). Correct.
  - Schema-400 (`questionId:"not-a-uuid"`) **with** in-flight requestId → preserve (+0); schema-400 with fresh requestId → delete (+1). The `isAssessmentRequestProcessing` consult works exactly as designed.
  - Pre-route 429 from `limiters.assess` (observed after exhausting the default 20/h) → preserve (+0 over 3 requests). Correct.
  - **`GET /practice/question` 200 with body `{"audioKey": owned}` → delete (+1).** Same for `GET /diagnostic/next` (+1). See Finding 1.
- `createAudioSizeCap` executed standalone (26 MiB stream): aborts mid-stream with `HttpError 413` after exactly 26214400 bytes forwarded; exact 25 MiB passes clean. So even a hypothetical >cap object (e.g. via grant reuse/overwrite within the 300s TTL — each POST is still individually policy-capped at 25 MiB, so this is defense-in-depth) is cut off mid-download, and `ContentLength` lying is irrelevant.
- Boot-refusal probes (each exits 1 before listening):
  - `NODE_ENV=production MOCK_AI=true` (and `MOCK_AI=1`) → `MOCK_AI: must be false in production; simulated scoring must never reach learners`.
  - `NODE_ENV=production MOCK_AI=false` without `OPENAI_API_KEY` → `OPENAI_API_KEY: is required when MOCK_AI=false` (refused in *all* envs).
  - `NODE_ENV=production` without `S3_BUCKET` → `S3_BUCKET: is required in production…`.
  - `NODE_ENV=production` with `DATABASE_URL` lacking `sslmode=verify-full` → refused.
  - `server/Dockerfile:21` pins `ENV NODE_ENV=production`, so the shipped container always activates these refinements.

## Findings

### 1. Deletion hook is router-wide and deletes any owned key submitted in *any* request body (including GETs) without consulting claim state — low

`server/src/audio-upload.ts:265-292` (`discardSubmittedPresignedAudio`) is registered with `router.use(...)` in both assessment routers (`server/src/practice.ts:220`, `server/src/diagnostic.ts:250`), so it fires for **every** route — `GET /practice/question`, `GET /practice/question/:id/help`, `GET /diagnostic/next` — not just the submission routes. `finalizeSubmittedPresignedAudio` (`audio-upload.ts:225-258`) only consults the idempotency claim table when the request carried a *valid* requestId; with no requestId it treats any non-409/429 finished response as definitive and deletes the object.

Live reproduction (probe :4102, owned well-formed key):

```
curl -X GET http://localhost:4102/practice/question \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"audioKey":"audio-uploads/<my-user-id>/bbbbbbbb-2222-4222-8222-222222222222.m4a"}'
→ 200 + one `failed to delete S3 audio object` warn (DeleteObject attempted)
```

Expected: only the two assessment-submission routes should ever schedule object deletion; a read route has no submission semantics and no claim context. Observed: any authenticated request to these routers carrying an owned `audioKey` and no valid requestId deletes that S3 object on response finish.

Impact assessment (why low, not high): the ownership regex binds the key to the caller's own user id, and every deletion uses `cleanup.userId = req.user.id`, so cross-tenant deletion is structurally impossible (verified: other-user keys 400 before any S3 I/O). The real hazard is same-account delete-while-needed: `finalizeSubmittedPresignedAudio`'s "no requestId ⇒ no worker needs this object" premise is false while another same-account request is mid-`resolvePresignedAudio` download of the same key (a client that double-submits one uploaded key under a second requestId — a contract violation, or a deliberate self-attacker). S3 gives no guarantee that an in-flight GetObject survives a concurrent DeleteObject; a truncated stream turns the victim's assessment into a retryable 400/502 *before* any paid provider call or quota reservation (download precedes `assertDailyAssessmentCapacity` and Whisper), and the Recorder keeps the local recording and can re-upload. Window = download duration (seconds), self-impact only, no money loss. Classification: **delete-while-needed, self-impact, low**. Hardening: register the hook on the two POST routes only (or skip finalization for requests the submission handler never claimed).

### 2. Route-level finalization runs before the error handler sets the status — the documented "409/429 → preserve" branch is dead for every post-claim conflict — low

Both route handlers finalize in a `finally` *inside* the handler (`practice.ts:364`, `diagnostic.ts:359`), which executes before the thrown `HttpError` reaches `errorHandler` (`middleware.ts:122-124`) — i.e. before `res.status(err.status)` is set. At route-finally time `res.statusCode` is therefore still 200 for *every* error, so the `if (res.statusCode === 409 || res.statusCode === 429) { preserve }` branch in `finalizeSubmittedPresignedAudio` (`audio-upload.ts:234-237`) can only ever fire from the `finish` listener — and only for requests rejected *before* the handler (limiters, `validate()`). For any error thrown after `ownSubmittedPresignedAudio(res)` cleared `requestId` (`practice.ts:302`, `diagnostic.ts:316`), finalize memoizes `cleanup.finalizing` and deletes at statusCode 200:

- `claimPracticeAttempt` 409 "An assessment is already in progress for this question" (`practice.ts:109`) — the AUDIT_REPORT describes processing conflicts as preserved ("Processing conflicts, pre-claim 409/429 races … preserve the object"); they are in fact deleted.
- `claimDiagnosticAnswer` 409 (`diagnostic.ts:133`), `storePracticeResult`/`finalizeDiagnosticAnswer` 409 "Assessment state changed" — deleted.
- `assertDailyAssessmentCapacity` 429 (daily cap, thrown inside `assessSpeaking` post-claim) — deleted.

Verified by trace; the live probe confirms the mechanism (route-finally finalize is the one issuing deletions — the warn fires even when the final response is a 5xx; pre-route 429s, which *do* go through the finish listener with the real status, preserve correctly).

Impact: benign for data safety in every currently reachable case — the deleted object always belongs solely to the rejected request (post-claim conflicts never share the key with another worker, except the Finding-1 shared-key client-contract violation), the abandoned requestId can be re-claimed, and the client keeps its recording and re-uploads. So: contradictory to the documented invariant, user impact = an extra re-upload on retry, and a latent hazard if any future post-`own` path ever shares the object. **Low.**

### 3. Server can issue grants the client rejects as contract violations (mp3/ogg/oga/flac) — informational

Server key/allowlist (`upload.ts:16-25`, `audio-upload.ts:56-62`) supports 8 extensions and ~15 content types; the client grant parser only accepts keys ending `(m4a|mp4|webm|wav)` (`app/src/lib/types.ts:355-359`) and content types in a 6-entry set missing `audio/mpeg`, `audio/ogg`, `audio/flac`, `video/mp4`, `audio/wave`, `video/webm` etc. (`types.ts:329-336`). A client recording mp3/ogg/flac would receive a syntactically valid grant and throw `ContractError` before uploading — in S3 mode such recordings can never be submitted. Today's Expo recorder only emits m4a (native) / webm (web) (`api.ts:271-289`), so nothing live breaks; this is a contract-narrowing mismatch to fix if more formats are ever enabled. Not exploitable in either direction (server-side ownership/magic-byte/duration gates are the enforcement point).

### 4. Client disconnect mid-S3-download unlinks the temp file under the in-flight pipeline → downstream ENOENT 500 — informational

`resolvePresignedAudio` registers `res.once('close', cleanup)` (`audio-upload.ts:320-321`) which unlinks the temp path, but the response `close` does not abort the S3 GetObject pipeline (only the 30s `operationTimer` does). A client disconnecting mid-download leaves the pipeline writing to an unlinked fd (writes succeed), after which `verifyAudioMagicBytes(req.file.path)` hits ENOENT and throws a non-HttpError → 500 `Internal server error` logged as `unhandled error` (`middleware.ts:147`). Self-induced, no resource leak (fd closed by pipeline; S3 object correctly retained by the close-path guard at `audio-upload.ts:288-290`), but it manufactures scary 500s in error monitoring from ordinary client behavior. Consider aborting the download controller on `close` or treating ENOENT-after-close as a silent abandonment.

### 5. No per-requestId bound on paid retries — informational (by design, bounded elsewhere)

A failed provider attempt abandons the claim (`practice.ts:360`, `idempotency.ts:109-117`), so the same requestId can be re-claimed and re-paid indefinitely. Each attempt does consume one `assessment_usage` reservation (`assess.ts:76-117`, deliberately retained on failure) and is bounded by `ASSESS_DAILY_CAP` (150/user/day), `ASSESS_IP_DAILY_CAP` (300/IP/day, survives account cycling), `ASSESS_GLOBAL_DAILY_CAP` (5000/day), the 20/h/user assess limiter, and the `AI_MAX_CONCURRENCY` semaphore. Worst-case spend is therefore capped and cross-replica (Postgres-backed counters + advisory-locked reservation transaction). Documenting because the mission asked: there is no *per-requestId* retry bound, and none is needed given the caps.

## Held up (attacked, resisted — all verified as cited above)

- **Grant constraints**: exact key, `eq $Content-Type`, `content-length-range [1, 26214400]`, pinned bucket, 300s expiry, static-field policy that fail-closes on injected fields. Grant TTL bounded 60–3600 by zod.
- **Key ownership**: `isOwnedAudioKey` survived every canonicalization attempt (`..`, `//`, prefix escape, missing prefix, extension confusion, double extension, non-v4 UUID, over-long segments) — all 400 pre-S3. Cross-user access is structurally impossible: the userId path segment must equal the authenticated user's DB id, and all fetch/delete calls use that same id. The `-i` flag admits case variants (`.M4A`, `AUDIO-UPLOADS/…`) past the gate, but S3 keys are case-sensitive so these are simply different (nonexistent) keys under the caller's own prefix → clean 400/404. Harmless.
- **Download byte cap**: `ContentLength` pre-check plus a Transform that hard-aborts mid-stream at exactly 25 MiB (verified executing it); a lying/missing length cannot bypass it; unreleased oversized bodies are explicitly destroyed (`releaseUnreadObjectBody`).
- **Grant reuse/overwrite**: the signed POST can be replayed within its TTL to overwrite the same key, but every replay is still policy-capped and content-type-bound, and whatever bytes the server downloads are re-capped mid-stream, magic-byte-checked, and duration-gated (≤120.5s decoded, multi-track fail-closed) before any paid call — so an overwrite races nothing that costs money.
- **Deletion matrix** (live): 404/eligibility → delete; provider/S3 failure → delete; replay-of-completed → delete; pre-claim 409 duplicate → preserve; schema-400 with in-flight requestId → preserve, with fresh requestId → delete; pre-route limiter 429 → preserve; early disconnect → preserved for the worker (route-finally still deletes after the dead-socket completion, which is correct). Only Findings 1–2 deviate, both low.
- **Production config**: `MOCK_AI=true|1` in production refused at boot; `OPENAI_API_KEY` required whenever mock is off; `S3_BUCKET` required in production; `sslmode=verify-full` required in production; placeholder JWT secrets rejected in production; `NODE_ENV` enum is case-sensitive (fail-closed). Dockerfile pins `NODE_ENV=production`. **The free-assessment-via-mock scenario does not boot.**
- **Cost bounds pre-GPT**: Whisper input bounded by 25 MiB + 120.5s decoded-duration gate (metadata-forgery-resistant byte counting, `-map 0:a?` multi-track fail-closed, fail-fast decoder semaphore); transcript hard-capped at 12 000 chars *before* the GPT call (`assess.ts:46,162-164`) — no huge-transcript amplification.
- **Grading output validation**: structured-output parse + zod schema (score 0–100, feedback trimmed 1–800) → malformed/refusal ⇒ retryable 502 before any state/DB update; `passed` recomputed in code; `max_tokens` 400 comfortably covers 800-char feedback + JSON overhead; SDK `maxRetries: 0` so no silent paid retries; transcript is JSON-wrapped with an explicit untrusted-content system prompt (prompt-injection posture is sound; output can only be score+short feedback shown to the same user).
- **Idempotency**: `(user_id, request_id)` PK + `ON CONFLICT` + `FOR UPDATE` re-read serializes concurrent claims; completed replays are free and delete the duplicate object; stale processing rows expire at 5 min and are re-claimable; cross-user requestId reuse impossible (scoped by user id).
- **Client grant validation** (`types.ts:386-420`, `api.ts:349-380`): HTTPS-only URL with no credentials/query/fragment, bounded field counts/lengths, `__proto__`/`constructor`/`file` field rejection, `key === audioKey`, `Content-Type` equality with both grant and request, integer `expiresIn`/`maxBytes` bounds — the grant is treated as hostile input. Local file size checked against `maxBytes` before upload; evicted recording fails as a definite local 400.
- **Temp-file hygiene**: `wx`+0600 create, random UUID names, double cleanup (finish/close + route finally), boot janitor; zero orphans observed in `server/uploads/` after all probe runs.

## Notes on environment

- Probe server on :4102 was killed after testing. One manually inserted `assessment_requests` row remains in the throwaway `ai_english_adversarial` DB (harmless). The `planted-*.m4a` files in `server/uploads/` predate this review (another probe's fixtures) and were left untouched.
- The direct-mode server on :4000 correctly answered `{mode:'direct'}` and 415'd `text/html` / `audio/mp4; codecs=…` grant requests (content types are normalized `trim().toLowerCase()` then strictly allowlisted — no parameter smuggling).
