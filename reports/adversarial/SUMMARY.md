# Adversarial E2E Audit — 14 August 2026 (third pass, live attack)

Method: 9 parallel adversarial lanes against a **live server** (throwaway DB
`ai_english_adversarial`, `MOCK_AI=true`, plus tight-limit probe instances),
building on the two prior audits in `AUDIT_REPORT.md`. Baseline smoke journey
passed (330 assertions) before attacking. Every finding below was
**independently re-verified by the lead auditor** against the live server or
the real ffmpeg gate — nothing here is speculative. Lane details:
`auth.md`, `rate-limit.md`, `upload.md`, `idempotency.md`, `injection.md`,
`audio-ffmpeg.md`, `s3-assess.md`, `app-client.md`, `config-lifecycle.md`.

## Findings

### MEDIUM

1. **Duration gate bypass via forged MP4 edit list (`elst`)** —
   `server/src/audio-inspection.ts:136-186`. The gate counts decoded PCM, but
   the inspection decode runs with ffmpeg's *default* edit-list handling, so an
   `elst` atom changes which samples are decoded. A 150 s M4A with a 4-byte
   `elst` patch measures 10 s and **passes the ≤120 s gate**; the intact 150 s
   payload is then streamed to the paid transcriber (verified: forged file →
   GATE PASS, honest 150 s file → 413; `-ignore_editlist 1` exposes the full
   150 s). Breaks the AGENTS.md invariant "only duration-verified audio reaches
   the paid transcriber". The existing regression test covers only
   *informational* metadata forgery (Matroska Duration) — a different class.
   **Fix:** add `-ignore_editlist 1` to the `mov` branch + an elst-forged
   regression fixture.

### LOW

2. **`contentType` allowlist bypass via prototype-chain lookup** —
   `server/src/audio-upload.ts:37-49`. `CONTENT_TYPE_TO_EXT` is a plain object;
   `{"contentType":"__proto__"}` or `"constructor"` passes validation (live:
   HTTP 200; real junk → 415). In S3 mode this issues presigned grants for
   garbage-extension keys that can never enter the assess pipeline and that the
   API's own cleanup skips — junk persists until bucket lifecycle. Bounded by
   the 40/h/user grant limiter. **Fix:** `Object.create(null)` map or
   `Object.hasOwn` check.

3. **NUL byte in register `name` → unhandled 500** — `server/src/auth.ts:60-76`
   (zod passes it, pg rejects with 22021). Live: `{"name":"Ab cd"}` →
   HTTP 500 instead of 400; transaction rolls back safely, no leak, but it's
   unauthenticated ERROR-level log noise and breaks the "malformed input → 400"
   contract. **Fix:** strip/reject control chars in the zod schema.

4. **Malformed multipart → 500 instead of 4xx** —
   `server/src/middleware.ts:126-148` only maps `MulterError`; busboy framing
   errors (`Boundary not found`, `Unexpected end of form`) are plain `Error`s →
   generic 500 + ERROR log. Live: `POST /practice/attempt` with
   `content-type: multipart/form-data` and no boundary → HTTP 500 (well-formed
   empty multipart correctly 400s). **Fix:** map busboy/plain-Error multipart
   failures to 400 in the error handler.

5. **Rejected (400) requests and idempotent replays consume the paid-assessment
   budgets** — limiters mount before validation/idempotency
   (`server/src/practice.ts:271-277`, `diagnostic.ts:288-294`), no
   `skipFailedRequests`. Live on a probe with `RATE_LIMIT_ASSESS_MAX=3`: three
   schema-invalid 400s exhausted the budget, 4th request → 429. Also verified
   cross-account: one user's 400s burn the shared per-IP daily budget →
   zero-cost NAT denial for other users behind the same IP.
   **Fix:** `skipFailedRequests`/`skip` for sub-400-terminal outcomes, or move
   the limiter after validation (keeping it before provider work).

6. **S3 deletion hook fires router-wide with no claim consult when the body has
   an `audioKey` but no `requestId`** — `practice.ts:220`/`diagnostic.ts:250`
   (`router.use`) + `audio-upload.ts:225-258`. Any request (e.g.
   `GET /practice/question`) carrying an owned `audioKey` deletes the object on
   response finish. Self-impact only (ownership regex binds keys to caller),
   narrow delete-while-needed window. **Fix:** only register cleanup on the
   assess routes, or require a requestId.

7. **Route-level `finalize` runs before the error handler sets the status, so
   the documented "409/429 → preserve" branch is dead for route-thrown
   conflicts** — `practice.ts:364`/`diagnostic.ts:359` run while
   `res.statusCode` is still 200; the status-aware preserve at
   `audio-upload.ts:234` only works via the pre-route `finish` listener.
   Contradicts the documented deletion invariant; latent delete-while-needed
   hazard (e.g. claim-conflict 409 while a same-account request shares the
   key). **Fix:** key the preserve decision off the thrown error, not
   `res.statusCode`, at the route level.

8. **`TRUST_PROXY≥1` + directly reachable server = per-IP budget bypass** —
   rotating `X-Forwarded-For` yields fresh budgets (verified: 5 registrations
   past a cap of 3). Code behaves as Express documents and `TRUST_PROXY=true`
   is unbootable, so this needs operator misconfiguration — but a deploy that
   sets `TRUST_PROXY=1` while the port is directly reachable silently disables
   all IP budgets. **Fix:** document loudly / warn at boot when
   `trustProxy > 0` outside a known proxy setup.

