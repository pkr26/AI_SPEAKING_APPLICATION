# AI English Learning Application

An AI-powered English practice coach for native speakers of **Telugu, Hindi, Spanish, and Chinese**, organized by **CEFR levels** (A1–C2). Learners record answers; the backend transcribes them with OpenAI Whisper and gives GPT-4o-mini feedback on task relevance, grammar, coherence, and vocabulary visible in the transcript. Pronunciation, accent, timing, and prosody are not assessed.

## Project structure

```
├── app/      # Expo React Native app (TypeScript, expo-router)
└── server/   # Node.js + Express + PostgreSQL API (port 4000)
```

## Features

- **Auth** — email/password sign-up & login (JWT); mother tongue chosen at sign-up, with an independent English-default app-language preference.
- **Diagnostic Test** — a 2–3-answer binary search over CEFR levels places new users at the right level; silence is a free retry and the final transcript/feedback reveal remains available until acknowledged.
- **Practice Question Screen** — prompt word, question, new/revision status, mastery progress, record button, help (?) button, and English/native-language answer mode.
- **Help Screen** — word/question plus 3 example sentences, each in English and the user's native language; "Start Practice" preserves the selected answer mode.
- **Practice Mode** — word, question, answer-mode control, and record button only (no translations or examples).
- **Mastery and retries** — one durable serving cycle gives a learner three spoken tries shared across English and mother-tongue mode; silence is free. English 75+ masters a word. Native tries persist the original transcript, its immutable submission-language snapshot, faithful English translation, comprehension feedback, and a separate example answer without changing English mastery.
- **Optional owned recordings** — audio is transient by default. During review, learners can explicitly turn on **Save this recording** for that take; only those successful S3 submissions are mapped to the learner, request, question, context, and optional scored attempt in PostgreSQL for private replay, local-file sharing, and single or bulk deletion in History/Recordings. Scores, transcripts, and feedback are kept either way.
- **Ads prepared but disabled** — Home/History contain fail-closed AdMob surfaces, but `/client-config` hard-disables them until a reviewed per-account adult-eligibility flow exists.

## Prerequisites

