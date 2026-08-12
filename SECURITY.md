# Security Policy

## Reporting a vulnerability

Do **not** file a public issue containing exploit details. This project has not yet published a monitored security mailbox or enabled GitHub private vulnerability reporting; one of those private intake channels is required before public launch. People who already have a private channel to the maintainer should include the affected endpoint/screen, reproduction steps, and potential impact. The target acknowledgement time is 72 hours.

## Data handling

- **Audio recordings** — production deployments must use TLS. Accepted recordings use random UUID filenames, size-constrained presigned S3 POST grants (or private local files in development), and magic-byte validation. Submitted objects are deleted after assessment. Response-finish/connection-close cleanup covers later middleware failures, and the local janitor sweeps crash leftovers older than 1 hour. Production buckets must also expire abandoned `audio-uploads/` objects with a short lifecycle rule.
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
- CI is configured to run formatting, lint, strict typechecks, builds, coverage-gated tests, dependency audits, API smoke checks, and production mobile bundle exports; required status checks and repository security scanning still need to be enabled in GitHub before launch

## Known limitations (documented in README)

- Application rate-limit state is shared through PostgreSQL, but a production edge WAF/load balancer is still required for volumetric attacks and database-outage fail-safe planning.
- No refresh-token rotation yet (30-day tokens with server-side revocation instead).
- Mobile `npm audit --omit=dev` currently reports transitive Expo/Metro/React Native advisories. They require SDK-compatible upstream remediation; do not treat npm's production classification as proof of binary exploitability or safety without a release-artifact analysis.
- Feedback evaluates only relevance, grammar, coherence, and vocabulary visible in a transcript. Pronunciation, accent, timing, and prosody are not implemented or validated.
- The private GitHub repository currently has no enforceable branch protection on its plan, and secret scanning, code scanning, and vulnerability alerts are disabled. Enable equivalent controls before accepting external contributions or releasing.
