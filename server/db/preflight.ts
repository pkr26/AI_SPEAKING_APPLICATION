import dotenv from 'dotenv';
import { Client } from 'pg';
import { boundedQuestionInventoryQuery, questionInventoryIssues } from '../src/question-inventory';

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
             OR score IS NULL OR passed IS NULL OR feedback IS NULL OR created_at IS NULL
             OR CASE context
                  WHEN 'diagnostic' THEN attempt_no NOT BETWEEN 1 AND 5
                  WHEN 'practice' THEN attempt_no NOT BETWEEN 1 AND 3
                  ELSE true
                END
             OR score NOT BETWEEN 0 AND 100
             OR passed IS DISTINCT FROM (score >= 60)
             OR char_length(transcript) > 12000
             OR char_length(feedback) NOT BETWEEN 1 AND 800
             OR btrim(feedback, ${JS_TRIM_CHARACTERS_SQL}) = ''`,
    },
    {
      name: 'invalid diagnostic states',
      sql: `SELECT count(*)::int AS n FROM diagnostic_state
          WHERE low_idx NOT BETWEEN 0 AND 6 OR high_idx NOT BETWEEN -1 AND 5
             OR questions_asked NOT BETWEEN 0 AND 5 OR low_idx > high_idx + 1`,
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
