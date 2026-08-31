# Observed under DEFAULT limits: per-network register budget

Captured 2026-08-31 ~04:16 UTC against the first journey server instance
(default `RATE_LIMIT_REGISTER_MAX=10`; every `POST /auth/register` attempt —
including 400 validation failures — is counted because the limiter is mounted
before body parsing).

Sequence: driver run 1 issued 6 register attempts (4 invalid + 1 success + 1
duplicate); driver run 2 issued 4 invalid attempts, and the next (11th)
attempt was shed:

```
> POST /auth/register  {"name":"First Time","email":"journey1_...@example.com","password":"secret123","nativeLanguage":"te"}
< HTTP 429
< {"error":"Too many accounts created from this network, please try again later","code":"RATE_LIMITED"}
< header retry-after: 3590
```

Interpretation: bulk account creation and email enumeration are budgeted per
source network with an hour-class Retry-After. The journey server was then
restarted with `RATE_LIMIT_REGISTER_MAX=100000` (which also changes the PG
store namespace, starting a fresh counter) so the drivers could run freely.
