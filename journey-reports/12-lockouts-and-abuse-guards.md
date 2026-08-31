# Scenario 12 — Lockouts and abuse guards under DEFAULT limits

**Persona:** an attacker (and a heavy-handed real user) hammering a
production-shaped server. Runs against a dedicated instance with default
budgets on :4300 (only the *per-IP* auth budget was relaxed because earlier
runs had saturated this single-IP window for 15 minutes; every account-level
and per-user guard ran at its true default). Evidence:
[`evidence/scenario12.log`](evidence/scenario12.log) — **10/10 checks
passed**.

## The results

> **Update 2026-08-31 (fixes applied after this report's findings):** the
> login-throttle 429 now carries a **constant-window** `retryAfterSeconds`
> (= the full window length, never the remaining time, so it cannot pace
> retries) mirrored into `Retry-After`; and the per-IP register budget now
> **refunds pure validation 400s** through the same exact-window refund
> wrapper used for successful registrations, so form errors can no longer
> burn a shared NAT's signup budget (409 probes, 201s, 413s, and 429s still
> count). Both are pinned by tests (`tests/auth.test.ts`,
> `tests/rate-limit.test.ts`) and re-verified live in
> [`evidence/scenario13.log`](evidence/scenario13.log): the 429 body now
> reads `{retryAfterSeconds: 900, error, code}` with `Retry-After: 900`, a
> valid registration succeeds after 12 form-error 400s on the default
> budget, and EMAIL_TAKEN probes still saturate it.

| Abuse pattern | Observed |
| --- | --- |
| Wrong password ×10 on one account | 11th attempt → **429** (per-EMAIL credential budget, default 10) — now with the **constant-window** `retryAfterSeconds`/`Retry-After` (full window length, fixed value: leaks only deployment config, cannot pace retries; see the update above) |
| **The real owner's next login** while that budget is saturated | **200** — the flag-don't-reject design means a saturated failure budget can never lock out the true owner ✅ |
| `forgot-password` ×7 on one address (budget 5) | **uniform 204 every time**; the strict server's mailer log shows exactly **5 reset mails for 7 requests** — requests 6–7 were silently skipped (enumeration oracle closed, no error signal) |
| `diagnostic/restart` spam (shares the password budget, per user) | 11th → **429 + `Retry-After: 900s`** |
| `DELETE /recordings` bulk spam | 11th → **429 + Retry-After 900s** |
| `DELETE /recordings/{id}` spam | 11th → **429 + Retry-After 900s** |
| playback-grant spam (budget 60/h) | 61st → **429 + Retry-After 900s** |
| Assessment spam (hourly limiter, default 20/h) | 21st POST → **429 `Assessment rate limit reached, please slow down` + `Retry-After: 3600s`** — exactly what the app's inline "when you can try again" card renders |
| Reading `GET /practice/question` while POSTs are throttled | **still 200** — throttling touches paid submissions, not navigation |

## Notes from getting here (all real behavior)

- The **per-IP auth window** is PostgreSQL-backed, so it survives server
  restarts — during setup my earlier runs saturated it for this IP and the
  *first* wrong-password attempt answered 429 with ~830 s remaining. That is
  the guard working across instances; nothing to fix.
- ~~The login-throttle 429 is thrown by the route after the failed password
  check (so only failures are counted) and deliberately omits a retry
  hint.~~ **Fixed** (see the update above): the hint is now the constant
  window length — route-side failure counting is unchanged, only failures
  still count, and the real owner still passes.
- The per-EMAIL register enumeration guard (default 20) sits above the
  per-IP register budget (10), so from a single IP the per-IP guard always
  fires first; the per-email oracle-closing is therefore pinned by the
  server suite rather than demonstrable from one address — by construction.

## Verdict

**Pass, 10/10.** Every abuse guard fires at its documented default with the
documented contract (429 + Retry-After where a retry is legitimate, uniform
silence where a signal would leak information), and the one guarantee users
actually feel — **the real owner is never locked out by an attacker's failed
attempts** — is verified live.
