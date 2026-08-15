# AI English Learning Application

An AI-powered English practice coach for native speakers of **Telugu, Hindi, Spanish, and Chinese**, organized by **CEFR levels** (A1–C2). Learners record answers; the backend transcribes them with OpenAI Whisper and gives GPT-4o-mini feedback on task relevance, grammar, coherence, and vocabulary visible in the transcript. Pronunciation, accent, timing, and prosody are not assessed.

## Project structure

```
├── app/      # Expo React Native app (TypeScript, expo-router)
└── server/   # Node.js + Express + PostgreSQL API (port 4000)
```

## Features

- **Auth** — email/password sign-up & login (JWT); native language chosen at sign-up.
- **Diagnostic Test** — binary search over CEFR levels (≤5 recorded answers) places new users at the right level before they can practice.
- **Practice Question Screen** — prompt word, question, new/revision status, mastery progress, record button, help (?) button, and English/native-language answer mode.
- **Help Screen** — word/question plus 3 example sentences, each in English and the user's native language; "Start Practice" preserves the selected answer mode.
- **Practice Mode** — word, question, answer-mode control, and record button only (no translations or examples).
- **Mastery and retries** — an English score of 75+ masters a word permanently; lower-scoring words return as revision. A learner gets up to 3 scored attempts, while silence is a free retry. Native-language answers check comprehension and provide a model English answer without changing mastery.

## Prerequisites

