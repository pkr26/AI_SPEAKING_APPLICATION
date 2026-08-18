# Full Codebase Audit — 15 August 2026

Audited tree: commit `5155bb7` (clean working tree). Method: all documented
automated gates executed in both packages, plus ten parallel deep-read audit
lanes covering every production source file, both test suites, migrations,
seed data, CI/Docker, and the root `AGENTS.md` claims treated as the
specification. Headline findings were independently spot-verified by the
auditor-in-chief before inclusion. Prior audit rounds (`AUDIT_REPORT.md`,
`reports/adversarial/`, `reports/load1000-audit-2026-08-15.md`) were treated
as baseline; this report records what is **still** open or newly regressed.

## Automated gate results (executed this audit)

| Gate | Result |
| --- | --- |
| server `format:check` / `lint` / `typecheck` / `build` | PASS |
| server `npm test` (vitest, 817 tests) | FLAKY — 816/817 on first run, 817/817 on rerun (see F-11) |
| server `npm audit --audit-level=high` | PASS (0 vulnerabilities) |
| app `format:check` | **FAIL** — 6 files unformatted |
| app `lint` / `typecheck` | PASS |
| app `npm test` (jest, 1388 tests) | tests pass, **coverage thresholds FAIL** (see F-2) |
| app `npm run doctor` | **FAIL** — 1 check (see F-9) |
| app `npm run audit:ci` | **FAIL** — reviewed baseline exceeded (see F-1) |
| app production `expo export` ios + android | PASS (bundles written to `app/dist`) |
| CI on GitHub (last two commits) | **RED** — infra-level failure, logs expired (see F-3) |

Not exercised (unchanged from prior audit): real OpenAI account, live S3,
physical devices, signed native builds, local Docker build, post-HEAD mutation
campaigns.

## Findings

### HIGH

**F-1. App `audit:ci` fails on main — app CI is red by design right now.**
`app/scripts/check-audit.mjs:11-12`. Live run: `moderate: 8` vs baseline 7,
`total: 23` vs 22 (`high: 15` unchanged, `critical: 0`, no unknown
advisories). The new moderate is in the reviewed `@expo/config-plugins` →
`expo-sharing` transitive chain. Both `ci.yml:136` and
`security-audit.yml:45` run this gate, so app CI fails until the baseline is
re-reviewed and bumped (or the advisory resolves upstream).

**F-2. App `npm test` fails at HEAD — coverage thresholds not met.**
Global thresholds `lines: 99, functions: 95` (`app/package.json:63-82`);
actual `lines: 97.1%, functions: 92.5%`. Cause: the new legal screens
`src/app/settings/privacy.tsx` and `terms.tsx` have 0% coverage (untouched by
any test). Additionally `format:check` fails on 6 files:
`__tests__/screens-settings-test.tsx`, `__tests__/session-notice-test.ts`,
`__tests__/theme-test.ts`, `src/app/practice/feedback.tsx`,
`src/app/practice/index.tsx`, `src/app/settings/index.tsx`.

**F-3. CI has not run green on the last two commits.**
Workflow runs for `401bb19` and `5155bb7` failed in 2–4 s across all jobs
(infrastructure-level signature); logs are expired, cause unverifiable. Last
green CI is two commits back, so HEAD's gates have no hosted verification.

### MEDIUM

**F-4. The `MIN_CLIENT_VERSION` / 426 retirement mechanism is inert — the app
never sends `X-Client-Version`.** Found independently by three audit lanes.
`server/src/middleware.ts:233-251` passes any request without the header by
design; a case-insensitive search of all of `app/src` finds zero references —
`apiFetch` (`app/src/lib/api.ts:427-429`), `apiUploadAudio` (`api.ts:545`),
and the S3 POST paths send none. Raising `MIN_CLIENT_VERSION` would 426
exactly zero deployed builds; the app's `CLIENT_UPGRADE_REQUIRED` copy
(`api.ts:112,175`) is dead code. Fix: send `X-Client-Version:
<expoConfig.version>` on every request, with a test asserting the header.

**F-5. `MAIL_MODE=log` is permitted in production — live password-reset
tokens are written to info logs, and no mail is delivered.**
`server/src/config.ts:99-103` defaults `MAIL_MODE` to `'log'` with no
production `superRefine` guard (unlike `MOCK_AI`, `JWT_SECRET`, `S3_BUCKET`,
`sslmode`); `server/src/mailer.ts:40-46` logs the full `text`, which embeds
the reset token (`auth.ts:259-278`); the pino redaction list deliberately
does not cover `text`. Related: `MAIL_WEBHOOK_URL` accepts plain `http://`
even in production (`config.ts:104-117`), which would POST account-takeover
tokens in cleartext. Fix: production guard requiring `MAIL_MODE=webhook` (or
an explicit opt-in) and `https:` webhook URLs.

