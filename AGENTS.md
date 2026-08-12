# AGENTS.md

Guidance for anyone (human or AI) working in this repo. Keep this file current when you change structure, commands, or conventions.

## Architecture

Monorepo, two packages:

- `server/` — Node + Express + TypeScript API (port 4000). PostgreSQL via `pg`, JWT auth, S3 presigned audio uploads (multer multipart fallback in dev/test), OpenAI Whisper transcription plus GPT transcript-based feedback. Entry: `server/src/index.ts`; app wiring in `server/src/app.ts`.
- `app/` — Expo React Native (SDK 57, expo-router, TanStack Query, expo-secure-store, expo-audio). All source lives under `app/src/` (routes in `app/src/app/`, shared code in `app/src/lib/` and `app/src/components/`); all tests live in `app/__tests__/`.

Contract between them: camelCase JSON everywhere; auth = `Authorization: Bearer <jwt>`. Audio upload is two-step: the app calls `POST /uploads/audio-url` with the recording's content type and either gets `{mode:'s3', uploadUrl, audioKey}` — it PUTs bytes straight to S3, then POSTs JSON `{questionId, requestId, audioKey}` to the assessment endpoint — or `{mode:'direct'}` (dev/test without `S3_BUCKET`), where it posts multipart with file field `audio` + UUID text fields `questionId` and `requestId`. In both modes `requestId` must be reused when retrying one logical submission, and the assessment-endpoint response contract is identical. The app derives its base URL from `EXPO_PUBLIC_API_URL` (fallback: LAN IP from Expo hostUri, then platform-specific emulator URLs).

## Commands

Server (`cd server`):
- `npm run db:setup` — local/initial setup: create DB if missing, run checksummed migrations, idempotently seed 36 questions
- `npm run db:migrate` / `npm run db:migrate:prod` — migration-only development / compiled production commands; deploys must not run `db:setup`
- `npm run dev` — tsx watch; needs `.env` (see `.env.example`); `MOCK_AI=true` avoids OpenAI calls
- `npm test` — vitest + supertest with enforced coverage thresholds against auto-created `ai_english_test` DB
- `npm run lint` · `npm run typecheck` · `npm run format`
- `RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 npm run dev` then `npm run smoke` — full e2e journey smoke test (needs relaxed limits)

App (`cd app`):
- `npx expo start` — run in Expo Go / simulator
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run doctor`
- `npm run audit:ci` — reject new dependency advisories while the reviewed Expo/Metro upstream baseline remains

## Conventions

- **Migrations only for schema changes** — add `db/migrations/00N_name.sql`; never edit applied migration files.
- **Config** — all env access goes through `server/src/config.ts` (zod-validated at boot). Add new knobs there and in `.env.example`.
- **Validation** — every route validates body + params with zod via `validate()`; malformed UUIDs must 400, not 500.
- **Logging** — use the pino logger (`server/src/logger.ts`), never `console.*`; never log tokens, passwords, or secrets.
- **Errors** — throw `HttpError(status, message)`; the central handler shapes the response. Don't leak internals.
- **Rate limits** — new expensive endpoints must get a limiter in `server/src/rate-limit.ts`.
- **Audio ingress** — production stores learner audio in S3 via presigned PUT URLs (`server/src/audio-upload.ts`; `S3_BUCKET` required in production). Keys are `audio-uploads/{userId}/{uuid}.{ext}`, validated per-user before the API downloads them, and objects are deleted after assessment. Local dev/test keeps the multer multipart flow (`server/src/upload.ts`); never make tests depend on real AWS.
- **Money endpoints** — anything that calls OpenAI must go through the assess pipeline (daily cap + concurrency semaphore) — never call OpenAI directly from a route.
- **Password policy** — min 8, letter + number; mirrored client-side via `passwordPolicyError()` in `app/src/lib/auth.tsx`. Keep both in sync.
- **Recorder** — `app/src/components/Recorder.tsx` is the single shared recording component (spec requirement); do not fork it per screen.
- **TypeScript strict** in both packages; zero type errors is the bar for any change.
- Tests: add vitest coverage for any new endpoint; keep coverage thresholds and `scripts/smoke.mjs` passing. App component/hook tests use `@testing-library/react-native` v14 (devDependency) — its `render`/`fireEvent`/`act` APIs are fully async and must be awaited.
- **Mutation testing** — both packages carry a `stryker.config.json` (jest runner for app, vitest runner for server, concurrency 1 since tests share `ai_english_test`). Run with `npx stryker run` in either package; reports land in `reports/mutation/` (gitignored, as is `.stryker-tmp/`). Stryker packages are installed with `npm install --no-save` so manifests stay clean.

## Verification before calling work done

1. `cd server && npm run lint && npm run typecheck && npm test`
2. Smoke: server running with relaxed limits + `MOCK_AI=true` → `npm run smoke` exit 0
3. `cd app && npm run lint && npm run typecheck && npm test && npm run doctor && npm run audit:ci`
4. `npm audit` in both packages — no new vulnerabilities introduced beyond the explicitly reviewed mobile upstream baseline
