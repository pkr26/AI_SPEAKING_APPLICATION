# AGENTS.md

Guidance for anyone (human or AI) working in this repo. Keep this file current when you change structure, commands, or conventions.

## Architecture

Monorepo, two packages:

- `server/` — Node + Express + TypeScript API (port 4000). PostgreSQL via `pg`, JWT auth, S3 presigned audio uploads (multer multipart fallback in dev/test), OpenAI Whisper transcription plus GPT transcript-based feedback. Entry: `server/src/index.ts`; app wiring in `server/src/app.ts`.
- `app/` — Expo React Native (SDK 57, expo-router, TanStack Query, expo-secure-store, expo-audio). All source lives under `app/src/` (routes in `app/src/app/`, shared code in `app/src/lib/` and `app/src/components/`); all tests live in `app/__tests__/`.

Contract between them: camelCase JSON everywhere; auth = `Authorization: Bearer <jwt>`. Audio upload is two-step: the app calls `POST /uploads/audio-url` with the recording's content type and either gets a size-constrained `{mode:'s3', uploadUrl, uploadFields, audioKey, contentType, expiresIn, maxBytes}` grant — it submits the signed multipart form straight to S3, then POSTs JSON `{questionId, requestId, audioKey}` to the assessment endpoint — or `{mode:'direct'}` (dev/test without `S3_BUCKET`), where it posts multipart with file field `audio` + UUID text fields `questionId` and `requestId`. In both modes `requestId` must be reused when retrying one logical submission, and the assessment-endpoint response contract is identical. The app persists the upload stage and S3 key in secure storage so an interrupted handoff can reconcile the same logical request. The app validates every grant as hostile input and only uploads to genuine AWS S3 hosts (`*.amazonaws.com`); an S3-compatible non-AWS provider must relax that pin deliberately. The app derives its base URL from `EXPO_PUBLIC_API_URL` (fallback: LAN IP from Expo hostUri, then platform-specific emulator URLs).

## Commands

Server (`cd server`):

- `npm run db:setup` — local/initial setup: create DB if missing, run checksummed migrations, idempotently seed 600 questions (100 per CEFR level)
- `npm run db:migrate` / `npm run db:migrate:prod` — migration-only development / compiled production commands; production then runs `npm run db:catalog:prod` to publish the reviewed idempotent question catalog. Deploys must not run `db:setup` (`setup`/`seed` hard-refuse when `NODE_ENV=production`).
- `npm run dev` — tsx watch; needs `.env` (see `.env.example`); `MOCK_AI=true` avoids OpenAI calls
- `npm test` — vitest + supertest with enforced coverage thresholds against auto-created `ai_english_test` DB
- `npm run format:check` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm test`
- `RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 ASSESS_IP_DAILY_CAP=100000 npm run dev` then `npm run smoke` — full e2e journey smoke test (needs relaxed limits)
- For the barrier-dispatched 10-user API journey, start a separate mock/direct-upload server with the full relaxed-limit recipe documented at the top of `server/scripts/concurrent-smoke.mjs`, then run `BASE_URL=http://localhost:4100 npm run smoke:concurrent`. Non-loopback targets require HTTPS and the explicit `ALLOW_NON_LOOPBACK_LOAD=true` safety opt-in.

App (`cd app`):

- `npx expo start` — run in Expo Go / simulator
- `npm run format:check` · `npm run lint` · `npm run typecheck` · `npm test` (with enforced coverage floors) · `npm run doctor`
- `npm run audit:ci` — reject new dependency advisories while the reviewed Expo/Metro upstream baseline remains
- `NODE_ENV=production EXPO_PUBLIC_API_URL=https://api.example.invalid npx expo export --platform ios` (and `android`) — production bundle validation

## Conventions

