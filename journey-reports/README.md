# User-Journey Verification Reports

First-time-user functional verification of the AI English Coach product, driven
end-to-end over the real HTTP API exactly the way the Expo client calls it
(`X-Client-Version: 1.1.1` on every request, two-step audio upload, bearer
auth), with the mobile UI narrative sourced from the app's routing/screens.

**Verdict up front: every scenario completed successfully.** Across the full
sweep: **313 scripted driver checks passed** (12+41 in reports 02–03, 27 in
04, 40 in 05, 6 in 06, 16 in 07, 72 in 09, 66 in 10, 23 in 11, 10 in 12;
report 01 is narrative-driven with every step observed), **69/69 targeted
server suite checks**, the **full app suite 3,875/3,875** (incl. 409
i18n/settings-specific tests), and **69/69** re-run silence/audio/stuck-case
suites — **0 product defects**. Six scripted checks initially "failed"; each
turned out to be a driver misexpectation, and the product was right every
time (all documented in the reports: cross-level mastery, native-after-pass
ordering, idempotent recording delete, gate ordering with unknown questions,
export two-cursor protocol, per-IP auth residue).

Start with [`SCENARIO-CATALOG.md`](SCENARIO-CATALOG.md) — the researched
inventory of EVERY scenario in the system with its verification status.

## Fixes applied from the findings (2026-08-31)

Two findings became code changes (both re-verified live in
[`evidence/scenario13.log`](evidence/scenario13.log), pinned by tests, full
gate green — `format:check`/`lint`/`typecheck`/`build`/`npm test` 1544/1544/
`smoke` 194 assertions):

1. **Credential-budget 429s now carry a constant-window retry hint**
   (`retryAfterSeconds` = full window length + `Retry-After` header) on
   login, change-password, and delete-account throttles. The value is
   constant, never remaining time, so it cannot pace attacks while honest
   users learn their maximum wait (`server/src/auth.ts`).
2. **Per-IP register budget refunds pure validation 400s** via the existing
   exact-window refund wrapper — a form-error can no longer burn a shared
   NAT's signup budget; 201/409/413/429 still count
   (`server/src/rate-limit.ts`).

Three findings were deliberate designs that only lacked discoverable
documentation, now written into `AGENTS.md`: the export's two-cursor walk
protocol (a naive `nextCursor`-only walker never terminates), the
native-only CORS posture (empty `CORS_ORIGINS` grants no browser origins),
and `/client-config`'s deliberate non-exemption from the version gate.

## Reports

| Report | Persona | What is covered |
| --- | --- | --- |
| [01-first-time-user.md](01-first-time-user.md) | Fresh install, no account | Discovery, registration validation, login, pre-diagnostic gating, upload grants, the full 3-question adaptive placement test, crash-recovery reconciliation, level reveal + acknowledgement |
| [02-account-without-diagnostic.md](02-account-without-diagnostic.md) | Registered, abandoned the placement test mid-run | Day-2 resume of the exact in-flight question, duplicate-submission replay, restart, gating, forgot/reset password (full loop) |
| [03-account-with-diagnostic-completed.md](03-account-with-diagnostic-completed.md) | Placed learner (C1) | Durable practice cycles, 3-try budget, English + mother-tongue modes, skip, mastery/SRS/stats, history paging, bilingual help, profile/language switches, recordings, placement retake, change password, export, logout, account deletion |
| [04-field-and-settings-matrix.md](04-field-and-settings-matrix.md) | Every settings/signup form field | Boundary matrix: name (empty/1/100/101/controls/Telugu/emoji), email case normalization, password (7/8/no-letter/72/73 bytes), language radios, change-password rules, export paging |
| [05-four-language-matrix.md](05-four-language-matrix.md) | Learners in te/hi/es/zh | The complete journey per mother tongue: native-script help, native attempts, language snapshots in history/export, uiLanguage round-trips, Whisper pinning |
| [06-audio-fidelity-and-privacy.md](06-audio-fidelity-and-privacy.md) | "Is the History audio my recording?" | Direct answer: History holds no audio by design in dev mode; server residue zero; owner-only cursors; the version-pinned S3 path where audio DOES exist, and the one gated tool for byte-level confirmation |
| [07-forced-upgrade-gate.md](07-forced-upgrade-gate.md) | Old app build | The 426 CLIENT_UPGRADE_REQUIRED wall: exact version boundary, malformed/missing headers, every exempt privacy/portability exit, and how the app's upgrade modal reacts |
| [08-frontend-controls-matrix.md](08-frontend-controls-matrix.md) | Every button/field/toggle | The complete per-screen control matrix — every interactive element in the app mapped to its live-verified behavior, app-test coverage, or pinned code contract |
| [09-per-language-settings.md](09-per-language-settings.md) | te → hi → zh → es settings | The entire settings surface per mother tongue, plus the proof that interface language never relocalizes content while mother tongue does (same question, three fetches) |
| [10-per-language-recording.md](10-per-language-recording.md) | te → hi → zh → es recording | The whole recording pipeline per language with real hashed audio: grants ×3 endpoints, retain true/false/omitted, replays, the all-native arc, the container magic-byte matrix, 25 MiB cap, multipart field budgets |
| [11-negative-and-edge.md](11-negative-and-edge.md) | Malformed/edge inputs | Bad/oversized JSON, query edges, routing quirks, helmet/CORS posture, stale cycles, foreign reconciliation, concurrent double-tap races, two-device consistency, the export two-cursor protocol |
| [12-lockouts-and-abuse-guards.md](12-lockouts-and-abuse-guards.md) | Attacker / heavy user | Every abuse guard at its default budget: login lockout (and the real owner still getting in), silent forgot-password skipping, restart/delete/playback/assessment throttles with their Retry-After contracts |

