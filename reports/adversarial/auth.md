# Adversarial Audit — Auth & Session

Date: 2026-08-14. Tester: adversarial subagent (auth/session scope).
Targets: live dev server `http://localhost:4000` (MOCK_AI=true, throwaway DB `ai_english_adversarial`),
plus a self-hosted probe instance (`PORT=4322`, DB `ai_english_probe3`, known `JWT_SECRET`,
`RATE_LIMIT_LOGIN_ACCOUNT_MAX=5`, `RATE_LIMIT_PASSWORD_MAX=5`) for attacks requiring a signing
capability or small limiter budgets. Probe servers and `*_probe` databases were destroyed after testing.
Scope files: `server/src/auth.ts`, `server/src/middleware.ts`, `server/src/rate-limit.ts`,
`server/src/config.ts`, `server/src/postgres-rate-limit-store.ts`, `server/src/app.ts`,
`server/db/migrations/001–007`.

## Verdict

**No exploitable vulnerability was found in the auth/session surface.** Every attack in the mission
brief was executed against the live server (or a controlled probe) and was resisted. Two
non-exploitable hardening observations are recorded in §2 for completeness. All prior
`AUDIT_REPORT.md` remediations in scope (non-UUID `sub` 401, targeted-login-lockout fix,
password-confirmation throttle, refund fail-safety, register budget) were re-verified as working.

---

## 1. Findings

None at critical/high/medium/low severity. Everything verified is listed in §3 ("held up").

## 2. Informational observations (not exploitable — recorded for hardening)

### 2.1 `jwt.verify` accepts tokens with no `exp` claim — informational only

- `server/src/middleware.ts:58-62` — `jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience })`
  does not require an expiry claim; jsonwebtoken only validates `exp` when present.
- Evidence (probe server, self-minted HS256 token for a real user, claims minus `exp`):
  `GET /auth/me` → **200**. The same token with `exp` in the past → 401.
- Why not a vulnerability: reaching this branch requires forging a signature, i.e. already possessing
  `JWT_SECRET`; every server-issued token carries `expiresIn: '30d'` (`server/src/auth.ts:30-37`).
  An attacker with the secret gains nothing from omitting `exp` that they could not get by setting
  a far-future `exp`.
- Hardening suggestion: pass `maxAge` or post-check `typeof payload.exp === 'number'` so a future
  code path can never issue/accept a non-expiring credential.

### 2.2 Token-type error messages distinguish revocation causes — informational only

- `server/src/middleware.ts:79-84` — "Invalid token: user not found" (deleted user) vs
  "Token no longer valid — please log in again" (`tv` mismatch) vs "Invalid or expired token".
- Reaching either distinguishing branch requires a validly signed token, so this leaks nothing to an
  attacker who does not already hold one. Not exploitable; no change required.

### 2.3 Per-IP `auth` limiter hard-rejects a correct password from a saturated IP — accepted design

- `server/src/app.ts:68` mounts `limiters.auth` (default 20/15 min/IP) with the default rejecting
  handler before `/auth/login`. A correct login from an IP that exhausted this budget gets 429 until
  the window rolls. The per-account always-verify fix (the medium finding remediated in pass 2) covers
  the distributed-attack case; the per-IP reject is the documented bcrypt-work bound
  (`server/src/rate-limit.ts:50-55` comment). An attacker must share the victim's source IP to affect
  the victim, and `TRUST_PROXY` refuses `true` (`server/src/config.ts:14-32`) so the budget cannot be
  dodged or weaponized via spoofed `X-Forwarded-For` under safe configuration. Reviewed, consistent
  with the audit's accepted trade-offs; not a finding.

---

## 3. Attacks tried that the code RESISTED (with evidence)

### 3.1 JWT forgery and confusion (live server, real captured token)

Crafted against a real account's token (`sub` known from its own `/auth/me`):

| Attack | Result |
|---|---|
| `alg=none`, valid claims, empty signature | 401 "Invalid or expired token" |
| HS256 with wrong 32-char secret | 401 |
| Real token, payload tampered (`tv` 1→999), original signature | 401 |
| Expired token (wrong secret) | 401 |
| `alg=RS256` confusion attempt | 401 |
| Garbage `abc.def.ghi` | 401 |
| `Authorization: bearer <tok>` (lowercase) / no scheme / double space | 401 |
| Trailing space after token | 200 — parser takes token verbatim; still requires the real token, benign |

