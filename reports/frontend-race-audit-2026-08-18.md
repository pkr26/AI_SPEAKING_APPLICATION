# Frontend Race-Condition Audit — 18 August 2026

## Outcome

The complete Expo frontend concurrency surface was reviewed: all routes,
providers, shared libraries, TanStack Query usage, SecureStore state, recorder
lifecycle/recovery, navigation, timers, listeners, retries, and async form
handlers under `app/src/`. Confirmed races were fixed and covered with
adversarial interleaving tests. No unbounded React effect loop, query retry
loop, timer loop, or recorder recovery loop remains in the reviewed code.

## Confirmed findings fixed

### Session, storage, and data boundaries

- Made pending-assessment creation one atomic create-if-empty transaction.
  Unconditional account cleanup now advances a synchronous generation fence,
  so a delayed old-session read/write cannot recreate handoff metadata after
  logout. Concurrent Recorder instances now agree on one authoritative request.
- Pinned every page of a data export to the initiating bearer token, rejected a
  cross-user page defensively, aborted export work at identity/unmount
  boundaries, and rechecked an Auth session lease before writing or sharing PII.
- Routed request-time token snapshots through the same queue as token saves and
  clears. A later request can no longer overtake a password rotation or logout
  and use the token being replaced.
- Added Auth session leases backed by synchronous token/user/epoch refs. Async
  profile, language, retake, reminder, and export continuations now fail closed
  before React commits a logout, password rotation, deletion, reset, or expiry.
- Serialized session-expiry notice mark/consume operations and per-user practice
  intro read/write operations, eliminating missed first displays and stale
  future displays.
- Serialized reminder reads and added one atomic language-refresh transaction.
  Logout, a concurrent disable/hour change, and reminder hydration can no longer
  be split between a stale read and a later re-enable.

### Recorder and audio lifecycle

- Added one-shot deferred recovery when foreground/focus arrives while an
  invalidated recovery is still unwinding non-abortable SecureStore work. The
  final operation token automatically retriggers recovery without self-looping.
- Tagged native completion events by take and added a bounded, per-instance
  quarantine for late terminal events. A late event from take A cannot be
  consumed by take B; missing-URL current events remain valid.
- Made the cache janitor process-once, registered prepared/live URIs
  synchronously, and evicted deleted URIs from the live set so another Recorder
  cannot delete a newly prepared take.
- Serialized preview rewind/replay. A Play tap at end-of-file now waits for the
  rewind, duplicate taps coalesce, and seek failure releases the player and
  reports one safe error.
- Moved the deferred permission start callback ref to the committed layout
  phase so an interrupted render cannot expose an uncommitted route closure.
- Added an external, ref-safe start guard. Practice Skip and Record can no
  longer start together before React paints their disabled states.
- Restricted upload continuation to a matching, fresh `prepared`,
  non-cancelled authoritative handoff with no recovery attempt already spent.
  Reconcile/cancelled/ambiguous records return to recovery instead of being
  changed back into a new upload.

### Navigation, queries, and screen state

- Hardware back handlers now read synchronous recorder refs. Native GO_BACK
  removal listeners and immediate navigation-option updates close the same-frame
  header/swipe window on practice, attempt, settings, password change, and
  account deletion screens.
- Added synchronous navigation latches or deduping `navigate` calls for
  singleton routes. Rapid taps no longer stack duplicate Practice, Help,
  Attempt, Settings, credential, or legal screens.
- Locked destructive confirmation dialogs themselves, not just the subsequent
  request. A queued second confirmation or a stale confirmation after unmount
  cannot restart placement or delete an account.
- Made diagnostic result acknowledgement a synchronous one-shot tied to the
  exact result object. Old Next/See Level handlers can no longer erase a newer
  completion, restore an obsolete question, or increment progress twice.
- Preserved a newer name draft when an older profile PATCH resolves, while
  merging independent name/language responses into the latest committed user.
