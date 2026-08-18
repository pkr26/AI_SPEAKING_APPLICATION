# Follow-up Codebase Audit — 17 August 2026

## Scope and method

Reviewed the complete tracked monorepo across independent server-core,
server-perimeter/adversarial, and Expo-client lenses. The review covered
runtime source, database migrations/seed tooling, upload and AI boundaries,
tests, mutation tooling, CI, package metadata, deployment documentation, and
the recent remediation diff. Findings were revalidated against the current
tree before changing code.

## Confirmed findings fixed

### Server security, availability, and integrity

- Reordered parent/child locks and added authoritative user-state checks across
  assessment claims, capacity reservations, diagnostic claims, and practice
  persistence. Concurrent account deletion now produces `409 STATE_CHANGED`
  instead of foreign-key errors or deadlocks.
- Rechecked diagnostic/practice eligibility under lock immediately before paid
  work. A concurrent diagnostic restart or level change cannot spend provider
  capacity on a stale question.
- Serialized skip persistence with scored-result persistence, so a scored word
  cannot remain incorrectly parked after a cross-device race.
- Fixed reset-password lock ordering (`users` before reset tokens).
- Required unambiguous Bearer headers, positive integer token versions, and an
  expiry claim on JWTs.
- Rejected compressed JSON requests before inflation; validated configured CORS
  origins at boot; bounded inbound request IDs and metrics method labels; and
  stopped invalid email text from minting durable account-limit keys.
- Hardened S3/audio processing: stricter MP3 signatures, safe stream-error
  handling, correct `EFBIG` classification, and retry-safe S3 cleanup. Objects
  are retained for 409/429/5xx results so a same-key retry cannot lose audio to
  a late `DeleteObject`.
- Made the mailer’s best-effort/no-throw contract hold even if logging fails;
  made health/readiness responses non-cacheable.
- Made catalog SQL escaping independent of PostgreSQL
  `standard_conforming_strings`, fixed HTTPS use in the load generator, and
  made server mutation-report merging reject stale embedded source/test bodies.

### Mobile correctness, privacy, and testability

- Added synchronous submission/action latches across auth, reset, practice,
  diagnostic, settings, and Recorder flows to close same-frame double-tap and
  navigation races.
- Bound response-body and local web-Blob reads with the existing end-to-end
  request deadline, propagated cancellation, and fail-closed bearer-bearing
  redirects. Direct-upload recovery is now marked only when the API request
  actually begins.
- Serialized daily-reminder enable/disable work so logout cannot be followed by
  an older scheduling operation restoring a prior account’s notification.
- Cleared pending assessment/reminder data through the explicit unreadable
  session reset path.
- Prevented out-of-order profile PATCH responses or delayed callbacks after
  logout from overwriting current session state; merged independent name and
  language updates safely.
- Reconciled Home with a cross-device diagnostic restart without briefly
  exposing a tappable Practice action. Moved stats-cache retirement to
  diagnostic completion to avoid deleting an active observer during that
  transition; this also removed a Jest open-handle/`act()` warning.
- Hardened mutation lane/provenance validation against inherited property names
  and changes to report/equivalence policy inputs.

## Verification evidence

| Check                                        | Result                                                           |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Server format, lint, strict typecheck, build | Pass                                                             |
| Server unit/integration suite                | 53 files, 1,017 tests pass; 98.07% statements / 97.69% branches  |
| Server mutation-tooling + lane manifest      | 17 tooling tests pass; manifest exhaustive                       |
| Server `npm audit --audit-level=high`        | 0 vulnerabilities                                                |
| App format, lint, strict typecheck, Doctor   | Pass; Expo Doctor 20/20                                          |
| App unit suite                               | 25 suites, 1,873 tests pass; 98.79% statements / 97.75% branches |
| App mutation-tooling + lane manifest         | 50 tooling tests pass; manifest complete                         |
| Production exports                           | iOS and Android Expo exports pass with explicit HTTPS API URL    |
| API smoke                                    | 122 assertions pass on an isolated audit database                |
| Concurrent API smoke                         | 721 assertions across ten-user barrier phases pass               |

The isolated smoke database was dropped after verification.

## Remaining owner/external risks

- `npm audit --omit=dev` for the Expo SDK 57 graph still reports its reviewed
  upstream baseline (15 high, 9 moderate). The app’s gate rejects any new
  advisory or increase; current compatible SDK packages do not provide a safe
  package-only remediation. Upgrade with an Expo SDK release that resolves the
  Metro/config-plugin chain.
- Production still requires an S3 abandoned-upload lifecycle rule, managed
  backups/restores, an edge/WAF limit, private metrics ingress, and secret
  management. These are deployment controls, not source changes.
- Transcript retention remains a product/legal policy decision; the schema has
  no automatic transcript expiry. Define the retention window before public
  launch.
- Full Stryker campaigns and a Docker image build/scan were not rerun locally:
  the former is intentionally long-running and the Docker CLI is unavailable
  in this environment. Mutation tooling and manifests were exercised; CI owns
  the scheduled full campaigns and container healthcheck.
