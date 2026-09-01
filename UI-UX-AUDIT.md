# UI/UX Audit — AI English Coach

**Date:** 2026-09-01 · **Scope:** full `app/src` UI surface (21 routes, 13 shared components) benchmarked against Duolingo, ELSA Speak, Babbel, Busuu, Speak, BoldVoice, Speeko, plus Apple HIG, Material 3, WCAG 2.2, NN/g, Shopify Polaris, and IBM Carbon standards.

---

## 1. Method

1. **Code audit** — every screen and component read at source level: navigation architecture, layout, styling, interaction states, motion, haptics, copy, and accessibility props. Quantitative inventories were taken (font sizes, weights, haptic call sites, animation count).
2. **Benchmark research** — how top companies actually build these apps: Duolingo's official design-blog posts (home path redesign, streak milestones) and design-system tokens; ELSA Speak's assessment and feedback model; Busuu/Babbel lesson flows; Speak/BoldVoice/Speeko speaking-app patterns; Apple HIG and Material 3 quantitative specs; NN/g research on forms, animation, loading, errors, and onboarding.

Sources are cited inline. Key references: blog.duolingo.com (path redesign, streak milestone design), HIG (Typography, Buttons, Motion, Tab Bars, Onboarding, Managing Accounts), m3.material.io + Material Components specs, NN/g (Animation Duration, Error Guidelines, Registration & Login Checklist, Skeleton Screens, Infinite Scrolling), MDPI 2025 "Human–AI Feedback Loop for Pronunciation Training".

---

## 2. Executive Summary — the honest verdict

**This is not an "immature" app. It is an exceptionally well-engineered app with an under-designed presentation layer.** The two must be judged separately, because the fix strategies are completely different.

**Engineering-grade (better than most consumer apps):**
- A real design-token system with WCAG-verified dual palettes (ratios computed and test-pinned), designed-not-inverted dark mode, 4-pt spacing scale, radius scale, 48-pt minimum touch targets (`lib/theme.ts`)
- Accessibility that exceeds most shipped products: roles, labels, hints, states, `accessibilityValue` on progress bars, VoiceOver announcements with iOS queued options, TalkBack live regions, `accessibilityLanguage` per content language, decorative-art hiding, Reduce Motion honored
- Every screen handles loading / error / offline / empty / partial-refresh states; error copy is human, constructive, and code-free — exactly the NN/g pattern
- Auth flows with autofill hints, keyboard chaining, show/hide, single-column layout; in-app account deletion (Apple 5.1.1(v) compliant); destructive-action confirmations

**Presentation-layer (the "all over the place" feeling — six root causes):**