9. **`db:setup`/`db:migrate`/`db:seed` have no production-target guard** —
   `server/db/run.ts:262-292` ran fine against `ai_english_cl_prodlike_probe`
   despite AGENTS.md's "deploys must not run db:setup". The strict `_test`
   guard protects only test/mutation tooling. Operator-mistake hardening gap.

10. **Production boot accepts a low-entropy `JWT_SECRET`** —
    `server/src/config.ts:52-54,165-171`: 32×`a` passes; the placeholder
    blocklist is trivially bypassed. Length-32 is the only real check.

11. **Blocking `openSync` before the `isFile()` check** (latent) —
    `audio-inspection.ts:119-120`: a FIFO at the inspected path wedges the
    event loop ~forever (verified with `mkfifo`). Not attacker-reachable today
    (callers only pass server-created regular files); add `O_NONBLOCK` or
    `lstat`-first as defense.

12. **App: S3 upload-grant destination host not pinned** —
    `app/src/lib/types.ts:338-353`: HTTPS/no-creds/no-query checked, but no host
    allowlist, so a compromised server can redirect the microphone recording to
    `https://attacker.example`. Bounded (needs server compromise), but it is
    the one missing check in a control the audit credits as hostile-input
    validation.

13. **App: permanent SecureStore read failure bricks the app** —
    `app/src/lib/auth.tsx:150-177` + `_layout.tsx:38`: `restoreError` makes
    login unreachable and the gate screen offers only "Try Again" — no
    clear-entry/continue-logged-out escape (needs an OS keystore failure;
    then total until reinstall).

### Informational (no action required)

- `jwt.verify` doesn't require `exp` (server always sets 30 d; hardening only).
- Readiness limiter is per-process, not shared across replicas.
- Fixed-window ≤2× boundary burst (inherent); HMAC rate-limit keys correlatable
  across environments sharing the JWT secret; raw identifiers never stored.
- `MOCK_AI=true` skips the duration gate (dev-only; production refuses mock).
- Server grants mp3/ogg/flac but the client allowlist rejects them
  (`ContractError`) — functional lockout for those formats in S3 mode.
- Client disconnect mid-S3-download unlinks the temp file under the pipeline →
  ENOENT 500 log noise.
- `CORS_ORIGINS='*'` is silently inert (fails closed); numeric config accepts
  hex/scientific notation; failed paid calls keep the daily reservation
  (documented); orphaned recordings in OS cache after process death.

## What held up (attacked hard, resisted)

- **Auth/session:** alg=none/RS-confusion/tampered JWTs → 401; non-UUID `sub`
  → 401 not 500; logout/change-password/delete revoke tokens; login timing
  (150 samples, Welch t=0.01) — no enumeration signal; bcrypt 72-byte rejected
  both sides; 10 parallel duplicate registrations → exactly 1×201, 9×409;
  always-verify credential limiters — correct password never 429s; account
  deletion anonymizes exactly per migration 004.
- **Rate limiting:** 20∥ vs cap 3 → exactly 3 through (atomic upsert, no
  TOCTOU); cross-replica counters share via PostgreSQL; mid-run DB failure
  fails **closed** (500s, never unlimited); refunds not abusable; only HMACs in
  `rate_limit_windows`.
- **Idempotency/races:** 10∥ same-requestId → exactly 1 provider reservation, 1
  attempt row, identical replay bodies; 50∥ vs `ASSESS_DAILY_CAP=5` → exactly
  5×200 (advisory-lock serialization is airtight); cross-user requestId → no
  data flow; IDOR `GET /assessments/:requestId` → 404; stale-claim takeover
  guarded by `claim_id`.
- **Upload:** exact 25 MiB boundary; traversal/double-extension/polyglot
  filenames all harmless (server-side UUID names); symlink writes refused;
  24∥×25 MiB → zero orphans; trickle uploads killed and cleaned.
- **FFmpeg:** SSRF via MOV drefs/m3u8/ffconcat → blocked twice (drefs off +
  `fd`-only protocol whitelist); multi-track → 415 fail-closed; 30 consecutive
  failure decodes → no slot leak; decompression bomb killed at the byte cap;
  secret-free child env; `shell:false`, fixed argv, fd-only input.
- **Injection:** SQLi everywhere → parameterized; `__proto__` JSON pollution →
  inert; 490k-deep JSON bomb → 400; 50 MB gzip bomb → 413; malformed UUIDs →
  400 never 500; every forced 500 returns a static message (no stacks/pg/paths);
  CL/TE smuggling → Node 400.
- **Config/lifecycle:** 34-case hostile-env matrix refused correctly (prod
  refuses `MOCK_AI`, missing `OPENAI_API_KEY`/`S3_BUCKET`/`sslmode=verify-full`,
  `TRUST_PROXY=true`, bad ports/timeouts); tampered migration checksum → boot
  fatal; SIGTERM-before-listen exits cleanly; log injection stays single-line
  JSON; secrets never logged.

## Environment notes

Live attacks ran against a throwaway DB and probe instances only; the dev
server never crashed; no source files were modified. Test accounts remain in
`ai_english_adversarial` (drop it when done:
`dropdb ai_english_adversarial`).
