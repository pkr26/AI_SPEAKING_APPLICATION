# AdMob Monetization Strategy — AI English Learning

Date: 2026-08-25

## Implementation status

The phase-1 policy is implemented behind fail-closed controls:

- `HomeBannerAd` reserves an adaptive-banner slot with a 24 dp control guard and renders only while Home is focused.
- `HistoryNativeAdCard` appears once, immediately after the eighth real history item, and is destroyed on blur, playback, remote disablement, consent revocation, or component cleanup.
- `AdsProvider` fetches the server policy on each eligible focus, gathers Google UMP consent before SDK initialization, applies PG content treatment and GDPR-aware non-personalized requests, and exposes required privacy choices in Settings.
- Production configuration rejects missing, reused, malformed, or Google sample app/ad-unit IDs. Development uses Google test IDs only; Expo Go and unsupported platforms fail closed.
- The API owns global and per-placement remote switches. Defaults are ads off and audience unknown; ads cannot enable until the operator explicitly selects adult-only treatment.

Verification: 2,946/2,946 app tests passed; `ads.tsx` has 100% statement/branch/function/line coverage; iOS and Android production bundles and both platform config-plugin outputs were validated with non-Google CI-only IDs. No live ad was requested or clicked.

## Executive decision

Launch ads in two low-disruption surfaces only:

1. One reserved anchored adaptive banner on Home, separated from every button and navigation control.
2. At most one clearly labeled native ad within a long History feed, after meaningful learner content.

Do not launch interstitial, app-open, or rewarded ads in version 1 of monetization. Add a carefully capped interstitial only after retention and accidental-click metrics prove the banner/native placements are healthy.

The learning loop is the product. Ads must never interrupt recording, transcription, grading, feedback, retry, diagnostic placement, authentication, account deletion, or audio playback.

## Product principles

- Learning intent wins over short-term impression volume.
- Never surprise a learner with a full-screen ad while they are speaking, reading feedback, filling a form, or trying to navigate.
- Never place an ad next to Play, Record, Stop, Try Again, Next Question, Delete, or navigation buttons.
- Reserve layout space before an ad loads so content never jumps beneath a finger.
- Label native placements unambiguously as **Ad** or **Sponsored** and retain AdChoices.
- Use only Google test ad unit IDs in development and automated/manual QA.
- Suppress all ads while an assessment or durable recovery operation is active.
- Prefer fewer high-quality impressions that preserve daily retention over maximum raw impressions.

