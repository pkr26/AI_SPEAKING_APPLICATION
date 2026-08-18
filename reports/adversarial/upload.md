# Adversarial Review — Direct Audio Upload (multer multipart-to-disk path)

- **Date:** 2026-08-14
- **Scope:** `server/src/upload.ts`, `server/src/audio-upload.ts` (direct-mode surface), `server/src/audio-inspection.ts`, route wiring in `server/src/practice.ts` / `server/src/diagnostic.ts`, error mapping in `server/src/middleware.ts`. Live attacks against the dev server at `http://localhost:4000` (`MOCK_AI=true`, `S3_BUCKET` empty → multer path active, rate limits relaxed) plus a self-started `MOCK_AI=false` probe server on port 4100 (same throwaway DB `ai_english_adversarial`, dummy `OPENAI_API_KEY`) used as a production-gate differential oracle. Probe server was stopped afterwards.
- **Prior audit cross-check:** `AUDIT_REPORT.md` claims "Unified the direct- and S3-upload byte ceiling, fixed the direct-upload exact 25 MiB boundary … made local orphan cleanup deterministic and accurately reported" and "multer `_removeFile` no longer throws synchronously on a path-less file". Both verified intact (see below); not re-reported as findings.

## Test position

- User `up1@test.dev` (id `40e309d8-9073-4909-aeae-574e777744aa`), forced to `diagnostic_completed=true, cefr_level='B1'` via SQL; B1 question `c9ba658c-44d3-466b-bd86-39fee2c82592` used for `POST /practice/attempt` multipart probes (`-F questionId=… -F requestId=<fresh uuid> -F audio=@…`).
- Fixtures built in `/tmp/adv` with ffmpeg/python: valid 1s M4A/MP3, `ftyp`-header+1 MiB random junk, valid MP3 + 8 MiB junk tail, exact 25 MiB±1 byte files.
- `server/uploads` was empty before testing; orphan state checked after every probe batch.

---

## Finding 1 (LOW) — Malformed multipart bodies yield HTTP 500 "Internal server error" (with ERROR-level logs + stack traces) instead of a 4xx

**Severity:** low
**Location:** `server/src/middleware.ts:122-148` (errorHandler falls through to generic 500); root cause in dependency behavior — multer 1.x `make-middleware.js:252` forwards busboy parser errors unwrapped (`busboy.on('error', abortWithError)`), so they are plain `Error`, not `MulterError`.

**Reproduction (live, against :4000; all require only a valid bearer token):**

1. NUL byte in the file part's `filename`:
   `Content-Disposition: form-data; name="audio"; filename="a.m4a<NUL>.exe"` (raw byte 0x00)
   → `HTTP 500 {"error":"Internal server error"}` — busboy `Error: Malformed part header`.
2. Truncated form: fields + file data, declared `Content-Length` satisfied, but **no closing boundary**
   → `HTTP 500 {"error":"Internal server error"}` — busboy `Error: Unexpected end of form`.
3. `Content-Type: multipart/form-data` with **no boundary parameter**, or a boundary that never appears in the body
   → `HTTP 500 {"error":"Internal server error"}`.
4. File payload containing a real `\r\n--<boundary>\r\n` delimiter followed by non-header bytes
   → `HTTP 500` (same `Malformed part header` path).

