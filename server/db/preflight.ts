import dotenv from 'dotenv';
import { Client } from 'pg';
import { boundedQuestionInventoryQuery, questionInventoryIssues } from '../src/question-inventory';
import { RECORDING_PRIVACY_CUTOVER } from './schema-cutover';

interface IntegrityCheck {
  name: string;
  sql: string;
}

// Exact ECMAScript trim characters used by the mobile parser. PostgreSQL's
// one-argument btrim only removes U+0020, so it would miss tabs, NBSP, BOM,
// and the other Unicode whitespace-only values JavaScript rejects.
const JS_TRIM_CHARACTERS_SQL = String.raw`U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'`;

function integrityChecks(): IntegrityCheck[] {
  return [
    {
      name: 'invalid users',
      sql: `SELECT count(*)::int AS n FROM users
          WHERE name IS NULL OR char_length(name) NOT BETWEEN 1 AND 100
             OR btrim(name, ${JS_TRIM_CHARACTERS_SQL}) = ''
             OR created_at IS NULL OR char_length(email) NOT BETWEEN 3 AND 254
             OR btrim(email, ${JS_TRIM_CHARACTERS_SQL}) = ''
             OR token_version <= 0
             OR (cefr_level IS NOT NULL AND cefr_level NOT IN ('A1','A2','B1','B2','C1','C2'))
             OR (diagnostic_completed AND cefr_level IS NULL)`,
    },
    {
      name: 'duplicate question natural keys',
      sql: `SELECT count(*)::int AS n FROM (
            SELECT 1 FROM questions GROUP BY cefr_level, prompt_word HAVING count(*) > 1
          ) duplicates`,
    },
    {
      name: 'invalid question metadata',
      sql: `SELECT count(*)::int AS n FROM questions
          WHERE created_at IS NULL`,
    },
    {
      name: 'invalid attempts',
      sql: `SELECT count(*)::int AS n FROM attempts
          WHERE user_id IS NULL OR question_id IS NULL OR transcript IS NULL
             OR feedback IS NULL OR created_at IS NULL
             OR CASE context
                  WHEN 'diagnostic' THEN attempt_no NOT BETWEEN 1 AND 5
                  WHEN 'practice' THEN attempt_no NOT BETWEEN 1 AND 3
                  WHEN 'practice-native' THEN attempt_no NOT BETWEEN 1 AND 3
                  ELSE true
                END
             OR (context IN ('diagnostic', 'practice') AND (
                  score IS NULL OR passed IS NULL OR score NOT BETWEEN 0 AND 100
                  OR passed IS DISTINCT FROM (score >= 60)
                ))
             OR (context = 'practice-native' AND (
                  score IS NOT NULL OR passed IS NOT NULL
                  OR (to_jsonb(attempts)->>'understood')::boolean IS NULL
                  OR btrim(coalesce(to_jsonb(attempts)->>'translated_transcript', ''), ${JS_TRIM_CHARACTERS_SQL}) = ''
                  OR btrim(coalesce(to_jsonb(attempts)->>'model_answer', ''), ${JS_TRIM_CHARACTERS_SQL}) = ''
                ))
             OR (
               to_jsonb(attempts) ? 'practice_cycle_id'
               AND (
                 (context = 'diagnostic' AND to_jsonb(attempts)->>'practice_cycle_id' IS NOT NULL)
                 OR (
                   context IN ('practice', 'practice-native')
                   AND to_jsonb(attempts)->>'practice_cycle_id' IS NULL
                 )
               )
             )
             OR (
               to_jsonb(attempts) ? 'native_language'
               AND (
                 (
                   context = 'practice-native'
                   AND coalesce(to_jsonb(attempts)->>'native_language', '')
                     NOT IN ('te', 'hi', 'es', 'zh')
                 )
                 OR (
                   context IN ('diagnostic', 'practice')
                   AND to_jsonb(attempts)->>'native_language' IS NOT NULL
                 )
               )
             )
             OR char_length(transcript) > 12000
             OR char_length(feedback) NOT BETWEEN 1 AND 800
             OR btrim(feedback, ${JS_TRIM_CHARACTERS_SQL}) = ''`,
    },
    {
      name: 'duplicate practice cycle attempt numbers',
      // to_jsonb keeps this read-only preflight compatible with a genuine 017
      // database, where practice_cycle_id does not exist yet. Once migration
      // 018 is present, it audits the partial unique-index invariant too.
      sql: `SELECT count(*)::int AS n FROM (
            SELECT 1
            FROM attempts
            WHERE to_jsonb(attempts) ? 'practice_cycle_id'
              AND to_jsonb(attempts)->>'practice_cycle_id' IS NOT NULL
            GROUP BY to_jsonb(attempts)->>'practice_cycle_id', attempt_no
            HAVING count(*) > 1
          ) duplicates`,
    },
    {
      name: 'invalid assessment request cycle versions',
      // response_version/practice_cycle_id arrive together in migration 018;
      // absent JSON keys make every legacy-017 row skip this post-upgrade
      // integrity branch instead of blocking the migration that backfills it.
      sql: `SELECT count(*)::int AS n FROM assessment_requests
          WHERE to_jsonb(assessment_requests) ? 'response_version'
            AND (
              (to_jsonb(assessment_requests)->>'response_version')::int NOT IN (1, 2)
              OR (
                context = 'diagnostic'
                AND to_jsonb(assessment_requests)->>'practice_cycle_id' IS NOT NULL
              )
              OR (
                context IN ('practice', 'practice-native')
                AND (to_jsonb(assessment_requests)->>'response_version')::int = 2
                AND to_jsonb(assessment_requests)->>'practice_cycle_id' IS NULL
              )
              OR (
                to_jsonb(assessment_requests) ? 'native_language'
                AND (
                  (
                    context = 'practice-native'
                    AND (
                      coalesce(to_jsonb(assessment_requests)->>'native_language', '')
                        NOT IN ('te', 'hi', 'es', 'zh')
                      OR (
                        status = 'completed'
                        AND response_body->>'nativeLanguage'
                          IS DISTINCT FROM to_jsonb(assessment_requests)->>'native_language'
                      )
                    )
                  )
                  OR (
                    context IN ('diagnostic', 'practice')
                    AND to_jsonb(assessment_requests)->>'native_language' IS NOT NULL
                  )
                )
              )
            )`,
    },
    {
      name: 'invalid pending diagnostic answer summaries',
      // Migration 022's attempts.native_language column is the rollout-safe
      // marker that its legacy-silence repair has run. Before that migration,
      // these rows are intentionally allowed through so the migration can
      // restart them; afterwards, any recurrence must fail preflight.
      sql: `SELECT count(*)::int AS n FROM diagnostic_state AS state
          JOIN users ON users.id = state.user_id
          WHERE (
              users.diagnostic_completed = false
              OR coalesce((to_jsonb(users)->>'diagnostic_acknowledged')::boolean, true) = false
            )
            AND state.questions_asked > 0
            AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'attempts'
                AND column_name = 'native_language'
            )
            AND EXISTS (
              SELECT 1
              FROM LATERAL (
                SELECT attempt.transcript
                FROM attempts AS attempt
                WHERE attempt.user_id = state.user_id
                  AND attempt.context = 'diagnostic'
                ORDER BY attempt.created_at DESC, attempt.id DESC
                LIMIT state.questions_asked
              ) AS active_run
              WHERE btrim(active_run.transcript, ${JS_TRIM_CHARACTERS_SQL}) = ''
            )`,
    },
    {
      name: 'invalid diagnostic states',
      sql: `SELECT count(*)::int AS n FROM diagnostic_state
          WHERE low_idx NOT BETWEEN 0 AND 6 OR high_idx NOT BETWEEN -1 AND 5
             OR questions_asked NOT BETWEEN 0 AND 5 OR low_idx > high_idx + 1`,
    },
    {
      name: 'invalid recording privacy cutover fence',
      // Pre-upgrade databases legitimately have neither row. Once migration
      // 023 is recorded, the exact out-of-band fence must exist; the inverse
      // (a fence without 023) is also an interrupted/manual deployment.
      sql: `SELECT CASE WHEN
          (
            EXISTS (
              SELECT 1 FROM schema_migrations
              WHERE name = '${RECORDING_PRIVACY_CUTOVER.requiredMigration}'
            )
            IS DISTINCT FROM
            EXISTS (
              SELECT 1 FROM schema_migrations
              WHERE name = '${RECORDING_PRIVACY_CUTOVER.name}'
                AND checksum = '${RECORDING_PRIVACY_CUTOVER.checksum}'
            )
          )
          OR EXISTS (
            SELECT 1 FROM schema_migrations
            WHERE name = '${RECORDING_PRIVACY_CUTOVER.name}'
              AND checksum IS DISTINCT FROM '${RECORDING_PRIVACY_CUTOVER.checksum}'
          )
        THEN 1 ELSE 0 END::int AS n`,
    },
  ];
}

