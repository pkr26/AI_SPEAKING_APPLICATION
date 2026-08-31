# Scenario 11 — Negative, malformed, and edge scenarios

**Persona:** a confused client, a buggy proxy, a double-tapping thumb, and a
curious user with curl. Evidence:
[`evidence/scenario11.log`](evidence/scenario11.log) — **23/23 checks
passed**.

## Malformed bodies

| Input | Result |
| --- | --- |
| `{not json` to `/auth/login` | **400** `Request body is not valid JSON` |
| 1.6 MB JSON body (limit 1 MiB) | **413** `Request body is too large` |
| `text/plain` body on the JSON route `/practice/skip` | **400** |

## Query-parameter edges (history/stats/export)

- `limit=0`, `limit=-1`, `limit=abc`, `limit=51` → all **400** (floor 1,
  ceiling 50, integer coercion validated).
- `timeZone=Not/AZone` → **400**; `timeZone=UTC` → **200** (IANA-validated
  day bucketing).
- `/auth/me/data?attemptsDone=banana` → **400** (the done flags are a strict
  `true|false` enum).

## Routing/operational edges (observed, not assumed)

| Request | Result |
| --- | --- |
| `POST /health` | **404 `NOT_FOUND`** (GET-only) |
| `GET /practice/history/` | **200** — one trailing slash tolerated |
| `GET /recordings/` | **200** (documented exemption) |
| `GET /metrics` (no `METRICS_ENABLED`) | **404** |
| Security headers on `/health` | `x-content-type-options`, `x-frame-options`, `strict-transport-security`, `content-security-policy` (helmet) |
| CORS preflight `OPTIONS /auth/login` | answered 200, **no `access-control-allow-origin`** — with `CORS_ORIGINS` unconfigured the API grants no browser origins (native-app posture) |

## State-machine edges

- **Stale pre-skip cycle:** skip the assignment, then submit an attempt with
  the pre-skip `cycleId` → **409 `PRACTICE_CYCLE_CLOSED`**.
- **Practice-shaped body to the diagnostic endpoint** (cycleId leak):
  rejected (409/400 family — never a 500, never state corruption).
- **Foreign reconciliation:** user 2 polls `GET /assessments/{user-1's
  requestId}` → **404** (owner-only), while user 1 gets the full stored
  result.
- **Concurrent double-tap Send** (two parallel submissions, distinct
  requestIds, same question — 3 rounds): **one 200 + one 409 each round**
  (`ASSESSMENT_IN_PROGRESS` processing claim), zero 5xx — the double-tap can
  never double-charge or double-advance.
- **Two devices, one account:** both tokens read the **same durable cycle**
  (same question + cycleId).

## The export walk (two-cursor protocol, documented and now exercised)

The data export walks TWO collections with independent cursors. A naive
walker that follows only `nextCursor` never terminates by design: when
attempts exhaust, the response is `{nextCursor: null, attemptsDone: true,
nextPracticeCycleCursor: <id>, practiceCyclesDone: false}` and the walker
must switch to `practiceCycleCursor` with the flags set (passing `cursor`
together with `attemptsDone=true` is a 400 — the schema refuses it). My
first walker looped forever; the corrected protocol walker terminated
cleanly. The app's real `apiConsumeAccountExportPages` implements exactly
this and is pinned by the app suite.

## Verdict

**Pass, 23/23.** Every hostile or accidental input got the documented
stable error contract — no 500s, no state corruption, no cross-account
leakage — and the concurrency guard survived a genuine parallel double-tap.