Root cause of resistance: `jwt.verify` pins `algorithms: ['HS256']`, `issuer`, `audience`
(`server/src/middleware.ts:58-62`); the secret is a fixed string so `kid` is never dereferenced.

### 3.2 Signed-token edge cases (probe server, known secret — real signatures)

Minted validly-signed HS256 tokens with hostile claims; `GET /auth/me` results:

- `sub`: `"abc"`, `"1' OR '1'='1"`, bad-hex UUID, empty, missing, null, numeric → **all 401, never 500**.
  The claimed non-UUID-`sub` fix (`server/src/middleware.ts:45-47,67-74`) holds — verified live.
- `sub` = well-formed UUID of a nonexistent user → 401 "user not found".
- `tv`: `"1"` (string), missing, null → 401 at type check; `1.5`, `0`, `-1`, `2^53` → 401 at
  `token_version` mismatch. No type-coercion path to a match.
- Expired (`exp` past) → 401; wrong/missing `aud` or `iss` → 401.
- `sub` uppercased hex → 200 (pg uuid equality is case-insensitive); requires signing capability — benign.

### 3.3 Token revocation (live server)

Sequence executed with fresh users:

- Register → token T1; login → T2. `POST /auth/logout` with T1 → 204; replay T1 → **401**;
  replay T2 (other session) → **401** (all-device revocation via `token_version++`, `server/src/auth.ts:173-180`);
  double logout with T1 → 401.
- Fresh login T3 → `change-password` wrong current → 401 and **T3 stays valid**; correct change → 200
  + new token T4; replay T3 → **401**; replay T1/T2 → 401; login with old password → **401**, new → 200.
- `DELETE /auth/account` wrong password → 401 and token stays valid; correct → 204; replay T4 → **401**;
  login after deletion → 401; `users` row count for the email = 0 (psql).

### 3.4 Login timing side channel (live server)

150 samples each, alternating requests, wrong password throughout (`/tmp/authprobe/timing.py`):

- existing email: mean 840.79 ms, median 751.98, stdev 408.27
- nonexisting email: mean 840.50 ms, median 691.57, stdev 489.95
- mean diff **+0.29 ms, Welch t = 0.01** → no signal. The `DUMMY_BCRYPT_HASH` compare
  (`server/src/auth.ts:17,156`) equalizes the unknown-email path as designed.

### 3.5 Email normalization collisions and budget dodge (live + probe)

- Register `MixedCase{ts}@Test.DEV` → stored lowercase; login lowercase / UPPERCASE / whitespace+tab
  padded → all 200 against the same account. Single normalized identity.
- Re-register any case variant → 409. No duplicate normalized identity possible
  (zod `.trim().toLowerCase()` before insert; `UNIQUE` on `users.email`).
- Whitespace-padded registration stored trimmed.
- Unicode/lookalike addresses (`üser@`, `@tëst.dev`, Cyrillic `vіctim@`, `@test.dëv`) → all 400
  (zod 3.25 email regex is ASCII-only) — no confusable-identity vector.
- Malformed (`.a@`, `a@test`, `a@@`, interior space) → 400.
- Plus-tags `plus@` vs `plus+a@` are distinct accounts (201/201) — standard email semantics, not a collision.
- **Budget dodge**: probe server, `RATE_LIMIT_LOGIN_ACCOUNT_MAX=5`. Five wrong-password logins using
  case/whitespace variants of the victim address → all 401 and they **share one budget**: the 6th
  variant → 429. `normalizeLoginEmail` (`server/src/rate-limit.ts:8-13`) applies the identical
  trim+lowercase as the login schema, so variants cannot multiply the per-account budget.

### 3.6 Always-verify limiters — lockout regression and refund abuse (probe, budgets of 5)

- Login: 5× wrong → 401 each; 6th wrong → **429**; **correct password while over budget → 200** (twice);
  wrong again after the successes → 429. The targeted-lockout regression stays fixed
  (`server/src/auth.ts:154-162`, `server/src/rate-limit.ts:56-76`).
- `change-password`/`DELETE /auth/account` (`passwordAccount`): 5× wrong current → 401; 6th → **429**;
  **correct while over budget → 200/204**; old token revoked by the successful change.
