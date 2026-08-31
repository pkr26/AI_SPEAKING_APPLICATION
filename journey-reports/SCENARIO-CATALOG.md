# Scenario Catalog — every scenario identified, and where each was verified

Research pass before the final execution round. Every user-reachable behavior
in the system, no matter how small, with its verification status:
**[01]–[12]** = journey report number (live HTTP evidence),
**[App]** = the app's own suite presses the actual control (3,875 tests),
**[Pinned]** = repo test suite, **[Sim]** = needs a device/simulator (not
runnable in this harness), **[Infra]** = needs real S3/OpenAI (gated tool).

## 1. Authentication & account lifecycle
| Scenario | Status |
| --- | --- |
| Register: every field missing/malformed | [01] live |
| Register: password boundaries 7/8/no-letter/no-number/72/73 bytes | [04] live |
| Register: name boundaries incl. control chars/Telugu/emoji | [04] live |
| Register: duplicate email (EMAIL_TAKEN) | [01] live |
| Register: per-network budget exhaustion (429 + Retry-After) | [01] live (organic), [12] |
| Login: wrong password / unknown account / case-insensitive email | [01] [04] live |
| Login: account lockout after repeated failures (credential budget) | [12] live |
| Login: per-IP auth budget | [12] live |
| /auth/me: no token / garbage token / revoked token | [01] [03] live |
| Logout: bearer revoked server-side; all-device semantics | [03] live |
| Change password: wrong current, same-as-current, weak new, success + token rotation | [03] [04] live |
| Forgot password: unknown email uniform 204, malformed 400, resend | [02] [04] live |
| Forgot password: per-email silent budget (enumeration guard) | [12] live |
| Reset password: wrong code, weak new, success + TOKEN_REVOKED | [02] live |
| Delete account: wrong password, success, cascade, token dead | [03] live |
| Delete account: unconfirmed transport (session kept) | [App] |

## 2. Diagnostic (placement test)
| Scenario | Status |
| --- | --- |
| Fresh run starts at B1 midpoint; question durable across re-fetches | [01] live |
| Adaptive pass/fail window narrowing; 3-question bound; window collapse | [01] [02] live |
| All-fail run → A1 floor | [Pinned] (probability-bound live) |
| Wrong/stale/unknown questionId → QUESTION_MISMATCH | [01] [02] live |
| Fake audio (text-as-m4a) → 415 magic-byte gate | [01] live, per-format [10] |
| Silence → free retry, no attempt, same question | [Pinned diagnostic-silence] |
| Duplicate submission replay (same requestId+questionId) | [02] live |
| Replay with different question → 409 | [01] live |
| Crash reconciliation GET /assessments/{id} (found/unknown/malformed) | [01] live, foreign owner [11] |
| Concurrent double-submit → ASSESSMENT_IN_PROGRESS claim | [11] live attempt + [Pinned] |
| Mid-run resume across devices/installs | [02] live |
| Restart: unconfirmed 400 / confirmed 204 / state reset / keeps history | [02] live |
| Restart: rate budget (429) | [12] live |
| Answer after completion: unknown id 409 / real id DIAGNOSTIC_DONE | [01] [03] live |
| Completion reveal durable until acknowledged; acknowledge idempotent | [01] live |
| Legacy counted-silence repair | [Pinned] |
| Android hardware-back mid-test | [App] |

## 3. Practice (per assignment)
| Scenario | Status |
| --- | --- |
| Assignment at placed level; durable same question+cycleId on refetch | [03] live, ×4 languages [05] |
| Shared 3-try budget English↔native (n,n,e and e,n orderings) | [03] [05] live |
| All-three-native arc + fourth rejection | [10] live |
| Pass ≥60 closes cycle; attemptsLeft→0 immediately | [05] live |
| Master ≥75 vs 60–74 pass-not-mastered | [03] live |
| Third-fail finalFeedback with model answer | [03] live |
| Native: comprehension payload, no mastery/SRS writes | [03] [05] live |
| Native silence | [Pinned stuck-cases] |
| Skip: correct ids 204 + new cycle; wrong ids rejected; stale pre-skip cycle | [03] live, [11] stale |
| Arbitrary cycleId / foreign question | [03] live |
| Duplicate replay per endpoint (english/native) | [03] live, native [10] |
| 429 inline rate-limit card + Retry-After honored, 503 CAPACITY_BUSY retry | [App] + [01] 429 observed |
| Mastery/SRS/stats bookkeeping; per-level mastery after re-placement | [03] live |
| Promotion at 85% mastery | [Pinned level-progression] (needs 85 words live) |

