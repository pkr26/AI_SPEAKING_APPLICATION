# Adversarial Audit — Injection & Input Validation

Target: `server/` Express+TypeScript API, live at `http://localhost:4000` (MOCK_AI=true, rate limits relaxed, DB `ai_english_adversarial`).
Method: full source read of `middleware.ts`, `app.ts`, `auth.ts`, `practice.ts`, `diagnostic.ts`, `audio-upload.ts`, `upload.ts`, `idempotency.ts`, `rate-limit.ts`, `config.ts`, `logger.ts`, plus ~150 live probes (curl / raw sockets / psql / node driver replications). AUDIT_REPORT.md was read first; nothing below re-reports a remediated item.

Verdict up front: the input-validation posture is strong. Every SQL query is parameterized, every route validates with zod, all error bodies are free of internals, and the great majority of hostile input fails closed with 400/413/415. Three genuine defects were found — all **low** severity: two malformed-input → 500 paths and one prototype-chain validation bypass.

---

## Finding 1 (low) — NUL byte in register `name` passes zod, kills the INSERT, returns 500 instead of 400

**File:line:** `server/src/auth.ts:60-76` (registerSchema — `name` has no control-character restriction), INSERT at `server/src/auth.ts:122-125`, fall-through at `server/src/middleware.ts:147-148`.

**Reproduction (live, unauthenticated):**

```bash
python3 -c 'import json;open("/tmp/nulname.json","w").write(json.dumps({"name":"Ab\u0000cd","email":"nul1@t.dev","password":"passw0rd1","nativeLanguage":"te"}))'
curl -X POST http://localhost:4000/auth/register -H 'content-type: application/json' --data-binary @/tmp/nulname.json
```

**Observed:** `HTTP/1.1 500 Internal Server Error` — `{"error":"Internal server error"}` (body itself is clean; full headers captured, no stack/pg detail).

**Expected:** 400 validation error, per the project's own convention (zod-first validation; "malformed … must 400, not 500").

**Mechanism (proven end-to-end):**
1. JSON `\u0000` is valid JSON → zod `z.string().trim().min(1).max(100)` accepts U+0000 (verified: validation passed and the INSERT was reached).
2. node-postgres sends the parameter containing byte `0x00`; PostgreSQL rejects it. Replicated with the server's own `pg` 8.23.0 driver against a scratch DB:
   `INSERT INTO nul_probe VALUES ($1)` with codepoints `[65,98,0,99,100]` → **error code 22021 `invalid byte sequence for encoding "UTF8": 0x00`**.
3. 22021 is not 23505, so the route rethrows; it is not an `HttpError`/`MulterError`/body-parser error, so `errorHandler` logs it at error level and returns the generic 500.

**Blast radius check:** the transaction rolls back atomically — verified the user does not exist afterwards (`POST /auth/login {"email":"nul1@t.dev",...}` → 401) and the DB stayed consistent. No data corruption, no info leak, no crash (server responsive throughout). Unauthenticated but bounded in production by the register limiter (`RATE_LIMIT_REGISTER_MAX`, default 10/hour/IP), so the reachable damage is error-log noise and a wrong status code that will confuse client retry logic. Only the `name` field is affected: it is the single free-text field that reaches the DB (email is constrained by `.email()`; passwords are bcrypt-hashed to ASCII before storage).

**Suggested fix:** reject C0 control characters in `name` at the schema (e.g. `.regex(/^[^\x00-\x1F\x7F]*$/)`) or map pg 22021 → 400 in the register catch.

---

## Finding 2 (low) — Malformed multipart bodies return 500 on both assessment upload routes