- **Migrations only for schema changes** — add `db/migrations/00N_name.sql`; never edit applied migration files.
- **Config** — all env access goes through `server/src/config.ts` (zod-validated at boot). Add new knobs there and in `.env.example`.
- **Validation** — every route validates body + params with zod via `validate()`; malformed UUIDs must 400, not 500.
- **Logging** — use the pino logger (`server/src/logger.ts`), never `console.*`; never log tokens, passwords, or secrets.
- **Errors** — throw `HttpError(status, message)`; the central handler shapes the response. Don't leak internals.
- **Rate limits** — new expensive endpoints must get a limiter in `server/src/rate-limit.ts`. Security-sensitive global/auth/login-account/password-account/register/assessment/assess-ip-daily/upload-grant counters use the shared PostgreSQL store in `server/src/postgres-rate-limit-store.ts`; keep namespaces stable across replicas and add migrations for store schema changes. The login-account limiter runs after JSON parsing, HMACs normalized email keys, and refunds successful responses. Credential budgets (login-account, password-account) never reject at the middleware: they flag the request and the route still verifies the password, so only failures are throttled and a saturated budget cannot lock out the real owner. Store `decrement`/`resetKey` are fail-safe by contract (express-rate-limit calls them fire-and-forget). `assess-ip-daily` bounds paid assessments per source IP per day so account re-registration cannot reset spend. The assess and assess-ip-daily limiters set `skipFailedRequests`, so ≥400 responses are refunded through the fail-safe `decrement` and malformed spam cannot drain paid budgets. S3 grants have a separate budget so grant issuance does not consume the paid assessment limiter.
- **Audio ingress** — production stores learner audio in S3 via size-constrained presigned POST forms (`server/src/audio-upload.ts`; `S3_BUCKET` required in production). Keys are `audio-uploads/{userId}/{uuid}.{ext}`, validated per-user before the API downloads them, and submitted objects are deleted after assessment. Production buckets also need a short lifecycle expiration for uploads abandoned before assessment submission. Local dev/test keeps the multer multipart flow (`server/src/upload.ts`); never make tests depend on real AWS. Startup and `/ready` must validate both configured `ffprobe` and `ffmpeg` executables. The duration gate first counts audio streams with ffprobe (machine-readable, over the same sandboxed `fd:` descriptor) and rejects anything but exactly one — do not replace this with `0:a?` into one PCM muxer, which only fails closed on some FFmpeg versions (8.x errors, 6.1 decodes) — and the MOV branch decodes with `-ignore_editlist 1` so a forged `elst` presentation window cannot shrink the measured audio. Keep both invariants so only duration-verified audio reaches the paid transcriber.
- **Money endpoints** — anything that calls OpenAI must go through the assess pipeline (daily cap + concurrency semaphore) — never call OpenAI directly from a route.
- **Practice algorithm** — word bank is 100 questions per CEFR level, authored in per-level modules under `server/db/seed-data/` (aggregated by `server/db/seed-data.ts`; never hand-edit generated `seed.sql`). Per-word mastery lives in `practice_progress` (migration 008): one English practice attempt scoring ≥ `MASTER_SCORE` (75, `server/src/practice.ts`) masters the word; mastered words never downgrade. `GET /practice/question` interleaves revision (learning words, oldest first) with new words — a session opens with revision when one is due, then buckets alternate based on the last attempt's kind; when the level is exhausted, mastered words cycle back as retention revisions. Silence (empty transcript) is a free retry: no `attempts` row, no progress write, attempt counter unmoved. `POST /practice/attempt/native` (mother-tongue mode) only checks comprehension and returns a model English answer — it never writes `attempts`/`practice_progress`; Whisper's language is always pinned from `users.native_language`, never from the client.
- **Native media work** — every FFmpeg decode must acquire the fail-fast `AUDIO_INSPECTION_MAX_CONCURRENCY` slot before spawning and release it on every outcome; do not queue unbounded decoder work.
- **Password policy** — min 8, letter + number; mirrored client-side via `passwordPolicyError()` in `app/src/lib/password-policy.ts`. Keep both in sync.
- **Recorder** — `app/src/components/Recorder.tsx` is the single shared recording component (spec requirement); do not fork it per screen.
- **TypeScript strict** in both packages; zero type errors is the bar for any change.
- Tests: add vitest coverage for any new endpoint; keep coverage thresholds and `scripts/smoke.mjs` passing. App component/hook tests use `@testing-library/react-native` v14 (devDependency) — its `render`/`fireEvent`/`act` APIs are fully async and must be awaited.
- **Mutation testing** — both packages pin Stryker in `devDependencies` (jest runner and concurrency 2 for app; vitest runner and concurrency 1 for server because server tests share one database). The server mutation run must set an explicit-port loopback `TEST_DATABASE_URL` whose database name contains `mutation`, ends in `_test`, and differs from both the ordinary `ai_english_test` suite database and the configured application database (including `server/.env`); the guard rejects unsafe targets before destructive setup. `npm run mutation` covers every production TypeScript file in either package. The server command has two explicit lanes: executable API/database code uses the full suite, then all authored `db/seed-data.ts` + `db/seed-data/*.ts` literals use `stryker.catalog.config.json` and a byte-for-byte catalog artifact test so static content mutants do not each rerun the integration suite. HTML and machine-readable JSON reports land in `reports/mutation/` (gitignored, as are `.stryker-tmp/` and `.stryker-catalog-tmp/`).

## Verification before calling work done

1. `cd server && npm run format:check && npm run lint && npm run typecheck && npm run build && npm test`
2. Smoke: server running with relaxed limits + `MOCK_AI=true` → `npm run smoke` exit 0
3. `cd app && npm run format:check && npm run lint && npm run typecheck && npm test && npm run doctor && npm run audit:ci`
4. In `app`, production-mode `expo export` for both `ios` and `android` with an explicit HTTPS `EXPO_PUBLIC_API_URL`
5. The server's full `npm audit --audit-level=high` must pass. In the app, `npm run audit:ci` is the authoritative reviewed-baseline gate; also record the raw `npm audit` result transparently.
6. When container files change, build and scan `server/Dockerfile` and exercise its healthcheck before release
7. For a full mutation campaign, run `cd app && npm run mutation`; then run `cd server && TEST_DATABASE_URL=postgres://localhost:5432/ai_english_mutation_test npm run mutation`. Record the executable-code and catalog results separately.