- Pinned the forgot-password continuation to the email that actually received
  the code instead of whatever text is in the field when the response returns.
- Bounded history paging against repeated/cyclic cursors and 500 pages, and
  added a synchronous next-page latch. A malformed cursor cannot drive
  `onEndReached` forever.
- Manual query retries now use `cancelRefetch: false`, so repeated taps join the
  live GET instead of continually cancelling/restarting it and preventing
  completion.
- Installed the TanStack focus listener before sampling `AppState.currentState`,
  closing the read-before-subscribe gap during app backgrounding.
- Made caller cancellation win over a later deadline in both fetch and native
  S3 upload transports. A near-timeout Cancel is no longer reclassified as a
  timeout/recovery ambiguity.

## Reviewed without a defect

- Auth restore, conditional stale-token cleanup, transition exclusion, query
  cache clearing, and pending-cleanup fencing.
- The Auth cleanup `for (;;)` loop: it waits for a changing promise tail and
  either returns or rejects; it is not a tight or unbounded retry loop.
- Recorder capacity retry, recovery polling, cancellation persistence, audio
  session ownership, AppState/focus cleanup, timers, animations, listeners, and
  upload retry budgets. Every loop has an attempt, lease, page, or time bound.
- TanStack query keys and invalidation effects, route redirects/protected
  guards, PracticeFlow state, i18n/theme providers, and hardware-back listener
  teardown. No render/effect invalidation cycle was found.
- Pending-assessment stage/cancel/recovery-counter updates after the new atomic
  creation boundary; each remains serialized and request-ID conditional.

## Verification evidence

| Check | Result |
| --- | --- |
| App format, lint, strict TypeScript | Pass |
| Full app Jest suite | 25 suites, 2,578 tests pass |
| App coverage | 98.64% statements, 97.19% branches, 98.23% functions, 99.47% lines |
| Expo Doctor | 20/20 checks pass |
| Production Expo export | iOS and Android pass with an explicit HTTPS API URL |
| App dependency policy | `audit:ci` passes the reviewed baseline |
| Raw app audit | 15 high, 9 moderate, 0 critical (reviewed Expo/Metro baseline) |
| Mutation tooling/manifest | 50 tooling tests pass; 18 lanes cover all 35 source and 25 test files |
| Mutation campaign evidence | Recorder remediation pass 1: 3,006 mutants, 2,471 killed, 332 timed out, 190 survived, 13 no coverage, 0 errors; every open result was exported to exact JSON/TSV inventories and audited before the next remediation pass |
| Server regression suite | 53 files, 1,018 tests pass; 98.07% statements / 97.69% branches |
| Server format, lint, typecheck, build, audit | Pass; 0 vulnerabilities |
| Mock/direct-upload API smoke | 184 assertions pass |

The app campaign is still in its dedicated mutation-remediation phase. Recorder
reports are run through a one-shot external wrapper that validates and atomically
preserves JSON, HTML, provenance, exit status, and SHA-256 hashes before any
canonical publication. The first preserved remediation pass produced the totals
above; its 332 timeouts, 190 survivors, and 13 no-coverage entries were exported
and individually classified. Production loops/resources were bounded, deferred
tests were made deterministic, and mutation-only Jest now bails after the first
decisive failure so a killed static mutant cannot poison hundreds of later tests
and be mislabeled as a timeout. A fresh preserved Recorder rerun is active at
the time of this report update; the complete multi-lane app campaign and server
campaign remain required before the mutation goal is closed.

## Residual external risk

No known source-level frontend race remains from the reviewed and remediated
interleavings, but the mutation campaign is intentionally still challenging
that conclusion. Correctness also depends on OS/native modules eventually
settling SecureStore, notification, audio, and share-sheet calls; the UI now
serializes, aborts, fences, or fails closed around those boundaries. The raw
dependency findings remain the reviewed Expo/Metro upstream baseline and should
be retired through a compatible Expo SDK upgrade rather than forced incompatible
package downgrades.
