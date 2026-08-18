# Adversarial Audit — Config, Logging & Lifecycle

Lane: `server/src/config.ts`, `logger.ts`, `index.ts`, `schema-readiness.ts`,
`middleware.ts` (errorHandler), `db/run.ts`, `db/*.sql` (+ the destructiveness
guard in `db/database-safety.ts` for contrast).

Method: hostile-env config boots (34-case matrix via direct config import with
`cwd=/tmp` so `server/.env` could not backfill), a live probe server on
`:4120` (`NODE_ENV=test LOG_LEVEL=info MOCK_AI=true`, own throwaway DBs
`ai_english_cl_*_probe`), raw-socket header probes, a live PostgreSQL brownout
(BEFORE UPDATE/DELETE triggers raising exceptions), SIGTERM/SIGINT lifecycle
tests, and migration-checksum tampering in a `/tmp` checkout. All probe
processes were terminated and all probe databases were dropped afterwards.

Verdict up front: no critical/high issues in this lane. Two low hardening
gaps and two informational notes below; every other attack was resisted
(evidence in "Held up").

---

## Finding 1 — LOW: `db:setup` / `db:migrate` / `db:seed` have no production-target guard

- **Where:** `server/db/run.ts:262-292` (`runDatabaseCommand` →
  `migrate`/`seed`/`setupDatabase`), entrypoint `db/run.ts:286-292`.
- **Observed (live reproduction):**

  ```
  $ cd server && DATABASE_URL=postgres://localhost:5432/ai_english_cl_prodlike_probe tsx db/run.ts setup
  created database "ai_english_cl_prodlike_probe"
  applied migration 001_init.sql ... 007_distributed_rate_limits.sql
  questions per level: [{"cefr_level":"A1","n":6},...]
  exit=0
  ```

  A database named `ai_english_cl_prodlike_probe` — no `_test` suffix, i.e.
  production-looking — was created, migrated, and seeded without any refusal,
  warning, or confirmation prompt. `run.ts` loads `server/.env` via
  `dotenv.config()` (`db/run.ts:287`), so an operator who runs
  `npm run db:setup` from a shell whose `server/.env` points at a production
  cluster hits production with no safeguard.
- **Expected:** AGENTS.md states "deploys must not run `db:setup`". That rule
  is enforced by documentation only. The repo *has* a rigorous
  destructiveness guard — `db/database-safety.ts:124-165`
  (`assertSafeDestructiveDatabase`: loopback-only, mandatory `_test` suffix,
  explicit port, must-not-equal-`DATABASE_URL`, query-parameter rejection) —
  but it is wired exclusively into the test/mutation tooling
  (`db/mutation-db-guard.ts`, vitest global setup). Nothing analogous
  protects the one command a tired operator is most likely to mistype.
- **Impact:** bounded but real operational risk. None of the three commands
  drop user data: `migrate` only applies pending schema;
  `ensureDatabase` (`db/run.ts:70-92`) only creates a missing database;
  `seed` upserts the 36 catalog questions (`db/seed.sql`:
  `ON CONFLICT (cefr_level, prompt_word) DO UPDATE SET question_text,
  translations`). The realistic harm is (a) silently overwriting curated
  production question content with the repo seed, and (b) applying migrations
  ad hoc, outside the reviewed deploy job (`npm run db:migrate:prod`),
  potentially ahead of the code release that expects them. No attacker
  reachability — this requires operator shell/env access, hence LOW.
- **Suggested fix:** refuse `setup`/`seed` when `NODE_ENV=production` or when
  the database name lacks a test/dev marker unless an explicit
  `I_KNOW_WHAT_IM_DOING`-style flag is passed; at minimum print the target
  host/database and require interactive confirmation for `setup`.

## Finding 2 — LOW: production boot accepts a low-entropy `JWT_SECRET`

- **Where:** `server/src/config.ts:52-54` (min-32 length only) and
  `config.ts:165-171` (production placeholder blocklist
  `/(example|replace|change|test[-_ ]?secret)/i`).