Google says interstitials belong at natural transitions and warns against surprising users or compromising the app experience ([interstitial guidance](https://support.google.com/admob/answer/6066980)). Google also prohibits recurring or unexpectedly launched interstitials that interfere with navigation ([disallowed interstitials](https://support.google.com/admob/answer/6201362)).

## Route-by-route placement map

| App surface                               | Ad format                | Decision                         | Placement and rationale                                                                                                                        |
| ----------------------------------------- | ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup / login / reset password           | None                     | Never                            | Credential and consent flows must remain focused and trustworthy.                                                                              |
| Diagnostic question / recording / grading | None                     | Never                            | This is a time-sensitive microphone and paid-assessment flow.                                                                                  |
| Practice question / recording / grading   | None                     | Never                            | Ads near Record, Stop, language switching, or Next create accidental-click and learning disruption risk.                                       |
| Feedback                                  | None                     | Never                            | Feedback is the learner's earned value and may include replay controls.                                                                        |
| Help / examples                           | None initially           | Avoid                            | Hints are core instruction, not an ad break.                                                                                                   |
| Home                                      | Anchored adaptive banner | Recommended                      | Reserve a fixed slot after the learning summary and primary actions, with a non-clickable divider and at least 24 dp separation from controls. |
| History                                   | Native ad                | Recommended after Home launch    | Insert after 6–8 real history rows, never as the first item, at most one per loaded page and one per 10 learner rows.                          |
| Settings / privacy / account deletion     | None                     | Never                            | Trust, privacy, export, language, and destructive operations must be ad-free.                                                                  |
| Session-complete transition               | Interstitial             | Phase 2 only                     | Eligible only after a substantial session and before navigating away from a dedicated session-complete break.                                  |
| App foreground / cold start               | App-open                 | Defer                            | High disruption risk for a habit-learning app; never show on first use, deep link, pending recovery, or quick resume.                          |
| Optional bonus content                    | Rewarded                 | Defer until a fair reward exists | Must be explicit and optional; never gate required feedback, retries, accessibility, or earned progress.                                       |

## Recommended Home banner

Use an anchored adaptive banner because it reserves a predictable top/bottom region across screen sizes ([Google banner implementation](https://developers.google.com/admob/android/banner)).

Layout:

```text
Header
Greeting
Progress / streak card
Start Practice
History       Settings
-----------------------  non-clickable divider and spacing
| reserved ad slot    |
-----------------------
safe-area inset
```

Requirements:

- Allocate the full ad slot before requesting the ad.
- Keep at least 24 dp between the ad and any tappable control.
- Never overlay, float, or animate the banner over content.
- Do not position it between a primary action and bottom navigation.
- Hide the slot entirely when ad consent is unavailable, ads are disabled, or no fill is returned after a bounded timeout.
- Let AdMob control refresh; do not create custom rapid refresh logic.
- Pause/remove the ad when leaving Home.

Google recommends fixed reserved space and clear separation to prevent content movement and accidental clicks ([recommended banner placements](https://support.google.com/admob/answer/6275335)). Google specifically discourages banners adjacent to navigation or interactive elements and prohibits overlap ([discouraged banner placements](https://support.google.com/admob/answer/6275345)).

## Recommended History native ad

The History list is the only existing feed-like surface. A native placement can fit its visual rhythm without blocking the learning loop.

Rules:

- Never make the ad the first row.
- Place after 6–8 attempts, then at most once per 10 additional learner rows.
- Do not insert an ad when fewer than eight real history items exist.
- Use a visually distinct sponsored card, not a card that imitates a learner attempt.
- Show the required ad attribution and leave room for AdChoices.
- Do not place Play/Delete recording controls immediately above or below the ad; keep a noninteractive spacer.
- Cache only the immediately visible native ad and destroy it when its screen/list item leaves the retained cache.

Google notes that native ads can match an app's design but the app owns correct rendering, attribution, and lifecycle; it recommends limited precaching and destroying unused ads ([native ad guidance](https://developers.google.com/admob/ios/native), [native display requirements](https://developers.google.com/admob/ios/native/advanced)).

## Phase-2 interstitial policy

Do not show an interstitial merely because a question or API request completed. A valid boundary is the end of a meaningful practice session.

Eligibility proposal:

- At least five scored English questions completed in the current session.
- At least ten minutes since the previous interstitial.
- Maximum one interstitial per session and two per UTC day.
- Never during the first three app sessions.
- Never if a recording, upload, assessment, recovery, playback, deletion, or credential operation is active.
- Never immediately after the learner taps Next, Back, Play, Record, or Stop.
- Preload; if it is not ready at the boundary, skip it instead of displaying it late on the next screen.
- Display from a dedicated session-complete transition before the next actionable screen.

Google recommends interstitials only between pages, stages, or levels, not after every action, and recommends preloading to avoid a late surprise ([recommended interstitials](https://support.google.com/admob/answer/6201350)).

## Rewarded ads

Rewarded ads must be voluntary. The reward should be nonessential and should not distort assessment scores or pressure struggling learners.

Potential future reward:

- One optional bonus practice pack after the normal daily content is complete.

Do not reward:

- Clicking an ad.
- Access to already-earned feedback or recordings.
- Required retries, accessibility features, mother-tongue help, or account functions.
- Artificial mastery, score, level, or streak progress.

Use the SDK's earned-reward callback, never a click callback. Google describes rewarded ads as opt-in ads that award an in-app item after interaction and requires test ad units in development ([rewarded ads](https://developers.google.com/admob/android/rewarded)).

## App-open ads

Recommendation: do not launch initially.

If tested later:

- Never show on first use.
- Never show while restoring an assessment or following a notification/deep link.
- Require at least four hours in the background.
- Show only while the user is already waiting on a legitimate loading screen.
- Maximum one per day initially.

Google recommends delaying the first app-open ad until after initial use and showing it when a user is already waiting ([app-open guidance](https://developers.google.com/admob/android/app-open)).

## Children and mixed-audience gate

This decision is mandatory before production ads.

If children are included in the target audience—or age is unknown:

- Add a neutral age screen before initializing personalized advertising.
- Serve non-personalized ads to children/unknown-age users.
- Use only Google Play Families self-certified ad SDK versions for those users.
- Do not transmit advertising identifiers from child/unknown-age users where policy prohibits it.
- Configure content ratings and ad treatment for child-directed users.
- Review microphone/audio disclosures because voice recordings are sensitive data.

Google Play requires mixed-audience apps to use neutral age screening and restrict personalized ads/SDKs for children and unknown-age users ([Families policy](https://support.google.com/googleplay/android-developer/answer/9893335)).

## Consent and privacy

Before requesting any ad:

1. Update consent information at every app launch.
2. Present a required consent form before initializing/requesting ads.
3. Request ads only when the consent SDK reports that ads may be requested.
4. Expose **Privacy choices** in Settings whenever required.
5. Link a public privacy policy and disclose ad partners, device identifiers, measurement, and personalization.
6. Keep account language and consent independent; consent must be understandable in the selected UI language.

Google requires disclosures and consent for relevant EEA/UK data uses ([European regulations](https://support.google.com/admob/answer/10114014)) and recommends waiting until consent is collected before requesting ads ([UMP troubleshooting guidance](https://support.google.com/admob/answer/14661013)).

## Expo / React Native integration constraints

- A native Google Mobile Ads library requires a development build or production binary; it will not run as a normal Expo Go-only feature.
- Keep ad IDs in validated public build configuration; never commit secrets. Ad unit IDs are identifiers, not server credentials, but production/test IDs must remain distinct.
- Use Google test IDs in development and CI. Never click live ads during QA.
- Add an application-level `AdsProvider` responsible for consent, initialization, foreground state, caps, and pending learning-operation suppression.
- Keep ad components isolated from Recorder and assessment recovery code.
- Add a remote kill switch so ads can be disabled without an app release if policy, crash, or retention metrics regress.

## Measurement plan

Revenue metrics:

- Ad ARPDAU, impressions/DAU, fill rate, match rate, eCPM, and revenue per session.
- Revenue split by Home banner, History native, and later experiments.

Experience guardrails:

- D1/D7 retention.
- Practice sessions per user and questions completed per session.
- Recording-start-to-submission completion rate.
- Feedback-to-next-question conversion.
- History and playback engagement.
- App exits within five seconds of an impression.
- Crash-free sessions and ANR rate.
- Outlier CTR / confirmed-click warnings / invalid-traffic notices.

Initial experiment:

- 10% control with no ads.
- 45% Home banner only.
- 45% Home banner plus one History native placement.
- Run for at least two full weekly cycles.
- Do not promote a variant if D7 retention, completed practice questions, or submission completion falls materially, even when revenue increases.

## Rollout sequence

1. Decide adult-only versus mixed/child audience and document the answer.
2. Implement consent, privacy choices, test ads, and remote kill switch.
3. Launch Home adaptive banner to 10% of eligible adults.
4. Expand only after retention and invalid-click guardrails pass.
5. Test one History native unit.
6. Consider session-complete interstitials only after several weeks of stable banner/native data.
7. Consider rewarded/app-open ads last.

## Pre-release checklist

- [ ] Target-audience and age-treatment decision approved.
- [ ] Privacy policy and store data-safety disclosures updated.
- [ ] UMP/CMP flow tested in EEA/UK/Switzerland and non-consent regions.
- [ ] Privacy-options entry available in Settings when required.
- [ ] Test ad units used in every nonproduction build.
- [ ] No ad appears on recording, assessment, feedback, auth, playback, or destructive screens.
- [ ] Banner slot is reserved and separated from controls.
- [ ] Native attribution and AdChoices are visible.
- [ ] Frequency caps persist across app restarts.
- [ ] Pending Recorder/recovery state suppresses all full-screen ads.
- [ ] Remote kill switch tested.
- [ ] Accessibility labels and focus order tested with VoiceOver/TalkBack.
- [ ] Analytics contain no transcript, audio, token, email, or sensitive learner content.
- [ ] Invalid-traffic and policy-center alerts are monitored.
