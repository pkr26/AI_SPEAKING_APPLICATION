# Security and Release Audit — 12 August 2026

## Outcome

The application was reviewed across the Expo mobile client, Express API,
PostgreSQL schema/content, authentication, audio handling, AI integration,
privacy boundaries, dependency tree, CI, container, and operational docs.
Confirmed defects were fixed and regression-tested. The codebase is materially
safer, but it is **not yet approved for a public app-store launch** because the
owner-controlled release items below are still unresolved.

No review can prove that software is perfectly secure. This report records the
checks performed, the remaining risk, and the evidence available today.

## Release blockers requiring owner decisions or external systems

1. **Establish the root repository.** The workspace root is not a Git worktree;
   only `app/.git` exists, has no remote, and most of the current app is
   untracked. Consequently `server/`, `.github/`, this report, and root docs
   cannot be committed or protected together. Preserve the existing app history
   while creating one root monorepo, then configure a remote, protected main
   branch, required CI, reviews, and secret scanning.
2. **Choose the production identity.** `app/app.json` still uses generic
   `name`, `slug`, and URL `scheme` values and has no iOS bundle identifier,
   Android package, build numbers, EAS project, signing, or store metadata.
   These values depend on the final brand and organization account.
3. **Publish legal/privacy material before collecting real recordings.** Add a
   consumer privacy policy, terms, explicit microphone/AI-processing consent,
   transcript deletion/retention rules, subprocessors, support/security contact,
   and an age policy. If minors can use the service, complete a child-safety and
   regulatory review before launch.
4. **Professionally validate the learning product.** The 36-question catalogue
   is structurally complete for Telugu, Hindi, Spanish, and Simplified Chinese,
   but every translation and the C1/C2 placement design need review by native
   linguists and a CEFR assessment specialist. Run fairness/accuracy evals with
   accents, dialects, speech impairments, noise, silence, and prompt injection.
5. **Complete production operations.** Provision HTTPS, managed PostgreSQL,
   secrets, backups with a tested restore, shared rate limiting for multiple API
   replicas, monitoring/error tracking/alerts, incident response, and rollback.
   Drain any migration-005-era API replicas before applying migration 006; a
   first deployment applying both migrations together is safe.
6. **Resolve or formally accept the mobile dependency baseline.** The current
   SDK-compatible Expo/Metro tree reports 21 transitive findings (14 high,
   7 moderate, 0 critical). The checked baseline prevents silent growth, but
   compatible upstream fixes and release-artifact analysis are still required.
7. **Run release-only validation.** Docker was unavailable, so the image and
   healthcheck were not built locally. No iOS/Android simulator or physical mic
   device was available. Build signed candidates, scan the container and native
   artifacts, and execute real-device accessibility, interruption, offline,
   background, permission-denial, and store-review tests.

## High-impact corrections completed

- Replaced destructive database setup/seed behavior with checksummed,
  advisory-locked migrations and stable-key, non-destructive content upserts.
- Added destructive test-database guards, schema integrity constraints,
  migration preflight, bounded database timeouts, and a safe production
  migrate-only path.
- Hardened registration/login/password/account deletion, Unicode password
  policy, bcrypt byte limits and timing behavior, JWT algorithm/issuer/audience,
  server-side revocation, protected routes, no-store responses, and per-session
  mobile cache isolation.
- Closed diagnostic question reroll/answer-key and cross-level practice bypasses.
- Added private audio files, strict multipart limits, extension/MIME plus magic
  validation, complete failure cleanup, and periodic orphan cleanup. Historical
  fake test uploads were removed.
- Added atomic user/global AI budget reservations, bounded concurrency and
  deadlines, no automatic paid-call retries, strict structured grading output,
  prompt-injection isolation, honest transcript-only rubric language, and
  provider/model version pinning.
- Moved provider I/O outside database transactions and added token-owned
  diagnostic/practice claims.
- Added durable, owner-scoped idempotency and response recovery for interrupted
  assessment uploads, including stale-worker ownership tokens, status-specific
  expiry, startup/hourly privacy cleanup, and device-only secure retry metadata.
- Hardened the recorder for permission, blur, background, unmount, timeout,
  native media reset, duplicate submission, local audio deletion, reduced
  motion, and accessibility behavior.
- Added strict mobile response parsing, private in-memory feedback flow, HTTPS
  enforcement for production, safe Android emulator fallback, request timeouts,
  and SDK-compatible UUID generation.
- Expanded SHA-pinned CI, dependency baseline checks, coverage thresholds,
  compiled builds, API smoke tests, Dependabot, Docker ownership, non-root
  runtime, and migration assets.
- Corrected multiple English and translated curriculum defects and verified all
  required translation/example shapes.

## Verification evidence

- Server: ESLint, Prettier, strict TypeScript, production build, and production
  dependency audit passed (0 vulnerabilities).
- Server tests: 6 files / 62 tests passed with enforced coverage floors; overall
  coverage was 76.48% statements, 63.82% branches, 77.31% functions, and 77.61%
  lines.
- Compiled-server end-to-end smoke: 126 assertions passed through registration,
  diagnostic, translated help, practice retries/final feedback, export,
  password rotation, logout revocation, and account deletion.
- Mobile: ESLint, strict TypeScript, 4 suites / 50 tests, Expo Doctor 20/20,
  Expo dependency compatibility, and the reviewed audit-baseline gate passed.
- Production-mode Expo exports completed for both iOS and Android with an HTTPS
  API URL.
- Content: 36 questions, 6 per CEFR level, with complete `te`, `hi`, `es`, and
  `zh` records and three bilingual examples per language/question.
- Secret scan patterns found no committed production credential in the files
  eligible for source control. The ignored local `server/.env` is mode 0600.

## Important limitations

- AI feedback currently sees a Whisper transcript, not acoustic signals. It
  must not be marketed as validated pronunciation, accent, fluency timing, or
  prosody assessment.
- Email ownership verification, password reset, MFA/passkeys, full UI
  localization, and automated mobile component/E2E tests are not implemented.
- Assessment transcripts in `attempts` have no automatic retention limit yet;
  define the policy and implement it before public data collection.
- A security review is a point-in-time risk reduction, not a guarantee. Repeat
  threat modeling, dependency review, penetration testing, and privacy review
  before launch and after material architecture changes.
