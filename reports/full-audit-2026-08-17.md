# Full Codebase Audit — 17 August 2026

Audited tree: commit `680793c` (clean working tree). Method: all documented
automated gates executed in both packages, plus eleven parallel deep-read
adversarial lanes covering every production source file in `server/src/` (22
files) and `app/src/` (35 files), both test suites, migrations 001–011, seed
tooling, all `scripts/*.mjs`, CI/Docker, and the full production-source diff
`5155bb7..HEAD` (the four post-audit mutation-hardening commits). The prior
audit (`reports/full-audit-2026-08-15.md`) was treated as baseline; every
"Resolution" claim was re-verified in its lane (all present and correct unless
noted below). Headline findings were independently spot-verified by the
auditor-in-chief before inclusion.

## Automated gate results (executed this audit)

| Gate | Result |
| --- | --- |
| server `format:check` / `lint` / `typecheck` / `build` | PASS |
| server `npm test` (vitest) | PASS — 53 files, **930/930** |
| server `npm audit --audit-level=high` | PASS (0 vulnerabilities) |
| app `format:check` / `lint` / `typecheck` | PASS |
| app `npm test` (jest) | PASS — 25 suites, **1775/1775**, coverage thresholds met |
| app `npm run audit:ci` | PASS (reviewed baseline holds: 15 high / 9 moderate / 0 critical) |
| app `npm run doctor` | **FAIL** — 7 Expo patch-version mismatches (see F-2) |
| app `npm run mutation` | **RED at HEAD** — stale equivalence registry (see F-1) |

Not exercised: full mutation campaigns (server code + catalog), smoke suites,
production `expo export`, real OpenAI/S3, physical devices.

## Findings

### HIGH

**F-1. App mutation equivalence registry is stale against HEAD's own
`Recorder.tsx` — the app mutation campaign cannot pass at HEAD.**
HEAD commit `680793c` edited `src/components/Recorder.tsx` (removed
`recordButtonActive`, removed the `setPermissionNeedsSettings(false)` reset,
dropped the `identityRef` conjuncts from lifecycle guards) without refreshing
`app/scripts/mutation-equivalents.mjs`. Verified end-to-end by running the
project's own merge machinery against lane reports whose embedded source is
byte-identical to HEAD: **32 stale equivalence entries / 32 unexplained
survivors**, all in `Recorder.tsx`; 6 entries reference code that no longer
exists (`recordButtonActive` grep: 6 hits in the registry, 0 in the source —
independently confirmed). It fails **closed** (no unsound pass), but
`npm run mutation` exits 1 at HEAD and the weekly `mutation.yml` app job is
red. Fix per AGENTS.md: rerun the recorder lane, re-review the 32 survivors,
refresh/delete the pinned entries; treat "registry matches a fresh campaign at
the same commit" as a commit-time requirement.

### MEDIUM

**F-2. Server emits `levelUp` on attempts that did not master a word; the app
parser is test-pinned to reject exactly that (post-audit contract drift).**
Found independently by two lanes. `server/src/practice.ts:408-409` sets
`levelUp` whenever the locked user level differs from the request-time level —
including a *rival* session's promotion landing mid-assessment — regardless of
`justMastered`. Three reachable shapes result (failed+rival-promotion at
`:431-444`; passed-60–74+rival-promotion and final-failure at `:455-457`), all
with `mastered: false` + `levelUp`. `app/src/lib/types.ts:427` throws
`ContractError` on exactly this (pinned by `app/__tests__/types-test.ts`), so
the response — already committed and charged — is undisplayable in the live
path *and* on every idempotent replay (Recorder `ContractError` branch), and
the level-up celebration never surfaces. Reachable via two concurrent scored
assessments on different words for one account (two devices); server state
stays consistent and the next question fetch self-heals. Introduced by
`37f4edb` (the concurrent-promotion-loser fix overcorrected). Fix (minimal):
only attach `levelUp` when this attempt's own mastery drove the promotion;
keep the new-level `next`/`progress` for the waiter. Related: the
retry+promotion branch emits a hardcoded English `finalFeedback`
(`practice.ts:441`) that bypasses i18n — will surface the moment the parser is
relaxed.

