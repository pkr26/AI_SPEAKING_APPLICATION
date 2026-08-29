import fs from 'fs/promises';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const assessMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: assessMock };
});

import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

beforeEach(() => {
  assessMock.mockReset();
  assessMock.mockResolvedValue({
    transcript: 'A clear learner answer.',
    score: 82,
    passed: true,
    feedback: 'Relevant and well structured.',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('assessment prompt context', () => {
  const a = app();

  it('passes the exact served diagnostic question context and learner identity to assessment', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const response = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      next.body.question.id,
    );

    expect(response.status).toBe(200);
    expect(assessMock).toHaveBeenCalledOnce();
    expect(assessMock).toHaveBeenCalledWith(
      expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/),
      {
        cefrLevel: next.body.question.cefrLevel,
        promptWord: next.body.question.promptWord,
        questionText: next.body.question.questionText,
      },
      userId,
      expect.objectContaining({ onCapacityReserved: expect.any(Function) }),
    );
    const assessedPath = assessMock.mock.calls[0][0] as string;
    await expect(fs.stat(assessedPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('passes the exact authorized practice question context and learner identity to assessment', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);
    assessMock.mockClear();
    const assigned = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const question = await pool.query<{
      id: string;
      cefr_level: string;
      prompt_word: string;
      question_text: string;
    }>(
      `SELECT id, cefr_level, prompt_word, question_text
       FROM questions WHERE id = $1`,
      [assigned.body.question.id],
    );
    const q = question.rows[0];

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      q.id,
      undefined,
      assigned.body.cycleId,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ passed: true, attemptNo: 1, score: 82 });
    expect(assessMock).toHaveBeenCalledOnce();
    expect(assessMock).toHaveBeenCalledWith(
      expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/),
      { cefrLevel: q.cefr_level, promptWord: q.prompt_word, questionText: q.question_text },
      userId,
      expect.objectContaining({ onCapacityReserved: expect.any(Function) }),
    );
    const assessedPath = assessMock.mock.calls[0][0] as string;
    await expect(fs.stat(assessedPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uses the learner language authored example for final practice feedback', async () => {
    const { res } = await registerUser(a, { nativeLanguage: 'es' });
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{
      id: string;
      translations: Record<string, { examples: Array<{ en: string }> }>;
    }>('SELECT id, translations FROM questions WHERE cefr_level = $1 ORDER BY id LIMIT 1', [level]);
    const q = question.rows[0];
    const cycle = await pool.query<{ id: string }>(
      `INSERT INTO practice_cycles (user_id, question_id, kind, attempts_used)
       VALUES ($1, $2, 'revision', 2) RETURNING id`,
      [userId, q.id],
    );
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
       VALUES ($1, $2, 'practice', 2, 'prior answer', 50, false, 'Try again', $3)`,
      [userId, q.id, cycle.rows[0].id],
    );
    assessMock.mockReset();
    assessMock.mockResolvedValue({ transcript: 'final answer', score: 50, passed: false, feedback: 'Add detail.' });

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      q.id,
      undefined,
      cycle.rows[0].id,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ passed: false, attemptNo: 3, attemptsLeft: 0 });
    expect(response.body.finalFeedback).toContain(q.translations.es.examples[0].en);
  });
});
