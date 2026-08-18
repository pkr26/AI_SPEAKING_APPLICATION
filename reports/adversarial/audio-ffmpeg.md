# Adversarial Audit — FFmpeg Audio Inspection (`server/src/audio-inspection.ts`)

Date: 2026-08-14 · Target: `server/src/audio-inspection.ts` and its callers
(`server/src/practice.ts:311-312`, `server/src/diagnostic.ts:330-331`,
`server/src/assess.ts:147-148`) · Host ffmpeg: 8.0 (Apple clang 17, Homebrew).

## Method

The live dev server runs `MOCK_AI=true`, and both assess routes skip the
duration gate in mock mode (`if (!config.mockAi) await verifyAudioDuration(...)`),
so the gate itself was exercised by importing the real module from tsx probe
scripts in `/tmp/ffprobe_lab` (read-only w.r.t. the repo), running with cwd
`server/` so the real `config.ts`, real ffmpeg spawn flags, and real slot
accounting were used. The live server was used to confirm route wiring
end-to-end. Harness used for every "GATE:" line below:

```bash
cd server && DATABASE_URL=postgres://localhost:5432/ai_english_adversarial \
  JWT_SECRET=probe-secret-probe-secret-probe-12 MOCK_AI=true \
  npx tsx /tmp/ffprobe_lab/gate.ts <file>   # calls verifyAudioDuration(<file>)
```

Baseline sanity (gate behaves as designed on honest files):

| file | result |
|---|---|
| 10s m4a/wav/ogg | `PASS` |
| 150s m4a/mp3/ogg | `413 Recording must be two minutes or shorter` |

---

## Finding 1 (MEDIUM) — Duration gate bypass: forged MP4 edit list (`elst`) makes a 150 s container measure 10 s and pass to the paid transcriber

**Root cause.** The gate measures decoded PCM bytes
(`audio-inspection.ts:211-217,238-243`), which correctly defeats forged
*informational* duration metadata (the shipped regression test patches the
Matroska `Duration` element, `tests/audio-inspection.test.ts:149-163`). But the
inspection decode runs with **default MOV edit-list handling**: ffmpeg's `mov`
demuxer applies the `elst` atom and only emits the *presented* samples. Edit
lists are not informational metadata — they change which samples are decoded —
so sample counting measures the attacker's chosen presentation window, not the
container's audio payload. The gate's spawn flags
(`audio-inspection.ts:136-186`) never pass `-ignore_editlist 1`.

**Reproduction.**

```bash
# 150s AAC in M4A (ffmpeg writes elst: segment_duration=150000, media_time=1024)
ffmpeg -f lavfi -i "sine=frequency=440:duration=150" -c:a aac -b:a 32k long150.m4a
# patch elst entry0 segment_duration 150000 -> 10000 (movie timescale 1000 => 10s)
python3 - <<'EOF'
import struct
d = bytearray(open('long150.m4a','rb').read())
i = d.find(b'elst')
d[i+12:i+16] = struct.pack('>I', 10000)
open('elst_forge.m4a','wb').write(d)
EOF
```

Observed:

- `ffprobe elst_forge.m4a` → `duration=10.000000`
- Gate (real module): `GATE: PASS (361ms)` — **a container holding 150 s of AAC
  passes the ≤120.5 s gate measuring 10 s**.
- Decoded length, default `ffmpeg -i elst_forge.m4a`: 882,688 B ≈ **10.0 s**
  (44.1 kHz mono s16le). Decoded with `-ignore_editlist 1`: 13,232,128 B ≈
  **150.0 s** — the full payload is intact and trivially recoverable.