| # | Root cause | One-line evidence |
|---|---|---|
| 1 | **No navigation architecture** — pure stack; section links are content buttons; Log out lives on the learning screens | `practice/index.tsx:830-853` renders a persistent Settings/**Log Out** footer under the microphone |
| 2 | **No visual identity** — zero icons, no illustration, no mascot; glyphs are text (`?`, `+`/`−`, `✓`, "Show"/"Hide"); emoji are the art system (`🔥🎉🏆🚀💪🎤🌏🧩📘`) | Help button is a literal `?` Text (`practice/index.tsx:743`); the mic "icon" is a white circle (`Recorder.tsx:4205`) |
| 3 | **Text-first information design** — progress, scores, streaks, and results are sentences and chips, never visualizations | Streak = "🔥 3-day streak" sentence (`home.tsx:303-306`); score = `{score} / 100` text (`feedback.tsx:500-510`) |
| 4 | **No motion or celebration system** — 1 animation (mic pulse) across ~11,500 UI lines; 2 haptic call sites; press feedback is `scale: 0.985` (imperceptible) | `Button.tsx:61-63`; grep confirms `Haptics.` appears twice in the app |
| 5 | **Flat hierarchy** — one indigo accent, hairline borders, equal-weight stacked buttons, 21 ad-hoc font sizes with body text at 14–15pt (below both HIG 17pt and M3 16sp) | Review stack: 5 identical full-width buttons incl. destructive Discard (`Recorder.tsx:4094-4144`) |
| 6 | **Feedback is prose, not data** — the industry-standard word-level color-coded transcript is absent; the learner gets a quoted paragraph and an essay | ELSA/BoldVoice/Speak all color words green/orange/red; MDPI 2025 documents this as the standard pattern |

**Weighted overall: ~5/10 as a consumer product** (engineering 9/10, visual design 2/10, interaction design 4/10, IA 3/10, accessibility 9/10, copy 8/10). The gap to Duolingo/ELSA is not talent or cleanliness — it is that the app was built **correct-first and never received a design pass**.

---

## 3. Benchmark scorecard

Scored 1–10 against the best-in-class implementation of each dimension.

| Dimension | App | Bar | What the leaders do |
|---|---|---|---|
| Information architecture / navigation | **3** | 9 | ≤5 bottom tabs for sections (HIG Tab Bars). Duolingo: path/quests/practice/profile. Yours: stack + in-content buttons |
| Visual identity / brand | **2** | 9 | Duolingo: custom type, mascot, named palette. Yours: Tailwind indigo `#4F46E5`, wordmark text, no marks |
| Iconography | **1** | 9 | SF Symbols / custom sets everywhere in top apps. Yours: none (text glyphs + shapes) |
| Typography system | **4** | 9 | HIG Dynamic Type scale / M3 15-token scale. Yours: 21 ad-hoc sizes, no type tokens, body 14–15pt |
| Color & theming | **8** | 9 | Contrast-verified palettes + designed dark mode. Docked for single-accent monotony and muted-heavy surfaces |
| Layout & spacing | **7** | 9 | 4-pt scale, safe areas, max-widths — solid. Docked for density (see screens) |
| Motion & micro-interactions | **2** | 9 | Duolingo: bounce token `300ms cubic-bezier(0.68,-0.55,0.265,1.55)`; NN/g 100–500ms everywhere. Yours: 1 pulse ring |
| Haptics | **2** | 8 | Used tactically for success/selection by top apps. Yours: 2 call sites (impact on record start, success on mastered/level-up) |
| Results & feedback presentation | **3** | 10 | ELSA: % + band + word coloring; BoldVoice: per-word + per-sound scores; Speeko: tappable metric cards. Yours: prose + text score |
| Recording experience | **5** | 9 | ELSA/Speak: live waveform, word highlighting. Yours: correct tap-toggle + 6-segment meter; flat review stack |
| Onboarding & first-run | **4** | 9 | Duolingo: value before signup, motivation questions, progress bar. Yours: login wall → text-card test intro |
| Empty/loading/error states | **8** | 9 | All five states everywhere (rare!). Docked: spinner-only, text-only empty states, no skeletons |
| Forms & auth | **7** | 9 | Strong (labels, autofill, chaining). Docked: mid-typing validation, no SSO/passkey/biometric, no strength meter |
| Copy & tone | **8** | 9 | Warm, plain, 5 languages. Docked: engineer-jargon leaks in deletion/retention copy |
| Accessibility | **9** | 9 | Genuinely at or near the bar; residual gaps below |
| Engagement / gamification | **3** | 9 | Duolingo: streak calendar, milestones, leagues (+25% completion per Deconstructor of Fun), daily goals. Yours: streak sentence + due chip |

---

## 4. Systemic findings (cross-cutting), with benchmarks

### F1 — Navigation: a stack of screens pretending to be sections
**Severity: Critical (the single biggest structural fix).**

Evidence:
- `app/_layout.tsx:70-139` — one `Stack`; no `Tabs` anywhere in the app
- `home.tsx:321-343` — History / Recordings / Settings reached via three text buttons under the Practice CTA
- `practice/index.tsx:830-853` — a card footer with **Settings** and **Log Out** links pinned under the recorder on the main learning screen
- `diagnostic.tsx:669-688` — `renderAccountActions()` injects Settings + Log Out buttons into *every* diagnostic state (loading, error, intro, question, completion)

Why this reads as amateur: Apple HIG Tab Bars exist precisely for section switching ("for navigation between sections, not actions"); every benchmark app (Duolingo: path/quests/profile; ELSA: learn/progress/profile; Busuu: home/review/community) uses tabs. Consequences in your app today:
1. **Log out on a learning screen** is an IA smell — destructive-exit affordances belong in Settings/Profile (HIG Managing Accounts)
2. **History/Recordings are 2 taps deep and undiscoverable** — the user's own past work (the retention driver) is hidden behind text buttons
3. **No persistent sense of place** — every screen is a full-screen push with a different footer arrangement, which is exactly the "everything is all over the place" sensation
4. The practice/diagnostic footer rows consume vertical space the recorder needs

Fix: 4 bottom tabs — **Learn (Home) · Practice · History · Profile** (Recordings folds into Profile or becomes a 5th tab; ≤5 per HIG). Keep the stack for the assessment flow (Attempt/Feedback/Help as modal-ish pushes is correct). Delete the practice/diagnostic footer rows; logout lives only in Profile/Settings. This is compatible with your `Stack.Protected` gates by introducing a `(tabs)` group inside the authenticated guard.

### F2 — No icon system, no illustration, no brand marks
**Severity: Critical (the biggest perceived-quality fix).**

Evidence:
- No icon dependency in `package.json` (no lucide / phosphor / svg support wired for icons)
- Help = `<Text>?</Text>` in a filled circle (`practice/index.tsx:743`)
- Password toggle = "Show"/"Hide" **text** (`login.tsx:236-239`)
- Reminder time stepper = `+` / `−` text (`settings/index.tsx:1313,1329`)
- Language selection = `✓` text char (`signup.tsx:338`)
- Mic icon = 30×30 white circle; stop icon = 28×28 white rounded square (`Recorder.tsx:4205-4216`)
- Celebration/section art = emoji: 🔥 (home streak), 🎉 (diagnostic completion), 🌏🧩🎤📘🚀🏆🎉💪 (feedback's 9 variant headers), 📘/🎤 etc.

Why this matters vs. the leaders: Duolingo's entire emotional register comes from a mascot + custom illustration + chunky iconography; ELSA uses photography/illustration for exercise types; every HIG app uses SF-Symbols-grade iconography. Emoji render differently per OS/vendor (an Android user's 🏆 is a different artifact than iOS), cannot be tinted to your palette, and read as placeholder content. Text glyphs ("?", "+", "✓") cannot meet non-text contrast rules cleanly and scale as text, not as icons.

Fix: adopt one icon set (e.g., `lucide-react-native` — tree-shakeable, no font linking) mapped through `theme.colors`; replace every glyph listed above; commission or generate a small illustration set (empty states, feedback variants, onboarding) and 1 mascot/hero mark. Keep emoji only if deliberately styled.

### F3 — Text-first information design: no data visualization anywhere
**Severity: High (product-feel fix).**

Evidence:
- Streak: sentence + emoji (`home.tsx:303-306`). Leaders: Duolingo's flame stat + milestone transformations + streak calendar; Busuu's streak calendar
- Mastery: a 12-px progress bar + "`{mastered}` of `{total}` words mastered · `{count}` to review" (`home.tsx:262-301`)
- Score: `{score} / 100` text + a caption explaining what pass/master mean (`feedback.tsx:500-510`)
- Diagnostic progress: "Question 1 of up to 3" text (`diagnostic.tsx:860-867`). Leaders: Duolingo's lesson progress bar (famously moves forward even on wrong answers to keep learners in flow)
- History: score chips (colored pills with text) — good, but no trends, no weekly chart, no calendar heatmap
- CEFR level: text badge "B1" + "B1 = intermediate" caption

Benchmark: ELSA's results screen layers **overall % + predicted IELTS band + word-level green/orange/red**; BoldVoice adds per-sound scores; Speeko's feedback report is tappable metric cards (pace, tone, fillers). The MDPI 2025 paper documents localized, interpretable error highlighting as the field-standard feedback design. **Your app has all the data (score, pass/master thresholds, per-attempt history, SRS scheduling) and renders none of it visually.**

Fix: score ring (animated arc, 0–100, green/amber/red banding), diagnostic/attempt progress bar, streak calendar (7-day strip on Home; month view in History), mastery ring replaces the 12-px bar, per-word transcript coloring (see F7).

### F4 — Motion and celebration: the app is static
**Severity: High (perceived-aliveness fix).**

Evidence:
- Exactly one animation: the recording pulse ring (`Recorder.tsx:3936-3941`)
- Press state: `scale: 0.985` + variant background shift (`Button.tsx:61-63`) — a 1.5% scale change is below noticeable thresholds; HIG: custom buttons without a felt press state "feel unresponsive"
- 2 haptic call sites in the whole app (`feedback.tsx:172` success on mastered/level-up; `Recorder.tsx:2775` light impact on record start). Nothing on: record stop, submit success, navigation, swipe toggles, errors, level reveal
- Zero transition choreography: question changes hard-swap with a silent `scrollTo({y:0, animated:false})` (`practice/index.tsx:340`); feedback screen appears with no entrance; score does not count up; progress bars never animate
- Zero celebration craft: mastery/level-up/completion render a 52-pt emoji and static text. Duolingo's lesson-complete: mascot beat → reward card slides up → splits into three staggered stat cards; streak milestones get a custom animation and share card, with the design team's own principle "Timing is everything in animation"

Standards: NN/g — 100ms for state toggles, 200–300ms for screen changes, ease-out entrances; M3 duration tokens 50–400ms; Duolingo's bounce token 300ms overshoot curve. All of these are small, bounded, and Reduce-Motion-guardable (you already read Reduce Motion for the pulse — extend it).

Fix (a "motion pass", roughly a week): felt press states (scale 0.96–0.97 + 100ms), feedback-header entrance (300ms ease-out scale/fade + count-up score), confetti + haptic pattern on mastered/level-up/diagnostic completion, progress-bar fill animations, animated tab transitions default. Add `duration`/`easing` tokens to `theme.ts` so it's systematic, not ad-hoc.

### F5 — Flat visual hierarchy and typography drift
**Severity: Medium-High.**

Evidence:
- **21 distinct ad-hoc font sizes** (10,11,12,13,14,15,16,17,18,20,21,22,24,26,28,30,32,34,52,56) with no type tokens; 14pt and 15pt are the most common (85 uses combined) — your *body* text sits below HIG Body (17pt) and M3 Body Large (16sp), contributing to the dense, small-print feeling
- 3 weights (600/700/800) used 97 times — bold-as-hierarchy everywhere instead of size/spacing hierarchy
- Every card is `borderWidth: 1, borderColor: border` — the entire app is outlines; there is no elevation strategy (M3: 0–12dp ladder; HIG: deference via depth). Dark mode actually has a proper elevated surface (`card`), but light mode flattens everything
- One accent color (indigo) carries CTA, chips, links, focus, score text, prompt words — semantically overloaded; leaders separate brand accent from semantic states and use a warm secondary for celebration
- Recorder review stack: Save-toggle, Play, Submit, Re-record, Discard as five equal-width stacked buttons (`Recorder.tsx:4094-4144`) — the primary action (Submit) has no prominence and the destructive action (Discard) has full visual weight. HIG/NN/g: one dominant primary per surface; destructive de-emphasized or icon-only with confirmation

Fix: add `type` tokens (display/title/headline/body/caption mapped to your existing sizes), raise body to 16–17pt, create a `buttonPrimary` emphasis (larger, filled, 3D bottom edge like Duolingo's `0 4px 0` hard shadow is the reference if you want playful; or M3 filled tonal if you want professional), demote Discard to a quiet text action, adopt a real elevation pair (shadow on light, tint on dark) and retire hairlines on elevated cards.

### F6 — Onboarding is a gate, not an experience
**Severity: Medium-High (conversion-critical).**

Current flow: Login screen (wordmark + form) → signup (4 fields + language grid) → Diagnostic (text-card intro: "This short test finds your English level…") → Home.

Benchmark: Duolingo's order is the reverse — mascot welcome → daily-goal selection → motivation ("Why are you learning?") → experience level → **lessons first, account creation deferred until the user has invested progress** — with a step progress bar leveraging the goal-gradient effect. HIG Onboarding: "fast, fun, optional… let people experience value before purchase prompts; request permissions in context with a why." Busuu's 22-step forced-signup flow is the documented counter-example of friction.

Specific gaps in yours:
- First screen a new user sees is a login form — zero value communicated, zero product shown (only a one-line subtitle)
- No goal/motivation capture — you already have a `daily-reminder` feature and an SRS engine that would make "daily goal" trivially meaningful, and neither is surfaced at onboarding
- Diagnostic intro is 5 lines of text in a card (`diagnostic.tsx:838-857`) — no visual explanation of the speak → AI-feedback loop, no expected duration framing beyond "2 or 3 questions"
- No progress indicator during the test (text-only "Question 1 of up to 3")
- Signup asks for password confirmation (NN/g: don't repeat password fields; prefer visible password + strength meter)

Fix (within your auth architecture): pre-auth value carousel (3 slides: speak → AI feedback → level path), move mic permission priming to a custom pre-permission explainer right before the first record (you currently fire the OS prompt directly; NN/g documents the one-shot denial risk and the in-context pattern), goal selection persisted into the existing reminder system, animated progress during the diagnostic.

### F7 — Feedback is prose where the industry shows data
**Severity: High (this is the product's core loop).**

Current feedback card (`feedback.tsx:358-681`): emoji header, colored title, subtitle, attempt chip, `score / 100` text, then a card of labeled paragraphs — word, question, "We heard" quoted transcript, feedback essay, optional model answer — with one of nine variant CTAs. It is *information-complete* and *visually undifferentiated*: a passed-75 mastery looks like a failed-final except for title color and emoji.

What the leaders ship on the same moment:
- **ELSA**: overall % ring + band score + transcript with **each word colored green/orange/red**
- **BoldVoice**: per-word and per-sound (phoneme) scores, drill-down to the exact problem sounds
- **Speak**: real-time word highlighting during speaking; post-session error summary with one-tap "generate a review lesson"
- **Duolingo**: full-bleed color-coded feedback sheet; correct answer + explanation; progress bar still advances
- **MDPI 2025**: localized interpretable highlighting > single scores (academic confirmation of the pattern)

Your data model already has everything needed except word alignment: score, pass/master thresholds, transcript, per-word target (`promptWord`), attempt history, SRS state. The provider prompt can be extended to return word-level assessments additively (your API contract is additive-only by design; the app parser is whitelist-based and already tolerates unknown fields).

Fix: (a) score ring with band colors + count-up; (b) transcript rendered as per-word chips colored by correctness; (c) "what to fix" as 2–3 tappable highlights rather than an essay paragraph; (d) variant-colored header backgrounds (green/amber/red full-bleed) so outcome is pre-attentive.

### F8 — Loading and empty states: correct but joyless
**Severity: Medium.**

Every screen has all five states (rare and commendable), but: all waits are centered spinner + one muted line (`ActivityIndicator` on Home/Practice/Diagnostic/Auth/History/Recordings); empty states are a title + body (+CTA on History only) with no illustration (`OfflineState.tsx`, history/recordings empties). NN/g: skeletons beat spinners for 2–10s full-page loads; Shopify Polaris/IBM Carbon: illustration + short positive title + one primary CTA, content column ~450px. Your question-load and history-load are exactly the 2–10s class where skeletons shine.

---

## 5. Screen-by-screen audit

Legend: ✅ meets bar · ⚠ below bar · ✗ clearly below bar. File:line evidence for each non-trivial claim.

### 5.1 Login (`app/(auth)/login.tsx`)
- ✅ Single column, persistent labels, `textContentType`/`autoComplete`, keyboard chaining (email→password→submit), show/hide toggle, error under field, busy-locked navigation
- ✗ **Premature validation**: `emailAddressError(email)` is computed every render and rendered as soon as one character exists (`login.tsx:94,188-192` with `identity-validation.ts` returning an error for any non-empty invalid string). NN/g: validate email on blur; erroring mid-typing is a documented hostile pattern ("the form is having a conversation" applies to on-blur)
- ⚠ No brand mark — 32pt wordmark text only; leaders show logo/mascot + social proof
- ⚠ No alternative sign-in (Sign in with Apple/passkey) — HIG prefers it; also removes the password-confirm friction upstream
- ⚠ Password toggle is text ("Show/Hide") not an eye icon — costs width, marks the form as template-built
- ⚠ "New here? Create account" footer is small for the primary growth action

### 5.2 Signup (`app/(auth)/signup.tsx`)
- ✅ Field order, mother-tongue radiogroup with native+English labels, legal links inline, language help text is excellent
- ✗ Password **confirmation field** (`signup.tsx:257-306`) — NN/g 12-point checklist: don't repeat password fields; make password visible + strength meter instead
- ⚠ No strength meter while policy (8+/letter/number) is silently enforced at submit
- ⚠ Same premature-validation pattern; ✓ text glyph for selection; no value-prop copy above the form

### 5.3 Diagnostic (`app/diagnostic.tsx`) — placement test
- ✅ Adaptive 2–3 question flow, resume-safe, replay handling, result acknowledgment; intro card explains the rules plainly; completion screen lists every answer with transcript + feedback (more transparent than Duolingo)
- ✗ **Progress is a text line** ("Question 1 of up to 3", `diagnostic.tsx:860-867`) — benchmark is a persistent animated progress bar (Duolingo; M3 linear indicator 4dp)
- ✗ **The level reveal is the weakest celebration in the app** — a 🎉 emoji, title, badge, caption, then an answers table (`diagnostic.tsx:743-812`). This is the single moment the entire test builds toward; ELSA makes this screen the aha-moment (score + band + colored words) and Duolingo wraps equivalent moments in confetti + staggered stat cards
- ⚠ Settings/Log Out buttons injected into every state (`diagnostic.tsx:669-688`) — IA smell (F1)
- ⚠ The result card between questions is inline and text-dense — same prose-over-data issue as practice feedback (F7)

### 5.4 Home (`app/home.tsx`) — post-diagnostic landing
- ✅ Pull-to-refresh, refresh-failure notice that keeps data, session summary card, due-chip, hardware-back handling
- ⚠ **The dashboard reads like a report, not a home**: greeting (15pt muted), then a stats card (label rows + 12px bar + sentences), then one CTA, then three text links. Leaders open with a hero: streak/goal stat row (Duolingo's flame/gems/XP), today's plan card (ELSA "5 lessons, ~6 min"), or path position
- ⚠ Streak = sentence + emoji — no calendar, no milestone framing, no at-risk indicator (Duolingo's streak work: milestones, phoenix animation, share cards)
- ⚠ No daily goal concept anywhere in the app despite having a reminder engine + SRS scheduler that would make it real
- ⚠ Secondary destinations are buttons in a wrapped row (`home.tsx:321-343`) — replaced entirely by a tab bar (F1)
- ⚠ Level shown as "B1" text + caption — no level-path visualization (F3)

### 5.5 Practice (`app/practice/index.tsx`) — the daily loop
- ✅ Stable served question across retries, first-visit explainer card, revision/new/attempt chips, native-mode switch, skip with closed-cycle handling, inline rate-limit notice instead of alert spam
- ⚠ Card header is a wall of chips (level badge, kind badge, attempt chip, caption, progress line) before the prompt (`practice/index.tsx:668-707`) — chips carry data, but 5 metadata lines above the question invert the hierarchy; leaders put the prompt word hero-large with one status chip and a progress bar
- ⚠ Help entry = "?" floating button (`practice/index.tsx:720-744`) — icon system (F2)
- ⚠ "Answer in my language" pill toggle works but is a mode-switch pattern leaders avoid mid-lesson (Speak keeps one mode per exercise and sets expectations before recording)
- ✗ Footer row with Settings + Log Out pinned under the recorder (`practice/index.tsx:830-853`) — remove with tabs (F1)

### 5.6 Recorder (`app/src/components/Recorder.tsx`) — hero interaction
- ✅ Tap-to-toggle record (the accessible, recommended pattern — no hold-gesture discoverability problem), pulse ring with Reduce Motion fallback to text, live segmented meter, countdown announcements at 60/90/110s, cancel-capable upload, permission-denied recovery with Settings deep-link, review-before-submit (play, re-record, discard), retention choice explicit
- ⚠ **Meter is 6 segments × 10px** (`Recorder.tsx:4223-4239`) — leaders show a live waveform (ELSA/BoldVoice/Speak); a segment bar reads as a battery indicator
- ⚠ **Mic glyph is a white circle; stop is a square** (`Recorder.tsx:4205-4216`) — the primary control of a speaking app has no microphone imagery
- ✗ **Review stack hierarchy**: retention switch card, Play, Submit, Re-record, Discard as five equal full-width buttons (`Recorder.tsx:4094-4144`). Submit must dominate; Discard should be a quiet destructive text/icon action (it already has a confirm dialog)
- ⚠ Permanent legalese: `privacyNote` + `retentionNote` render under every recorder at all times (`Recorder.tsx:4009-4010`) — two lines of policy on every learning screen; better as a one-line lock icon + "Private" link to the full note
- ⚠ No waveform scrubber in review; duration text is the only playback affordance

### 5.7 Feedback (`app/practice/feedback.tsx`)
- ✅ Nine well-differentiated variants with correct CTAs per variant; hardware-back mapped to the variant's primary action; transcript/translation/model-answer sections; inline recording playback; success haptic on mastery/level-up
- ✗ Prose-over-data (F7): no score ring, no per-word coloring, no visual differentiation beyond title color + emoji; the essay paragraph is the only coaching surface
- ✗ No motion: outcome header appears statically; Duolingo's equivalent is a full-bleed colored sheet with entrance animation, and the lesson-complete beat is confetti + staggered stat cards
- ⚠ Emoji headers (9 variants) — F2
- ⚠ Only 2 of 9 variants get haptics; failures/retries get none (HIG: warning/error notification haptics exist for this)

### 5.8 Practice Mode / Attempt (`app/practice/attempt.tsx`), Help (`app/practice/help.tsx`)
- ✅ Minimal focused attempt screen; help with translated question + example sentences is a genuinely good pedagogical surface (Babbel-style explicit help)
- ⚠ Help presentation is stacked labeled paragraphs; examples could be numbered tappable cards with play icons (future TTS)
- ⚠ Same prose-over-data feedback path

### 5.9 History (`app/history.tsx`)
- ✅ Day-grouped sections with sticky headers, expandable rows with score chips (colored by outcome — the best existing use of color-as-data in the app), infinite scroll **with** a load-more fallback footer and failure-retry discipline, pagination safety stop with terminal copy
- ⚠ No filter (pass/fail, word search), no trends view — leaders surface weekly activity charts (Busuu/Duolingo) and problem-word analytics (ELSA "sounds that challenge you")
- ⚠ Row expansion hint is text ("Details"); chevron icon standard
- ⚠ Empty state: title + body + CTA, no illustration (Polaris pattern)

### 5.10 Recordings (`app/recordings.tsx`)
- ✅ Owner-scoped list, retention-pending surfacing with refresh action, share/playback with the shared playback component
- ⚠ Same list-pattern gaps as History (icons, empty-state art)

### 5.11 Settings (`app/settings/index.tsx`, 1,756 lines)
- ✅ Everything is there: language chips with native/English labels and inline saving spinners, reminder toggle + hour stepper, export, retake placement, privacy/terms, change password, delete account with typed confirmation — functionally complete and careful
- ⚠ All actions are undifferentiated text rows; leaders use icon+label+chevron rows grouped in sections (M3 lists). 1,756 lines in one file also makes this screen the app's densest surface
- ⚠ Reminder time stepper = `+`/`−` text buttons — a wheel picker or dropdown is the platform pattern
- ⚠ Delete-account copy leaks implementation language: "Stored recording files remain queued until asynchronous permanent deletion completes" (`i18n.tsx` `da.confirmBody`) — NN/g: no jargon; Carbon: plain language. Suggested: "Recording files are deleted permanently in the background; this can take a little longer."

### 5.12 Global components
- `NetworkStatusBanner` ✅ (floating, non-blocking, auto-dismiss back-online) · `DataRefreshNotice` ✅ (non-blocking freshness) · `ClientUpgradeModal` ✅ · `Button` ⚠ (felt press missing) · `UiLanguagePicker` ✅ · `OfflineState` ⚠ text-only

---

## 6. Design-token audit (`lib/theme.ts`)

| Layer | Status | Detail |
|---|---|---|
| Color | ✅ strong | Dual WCAG-verified palettes, on-fill pairs, semantic names. Gap: no secondary/tertiary accent (M3 roles), no celebration/warn gradient family |
| Spacing | ✅ strong | 4-pt base scale (xs–xxl) |
| Radii | ✅ good | badge/input/button/card/pill |
| Layout | ✅ good | screenPadding 20, formMaxWidth 560, contentMaxWidth 760, minimumTarget 48 (meets/exceeds HIG 44 & M3 48) |
| **Typography** | ✗ missing | 21 ad-hoc sizes across screens; no type tokens; body at 14/15pt below HIG 17 / M3 16 |
| **Motion** | ✗ missing | No duration/easing tokens; 1 animation total |
| **Elevation** | ✗ missing | Light mode = hairline outlines only; no shadow ladder |
| Iconography | ✗ missing | No icon componentry |

Add to `theme.ts`: `type` scale (map your current sizes into display/title/headline/body/label), `motion: { fast: 100, base: 200, slow: 300, easing: { standard, decelerate, entrance } }`, `elevation: { card, raised, overlay }` pairs per scheme, and an `Icon` wrapper component so icons theme centrally.

---

## 7. Accessibility audit

**At or above consumer bar (rare):** roles/labels/hints/states throughout; `accessibilityValue` on the mastery progressbar; iOS queued announcements for question/step changes + Android live regions; `accessibilityLanguage` per content language; decorative art hidden; 48-pt targets; contrast-verified both schemes and pinned by tests; Reduce Motion honored for the pulse; `accessibilityElementsHidden` spinners inside buttons.

**Residual gaps:**
1. ⚠ No `maxFontSizeMultiplier` capping on constrained chrome (chips, badges, footer rows) — at AX sizes the chip rows will wrap aggressively; cap chrome text (e.g., 1.5) while leaving content uncapped
2. ⚠ Icon-only plans (help `?`, future icons) must carry labels — you already do this for `?`; keep the discipline when the icon system lands
3. ⚠ Score communicated by color-only in places (chips/rings when added) — always pair with text (you already do on chips; keep for rings)
4. ⚠ Emoji headers are hidden from screen readers (correct), meaning VoiceOver users get **less** celebration content than sighted users — replace with described illustration components when the icon system lands
5. ⚠ History infinite scroll exposes only loaded rows to TalkBack — your load-more footer mitigates; consider announcing "loaded N of M"

---

## 8. Copy audit

**Strengths (keep):** warm, plain, second-person; constructive errors with next steps and no codes; silence framed reassuringly ("it did not count as a try"); five UI languages with localized accessibility tags; "Your learning data is safe" reassurance in the error boundary.

**Jargon/leaks to fix:**
- `da.confirmBody` / `da.warningBody`: "asynchronous permanent deletion", "queued" → plain background-deletion phrasing
- `recorder.statusRecovering`: "Checking if your last answer was saved…" is good, but `replay.failedBody` ("Your saved answer is still safe. Try again now or check later.") appears as the recorder status text in parked state — two concepts ("status" vs "action needed") collide on one line
- `practice.answeringNative`: "You are answering in your language — tap for English" — long for a toggle; split label/hint
- `feedback.scoreMeaning` shows two thresholds as a caption on every result — teach once, then show only the band

---

## 9. What NOT to copy from the leaders

- **Duolingo hearts/energy economy** — the energy experiment triggered documented user backlash; your free-retry silence policy is friendlier. Keep it
- **Busuu's 22-step signup** — the counter-example; your low-step auth is right, it just needs value-first framing
- **ELSA's content sprawl** — their 2024/25 redesign *consolidated* surfaces after "overwhelming" complaints; your single-path practice is aligned with where they landed
- **Leaderboard/leagues** — powerful (+25% lesson completion) but requires critical mass; defer to post-launch

---

## 10. Prioritized remediation roadmap

Effort assumes one engineer fluent in this codebase; every item honors the repo's rules (additive API contract, single Recorder component, mutation-campaign obligations noted in §11).

### P0 — Structure & trust (≈ 3–5 days)
1. **Bottom tab navigation** (Learn · Practice · History · Profile) under the existing auth guards; remove practice/diagnostic Settings+Logout footers; logout lives in Profile/Settings only *(fixes the #1 "all over the place" driver)*
2. **Felt button press states + motion tokens** — scale 0.96–0.97/100ms, duration+easing tokens in `theme.ts`
3. **Typography tokens + body-size bump to 16–17pt** — kills the small-print density

### P1 — The product-defining upgrades (≈ 2–3 weeks)
4. **Feedback redesign** (F7): variant-colored full-bleed header, animated score ring with count-up, per-word color-coded transcript (needs an additive provider-prompt extension for word alignment), "fix these 2 things" highlights, haptics per outcome class, entrance animation + confetti on mastered/level-up
5. **Icon system** (lucide or equivalent) replacing `?`, Show/Hide, `+`/`−`, `✓`, mic dot/stop square; small illustration set (empty states, feedback, onboarding)
6. **Diagnostic experience**: animated progress bar, pre-permission mic explainer, and a real level-reveal celebration (confetti + animated level ring + staggered answer stats)
7. **Recorder upgrades**: waveform (expo-audio metering → animated bars is already 80% built), real mic/stop icons, review-stack hierarchy (Submit dominant, Discard quiet), collapse privacy/retention notes into one line + link
8. **Home as a dashboard**: streak calendar strip + daily-goal card (wire the existing reminder/SRS engine), mastery ring, level path row

### P2 — Polish & growth (≈ 2 weeks)
9. Skeleton loaders for question/history loads; illustrated empty states (Polaris pattern)
10. Onboarding value carousel + goal/motivation capture before signup; password strength meter; drop the confirm-password field; on-blur validation
11. Settings restructure: icon+chevron rows, grouped sections; wheel/dropdown for reminder time
12. History trends: weekly activity chart, filter chips
13. Copy jargon fixes (§8)
14. Login: Sign in with Apple / passkey support

---

## 11. Repo-constraint notes for implementing

- **Response contract is additive-only** — the word-alignment feedback extension must be additive (new optional field) or it forces `MIN_CLIENT_VERSION` + app-store floor bumps per AGENTS.md
- **Recorder is spec-pinned** — all recorder changes go through the single `Recorder.tsx`; its state machine is heavily guarded by mutation tests, so visual-layer changes should be style/JSX-level with the campaign rerun
- **Any production-source change requires the full app mutation campaign** (`npm run mutation` + the three supplements) per AGENTS.md — batch P1 items into one campaign window
- Dark-mode discipline: any new celebration/accent colors must be added as contrast-verified pairs in both palettes and pinned in `__tests__/theme-test` like the existing tokens
- The tab refactor should keep the assessment flow (attempt/feedback/help) as pushes inside the Practice tab and preserve the exit-lock/gesture gating already built into those screens

---

## 12. Source appendix (benchmarks)

- Duolingo design blog: [new home screen (path) design](https://blog.duolingo.com/new-duolingo-home-screen-design/) · [streak milestone design & animation](https://blog.duolingo.com/streak-milestone-design-animation/)
- Duolingo leagues (+25% completion): [Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/leagues); [help/leaderboards](https://www.duolingo.com/help/leaderboards-and-league)
- ELSA assessment/feedback model: [Skywork deep dive](https://skywork.ai/skypage/en/ELSA-Speak-in-2025-An-AI-User%2527s-Deep-Dive-into-the-Ultimate-Pronunciation-Coach/1974387185089703936) · [ELSA FAQ](https://elsaspeak.com/en/faqs/how-does-elsas-pronunciation-feedback-work)
- Busuu 22-step onboarding counter-example: [ScreensDesign](https://screensdesign.com/showcase/busuu-language-learning); Babbel lesson flow: [LingQ review](https://www.lingq.com/blog/babbel-review/)
- Word-level feedback as field standard: [MDPI 2025](https://www.mdpi.com/2414-4088/10/1/2); BoldVoice per-word/per-sound: [app guide](https://boldvoice.com/blog/boldvoice-app-guide); Speak word highlighting: [LanguaTalk review](https://languatalk.com/blog/speak-app-review/)
- Apple HIG: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) · [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts) · [App Review 5.1.1(v) deletion](https://developer.apple.com/news/?id=12m75xbj)
- Material 3: [type scale tokens](https://m3.material.io/styles/typography/type-scale-tokens) · [elevation](https://m3.material.io/styles/elevation/tokens) · [color roles](https://m3.material.io/styles/color/roles) · [progress indicators](https://m3.material.io/components/progress-indicators/overview) · MDC component specs (FAB/Snackbar/Chip/Card)
- NN/g: [animation duration](https://www.nngroup.com/articles/animation-duration/) · [error-message guidelines](https://www.nngroup.com/articles/error-message-guidelines/) · [registration & login checklist](https://www.nngroup.com/articles/checklist-registration-login/) · [skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [infinite scrolling](https://www.nngroup.com/articles/infinite-scrolling/) · [permission requests](https://www.nngroup.com/articles/permission-requests/)
- WCAG 2.1/2.2: contrast (1.4.3, 1.4.11) · target size (2.5.8, 2.5.5)
- Empty-state patterns: [Shopify Polaris](https://shopify.dev/docs/api/app-home/patterns/compositions/empty-state) · [IBM Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/)
