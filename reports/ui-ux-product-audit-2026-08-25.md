# UI/UX Product Audit — AI English Learning

Date: 2026-08-25

## Implementation and verification status

The language split, durable recording backend, Recordings library, reusable playback/delete component, Feedback/History replay, safe recording export, Home/Settings navigation, and phase-1 ad placements are implemented. The final app gate passed 33/33 suites and 2,946/2,946 tests with 98.13% statements, 96.56% branches, 98.10% functions, and 99.27% lines, plus format, lint, strict TypeScript, Expo Doctor, dependency-audit, mutation-manifest, production config-plugin, and iOS/Android export checks.

The real split-S3/OpenAI acceptance passed 107/107 assertions. A subsequent 20-user multilingual calibration passed 20/20 users, 797 actions, 10,806/10,806 independent reconciliation checks, 93/93 retained and byte-replayed recordings, and 93/93 complete S3 cleanup lifecycles.

This workstation has no Xcode/iOS Simulator or Android emulator, and the app intentionally does not support web. Native-device visual inspection with VoiceOver/TalkBack and real AdMob test creatives remains a release-device QA gate; no simulator/device run is claimed here.

## Product standard

"Best in the business" is not a single visual style. For this product it means that a learner can understand the next action immediately, record without fear of losing work, review the result, replay or delete their audio, and change app preferences without accidentally changing learning behavior.

The release standard is therefore measurable:

- One obvious primary action per learning state.
- No ad, navigation gesture, or secondary action can interrupt a recording, upload, assessment, recovery, feedback, or playback operation.
- App language and learning language are visibly independent.
- Every retained recording is attributable to the signed-in learner and assessment, replayable on demand through a short-lived authorized URL, and deletable by that learner.
- All interactive targets are at least 44 points, support large text, expose roles/states to assistive technology, and preserve a logical focus order.
- Loading, empty, error, retry, offline/timeout, success, pending-retention, and deletion states are designed explicitly.
- Light and dark themes retain readable text and non-text contrast.
- No transcript, audio URL, email, token, or recording key is exposed to advertising or analytics code.

