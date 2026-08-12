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
- **Practice Question Screen** — prompt word, question, record button, help (?) button.
- **Help Screen** — word/question plus 3 example sentences, each in English and the user's native language; "Start Practice" enters Practice Mode.
- **Practice Mode** — word, question, record button only (no help, no translations).
- **Attempts** — max 3 per question: pass → next question; fail 3× → final feedback → next question.

## Prerequisites

- Node.js 22.13+ or 24.3+ and npm 10+
- PostgreSQL running locally (the SQL remains compatible with 14+, but use a currently supported 17/18 release for production)
- [Expo Go](https://expo.dev/go) on your phone, or an iOS Simulator / Android Emulator
- An OpenAI API key for real AI assessment (optional — mock mode works without it)

## Setup

### 1. Backend

```bash
cd server
npm ci
cp .env.example .env
# Set JWT_SECRET in .env, for example with: openssl rand -hex 32
npm run db:setup   # creates the ai_english database, applies schema, seeds 36 CEFR questions × 4 languages
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
3. **Practice**: read the prompt word + question, tap **?** for bilingual help and example sentences, **Start Practice**, record your answer.
4. Pass → next question. Fail → retry (up to 3 attempts) → final feedback → next question.

## API overview (server, port 4000)

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | JWT auth and all-device logout revocation |
| `POST /auth/change-password` · `DELETE /auth/account` · `GET /auth/me/data` | Password rotation (revokes old tokens), account deletion, cursor-paginated data export |
| `GET /diagnostic/next` · `POST /diagnostic/answer` | Diagnostic binary search (server tracks the served question) |
| `GET /assessments/:requestId` | User-scoped, no-store status/replay recovery for an interrupted assessment |
| `GET /practice/question` | Next practice question at user's level |
| `GET /practice/question/:id/help` | Bilingual help content (ETag + private caching) |
| `POST /practice/attempt` | Assess a recording; enforces 3-attempt rule |
| `GET /health` · `GET /ready` | Liveness / readiness (readiness pings the DB) |

See `server/.env.example` for all configuration knobs and `app/README.md` for the app.

## Server production hardening

- **Migrations** — schema lives in `server/db/migrations/`; applied filenames and checksums are tracked in `schema_migrations`, and an advisory lock serializes deploys. `npm run db:setup` is for initial/local setup. Production deploys run `npm run db:migrate:prod`; question content is updated separately with the idempotent `npm run db:seed:prod`, which preserves question IDs and user progress.
- **Config** — validated with zod at boot (`src/config.ts`); the server refuses to start without a real `JWT_SECRET` (≥32 chars) or `DATABASE_URL`. Runtime PostgreSQL statements and lock waits have bounded deadlines.
- **Logging & shutdown** — structured logs via pino with per-request IDs (`x-request-id` honored); graceful SIGTERM/SIGINT shutdown (HTTP → pool → exit, 10s force timer).
- **Security headers / TLS** — `helmet` defaults including HSTS. TLS is expected to terminate at the reverse proxy/load balancer in front of this service; set `TRUST_PROXY` to the exact number of trusted proxy hops so client IPs are correct.
- **CORS** — allowlist from `CORS_ORIGINS`; requests without an `Origin` header (mobile app, curl) always pass. No credentials.
- **Rate limits** — global 300/15min/IP, auth endpoints 20/15min/IP, assessment endpoints 20/hour/user (all tunable via `RATE_LIMIT_*`). **The store is in-memory** (the optional `rate-limit-postgresql` package does not exist on npm), so limits are per-process: if you run more than one API instance behind a load balancer, switch `src/rate-limit.ts` to a shared store.
- **Uploads** — 25MB cap, random UUID filenames, extension+MIME checks, then magic-byte sniffing (m4a/mp4/wav/mp3/ogg/webm/flac); spoofed files get a 415. Files are deleted after assessment; a boot-time janitor removes leftovers older than 1h.
- **Assessment guardrails** — atomic rolling-24-hour per-user and cross-account/provider budget caps (`ASSESS_DAILY_CAP`, `ASSESS_GLOBAL_DAILY_CAP`), bounded per-process AI concurrency (`AI_MAX_CONCURRENCY`), one OpenAI client, and a shared end-to-end provider deadline (`OPENAI_TIMEOUT_MS`).
- **Auth hardening** — bcrypt cost 12 (native `bcrypt`; it verifies existing bcryptjs `$2a$/$2b$` hashes), password policy min 8 + letter + number, HS256-pinned JWTs carrying `{sub, tv: token_version}`; logout and password change bump `token_version` and invalidate all previously issued tokens for the account.
- **Diagnostic anti-cheat** — `GET /diagnostic/next` records the served question; `POST /diagnostic/answer` rejects anything else with 409. Short, token-owned database claims serialize assessments across instances without holding a database connection during AI provider calls.
- **Tests & CI** — `npm test` runs vitest + supertest with enforced coverage floors against an auto-created loopback database whose name must end in `_test`; destructive setup refuses remote hosts and the configured app database. GitHub Actions runs server format/lint/typecheck/build/tests with Postgres and mobile lint/unit/type/Expo checks.
- **Container** — `server/Dockerfile` is a multi-stage node:22-alpine build (production dependencies only, root-owned application files, non-root `node` process, writable upload directory, dumb-init, and a liveness healthcheck).

For the smoke test (`npm run smoke`, server running with `MOCK_AI=true`), start the dev server with relaxed limits so the practice loop doesn't trip them:
`RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 npm run dev`

## Deploying to production (checklist)

The API has no server-side session store, and assessment claims/quotas are coordinated in PostgreSQL, so it can scale horizontally behind a load balancer. Shared infrastructure rate limiting is still required for more than one replica.

1. **HTTPS only** — terminate TLS at your proxy/LB (nginx, CloudFront, ALB); set `TRUST_PROXY` to the exact proxy-hop count (never blanket `true`); HSTS is already on via helmet. Never expose the API over plain HTTP.
2. **Secrets** — inject `JWT_SECRET` (≥32 random chars), `DATABASE_URL`, `OPENAI_API_KEY` via your platform's secret manager. Never commit `.env`. Set `MOCK_AI=false`.
3. **Audio storage (S3)** — production requires `S3_BUCKET` (boot fails without it): the app uploads recordings straight to S3 with short-lived presigned PUT URLs (`POST /uploads/audio-url`), and the API downloads each object for assessment, then deletes it. Create a private bucket (block all public access), set `S3_REGION`, and grant the API identity only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/audio-uploads/*` — prefer an IAM task/instance role over `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`. No CORS/lifecycle rules are needed: objects are deleted after assessment.
4. **Database** — use a managed, currently supported PostgreSQL 17/18 release. Back up and verify a restore first, run the read-only `npm run db:preflight:prod`, then run exactly one `npm run db:migrate:prod` job from the built image before starting the new application version. For the first rollout containing migration `006_assessment_request_claims.sql`, drain any older replicas that already use the migration-005 table before migrating; those binaries do not write the new ownership column. A fresh deployment that applies 005 and 006 together is safe. Do not use `db:setup` in a deploy. Run `npm run db:seed:prod` only when intentionally publishing question-content changes. Size the pool: `DB_POOL_MAX` × number of API replicas should stay under the Postgres `max_connections` budget (e.g. 20 × 4 replicas = 80).
5. **Multi-instance rate limiting** — limits are per-process (in-memory store). With >1 replica, switch `server/src/rate-limit.ts` to a shared store (Redis/Postgres-backed).
6. **Container** — build `server/Dockerfile`, run ≥2 replicas behind the LB, point `/health` and `/ready` at your orchestrator's probes.
7. **Backups & retention** — enable automated Postgres backups; audio files are deleted after assessment and the janitor removes crash leftovers older than one hour (nothing durable to back up there). Replay responses expire after 24 hours. `attempts` transcripts currently grow unbounded, so define and implement archival/deletion windows in the consumer privacy policy before launch.
8. **Observability (next step)** — logs are structured JSON; ship them to your log platform and add error tracking (Sentry) and metrics before launch.
9. **App builds** — build the mobile app with EAS Build pointing `EXPO_PUBLIC_API_URL` at the production HTTPS URL; enable EAS Update for OTA fixes.

Deliberately not built yet (roadmap): refresh-token rotation, WAF/DDoS protection, CDN for static content, multi-region DB, push notifications, upload virus scanning, Sentry/Datadog integration.