**End-to-end reachability (code trace, plus live wiring check).** The forged
file passes the route's magic-byte check untouched (`ftyp` at bytes 4–8;
`upload.ts:150,161`). In production mode `practice.ts:312` /
`diagnostic.ts:331` call `verifyAudioDuration(req.file.path)` — which passes —
and the **same original container** is then streamed to Whisper:
`assessSpeaking(req.file.path)` → `fs.createReadStream(audioPath)` →
`model: 'whisper-1'` (`assess.ts:147-148`). The upload byte cap does not help:
the 150 s fixture is 637 KB. Live wiring was confirmed against the dev server
(150 s file accepted with HTTP 200 through `POST /diagnostic/answer`; the gate
is skipped there only because `MOCK_AI=true`, see note 3).

**Expected vs observed.** Expected: "only duration-verified audio reaches the
paid transcriber" (AGENTS.md invariant) — the gate verifies the container's
audio content. Observed: the gate verifies a 10 s presentation window; a
container carrying 15× that audio is delivered to the transcriber.

**Impact (stated honestly).**

- Deterministic: the product invariant "Recording must be two minutes or
  shorter" is broken for MOV-family uploads — any downstream consumer that
  ignores edit lists (e.g. `-ignore_editlist 1`, various third-party decoders)
  extracts content the gate never saw.
- Money impact is real but conditional on the transcriber's demuxing: an
  ffmpeg-default Whisper ingestion also honors `elst` (10 s billed), while an
  ingestion that ignores edit lists bills 150 s. The server cannot audit or
  pin OpenAI's decoder flags, so the gate must not rely on matching them.
- The existing "forged container-duration metadata is covered by regression
  tests" claim (AUDIT_REPORT.md) covers only informational metadata; edit-list
  presentation forgery is a different, uncovered class.

**Fix.** Add `-ignore_editlist 1` to the inspection spawn for the `mov` branch
(verified above to expose the full 150 s), and add an `elst`-forged regression
fixture alongside the Matroska one.

**Variant (same class, weaker).** A WAV whose `data` chunk *declares* 10 s but
physically carries 160 s of PCM (`wav_liedata.wav`) also passes
(`GATE: PASS`); however trailing bytes past the declared chunk are ignored by
any conformant reader including default ffmpeg, so the container's valid audio
genuinely is 10 s. Noted for completeness; a second `data` chunk
(`wav_twodata.wav`) was decoded in full and correctly rejected with 413.

---

## Finding 2 (LOW, latent) — `openSync` on a non-regular file blocks the whole Node event loop before the `isFile()` check

`audio-inspection.ts:119` opens the path with
`fs.openSync(filePath, O_RDONLY | O_NOFOLLOW)` and only afterwards checks
`fs.fstatSync(fd).isFile()` (`:120`). For a FIFO (or any blocking device node),
`openSync` **synchronously blocks the entire event loop** until a writer
appears — the `O_NOFOLLOW`/`isFile` guards never get to run, and the 10 s
`INSPECTION_TIMEOUT_MS` cannot fire because it is armed only after the open
returns.

**Reproduction.**

```bash
mkfifo fifo.m4a
npx tsx gate.ts fifo.m4a        # process froze ~5 minutes
printf x > fifo.m4a             # from another shell: instantly unblocks
# then: GATE: REJECT status=415 ... (309552ms)
```

**Reachability.** Not attacker-reachable through today's callers: both ingress
paths inspect server-created regular files (multer's `randomUUID()` name in a
0700 private dir, `upload.ts:29-46`; the S3 temp download). Reported as a
latent hazard: if any future caller ever passes an attacker-influenced path,
one request per FIFO wedges the process (persistent DoS, worse than a slot
leak). **Fix:** open with `O_NONBLOCK` (then `fstat`/clear the flag) or
`lstat` before open.

---

## Note 3 (informational) — `MOCK_AI=true` skips the duration gate entirely

Both routes gate with `if (!config.mockAi)` (`practice.ts:312`,
`diagnostic.ts:331`); verified live: 150 s upload → HTTP 200 mocked assessment.
Production config forbids `MOCK_AI=true` (`config.ts:158-164`), so this is a
dev/test-only gap — but any non-production environment pointed at a real
billing key must not run mock mode, and reviewers should not treat
mock-mode acceptance as gate coverage.

