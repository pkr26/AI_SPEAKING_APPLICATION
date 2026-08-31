# Scenario 6 — "Is the audio in History the recording I made?"

**The direct answer:** in this topology (dev/test "direct upload" mode)
**History holds no audio at all** — every history row is a text record
(`recordingId: null`), the Recordings screen is empty by design, and the
bytes you uploaded are deleted from the server's private upload directory
immediately after assessment. That is the product working as designed, not a
gap. The playable-audio path exists only in production S3 mode, where this
report pinpoints exactly what guarantees it and how to verify it live.

Evidence: [`evidence/scenario6.log`](evidence/scenario6.log) — 6/6 checks
passed, plus the pinned S3 suites cited below.

## What was verified live

A **real audio file** (ffmpeg-synthesized 2-second AAC tone, 17,577 bytes,
`sha256 1e99c33b…`) was submitted through the actual multipart pipeline —
placement answers and two practice attempts, one with
`retainRecording=true` (the "Save this recording" switch ON) and one with
`false`:

1. **Server-side residue: none.** `server/uploads` (mode 0700) was empty
   before the attempts and empty immediately after — even the
   `retainRecording=true` take left nothing on the API server's disk. In
   direct mode there is no retained object anywhere.
2. **History rows are text records.** Every row for both attempts carried
   `recordingId: null` and `recordingStatus: null`. The History screen shows
   playback controls only for rows that reference a retained recording — so
   in this mode the app correctly shows no audio anywhere in History. Your
   transcript/score/feedback ARE in History; the sound is not, because it
   was never stored.
3. **The Recordings screen (the only audio surface) is correctly empty**:
   list/export empty, `playback-url` for an arbitrary id → **404**,
   oversized page request (`limit=1000`) → **400** ("≤ 50").
4. **Delete-all is a no-op-safe privacy exit:** `DELETE /recordings` →
   **204**, and history's text rows survive it untouched (they are not
   audio).
5. **Paging integrity:** following the same cursor twice returns the
   byte-identical page (idempotent); using **another user's attempt id** as
   your cursor → **400 `Invalid history cursor`** — owner-scoped keyset
   paging, no cross-account reads.

## Why there is nothing to compare against (by design)

The product's audio-retention contract (`AGENTS.md`, migrations 017/020–024):

- The Recorder's **"Save this recording" switch defaults OFF**; only an
  explicit opt-in can retain a take.
- Retention exists **only in the split-S3 production mode**: a fresh,
  successful, opt-in assessment with a current retention epoch commits
  `recordingId` + permanent metadata, suppresses the transient-object
  delete, and pins the **exact S3 VersionId** it processed.
- Everything else — failed, rejected, replayed, aborted, opt-out, and all
  direct-mode submissions — stays transient and is deleted.

## How "same bytes" IS guaranteed where audio exists (production S3)

The playback path is version-pinned end-to-end, so what you hear is the
exact version that was assessed. The repo's pinned suites verify each link
(`tests/audio-upload-s3.test.ts`, `tests/recordings.test.ts`, all passing):

- `signs an exact VersionId-pinned inline playback request with the
  requested TTL` — playback can never drift to a newer version of the key.
- `issues an owner-only short-lived playback URL and keeps pending/foreign
  rows private` — nobody else can reach your audio.
- `retags only a learner-owned exact version` / `deletes only exact-key
  versions and delete markers` — retention and deletion are surgically
  version-exact.
- `deletes idempotently and transactionally leaves a durable S3 deletion
  job` / `account deletion cascades metadata but preserves a durable
  object-deletion tombstone` — deletion eventually reaches every version.
- History's `LEFT JOIN recordings … AND r.recording_retention_epoch =
  u.recording_retention_epoch` (server/src/practice.ts) is the mechanism
  that instantly hides every old recording the moment you tap
  **Delete all recordings** — the epoch fence, verified live in step 4
  above (and by `bulk-hides only the owner recordings…`).

**To close the loop on real bytes end-to-end** (upload → S3 → playback →
hash-compare), run the repo's explicitly gated acceptance tool on an
authorized nonproduction deployment:

```bash
ALLOW_LIVE_S3_TEST=true AUDIO_FILE=/absolute/path/to/synthetic.m4a npm run smoke:s3
```

It creates real S3 objects (and, without `MOCK_AI`, paid provider traffic),
which is why it stays opt-in and was not run as part of this journey.

## Verdict

**Pass, 6/6.** The absence of audio in History is the correct, privacy-first
behavior of direct mode; no residue persists; the S3-only retained path is
version-pinned and owner-only, with every link pinned by tests and one
gated live tool for byte-level confirmation.
