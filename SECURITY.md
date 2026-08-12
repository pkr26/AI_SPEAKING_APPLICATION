# Security Policy

## Reporting a vulnerability

If you discover a security issue, please report it privately to the project maintainer (open a private channel — do **not** file a public issue with exploit details). Include: affected endpoint/screen, reproduction steps, and potential impact. We aim to acknowledge reports within 72 hours.

## Data handling

- **Audio recordings** — production deployments must use TLS. Accepted recordings use random UUID filenames, private file permissions, and magic-byte validation. Response-finish/connection-close cleanup covers later middleware failures, route handlers also delete in `finally` blocks, and a boot-time janitor sweeps crash leftovers older than 1 hour. The upload directory must still be treated as sensitive temporary storage.
- **Transcripts & scores** — retained in the `attempts` table to power learning progress. Idempotent response replays duplicate the latest assessment response for at most 24 hours, with startup/hourly cleanup. Users can export attempts through the bounded, cursor-paginated `GET /auth/me/data` endpoint or delete the account; deletion cascades to attempts, diagnostic state, and replay rows.
- **Passwords** — bcrypt cost 12; never logged; never returned by any endpoint.
- **Tokens** — JWT (HS256-pinned) stored in the device's secure credential store (expo-secure-store); server-side all-device revocation via `token_version` on logout or password change, and implicit revocation on account deletion.
- **Third parties** — in non-mock mode, audio/transcripts are sent to OpenAI (Whisper + GPT-4o-mini) for transcription and transcript-based feedback. Production operators must document any additional infrastructure subprocessors they configure.

## Security controls in place

- Rate limiting (global, auth, and per-user assessment tiers) + per-user daily assessment caps
- zod-validated inputs on every route; parameterized SQL data values (the database-creation CLI strictly quotes its one dynamic identifier)
- helmet security headers, HSTS, CORS allowlist
- Central error handling that never leaks stack traces or internals
- Structured logs with automatic redaction of authorization headers and password fields
- CI runs lint, typecheck, and the full test suite (including security-behavior tests) on every change

## Known limitations (documented in README)

- Rate-limit state is per-process (in-memory) — multi-instance deployments must switch to a shared store.
- No refresh-token rotation yet (30-day tokens with server-side revocation instead).
- Mobile `npm audit --omit=dev` currently reports transitive Expo/Metro/React Native advisories. They require SDK-compatible upstream remediation; do not treat npm's production classification as proof of binary exploitability or safety without a release-artifact analysis.
- Feedback evaluates only relevance, grammar, coherence, and vocabulary visible in a transcript. Pronunciation, accent, timing, and prosody are not implemented or validated.