## How it was run (reproduce it)

Dedicated throwaway database and server, no dev data touched:

```bash
cd server
createdb ai_english_journey_uat
DATABASE_URL=postgres://localhost:5432/ai_english_journey_uat npm run db:setup   # 24 migrations + 600 questions

DATABASE_URL=postgres://localhost:5432/ai_english_journey_uat \
JWT_SECRET="$(openssl rand -hex 32)" MOCK_AI=true PORT=4100 NODE_ENV=development \
S3_DIAGNOSTIC_BUCKET= S3_PRACTICE_BUCKET= S3_ACCESS_KEY_ID= S3_SECRET_ACCESS_KEY= \
RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 \
ASSESS_IP_DAILY_CAP=100000 RATE_LIMIT_REGISTER_MAX=100000 RATE_LIMIT_AUTH_MAX=100000 \
npx tsx src/index.ts

cd ../journey-reports/drivers
node scenario1.mjs > ../evidence/scenario1.log
node scenario2.mjs > ../evidence/scenario2.log   # saves /tmp/journey/userB.json
node scenario2-reset.mjs > ../evidence/scenario2-reset.log  # needs userB.json + the server log path inside
node scenario3.mjs > ../evidence/scenario3.log   # needs /tmp/journey/userA.json written by scenario1
node scenario4.mjs > ../evidence/scenario4.log
node scenario5.mjs > ../evidence/scenario5.log   # ffmpeg required (real tone fixture)
node scenario6.mjs > ../evidence/scenario6.log   # ffmpeg required
# scenario7 needs the second, gate-armed instance:
#   …same env as above plus MIN_CLIENT_VERSION=1.1.1 PORT=4200 → then
node scenario7.mjs > ../evidence/scenario7.log
node scenario9.mjs > ../evidence/scenario9.log
node scenario10.mjs > ../evidence/scenario10.log  # ffmpeg required
node scenario11.mjs > ../evidence/scenario11.log
# scenario12 needs a strict-defaults instance (add RATE_LIMIT_AUTH_MAX=100000
# if this IP's 15-minute auth window is already spent) on :4300 → then
node scenario12.mjs > ../evidence/scenario12.log
```

Raw request/response evidence for every step is in [`evidence/`](evidence/)
(`scenario1.log`, `scenario2.log`, `scenario2-reset.log`, `scenario3.log`,
`rate-limit-observation.md`). Step numbers cited in the reports (e.g. §28)
refer to those logs.

## What "verified" means here

- **Live-verified (HTTP journey):** everything in the reports — real
  status codes, error contracts, headers, and state transitions observed on
  the running server.
