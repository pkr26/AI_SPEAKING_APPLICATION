# Scenario 7 — The forced-upgrade handshake (every old app build's first screen)

**Persona:** a learner on an old app build (or a fresh install whose first
request lacks the handshake) hitting a production-shaped server. Verified
against a second server instance started with `MIN_CLIENT_VERSION=1.1.1`
(the documented production floor). Evidence:
[`evidence/scenario7.log`](evidence/scenario7.log) — **16/16 checks
passed**.

## The gate itself

| Request | Result |
| --- | --- |
| `POST /auth/login` with **no** `X-Client-Version` | **426** `{"error":"This app version is no longer supported; please update it","code":"CLIENT_UPGRADE_REQUIRED"}` |
| header `1.0.0` | **426** |
| header `1.1.0` (one patch below the floor) | **426** |
| header `1.1.1` (exactly the floor) | passes the gate (401 wrong-credentials proves it reached auth) |
| header `1.2` (newer, short form) | passes |
| header `garbage` (malformed) | **426** — fail closed |
| authenticated product route without a header | **426** even with a valid bearer |

## What stays reachable during an upgrade (documented exemptions, all verified)

A stranded old build must still be able to leave. Without any version header:

- `GET /health`, `GET /ready` → **200** (operational probes)
- `GET /auth/me/data` → **200** (portability: take your data with you)
- `GET /recordings/export` → **200** (same)
- `DELETE /recordings` → **204** and `DELETE /recordings/{uuid}` → **204**
  (privacy exits — delete your audio)
- `POST /auth/logout` → **204**
- `DELETE /auth/account` → **204** (delete the account entirely)

Non-exempt operations (login, register, practice, everything else) stay
426 until the app is updated.

## How the app reacts (verified from the client code + app tests)

- The 426 is latched **only** when it comes from the first-party API with
  `code === 'CLIENT_UPGRADE_REQUIRED'` (`app/src/lib/api.ts` — an S3 or
  captive-portal look-alike 426 can never trigger it).
- The latch renders the **non-dismissable ClientUpgradeModal** with two
  buttons: **Update App** (opens the validated App Store / Play Store URL,
  with safe hard-coded fallbacks) and **Sign Out on This Device** (local
  SecureStore sign-out that fails closed unless the exact bearer is proven
  deleted).
- Inside the Recorder, a 426 is a definite pre-commit rejection: the durable
  upload handoff is cleared and the take is returned unsubmitted — an
  upgrade mid-journey can never cause a double submission later.
- On the dev server (no `MIN_CLIENT_VERSION`), the gate is off: product
  routes answer normally without the header — confirmed live in the main
  journey.

## Verdict

**Pass, 16/16.** The upgrade wall is exact at the boundary (1.1.0 rejected,
1.1.1 admitted), fails closed on missing/malformed headers, and preserves
every privacy/portability exit for stranded builds.