**F-6. Failed assessments delete the S3 object, defeating the contracted
same-key retry — with a small deletion race.**
`server/src/assessment-pipeline.ts:172` calls `ownSubmittedPresignedAudio`
before the attempt; on a retryable provider failure the claim is abandoned
(`:196`, "same requestId stays retryable") but the finish hook
`finalizeSubmittedPresignedAudio` (`audio-upload.ts:256-257`) deletes the S3
object anyway. A retry reusing the persisted `audioKey` gets a definitive 400
("audio upload not found or expired"), which the app treats as terminal
(`Recorder.tsx:690-695`). The abandon-vs-DELETE ordering also opens a window
where a fresh claim hits `NoSuchKey` on a valid submission. Impact is bounded
(the app keeps the local recording and a manual re-submit re-uploads), but
the automatic reconciliation path can never succeed after a transient
failure. Fix: preserve the object when the claim is abandoned for a retryable
cause, or contract that this 400 triggers an automatic re-upload with the
same `requestId`.

**F-7. Server Stryker code lane silently re-absorbed the seed catalog.**
`server/stryker.config.json:4` — `"mutate": ["src/**/*.ts", "db/**/*.ts",
"!db/seed-data.ts"]` excludes only the 17-line aggregator; after commit
`44293f5` split the catalog into `db/seed-data/a1.ts`…`c2.ts` (~50k lines,
~2000 static literal mutants), the code lane still matches them, so every
content mutant reruns the full integration suite at concurrency 1 — exactly
what the two-lane split exists to avoid, and it mixes static mutants into the
executable-code score AGENTS.md says must be recorded separately. Fix: add
`"!db/seed-data/**"` to the code lane.

**F-8. Server coverage thresholds are far below what the suite delivers.**
`server/vitest.config.mts:17-22` pins `75/60/75/75` (unchanged since
introduction). The suite is demonstrably much deeper; a 15–25-point coverage
regression on security-critical modules would pass CI. Fix: measure once,
ratchet thresholds to just below actual.

**F-9. `expo-doctor` fails: `app.json` `splash` is not valid in the SDK 57
schema.** `app/app.json:11-15` — "should NOT have additional property
'splash'". The same block hardcodes `backgroundColor: "#FFFFFF"` with no dark
variant, so dark-scheme devices get a white launch flash. Fix: move splash
config to the SDK-57-sanctioned location (e.g. `expo-splash-screen` plugin
config) with a dark variant.