- Supported Node.js 22 (22.13+) or Node.js 24 (24.3+) and npm 10+
- PostgreSQL running locally (the SQL remains compatible with 14+, but use a currently supported 17/18 release for production)
- FFmpeg available on `PATH` for decoded audio validation (or set `FFMPEG_PATH`)
- [Expo Go](https://expo.dev/go) on your phone, or an iOS Simulator / Android Emulator
- An OpenAI API key for real AI assessment (optional — mock mode works without it)

## Setup

### 1. Backend

```bash
cd server
npm ci
cp .env.example .env
# Set JWT_SECRET in .env, for example with: openssl rand -hex 32
npm run db:setup   # creates the ai_english database, applies schema, seeds 600 CEFR questions × 4 languages
npm run dev        # starts the API on http://localhost:4000
```

The example config uses `MOCK_AI=true` (simulated transcripts/scores — no API key needed). For real transcript-based feedback, edit your untracked `server/.env`:

```
MOCK_AI=false
OPENAI_API_KEY=sk-...
```

### 2. Mobile app

```bash
cd app
npm ci
npx expo start
```

- **iOS Simulator:** use `http://localhost:4000`. **Android emulator:** use `http://10.0.2.2:4000` via `EXPO_PUBLIC_API_URL`.
- **Physical phone (Expo Go):** phone and computer must be on the same Wi-Fi. The app auto-derives your computer's LAN IP from Expo's host URI, so it usually just works. To set it explicitly:

```bash
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 npx expo start
```

## First-run flow

1. Sign up (pick your native language) → you're taken straight to the **Diagnostic Test**.
2. Answer the spoken questions → your CEFR level is assigned.
3. **Practice**: read the prompt word + question, choose English or your native language, and optionally tap **?** for bilingual help and examples before recording.
4. English: score 75+ to master the word; lower scores keep it in revision, with at most 3 scored tries before moving on. Silence is free. Native mode checks understanding, shows a model English answer, and leaves mastery unchanged.

## API overview (server, port 4000)

| Endpoint                                                                          | Purpose                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | JWT auth and all-device logout revocation                                              |
| `POST /auth/change-password` · `DELETE /auth/account` · `GET /auth/me/data`       | Password rotation (revokes old tokens), account deletion, cursor-paginated data export |
| `GET /diagnostic/next` · `POST /diagnostic/answer`                                | Diagnostic binary search (server tracks the served question)                           |
| `POST /uploads/audio-url`                                                         | Direct-mode marker or signed S3 upload grant                                           |
| `GET /assessments/:requestId`                                                     | User-scoped, no-store status/replay recovery for an interrupted assessment             |
| `GET /practice/question`                                                          | Next practice question at user's level                                                 |
| `GET /practice/question/:id/help`                                                 | Bilingual help content (ETag + private caching)                                        |
| `POST /practice/attempt`                                                          | Assess a recording; enforces 3-attempt rule                                            |
| `POST /practice/attempt/native`                                                   | Check native-language comprehension; never changes English mastery                     |
| `GET /health` · `GET /ready`                                                      | Liveness / migration, question-inventory, database, and FFmpeg readiness               |

See `server/.env.example` for all configuration knobs and `app/README.md` for the app.

The S3 response contract is
`{mode:'s3', uploadUrl, uploadFields, audioKey, contentType, expiresIn, maxBytes}`.
The app validates the entire grant, submits `uploadFields` plus the native file
as a multipart form, and reuses `audioKey` when it submits or recovers the
assessment. Development/test deployments without `S3_BUCKET` return
`{mode:'direct'}` instead.

## Server production hardening

- **Migrations** — schema lives in `server/db/migrations/`; applied filenames and checksums are tracked in `schema_migrations`, and an advisory lock serializes deploys. `npm run db:setup` is for initial/local setup. Production deploys run `npm run db:migrate:prod`, then publish reviewed question content with the idempotent `npm run db:catalog:prod`, which preserves question IDs and user progress.
- **Config** — validated with zod at boot (`src/config.ts`); the server refuses to start without a real `JWT_SECRET` (≥32 chars) or `DATABASE_URL`. Runtime PostgreSQL statements and lock waits have bounded deadlines.
- **Logging & shutdown** — structured logs via pino with per-request IDs (`x-request-id` honored); graceful SIGTERM/SIGINT shutdown (HTTP → pool → exit, 10s force timer).
- **Security headers / TLS** — `helmet` defaults including HSTS. TLS is expected to terminate at the reverse proxy/load balancer in front of this service; set `TRUST_PROXY` to the exact number of trusted proxy hops so client IPs are correct.
- **CORS** — allowlist from `CORS_ORIGINS`; requests without an `Origin` header (mobile app, curl) always pass. No credentials.
- **Rate limits** — global 300/15min/IP, credential endpoints 20/15min/IP, registration 10/hour/IP, failed logins 10/15min/normalized-email across source IPs, password-confirmation routes (change-password, account deletion) 10/15min/account, assessment endpoints 20/hour/user plus a fixed-window daily budget per source IP (`ASSESS_IP_DAILY_CAP`, default 300), and production S3 grant issuance 40/hour/user (all tunable via `RATE_LIMIT_*`). Credential budgets throttle only failures: over-budget requests still verify the password, so a saturated budget can never lock out the real owner, and successes are refunded. The upload-grant budget is separate so one submitted assessment consumes only one assessment-limit unit. Security-sensitive counters use PostgreSQL fixed windows shared across API replicas; raw IPs, user IDs, and email targets are HMACed before storage. An hourly janitor removes expired counter rows.
- **Uploads** — 25MB cap, random UUID filenames, extension+MIME checks, magic-byte sniffing, then resource-bounded FFmpeg decoding with sample-count timestamps to reject malformed, sub-0.5-second, and over-two-minute media before paid AI work. Native decoders have an independent fail-fast per-process cap (`AUDIO_INSPECTION_MAX_CONCURRENCY`, default 4). Production S3 grants are size-constrained presigned POST forms; GetObject/body streaming and best-effort deletion have an explicit `S3_OPERATION_TIMEOUT_MS` deadline. Submitted objects are deleted after assessment except non-definitive pre-claim 409/429 conflicts, which are retained for a possible owner or the lifecycle backstop; the local-upload janitor removes leftovers older than 1h, and production S3 needs a short lifecycle expiration for grants abandoned before submission.
- **Assessment guardrails** — atomic rolling-24-hour per-user and cross-account/provider budget caps (`ASSESS_DAILY_CAP`, `ASSESS_GLOBAL_DAILY_CAP`), a fixed-window per-source-IP daily budget that survives account re-registration (`ASSESS_IP_DAILY_CAP`), bounded per-process AI concurrency (`AI_MAX_CONCURRENCY`), one OpenAI client, and a shared end-to-end provider deadline (`OPENAI_TIMEOUT_MS`). Multi-track audio containers are rejected at the inspection gate so only duration-verified audio reaches the paid transcriber.
- **Auth hardening** — bcrypt cost 12 (native `bcrypt`; it verifies existing bcryptjs `$2a$/$2b$` hashes), password policy min 8 + letter + number, HS256-pinned JWTs carrying `{sub, tv: token_version}`; logout and password change bump `token_version` and invalidate all previously issued tokens for the account.
- **Diagnostic anti-cheat** — `GET /diagnostic/next` records the served question; `POST /diagnostic/answer` rejects anything else with 409. Short, token-owned database claims serialize assessments across instances without holding a database connection during AI provider calls.
- **Tests & CI** — `npm test` runs vitest + supertest with enforced coverage floors against an auto-created loopback database whose name must end in `_test`; destructive setup refuses remote hosts and the configured app database. GitHub Actions runs server format/lint/typecheck/build/tests with Postgres, mobile tests with coverage floors, Expo Doctor, production iOS/Android bundle exports, and scheduled dependency-audit checks.
- **Container** — `server/Dockerfile` is a multi-stage node:22-alpine build (production dependencies only, root-owned application files, non-root `node` process, writable upload directory, dumb-init, and a liveness healthcheck).

For the smoke test (`npm run smoke`, server running with `MOCK_AI=true`), start the dev server with relaxed limits so the practice loop doesn't trip them:
`RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 ASSESS_IP_DAILY_CAP=100000 npm run dev`

## Mutation testing

Both packages pin Stryker 9.6.1 in their development dependencies, so a clean
`npm ci` installs the exact mutation toolchain. The app command mutates every
production `.ts` and `.tsx` file:

```bash
cd app
npm ci
npm run mutation
```

The server command deliberately uses two sequential lanes: executable
API/database code runs against the complete integration suite, while the large
authored question catalog in `db/seed-data.ts` runs against its dedicated
byte-for-byte artifact test. Give the server lane its own explicit-port loopback
database. The guard requires the database name to contain `mutation`, end in
`_test`, and differ from both the ordinary `ai_english_test` suite database and
the configured application database (including `server/.env`) before the test
harness may recreate it:

```bash
cd server
npm ci
TEST_DATABASE_URL=postgres://localhost:5432/ai_english_mutation_test npm run mutation
```

HTML and machine-readable JSON reports are written under
`reports/mutation/`. The server's executable-code and catalog reports are
separate so both results remain auditable.

## Deploying to production (checklist)

The API has no server-side session store. Assessment claims, quotas, and security-sensitive rate limits are coordinated in PostgreSQL, so API replicas can scale horizontally behind a load balancer within the database capacity budget.

1. **HTTPS only** — terminate TLS at your proxy/LB (nginx, CloudFront, ALB); set `TRUST_PROXY` to the exact proxy-hop count (never blanket `true`); HSTS is already on via helmet. Never expose the API over plain HTTP.
2. **Secrets and transport** — inject `JWT_SECRET` (≥32 random chars), `DATABASE_URL`, and `OPENAI_API_KEY` via your platform's secret manager. Never commit `.env`. Set `MOCK_AI=false`. The production PostgreSQL URL must use `sslmode=verify-full` with a trusted server certificate; the API refuses weaker database transport.
3. **Audio storage (S3)** — production requires `S3_BUCKET` (boot fails without it): the app uploads recordings through a short-lived, size-constrained presigned POST grant from `POST /uploads/audio-url`, and the API downloads each submitted object for assessment, then deletes it. Create a private bucket (block all public access), set `S3_REGION`, and grant the API identity only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/audio-uploads/*` — prefer an IAM task/instance role over `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`. Static credentials must be supplied as a complete pair; temporary credentials also set `S3_SESSION_TOKEN`. Configure a short S3 lifecycle expiration on the `audio-uploads/` prefix as a backstop for clients that upload but never submit an assessment, including requests rejected by an upstream/global limit before the API can read their object key. The native client does not require bucket CORS; reassess CORS if browser uploads are ever supported.
4. **Database** — use a managed, currently supported PostgreSQL 17/18 release. For an existing database, back up and verify a restore first, run the read-only `npm run db:preflight:prod`, then run exactly one `npm run db:migrate:prod` job followed by one `npm run db:catalog:prod` job from the built image before starting the new application version. Preflight is an upgrade check and expects the existing tables; the same migrate-then-catalog sequence initializes a fresh production database. The API refuses to listen, and `/ready` returns 503, unless packaged migration names/checksums, the required runtime table, and at least 100 published questions per CEFR level are present. Drain older replicas before the first rollout containing migration `006_assessment_request_claims.sql` (older binaries do not write the ownership column) or `008_practice_progress.sql` (older binaries do not maintain mastery rows); a fresh deployment applying the migrations before any API starts is safe. Do not use `db:setup` in a deploy. On later releases, run `db:catalog:prod` only when intentionally publishing reviewed question-content changes. Size the pool: `DB_POOL_MAX` × number of API replicas should stay under the Postgres `max_connections` budget (e.g. 20 × 4 replicas = 80).
5. **Multi-instance rate limiting** — migration `007_distributed_rate_limits.sql` provides the shared PostgreSQL fixed-window store. Monitor counter-table growth and database latency, and retain an upstream WAF/load-balancer limit for volumetric attacks that should not reach the application or database.
6. **Container** — build `server/Dockerfile`, run ≥2 replicas behind the LB, point `/health` and `/ready` at your orchestrator's probes.
7. **Backups & retention** — enable automated Postgres backups; submitted audio is deleted after assessment, the local janitor removes crash leftovers older than one hour, and the S3 lifecycle rule expires abandoned objects. Replay responses expire after 24 hours. `attempts` transcripts currently grow unbounded, so define and implement archival/deletion windows in the consumer privacy policy before launch.
8. **Observability (next step)** — logs are structured JSON; ship them to your log platform and add error tracking (Sentry) and metrics before launch.
9. **App builds** — build the mobile app with EAS Build pointing `EXPO_PUBLIC_API_URL` at the production HTTPS URL; enable EAS Update for OTA fixes.

Deliberately not built yet (roadmap): refresh-token rotation, WAF/DDoS protection, CDN for static content, multi-region DB, push notifications, upload virus scanning, Sentry/Datadog integration.