/** Read-only validation for an existing database before a production upgrade. */
export async function preflight(dbUrl: string): Promise<void> {
  const client = new Client({ connectionString: dbUrl, connectionTimeoutMillis: 10_000 });
  await client.connect();
  let operationError: { value: unknown } | undefined;
  try {
    await client.query("SET statement_timeout = '60s'");
    const failures: string[] = [];
    for (const check of integrityChecks()) {
      const { rows } = await client.query<{ n: number }>(check.sql);
      if (rows[0].n > 0) failures.push(`${check.name}: ${rows[0].n}`);
    }
    // Catalog publication only upserts reviewed natural keys; it deliberately
    // does not delete extras. Detect an incomplete, overfilled, or malformed
    // legacy catalog before migration/startup, using exactly the same bounded
    // JavaScript rules as runtime readiness and the mobile response parsers.
    const inventoryQuery = boundedQuestionInventoryQuery();
    const inventory = await client.query(inventoryQuery.text, [...inventoryQuery.values]);
    failures.push(...questionInventoryIssues(inventory.rows));
    if (failures.length > 0) {
      throw new Error(
        `database integrity preflight failed; repair or explicitly migrate these rows before deployment:\n  - ${failures.join('\n  - ')}`,
      );
    }
  } catch (error) {
    operationError = { value: error };
  }

  let disconnectError: { value: unknown } | undefined;
  try {
    await client.end();
  } catch (error) {
    disconnectError = { value: error };
  }

  // Preserve the integrity/query failure that operators need to diagnose; a
  // secondary disconnect error must not replace it. A disconnect failure
  // remains observable when it is the only failure.
  if (operationError) throw operationError.value;
  if (disconnectError) throw disconnectError.value;
}

export async function runPreflightCommand(
  databaseUrl: string | undefined,
  check: (url: string) => Promise<void> = preflight,
  log: (message: string) => void = console.log,
): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  await check(databaseUrl);
  log('database integrity preflight passed');
}

// Stryker disable all: exported command wiring is unit-tested and this
// direct-execution/exit boundary is subprocess-tested. Mutating require.main
// inside the Vitest host only creates a runner bootstrap RuntimeError.
if (require.main === module) {
  dotenv.config();
  runPreflightCommand(process.env.DATABASE_URL).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
// Stryker restore all