- **Observed (config-import probe, `cwd=/tmp`):**

  ```
  NODE_ENV=production MOCK_AI=false OPENAI_API_KEY=sk-x S3_BUCKET=b \
  JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  DATABASE_URL=postgres://db.example.com:5432/app?sslmode=verify-full  → CONFIG_OK (exit 0)
  ```

  The production superRefine passes with a 32-character all-`a` secret.
  Equally accepted: `0123456789abcdef0123456789abcdef`,
  `password1234password1234password12`. Only secrets literally containing
  "example", "replace", "change", or "test secret"-style words are blocked.
- **Expected:** the code clearly *intends* to keep weak secrets out of
  production (that is the entire purpose of the placeholder check), but the
  blocklist is trivially bypassed and adds no entropy floor.
- **Impact:** an operator who sets a guessable/dictionary 32-character secret
  gets a green boot in production; anyone who learns or guesses it forges
  every user's JWT (`sub`+`tv` are the only claims — full account takeover).
  This is an operator-mistake hardening gap, not a remote exploit, hence LOW.
- **Suggested fix:** in production, reject secrets on a common-password/
  sequential-char list, or require a minimum character-class diversity /
  estimated entropy (e.g. `zxcvbn`-style score), or simply document "generate
  with `openssl rand -base64 48`" and reject anything without mixed classes.

## Finding 3 — INFO: `PORT` (and other numeric knobs) accept hex / scientific notation

- **Where:** `server/src/config.ts:55` (`z.coerce.number().int().min(1).max(65535)`).
- **Observed:** `PORT=0x10` → accepted (port 16); `PORT=1e4` → accepted
  (port 10000). `z.coerce.number()` runs `Number(value)`, which parses
  hex/scientific forms. `PORT=0`, `99999`, `abc`, `4000.5` are all correctly
  rejected.
- **Impact:** none security-wise — the operator gets exactly the port the
  expression evaluates to, and bounds are still enforced. Surprise-only.
  Same quirk applies to every other `z.coerce.number()` knob
  (`DB_POOL_MAX=0x10`, etc.). Recorded for completeness.

## Finding 4 — INFO: `CORS_ORIGINS='*'` is silently inert (fails closed)

- **Where:** `server/src/app.ts:38-47` — origins are matched by exact set
  membership; `'*'` is never special-cased.
- **Observed (live, probe booted with `CORS_ORIGINS='*'`):**

  ```
  curl -H 'Origin: https://evil.com' http://localhost:4120/health
    → HTTP/1.1 200 OK, no Access-Control-Allow-Origin header
  curl -H 'Origin: *' http://localhost:4120/health
    → Access-Control-Allow-Origin: *        (only a literal '*' matches)
  curl -X OPTIONS -H 'Origin: https://evil.com' -H 'Access-Control-Request-Method: POST' .../auth/login
    → 200, no ACAO (preflight denied)
  ```

- **Impact:** the safe direction — a wildcard-looking config does NOT become
  wildcard CORS. Browsers never send `Origin: *`, and `credentials: false`
  means even the literal-match response cannot carry credentialed content.
  The only risk is operator confusion (believes CORS is open when it is
  closed). Suggest either rejecting `'*'` at config validation or documenting
  the exact-match semantics in `.env.example`.

---

## Held up (attacks this lane RESISTED, with evidence)

### Config validation (`config.ts`) — 34-case hostile-env matrix, all correct

Each case booted the real config module via tsx with `env -i`-scrubbed
environment (plus explicit `DATABASE_URL`/`JWT_SECRET`/`MOCK_AI`) from
`cwd=/tmp` so `server/.env` could not backfill. Rejected with exit 1, as
expected:

- `JWT_SECRET` 31 chars → `must be at least 32 characters` (32 chars → OK).
- `NODE_ENV=production` + `MOCK_AI=true` → both `MOCK_AI: must be false in
  production` and `DATABASE_URL: must set sslmode=verify-full` fire.
