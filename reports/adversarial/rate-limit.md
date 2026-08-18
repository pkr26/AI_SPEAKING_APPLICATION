# Adversarial Audit — Rate Limiting & Distributed Store

Date: 2026-08-14. Tester: adversarial subagent (rate-limit mission).
Scope: `server/src/rate-limit.ts`, `server/src/postgres-rate-limit-store.ts`, limiter mounting in `server/src/app.ts` / `practice.ts` / `diagnostic.ts` / `audio-upload.ts` / `auth.ts`, `TRUST_PROXY` handling in `server/src/config.ts`, and the installed `express-rate-limit@8.6.2` behavior.

## Method / environment

- Probe DBs created by me: `ai_english_rl_probe`, then `ai_english_rl2_probe` (the first was contaminated by a parallel agent process I did not start — PID 50584 squatting port 4100 and PID 54801 squatting 4120 were writing counters into it; I abandoned it and repeated every measurement on the isolated `rl2` DB. All numbers below are from the isolated DB unless marked otherwise.)
- Probe instances (all `MOCK_AI=true LOG_LEVEL=silent JWT_SECRET=probe-secret-probe-secret-probe-12`, `ai_english_rl2_probe`, tight caps: register 3/h, auth 5/15min, login-account 3/15min, password 3/15min, assess 3/h, upload-grant 3/h, `ASSESS_DAILY_CAP=3 ASSESS_IP_DAILY_CAP=3`):
  - P1 `:41337` `TRUST_PROXY=0`; P2 `:4121` `TRUST_PROXY=1`; P3 `:4122` replica of P1 (cross-replica test); P4 `:4123` DB via a killable TCP relay (`:59998→:5432`, `/tmp/rl-proxy.cjs`); P5 `:4124` 3-second auth window; P6 `:4125` S3 mode (`S3_BUCKET=probe-bucket`, fake static creds — presigning is local crypto) for the upload-grant limiter.
- `psql postgres://localhost:5432/ai_english_rl2_probe` used to inspect `rate_limit_windows` directly; `TRUNCATE` between phases.
- All probes and the relay were killed after testing.

## Verdict summary

No critical/high. Two lows, three informational. The PostgreSQL fixed-window store is atomic under concurrency, shared correctly across replicas, fails CLOSED on database outage (no fail-open money leak), stores only HMACs, and the refund/anti-lockout semantics from the second audit pass hold up under live attack.

---

## Finding 1 (LOW) — `TRUST_PROXY≥1` with no stripping proxy in front = total per-IP budget bypass via `X-Forwarded-For` rotation

- Where: `server/src/app.ts:31` (`app.set('trust proxy', config.trustProxy)`), keys derived from `req.ip` via `ipKeyGenerator` in `server/src/rate-limit.ts:114,154` (register, assess-ip-daily, and the IP fallbacks).
- Reproduction (P2, `TRUST_PROXY=1`, register cap 3/h):
  - Baseline, no header: `201 201 201 429` — cap enforced.
  - Then five registrations with `X-Forwarded-For: 10.0.0.1` … `10.0.0.5`: **all `201`**. Each header value is a fresh budget key, so every per-IP limit (register, global, auth, assess-ip-daily) is reset at will.
  - Non-IP garbage works too: `X-Forwarded-For: not-an-ip`, `2001:::zz`, `1.2.3.4:9999` each returned `201` (each string becomes its own key; no crash, process healthy).
  - Hop semantics with a 2-entry header (verified): with `TRUST_PROXY=1` the key tracks the **rightmost** XFF entry — `"9.9.9.9, 8.8.8.8"` then `"9.9.9.9, 7.7.7.7"` → `201` (fresh key), while `"6.6.6.6, 8.8.8.8"` → `429` (same key). So behind exactly one append-style proxy (ALB/nginx `$proxy_add_x_forwarded_for`) the accounting is correct; the bypass requires the server to be directly reachable (or the proxy to pass client XFF through) while `TRUST_PROXY≥1`.
- Expected vs observed: with a hop count configured and no proxy stripping client-supplied headers, IP budgets should not be client-controllable; they are. This is documented Express behavior — the code behaves exactly as configured — so the practical exposure is a deployment misconfiguration.
- Mitigations already in code (verified): default `TRUST_PROXY=0`; `TRUST_PROXY=true` is **unbootable** — live check: process exits 1 with `TRUST_PROXY: must be an exact proxy hop count, not 'true' (which trusts spoofed forwarding headers)` (`server/src/config.ts:14-32`). With `TRUST_PROXY=0` (P1): baseline `201 201 201 429`, then XFF rotations `10.1.0.1-3` → **`429 429 429`** — spoofing fully resisted. `express-rate-limit@8.6.2` additionally logs `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` once when XFF arrives while trust proxy is false (code trace: `node_modules/express-rate-limit/dist/index.mjs` validations `xForwardedForHeader`; log line not live-observed because probes run `LOG_LEVEL=silent` and the validation writes to console).
- Impact: only when misconfigured; then register/global/auth/assess-ip-daily per-IP budgets are all bypassable, re-enabling the account-cycling spend the assess-ip-daily budget was built to stop.

