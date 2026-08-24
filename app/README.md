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

`npm ci` installs the pinned Stryker 9.6.1 toolchain.

### Mutation campaign

`npm run mutation` mutates every production `.ts`/`.tsx` file. It fails unless
every mutant is Killed or Timeout, or an otherwise unresolved mutant has been
proven unkillable and written down. Unresolved includes Survived, NoCoverage,
Ignored, CompileError, RuntimeError, and Pending. Stryker's own score excludes
some of those statuses and has no notion of a reviewed exemption, so the merged
report is re-checked against that stricter rule and Stryker's own break
threshold is disabled.

Equivalent mutants — ones no test could ever kill, such as a `typeof` guard that
exists only to narrow a type — are recorded in `scripts/mutation-equivalents.mjs`
with the reasoning for each. Entries match on file, mutator, replacement,
mutated source text, and Stryker's exact start/end node location. Every expected
mutant has a mechanically pinned span, so even a one-for-one survivor swap on
the same source line makes both the new mutant unexplained and the old exemption
stale. The gate fails both on a survivor that matches no entry _and_ on an entry
that matches nothing, so an exemption cannot outlive or drift away from the code
it excused. Refresh spans only from a fresh full campaign after reviewing the
survivors again. A `// Stryker disable` directive is not an exemption: it
produces Ignored mutants, which the strict gate rejects unless they are
explicitly reviewed. Keep exemptions in the allowlist, where their scope and
continued relevance are validated.

The campaign runs as lanes rather than one Stryker invocation.
`scripts/mutation-lanes.mjs` assigns each source file to exactly one lane and
names the test files that own it; the manifest fails closed when a source or
test file is added, renamed, or assigned twice, so new code cannot silently skip
the campaign. `scripts/run-mutation.mjs` runs the lanes, then
`scripts/merge-mutation-reports.mjs` validates each lane report against the
manifest and merges them into `reports/mutation/app.{json,html}` plus
`app-summary.json`. `npm run test:mutation-tooling` covers that tooling itself.
Each successful lane also writes a provenance sidecar. A partial run may reuse
an unselected lane only when that sidecar proves its toolchain, runtime,
environment, source, and owning tests still match the current workspace. A
missing or stale sidecar makes the merge fail closed and names the lane to
rerun. Every production source file is a shared input because one lane can
execute code owned by another: changing any production source or shared
mutation-execution input requires a full campaign. An owning-test-only change
may be handled by rerunning every lane that names that test. The reviewed
equivalence registry is deliberately separate from execution provenance:
changing it permits rerunning
`node scripts/merge-mutation-reports.mjs` against the still-current lane
reports, without repeating Stryker. `app-summary.json` records a deterministic
fingerprint of the exact merger and equivalence policy that produced its strict
gate result. Source, test, Stryker config, dependency, lane runner, and Recorder
pass-runner/pass-merger changes still invalidate the affected execution report.
The app merger and its transitive policy-fingerprint helper also remain
execution inputs because the Recorder runner imports the merger's workspace
validator and HTML renderer while publishing canonical lane artifacts.

The runner also rejects duplicate lane arguments and uses the app-root
`.mutation-campaign.lock` to keep independent processes from colliding even
when they select different report directories. Locks are never reclaimed
automatically because an orphan Stryker child may still be active even after
the recorded parent exits. After an interrupted run, verify that neither the
recorded parent nor any Stryker child is alive before removing the lock
manually. Invalid locks fail closed in the same way.

Two settings in `stryker.lane.config.mjs` are load-bearing and explained in
full there: each lane pins jest's `testMatch` (Stryker's `testFiles` only
reaches the dry run, not the mutant runs), and `coverageAnalysis` is `all`
rather than `perTest` because module-level memoisation — `createThemedStyles`,
the i18n device-language cache, the API token snapshot — makes "which tests
executed the mutated line" the wrong question.

Useful knobs:

```bash
npm run mutation:lanes:verify          # manifest only, no mutants
node scripts/run-mutation.mjs ui types # re-run named lanes; reuse only current reports
MUTATION_PARALLEL_LANES=3 MUTATION_CONCURRENCY=2 npm run mutation
```

The mutation tests mock network access and do not need the backend. Running the
app against the local API does require the backend on port 4000.

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
server replay expires after 48 hours.

English practice responses report whether the word was mastered (score 75+),
and silence is returned as an explicit free-retry result. Native-language
practice uses `POST /practice/attempt/native`; it checks comprehension and
returns a model English answer but does not create an attempt or change mastery.