**F-3. Retention pass (60–74) on a mastered word resets its SRS schedule to
index 1 instead of advancing index+1 — code contradicts the spec.**
`server/src/practice.ts:385-398`: a mastered word scoring 60–74 takes the
`EXCLUDED.best_score >= 60` branch → `srs_interval_index = 1`, `due_at` = +1
day, even if the word had climbed to index 4 (60-day interval). AGENTS.md
specifies "mastery or retention pass → index+1 (clamped)". The in-code comment
calls the reset deliberate, so one side is wrong; the prior audit's "SRS index
math matches spec exactly in all branches" was overstated. Fix either the SQL
(add a `WHEN practice_progress.status = 'mastered' AND EXCLUDED.best_score >=
60 THEN least(idx+1, 4)` branch) or AGENTS.md.

**F-4. `expo-doctor` fails: 7 packages one patch behind the SDK 57 expected
versions.** `expo` 57.0.13→~57.0.14, `expo-asset`, `expo-constants`,
`expo-notifications`, `expo-router`, `expo-sharing`, `expo-splash-screen`
similarly. Fix: `npx expo install --check` / `--fix`.

**F-5. Catalog mutation strict gate fails open on file coverage.**
`server/scripts/check-catalog-report.mjs:39-51` validates per-mutant statuses
but never asserts *which* files were mutated — a narrowed `mutate` glob,
renamed seed module, or truncated/stale `catalog.json` still passes green,
unlike the code lane's `assertExactKeys`. Contradicts the repo's fail-closed
mutation philosophy. Latent today (on-disk report healthy: 7 files, 34,207
mutants). Fix: assert exact file-set equality against `db/seed-data.ts` +
`db/seed-data/*.ts`.

### LOW

*Server — assess/idempotency:*
- Residual F-6 race: a failed assessment's post-response S3 `DeleteObject` can
  land after a blind parallel same-`requestId` retry re-claims, sniping the
  retry's object into the definitive 400 (`assessment-pipeline.ts:217-220` +
  `audio-upload.ts:227-247`). Bounded: no money lost; costs one
  `MAX_S3_REUPLOADS` re-upload.
- Error-after-client-abort never finalizes the S3 object (finalizer only runs
  on `finish`/`close`-with-`writableFinished`); object leaks until the bucket
  lifecycle. Arguably beneficial for same-key retry — if deliberate, document
  it at `audio-upload.ts:274`.
- `claimAssessmentRequest`'s no-row conflict branch throws 409
  `REQUEST_ID_REUSED` with no retry hint although the id is immediately free
  (`idempotency.ts:76-78`); a strict client mints a fresh id and re-uploads
  needlessly.

*Server — rate limits:*
- Post-rollover late-refund race: a refund issued microseconds before window
  expiry can land after a same-key rollover and eat one hit from the *new*
  window (`postgres-rate-limit-store.ts:77-88`); the code comment claims this
  is impossible. Sub-millisecond, bounded to ~1 hit; at minimum correct the
  comment.
- No idempotency sentinel between the two abort re-spend paths
  (`assessment-pipeline.ts:198-208` vs `rate-limit.ts:278-284`); mutually
  exclusive on Node 22 today — add a `assessmentBudgetRespent` guard as
  defense in depth.

*Server — audio ingress:*
- Duplicate submission carrying the same owned `audioKey` with a *different*
  (or malformed) `requestId` can delete the object under an in-flight original
  (`audio-upload.ts:254-282`) — self-DoS only (owner-bound keys), contract
  forbids it, recoverable via re-upload.
- Local filesystem failures in `resolvePresignedAudio` (ENOSPC/EMFILE/EACCES)
  are misreported as `502 PROVIDER_FAILED 'Audio storage unavailable'`
  (`audio-upload.ts:341-352`) — wrong paging signal.