- Production without `sslmode=verify-full` (absent **and** `sslmode=disable`)
  → refused. Production + placeholder secret (`ChangeMe-…`) → refused.
  Production without `S3_BUCKET` → refused.
- `MOCK_AI=false` + empty `OPENAI_API_KEY` → refused.
- `TRUST_PROXY=true`, `TRUE`, `01`, `11` → all refused (`' 2 '` → accepted as
  exactly 2 hops; `0`/`false` → `false`).
- `PORT=0`, `99999`, `abc` (NaN), `4000.5` → refused. `DB_POOL_MAX=0`, `-1`,
  `101` → refused. `DB_STATEMENT_TIMEOUT_MS=999` → refused.
  `OPENAI_TIMEOUT_MS=70001` → refused. `LOG_LEVEL=verbose` → refused.
  `MOCK_AI=TRUE` (case-sensitive bool enum) → refused.
- `DATABASE_URL` as `mysql://…`, hostless `postgres:///x`, and db-less
  `postgres://localhost` → all refused.
- S3 credential asymmetry (`S3_ACCESS_KEY_ID` without secret, creds without
  bucket) → refused. `ASSESS_IP_DAILY_CAP < ASSESS_DAILY_CAP` → refused.
- **No secret echo in failure output:** validation errors print only field
  paths and static messages (verified across the matrix); the only echoed
  values are non-secret enum/number inputs (e.g. `LOG_LEVEL`).

### Logging, injection & redaction (`logger.ts`, `middleware.ts`)

- Probe server (`NODE_ENV=test LOG_LEVEL=info`, JSON logs to file) attacked
  with: register body containing an email with an embedded newline +
  forged-log-line payload, canary password `CanaryPassw0rd!123`, canary
  `Authorization: Bearer CANARY_TOKEN_12345`, canary `x-api-key`, URL path
  with encoded `%0d%0a`, oversized (200-char) and tab-containing
  `x-request-id` values. Result: **every one of 19 log lines parsed as valid
  single-line JSON** (programmatic check, 0 unparseable); none of the four
  canary strings nor the forged-line payload appears anywhere in the log.
- Newline email never reaches any log: zod rejects it (`email: a valid email
  is required` — no input echoed in the 400 response either), and pino-http's
  custom `req` serializer (`logger.ts:50-55`) emits only
  `id/method/url/remoteAddress`; headers and bodies are never serialized.
- Raw-socket `x-request-id: probe\ninjected` → Node's HTTP parser rejects
  with `400 Bad Request` at the socket level; Express never sees it. The
  128-char cap in `genReqId` (`logger.ts:40-45`) works (200-char id replaced
  by a UUID); a normal id round-trips into the response header safely.
- Body-parser errors return static messages — malformed JSON →
  `{"error":"Request body is not valid JSON"}`; 1.1 MB body →
  `{"error":"Request body is too large"}` — no parser internals reflected
  (`middleware.ts:132-146`). 500s return a static
  `{"error":"Internal server error"}` while the full `err` is logged
  server-side (JSON-escaped).
- Base-logger redact paths (`logger.ts:9-26`) cover password/token/authorization
  shapes; in addition, no route logs user objects or bodies at all (grep of
  every `logger.*` call site: only ids, keys, counts, and `err` objects).
- Note (not a defect): `NODE_ENV=development` uses pino-pretty, whose output
  is intentionally multi-line (stack traces); the one-line-per-record
  guarantee is a production/JSON-mode property. Dev transport is the right
  place for that trade-off.

### Async error coverage & unhandled rejections

- Route inventory (grep + read): every async route handler is wrapped in
  `h()` (`auth.ts` ×6, `diagnostic.ts` ×2, `practice.ts` ×3,
  `audio-upload.ts`, `app.ts:89`). The only two unwrapped async entry points
  — `/ready` (`app.ts:53`) and `requireAuth` (`middleware.ts:49`) — each have
  their own try/catch around every await. No naked async handler exists.
