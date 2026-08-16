import dotenv from 'dotenv';
import { Client } from 'pg';

interface IntegrityCheck {
  name: string;
  sql: string;
}

function integrityChecks(): IntegrityCheck[] {
  return [
    {
      name: 'invalid users',
      sql: `SELECT count(*)::int AS n FROM users
          WHERE name IS NULL OR char_length(name) NOT BETWEEN 1 AND 100
             OR created_at IS NULL OR char_length(email) NOT BETWEEN 3 AND 254
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
      name: 'invalid questions',
      sql: `SELECT count(*)::int AS n FROM questions
          WHERE created_at IS NULL
             OR char_length(prompt_word) NOT BETWEEN 1 AND 100
             OR btrim(prompt_word) = ''
             OR char_length(question_text) NOT BETWEEN 1 AND 1000
             OR btrim(question_text) = ''
             OR jsonb_typeof(translations) IS DISTINCT FROM 'object'
             OR NOT (translations ?& ARRAY['te', 'hi', 'es', 'zh'])
             OR EXISTS (
               SELECT 1
               FROM unnest(ARRAY['te', 'hi', 'es', 'zh']) AS supported_language(code)
               CROSS JOIN LATERAL (
                 SELECT translations->supported_language.code
               ) AS payload(translation)
               WHERE jsonb_typeof(payload.translation) IS DISTINCT FROM 'object'
                  OR jsonb_typeof(payload.translation->'word') IS DISTINCT FROM 'string'
                  OR btrim(payload.translation->>'word') = ''
                  OR char_length(payload.translation->>'word') > 500
                  OR jsonb_typeof(payload.translation->'question') IS DISTINCT FROM 'string'
                  OR btrim(payload.translation->>'question') = ''
                  OR char_length(payload.translation->>'question') > 4000
                  OR CASE
                       WHEN jsonb_typeof(payload.translation->'examples') IS DISTINCT FROM 'array'
                         THEN true
                       ELSE jsonb_array_length(payload.translation->'examples') <> 3
                         OR EXISTS (
                           SELECT 1
                           FROM jsonb_array_elements(payload.translation->'examples') AS example(item)
                           WHERE jsonb_typeof(example.item) IS DISTINCT FROM 'object'
                              OR jsonb_typeof(example.item->'en') IS DISTINCT FROM 'string'
                              OR btrim(example.item->>'en') = ''
                              OR char_length(example.item->>'en') > 4000
                              OR jsonb_typeof(example.item->'native') IS DISTINCT FROM 'string'
                              OR btrim(example.item->>'native') = ''
                              OR char_length(example.item->>'native') > 4000
                         )
                     END
             )`,
    },
    {
      name: 'invalid attempts',
      sql: `SELECT count(*)::int AS n FROM attempts
          WHERE user_id IS NULL OR question_id IS NULL OR transcript IS NULL
             OR score IS NULL OR passed IS NULL OR feedback IS NULL OR created_at IS NULL
             OR attempt_no <= 0 OR score NOT BETWEEN 0 AND 100
             OR char_length(transcript) > 12000
             OR char_length(feedback) NOT BETWEEN 1 AND 800`,
    },
    {
      name: 'invalid diagnostic states',
      sql: `SELECT count(*)::int AS n FROM diagnostic_state
          WHERE low_idx NOT BETWEEN 0 AND 6 OR high_idx NOT BETWEEN -1 AND 5
             OR questions_asked NOT BETWEEN 0 AND 5 OR low_idx > high_idx + 1`,
    },
  ];
}

/** Read-only validation for databases created before migration 003. */
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