- **App-suite-verified:** the complete client behavior set is pinned by the
  app's own unit suite — **3,875/3,875 tests passing** with enforced
  coverage floors (`cd app && npm test`), covering every screen's controls,
  the Recorder lifecycle, recovery, and i18n.
- **Test-suite-verified:** behaviors that cannot be produced through HTTP in
  `MOCK_AI=true` mode were confirmed against the repo's own pinned suites,
  all passing on this checkout (69/69):
  - `tests/audio-inspection.test.ts` (36) — silent/near-zero audio → `422
    AUDIO_SILENT` before any paid work, <0.5 s → `422 AUDIO_INVALID`, >120.5 s
    → `413 AUDIO_TOO_LONG`, forged MOV edit-lists and multi-stream containers
    rejected, inspection timeouts → retryable 503.
  - `tests/diagnostic-silence-and-resume.test.ts` (15) — silence is a free
    retry (no attempt written, placement unchanged, same question re-served),
    resume durability, legacy counted-silence repair.
  - `tests/practice-stuck-cases.test.ts` (18) — native-mode feedback, native
    replay isolation, silence/deletion races.
- **Not exercised (needs real infrastructure):** live Whisper/GPT grading
  (mock scores are random 40–95, pass ≥60, master ≥75), the split-S3 upload
  path and retained-recording lifecycle (`smoke:s3` is the gated tool for
  that), and provider 503/`CAPACITY_BUSY` backpressure (limits were relaxed
  for the journey). In dev "direct" upload mode the recordings feature is
  empty by design.

## Cross-cutting observations (things a first-time user benefits from)

- **Uniform machine-readable errors.** Every failure answered
  `{ error, code }` with a stable code (`VALIDATION_FAILED`,
  `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `TOKEN_REVOKED`,
  `QUESTION_MISMATCH`, `PRACTICE_CYCLE_CLOSED`, `DIAGNOSTIC_DONE`,
  `AUDIO_INVALID`, `RATE_LIMITED`, …). Malformed UUIDs are 400s, never 500s.
- **Retry-after honesty.** The observed 429 (default register budget,
  [`evidence/rate-limit-observation.md`](evidence/rate-limit-observation.md))
  carried `Retry-After: 3590` seconds — an hour-class hint, matching the app's
  inline "when you can try again" rate-limit card.
- **Duplicate submissions are free.** Re-posting the identical logical
  assessment (same `requestId` **and** `questionId`) returned the byte-equal
  stored response with no second assessment and no state advance (report 02
  §4, report 03 §14). A replay carrying a *different* question id is treated
  as a hostile/stale submission (`409 QUESTION_MISMATCH`), which is the
  correct fail-closed side of that contract.
- **Nothing doubles on crash.** The app's real recovery path
  (`GET /assessments/{requestId}`) returned the fully committed first
  diagnostic answer with its response body intact, and 404 for unknown ids —
  reconciliation can never silently create new paid work.
- **Security defaults observed live:** uniform 401 for wrong password vs
  unknown account (no account enumeration), uniform 204 from forgot-password
  whether or not the address exists, password reset revokes existing bearer
  tokens (`TOKEN_REVOKED`), logout and password change revoke tokens
  server-side, account deletion requires the password and cascades
  immediately, data export never leaks `password_hash`.
- **Caching discipline:** assessment/practice endpoints are `no-store`; the
  bilingual help endpoint is `private, no-cache` + ETag and answered **304**
  to `If-None-Match` — bandwidth saved without stale personalized content.
- **Dev vs production gates:** on this dev configuration, product routes
  accepted a request without `X-Client-Version` (200); the version floor
  (`426 CLIENT_UPGRADE_REQUIRED` for < 1.1.1, enforced when the gate is
  enabled) is a production-deploy behavior documented in AGENTS.md, and every
  journey request sent the header anyway, exactly as the real app does.

## Environment facts

- Server: repo @ `main` (commit `e9a4b49` working tree), Node 26.7.0,
  PostgreSQL on localhost, ffmpeg 8.0 (inspection toolchain verified by
  `/ready`).
- Database: `ai_english_journey_uat` (kept for inspection; drop it when done).
- Journey server was stopped after the runs; restart with the recipe above.