- **Live DB brownout test** (probe server + `BEFORE UPDATE`/`BEFORE DELETE`
  triggers raising `P0001` on `rate_limit_windows`):
  - `increment` failures propagate through express-rate-limit's awaited call
    → error handler → 500, process stays up (verified: `health=200` after
    three 500'd requests; logs JSON-parseable).
  - `decrement`/`resetKey` (the fire-and-forget paths express-rate-limit
    never awaits): called directly against the booby-trapped table — both
    promises **resolve**, warn-logged (`rate-limit refund failed` /
    `rate-limit key reset failed`), `unhandledRejection` count = 0, exit 0
    (`postgres-rate-limit-store.ts:64-86` try/catch confirmed load-bearing).
  - The audit's "fail-safe store" claim holds; I could not disprove it.

### Startup / shutdown lifecycle (`index.ts`, `schema-readiness.ts`)

- SIGTERM after listen → `shutting down` → `shutdown complete`, port closed,
  process gone within ~3 s (in-flight-free case).
- SIGTERM *before* listen (boot against blackhole `10.255.255.1:5432`, signal
  sent at t≈2 s mid-dependency-check) → clean `shutting down` →
  `shutdown complete`, **exit 0** in ~6 s (waits for the pending connect to
  time out, no force-kill, no hang, no stack dump). The claimed fix is real.
- Boot against a DB whose `schema_migrations` checksum was tampered
  (`UPDATE ... SET checksum=repeat('0',64)`) → fatal `required service
  dependency is unavailable; refusing to start`, **exit 1**, never listens.
- Boot against an unseeded/short question inventory → same fatal refusal;
  post-boot drift: `DELETE FROM questions` on a running probe → `/ready`
  flips to 503 `{"ok":false,"error":"required service dependency
  unavailable"}` (generic, no internals) while `/health` stays 200; reseed →
  `/ready` 200. Liveness/readiness separation is correct.
- Second instance on an occupied port → immediate exit 1 with a clear
  `EADDRINUSE` dump. Acceptable fail-fast (supervisor-visible).
- `server.requestTimeout` (S3 op timeout + OpenAI timeout + 40 s) can never
  go below the fixed 30 s `headersTimeout` given the config floors
  (1 s + 1 s + 40 s = 42 s) — the Node constraint holds for every valid
  config.
- Migration checksum enforcement end-to-end: in a `/tmp` checkout, appending
  a one-line comment to applied `001_init.sql` makes `tsx db/run.ts migrate`
  fail loudly — `Error: applied migration 001_init.sql has changed (checksum
  mismatch)`, process **exit 1** — before any pending work runs.
- `db/run.ts` hygiene: database identifier is double-quote-escaped in
  `CREATE DATABASE` (`run.ts:81`); `parseDbName` rejects non-postgres
  protocols, missing/extra path segments, and bad percent-encoding;
  migrations run under an advisory lock with per-file transactions and
  error-preserving cleanup. All seven `db/migrations/*.sql` files reviewed:
  no grants, no `SECURITY DEFINER`, no superuser assumptions; constraints
  match `db/preflight.ts`.
- Minor robustness note (not reported as a finding):
  `assertDatabaseSchemaCurrent` compares manifest order between JS `sort()`
  (code-unit order) and SQL `ORDER BY name` (database collation). With the
  current `00N_*.sql` numbering these always agree; a divergence would fail
  closed (boot refusal), never open.

## Cleanup performed

Probe servers on 4120/4121/4122 terminated (verified gone);
`ai_english_cl_prodlike_probe`, `ai_english_cl_checksum_probe`, and
`ai_english_cl_lifecycle_probe` dropped; `/tmp/probe-checkout`, scratch
scripts, and logs left in `/tmp` only. The shared dev server on `:4000` and
other agents' probe processes/databases were not touched.