---

## Attacks the code RESISTED (verified)

- **Multi-track container**: two-track M4A (10 s + 150 s AAC tracks) → `415`
  via `-map 0:a?` + single-stream PCM muxer failure. Audit claim holds.
- **Chained Ogg** (`cat short10.ogg long150.ogg`): both chains decoded, 160 s
  measured → `413`. No hidden-stream bypass.
- **Fragmented MP4** (150 s, `frag_keyframe+empty_moov`) → `413`.
- **Audio+video MP4** (10 s audio / 150 s video) → `PASS`, correctly measuring
  the 10 s audio only; video is `-vn`-dropped and does not reach transcription
  as audio.
- **Video-only MP4** → `415`; **empty file** → `415`; **0.3 s** → `422`.
- **SSRF / local file read**: forged MOV external data reference (`dref url`
  with `flags=0`) pointing at `http://127.0.0.1:8899/...` and
  `file:///etc/passwd` — under the exact gate flags **no connection/listener
  hit and no file read occurred**; with drefs force-enabled
  (`-enable_drefs 1 -use_absolute_path 1`) the fetch was still blocked:
  `Protocol 'file' not on whitelist 'fd'!`. Double defense works.
- **Playlist/manifest smuggling**: m3u8 content as `.m4a`/`.webm`, ffconcat
  content as `.mp3` → all `415` (fixed demuxer per extension via
  `-format_whitelist`; no `hls`/`concat` demuxer reachable; `amovie` unreachable
  because the filtergraph is fixed).
- **Symlinks**: symlink to valid audio and symlink to `/etc/passwd` → `415`
  in ~1 ms (`O_NOFOLLOW`).
- **Secret-free child env**: ran the gate with `FFMPEG_PATH` pointed at an
  env-dumping wrapper while `OPENAI_API_KEY=sk-FAKESECRET...` was set in the
  parent — the ffmpeg child received only `LANG`, `LC_ALL`, `PATH`
  (`buildAudioInspectorEnvironment`, `:41-51`). No secret leakage.
- **No shell / no arg injection**: `spawn(..., { shell: false })` with a fixed
  argv; the input reaches ffmpeg only as `fd:` on descriptor 3
  (`stdio: [..., inputFd]`), never as a filename — confirmed by dumping the
  exact argv the child received. Upload filenames are server-generated UUIDs
  regardless.
- **Concurrency cap**: 10 parallel inspections with
  `AUDIO_INSPECTION_MAX_CONCURRENCY=4` → 4 ran, 6 failed fast with
  `503 Audio inspection capacity busy` in 0–1 ms. No queueing.
- **Slot leak / permanent DoS**: 30 consecutive failure-mode inspections (10
  invalid→415, 10 overlong→SIGKILL at byte cap→413, 10 bomb→SIGKILL→413)
  followed by a valid file → `PASS` in 127 ms. Every outcome path releases the
  slot (`finally` at `:327-329`).
- **Decompression bomb**: 681 KB FLAC of silence decoding to 3600 s (~58 MB PCM
  at 8 kHz) → killed at the 120.5 s decoded-byte cap, `413` in ~1.1 s; peak
  ffmpeg RSS ~18.5 MB under the gate flags (`-max_alloc 32 MiB`, 1 thread).
- **Extreme formats**: 192 kHz / 8-channel WAV resampled and passed (2.3 s);
  `.oga` alias works.

## Not exercised

- Forcing the 10 s wall-clock `INSPECTION_TIMEOUT_MS` with a real file —
  generated valid/corrupt fixtures all decode in <2.5 s on this host; a genuine
  decoder hang needs a hostile codec edge case I could not synthesize. The
  timeout branch shares the same `finish()`→SIGKILL→slot-release path that the
  20 SIGKILL'd overlong decodes above exercised.
- OpenAI's server-side demuxing of edit lists (unknowable from here) — this is
  why Finding 1's billing impact is framed as conditional.