- Supported Node.js 22 (22.13+) or Node.js 24 (24.3+) and npm 10+
- PostgreSQL running locally (the SQL remains compatible with 14+, but use a currently supported 17/18 release for production)
- FFmpeg available on `PATH` for decoded audio validation (or set `FFMPEG_PATH`)
- [Expo Go](https://expo.dev/go) for ad-disabled JavaScript flows, or an iOS Simulator / Android Emulator with an Expo development build for native AdMob testing
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

The Google Mobile Ads dependency contains native code. Ads stay disabled when the API policy is off, but testing real consent/ad components requires a rebuilt development client; Expo Go cannot supply that native module. Development uses Google's sample app IDs and test ad-unit IDs only. Production config evaluation refuses to build unless `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`, and distinct platform-specific `EXPO_PUBLIC_ADMOB_{ANDROID|IOS}_{HOME_BANNER|HISTORY_NATIVE}_ID` values are valid non-sample IDs.

- **iOS Simulator:** use `http://localhost:4000`. **Android emulator:** use `http://10.0.2.2:4000` via `EXPO_PUBLIC_API_URL`.
- **Physical phone (Expo Go):** phone and computer must be on the same Wi-Fi. The app auto-derives your computer's LAN IP from Expo's host URI, so it usually just works. To set it explicitly:

```bash
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 npx expo start
```

## First-run flow

1. Sign up (pick the app language and mother tongue independently; the app language defaults from the device) → you're taken straight to the **Diagnostic Test**.
2. Answer the spoken questions → your CEFR level is assigned.
3. **Practice**: read the prompt word + question, choose English or your native language, and optionally tap **?** for bilingual help and examples before recording.
4. Every successfully processed, non-silent English or mother-tongue answer uses one of the same 3 tries; silence is free. English 75+ masters the word. Mother-tongue mode checks understanding, shows the original transcript, a faithful English translation, and a separate model English answer without changing mastery. After try 3 the cycle moves on. Mastered words return on a spaced-repetition schedule (1/3/7/21/60 days; an English failure demotes one), and mastering 85% of a level promotes you to the next CEFR level.

## API overview (server, port 4000)

| Endpoint                                                                          | Purpose                                                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | JWT auth and all-device logout revocation                                                                           |
| `POST /auth/change-password` · `DELETE /auth/account` · `GET /auth/me/data`       | Password rotation (revokes old tokens), account deletion, cursor-paginated data export                              |
| `POST /auth/forgot-password` · `POST /auth/reset-password`                        | Anti-enumeration reset (always 204; hashed 30-min single-use code via log/webhook mailer; reset revokes all tokens) |
| `PATCH /auth/me`                                                                  | Independently update profile name, mother tongue, and app UI language                                               |
| `GET /client-config`                                                              | Public, fail-closed policy; ad placements remain hard-disabled pending adult eligibility                            |
| `GET /diagnostic/next` · `POST /diagnostic/answer`                                | Diagnostic binary search (server tracks the served question)                                                        |
| `POST /diagnostic/restart`                                                        | Confirmed placement retake: resets level/diagnostic state, keeps all history                                        |
| `POST /diagnostic/acknowledge`                                                    | Durably acknowledges the completed placement reveal before Home unlocks                                             |
| `POST /uploads/audio-url`                                                         | Endpoint-bound direct marker or signed diagnostic/practice S3 upload grant                                          |
| `GET /assessments/:requestId`                                                     | User-scoped, no-store status/replay recovery for an interrupted assessment                                          |
| `GET /practice/question`                                                          | Resume/create the server-owned practice assignment and shared three-try `cycleId`                                   |
| `GET /practice/question/:id/help`                                                 | Bilingual help content (ETag + private caching)                                                                     |
| `POST /practice/attempt`                                                          | Cycle-bound scored English try; may master/promote and closes on pass or try three                                  |
| `POST /practice/attempt/native`                                                   | Cycle-bound mother-tongue try with transcript/translation; never changes English mastery                            |
| `POST /practice/skip`                                                             | Cycle-bound park for 7 days, closing the assignment (retention unaffected)                                          |
| `GET /practice/history`                                                           | Keyset-paginated attempt history, newest first, questions joined                                                    |
| `GET /practice/stats`                                                             | Home stats using the validated learner IANA time zone, including English/native spoken tries                        |
| `GET /recordings` · `POST /recordings/:id/playback-url`                           | Owner-only retained-audio library and short-lived S3 playback capability                                            |
| `DELETE /recordings` · `DELETE /recordings/:id` · `GET /recordings/export`        | Idempotent owner bulk/single deletion and separately paginated storage-secret-free metadata export                  |
| `GET /health` · `GET /ready`                                                      | Liveness / migration, catalog, database, FFmpeg, and retained-S3-policy readiness                                   |

See `server/.env.example` for all configuration knobs and `app/README.md` for the app.

Every error response is `{ error: string, code: string, ...extras }` where `code` is a stable
machine-readable identifier (e.g. `VALIDATION_FAILED`, `RATE_LIMITED`, `DAILY_LIMIT`,
`ASSESSMENT_IN_PROGRESS`, `PROVIDER_TIMEOUT`, `INTERNAL`) that clients map to localized copy;
whenever the body carries `retryAfterSeconds`/`retryAfterHours`, the same hint is advertised in a
standard `Retry-After` header (seconds). Production enforces `1.1.0` as the minimum for this
practice-cycle-aware release even when `MIN_CLIENT_VERSION` is blank, and honors any higher configured
minimum. Requests whose `X-Client-Version` parses lower are rejected with
`426 { code: 'CLIENT_UPGRADE_REQUIRED' }`; response contracts are otherwise additive-only.

The app requests an audio destination with
`{contentType, assessmentEndpoint}`. The S3 response contract is
`{mode:'s3', assessmentEndpoint, uploadUrl, uploadFields, audioKey, contentType, expiresIn, maxBytes}`.
The server alone maps diagnostic requests to `S3_DIAGNOSTIC_BUCKET` and both
practice endpoints to `S3_PRACTICE_BUCKET`; keys are scoped as
`audio-uploads/{diagnostic|practice}/{userId}/{uuid}.{ext}`. The app validates
the echoed endpoint and entire grant, submits `uploadFields` plus the native
file as a multipart form, and reuses `audioKey` plus the immutable per-request
`retainRecording` choice when it submits or recovers the assessment. New app
submissions default that choice to `false`; the server treats a missing field
from an older client as `true`. Development/test deployments with both split buckets empty return
`{mode:'direct', assessmentEndpoint}` instead.

Only a successful S3 assessment submitted with `retainRecording=true` additively includes `recordingId`. Its exact S3 version is inserted into `recordings` in the same transaction as the durable assessment response, then retagged from policy-bound `retention=transient` to `retention=retained`. The app never receives bucket, key, version, or credentials. Playback and sharing lazily consume a short-lived owner-authorized URL into an app-owned cache file; the OS share sheet receives only that local file URI, and the temporary copy is removed on every terminal/lifecycle path. Opt-out, failed, rejected, abandoned, unbound, and delete-all-fenced uploads remain transient; successful owners that are not retained are deleted best-effort after checking. Bulk deletion atomically advances a per-user epoch and coalesces one durable owner-cleanup job, immediately hiding older metadata and fencing provider work. Maintenance then deletes hidden metadata in fair bounded batches, whose existing row trigger creates one durable exact-object deletion job per recording. Single recording and account deletion create the same exact-object jobs directly; the leased worker repeatedly removes every version and delete marker for each key.

## Server production hardening

- **Migrations** — schema lives in `server/db/migrations/`; applied filenames and checksums are tracked in `schema_migrations`, and an advisory lock serializes deploys. `npm run db:setup` is for initial/local setup. Production deploys run `npm run db:migrate:prod`, then publish reviewed question content with the idempotent `npm run db:catalog:prod`, which preserves question IDs and user progress. Migrations 022/023 require old traffic and in-flight requests to be fully drained before migration. Migration 023 additionally installs a verified manifest cutover fence that makes any missed pre-023 straggler fail `/ready`; it is a fail-safe, not the first drain signal.
- **Config** — validated with zod at boot (`src/config.ts`); the server refuses to start without a real `JWT_SECRET` (≥32 chars) or `DATABASE_URL`. Runtime PostgreSQL statements and lock waits have bounded deadlines.
- **Logging & shutdown** — structured logs via pino with per-request IDs (`x-request-id` honored); graceful SIGTERM/SIGINT shutdown: new connections stop, idle keep-alive sockets are severed, in-flight OpenAI calls are aborted so their routes unwind through the normal error paths, then HTTP → pool → exit under a `SHUTDOWN_DRAIN_MS` force timer (default 140s, deliberately above the 130s worst-case request budget).
- **Security headers / TLS** — `helmet` defaults including HSTS. TLS is expected to terminate at the reverse proxy/load balancer in front of this service; set `TRUST_PROXY` to the exact number of trusted proxy hops so client IPs are correct.
- **CORS** — allowlist from `CORS_ORIGINS`; requests without an `Origin` header (mobile app, curl) always pass. No credentials.
- **Rate limits** — global 300/15min/IP, credential endpoints 20/15min/IP, registration 10/hour/IP, failed logins 10/15min/normalized-email across source IPs, password-confirmation routes (change-password, account deletion) 10/15min/account, bulk recording deletion 10/15min/account in its own namespace, assessment endpoints 20/hour/user plus a fixed-window daily budget per source IP (`ASSESS_IP_DAILY_CAP`, default 300), production S3 grant issuance 40/hour/user, and owner playback/share grants 60/15min/user (all tunable via `RATE_LIMIT_*`). Credential budgets throttle only failures: over-budget requests still verify the password, so a saturated budget can never lock out the real owner, and successes are refunded. Upload/playback budgets are separate from paid assessment limits. Security-sensitive counters use PostgreSQL fixed windows shared across API replicas; raw IPs, user IDs, and email targets are HMACed before storage. An hourly janitor removes expired counter rows. The coarse global limiter is the exception: with `RATE_LIMIT_GLOBAL_STORE=memory` (the default) each replica enforces its own in-process budget — `RATE_LIMIT_GLOBAL_MAX` is per replica and floods never write counter rows — while `postgres` opts into one shared cluster-wide budget; keep an upstream WAF/edge limit for volumetric attacks in either mode.
- **Uploads and retention** — 25MB cap, random UUID filenames, extension+MIME checks, magic-byte sniffing, then resource-bounded FFmpeg decoding with sample-count duration plus conservative peak/RMS checks to reject malformed, silent/near-zero, sub-0.5-second, and over-two-minute media before paid AI work. Native decoders have an independent fail-fast per-process cap (`AUDIO_INSPECTION_MAX_CONCURRENCY`, default 4). Production S3 POST policy binds new objects to `retention=transient`; only transactionally completed assessments whose learner explicitly chose retention are promoted to `retention=retained`. Retention and permanent deletion use bounded, leased, indefinitely retrying workers. Startup/readiness require versioning and reject any enabled expiration rule that could apply outside the exact transient tag. The local-upload janitor still removes disk leftovers older than 1h; direct local audio is not retained.
- **Assessment guardrails** — atomic rolling-24-hour per-user and cross-account/provider budget caps (`ASSESS_DAILY_CAP`, `ASSESS_GLOBAL_DAILY_CAP`), a fixed-window per-source-IP daily budget that survives account re-registration (`ASSESS_IP_DAILY_CAP`), bounded per-process AI concurrency (`AI_MAX_CONCURRENCY`), one OpenAI client, and a shared end-to-end provider deadline (`OPENAI_TIMEOUT_MS`). Multi-track audio containers are rejected at the inspection gate so only duration-verified audio reaches the paid transcriber.
- **Auth hardening** — bcrypt cost 12 (native `bcrypt`; it verifies existing bcryptjs `$2a$/$2b$` hashes), password policy min 8 + letter + number, HS256-pinned JWTs carrying `{sub, tv: token_version}`; logout and password change bump `token_version` and invalidate all previously issued tokens for the account.
- **Diagnostic anti-cheat** — `GET /diagnostic/next` records the served question; `POST /diagnostic/answer` rejects anything else with 409. Short, token-owned database claims serialize assessments across instances without holding a database connection during AI provider calls.
- **Metrics** — set `METRICS_ENABLED=true` to expose Prometheus metrics at `GET /metrics` (404 when disabled, the default) — request/provider latency histograms, pool/AI/inspection-slot gauges, shed-request and janitor counters — and scrape it privately only (network policy or ingress rule); never expose it to the public internet.
- **Tests & CI** — `npm test` runs vitest + supertest with enforced coverage floors against an auto-created loopback database whose name must end in `_test`; destructive setup refuses remote hosts and the configured app database. GitHub Actions runs server format/lint/typecheck/build/tests with Postgres, mobile tests with coverage floors, Expo Doctor, production iOS/Android bundle exports, and scheduled dependency-audit checks.
- **Container** — `server/Dockerfile` is a multi-stage node:22-alpine build (production dependencies only, root-owned application files, non-root `node` process, writable upload directory, dumb-init, and a liveness healthcheck).

For the smoke test (`npm run smoke`, server running with `MOCK_AI=true`), start the dev server with relaxed limits so the practice loop doesn't trip them:
`RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 ASSESS_IP_DAILY_CAP=100000 npm run dev`

Credentialed split-S3/OpenAI acceptance is deliberately separate from ordinary tests. Against an authorized nonproduction server and synthetic audio, run `ALLOW_LIVE_S3_TEST=true AUDIO_FILE=/absolute/path/to/audio.m4a npm run smoke:s3`. This creates real provider traffic, database rows, and temporary S3 objects, so review `server/scripts/live-s3-smoke.mjs` and use explicit cost/side-effect approval first.

## Backups and restore (runbook)

PostgreSQL and the two private S3 buckets are stateful services. PostgreSQL contains the authoritative recording ownership/mapping; S3 contains the matching encrypted audio versions. A database-only restore can therefore reference objects that were deleted later, while an S3-only restore cannot safely reconstruct ownership.

- **Cadence** — enable your platform's automated daily snapshots plus WAL/point-in-time recovery
  where available. Additionally take a logical dump before every migration deploy and before any
  `db:catalog:prod` content publish. Retain dumps for at least 30 days.
- **Dump** (custom format, safe while the API is live):
  `pg_dump --format=custom --no-owner --file=ai_english_$(date +%Y%m%dT%H%M%S).dump "$DATABASE_URL"`
- **Restore** (into an empty database; never restore over a live one):
  `createdb ai_english_restore && pg_restore --no-owner --dbname=postgres://.../ai_english_restore ai_english_<timestamp>.dump`
  then point a staging API at it and check `/ready` before switching traffic.
- **Verify restores quarterly** — a backup that has never been restored is a hope, not a backup.
- **S3 recovery** — enable versioning (required at readiness), encryption, access logging, and an approved backup/replication policy for retained objects. Restore database and S3 to a mutually consistent recovery point, then reconcile every `recordings` row against its exact version before serving playback.
- **Migrations are forward-only** — applied files are checksummed in `schema_migrations` and must
  never be edited or reverted; there are no down migrations. To undo a schema mistake, roll forward
  with a new migration (restore from backup only for data disasters, not schema course corrections).

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
3. **Audio storage (S3)** — production requires distinct `S3_DIAGNOSTIC_BUCKET`/`S3_DIAGNOSTIC_REGION` and `S3_PRACTICE_BUCKET`/`S3_PRACTICE_REGION` pairs (boot fails if either pair is missing or both names are equal). Enable versioning on both private, encrypted, public-access-blocked buckets. Configure expiration of current and noncurrent versions with one exact object-tag filter `retention=transient`; any broad/prefix/extra-condition expiration rule is rejected because it could delete retained learner audio. Grant the API only the required prefix/object and bucket-control actions: `s3:PutObject`, `s3:GetObject`, `s3:GetObjectVersion`, `s3:DeleteObject`, `s3:DeleteObjectVersion`, `s3:PutObjectTagging`, `s3:PutObjectVersionTagging`, `s3:ListBucketVersions`, `s3:GetBucketVersioning`, and `s3:GetLifecycleConfiguration`. Prefer an IAM role over static credentials. Native iOS/Android playback/upload does not require bucket CORS; browser support does. Test assessment → retained tag → authorized playback → recording/account deletion → all versions absent before production rollout.
4. **Database** — use a managed, currently supported PostgreSQL 17/18 release. For an existing database, back up and verify a restore first, run the read-only `npm run db:preflight:prod`, remove every old API replica from traffic, and wait for all in-flight requests/provider work to drain. Only then run exactly one `npm run db:migrate:prod` job followed by one `npm run db:catalog:prod` job from the built image, and start/admit only current replicas. This non-rolling sequence is mandatory for migrations 022/023: otherwise an old in-flight native claim can lose its exact language snapshot, or an old recording read can ignore a generation deletion. Preflight is an upgrade check and expects the existing tables; it fails with operator-readable repair details when legacy rows violate migration invariants, the recording-privacy fence is inconsistent, or the catalog is not exactly 100 app-parseable questions per CEFR level. The same migrate-then-catalog sequence initializes a fresh production database. The API refuses to listen, and `/ready` returns 503, unless packaged migration names/checksums, required cutover fences, the required runtime table, and that same exact well-formed inventory are present. Drain older replicas before the first rollout containing migration `006_assessment_request_claims.sql` (older binaries do not write the ownership column), `008_practice_progress.sql` (older binaries do not maintain mastery rows), `018_practice_serving_cycles.sql` (older binaries omit the required cycle identity and response version), or `021_recording_retention_epoch.sql` (older binaries neither snapshot nor enforce the delete-all cutoff); a fresh deployment applying the migrations before any API starts is safe. Migration 018 keeps incompatible unexpired legacy practice/native and empty-transcript diagnostic completions as non-replayable tombstones until the normal 48-hour janitor expiry, returning `409 ASSESSMENT_RESULT_INCOMPATIBLE` so neither a malformed replay nor duplicate paid work can occur; compatible voiced diagnostic responses remain replayable. Migration 022 restarts incomplete legacy diagnostic runs containing counted silence and snapshots the language of every native attempt/replay. Migration 023 snapshots recording generations, adds the coalescing bounded bulk-cleanup queue, and inserts a verified `000_` manifest fence that makes any missed pre-023 binary fail its positional `/ready` check after migration. The fence is a fail-safe for stragglers, not permission to apply the migration before the explicit drain; a routing check against liveness-only `/health` (including the image's Docker HEALTHCHECK) is not a substitute. Migrations 022/023 include compatibility writer triggers, but those triggers cannot repair an old native claim's missing exact snapshot or make old recording reads generation-aware. Apply migration `020_assessment_recording_retention_choice.sql` before starting the API code that reads its new column; older API replicas remain compatible during that database-first window because omitted choices use the column's `true` default. Migration 021 snapshots a monotonic user epoch into each new assessment claim and advances the user value with bulk recording deletion, so an older in-flight retain request finishes with assessment text but no retained audio. Deploy the new API before publishing the default-off mobile build, since an older strict request schema does not accept its new field. Do not use `db:setup` in a deploy. On later releases, run `db:catalog:prod` only when intentionally publishing reviewed question-content changes. Size the pool: `DB_POOL_MAX` × number of API replicas should stay under the Postgres `max_connections` budget (e.g. 20 × 4 replicas = 80).
5. **Multi-instance rate limiting** — migration `007_distributed_rate_limits.sql` provides the shared PostgreSQL fixed-window store used by every security-sensitive limiter. The coarse global limiter defaults to `RATE_LIMIT_GLOBAL_STORE=memory` (per-replica budget, no database write per request); switch it to `postgres` only if you need one cluster-wide global budget. Monitor counter-table growth and database latency, and retain an upstream WAF/load-balancer limit for volumetric attacks that should not reach the application or database.
6. **Container & horizontal scaling** — build `server/Dockerfile`, run ≥2 replicas behind the LB, point `/health` and `/ready` at your orchestrator's probes. `AI_MAX_CONCURRENCY` is a **per-process** semaphore: divide the OpenAI account's concurrency budget by the replica count (e.g. a 40-request provider budget across 4 replicas → `AI_MAX_CONCURRENCY=10` on each). The daily caps and rate limits live in PostgreSQL and are already cluster-wide — never divide those. DB janitors coordinate through advisory locks, so extra replicas do not duplicate cleanup work.
7. **Backups & retention** — enable coordinated Postgres and retained-S3 backup/restore. Only successful audio the learner explicitly chose to save remains until they delete that recording or account; opt-out and abandoned/failed uploads retain the transient tag and expire through the exact-tag lifecycle, while the deletion outbox retries full version sweeps for saved recordings. Completed replay responses expire after 48 hours. Define transcript/recording retention and legal-hold policy in the reviewed consumer privacy policy before launch.
8. **Observability** — logs are structured JSON; ship them to your log platform and add error tracking (Sentry) before launch. Prometheus metrics are built in: enable `METRICS_ENABLED=true` and scrape `GET /metrics` from a private network only.
9. **App builds, store links, and ads** — inject the final numeric `apps.apple.com` listing as `EXPO_PUBLIC_IOS_APP_STORE_URL` and the `com.aienglish.coach` Play listing as `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`; production config fails closed without both because an exact first-party `426 CLIENT_UPGRADE_REQUIRED` opens a non-dismissible update overlay. Native AdMob requires a development/store build, not Expo Go. Inject real platform app IDs and Home/History unit IDs at build time; nonproduction code always uses Google test IDs. Public placements are hard-disabled until a reviewed, per-account adult-eligibility flow is implemented. `ADS_ENABLED`, `ADS_AUDIENCE_MODE`, and the placement flags are reserved for that future rollout and cannot currently enable ads; config/network/consent failure remains an additional fail-closed layer. See `reports/admob-monetization-strategy-2026-08-25.md`.

Deliberately not built yet (roadmap): refresh-token rotation, WAF/DDoS protection, CDN for static content, multi-region DB, push notifications, upload virus scanning, Sentry/Datadog integration.
