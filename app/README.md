# AI English Learning App (mobile)

Native iOS/Android Expo + React Native app for the AI English-speaking coach.
Users record spoken
answers to CEFR-leveled prompts (A1–C2) and get transcript-based AI feedback
from the backend in `../server`. The current assessment does not measure
pronunciation, accent, timing, or prosody. Content is tailored for native
speakers of Telugu, Hindi, Spanish, and Chinese (Simplified).

Audio is temporary by default. While reviewing a completed take, the learner
can explicitly enable **Save this recording** for that submission. The durable
handoff preserves the choice across direct/S3 posts, retries, and recovery;
scores, transcripts, and feedback are kept whether or not the audio is saved.
Saved recordings can be replayed, shared through a temporary app-owned local
file, deleted individually, or deleted together from Settings without removing
their assessment results.

## Stack

- Expo SDK 57, TypeScript (strict)
- expo-router (file-based routing)
- @tanstack/react-query (server state)
- expo-network (native reachability + React Query pause/resume)
- expo-audio (microphone recording, m4a/AAC via `RecordingPresets.HIGH_QUALITY`)
- expo-secure-store (auth token persistence)
- Hand-rolled StyleSheet UI (no UI kit)

Web is intentionally unsupported because this app requires native secure token
storage; browser persistence is not an accepted security fallback.

AdMob also requires a native development/release build; it is not supported by
Expo Go. Development builds use Google's official sample app/unit IDs. A
production config evaluation fails unless the two owner app IDs and four
platform/placement unit IDs documented in `.env.example` are valid, unique,
and not Google sample IDs. The current `/client-config` release guard hard-disables
every placement regardless of operator flags; UMP consent remains an additional
fail-closed prerequisite for a future reviewed rollout.

## Run

```bash
npm ci
npx expo start
```

The cycle-aware mobile contract is release `1.1.0` (`app.json`, `package.json`,
and `package-lock.json` stay aligned); its iOS build number and Android version
code are both `2`. Production API deployments must reject earlier app versions.
An exact `426 CLIENT_UPGRADE_REQUIRED` response from the first-party API latches
a non-dismissible update overlay without unmounting the active route. Production
builds must inject both store URLs from `.env.example`; until a real numeric iOS
App Store ID exists, nonproduction builds use a safe App Store search fallback.

Useful checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run mutation
npm run mutation:conditional-rendering
npm run mutation:event-handling
npm run mutation:accessibility
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

Stryker 9.6.1 does not force a ternary selector when its predicate is a plain
identifier, member access, call, unary expression, or another non-boolean
operator expression. That leaves React branches such as
`focused ? <Ad /> : null` outside the general campaign. Run
`npm run mutation:conditional-rendering` for the required supplement. It finds
every otherwise-unmutated ternary whose result is inside JSX or whose arm is
JSX/`null`, instruments test transforms only, then runs the owning lane tests
with each predicate forced to `true` and `false` in separate Jest processes.
It never rewrites production source. Its gate is deliberately stricter than
the general campaign: every forced mutant must be Killed by an assertion;
Survived, Error, and Timeout all fail. Reports are written to
`reports/mutation/conditional-rendering/conditional-rendering.{json,md}`.

The supplemental runner validates the lane manifest, pins its discovery count
in tooling tests, verifies exact true/false result identity, runs a clean
baseline first, and hashes every production source, owning test, campaign
tool/config file, installed tool version, runtime, and behavior-affecting
environment before and after execution. It shares `.mutation-campaign.lock`
with Stryker, removes prior canonical reports before starting, and publishes
JSON last as the complete-report marker. The weekly mutation workflow runs the
general campaign and all three supplements independently, so a failure or
timeout in one cannot hide the other reports.

Stryker also mutates callback bodies but does not disconnect an individual JSX
callback prop, and it does not remove an individual React Native accessibility
attribute. The mode-driven JSX attribute supplement covers those blind spots
without rewriting production source:

- `npm run mutation:event-handling` replaces each authored JSX `onX` callback
  value with a variadic no-op while leaving the prop present.
- `npm run mutation:accessibility` removes each authored `accessible`,
  `accessibility*`, or `importantForAccessibility` prop from its element.

Each site runs only its lane-owned Jest files after one clean union baseline.
Only a failed assertion kills a mutant; runtime errors and timeouts fail the
campaign separately. Mode-specific reports live under
`reports/mutation/event-handling/` and
`reports/mutation/accessibility-attributes/`. The runner fingerprints every
production source, owning test, tool input/version, runtime, and relevant
environment before and after execution, and shares the app mutation lock with
Stryker and the conditional-rendering supplement.

Equivalent mutants — ones no test could ever kill, such as a `typeof` guard that
exists only to narrow a type — are recorded in `scripts/mutation-equivalents.mjs`
with the reasoning for each. Entries match on file, mutator, replacement,
mutated source text, Stryker's exact start/end node location, and a reviewed
SHA-256 of the complete production file. Every expected mutant has a
mechanically pinned span, and any source edit invalidates every exemption in
that file; therefore even a same-text, same-location replacement inside a new
function cannot inherit an old exemption. The gate fails both on a survivor
that matches no entry _and_ on an entry that matches nothing, so an exemption
cannot outlive or drift away from the code it excused. Refresh spans and the
file hash only from a fresh full campaign after reviewing the survivors again.
A `// Stryker disable` directive is not an exemption: it
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