## Finding 2 (LOW) — Schema-invalid (400) requests and free idempotent replays consume the per-user assess budget and the shared per-IP daily “paid assessment” budget

- Where: mounting order in `server/src/practice.ts:271-277` and `server/src/diagnostic.ts:288-294` — `limiters.assess` → `limiters.assessIpDaily` → `uploadAudio`/`validate(...)`. The limiters increment before validation and before the idempotency claim, and neither limiter sets `skipFailedRequests`, so every authenticated request — including ones that 400 on schema validation or 200 from the idempotency store without any provider call — permanently consumes both budgets.
- Reproduction (P1; fresh counters; two new accounts u1/u2 same source IP):
  1. u1 `POST /diagnostic/answer {"questionId":"not-a-uuid","requestId":"also-not-a-uuid"}` ×3 → `400` ×3 (zod rejects after the limiters).
  2. u2 (fresh account, per-user budget untouched) same invalid body → **`429 {"error":"Daily assessment limit reached for this network"}`** — u1’s zero-cost garbage requests burned the shared per-IP paid budget and blocked a *different* account.
  3. u1 4th invalid request → `429` (per-user assess cap). Counter dump: `assess-ip-daily:3 hits=4`, `assess:3600000:3 hits=4 (u1), 1 (u2)` — every rejected request was counted.
  4. Retry accounting: one real paid answer (`POST /diagnostic/answer` with a valid 2 s ffmpeg-generated `tone.m4a`, real `questionId` from `GET /diagnostic/next`) → `200`, counters `assess=1, assess-ip-daily=1` (exactly one each — correct). Replaying the **same `requestId`** (served from the idempotency store, no second provider call) → `200`, counters `assess=2, assess-ip-daily=2` — replays consume budget despite costing nothing.
- Expected vs observed: the budget documented as bounding “paid assessments per source IP per day” (AGENTS.md) is also consumed by requests that can never cost money (schema-invalid) or that are free replays. Observed exactly that.
- Impact: an attacker with throwaway accounts (register cap 10/h/IP by default; per-user assess cap 20/h trips first and caps each account’s contribution) can deny paid assessments to other users behind the same NAT at zero AI cost, and aggressive legitimate retry loops burn the user’s own budget faster than intended. Mitigations that already exist: unauthenticated requests consume nothing (verified: `401` without token leaves `assess%` counter count = 0 — `requireAuth` runs before the limiters); the diagnostic-completed gate (`practice.ts:221-226`) 403s before limiters; the cheap `GET /assessments/:requestId` reconciliation endpoint is deliberately not assess-limited, so well-behaved clients can poll status without burning budget. Consider moving validation ahead of the limiters or refunding on 400; bounded, same-NAT-only — LOW.

## Finding 3 (INFO) — Readiness limiter is per-process (MemoryStore), not shared

- Where: `server/src/rate-limit.ts:120-124` — the readiness limiter is the only one without a `PostgresRateLimitStore`, so it falls back to the default in-memory store.
- Live check: 65 parallel `GET /ready` against P5 → `{"200":60,"429":5}`; immediately repeated against P1 → again `{"200":60,"429":5}`. Two replicas served 120 combined; N replicas = N×60 DB-hitting readiness calls/min/source-IP. Given `/ready` runs a schema query plus an inspector check, the “independently bounded” comment is accurate but the bound scales with replica count. Negligible.

## Finding 4 (INFO) — Fixed-window boundary allows the inherent ≤2× burst, never more

- P5 (`RATE_LIMIT_AUTH_WINDOW_MS=3000`, cap 3). Precise trace (ms since first request, status): `0:401 633:401 1071:401` (window 1 full), polls `1978…3011: 429` ×6 (rejected until the roll), `3140:401 4256:401 5039:401` (window 2), `7158:401` (window 3 — bcrypt latency ~1 s/compare under load spread the burst). An earlier coarse run got 6 accepted attempts in 4.5 s. Worst case is the textbook 2× fixed-window straddle; the store never allowed a 7th hit inside a live window. Inherent to the chosen fixed-window design; documented here only to record the measured bound.

## Finding 5 (INFO) — Rate-limit keys are deterministic HMACs of the JWT secret; correlatable across environments that share the secret