- Double-release guard was removed from the inspection-slot releaser
  (`audio-inspection.ts:42-50`); safe at the single call site today, but a
  future double call drives the counter negative and silently raises the
  ffmpeg spawn cap. Restore the boolean.

*Server — practice/diagnostic:*
- Deadlock cycle: diagnostic finalize/restart locks `diagnostic_state` then
  `users` (child→parent, `diagnostic.ts:141→183`, `:287→296`) vs account
  deletion's cascade (parent→child) → 40P01 500. Practice got the parent-first
  fix; diagnostic did not. Fix: lock the `users` row first.
- Loser `levelUp` echo mislabels non-promotion level changes (e.g. a
  re-diagnostic downgrade reported as "Your level advanced",
  `practice.ts:408-409,441`). Practically unreachable outside MOCK_AI.
- Answered skipped-fallback words stay parked → all-parked levels re-serve the
  same word in a loop until the 7-day park lapses (`practice.ts:147-165` vs
  upsert at `:372-400` never clearing `skipped_until`).
- Attempt counter resets to 1 after a final failure (`practice.ts:279`),
  making the 3-attempt cap cosmetic over a word's lifetime. Spec-silent;
  confirm intent.

*Server — core/infra:*
- No `server.on('error')` handler — `EADDRINUSE` crashes with a raw uncaught
  exception, bypassing the `logger.fatal` + `pool.end()` choreography
  (`index.ts:196-198`).
- No validation that `SHUTDOWN_DRAIN_MS ≥ S3_OPERATION_TIMEOUT_MS +
  OPENAI_TIMEOUT_MS + 40s` — misconfiguration force-kills in-flight paid
  assessments on every deploy (`index.ts:30` vs `config.ts:74`).
- `/ready` re-reads the entire migrations directory (readdir + readFileSync
  per file) on every probe (`schema-readiness.ts:37-39` via `app.ts:63`);
  memoize the manifest.
- `ORDER BY name` in the schema-manifest check relies on DB collation matching
  JS `.sort()` (`schema-readiness.ts:52`); `COLLATE "C"` for determinism.
- `PATCH /auth/me` lacks the sibling routes' new `rowCount` guard — concurrent
  self-delete yields a TypeError 500 instead of 409 `STATE_CHANGED`
  (`auth.ts:346-350`).
- Mailer webhook response body never consumed (`mailer.ts:26-38`) — socket
  held until GC; `await response.body?.cancel()`.

*Server — DB/scripts/tooling:*
- Mutation-DB guard runs only as an `npm run mutation:code` pre-step; the
  destructive `DROP DATABASE ... WITH (FORCE)` in `tests/global-setup.ts`
  asserts the weaker `'test'` purpose, so direct `npx stryker` invocation
  against `ai_english_test` bypasses the stricter guard. Thread
  `MUTATION_LANE` into global-setup.
- `load-1000.mjs:195-199` trusts server-supplied `retryAfterSeconds`
  unbounded — clamp (e.g. 60 s).
- Dockerfile `apk add` packages (ffmpeg, dumb-init, python3…) unpinned
  (`server/Dockerfile:8,20`) against a mutable Alpine index, despite
  ffmpeg-version-sensitive gates; pin or assert a major bound at boot.
- `seed()` wraps `seed.sql`'s own `BEGIN/COMMIT` in a second transaction —
  harmless warnings, log noise (`db/run.ts:201-204`).
- Lane-name lookup `codeMutationLanes[laneName]` truthy for inherited keys
  (`constructor`); use `Object.hasOwn`.

*App:*
- `sleepAbortable` TDZ bug: pre-aborted signal rejects with `ReferenceError`,
  not `AbortError` (`Recorder.tsx:99-115`); unreachable today, latent footgun.
  Hoist `let timer` above `rejectAbort`.
- `recovering` phase can latch with no running recovery and no UI escape when
  SecureStore throws (`Recorder.tsx:393-405`, `1047-1050`, `468-494`) —
  permanent spinner until remount. Fail-closed; add an in-UI retry/escape.
- Skip refetch failure is silent — the just-parked word stays on screen with
  no error (`practice/index.tsx:109-124`; refetch never throws).