## 4. Help / translations
| Scenario | Status |
| --- | --- |
| 3 bilingual examples; native word+question per language (script-asserted) | [05] live |
| ETag revalidation 304; Vary: Authorization | [03] live |
| Unknown question 404; malformed UUID 400; question above level 403 | [03] live + [09] |
| Help follows nativeLanguage, NOT uiLanguage (same question, flipped profile) | [09] live |
| Help cache invalidation on mother-tongue change | [09] live + [App] |

## 5. History / Recordings / audio
| Scenario | Status |
| --- | --- |
| History newest-first rows, cursor paging, identical repeat page | [03] [06] live |
| Garbage cursor 400; foreign cursor 400; limit cap 50; limit 0/negative | [03] [06] live + [11] |
| Full multi-page export walk to done flags | [11] live |
| History rows: no audio in direct mode (recordingId null) | [06] live |
| Delete-all: epoch fence hides audio instantly, text survives | [06] live + [Pinned] |
| Recordings list/export empty topology; playback 404; single delete idempotent 204 | [06] [07] live |
| Playback-grant budget 429 | [12] live |
| Real audio bytes accepted (AAC tone) end-to-end | [06] [10] live |
| retainRecording true/false/omitted-legacy | [10] live |
| Magic-byte matrix per container (m4a/mp3/wav/ogg/webm/flac; wrong magic) | [10] live |
| >25 MiB upload rejected | [10] live |
| Extra multipart fields beyond 4 → rejected | [10] live |
| No server-side residue after any submission | [06] live |
| S3 retained-recording lifecycle (retag, version-pinned playback, deletion jobs) | [Infra smoke:s3] + [Pinned] |
| Audio duration/silence/overlong gates | [Pinned audio-inspection] (skipped in mock) |
| Share audio uses local file only | [App] |

## 6. Settings (every row)
| Scenario | Status |
| --- | --- |
| Name editor boundaries + empty/unknown-field PATCH | [04] live |
| uiLanguage × 5 values + case-sensitivity | [04] live, round-trip ×4 [05], all-values ×4 [09] |
| nativeLanguage × 4 values; en rejected | [04] live |
| uiLanguage does NOT relocalize learning content | [09] live |
| Daily reminder toggle/hour | purely local [Code]; [App] daily-reminder tests |
| Ad privacy options (UMP) | local-only, ads hard-off [01] [App] |
| My recordings row → recordings surface | [06] live |
| Delete all recordings (confirm) | [06] live + [12] budget |
| Change password row/screen | [03] [04] live |
| Export my data (multi-page, both collections) | [04] [11] live |
| Restart level test (confirm) | [02] [03] live |
| Privacy/Terms | [App] |
| Log out (+ local sign-out fallback) | [03] live + [App] |
| Delete account flow | [03] live |

## 7. Client-upgrade & operational
| Scenario | Status |
| --- | --- |
| 426 gate: version matrix, missing/malformed header | [07] live |
| Exempt privacy/portability exits during upgrade | [07] live |
| Upgrade modal latch rules + store URL validation | [App] client-upgrade tests |
| 404 shape; trailing slashes; /metrics disabled; helmet headers; CORS preflight | [11] live |
| Malformed/oversized JSON; wrong content-type | [11] live |
| Slow-loris header dribble / idle sockets | [Pinned slow-client-guard] (needs raw sockets) |
| Graceful shutdown drain | [Pinned index-lifecycle] |

## 8. Language-specific completeness (order: te → hi → zh → es)
| Scenario | Status |
| --- | --- |
| Full lifecycle per language (register→placement→practice→native→history→export→password→logout→delete) | [09] [10] live |
| Recording flow per language (grants ×3 endpoints, real audio, retain, replay) | [10] live |
| Settings matrix per language (all uiLanguage values, name save, exports) | [09] live |
| Help language divergence on identical content | [09] live |
| Localized UI copy per language (i18n rendering) | [App] i18n tests |
| Whisper hint per language (te omitted) | [Code] + [05] |

## Explicitly NOT runnable in this harness (and the designated tool)
- Live Whisper/GPT grading, provider 503/abort paths → `smoke:s3`/live-load tools (Infra)
- S3 retained recordings byte round-trip → `ALLOW_LIVE_S3_TEST=true npm run smoke:s3` (Infra)
- Physical mic/permission dialogs, OS share sheet, notifications, haptics → simulator (Sim)