Observed vs expected: expected a stable 4xx (the repo's own convention — "malformed UUIDs must 400, not 500", AGENTS.md; `errorHandler` already maps `MulterError` to 400/413 at `middleware.ts:126-131`); observed generic 500. Probe-server log (`MOCK_AI=false` instance, same code) shows each occurrence logged at ERROR with a full stack (`Error: Malformed part header` at `busboy/lib/types/multipart.js:398`, `Error: Unexpected end of form` at `:588`), i.e. attacker-triggerable "unhandled error" telemetry.

**Impact:**
- No sensitive data is returned to the client (generic message).
- No file residue: `server/uploads` verified empty after every 500 case (the pipeline/`_removeFile` cleanup works even on these paths).
- Real impact is operational: any authenticated account can mint ERROR-level log entries with stack traces on demand (bounded in production by the assess limiter — default 20/hr/user plus 300/day/IP — since `limiters.assess` runs before `uploadAudio`), polluting crash/error monitoring and potentially masking genuine 500s. Status-code taxonomy also breaks client retry logic (500 looks retryable/server-side; 400 is not).

**Suggested fix (not applied — read-only engagement):** map known busboy parser-error messages (`Malformed part header`, `Unexpected end of form`, `Unexpected end of file`, `Missing boundary`, …) to `400` in `errorHandler`, or wrap the `busboy.on('error')` path in a `MulterError`-equivalent `HttpError(400)` inside `uploadAudio`'s callback.

---

## Endgame impacts — DISPROVEN

1. **Writing outside `server/uploads` (RCE):** not possible via this API. The storage engine never uses the client filename for the path: `privateDiskStorage._handleFile` stores `${randomUUID()}${allowlistedExt}` under a fixed `uploadsDir` (`upload.ts:31-34`) with `flags: 'wx'`, mode 0600, inside a 0700 directory. Live-sent filenames `../../etc/passwd.m4a`, `../../tmp/evil.m4a`, `/tmp/evil.m4a`, `..\..\evil.m4a`, `shell.php.m4a` were all *processed* (200) but landed nowhere except the uuid-named file; `/tmp/evil.m4a`, repo-root and `server/` escapes all confirmed absent afterwards. Nothing serves `server/uploads` over HTTP (no static route; `/uploads` router exposes only `POST /audio-url`).
2. **Getting rejected-worthy audio to the paid transcriber (money loss):** disproven for junk payloads. In `MOCK_AI=true` mode, `ftyp`+1 MiB junk and MP3+8 MiB-junk-tail both returned 200 from the mock assessor — expected, because the duration gate is intentionally skipped in mock mode (`practice.ts:312`, `diagnostic.ts:331`: `if (!config.mockAi) await verifyAudioDuration(...)`). On the `MOCK_AI=false` probe the same files both got `415 Invalid or unsupported audio file` from the FFmpeg decode gate **before any provider call**, while a valid M4A passed the gate and proceeded to the provider stage (502 with the dummy key; the attempt genuinely reached `api.openai.com` and was 401'd — confirming the wiring the gate protects). The magic-byte check (`verifyAudioMagicBytes`, first-12-bytes, extension-bound) alone is spoofable by design; the production money boundary is the FFmpeg gate, and it held.
3. **Disk-fill DoS:** bounded. Per-connection cap is 25 MiB; connection lifetime is bounded by `requestTimeout` (130 s with defaults; observed kill at ~154 s including Node's ~30 s timeout-check granularity); partial files are deleted within seconds of socket death (observed ≤5 s). 24 concurrent 25 MiB uploads peaked at 21 files / 255.6 MiB transient and cleaned to zero. Sustained abuse still requires passing the per-user/per-IP assess budgets in production. No unbounded queue or orphan accumulation found.
4. **Persistent DoS / crash:** the main server (PID 47637, started 10:09:53) survived every probe without restart; `/health` green at the end of the session.

---

## Attacks that the code RESISTED (verified live)

- **Exact 25 MiB boundary** (audit claim re-verified): 25 MiB−1 → 200; 25 MiB exact → 200 (`size` = 26214400); 25 MiB+1 → 413 `File too large (max 25MB)`; `server/uploads` byte-identical before/after (no partial residue). The `fileSize: MAX+1` headroom trick (`upload.ts:58-63`) behaves exactly as commented.
- **Extension/MIME confusion matrix:** `evil.m4a.exe` → 415; `.m4a`+`audio/mpeg` → 415; `.mp3`+`audio/mp4` → 415; `.m4a`+`text/plain` → 415; extensionless → 415; `.m4a ` (trailing space/tab) → 415; fullwidth `．ｍ４ａ` → 415; `a.m4a.` → 415; dotfile `.m4a` → 415. Accepted-and-harmless (stored as `uuid.m4a`): `A.M4A`, `a;.m4a`, `a'.m4a`, `*.m4a`, `....m4a`, `~.m4a`, 8 KiB filename, unicode `audü.m4a`, uppercase `AUDIO/MP4` part MIME, `audio/mp4; x=y` with params.
- **Multipart structure limits:** 3rd text field → 400 `Too many fields`; second file part → 400 `Too many files`; file under wrong field name → 400 `Unexpected field`; 65-char field name → 400 `Field name too long` (64 chars OK); 10 KB field value → 400 `Field value too long`; file part without filename → 400; non-multipart JSON body → 400 `audio file is required`; text fields after the file part → 200 (parsed fine); no auth token → 401 before any parsing.
- **Concurrency:** 24 parallel uploads (18× 25 MiB exact + 6× 25 MiB+1) → 15×200 / 6×413 / 3×409 (question-claim conflicts, expected); no temp-name collisions (uuid + `wx`); zero orphans afterwards.
- **Client abort mid-upload:** chunked 25 MiB upload socket-killed at ~5 MiB → partial file gone within 2 s.
- **Slow trickle (1 byte/s):** partial file observed growing in `server/uploads` (19 B @19 s … 139 B @139 s); connection killed by `requestTimeout` at ~154 s (130 s budget + Node check granularity); partial removed ≤5 s after death; `Connection: close` produced no response (socket destroyed) — resource holding strictly bounded.
- **Pre-placed symlink in `server/uploads`:** `createWriteStream(…, {flags:'wx'})` onto a symlink path fails `EEXIST` — the target (`/tmp/adv/target.txt`) was never written. The janitor's `stat()` follows symlinks but `unlink()` removes only the link: target preserved (verified live). Remote exploitability is nil regardless: stored names are unguessable UUIDs and the directory is mode 0700 owned by the server user.
- **Orphan cleanup:** response-finish/close cleanup deleted every stored file across all 200/4xx/5xx outcomes observed; `server/uploads` returned to empty after each batch. Deterministic janitor core additionally covered by `upload-magic-bytes.test.ts` (old/exact-cutoff/recent/directory/broken-symlink/EBUSY cases); a live end-to-end janitor observation (planted 2020-mtime file vs fresh file, 15-min interval) is appended below.
- **Idempotency around rejected uploads:** an upload rejected by the magic-byte gate *after* the request claim (ftyp bytes named `.wav` → 415 `Invalid audio file`) abandoned its claim cleanly — the same `requestId` immediately succeeded with valid audio (fresh 200, not 409), and a third send replayed the stored response byte-identically (idempotent replay works). Requests killed before/during the multer stage (trickle timeout, client abort, busboy 500s) never create a claim row at all, since `claimAssessmentRequest` runs inside the route handler after `uploadAudio`/`validate` (`practice.ts:277-291`).
- **Magic-byte/extension binding:** cross-container signatures (e.g. OggS bytes named `.mp3`) are rejected — signature must match the extension family (`upload.ts:158-166`), and the FFmpeg gate independently restricts demuxers by extension (`audio-inspection.ts:56-65`).

## Notes

- Mock-mode acceptance of junk audio (200 on `ftyp`+junk) is a deliberate test-mode property, not a defect: `MOCK_AI` is rejected in production by config validation (`config.ts:158-164`), and the probe server demonstrated the production gate catching both junk fixtures.
- All probing confined to `ai_english_adversarial`; fixtures and scripts under `/tmp/adv`; probe server on :4100 stopped and port verified free; no source/test/config files modified.

## Appendix — live janitor observation

Planted `planted-old.m4a` (mtime 2020-01-01) and `planted-fresh.m4a` (current mtime) in `server/uploads` at 10:33:38. The server's 15-minute janitor interval ran at ~10:39:53 (server boot 10:09:53 + interval). Check at 10:40:36: `planted-old.m4a` removed, `planted-fresh.m4a` preserved — deterministic age-based orphan cleanup confirmed end-to-end on the live server (`cleanupOldUploads`, `upload.ts:207-210`; interval wiring `index.ts:21,31-37`). Planted files were removed by me afterwards; `server/uploads` left empty.

Session-end state: main server PID 47637 up 31 min without crash (`/health` green); probe server on :4100 stopped, port verified free; `server/uploads` empty; all test data confined to the throwaway `ai_english_adversarial` DB and `/tmp/adv`. (One `assessment_requests` row in `processing` status belongs to a different user id `53395d28-…` — a concurrent audit agent sharing this database, not this lane's probes; the idempotency design reclaims stale claims after 5 minutes regardless.)
