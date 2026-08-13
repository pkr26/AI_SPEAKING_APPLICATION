import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const SERVER_DIRECTORY = path.resolve(__dirname, '..');
const TSX_CLI = require.resolve('tsx/cli');

function runTypeScriptCli(relativePath: string, args: string[], environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [TSX_CLI, path.join(SERVER_DIRECTORY, relativePath), ...args], {
    cwd: SERVER_DIRECTORY,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
    timeout: 15_000,
  });
}

describe('database CLI entrypoints', () => {
  it('executes the mutation database safety guard as a standalone command', () => {
    const result = runTypeScriptCli('db/mutation-db-guard.ts', [], {
      DATABASE_URL: 'postgres://localhost:5432/application',
      TEST_DATABASE_URL: 'postgres://localhost:5432/cli_mutation_test',
      PGPORT: '5432',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('exits nonzero when the standalone mutation guard receives an unsafe target', () => {
    const result = runTypeScriptCli('db/mutation-db-guard.ts', [], {
      DATABASE_URL: 'postgres://localhost:5432/application',
      TEST_DATABASE_URL: 'postgres://localhost:5432/ai_english_test',
      PGPORT: '5432',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dedicated mutation database');
  });

  it('executes the preflight entrypoint and reports missing configuration through stderr', () => {
    const result = runTypeScriptCli('db/preflight.ts', [], { DATABASE_URL: '' });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL is required');
  });

  it('executes the database runner entrypoint and rejects an unknown command before connecting', () => {
    const result = runTypeScriptCli('db/run.ts', ['drop'], {
      DATABASE_URL: 'postgres://localhost:5432/cli_test',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown database command "drop"');
  });

  it('executes the seed generator entrypoint without changing the deterministic artifact', () => {
    const seedPath = path.join(SERVER_DIRECTORY, 'db', 'seed.sql');
    const before = fs.readFileSync(seedPath, 'utf8');
    try {
      const result = runTypeScriptCli('db/generate-seed.ts', [], {});

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('wrote db/seed.sql with 36 questions');
      expect(fs.readFileSync(seedPath, 'utf8')).toBe(before);
    } finally {
      if (fs.readFileSync(seedPath, 'utf8') !== before) fs.writeFileSync(seedPath, before, 'utf8');
    }
  });
});