**File:line:** `server/src/upload.ts:87-127` (`uploadAudio` forwards whatever multer delivers), `server/src/middleware.ts:126-131` (only `multer.MulterError` is mapped; busboy's plain `Error`s fall through to the 500 at `middleware.ts:147-148`).

**Reproduction (live, authenticated):**

```bash
# missing boundary
curl -X POST http://localhost:4000/practice/attempt -H "Authorization: Bearer $T" -H 'content-type: multipart/form-data' -d garbage        # -> 500
# boundary present, body never terminated
curl -X POST http://localhost:4000/practice/attempt -H "Authorization: Bearer $T" -H 'content-type: multipart/form-data; boundary=zzz' -d garbage  # -> 500
# truncated part
curl -X POST http://localhost:4000/practice/attempt -H "Authorization: Bearer $T" -H 'content-type: multipart/form-data; boundary=abc' \
  --data-binary $'--abc\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n9f1badb5'                                              # -> 500
```

Same three results on `POST /diagnostic/answer`. All return `{"error":"Internal server error"}`.

**Expected:** 400 (a correctly-formed but empty multipart already returns 400 from zod: `--abc--\r\n` → `{"error":"questionId: Required"}` — so the 500s are purely a malformed-framing gap).

**Mechanism (replicated with the server's multer 2.2 / busboy):**

```
missing boundary -> Error "Multipart: Boundary not found"   (instanceof MulterError: false)
unterminated     -> Error "Unexpected end of form"          (instanceof MulterError: false)
truncated part   -> Error "Unexpected end of form"          (instanceof MulterError: false)
```

Plain `Error` instances match none of the `errorHandler` special cases → logged as `unhandled error` at error level → generic 500.

**Blast radius:** authenticated routes only, behind the assess limiters (which run before multer), body leaks nothing, process stays up. Wrong-status robustness defect + attacker-controllable error-log noise. Low.

**Suggested fix:** in `uploadAudio`'s callback (or `errorHandler`), treat non-MulterError multipart framing failures (`Boundary not found`, `Unexpected end of form`) as `HttpError(400, 'Malformed multipart body')`.

---

## Finding 3 (low) — `contentType` allowlist bypass via prototype-chain lookup (`__proto__`, `constructor`)

**File:line:** `server/src/audio-upload.ts:37-49` (`CONTENT_TYPE_TO_EXT` is a plain `{}`; `contentTypeToExt` returns inherited members), guard skipped at `server/src/audio-upload.ts:147-150`, key built at `server/src/audio-upload.ts:154`.

**Reproduction (live, dev mode):**

```bash
curl -X POST http://localhost:4000/uploads/audio-url -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"contentType":"__proto__"}'    # -> 200 {"mode":"direct"}
curl -X POST http://localhost:4000/uploads/audio-url -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"contentType":"constructor"}'   # -> 200 {"mode":"direct"}
curl -X POST http://localhost:4000/uploads/audio-url -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"contentType":"application/x-msdownload"}'  # -> 415 (any real garbage)
```

Only `__proto__` and `constructor` bypass: the route lowercases the input first (`audio-upload.ts:146`), and only these two inherited members are all-lowercase (`toString`→`tostring`, `hasOwnProperty`→`hasownproperty` etc. all correctly 415 — verified for 12 keys).

**Impact (production S3 mode, by code trace — S3 was not live here):** `ext` = `Object.prototype` (truthy object) → the 415 is skipped → presigned-POST key becomes `audio-uploads/{userId}/{uuid}.[object Object]` (or `...uuid.function Object() { [native code] }` for `constructor`) with `Content-Type` condition `__proto__` — i.e. a **valid signed grant for a garbage-extension key, up to 25 MiB per grant**. The object can never enter the assessment pipeline: `isOwnedAudioKey` (`audio-upload.ts:56-62`) rejects the extension, so submission 400s — and because the key fails the ownership shape, the API's own deletion hooks also skip it (`discardPresignedAudio` returns early), so junk persists until the mandatory bucket lifecycle expiry. Bounded by the upload-grant limiter (default 40/hour/user) → worst case ≈ 1 GB/day/account of dead objects until lifecycle collection. No pipeline ingress, no cross-user access, no key traversal (stringified values contain no `/`).

**Suggested fix:** build the map with `Object.create(null)`, or check `Object.prototype.hasOwnProperty.call(CONTENT_TYPE_TO_EXT, key)`, or use a `Map`.

---

## Informational observations (not vulnerabilities)

- **I1 — Rate-limit policy disclosure.** `standardHeaders: true` emits `RateLimit-Policy: 100000;w=900`-style headers on every response (observed on 404s, /ready, 500s), revealing configured budgets. Library-intended; in production it advertises the real limits (300/15min global etc.).
- **I2 — Preflight quirk.** `OPTIONS` from a *disallowed* origin with `Access-Control-Request-Method` returns **200 `Allow: POST`** (Express router auto-OPTIONS) instead of the cors middleware's 204, because the app's origin callback returns `false` → `cors` calls `next()`. No `Access-Control-Allow-Origin` is emitted either way, so the browser still blocks — cosmetic only (`app.ts:39-47`, cors 2.8.5 `middlewareWrapper`).
- **I3 — Lenient Bearer parsing.** `Authorization: Bearer <valid-token> trailing-junk` authenticates (`middleware.ts:51` takes `split(' ')[1]` and ignores the rest). No privilege gain; stricter parsers would 400.
- **I4 — Lossy charset decoding.** Invalid UTF-8 bytes inside JSON strings are replaced with U+FFFD by iconv and accepted (name `A\xff\xfeB` registered as `A��B`, 201). `charset=utf-7` and `charset=utf-16` bodies are decoded and then validated normally. No validation differential results.
- **I5 — Validation ordering on practice routes.** For users without a completed diagnostic, malformed UUIDs on `/practice/question/:id/help` get 403 (eligibility middleware runs before param validation) instead of 400. Nothing is leaked beyond what eligibility already reveals.

---

## Attacks the code RESISTED (all live-verified unless noted)

- **SQL injection:** classic `' OR 1=1--`, stacked `;DROP TABLE users`, and union-style payloads in every path param (`/assessments/:requestId`, `/practice/question/:id/help`), query param (`cursor`, `limit`), and body field (`email`, `questionId`, `requestId`, `nativeLanguage`) → all 400/404; every query in `src/` is parameterized `$n` (grep-verified, no template interpolation). Second-order: name `<script>alert(1)</script>';DROP TABLE users;--` stored verbatim, read back through `/auth/me` and `/auth/me/data` byte-exact and JSON-escaped; DB intact afterwards (users/questions/attempts counts consistent).
- **Malformed UUIDs:** plain junk, SQLi strings, trailing junk, `%00`, `%2F`, semicolons, 64 KB value → 400 on every parameterized route (64 KB → Node 431 before Express). Never a 500.
- **JSON type confusion:** arrays/objects/numbers/null/booleans for every string field on register/login/change-password/delete-account/attempt/audio-url → clean 400s naming the field; top-level array/string/null bodies → 400; unknown keys stripped (probed `admin:true`, `tv:999`, `sub` override — all dropped); duplicate keys → consistent last-wins (verified: only the second email registered).
- **Prototype pollution:** `__proto__`, `constructor.prototype` in register bodies; `__proto__[x]` / `constructor[prototype][y]` in query string → accepted-ignored; a fresh object afterwards shows no `isAdmin` (verified via a follow-up registration and response shape).
- **Bombs:** 490 000-deep JSON array (980 KB, just under the 1 MB cap) → 400, no crash; 50 000-deep object → 400; 10 MB unicode name → 413; 50 MB gzip bomb (48 KB on the wire) → 413 (decompression cap enforced post-inflation).
- **Content-type/encoding confusion:** valid JSON as `text/plain`, no content-type, `application/x-www-form-urlencoded`, `application/jsonx`, `application/vnd.api+json`, empty CT, two CT headers, multipart CT with JSON body → all fail closed (400 validation against empty body). Bogus charset / `iso-8859-1` / bogus `content-encoding` → 415. `Application/JSON` case-insensitive, `identity`/`gzip`/`deflate`/`utf-7`/`utf-16` handled then validated.
- **Method confusion:** PUT/PATCH/DELETE/TRACE on `/auth/login`, `/auth/logout`, `/auth/account`, `/diagnostic/next`, `/health` → 404 `{"error":"Not found"}`; TRACK → Node 400; HEAD → headers only; GET on POST-only routes → 404; OPTIONS `*` → 204.
- **JWT confusion:** alg=none, garbage signature, tampered payload (modified `tv`), wrong scheme, lowercase `bearer`, `Bearer` with no token, token in query string, duplicate Authorization headers → all 401. Algorithm/issuer/audience pinned in `jwt.verify`.
- **Header injection:** raw CRLF in `x-request-id` → parsed as separate headers (no response splitting possible); NUL/ESC/DEL in header values → Node 400; obs-text bytes echoed within spec; `x-request-id` capped at 128 chars then regenerated as a server UUID; attacker-controlled `name`/email never appears in any response header.
- **CORS:** `Origin: https://evil.example` and `Origin: null` → no `Access-Control-Allow-*` on actual responses or preflight; no-Origin requests unaffected; `credentials:false`.
- **Error leakage:** forced 400/401/403/404/413/415/431/500s — every body is either a fixed string or a first-zod-issue message; no stack traces, no pg codes, no internal paths, no schema dumps; Node's own 431/400 pages carry no server banner; `X-Powered-By` absent (helmet).
- **Multipart limits:** >2 fields → 400 `Too many fields`; 2 files → 400 `Too many files`; >128 B field value → 400; >64 B field name → 400; wrong file field → 400; real binary (`/bin/ls`) with `.m4a` name → 415 (magic bytes); `.m4a` ext + `audio/mpeg` mismatch → 415; traversal filename `../../etc/passwd.m4a` → ignored (stored as server-generated UUID name, attempt processed normally).
- **Idempotency/authz invariants:** probe2 reading probe1's `/assessments/:requestId` → 404; reusing a diagnostic `requestId` against `/practice/attempt` → 409 context protection; valid-but-foreign export cursor → 400.
- **Transport:** CL+TE and TE+CL conflicts → Node 400; absolute-form request URI → served normally (no host-trust logic anywhere); 14 KB URL → 404, 14 KB query value → 400.
- **Endpoints:** `/health` `{"ok":true}`, `/ready` `{"ok":true}` (and a generic 503 string on failure, by code), 404 handler `{"error":"Not found"}` — no version, path, or dependency disclosure.

---

## Notes on environment

- Probes ran only against `localhost:4000` and the `ai_english_adversarial` DB (plus a self-created `ai_english_nul_probe` DB used for the pg 22021 proof and dropped afterwards). Scratch files under `/tmp/adv`. No source/test/config files were modified. The server never crashed and was left running.
- Registered test accounts (`*@t.dev`, `probe*@test.dev`) remain in the throwaway DB.