Apple recommends making controls easy to distinguish and reach, supporting larger text, and providing alternatives to gesture-only interaction ([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). WCAG 2.2 defines a 24 by 24 CSS pixel minimum target or adequate spacing; this app deliberately uses a stronger 44-point product minimum ([Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).

## Experience architecture

```text
Sign in / Sign up
        |
        v
Diagnostic placement ---- Settings
        |
        v
Home ---- Practice ---- Feedback
 |                         |
 +---- History ------------+
 |       |
 +---- Recordings <---------+
             |
          Play / Delete
```

The hierarchy keeps Home as the signed-in hub, Practice as a focused task, Feedback as the earned outcome, History as the scored-attempt timeline, and Recordings as the complete audio library (including diagnostic and mother-tongue submissions that do not necessarily create an English-practice history row).

## Findings and decisions

### 1. Language intent was conflated

Previous behavior used `nativeLanguage` both to tell the learning engine which mother tongue to use and to localize the interface. Selecting Telugu, Hindi, Spanish, or Chinese at signup therefore changed every screen without an explicit UI-language choice.

Decision:

- English is the default signed-out and newly registered UI.
- **App language** controls labels, messages, dates, and reminder copy.
- **Learning language** controls mother-tongue explanations and native-comprehension assessment behavior.
- Changing one must never mutate, invalidate, or reschedule behavior owned by the other.
- Settings explains the difference before showing the choices.

### 2. Successful audio had no durable learner surface

Previous production behavior treated a successful S3 upload as temporary input and deleted it after assessment. A transcript and result remained, but a learner could not hear the original recording again.

Decision:

- Successful submitted audio becomes a durable, owner-scoped recording.
- Failed, rejected, abandoned, and unbound uploads remain transient.
- Postgres owns the authoritative user/request/question/context-to-S3 mapping.
- S3 stores the audio bytes; raw bucket/key/version details never enter the app contract.
- Playback uses a short-lived, owner-authorized URL requested only when the learner taps Play.
- The URL is never persisted, cached as profile data, logged, exported, or sent to analytics.
- User deletion removes one recording; account deletion enqueues deletion of every recording and every S3 version/delete marker.

### 3. Review needed an audio-first destination

History is optimized for scored attempts. It cannot be the only audio surface because native-comprehension and no-speech submissions can have a recording without a scored attempt.

Decision:

- Keep History as the learning-result timeline.
- Add a Recordings library that lists every retained recording, newest first.
- Add contextual playback to result/history surfaces when a `recordingId` is available.
- Use one shared playback component so loading, expiry refresh, focus, audio-session ownership, and deletion behavior cannot drift between screens.

### 4. Monetization must not invade the learning loop

The highest-value experience is the uninterrupted sequence of prompt → recording → assessment → feedback → next step. Monetizing that sequence would increase surprise, accidental clicks, and abandonment.

Decision:

- No ads on authentication, diagnostic, practice, recording, feedback, playback, or destructive settings screens.
- Initial placements are limited to a reserved Home banner and, after validation, one clearly labeled native History placement.
- Consent, target-audience treatment, test ad IDs, a remote kill switch, and retention guardrails are prerequisites.
- The complete placement and rollout policy is in `reports/admob-monetization-strategy-2026-08-25.md`.

## Route-by-route UX acceptance matrix

| Surface    | Primary learner intent     | Required states                                                                                                   | Acceptance criteria                                                                                                               |
| ---------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Signup     | Create an account          | editing, validation, submitting, error                                                                            | Mother tongue selection does not translate the screen; English remains the default UI.                                            |
| Diagnostic | Complete placement         | intro, loading, recording, assessing, answer, complete, recovery, error                                           | Progress is clear; navigation is locked only while leaving would lose/duplicate work; no ads.                                     |
| Home       | Decide what to do next     | loading, stats, stats error, session summary                                                                      | Start Practice is dominant; History, Recordings, and Settings are lower-emphasis; an ad slot cannot shift or overlap controls.    |
| Practice   | Answer one prompt          | loading, prompt, native/English mode, recording, assessing, recovery, rate limit, skip error                      | One primary recording action; language mode names the learning behavior, not the app locale; no ads.                              |
| Feedback   | Understand and continue    | no-speech, retry, failed, passed, mastered, level-up, native result                                               | Outcome hierarchy is headline → score/transcript → feedback → replay → next action; no surprise navigation or ads.                |
| History    | Review scored attempts     | loading, empty, error, paged list, expanded row, playback                                                         | Day grouping follows app language; details are progressively disclosed; playback is available only for owned retained recordings. |
| Recordings | Replay/manage audio        | loading, empty, error, page loading, retention pending, ready, playing, expired URL refresh, delete confirm/error | Each row explains prompt/context/date; only one shared player owns audio; Delete is explicit and idempotent.                      |
| Settings   | Manage profile/preferences | editing, saving, confirmation, export, reminder, destructive action                                               | App language and learning language are separate labeled sections; changing either preserves unrelated profile edits.              |

## Visual system review

The existing token system is a strong foundation: consistent spacing, 44-point targets, rounded cards, semantic success/warning/danger colors, max-width layouts, and designed light/dark palettes. The product should extend those tokens instead of introducing screen-specific colors or arbitrary spacing.

Retain:

- One shared `Button` component and one shared `Recorder` component.
- Primary indigo reserved for the dominant action and active state.
- Semantic color plus text/icon labels; color is never the only signal.
- Card elevation through surface/border contrast rather than heavy shadows.
- Progressive disclosure in History rather than showing every transcript and feedback paragraph at once.

Improve through the recording work:

- A compact playback card with a clear Play/Pause label, elapsed/total time, busy state, and a visually separated destructive action.
- Stable reserved space for playback/loading so cards do not jump.
- Plain-language retention copy: "Saved to your recordings" and "Delete recording" rather than S3/storage terminology.
- Context labels such as Diagnostic, English practice, and Learning-language answer.

Apple recommends immediate, understandable feedback that helps people recognize the result of an action ([Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)) and progress indicators that accurately communicate ongoing work rather than implying completion ([Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)).

## Accessibility and inclusive-language checklist

- [ ] VoiceOver/TalkBack announces Play/Pause, busy, elapsed time, retention status, and expanded/collapsed state.
- [ ] Delete requires confirmation containing the recording's prompt/context, not a generic warning.
- [ ] Focus does not jump when a signed playback URL is fetched or refreshed.
- [ ] Dynamic type can wrap labels without truncating the primary action.
- [ ] Every icon/emoji is either labeled or hidden as decorative.
- [ ] Playback never autostarts.
- [ ] Audio stops and releases its session when the component blurs/unmounts or the account changes.
- [ ] Error messages explain a recovery action and never expose AWS/provider details.
- [ ] Date formatting follows App language; learning-language changes do not rewrite dates.
- [ ] Reduced-motion users do not depend on animation to understand recording or playback state.

## Verification gates

1. Contract tests prove independent `uiLanguage` and `nativeLanguage` round trips.
2. Database tests prove every recording maps to exactly one user and request and that account cascade creates durable deletion work.
3. API tests prove cross-account list/play/delete attempts cannot discover or access a recording.
4. S3 tests prove retained successes remain readable, transient failures expire/clean up, playback URLs work, and delete removes every object version.
5. Component tests cover replay, URL expiry/refresh, focus/unmount, deletion, empty/error/loading states, and session-identity changes.
6. Light/dark, small-phone, tablet, large-text, VoiceOver/TalkBack, slow-network, and offline manual passes are recorded before release.
7. The staged real-service load harness reconciles user → action → request → recording → S3 object and performs authorized playback checks before cleanup.

## Release recommendation

Ship the language split and durable recordings together behind an additive API contract. Run database migration and backend first, deploy the compatible app second, then enable retained-upload lifecycle rules only after readiness confirms bucket versioning and tag-scoped lifecycle behavior. Ads remain a separate, remotely disabled rollout after privacy/age-treatment decisions and UX metrics are in place.