Recorder's coverage-off integration pass also sets `maxTestRunnerReuse` to 1.
One run executes the full 843-test Recorder suite, so every integration mutant
gets a freshly recycled worker. This prevents cross-mutant heap accumulation
without increasing Node's heap or weakening the mutant set.

Useful knobs:

```bash
npm run mutation:lanes:verify          # manifest only, no mutants
node scripts/run-mutation.mjs ui types # re-run named lanes; reuse only current reports
MUTATION_PARALLEL_LANES=3 MUTATION_CONCURRENCY=2 npm run mutation
npm run mutation:conditional-rendering # every Stryker-blind JSX ternary, true + false
JSX_ATTRIBUTE_MUTATION_CONCURRENCY=2 npm run mutation:event-handling
npm run mutation:accessibility          # remove each authored a11y prop in isolation
node scripts/run-conditional-rendering-mutation.mjs --list
node scripts/run-jsx-attribute-mutation.mjs --mode event --list
node scripts/run-jsx-attribute-mutation.mjs --mode accessibility --lane ui
node scripts/run-conditional-rendering-mutation.mjs --lane practice --report-dir /tmp/practice-render-mutants
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

### Production AdMob IDs

Set all six values from `.env.example` for production EAS/export builds. App
IDs use the `ca-app-pub-…~…` form; ad-unit IDs use `ca-app-pub-…/…`. Never use
Google's sample IDs in a store build. Ads remain disabled until the backend
implements and enforces a reviewed, per-account adult-eligibility flow. The
`ADS_ENABLED`, `ADS_AUDIENCE_MODE`, and individual placement switches are
reserved for that future rollout and cannot currently enable public ads.

### Production store links

Set `EXPO_PUBLIC_IOS_APP_STORE_URL` to the final HTTPS `apps.apple.com` product
URL ending in the app's numeric `/id…`. Set `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`
to `https://play.google.com/store/apps/details?id=com.aienglish.coach`.
Production config refuses missing, malformed, cross-origin, or wrong-package
links so a forced update can never send learners to an untrusted destination.

## Project structure

```
src/
  app/                  expo-router routes
    _layout.tsx         providers, protected Stack, focus bridge + error boundary
    +not-found.tsx      safe fallback for invalid or stale deep links
    index.tsx           gate: routes to login / diagnostic / Home
    (auth)/             login + signup (mother-tongue picker)
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
    RecordingPlayback.tsx shared retained-audio playback/share/delete controls
    NetworkStatusBanner.tsx global offline/reconnected feedback
    ClientUpgradeModal.tsx non-dismissible store-update overlay
  lib/
    api.ts              API URL, Bearer requests, direct/S3 audio upload
    audio-session.ts    serialized microphone/speaker mode and playback ownership
    auth.tsx            SecureStore-backed auth context and cache isolation
    identity-validation.ts client email syntax aligned with the API
    network-status.ts   Expo reachability store + React Query online bridge
    client-upgrade-store.ts one-way first-party 426 upgrade latch
    password-policy.ts  UTF-8-aware password rules shared by auth screens
    pending-assessment.ts durable interrupted-upload state machine
    practice-flow.tsx   session-scoped handoff from attempt to feedback
    types.ts            strict runtime parsers for API contracts
    params.ts           route-param helpers
    theme.ts            colors
```

## Backend contract

JSON, camelCase; `Authorization: Bearer <token>`. Before sending audio, the app
calls `POST /uploads/audio-url` with `{contentType,assessmentEndpoint}`.
Production receives a short-lived, size-constrained S3 multipart-POST grant
that echoes the endpoint and carries a route-scoped
`audio-uploads/{diagnostic|practice}/{ownerId}/...` key. The app uploads the
native file directly, then POSTs `{questionId,requestId,retainRecording,audioKey}`
for diagnostic or `{questionId,requestId,cycleId,retainRecording,audioKey}` for
practice to that exact assessment endpoint. Local development receives
endpoint-bound `mode: direct` and sends multipart form data with file field
`audio`, boolean-string `retainRecording`, and the practice-only `cycleId`. The
same UUID `requestId` identifies every retry of one logical submission. API and
upstream-provider error bodies are never shown directly to users. Device-only
secure storage records the owner, endpoint, question, request, immutable
retention choice, upload stage, and scoped S3 key when applicable, allowing the app to reconcile an interrupted
handoff through authenticated `GET /assessments/:requestId`; the server replay
expires after 48 hours.

`GET /practice/question` returns a durable server-owned `cycleId`; English and
mother-tongue speech share exactly three tries in that cycle, while silence is
an explicit free retry. English responses report mastery (score 75+).
`POST /practice/attempt/native` persists a real non-scored attempt with the
original transcript, immutable submission-language snapshot, faithful English
translation, comprehension feedback, and a separate model English answer; it
never changes English mastery or SRS.

History and Recordings share `RecordingPlayback`. It downloads each short-lived
signed audio URL before starting, waits for authoritative loaded status, and
uses the serialized playback audio mode with full app volume, iOS silent-mode
playback, and speaker routing rather than the earpiece. Share Audio uses the
same private download path but gives `expo-sharing` only the temporary local
file URI; bounded pre-handoff preparation prevents a stalled download from
wedging the controls, while operation ownership removes the copy after success,
failure, background, unmount, or logout. Settings' count-independent **Delete
all recordings** confirmation calls the idempotent bulk endpoint, synchronously
removes every cached recording reference, and then refreshes both recording and
history data.
