# AI English Learning App (mobile)

Native iOS/Android Expo + React Native app for the AI English-speaking coach.
Users record spoken
answers to CEFR-leveled prompts (A1–C2) and get transcript-based AI feedback
from the backend in `../server`. The current assessment does not measure
pronunciation, accent, timing, or prosody. Content is tailored for native
speakers of Telugu, Hindi, Spanish, and Chinese (Simplified).

## Stack

- Expo SDK 57, TypeScript (strict)
- expo-router (file-based routing)
- @tanstack/react-query (server state)
- expo-audio (microphone recording, m4a/AAC via `RecordingPresets.HIGH_QUALITY`)
- expo-secure-store (auth token persistence)
- Hand-rolled StyleSheet UI (no UI kit)

Web is intentionally unsupported because this app requires native secure token
storage; browser persistence is not an accepted security fallback.

## Run

```bash
npm ci
npx expo start
```

Useful checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run mutation
npm run doctor
npm run audit:ci
```

`npm ci` installs the pinned Stryker 9.6.1 toolchain. `npm run mutation`
mutates every production `.ts` and `.tsx` file and writes HTML plus JSON reports
to `reports/mutation/`.

The backend must be running on port 4000.

### API URL

The app reads the API base URL from `EXPO_PUBLIC_API_URL`. Production builds
require an explicit HTTPS URL. Development builds can derive the Metro host or
fall back to the platform-specific emulator URL below; see `.env.example`.

- iOS Simulator: `http://localhost:4000`
- Android Emulator: `http://10.0.2.2:4000` (`localhost` is the emulator)
- Physical device: your development machine's LAN IP

For example, on a physical device:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.5:4000 npx expo start
```

(When unset and the app is served from Metro, the app also auto-derives the
dev machine's LAN IP from `expoConfig.hostUri` as a fallback.)

## Project structure

```
src/
  app/                  expo-router routes
    _layout.tsx         providers, protected Stack, focus bridge + error boundary
    +not-found.tsx      safe fallback for invalid or stale deep links
    index.tsx           gate: routes to login / diagnostic / practice
    (auth)/             login + signup (native-language picker)
    diagnostic.tsx      CEFR diagnostic test flow
    practice/
      index.tsx         mastery/revision question + answer mode + Recorder + help
      help.tsx          translations + example sentences for a question
      attempt.tsx       minimal practice mode; preserves English/native answer mode
      feedback.tsx      mastery, retry, silence, final, and native-result variants
    settings/
      change-password.tsx password rotation
      delete-account.tsx  destructive account-deletion confirmation
  components/
    Recorder.tsx        shared recorder used by diagnostic + practice
  lib/
    api.ts              API URL, Bearer requests, direct/S3 audio upload
    auth.tsx            SecureStore-backed auth context and cache isolation
    password-policy.ts  UTF-8-aware password rules shared by auth screens
    pending-assessment.ts durable interrupted-upload state machine
    practice-flow.tsx   session-scoped handoff from attempt to feedback
    types.ts            strict runtime parsers for API contracts
    params.ts           route-param helpers
    theme.ts            colors
```

## Backend contract

JSON, camelCase; `Authorization: Bearer <token>`. Before sending audio, the app
calls `POST /uploads/audio-url`. Production receives a short-lived,
size-constrained S3 multipart-POST grant, uploads the native file directly, then
POSTs `{questionId, requestId, audioKey}` to the assessment endpoint. Local
development receives `mode: direct` and sends multipart form data with file
field `audio`. The same UUID `requestId` identifies every retry of one logical
submission. API and upstream-provider error bodies are never shown directly to
users. Device-only secure storage records the owner, question, request, upload
stage, and user-scoped S3 key when applicable, allowing the app to reconcile an
interrupted handoff through authenticated `GET /assessments/:requestId`; the
server replay expires after 24 hours.

English practice responses report whether the word was mastered (score 75+),
and silence is returned as an explicit free-retry result. Native-language
practice uses `POST /practice/attempt/native`; it checks comprehension and
returns a model English answer but does not create an attempt or change mastery.
