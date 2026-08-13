# Security and Release Audit — 13 August 2026

## Decision

The audited working tree is materially stronger than the repository baseline,
and every completed pre-commit automated gate listed below passes. Preliminary
exact-source mutation campaigns completed and their material survivors were
reviewed. Five material app survivors now have regression tests whose exact
mutants were manually confirmed as detected. Because those tests changed after
the broad app report—and the requested release order requires commit, push, and
green GitHub Actions before full mutation testing—the post-push exact-commit
campaigns remain required. This is therefore a verification checkpoint rather
than a release approval. The application is **not approved for a public
production or app-store release yet**. The remaining blockers require owner
choices, production infrastructure, legal and educational review, GitHub
configuration, or real-device/release-artifact validation; they cannot be
truthfully completed in source code alone.

Security is not a one-time property and no line-by-line review can prove the
absence of defects. This report is a point-in-time record of the code inspected,
changes made, evidence collected, and risks still open.

## Audit boundary

- Audit starting point: commit
  `6c56e82ad62426ba77c673f85488d59db942fad7`.
- Landed hardening: commits
  [`163e607371b6c9b1279f0aecdb5481abd016e61a`](https://github.com/pkr26/AI_SPEAKING_APPLICATION/commit/163e607371b6c9b1279f0aecdb5481abd016e61a)
  and
  [`415968751f7ff58c970cfa8a34ff62776828e010`](https://github.com/pkr26/AI_SPEAKING_APPLICATION/commit/415968751f7ff58c970cfa8a34ff62776828e010)
  are on `origin/main`. The latter is the current committed baseline.
- Current candidate: the **uncommitted mutation- and test-hardening working tree
  on top of `4159687`**. Its pre-commit gates and preliminary mutation evidence
  are recorded below. The final commit, push, resulting GitHub checks, and full
  post-push exact-commit mutation rerun are pending; green checks for the landed
  commits do not certify these uncommitted changes.
- Local toolchain: Node.js 24.6.0, npm 11.5.1, and PostgreSQL client/server
  compatibility exercised against local PostgreSQL 14.19. Production should
  use a currently supported PostgreSQL release.
- Scope: Expo application, Express/TypeScript API, database migrations and
  content shape, authentication, assessment/idempotency flows, S3/local audio
  ingress, AI guardrails, tests, dependency manifests/locks, CI, container
  definition, environment examples, repository hygiene, and release/security
  documentation.
- Not exercised: a real OpenAI account, live S3, production infrastructure,
  signed native builds, physical microphone devices, app stores, or the Docker
  image. Docker and dedicated secret scanners were unavailable locally.

## Corrections completed in the working tree

### Backend and data safety

- Replaced unrestricted presigned S3 PUT uploads with short-lived,
  content-type-bound, size-constrained presigned POST grants. The response now
  carries `uploadUrl`, signed `uploadFields`, stable `audioKey`, normalized
  `contentType`, expiry, and byte limit.
- Registered one response-lifecycle S3 deletion hook after JSON parsing and
  authentication but before route-local practice/diagnostic eligibility
  checks, assessment rate limiting, and body validation.
  Definitively finished, replayed, schema-invalid, eligibility-rejected, and
  provider-failed requests discard their user-owned object. Processing
  conflicts, pre-claim 409/429 races, early disconnects, and failed ownership
  checks preserve the object for the active owner or lifecycle backstop. Stream
  downloads retain an independent byte cap and private local temporary-file
  cleanup. A bucket lifecycle rule is still required for an upload never
  submitted to the API.
- Added PostgreSQL-backed fixed-window stores for global, authentication,
  normalized-email login, assessment, and upload-grant limits via migration
  `007_distributed_rate_limits.sql`; counters are shared by replicas,
  identifiers are HMAC-derived, and expired windows are swept at boot and
  hourly. An upstream WAF remains necessary for volumetric traffic and
  database-outage planning.
- Added resource-bounded decoded-sample audio validation before provider work.
  FFmpeg receives only an `O_NOFOLLOW` regular-file descriptor, a fixed demuxer
  and `fd` protocol allowlist, and a secret-free environment. Decoder duration,
  per-allocation size, probe/output volume, thread/process concurrency,
  readiness spawning, and wall time are bounded; forged container-duration
  metadata is covered by regression tests. Total decoder RSS still depends on
  OS/container limits and must be validated in the built image.
- Made pass/final-failure practice advancement select a different next question
  inside the same transaction that records the attempt and idempotent response.
  This removes stale reads and immediate same-question repeats.
- Rejects malformed provider grading objects—including blank feedback and
  out-of-range scores—before state or database updates, so an unusable paid
  response produces a retryable 502 instead of a misleading learner result.
- Unified the direct- and S3-upload byte ceiling, fixed the direct-upload exact
  25 MiB boundary, released unread oversized S3 bodies, and made local orphan
  cleanup deterministic and accurately reported.
- Added strict authored-catalog validation and deterministic seed generation,
  expanded production preflight validation for every translation/example, and
  preserved primary deploy errors when rollback, unlock, or connection cleanup
  also fails.
- Hardened startup/shutdown handling for signals received before the HTTP server
  begins listening, and added regression coverage for these lifecycle paths.
- Added regression coverage for the S3 cleanup lifecycle, the distributed
  rate-limit store, cross-replica behavior, transactional practice boundaries,
  database tooling, seed integrity, and exact input boundaries.

### Mobile reliability and trust boundaries

- Validates S3 grants as hostile input: production HTTPS, no credentials or
  fragments in the URL, bounded fields/keys/values, finite integer limits,
  owned-key shape, no server-supplied `file` field, and equality between signed
  `key`, `audioKey`, and the requested/returned content type.
- Uses native file multipart upload rather than loading the entire recording
  into JavaScript memory. The upload stage, request ID, question context, and
  stable S3 key are persisted so a process death between object upload and
  assessment submission can reconcile or safely resubmit the same logical
  request.
- Serializes authentication-token reads/writes and sign-out cleanup so an older
  SecureStore operation cannot overwrite newer session state. Restore failures
  now fail closed and present an explicit recovery action instead of silently
  treating storage failure as logout.
- Added responsive content/form widths, shared touch-target tokens, stronger
  contrast, microphone-settings recovery, app-focus/query coordination, an
  invalid-route screen, and a last-resort route error boundary that does not
  expose stack/provider details.
- Clears diagnostic-local state at every authenticated-session boundary and
  rejects stale callbacks from a previous identity. Recorder ownership now also
  prevents a second mounted instance from starting while another instance owns
  interrupted-submission recovery.
- Added five focused app regressions for material survivors found during
  independent mutation-result review. Targeted reruns manually confirmed that
  each exact mutant is now detected; the complete app campaign must still be
  rerun against the final pushed commit.
- Expanded API, parser, auth-race, recorder, navigation-gate, recovery, and
  screen tests around these paths.

### Repository, CI, and test hygiene

- Reordered server CI to fail on formatting/lint/type/build before database
  mutation, kept SHA-pinned actions, restricted push runs to `main`, and added
  manual dispatch.
- Added app-wide coverage collection and enforced global floors, plus
  production-mode iOS and Android Expo exports in CI.
- Added a weekly/manual dependency-audit workflow: zero-tolerance high-severity
  full dependency audit for the server and the explicit reviewed-advisory gate
  for the Expo tree.
- Hardened Git/Docker ignores for environment variants, package-manager config,
  signing keys, certificates, mutation scratch, and reports. The committed
  `.env.example` exception remains available.
- Fixed the assessment-test audio fixture to use mode 0600 and remove itself,
  tightened a previously vacuous smoke assertion, and raised both mutation
  configurations' break threshold from 0 to 60.
- Pinned Stryker 9.6.1 in both package manifests so `npm ci` reproduces mutation
  tooling. The mobile lane mutates all production TypeScript/TSX. The server
  runs executable API/database code against the full suite, then mutates the
  authored `db/seed-data.ts` catalog in a dedicated lane with its byte-for-byte
  artifact test; both lanes emit HTML and JSON reports.
- Updated the architecture, S3 POST contract, deployment requirements,
  security-reporting status, and verification commands in repository docs.

## Exact local verification evidence

### Server

- `npm run format:check`, `npm run lint`, `npm run typecheck`, and
  `npm run build`: passed.
- Both the full `npm audit --audit-level=high` and production-only
  `npm audit --omit=dev --audit-level=high` passed with 0 vulnerabilities.
- Registry verification covered 523 package signatures and 125 attestations.
- `npm test`: 37/37 files and 574/574 tests passed.
- Coverage: 97.32% statements, 93.51% branches, 97.02% functions, and 98.08%
  lines.
- The latest completed compiled-server smoke run created an isolated database,
  applied migrations 001–007, seeded and verified all 36 questions—six at each
  CEFR level—passed production preflight and readiness, exercised the complete
  auth/diagnostic/help/practice/retry/final-feedback/export/password/revocation/
  deletion journey, emitted 90 successful assertions, and exited 0. The server
  was stopped and the isolated database was dropped.

### Mobile

- `npm run format:check`, `npm run lint`, and `npm run typecheck`: passed.
- `npm test`: 14/14 suites and 727/727 tests passed.
- Coverage: 95.38% statements, 90.99% branches, 97.06% functions, and 98.57%
  lines, above the new global floors of 80%, 75%, 85%, and 85%.
- `npm run doctor`: 20/20 Expo checks passed.
- `npm run audit:ci`: passed the reviewed upstream baseline gate. This is not a
  clean audit: raw `npm audit` still reports 22 affected dependency nodes—15
  high, 7 moderate, and 0 critical—under advisory IDs 1119441, 1138808, and 1138809.
- Registry verification covered 1,123 package signatures and 215 attestations.
- Production-mode `expo export` passed for both iOS and Android with an explicit
  HTTPS API URL.

### Repository and operational evidence

- `git diff --check`, the configured server/app format checks, and this report's
  Prettier check passed; both GitHub workflow files parse as YAML.
- GitHub Actions passed for the landed hardened state: the
  [server/mobile CI run](https://github.com/pkr26/AI_SPEAKING_APPLICATION/actions/runs/31650626921)
  and the
  [dependency security-audit run](https://github.com/pkr26/AI_SPEAKING_APPLICATION/actions/runs/31650788665)
  are green. A new run is required after the current candidate is committed and
  pushed.
- A high-confidence tracked-file pattern scan found no private-key block, AWS
  access-key ID, GitHub token, or long OpenAI-style token. The local
  `server/.env` is ignored and mode 0600. This is narrower than GitHub secret
  scanning or a dedicated history scanner and is not a substitute for either.
- Stryker is reproducible from the lockfiles. Preliminary exact-source reports
  completed before the final five app regression tests were added:
  - The server executable-code lane generated 2,973 mutants: 2,719 killed, 198
    survived, 39 had no coverage, 17 were explicitly ignored, and none timed out
    or produced a runtime error. Its standard mutation score was 91.9824%. The
    ignored mutants are deliberate CommonJS CLI entry-identity boundaries that
    are exercised by real subprocess tests; this classification is not an
    execution failure.
  - The independent server catalog lane killed 2,053/2,053 mutants (100%).
  - The app lane generated 4,342 mutants: 3,188 killed, 1,040 survived, 32 had no
    coverage, 64 timed out, and 18 produced runtime errors. Its standard score
    was 75.2081%. Manual inspection found that the timeout classifications came
    from mutant-induced permanent locks or loops in recorder/auth/password
    paths, while runtime classifications came from fail-fast API URL and
    `ContractError` construction mutants; the Stryker worker remained stable.
    These are detected mutant behaviors, not evidence that the ordinary test
    suite crashed.
- Independent review identified all material survivors requiring action. Five
  app regression tests were subsequently added, and focused runs manually
  confirmed detection of each exact mutant. Because the test tree changed, the
  preliminary app report is not terminal evidence. Full app and both server
  lanes must be rerun after the exact candidate is committed, pushed, and passes
  GitHub Actions.
- The Docker CLI was unavailable, so `server/Dockerfile` was not built,
  health-tested as a container, SBOM-generated, or image-scanned.

## Release blockers and required follow-up

### P0 — before any public data collection

1. **Finish the requested release sequence for the current candidate.** The
   pre-commit gates pass and preliminary mutation campaigns have been reviewed.
   Commit and push the exact tree, require green CI and dependency-security
   checks for the resulting SHA, then run the complete app and two server
   mutation lanes against that exact pushed commit. Address every fixable
   material finding and repeat affected gates before treating the campaign as
   terminal evidence. No final SHA or post-push run is claimed in this report.
2. **Put enforceable repository controls in place.** The repository is private.
   GitHub's API reports branch protection/rulesets unavailable on the current
   plan, vulnerability alerts disabled, secret scanning disabled, and code
   scanning not enabled. Upgrade/configure GitHub or use an equivalent protected
   delivery system with required reviews/checks, dependency alerts, secret
   scanning, and SAST before release. Configure private vulnerability reporting
   or publish a monitored private security contact; no address was invented in
   this audit.
3. **Publish product identity and legal/privacy terms.** Choose the final app
   name, slug, URL scheme, iOS bundle ID, Android application ID, build numbers,
   signing owners, store accounts, support route, and store metadata. Publish a
   privacy policy and terms covering microphone consent, AI processing,
   subprocessors, transcript retention/deletion, account deletion, and incident
   contact. Decide the minimum age and complete child-safety/regulatory review
   if minors are in scope.
4. **Provision production operations.** Deploy HTTPS, managed PostgreSQL,
   secret management, least-privilege private S3, the required abandoned-upload
   lifecycle rule, tested backups/restores, a WAF/load-balancer limit,
   monitoring/error tracking/alerts, an incident runbook, and a tested rollback.
   For an upgrade, run database preflight and migration as a single deployment
   job; for a fresh database, migrate and then publish the reviewed seed before
   starting the API. Never run `db:setup` in production.
5. **Define data retention.** Submitted audio is transient, but assessment
   transcripts in `attempts` do not have automatic expiry. Select and implement
   a documented retention/archive/deletion schedule before accepting public
   recordings.

### P1 — before app-store release

6. **Resolve or formally accept the Expo dependency baseline.** Track
   SDK-compatible upstream releases, investigate whether each advisory reaches
   a shipped native artifact, and scan the signed release. The baseline gate
   prevents growth; it does not make 15 high-severity findings disappear.
7. **Validate actual release artifacts and integrations.** Build and scan the
   container and signed iOS/Android candidates. Exercise a real private S3 POST
   grant from native devices because Jest's FormData/file mocks do not prove
   React Native-to-S3 interoperability. Test physical microphones, permission
   denial, process death at every upload stage, offline/reconnect, background
   transitions, low storage, large/invalid files, slow networks, accessibility,
   reduced motion, and supported OS versions.
8. **Professionally validate the learning product.** Have native Telugu, Hindi,
   Spanish, and Simplified Chinese linguists review all authored content, and
   have an assessment specialist validate the CEFR placement design—especially
   C1/C2. Run documented accuracy/fairness evaluations across accents, dialects,
   speech impairments, device quality, noise, silence, and prompt-injection
   attempts with the production model configuration.
9. **Complete account and localization capabilities appropriate to the launch
   market.** Email ownership verification, password reset, MFA/passkeys,
   refresh-token rotation, and full UI localization are not implemented. Decide
   which are release requirements based on the threat model and audience, then
   add product/E2E coverage for the chosen flows.

## Product claim limitation

The AI pipeline evaluates a Whisper transcript for relevance, grammar,
coherence, and vocabulary. It does not inspect validated acoustic features and
must not be marketed as a pronunciation, accent, timing, fluency, or prosody
assessment. OpenAI mock-mode test success is not evidence of production model
accuracy, safety, cost, or availability.

## Re-audit trigger

Repeat threat modeling, dependency review, penetration testing, privacy/legal
review, real-device testing, backup/restore testing, and release-artifact scans
after the P0/P1 work, before launch, and after material authentication, storage,
AI-provider, database, or mobile-runtime changes.

---

# Follow-up Audit and Remediation — 13 August 2026 (second pass)

## Scope and method

An independent second-pass audit covered every source file, test file,
migration, CI workflow, container definition, and repository document in both
packages after the `933e48a` hardening commit. Eleven parallel adversarial
review passes were consolidated, and every material finding was manually
re-verified against the code before remediation. No CRITICAL or HIGH defects
were found. Eight medium findings and the actionable lows were remediated in
this pass; the residual items below were reviewed and deliberately left.

## Remediated in this pass

### Production code

- **Targeted login lockout (medium).** The per-account login budget previously
  429'd over-budget requests before credential verification, so one attacker
  IP could keep a victim's login locked out. The limiter now flags over-budget
  requests and the route still verifies the password: only failures are
  throttled and a correct password always authenticates
  (`server/src/rate-limit.ts`, `server/src/auth.ts`).
- **Rate-limit refund crash (medium).** `PostgresRateLimitStore.decrement` and
  `resetKey` are invoked fire-and-forget by express-rate-limit; a database
  brownout previously surfaced as an unhandled rejection that terminates the
  process. Both are now fail-safe (logged, swallowed), and `decrement` is
  window-guarded so a late refund cannot eat the next window's hit
  (`server/src/postgres-rate-limit-store.ts`).
- **Account-cycling spend (medium).** Per-user assessment budgets reset with
  each re-registered account. A fixed-window per-source-IP daily assessment
  budget (`ASSESS_IP_DAILY_CAP`, default 300, validated
  `>= ASSESS_DAILY_CAP`) now follows the network across identities
  (`server/src/rate-limit.ts`, mounted on both assess routes).
- **Multi-track duration-gate bypass (medium).** The audio inspection decoded
  only the first audio stream while the whole container was sent to the paid
  transcriber. The gate now maps every audio stream (`-map 0:a?`), so
  multi-track containers fail closed at the single-stream PCM muxer
  (empirically verified with a two-track M4A)
  (`server/src/audio-inspection.ts`).
- **Password-confirmation brute force (low).** `change-password` and
  `DELETE /auth/account` now carry a per-account throttle
  (`RATE_LIMIT_PASSWORD_MAX`, default 10/15min) with the same always-verify
  shape, closing online brute-force via stolen token plus distributed IPs.
- **`requestTimeout` misalignment (low).** The 75s whole-request budget was
  shorter than the worst-case assessment chain (~100s). It now tracks the
  configured sub-deadlines: S3 operation timeout + provider timeout + 40s
  decode/ingress margin (130s with defaults) (`server/src/index.ts`).
- **Process-crash robustness (low).** multer `_removeFile` no longer throws
  synchronously on a path-less file (`server/src/upload.ts`); a well-signed
  JWT with a non-UUID `sub` now 401s instead of producing a 22P02 500
  (`server/src/middleware.ts`).
- **Paid-retry amplification (info).** Grading `max_tokens` raised 300 → 400
  so a near-max-length feedback can no longer truncate into an unparseable,
  retryable 502 (`server/src/assess.ts`).
- **Misclassified missing recording (low, app).** The direct multipart upload
  now fails with a definite local 400 when the OS evicted the cached
  recording, instead of an ambiguous network error that triggered minutes of
  recovery polling (`app/src/lib/api.ts`).

### Tests and gates

- Route-level duration-failure coverage: both assess routes now have tests
  asserting a `verifyAudioDuration` rejection yields 413, zero provider calls,
  and a cleanly abandoned, retryable request claim
  (`server/tests/assessment-duration-route.test.ts`).
- Multi-track rejection regression with a real two-track FFmpeg fixture
  (`server/tests/audio-inspection.test.ts`).
- Recorder re-entrancy guard tests now invoke the press handler directly past
  the disabled Pressable, so the runtime guard (previously uncovered
  `Recorder.tsx:769`) is genuinely exercised; uploading/recovering phase
  announcements and the mid-submit 401 path are now pinned.
- Screen→parser wiring is asserted (`parseResult` identity) on the diagnostic
  and both practice screens.
- App coverage floors raised toward actuals (global 95/88/95/99) with new
  per-path floors for `Recorder.tsx` and `src/lib/`
  (`app/package.json`).
- Server `typecheck` now covers the test suite (`server/tsconfig.test.json`);
  the latent test type errors it surfaced were fixed.
- `config.test.ts` mocks dotenv out, so a developer `server/.env` can no
  longer backfill deleted keys and vacate defaults assertions.
- Weakened/over-claiming tests corrected: practice attempt-walk transition
  rule, assess client-construction order independence, dead `vi.waitFor` in
  the S3 upload suite, diagnostic-search title drift, pending-assessment state
  reset.
- Store fail-safe/window-guard, per-IP daily budget, password-throttle, and
  login-lockout regression tests added; the transaction test's limiter stub
  was extended for the new limiter.
- Smoke now exercises the assessment-reconciliation endpoint (`GET
/assessments/:requestId` completed + 404), uses the canonical UUID pattern,
  and documents the full relaxed-limits command including
  `ASSESS_IP_DAILY_CAP` (`server/scripts/smoke.mjs`).
- Docker healthcheck follows the configured `PORT` instead of hardcoding 4000;
  `.gitignore` now covers `google-services.json` / `GoogleService-Info.plist`;
  `.env.example` documents the new knobs.

## Reviewed and deliberately left

- **Recorder `recoverPending` latch when the tombstone is gone (low, latent).**
  Traced as not live-reachable: every tombstone-deletion path also unmounts
  the recorder, and the conservative keep-controls-locked behavior is pinned
  by three tests. A comment now records the invariant
  (`app/src/components/Recorder.tsx`).
- **Registration account-existence signal (409 vs generic 401).** Accepted and
  documented in code: per-IP limits bound enumeration volume, bcrypt-before-
  unique-check removes timing signal, and verified-email registration is
  already a P1 roadmap item.
- **Per-request sub-deadline sum vs `requestTimeout` in extreme configs** is
  now computed; other info-level items (S3 grant TTL client messaging,
  tombstone wipe on session expiry, logout requiring connectivity, readiness
  re-hashing, fixed-window refund edges) are deliberate trade-offs or
  negligible robustness notes recorded in the detailed findings.

## Verification evidence for this pass

- Server: format/lint/typecheck (now including tests)/build all pass; vitest
  37/37 files and 591+/591+ tests pass (new counts include the added tests);
  coverage thresholds met.
- App: format/lint/typecheck pass; jest 14/14 suites and 753/753 tests pass
  under the raised floors; doctor 20/20; `audit:ci` baseline unchanged.
- Smoke: full journey green with the new reconciliation assertions (82
  assertions) against a relaxed-limits `MOCK_AI=true` dev server.
- The FFmpeg multi-track rejection was empirically verified against the host
  FFmpeg before the code change (two-track M4A → muxer error → 415).

## Follow-up addendum — remaining three items closed

The three items the second pass initially left as documented-accepted were
subsequently remediated as well:

- **Recorder recovery latch.** `recoverPending` no longer latches the
  `recovering` phase when the durable tombstone is gone: it returns the
  controls to idle with an honest "could not confirm whether your answer was
  saved" message. The two stage-transition failure paths in `submit` now
  return to the `recorded` phase with the recording intact (nothing is
  uploaded before the durable stage mark succeeds), and the three affected
  tests were updated to pin the new, strictly better behavior
  (`app/src/components/Recorder.tsx`, `app/__tests__/recorder-test.tsx`).
- **Registration enumeration.** Account creation now carries a dedicated,
  tighter per-IP budget (`RATE_LIMIT_REGISTER_MAX`, default 10/hour, shared
  PostgreSQL store) instead of the generic credential budget, bounding bulk
  enumeration and account cycling. The residual single-probe signal is
  inherent to registration without verified email and remains documented in
  code (`server/src/rate-limit.ts`, `server/src/app.ts`,
  `server/src/auth.ts`).
- **Recorder missing-URI guard.** Verified structurally unreachable: every
  code path that clears the saved URI also leaves the `recorded` phase
  (pinned by the identity-change and lifecycle tests), so the guard can never
  fire. It is kept as fail-closed defense and now excluded from coverage with
  an `istanbul ignore` pragma plus an explanatory comment; the missing-FILE
  case is covered separately by the definite-400 check in `apiUploadAudio`.

All gates re-run after these changes: server format/lint/typecheck/build +
591 tests, app format/lint/typecheck + 753 tests under the raised floors,
doctor, audit:ci, and the smoke journey — all green.