- **Refund-abuse review** (`skipSuccessfulRequests: true`): express-rate-limit only decrements on
  responses < 400. On `/auth/login`, `change-password`, and `DELETE /auth/account` every sub-400
  response requires the correct password — there is no request keyed to the victim's budget that
  succeeds without it, so an attacker cannot mint refunds against the victim's key. Successes on the
  attacker's own account refund only the attacker's own key. Empirically, failures after refunded
  successes still 429 (§3.6 live run). `decrement` is window-guarded
  (`server/src/postgres-rate-limit-store.ts:64-75`) so a late refund cannot eat the next window.
- **Window rollover** (probe with `RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS=8000`): 6 rapid failures →
  `401 401 401 401 401 429`; after 10 s the next wrong password → 401 (fresh window, `hits=1` in
  `rate_limit_windows`) and correct → 200. Fixed-window reset works; no permanent throttle.
  (An earlier contradictory 429 was traced to my own stale probe process still bound to the port with
  a 15-minute window — test-harness error, not a code defect; namespace rows in the DB proved it.)

### 3.7 bcrypt 72-byte truncation (live server)

- Register 72-byte password → 201; 73-byte → **400**; 71-byte multibyte (35×`é`+`1`) → 201;
  73-byte/37-char multibyte → **400**; 141-byte/71-char (char-count bypass attempt) → **400**.
  The byte-level refine (`server/src/auth.ts:47-49`) fires, not just zod's char-count `.max`.
- Login with 73-byte password sharing the first 72 bytes of a registered password → **400** (schema),
  so no truncation-collision probe is possible; same-length wrong password → 401.
- All password-accepting schemas (`register`, `login`, `change-password`, `delete-account`) cap at
  72 UTF-8 bytes (`server/src/auth.ts:41-58`). Truncation is unreachable.

### 3.8 Concurrent duplicate registration (live server)

Ten parallel `POST /auth/register` with identical email → **1×201, 9×409, zero 500s**;
`SELECT count(*) FROM users WHERE email=...` = 1. A second wave of 5 → all 409. The 23505→409 mapping
(`server/src/auth.ts:132-142`) is race-safe.

### 3.9 Account deletion and re-registration (live server + psql)

Created a user with a real diagnostic answer (ffmpeg-generated M4A through `POST /diagnostic/answer`),
producing rows in `users`, `attempts`, `diagnostic_state`, `assessment_requests`, `assessment_usage`.
After `DELETE /auth/account` (204):

- `users`, `attempts`, `diagnostic_state`, `assessment_requests`, `practice_inflight` rows for the id:
  all 0 (psql) — ON DELETE CASCADE works.
- `assessment_usage`: row retained with **`user_id = NULL`** — exactly the migration-004
  anonymization; the row carries only `(id, created_at)`, no PII.
- Old bearer token → 401. Re-registering the same email → new UUID, `diagnosticCompleted: false`,
  `cefrLevel: null`, `/auth/me/data` → 0 attempts, and the deleted account's `requestId` → 404
  (no idempotency-record inheritance across identities).

### 3.10 Malformed input / injection / mass assignment (live server)

- Login with `email` as object (`{"$gt":""}`), array body, string body, 300-char email,
  `content-type: text/plain`, malformed JSON → all clean **400** with stable messages (no parser
  internals reflected; zod type messages only, e.g. `email: Expected string, received object`).
- `GET /auth/login` → 404. Mass-assignment attempt on register (`diagnosticCompleted:true`,
  `cefrLevel:"C2"`, `token_version:999`, forged `id`, forged `created_at`) → all stripped by zod;
  DB row shows server defaults (`token_version=1`, fresh UUID, current timestamp).
- Cross-user `/auth/me/data?cursor=<other user's attempt id>` → 400 "Invalid export cursor"
  (ownership pre-check `server/src/auth.ts:236-239`); non-UUID cursor, `limit=0/501/abc` → 400.
- `POST /auth/logout` without/with garbage token → 401. `/auth/me` never exposes `password_hash`.
- Request logging redacts `authorization`, passwords, and tokens (`server/src/logger.ts:9-35`);
  auth routes set `Cache-Control: no-store` (`server/src/auth.ts:105-108`).

---

## 4. Notes on method

- One foreign process (not started by me) was found already listening on port 4100; per the rules it
  was left untouched and all probe work moved to ports I owned. Evidence gathered against it in the
  first minutes (all-401 JWT results) was discarded and re-collected against my own instance.
- All probe servers I started were killed and all `ai_english_probe*` databases dropped. The main
  dev server was never crashed and remained healthy throughout; no source, test, or config file was
  modified. Scratch files live under `/tmp/authprobe/`.
