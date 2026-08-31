# Scenario 10 — Recording deep-dive per mother tongue (te → hi → zh → es)

**Persona:** the same four learners, now exercising the ENTIRE recording
pipeline with a real audio file (ffmpeg AAC tone, hashed) — in their own
language order. Evidence:
[`evidence/scenario10.log`](evidence/scenario10.log) — **66/66 checks
passed**.

## Per-language recording matrix (identical ×4)

| Step | Result |
| --- | --- |
| Upload grant for each of the 3 endpoints (`/diagnostic/answer`, `/practice/attempt`, `/practice/attempt/native`) | 200 `direct` mode, endpoint echoed ✓ |
| Diagnostic answer with real bytes + `retainRecording=true` | 200 ✓ |
| Exact duplicate retransmit (same requestId+questionId) | **byte-equal stored replay**, no second assessment ✓ |
| English arc on real bytes (attemptNo 1→3, shared budget) | ✓ |
| **All-native arc**: native tries 1, 2, 3 | attemptNo 1/2/3 ✓; after three native tries the cycle is closed and a **new cycle is served** ✓ |
| Native-endpoint duplicate replay | stored response replayed ✓ |
| `retainRecording` omitted (legacy client) | accepted (backward-compat default) ✓ |
| History native rows snapshot the language | ≥3 rows, all `nativeLanguage: lang` ✓ |

The "Save this recording" choice, the replay protection, and the shared
three-try budget all behave identically in Telugu, Hindi, Chinese, and
Spanish.

## Container/format gate matrix (language-independent)

**Ordering discovery** (a real behavioral fact, now pinned): with a
*nonexistent* question id, every submission — even pure text bytes — answers
**409 QUESTION_MISMATCH**: the question check runs **before** the audio
magic-byte gate. With the *served* question, the byte gate itself answers:

| Bytes | Result |
| --- | --- |
| text renamed `.m4a` | **415 `Invalid audio file`** |
| ID3/mp3 magic inside a `.wav`+`audio/wav` pair (signature ≠ pair) | **415** |
| valid ftyp `.m4a` / RIFF `.wav` / OggS `.ogg` / EBML `.webm` / fLaC `.flac` / ID3 `.mp3` | accepted past the gate |
| a REAL `.mp3` file (correct magic + pair) end-to-end | **200** — non-m4a containers work through the whole pipeline |

## Upload plumbing edges (multer-level, before any question logic)

| Input | Result |
| --- | --- |
| 26 MiB file (cap 25 MiB) | **413 `{"error":"File too large (max 25MB)","code":"AUDIO_TOO_LARGE"}`** |
| multipart with a SIXTH part (4 text fields max) | **400 `Too many fields`** |
| missing `questionId` field | 400 `questionId: Required` |
| `retainRecording='maybe'` | 400 `Expected boolean, received string` |

## Verdict

**Pass, 66/66.** The recording pipeline is language-blind where it should be
(bytes, budgets, replays) and language-aware exactly where designed (native
attempts, history snapshots). The one ordering nuance discovered (question
check precedes the byte gate) is fail-closed in both orders — hostile bytes
can never reach storage or the provider.
