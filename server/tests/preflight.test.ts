import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clientConstructor, connect, end, query } = vi.hoisted(() => ({
  clientConstructor: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  query: vi.fn(),
}));

vi.mock('pg', () => ({
  Client: vi.fn().mockImplementation(function (options: unknown) {
    clientConstructor(options);
    return { connect, end, query };
  }),
}));

import { preflight, runPreflightCommand } from '../db/preflight';
import { RECORDING_PRIVACY_CUTOVER } from '../db/schema-cutover';
import { REQUIRED_CEFR_LEVELS } from '../src/question-inventory';

const DATABASE_URL = 'postgres://localhost:5432/preflight_test';
const QUESTION_ID = '11111111-1111-4111-8111-111111111111';
const CHECK_NAMES = [
  'invalid users',
  'duplicate question natural keys',
  'invalid question metadata',
  'invalid attempts',
  'duplicate practice cycle attempt numbers',
  'invalid assessment request cycle versions',
  'invalid pending diagnostic answer summaries',
  'invalid diagnostic states',
  'invalid recording privacy cutover fence',
] as const;

function inventoryRow(cefr_level: string, prompt_word = 'word') {
  const translation = {
    word: 'translation',
    question: 'Translated question?',
    examples: Array.from({ length: 3 }, () => ({ en: 'English example.', native: 'Native example.' })),
  };
  return {
    id: QUESTION_ID,
    cefr_level,
    prompt_word,
    question_text: 'Answer this question.',
    translations: { te: translation, hi: translation, es: translation, zh: translation },
  };
}

function healthyInventory() {
  return REQUIRED_CEFR_LEVELS.flatMap((level) => Array.from({ length: 100 }, () => inventoryRow(level)));
}

function mockPreflightQueries(counts: readonly number[] = CHECK_NAMES.map(() => 0), inventory = healthyInventory()) {
  query.mockResolvedValueOnce({ rows: [] });
  for (const count of counts) query.mockResolvedValueOnce({ rows: [{ n: count }] });
  query.mockResolvedValueOnce({ rows: inventory });
}

beforeEach(() => {
  clientConstructor.mockClear();
  connect.mockReset().mockResolvedValue(undefined);
  end.mockReset().mockResolvedValue(undefined);
  query.mockReset();
});

