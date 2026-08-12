# Security and Release Audit — 12 August 2026

## Decision

The audited working tree is materially stronger than the repository baseline,
and every local automated gate listed below passes. It is **not approved for a
public production or app-store release yet**. The remaining blockers require
owner choices, production infrastructure, legal and educational review, GitHub
configuration, or real-device/release-artifact validation; they cannot be
truthfully completed in source code alone.

Security is not a one-time property and no line-by-line review can prove the
absence of defects. This report is a point-in-time record of the code inspected,
changes made, evidence collected, and risks still open.

## Audit boundary

- Repository baseline: commit
  `6c56e82ad62426ba77c673f85488d59db942fad7` on local and `origin/main`.
- Hardened state: the **uncommitted working tree on top of that commit**. The
  corrections described here are not part of the baseline commit and are not
  active remotely until they are reviewed, committed, and pushed.
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
- Added regression coverage for the S3 cleanup lifecycle, the distributed
  rate-limit store, cross-replica behavior, and transactional practice
  boundaries.

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
- Expanded API, parser, auth-race, recorder, navigation-gate, recovery, and
  screen tests around these paths.

### Repository, CI, and test hygiene

- Reordered server CI to fail on formatting/lint/type/build before database
  mutation, kept SHA-pinned actions, restricted push runs to `main`, and added
  manual dispatch.
- Added app-wide coverage collection and enforced global floors, plus
  production-mode iOS and Android Expo exports in CI.
- Added a weekly/manual dependency-audit workflow: zero-tolerance high-severity
  production audit for the server and the explicit reviewed-advisory gate for
  the Expo tree.
- Hardened Git/Docker ignores for environment variants, package-manager config,
  signing keys, certificates, mutation scratch, and reports. The committed
  `.env.example` exception remains available.
- Fixed the assessment-test audio fixture to use mode 0600 and remove itself,
  tightened a previously vacuous smoke assertion, and raised both mutation
  configurations' break threshold from 0 to 60.
- Updated the architecture, S3 POST contract, deployment requirements,
  security-reporting status, and verification commands in repository docs.

## Exact local verification evidence

### Server

- `npm run format:check`, `npm run lint`, `npm run typecheck`, and
  `npm run build`: passed.
- `npm audit --omit=dev --audit-level=high`: passed with 0 vulnerabilities.
- `npm test`: 23/23 files and 239/239 tests passed. The suite includes
  dedicated FFmpeg process-cap/readiness-coalescing regressions in addition to
  the decoded-media integration tests.
- Coverage: 86.42% statements, 81.23% branches, 83.48% functions, and 88.25%
  lines. The `server/src` subset measured 91.02%, 84.60%, 85.93%, and 93.09%
  respectively.
- Fresh compiled-server smoke run: created an isolated database, applied
  migrations 001–007, verified six questions at each CEFR level, exercised the
  complete auth/diagnostic/help/practice/retry/final-feedback/export/password/
  revocation/deletion journey, and exited 0. The final randomized run emitted
  88 successful assertions across 16 practice-loop attempts and verified that
  the next logical question reset to attempt 1. The server was stopped and the
  isolated database was dropped.

### Mobile

- `npm run lint` and `npm run typecheck`: passed.
- `npm test`: 14/14 suites and 417/417 tests passed.
- Coverage: 90.54% statements, 85.32% branches, 95.52% functions, and 94.02%
  lines, above the new global floors of 80%, 75%, 85%, and 85%.
- `npm run doctor`: 20/20 Expo checks passed.
- `npm run audit:ci`: passed the reviewed upstream baseline gate. This is not a
  clean audit: `npm audit --omit=dev` still reports 22 affected dependency
  nodes—15 high, 7 moderate, and 0 critical—under advisory IDs 1119441,
  1138808, and 1138809.
- Production-mode `expo export` completed for both iOS and Android with an
  explicit HTTPS API URL.

### Repository and operational evidence

- `git diff --check` passed, touched server files pass Prettier, and both GitHub
  workflow files parse as YAML.
- A high-confidence tracked-file pattern scan found no private-key block, AWS
  access-key ID, GitHub token, or long OpenAI-style token. The local
  `server/.env` is ignored and mode 0600. This is narrower than GitHub secret
  scanning or a dedicated history scanner and is not a substitute for either.
- Mutation reports exist but predate the current source changes. Mutation
  packages are intentionally installed with `--no-save`, so clean `npm ci`
  environments cannot reproduce those reports yet; current unit/integration
  results must not be presented as a fresh mutation run.
- The Docker CLI was unavailable, so `server/Dockerfile` was not built,
  health-tested as a container, SBOM-generated, or image-scanned.

## Release blockers and required follow-up

### P0 — before any public data collection

1. **Land and independently review this working tree.** Commit the migration,
   source, lockfile, tests, workflows, and docs together; run the new workflows
   on the resulting commit. The remote `main` CI run for baseline commit
   `6c56e82` is currently failed. Local success does not make that remote check
   green.
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