**F-10. Recorder cancel is unresponsive during the upload-grant request and
503 capacity-retry sleeps.** `app/src/components/Recorder.tsx:1135` calls
`apiRequestAudioUpload` without an abort signal (the helper at
`app/src/lib/api.ts:569` doesn't accept one); `:1178` sleeps up to 30 s in a
plain `setTimeout` the signal can't interrupt. On slow networks the cancel
button — whose accessibility hint promises "Stops sending and keeps your
recording" — appears dead for 20–30 s. Correctness is preserved; this is
responsiveness. Fix: thread `signal` through the grant helper and make the
retry sleep abort-aware.

**F-11. One server test is flaky in the full suite.**
`tests/practice.test.ts > "serializes native attempts per question and clears
the in-flight claim on success"` failed in the first full-suite run
(`expected 1 to be +0` on a leftover-row count at `practice.test.ts:699`),
then passed on a full-suite rerun (exit 0), in isolation, and when the file
runs alone — 1 failure in 2 identical full-suite runs. Points to cross-test
state leakage (shared `ai_english_test` DB under forked workers), not
necessarily a production defect — but the suite is not fully deterministic as
run by CI.

### LOW

- **Abort-guard gap before capacity reservation** (`rate-limit.ts:257-270`):
  a client abort in the pre-reservation window gets both limiter hits
  refunded while the route may still commit the daily-cap reservation —
  contradicts the guard's own invariant for the close-before-commit ordering.
- **Window-boundary abort over-charge** (`rate-limit.ts:266`,
  `postgres-rate-limit-store.ts:38-53`): a long assessment aborted across the
  assess-window boundary charges +1 hit into a fresh window with no
  offsetting refund (conservative direction, bounded).
- **Janitor advisory-unlock failure is silent** (`janitor.ts:32-43`): client
  correctly poisoned, but the error is never logged and the tick reports
  success — stuck-lock scenarios invisible in metrics.
- **Whisper upload stream never explicitly destroyed** (`assess.ts:273`):
  relies on the SDK to destroy the body stream on abort; if it doesn't
  (version-dependent), fds leak until process exit.
- **Two error paths break the uniform error/retry contract**:
  `audio-inspection.ts:543` 503 carries no `code`/`retryAfterSeconds`;
  `audio-upload.ts:344` 413 lacks the `AUDIO_TOO_LARGE` code its sibling path
  (`:73`) has — the app localizes the same condition two different ways.
- **Concurrent-promotion loser answers with the old level's `next`/`progress`**
  (`practice.ts:374-408`): promotion itself is serialized correctly; the
  losing transaction serves one stale-level question and never emits the
  `levelUp` its own attempt triggered. Self-corrects next fetch.
- **`GET /practice/question` hard-500s when every word at the level is
  skipped** (`practice.ts:529` with the skip upsert at `:554-560`): all three
  pickers return undefined for up to 7 days; user-reachable dead end surfaced
  as a server error.
- **Native persist skips the inflight-claim ownership re-check** that both
  English persist paths enforce (`practice.ts:790-813` vs `:306-314`,
  `:441-449`): an expired-and-replaced claim lets two paid results complete;
  no progress corruption possible (native writes nothing).
- **Question-deletion FK behavior inconsistent** (migration 010 made
  `attempts.question_id` RESTRICT; `assessment_requests`, `practice_progress`,
  `practice_inflight`, `diagnostic_state` question FKs still CASCADE): the
  documented "never destroy learner history" invariant is half-enforced.
  Latent — nothing deletes questions today.
- **`srs_interval_index` CHECK admits 0–8**; the 5-step schedule only
  produces 0–4 (migration 010 vs `practice.ts:29-30`). Unreachable today.
- **CI Docker "healthcheck" step doesn't exercise the healthcheck**
  (`ci.yml:116-118`): overrides the entrypoint to print `node --version`; a
  broken `HEALTHCHECK` (missing wget, wrong port) would pass.
- **`smoke:concurrent` in CI deviates from the documented recipe**
  (`ci.yml:92-93`): no `BASE_URL`, single-server variant, env relaxation
  omits three credential-budget knobs — works today, drifts from docs.
- **`actions/upload-artifact` pinned three majors behind**
  (`mutation.yml:71`, v4.6.2 vs current v7).
- **Unhandled-rejection risk in reduce-motion probe**
  (`Recorder.tsx:779`): the only fire-and-forget promise in the file without
  `.catch`.
- **Daily-reminder text frozen in the language active at schedule time**
  (`daily-reminder.ts:88-91`; `settings/index.tsx:114-130` never
  re-schedules on language change); reminder time rendered as fixed 24-hour
  `HH:00` regardless of locale (`settings/index.tsx:33-35`).
- **Data-export file left in app cache after sharing**
  (`settings/index.tsx:142-147`): PII-bearing JSON never deleted after
  `Sharing.shareAsync`.
- **No app mutation job in CI** (`mutation.yml` runs only the server lane)
  despite AGENTS.md verification step 7 requiring both.
- **Mailer webhook failure branches untested** (`mailer.ts:32-34` non-2xx and
  timeout paths).

### INFO (accepted/documented or cosmetic; no action required)

- `/reset-password` timing asymmetry between unknown/known emails
  (sub-millisecond, bounded by per-IP limiter; register 409 already discloses
  existence).
- Password change/reset leaves prior unconsumed reset tokens valid until
  expiry (≤30 min; requires mailbox access).
- 30-day JWTs with all-device-only revocation — documented deliberate design.
- Rate-limit counter HMAC identity coupled to `JWT_SECRET` (rotation orphans
  live counters; benign, worth an ops note).
- Idempotent replays keep their assess-budget hit (deliberate; bounded by
  defaults).
- Revision picker returns closest-to-due learning word even when nothing is
  due (`practice.ts:69-92`) — in-code comment says deliberate; AGENTS.md
  wording ("opens with revision when one is due") is ambiguous either way.
- Diagnostic can re-serve an already-asked question within one run (no
  anti-join; ~1% per question at 100/level).
- Blanket preserve-on-409/429 over-retains S3 objects for definitive
  conflicts (fail-safe; bounded by bucket lifecycle).
- Duration gate skipped under `MOCK_AI` (production config requires real key
  when not mock).
- `isOwnedAudioKey` rebuilds a RegExp per call (safe today — subject is
  UUID-validated — but one auth refactor from trouble).
- Export-walker comment overstates the bound 10× (`api.ts:766-768`: 50k rows
  actual, comment says 500k).
- History parser's `attemptNo ≤ 3` silently couples to diagnostic search
  depth (`types.ts:583-584`); provably safe today.
- Cross-package toolchain drift: TypeScript `~6.0.3` (app) vs `^5.7.2`
  (server); eslint 9 vs 10.
- `db:preflight` is a well-built pre-003 upgrade validator but unwired and
  undocumented.
- Mutation-guard "differs from `ai_english_test`" rule holds only implicitly
  (the name can't contain `mutation`).
- Signed-in users can never select an English UI (`i18n.tsx`) — appears
  deliberate; confirm.
- Feedback "retry" title vs attempt chip use different referents for "try N
  of 3".
- Pool-brownout 503 shedding string-matches a pg-pool error message
  (`middleware.ts:285`) — rewording in a pg upgrade silently degrades 503→500;
  pinned by tests today.
- Dockerfile re-copies db assets already copied by the build (harmless
  redundancy).

## Verified clean (major invariants confirmed with file:line evidence)

- **Auth**: bcrypt cost 12 with 72-byte enforcement; login timing equalization
  via dummy hash; uniform 204 forgot-password; 128-bit reset tokens stored
  SHA-256 only, single-use, `timingSafeEqual`; `token_version` revocation on
  logout/change/reset; cascade-or-anonymize account deletion; HS256-pinned
  JWTs with issuer/audience and UUID-shaped subjects; zod `validate()` on
  every route (malformed UUIDs → 400); no credentials in logs (F-5 excepted).
- **Rate limiting/idempotency**: atomic fixed-window counters with
  row-lock-serialized rollover; fail-safe refunds with no double-refund path;
  capacity flag keeps hits after paid spend; abort guard correctly mounted
  (F-lows noted); store brownout sheds retryable 503; all six advisory-lock
  keys verified distinct on live Postgres; claim/replay semantics race-safe.
- **Audio/AI pipeline**: size-constrained presigned POST grants with
  per-user key ownership enforced at download/delete/cleanup; layered size
  gates; magic-byte verification; exactly-one-audio-stream ffprobe gate over
  sandboxed `fd:` with the FFmpeg-version hazard avoided; `-ignore_editlist 1`
  on MOV; concurrency slots acquired before spawn and released on every
  outcome; capacity reservation committed before provider I/O with no
  double-spend/refund path; shutdown abort registry; only `assess.ts` imports
  `openai`; temp-file cleanup on every path.
- **Practice/diagnostic**: SRS index math matches spec exactly in all
  branches (incl. the 1-based Postgres array offset); demotion only on fail
  <60; promotion threshold `ceil(0.85×total)` with C2 clamp and
  concurrency-safe single `levelUp`; silence = free retry with no writes;
  native mode writes nothing and pins Whisper language server-side;
  diagnostic binary search provably terminates ≤5 questions with CHECK
  constraints unreachable to violate; claim/restart serialization airtight.
- **Schema/seed**: migrations immutable after apply (checksums enforced at
  migrate and boot); production refusal for setup/seed; `seed.sql`
  byte-for-byte identical to generator output, exactly 600 questions/100 per
  level; every table/column referenced in `server/src` SQL exists in the
  final schema and vice versa; mutation-DB guard enforces all documented
  rules.
- **Contract**: every app request path/method/body matches the server routes;
  error-code unions identical on both sides; Retry-After honored and bounded;
  `requestId` reuse and secure-store handoff persistence correct; grants
  validated as hostile with genuine-AWS host pinning; camelCase throughout;
  additive-only tolerance holds.
- **App**: single shared `Recorder`; no leaked timers/subscriptions; password
  policy mirrors server byte-for-byte; i18n key parity type-enforced, no
  hardcoded user-facing strings; dark mode fully themed; every Expo SDK 57
  API usage verified against installed type definitions.
- **Tests**: zero skipped/disabled tests or snapshots in either suite; no
  real AWS/OpenAI anywhere; RTL v14 async discipline clean (~182 awaited
  call sites); destructive DB setup guarded; Stryker runner/concurrency
  settings match AGENTS.md (F-7 scope overlap notwithstanding).
- **Ops**: `config.ts` ↔ `.env.example` 1:1; all actions SHA-pinned with
  `permissions: contents: read` and `persist-credentials: false`; Dockerfile
  multi-stage, digest-pinned, non-root, ffmpeg present; node version
  consistent across `.nvmrc`/engines/CI/Docker; `.gitignore` keeps secrets,
  uploads, and reports untracked (verified via `git ls-files`).

## Recommended order of action

1. Un-red the gates: re-review and bump the `audit:ci` baseline (F-1), add
   tests for `privacy.tsx`/`terms.tsx` and run prettier (F-2), fix the
   `app.json` splash schema error (F-9), re-run CI on HEAD (F-3).
2. Fix the two-lane Stryker exclusion (F-7) and ratchet server coverage
   thresholds (F-8).
3. Close the contract/safety gaps: send `X-Client-Version` (F-4), production
   guard for `MAIL_MODE` + HTTPS webhook (F-5), preserve-or-reupload on
   failed-assessment S3 retry (F-6).
4. Investigate the ordering-sensitive practice test (F-11).
5. Batch the LOW items by area (rate-limit edge cases; audio error codes;
   practice dead-ends; CI hygiene; app polish).

---

## Resolution — 15 August 2026 (same day)

All actionable findings were fixed the same day; `AGENTS.md` was updated to
match. Summary:

- **F-1**: baseline re-reviewed (new moderate traced to the same reviewed
  `xcode/uuid` transitive advisory via `expo-sharing`; `expo-splash-screen`
  added one more node) and bumped to `moderate: 9, total: 24`.
- **F-2**: behavioral tests added for `privacy.tsx`/`terms.tsx` (and the
  uncovered focus-chain handlers in `(auth)/reset-password.tsx` that the
  global-threshold group also needed); the 6 files reformatted. All app
  coverage thresholds pass (1405 tests).
- **F-3**: not locally fixable — the GitHub-hosted CI failures need a rerun
  after push; the fixes above un-red the locally reproducible gates.
- **F-4**: every API request now sends `X-Client-Version:
  <expoConfig.version>` (omitted if unset; never on direct-to-S3 uploads);
  the 426 retirement gate is now live. Tests pin the header.
- **F-5**: production boot is refused unless `MAIL_MODE=webhook`, and
  `MAIL_WEBHOOK_URL` must be HTTPS in production (loopback `http:` exempt).
  `.env.example` and config tests updated.
- **F-6**: fixed app-side — a definitive "audio upload not found or expired"
  400 during recovery now re-uploads the locally kept recording with the same
  `requestId` instead of dead-ending. The server's delete-after-failure
  privacy choreography is unchanged.
- **F-7**: code lane now excludes `!db/seed-data/**`.
- **F-8**: server thresholds ratcheted to 96/93/96/96 against measured
  97.2/94.4/98.0/97.6.
- **F-9**: `splash` moved to the `expo-splash-screen` config plugin (new
  dependency `~57.0.6`) with a `dark` variant; `expo-doctor` 20/20.
- **F-10**: `apiRequestAudioUpload` accepts an abort signal; the 503
  capacity-retry sleep is abort-aware. Recorder cancel is prompt.
- **F-11**: root cause was a genuine production bug — the native persist path
  left `practice_inflight` cleanup to the post-response finally; it now
  deletes the claim inside the persist transaction (with the same
  ownership re-check as the English paths, 409 `STATE_CHANGED` on
  replacement). Full suite passed twice back-to-back (827 tests).
- **LOW**: all fixed — audio error codes harmonized (`AUDIO_TOO_LARGE`,
  `CAPACITY_BUSY`, deliberate no-retry-hint comment on the broken-inspector
  503); janitor unlock failures logged; Whisper stream destroyed in finally;
  abort re-spend is window-guarded (`incrementWithinWindow`) and also fires
  at reservation time when the client already disconnected;
  concurrent-promotion loser re-reads the level and echoes `levelUp`;
  all-skipped levels fall back to the soonest-unparking word; native persist
  ownership guard; mailer webhook failure/timeout branches tested; migration
  `011_srs_check_and_question_fk_restrict.sql` (SRS CHECK 0–4 + all question
  FKs RESTRICT, suite green); pg-pool message string-match documented.
- **CI**: the docker job now genuinely exercises the container HEALTHCHECK
  against a provisioned Postgres service (fails loudly otherwise); the smoke
  step relaxes the three credential-budget knobs; `actions/upload-artifact`
  repinned to v7.0.1 (`043fb46d…`, verified three ways via the GitHub API);
  `mutation.yml` gained the app mutation lane.
- **INFO**: comment-only fixes applied (export bound, `attemptNo` coupling
  pin, pg-pool string-match note). Deliberately unchanged: English-UI product
  decision, `expo-notifications` plugin entry (not required by SDK 57 for
  local reminders), 30-day JWT design, revision-early fallback semantics.