describe('database integrity preflight', () => {
  it('runs every bounded read-only integrity check and always closes the client', async () => {
    vi.resetModules();
    const { preflight: freshPreflight } = await import('../db/preflight');
    mockPreflightQueries();

    await expect(freshPreflight(DATABASE_URL)).resolves.toBeUndefined();

    expect(clientConstructor).toHaveBeenCalledWith({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 10_000,
    });
    expect(connect).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]).toEqual(["SET statement_timeout = '60s'"]);
    expect(query).toHaveBeenCalledTimes(11);
    const integritySql = query.mock.calls.slice(1, 10).map(([sql]) => String(sql));
    expect(integritySql).toHaveLength(9);
    expect(integritySql[0]).toContain('token_version <= 0');
    expect(integritySql[0]).toContain('diagnostic_completed AND cefr_level IS NULL');
    expect(integritySql[0]).toContain("btrim(name, U&'\\0009");
    expect(integritySql[0]).toContain("btrim(email, U&'\\0009");
    expect(integritySql[0]).toContain('\\00A0');
    expect(integritySql[0]).toContain('\\FEFF');
    expect(integritySql[1]).toContain('GROUP BY cefr_level, prompt_word HAVING count(*) > 1');
    expect(integritySql[2]).toContain('created_at IS NULL');
    expect(integritySql[3]).toContain('score NOT BETWEEN 0 AND 100');
    expect(integritySql[3]).toContain("WHEN 'diagnostic' THEN attempt_no NOT BETWEEN 1 AND 5");
    expect(integritySql[3]).toContain("WHEN 'practice' THEN attempt_no NOT BETWEEN 1 AND 3");
    expect(integritySql[3]).toContain('passed IS DISTINCT FROM (score >= 60)');
    expect(integritySql[3]).toContain('char_length(transcript) > 12000');
    expect(integritySql[3]).toContain("btrim(feedback, U&'\\0009");
    expect(integritySql[3]).toContain("to_jsonb(attempts) ? 'practice_cycle_id'");
    expect(integritySql[3]).toContain("to_jsonb(attempts) ? 'native_language'");
    expect(integritySql[3]).toContain("NOT IN ('te', 'hi', 'es', 'zh')");
    expect(integritySql[4]).toContain("GROUP BY to_jsonb(attempts)->>'practice_cycle_id', attempt_no");
    expect(integritySql[5]).toContain("to_jsonb(assessment_requests) ? 'response_version'");
    expect(integritySql[5]).toContain("to_jsonb(assessment_requests) ? 'native_language'");
    expect(integritySql[5]).toContain("response_body->>'nativeLanguage'");
    expect(integritySql[6]).toContain("column_name = 'native_language'");
    expect(integritySql[6]).toContain("to_jsonb(users)->>'diagnostic_acknowledged'");
    expect(integritySql[6]).toContain('LIMIT state.questions_asked');
    expect(integritySql[6]).toContain("btrim(active_run.transcript, U&'\\0009");
    expect(integritySql[7]).toContain('low_idx > high_idx + 1');
    expect(integritySql[8]).toContain(RECORDING_PRIVACY_CUTOVER.requiredMigration);
    expect(integritySql[8]).toContain(RECORDING_PRIVACY_CUTOVER.name);
    expect(integritySql[8]).toContain(RECORDING_PRIVACY_CUTOVER.checksum);
    expect(integritySql[8]).toContain('IS DISTINCT FROM');
    expect(query.mock.calls[10]).toEqual([
      expect.stringContaining('SELECT id, cefr_level, prompt_word, question_text, translations'),
      [601],
    ]);
    expect(end).toHaveBeenCalledOnce();
  });

  it.each(CHECK_NAMES.map((name, index) => [name, index, index + 1] as const))(
    'reports a nonzero %s failure by name and count',
    async (name, failedIndex, count) => {
      mockPreflightQueries(CHECK_NAMES.map((_checkName, index) => (index === failedIndex ? count : 0)));

      await expect(preflight(DATABASE_URL)).rejects.toThrow(`${name}: ${count}`);
      expect(end).toHaveBeenCalledOnce();
    },
  );

  it('reports multiple integrity failures on separate operator-readable lines', async () => {
    mockPreflightQueries([2, 0, 3, 0, 0, 0, 0, 0, 0]);

    await expect(preflight(DATABASE_URL)).rejects.toThrow(
      'database integrity preflight failed; repair or explicitly migrate these rows before deployment:\n  - invalid users: 2\n  - invalid question metadata: 3',
    );
    expect(end).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'an overfilled level',
      [...healthyInventory(), inventoryRow('A1')],
      'question inventory A1: expected 100, found 101',
    ],
    [
      'a malformed JavaScript-whitespace row',
      healthyInventory().map((row, index) => (index === 0 ? { ...row, prompt_word: '\t\n' } : row)),
      'malformed question rows: 1',
    ],
  ] as const)('reports %s before deployment', async (_name, inventory, expectedFailure) => {
    mockPreflightQueries(undefined, [...inventory]);

    await expect(preflight(DATABASE_URL)).rejects.toThrow(expectedFailure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('closes the client when an integrity query fails', async () => {
    const failure = new Error('database disconnected');
    query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(failure);

    await expect(preflight(DATABASE_URL)).rejects.toBe(failure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('preserves an integrity query failure when disconnect also fails', async () => {
    const queryFailure = new Error('integrity query failed');
    query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(queryFailure);
    end.mockRejectedValueOnce(new Error('disconnect failed'));

    await expect(preflight(DATABASE_URL)).rejects.toBe(queryFailure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('propagates a disconnect failure when every integrity check succeeds', async () => {
    const disconnectFailure = new Error('disconnect failed');
    mockPreflightQueries();
    end.mockRejectedValueOnce(disconnectFailure);

    await expect(preflight(DATABASE_URL)).rejects.toBe(disconnectFailure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('validates and wires the preflight command before logging success', async () => {
    const check = vi.fn(async () => undefined);
    const log = vi.fn();

    await expect(runPreflightCommand(DATABASE_URL, check, log)).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledWith(DATABASE_URL);
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('database integrity preflight passed');

    await expect(runPreflightCommand(undefined, check, log)).rejects.toThrow('DATABASE_URL is required');
    expect(check).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
  });

  it('does not log command success when the integrity check fails', async () => {
    const failure = new Error('preflight command failed');
    const check = vi.fn(async () => {
      throw failure;
    });
    const log = vi.fn();

    await expect(runPreflightCommand(DATABASE_URL, check, log)).rejects.toBe(failure);
    expect(log).not.toHaveBeenCalled();
  });
});