- Settings re-entrancy hardening inconsistent: `saveName`/`chooseLanguage`
  guard on render-state, not the synchronous busy refs their siblings got in
  `2997733` (`settings/index.tsx:121-166`); `nameDraft` never re-syncs from a
  cross-session name change.
- Daily-reminder atomicity gaps remain on the set-after-schedule and
  delete-after-cancel paths (`daily-reminder.ts:117,122-126`) — pref/schedule
  can disagree until logout.
- Backgrounding the app discards a held, unsubmitted take in any phase
  (`Recorder.tsx:841-846`) — flag for product decision.
- `parsePracticeStats` rejects the server's legitimate pre-placement
  `level: null` response (`types.ts:532-553`); reachable only via a
  cross-device diagnostic restart while on `/home` — graceful degradation.
- Stale-equivalence diagnostics strip `matched`/`expected` counts and print
  "matched nothing" even for over-matching entries
  (`merge-mutation-reports.mjs:459-463`) — misleading exactly in the dangerous
  case.
- Mutation provenance shared inputs omit `app.json`
  (`mutation-provenance.mjs:15-23`).
- Five leftover `.stryker-recorder-tmp/sandbox-*` dirs (gitignored; delete).

*Root/misc:*
- Root `reports/` is gitignored (`.gitignore:26`) — this audit trail is
  local-only unless `!reports/*.md` is added.

### INFO (verified still-present and accepted/deliberate)

