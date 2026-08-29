#!/usr/bin/env node

// Reconciles a load-1000.mjs ledger against the database row-for-row.
//
// Usage:
//   LOAD_DATABASE_URL=postgres://localhost:5432/ai_english_load1000 \
//   LOAD_RATE_LIMIT_GLOBAL_STORE=memory \
//     node scripts/verify-1000.mjs [path/to/ledger.json]
//
// Defaults to the newest ledger in reports/load1000/. Global count checks
// assume the database held no business rows before the run (wipe or fresh
// setup); per-user checks are always scoped to ledger user ids. Read-only:
// this script never writes to the database.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DATABASE_URL = process.env.LOAD_DATABASE_URL || 'postgres://localhost:5432/ai_english_load1000';
const GLOBAL_RATE_LIMIT_STORE = process.env.LOAD_RATE_LIMIT_GLOBAL_STORE || 'memory';
const REPORTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'load1000');

if (GLOBAL_RATE_LIMIT_STORE !== 'memory' && GLOBAL_RATE_LIMIT_STORE !== 'postgres') {
  throw new Error("LOAD_RATE_LIMIT_GLOBAL_STORE must be 'memory' or 'postgres'");
}

const ledgerArg = process.argv[2];
let ledgerPath = ledgerArg;
if (!ledgerPath) {
  const candidates = fs
    .readdirSync(REPORTS_DIR)
    .filter((name) => name.startsWith('ledger-') && name.endsWith('.json'))
    .sort();
  if (candidates.length === 0) throw new Error(`no ledger found in ${REPORTS_DIR}`);
  ledgerPath = path.join(REPORTS_DIR, candidates[candidates.length - 1]);
}
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
console.log(`ledger: ${ledgerPath}`);
console.log(`run id: ${ledger.runId}, users: ${ledger.users.length}`);

let failures = 0;
let checks = 0;
function check(name, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`ok: ${name}`);
  } else {
    failures++;
    console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Expected values derived purely from the ledger (what the API reported).
// ---------------------------------------------------------------------------
const registered = ledger.users.filter((u) => u.registered && u.id);
const deleted = registered.filter((u) => u.deleted);
const alive = registered.filter((u) => !u.deleted);
const deletedIds = new Set(deleted.map((u) => u.id));
const aliveIds = alive.map((u) => u.id);

const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0);
const expectedProgressForUser = (user) => {
  const byQuestion = new Map();
  for (const attempt of user.englishAttempts) {
    const prior = byQuestion.get(attempt.questionId) || { bestScore: 0, attemptCount: 0, mastered: false };
    prior.bestScore = Math.max(prior.bestScore, attempt.score);
    prior.attemptCount += 1;
    prior.mastered ||= attempt.score >= 75;
    byQuestion.set(attempt.questionId, prior);
  }
  if (user.nativeAttempt) {
    const prior = byQuestion.get(user.nativeAttempt.questionId) || { bestScore: 0, attemptCount: 0, mastered: false };
    prior.attemptCount += 1;
    byQuestion.set(user.nativeAttempt.questionId, prior);
  }
  return byQuestion;
};
const aliveProgress = alive.flatMap((user) => [...expectedProgressForUser(user).values()]);
const expectedCycles = new Map();
for (const user of alive) {
  for (const attempt of user.englishAttempts) {
    if (!attempt.cycleId) throw new Error(`ledger user ${user.index + 1} English attempt omitted cycleId`);
    const prior = expectedCycles.get(attempt.cycleId) || {
      id: attempt.cycleId,
      userId: user.id,
      questionId: attempt.questionId,
      attemptsUsed: 0,
      status: 'closed',
    };
    prior.attemptsUsed += 1;
    expectedCycles.set(attempt.cycleId, prior);
  }
  if (!user.practiceCycleId || !user.practiceQuestionId) {
    throw new Error(`ledger user ${user.index + 1} omitted the active practice cycle`);
  }
  expectedCycles.set(user.practiceCycleId, {
    id: user.practiceCycleId,
    userId: user.id,
    questionId: user.practiceQuestionId,
    attemptsUsed: user.nativeAttempt?.cycleId === user.practiceCycleId ? user.nativeAttempt.attemptNo : 0,
    status: 'active',
  });
}
const expected = {
  aliveUsers: alive.length,
  deletedUsers: deleted.length,
  // Deleted accounts cascade their attempts/requests/diagnostic_state away, so
  // table-visible expectations count only alive users. assessment_usage is the
  // exception: those rows are retained with user_id SET NULL, so it counts all.
  diagAnswers: sum(alive, (u) => u.diagnosticAnswers.length),
  diagAnswersIncludingDeleted: sum(registered, (u) => u.diagnosticAnswers.length),
  englishAttempts: sum(registered, (u) => u.englishAttempts.length),
  nativeAttempts: registered.filter((u) => u.nativeAttempt).length,
  progressRows: aliveProgress.length,
  masteredRows: aliveProgress.filter((row) => row.mastered).length,
  learningRows: aliveProgress.filter((row) => !row.mastered).length,
  changedPassword: alive.filter((u) => u.changedPassword).length,
  practiceCycles: expectedCycles.size,
};
expected.assessments = expected.diagAnswers + expected.englishAttempts + expected.nativeAttempts;
expected.assessmentsIncludingDeleted =
  expected.diagAnswersIncludingDeleted + expected.englishAttempts + expected.nativeAttempts;
