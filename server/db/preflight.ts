import { Client } from 'pg';

interface IntegrityCheck {
  name: string;
  sql: string;
}

const checks: IntegrityCheck[] = [
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
             OR char_length(question_text) NOT BETWEEN 1 AND 1000
             OR jsonb_typeof(translations) IS DISTINCT FROM 'object'
             OR NOT (translations ?& ARRAY['te', 'hi', 'es', 'zh'])
             OR jsonb_typeof(translations->'te'->'examples') IS DISTINCT FROM 'array'
             OR jsonb_array_length(translations->'te'->'examples') <> 3
             OR jsonb_typeof(translations->'hi'->'examples') IS DISTINCT FROM 'array'
             OR jsonb_array_length(translations->'hi'->'examples') <> 3
             OR jsonb_typeof(translations->'es'->'examples') IS DISTINCT FROM 'array'
             OR jsonb_array_length(translations->'es'->'examples') <> 3
             OR jsonb_typeof(translations->'zh'->'examples') IS DISTINCT FROM 'array'
             OR jsonb_array_length(translations->'zh'->'examples') <> 3`,
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

/** Read-only validation for databases created before migration 003. */
export async function preflight(dbUrl: string): Promise<void> {
  const client = new Client({ connectionString: dbUrl, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    await client.query("SET statement_timeout = '60s'");
    const failures: string[] = [];
    for (const check of checks) {
      const { rows } = await client.query<{ n: number }>(check.sql);
      if (rows[0].n > 0) failures.push(`${check.name}: ${rows[0].n}`);
    }
    if (failures.length > 0) {
      throw new Error(
        `database integrity preflight failed; repair or explicitly migrate these rows before deployment:\n  - ${failures.join('\n  - ')}`,
      );
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  await preflight(databaseUrl);
  console.log('database integrity preflight passed');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