- Window-boundary abort can under-charge by one hit (direction now in the
  user's favor; bounded ±1). Re-spend into an already-rolled row can
  over-charge +1 (conservative).
- F-6 re-upload trigger matches any no-code/`VALIDATION_FAILED` 400, not just
  the dead-key 400 — worst case one wasted free-budget grant cycle.
- Recovery polling ignores `Retry-After` on 429/503 (bounded by the 5-min
  lease); re-upload straddling the recovery deadline discards a resubmittable
  take.
- `RATE_LIMIT_GLOBAL_MAX`/`RATE_LIMIT_AUTH_MAX`/`RATE_LIMIT_ASSESS_MAX` lack
  the `.max(100_000)` bound sibling knobs have; custom keyGenerators bypass
  express-rate-limit's trust-proxy warnings (operator-misconfig surface only).
- `requestTimeout > headersTimeout` and 42s-minimum budget hold only
  implicitly; post-response S3 finalization can outlive `requestTimeout`
  (covered by the replay endpoint).
- verify-1000 DB guard is a substring `/load/i` match (script is read-only).
- Route-thrown 429s carry no `Retry-After` (RateLimit-Reset header covers it);
  `validate()` assigns `req.query`/`req.params` (Express-4-only, pinned).
- Signed-in users can't select an English UI; reset-password email in router
  params — both still deliberate-looking.

## Prior-audit resolutions — all re-verified present and correct

Every F-1…F-11 fix and every batched LOW fix from the 15 Aug report was
confirmed in code by its lane: X-Client-Version on every API call (never on
S3), production `MAIL_MODE=webhook` + HTTPS-webhook guard + `redirect:'error'`,
app-side S3 re-upload recovery (`MAX_S3_REUPLOADS=1`), abort-aware grant +
retry sleep, mutation two-lane exclusion, ratcheted coverage thresholds
(96/93/96/96), splash plugin + dark variant, window-guarded abort re-spend,
native persist ownership re-check + in-transaction claim cleanup (F-11 root
cause), concurrent-promotion loser re-read (see F-2 for its overcorrection),
skip dead-end fallback, harmonized audio error codes, janitor unlock logging,
Whisper stream destroy, mailer webhook tests, migration 011 (SRS CHECK 0–4 +
all question FKs RESTRICT), credential-snapshot guards on
change-password/delete-account, Docker HEALTHCHECK genuinely exercised in CI,
smoke relaxation knobs, upload-artifact v7 SHA pin, app mutation job in CI,
export-file PII cleanup, reminder re-schedule on language change.

## Verified clean (major invariants confirmed with file:line evidence)

- **Auth**: bcrypt 12 + 72-byte enforcement; dummy-hash login timing
  equalization; uniform 204 forgot-password; 128-bit SHA-256-only single-use
  reset tokens with timingSafeEqual (length safety via migration 010 CHECK);
  token_version revocation; HS256-pinned JWTs with iss/aud + UUID subjects;
  zod on every route; no credentials in logs; cascade/anonymize deletion.
- **Money pipeline**: reservation commits before provider I/O, no
  double-spend/refund path (all four abort orderings traced against
  express-rate-limit 8.6.2 internals); AI semaphore paired acquire/release;
  daily caps atomic cluster-wide; only `assess.ts` imports openai; replay
  never re-reserves; claim TTLs comfortably exceed worst-case provider time.
- **Rate limits**: atomic row-lock rollover; fail-safe decrement/resetKey/
  re-spend; HMACed namespaced keys; brownout → 503+Retry-After never 500;
  flag-don't-reject credential budgets; key normalization byte-identical to
  the zod email transform; mount order correct pre/post JSON parsing; every
  paid endpoint limited; S3 grants on a separate budget.
- **Audio ingress**: size-constrained presigned grants; owner-bound keys at
  download/delete/cleanup; dual size gates (metadata + streaming counter);
  magic-byte sniffing bound to extension; exactly-one-stream ffprobe gate over
  sandboxed `fd:` with protocol/format whitelists; `-ignore_editlist 1`;
  inspection slots acquired before spawn, released on every outcome;
  O_NOFOLLOW fd dance; temp-file ownership handoff; janitor fallback.
- **Practice/diagnostic**: SRS math correct in all spec-conforming branches
  (F-3 is the one deviation); demotion only on fail <60; promotion
  ceil(0.85×total) with C2 clamp, lock-serialized, no double-promotion;
  silence = free retry with no writes; native mode writes nothing, Whisper
  language pinned server-side; binary search provably ≤5 questions; ETag weak
  comparison correct; response contract additive-only.
- **Contract**: all 19 app-called endpoints match the server on path/method/
  body/params; 27 error codes identical both sides; Retry-After bounds
  contain everything the server emits; grant validation hostile-input-complete
  with AWS host pinning; audio bounds aligned (0.5s/120s both sides).
- **App**: token storage device-only keychain with conditional clear; pending-
  assessment store strictly parsed and owner-bound; Recorder lifecycle
  hardening from `680793c` verified sound (epoch bump synchronous, no leaked
  timers/subscriptions, every async setState mounted-gated); password policy
  mirrors server byte-for-byte; i18n 353-key parity across 5 languages,
  type-enforced.
- **Tests**: 930 server + 1775 app, zero skipped/focused, RTL v14 async
  discipline clean, no real network/AWS/OpenAI, audit baseline honest,
  mutation tooling fail-closed paths genuinely tested.
- **Ops**: config ↔ .env.example 1:1 (51 keys); all prod superRefine guards
  present (MOCK_AI, JWT_SECRET entropy, S3_BUCKET, sslmode, MAIL_MODE);
  graceful shutdown + pool-size boot check; janitors advisory-locked and
  batched; migrations immutable with checksums; production seed/setup refusal;
  destructive-target guards fail closed; Dockerfile digest-pinned non-root;
  CI actions SHA-pinned, `permissions: contents: read`, Postgres service
  images digest-pinned; README/SECURITY claims match code.

## Recommended order of action

1. F-1: rerun the recorder mutation lane, re-review survivors, refresh
   `mutation-equivalents.mjs` — un-reds the weekly app mutation job.
2. F-2: gate `levelUp` on own-attempt promotion (one-line server fix) — this
   is the only user-visible production defect found.
3. F-3: pick a side — fix the retention-pass SQL branch or amend AGENTS.md.
4. F-4: `npx expo install --fix`.
5. F-5: add exact file-set assertion to `check-catalog-report.mjs`.
6. Batch the LOWs by area: diagnostic lock ordering; audio-upload requestId/
   error-labeling; infra boot hardening (server 'error' handler, drain-ms
   validation, manifest memoization); Recorder TDZ + recovering-latch; auth
   PATCH /me rowCount guard + mailer body drain; tooling guards.

---

## Resolution — 17 August 2026 (same day)

All HIGH/MEDIUM/LOW findings were fixed the same day; `AGENTS.md` was updated
to match. Gate results at the final state: server 948/948 tests + format/lint/
typecheck/build; app 1795/1795 tests + format/lint/typecheck + doctor 20/20 +
audit:ci (baseline unchanged) + mutation tooling tests.

- **F-1**: full app mutation campaign launched against the fixed tree;
  registry refresh follows from its fresh survivor set (see below).
- **F-2**: `levelUp` is now attached only when the attempt's own mastery
  triggered the promotion; the rival-promotion override branch and its
  hardcoded English `finalFeedback` were removed. `next`/`progress` still read
  from the fresh post-lock level. Server tests updated; every emitted shape
  verified against the app parser.
- **F-3**: fixed code-side — a retention pass (≥60) on a mastered word now
  advances `srs_interval_index` +1 (clamped) with the matching `due_at`,
  matching the AGENTS.md spec. New SRS test pins 2→3→4→4 advancement.
- **F-4**: all 7 Expo packages bumped to the SDK-57-expected patches
  (`expo install --fix` runaway-recursion worked around via direct
  `npm install <pkg>@<range>`); doctor 20/20; audit advisory set unchanged.
- **F-5**: `check-catalog-report.mjs` now asserts exact file-set equality
  against the workspace catalog (reviewed type-only `types.ts` exclusion,
  fail-closed) and byte-exact embedded sources. Live catalog report passes
  (34,207 mutants).
- **LOW server**: diagnostic finalize/restart now lock `users` before
  `diagnostic_state` (deadlock cycle closed); skipped-fallback answers clear
  the park; attempt-counter per-cycle reset documented deliberate;
  `server.on('error')` fatal choreography; `SHUTDOWN_DRAIN_MS` ≥ worst-case
  request budget enforced at config boot; readiness manifest memoized +
  `COLLATE "C"`; `PATCH /auth/me` 409 guard; mailer webhook body drained;
  local-disk errors no longer misreported as S3 502; inspection-slot releaser
  idempotent again; vanished-claim conflict → `REQUEST_IN_FLIGHT` retry hint;
  rate-limit re-spend `assessmentBudgetRespent` sentinel + honest comment;
  migration 012 (`assessment_requests.audio_key`) closes the S3 finalize
  self-DoS and narrows the F-6 residual race; abort+error retention
  documented.
- **LOW tooling**: catalog gate (F-5); `global-setup` escalates to the
  mutation-purpose guard when `MUTATION_LANE` is present, so direct `npx
  stryker` can't bypass it; load-1000 clamps `retryAfterSeconds` to 60s;
  Dockerfile pins `ffmpeg>=6.1,<9` and logs resolved versions; `seed()` no
  longer double-wraps seed.sql's transaction; lane lookups use
  `Object.hasOwn`; `!/reports/*.md` + `!/reports/adversarial/*.md` gitignore
  exceptions make the audit trail committable.
- **LOW app**: `sleepAbortable` TDZ fixed; recovering phase gained a `Try
  Again` escape (reuses `common.tryAgain`, no new i18n keys); skip refetch
  failure alerts; settings busy-refs + focus-guarded `nameDraft` re-sync;
  daily-reminder compensating actions both directions; `parsePracticeStats`
  accepts the exact pre-placement `level: null` shape (with a NaN%-width guard
  in home.tsx); stale-equivalence diagnostics keep and print
  `matched`/`expected`; provenance fingerprints `app.json`; stale Stryker
  sandboxes deleted.
- **Deliberately unchanged (documented in AGENTS.md)**: OS backgrounding
  discards a held unsubmitted take (privacy: no unsubmitted audio persists);
  attempt counter restarts per serving cycle.
- **INFO items**: left as-is (accepted residues documented in code comments).