// Native replays hit the assess limiters but create no rows; only the full
// cohort replays. Failures would retain usage rows without attempts.
expected.nativeReplays = ledger.users.filter(
  (u) => u.cohort === 'full' && u.nativeAttempt && u.failures.length === 0,
).length;

console.log('\nexpected from ledger: ' + JSON.stringify(expected));

const client = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 10_000 });
await client.connect();

async function scalar(sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0];
}

try {
  const dbName = await scalar('SELECT current_database() AS name');
  if (!/load/i.test(dbName.name)) {
    throw new Error(`refusing to reconcile against non-load database "${dbName.name}"`);
  }
  console.log(`database: ${dbName.name}\n`);

  // --- A. users -------------------------------------------------------------
  const usersCount = await scalar('SELECT count(*)::int AS n FROM users');
  check(
    'users: row count equals alive registered users',
    usersCount.n === expected.aliveUsers,
    `db=${usersCount.n} expected=${expected.aliveUsers}`,
  );

  const deletedLeftovers = await scalar('SELECT count(*)::int AS n FROM users WHERE id = ANY($1::uuid[])', [
    [...deletedIds],
  ]);
  check('users: deleted accounts are gone', deletedLeftovers.n === 0, `db=${deletedLeftovers.n}`);

  const diagnosed = await scalar('SELECT count(*)::int AS n FROM users WHERE diagnostic_completed');
  check('users: every alive user completed the diagnostic', diagnosed.n === expected.aliveUsers, `db=${diagnosed.n}`);

  const orphanUsers = await scalar(
    'SELECT count(*)::int AS n FROM users WHERE email LIKE $1 AND id <> ALL($2::uuid[])',
    [`load1000_${ledger.runId}_%`, registered.map((u) => u.id)],
  );
  check('users: no rows outside the ledger for this run', orphanUsers.n === 0, `db=${orphanUsers.n}`);

  // --- B. attempts ----------------------------------------------------------
  const attemptsTotal = await scalar('SELECT count(*)::int AS n FROM attempts');
  check(
    'attempts: total equals diagnostic + English + native answers',
    attemptsTotal.n === expected.assessments,
    `db=${attemptsTotal.n} expected=${expected.assessments}`,
  );

  const byContext = await client.query(
    'SELECT context, count(*)::int AS n FROM attempts GROUP BY context ORDER BY context',
  );
  const contextMap = Object.fromEntries(byContext.rows.map((r) => [r.context, r.n]));
  check(
    'attempts: diagnostic context count',
    contextMap.diagnostic === expected.diagAnswers,
    `db=${contextMap.diagnostic} expected=${expected.diagAnswers}`,
  );
  check(
    'attempts: practice context count',
    contextMap.practice === expected.englishAttempts,
    `db=${contextMap.practice} expected=${expected.englishAttempts}`,
  );
  check(
    'attempts: native context count',
    contextMap['practice-native'] === expected.nativeAttempts,
    `db=${contextMap['practice-native']} expected=${expected.nativeAttempts}`,
  );

  const orphanAttempts = await scalar('SELECT count(*)::int AS n FROM attempts WHERE user_id <> ALL($1::uuid[])', [
    aliveIds.length > 0 ? aliveIds : ['00000000-0000-0000-0000-000000000000'],
  ]);
  check(
    'attempts: no rows for deleted or unknown users (cascade worked)',
    orphanAttempts.n === 0,
    `db=${orphanAttempts.n}`,
  );

  const passConsistency = await scalar(
    "SELECT count(*)::int AS n FROM attempts WHERE context <> 'practice-native' AND passed <> (score >= 60)",
  );
  check('attempts: passed flag consistent with score >= 60', passConsistency.n === 0, `db=${passConsistency.n}`);

  const attemptNoRange = await scalar(
    `SELECT count(*)::int AS n FROM attempts
     WHERE (context = 'practice' AND (attempt_no < 1 OR attempt_no > 3))
        OR (context = 'practice-native' AND (attempt_no < 1 OR attempt_no > 3))
        OR (context = 'diagnostic' AND (attempt_no < 1 OR attempt_no > 5))`,
  );
  check(
    'attempts: attempt_no within 1..3 (practice) and 1..5 (diagnostic)',
    attemptNoRange.n === 0,
    `db=${attemptNoRange.n}`,
  );

  // --- C. assessment_requests (idempotency) ---------------------------------
  const requestsTotal = await scalar('SELECT count(*)::int AS n FROM assessment_requests');
  check(
    'assessment_requests: one row per fresh assessment (replays add none)',
    requestsTotal.n === expected.assessments,
    `db=${requestsTotal.n} expected=${expected.assessments}`,
  );

  const reqByContext = await client.query(
    'SELECT context, count(*)::int AS n FROM assessment_requests GROUP BY context ORDER BY context',
  );
  const reqContextMap = Object.fromEntries(reqByContext.rows.map((r) => [r.context, r.n]));
  check(
    'assessment_requests: context split matches ledger',
    reqContextMap.diagnostic === expected.diagAnswers &&
      reqContextMap.practice === expected.englishAttempts &&
      reqContextMap['practice-native'] === expected.nativeAttempts,
    JSON.stringify(reqContextMap),
  );

  const processing = await scalar("SELECT count(*)::int AS n FROM assessment_requests WHERE status = 'processing'");
  check('assessment_requests: nothing stuck in processing', processing.n === 0, `db=${processing.n}`);
  const requestLanguageDrift = await scalar(
    `SELECT count(*)::int AS n
     FROM assessment_requests
     WHERE (
       context = 'practice-native'
       AND (
         native_language NOT IN ('te', 'hi', 'es', 'zh')
         OR response_body->>'nativeLanguage' IS DISTINCT FROM native_language
       )
     )
     OR (context IN ('diagnostic', 'practice') AND native_language IS NOT NULL)`,
  );
  check(
    'assessment_requests: native responses retain their exact durable claim-language snapshot',
    requestLanguageDrift.n === 0,
    `db=${requestLanguageDrift.n}`,
  );

  // --- D. practice_cycles ----------------------------------------------------
  const cycleRows = await client.query(
    `SELECT id::text, user_id::text AS "userId", question_id::text AS "questionId",
            attempts_used AS "attemptsUsed", status
     FROM practice_cycles
     ORDER BY id`,
  );
  const actualCycles = new Map(cycleRows.rows.map((row) => [row.id, row]));
  check(
    'practice_cycles: row count and every durable assignment match the ledger',
    actualCycles.size === expectedCycles.size &&
      [...expectedCycles.values()].every((wanted) => {
        const actual = actualCycles.get(wanted.id);
        return (
          actual?.userId === wanted.userId &&
          actual.questionId === wanted.questionId &&
          actual.attemptsUsed === wanted.attemptsUsed &&
          actual.status === wanted.status
        );
      }),
    `db=${actualCycles.size} expected=${expectedCycles.size}`,
  );
  const activeCycleCounts = await client.query(
    `SELECT user_id::text AS "userId", count(*)::int AS n
     FROM practice_cycles WHERE status = 'active' GROUP BY user_id`,
  );
  check(
    'practice_cycles: every surviving learner has exactly one active assignment',
    activeCycleCounts.rowCount === alive.length && activeCycleCounts.rows.every((row) => row.n === 1),
    JSON.stringify(activeCycleCounts.rows.slice(0, 10)),
  );
  const cycleAttemptDrift = await scalar(
    `SELECT count(*)::int AS n
     FROM (
       SELECT pc.id
       FROM practice_cycles pc
       LEFT JOIN attempts a ON a.practice_cycle_id = pc.id
       GROUP BY pc.id, pc.attempts_used
       HAVING pc.attempts_used <> count(a)
     ) drift`,
  );
  check(
    'practice_cycles: attempts_used equals persisted English/native attempts',
    cycleAttemptDrift.n === 0,
    `db=${cycleAttemptDrift.n}`,
  );

  // --- E. practice_progress ---------------------------------------------------
  const progressTotal = await scalar('SELECT count(*)::int AS n FROM practice_progress');
  check(
    'practice_progress: one row per user that made a spoken practice attempt',
    progressTotal.n === expected.progressRows,
    `db=${progressTotal.n} expected=${expected.progressRows}`,
  );

  const progressByStatus = await client.query(
    'SELECT status, count(*)::int AS n, sum(attempt_count)::int AS attempts FROM practice_progress GROUP BY status ORDER BY status',
  );
  const progressMap = Object.fromEntries(progressByStatus.rows.map((r) => [r.status, r]));
  check(
    'practice_progress: mastered/learning split matches ledger scores (>=75 masters)',
    (progressMap.mastered?.n ?? 0) === expected.masteredRows &&
      (progressMap.learning?.n ?? 0) === expected.learningRows,
    `db=${JSON.stringify(progressByStatus.rows)} expected mastered=${expected.masteredRows} learning=${expected.learningRows}`,
  );
  const progressAttempts = progressByStatus.rows.reduce((total, r) => total + r.attempts, 0);
  check(
    'practice_progress: attempt_count sums to all English and native attempts',
    progressAttempts === expected.englishAttempts + expected.nativeAttempts,
    `db=${progressAttempts} expected=${expected.englishAttempts + expected.nativeAttempts}`,
  );

  const orphanProgress = await scalar(
    'SELECT count(*)::int AS n FROM practice_progress WHERE user_id <> ALL($1::uuid[])',
    [aliveIds.length > 0 ? aliveIds : ['00000000-0000-0000-0000-000000000000']],
  );
  check('practice_progress: no rows for deleted or unknown users', orphanProgress.n === 0, `db=${orphanProgress.n}`);

  // --- E/F/G. inflight, usage, diagnostic_state -------------------------------
  const inflight = await scalar('SELECT count(*)::int AS n FROM practice_inflight');
  check('practice_inflight: all claims released', inflight.n === 0, `db=${inflight.n}`);

  const usage = await scalar('SELECT count(*)::int AS n FROM assessment_usage');
  check(
    'assessment_usage: one reservation per paid assessment call (incl. deleted users, retained as NULL)',
    usage.n === expected.assessmentsIncludingDeleted,
    `db=${usage.n} expected=${expected.assessmentsIncludingDeleted}`,
  );

  const usageAnonymized = await scalar('SELECT count(*)::int AS n FROM assessment_usage WHERE user_id IS NULL');
  const deletedAssessments = sum(
    deleted,
    (u) => u.diagnosticAnswers.length + u.englishAttempts.length + (u.nativeAttempt ? 1 : 0),
  );
  check(
    'assessment_usage: deleted users anonymized to NULL (SET NULL), not removed',
    usageAnonymized.n === deletedAssessments,
    `db=${usageAnonymized.n} expected=${deletedAssessments}`,
  );

  const diagState = await scalar('SELECT count(*)::int AS n, sum(questions_asked)::int AS asked FROM diagnostic_state');
  check(
    'diagnostic_state: one row per alive user',
    diagState.n === expected.aliveUsers,
    `db=${diagState.n} expected=${expected.aliveUsers}`,
  );
  check(
    'diagnostic_state: questions_asked sums to all diagnostic answers',
    diagState.asked === expected.diagAnswers,
    `db=${diagState.asked} expected=${expected.diagAnswers}`,
  );

  // --- H. questions -----------------------------------------------------------
  const questions = await scalar('SELECT count(*)::int AS n, count(DISTINCT cefr_level)::int AS levels FROM questions');
  check(
    'questions: catalog untouched by the load run',
    questions.n === 600 && questions.levels === 6,
    `db=${JSON.stringify(questions)}`,
  );

  // --- I. rate-limit windows (loose: shared across runs, retries add hits) ----
  const namespaces = await client.query(
    "SELECT split_part(namespace, ':', 1) AS ns, sum(hits)::bigint AS hits FROM rate_limit_windows GROUP BY 1 ORDER BY 1",
  );
  const nsMap = Object.fromEntries(namespaces.rows.map((r) => [r.ns, Number(r.hits)]));
  // The upload-grant limiter only mounts in S3 mode (audio-upload.ts), so its
  // namespace is legitimately absent under the direct-upload test server.
  // The coarse global flood brake defaults to an in-process MemoryStore and
  // must write no PostgreSQL row in that mode; operators testing the optional
  // shared store opt in through LOAD_RATE_LIMIT_GLOBAL_STORE=postgres.
  check(
    `rate_limit_windows: global ${GLOBAL_RATE_LIMIT_STORE} store matches persistence`,
    GLOBAL_RATE_LIMIT_STORE === 'postgres' ? nsMap.global !== undefined : nsMap.global === undefined,
    JSON.stringify(nsMap),
  );
  for (const required of ['auth', 'register', 'login-account', 'assess', 'assess-ip-daily']) {
    check(`rate_limit_windows: namespace "${required}" present`, nsMap[required] !== undefined, JSON.stringify(nsMap));
  }
  check(
    'rate_limit_windows: register hits cover all registrations',
    (nsMap.register ?? 0) >= registered.length,
    `db=${nsMap.register} expected>=${registered.length}`,
  );
  check(
    'rate_limit_windows: assess hits cover assessments + native replays',
    (nsMap.assess ?? 0) >= expected.assessments + expected.nativeReplays,
    `db=${nsMap.assess} expected>=${expected.assessments + expected.nativeReplays}`,
  );

  // --- J. sampled deep per-user reconciliation --------------------------------
  function stratifiedSample() {
    const byCohort = {
      full: alive.filter((u) => u.cohort === 'full'),
      english: alive.filter((u) => u.cohort === 'english'),
      native: alive.filter((u) => u.cohort === 'native'),
      password: alive.filter((u) => u.cohort === 'account' && u.changedPassword),
    };
    const picked = [
      ...byCohort.full.slice(0, 25),
      ...byCohort.english.slice(0, 25),
      ...byCohort.native.slice(0, 20),
      ...byCohort.password.slice(0, 15),
      ...deleted.slice(0, 15),
    ];
    return picked;
  }

  const sample = stratifiedSample();
  console.log(`\ndeep-checking ${sample.length} sampled users (all cohorts)...`);
  let deepFailures = 0;

  for (const user of sample) {
    const label = `user ${user.index + 1} [${user.cohort}]`;
    const userRow = await scalar('SELECT * FROM users WHERE id = $1', [user.id]);
    if (user.deleted) {
      if (userRow) {
        deepFailures++;
        console.log(`FAIL: ${label} still present after delete`);
      }
      const leftovers = await scalar(
        `SELECT
           (SELECT count(*) FROM attempts WHERE user_id = $1)::int AS attempts,
           (SELECT count(*) FROM diagnostic_state WHERE user_id = $1)::int AS diag,
           (SELECT count(*) FROM practice_progress WHERE user_id = $1)::int AS progress,
           (SELECT count(*) FROM practice_cycles WHERE user_id = $1)::int AS cycles,
           (SELECT count(*) FROM assessment_requests WHERE user_id = $1)::int AS requests`,
        [user.id],
      );
      const total = leftovers.attempts + leftovers.diag + leftovers.progress + leftovers.cycles + leftovers.requests;
      if (total !== 0) {
        deepFailures++;
        console.log(`FAIL: ${label} delete cascade left ${JSON.stringify(leftovers)}`);
      }
      continue;
    }
    if (!userRow) {
      deepFailures++;
      console.log(`FAIL: ${label} missing from users`);
      continue;
    }
    const identityOk =
      userRow.email === user.email &&
      userRow.native_language === user.nativeLanguage &&
      userRow.cefr_level === user.level &&
      userRow.diagnostic_completed === true &&
      userRow.token_version === (user.changedPassword ? 2 : 1);
    if (!identityOk) {
      deepFailures++;
      console.log(
        `FAIL: ${label} identity mismatch db=${JSON.stringify({ email: userRow.email, nl: userRow.native_language, lvl: userRow.cefr_level, done: userRow.diagnostic_completed, tv: userRow.token_version })} ledger lvl=${user.level} tv expected=${user.changedPassword ? 2 : 1}`,
      );
    }

    const attemptRows = await client.query(
      `SELECT context, question_id::text AS qid, attempt_no AS "attemptNo", score, passed,
              native_language AS "nativeLanguage"
       FROM attempts WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
      [user.id],
    );
    const ledgerAttempts = [
      ...user.diagnosticAnswers.map((a) => ({
        context: 'diagnostic',
        qid: a.questionId,
        score: a.score,
        passed: a.passed,
        nativeLanguage: null,
      })),
      ...user.englishAttempts.map((a) => ({
        context: 'practice',
        qid: a.questionId,
        score: a.score,
        passed: a.passed,
        nativeLanguage: null,
      })),
      ...(user.nativeAttempt
        ? [
            {
              context: 'practice-native',
              qid: user.nativeAttempt.questionId,
              score: null,
              passed: null,
              nativeLanguage: user.nativeAttempt.nativeLanguage,
              attemptNo: user.nativeAttempt.attemptNo,
            },
          ]
        : []),
    ];
    let attemptsOk = attemptRows.rows.length === ledgerAttempts.length;
    if (attemptsOk) {
      const sequenceSeen = new Map();
      for (let i = 0; i < attemptRows.rows.length; i++) {
        const row = attemptRows.rows[i];
        const want = ledgerAttempts[i];
        if (
          row.context !== want.context ||
          row.qid !== want.qid ||
          row.score !== want.score ||
          row.passed !== want.passed ||
          row.nativeLanguage !== want.nativeLanguage
        ) {
          attemptsOk = false;
          break;
        }
        if (row.context === 'diagnostic') {
          // Diagnostic attempt_no is the 1-based position in the user's
          // diagnostic sequence (one attempt per question, up to 3).
          const diagNo = (sequenceSeen.get('__diag__') || 0) + 1;
          sequenceSeen.set('__diag__', diagNo);
          if (row.attemptNo !== diagNo) {
            attemptsOk = false;
            break;
          }
        } else if (row.context === 'practice') {
          const no = (sequenceSeen.get(row.qid) || 0) + 1;
          sequenceSeen.set(row.qid, no);
          if (row.attemptNo !== no) {
            attemptsOk = false;
            break;
          }
        } else if (row.attemptNo !== want.attemptNo) {
          attemptsOk = false;
          break;
        }
      }
    }
    if (!attemptsOk) {
      deepFailures++;
      console.log(
        `FAIL: ${label} attempts mismatch db=${JSON.stringify(attemptRows.rows)} ledger=${JSON.stringify(ledgerAttempts)}`,
      );
    }

    const progressRows = await client.query(
      `SELECT question_id::text AS qid, best_score, attempt_count, status
       FROM practice_progress WHERE user_id = $1 ORDER BY question_id`,
      [user.id],
    );
    const expectedProgress = expectedProgressForUser(user);
    const progressOk =
      progressRows.rows.length === expectedProgress.size &&
      progressRows.rows.every((row) => {
        const wanted = expectedProgress.get(row.qid);
        return (
          wanted &&
          row.best_score === wanted.bestScore &&
          row.attempt_count === wanted.attemptCount &&
          row.status === (wanted.mastered ? 'mastered' : 'learning')
        );
      });
    if (!progressOk) {
      deepFailures++;
      console.log(
        `FAIL: ${label} progress mismatch db=${JSON.stringify(progressRows.rows)} ledger=${JSON.stringify([...expectedProgress])}`,
      );
    }

    const ledgerRequests = [
      ...user.diagnosticAnswers.map((a) => ({ requestId: a.requestId, context: 'diagnostic', qid: a.questionId })),
      ...user.englishAttempts.map((a) => ({ requestId: a.requestId, context: 'practice', qid: a.questionId })),
      ...(user.nativeAttempt
        ? [{ requestId: user.nativeAttempt.requestId, context: 'practice-native', qid: user.nativeAttempt.questionId }]
        : []),
    ];
    const requestRows = await client.query(
      `SELECT request_id::text AS rid, context, question_id::text AS qid, status FROM assessment_requests WHERE user_id = $1`,
      [user.id],
    );
    const byRid = new Map(requestRows.rows.map((r) => [r.rid, r]));
    const requestsOk =
      requestRows.rows.length === ledgerRequests.length &&
      ledgerRequests.every(
        (want) =>
          byRid.has(want.requestId) &&
          byRid.get(want.requestId).context === want.context &&
          byRid.get(want.requestId).qid === want.qid &&
          byRid.get(want.requestId).status === 'completed',
      );
    if (!requestsOk) {
      deepFailures++;
      console.log(
        `FAIL: ${label} assessment_requests mismatch db=${JSON.stringify(requestRows.rows)} ledger=${JSON.stringify(ledgerRequests)}`,
      );
    }
  }
  check(
    `deep per-user reconciliation (${sample.length} sampled users)`,
    deepFailures === 0,
    `${deepFailures} mismatches`,
  );

  // --- summary ----------------------------------------------------------------
  console.log(
    `\n${failures === 0 ? 'ALL CHECKS PASSED' : 'RECONCILIATION FAILED'}: ${checks - failures}/${checks} check groups ok`,
  );
} finally {
  await client.end();
}

if (failures > 0) process.exitCode = 1;