- `server/src/postgres-rate-limit-store.ts:28-30`: `HMAC_SHA256(jwtSecret, namespace \0 key)`. Verified by recomputation against live rows: `HMAC(..., "login-account:900000:3", "\0", "email:refund@test.dev")` = stored `b825d750…df62` (exact match); `assess-ip-daily:3`/`register:3600000:3`/`global:900000:100000` keys for this host all matched `key="::/56"` (IPv6 loopback subnetted by `ipKeyGenerator`), and u3’s assess row matched `"user:<uuid>"`. The identical `assess-ip-daily` hash appeared in both probe databases because both used the same secret — i.e., cross-database/cross-environment correlation of “is identifier X throttled” is possible wherever the JWT secret is shared (dev/stage/prod secret reuse). Raw identifiers are never stored — see Held up. Note only; secret hygiene is the control.

---

## Attacks the code RESISTED (verified live unless noted)

1. **Concurrency overshoot / TOCTOU** — 20 parallel registrations vs cap 3: exactly `{"201":3,"429":17}`, counter `hits=20`. 10 parallel S3 upload-grant POSTs vs cap 3 (P6): exactly `{"200:s3":3,"429":7}`, `hits=10`. The single `INSERT … ON CONFLICT DO UPDATE` (`postgres-rate-limit-store.ts:33-46`) is atomic; no TOCTOU. (Rejected requests are also counted — standard fixed-window accounting.)
2. **Cross-replica counter sharing** — 2 registrations on P1 + 3 on P3 (identical config, same DB): `201 201 | 201 429 429`, one shared row `hits=5`. Replicas genuinely enforce one budget.
3. **Store failure fails CLOSED, no fail-open money leak, no crash** — (a) killed the DB TCP relay mid-run: `/auth/login` and `/auth/register` → `500 {"error":"Internal server error"}`, `/ready` → `503`, `/health` still `200`, process alive, and it recovered (`200`) after relay restore; (b) sharper variant — restored connectivity, then `DROP TABLE rate_limit_windows` so only the limiter store fails while the rest of the DB works: 5 parallel logins → `500` ×5, register → `500`, process alive. `increment`’s rejection propagates through express-rate-limit (`passOnStoreError` default false) to the central error handler; expensive routes can never be reached, so a store outage cannot unlock unlimited OpenAI spend. (c) Boot against a dead DB port: exits `1` (dependency preflight refuses traffic). `decrement`/`resetKey` remain try/caught fire-and-forget (code trace; the increment-fails path means no refund is even scheduled during an outage).
4. **Login refund semantics / abuse** — cap 3: 2 wrong (`401`, counter 2) → 1 correct (`200`, counter stays **2** — refund verified in psql) → 1 wrong (`401`, counter 3) → 1 wrong (`429 Too many login attempts`, counter 4 — the throttled 429 is not refunded). No way to launder budget: the only `<400` response on `/auth/login` requires the genuine password, and `skipSuccessfulRequests` only refunds `<400`.
5. **Anti-lockout (previously remediated, re-attacked)** — account budget saturated (4 wrong, `429` on the last): the owner’s correct password still returns `200`. Same for change-password: 4 wrong (`401 401 401 429`), then correct current password → `200`, counter 4 (success refunded). The always-verify design holds.
6. **Email key consistency under casing** — wrong-password logins as `REFUND@TEST.DEV`, `Refund@Test.Dev`, `refund@test.dev`, `rEFUND@tEST.dEV`: one shared counter (`hits=4`), 4th throttled. Normalization (`rate-limit.ts:8-13`) is consistent.
7. **IP key consistency** — `1.2.3.4`, `::ffff:1.2.3.4` and hex form `::ffff:0102:0304` share one budget (4th request `429`); IPv6 case/expansion forms (`2001:db8::1`, `2001:DB8::3`, fully expanded) share one /56 budget; a genuinely different /56 (`2001:db8:0:100::1`) gets a fresh budget (the known 256×-/64 IPv6 trade-off of /56 grouping).
8. **Unauthenticated requests consume no paid budget** — `POST /diagnostic/answer` without a token → `401`, zero `assess%` rows. `requireAuth` precedes the limiters.
9. **XFF spoofing with default config** — `TRUST_PROXY=0`: rotations fully ignored (`429` wall); `TRUST_PROXY=true` refused at boot (exit 1).
10. **Malformed/garbage XFF under trust proxy** — no crash, no 500s; each garbage string is just a fresh key (Finding 1 covers the budget implication).

## Notes for the lead auditor

- Namespace strings embed `windowMs:max` (`rate-limit.ts:31-34` etc.), so replicas deployed with *different* limiter config silently stop sharing counters (each gets its own budget) — relevant during rolling config changes.
- `express-rate-limit` validation warnings (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`, `ERR_ERL_PERMISSIVE_TRUST_PROXY`) go to the library’s console logger, not pino; with production `LOG_LEVEL` they still surface on stderr, once per process.
- Leftovers: probe DBs `ai_english_rl_probe` / `ai_english_rl2_probe` still exist (the former is possibly in use by a parallel agent process on ports 4100/4120 that I did not start and did not kill); scratch scripts under `/tmp/rl-*.cjs|mjs|sh`, `/tmp/tone.m4a`.
