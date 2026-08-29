import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { answerForm, app, completeDiagnostic, createClosedPracticeCycle, pool, registerUser } from './helpers';
import { QuestionRow } from '../src/db';
import {
  authoredAnswerHint,
  authoredNativeExample,
  buildFinalFeedback,
  buildNativeFallbackFeedback,
  MAX_FINAL_FEEDBACK_LENGTH,
  pickPracticeNext,
} from '../src/practice';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FAIL_SCORE = 0; // Math.random() -> 0 gives mock score 40 (fail)
const PASS_SCORE = 0.9999; // mock score 95 (pass)

describe('practice picker query contract', () => {
  const candidate = {
    id: '00000000-0000-4000-8000-000000000001',
    cefrLevel: 'A1',
    promptWord: 'candidate',
    questionText: 'Describe the candidate.',
  };

  it('passes the completed-question exclusion to every bucket and labels the second-bucket fallback', async () => {
    const userId = '00000000-0000-4000-8000-000000000002';
    const excludedQuestionId = '00000000-0000-4000-8000-000000000003';
    const allBucketsQuery = vi.fn(async (text: string, _values?: unknown[]) => {
      if (text.includes('FROM attempts latest')) return { rows: [] };
      if (text.includes('pp.skipped_until > now()')) return { rows: [candidate] };
      return { rows: [] };
    });
    const allBucketsDb = { query: allBucketsQuery } as unknown as Parameters<typeof pickPracticeNext>[2];

    const skippedFallback = await pickPracticeNext(userId, 'A1', allBucketsDb, excludedQuestionId);

    expect(skippedFallback).toEqual({ question: candidate, kind: 'revision' });
    const bucketCalls = allBucketsQuery.mock.calls.filter(([text]) => text.includes('$3::uuid'));
    expect(bucketCalls).toHaveLength(4);
    for (const [, values] of bucketCalls) {
      expect(values).toEqual([userId, 'A1', excludedQuestionId]);
    }

    const secondBucketQuery = vi.fn(async (text: string) => {
      if (text.includes('FROM attempts latest')) return { rows: [{ was_revision: true }] };
      if (text.includes('LEFT JOIN practice_progress')) return { rows: [] };
      if (text.includes("pp.status = 'learning'")) return { rows: [candidate] };
      return { rows: [] };
    });
    const secondBucketDb = { query: secondBucketQuery } as unknown as Parameters<typeof pickPracticeNext>[2];

    await expect(pickPracticeNext(userId, 'A1', secondBucketDb, excludedQuestionId)).resolves.toEqual({
      question: candidate,
      kind: 'revision',
    });
  });
});

describe('practice attempt numbering (deterministic mock scores)', () => {
  const a = app();

  async function freshUserAtQuestion() {
    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(q.status).toBe(200);
    return {
      token,
      userId,
      questionId: q.body.question.id as string,
      cycleId: q.body.cycleId as string,
    };
  }

  it('walks attempts 1-3 on repeated failures, then permanently closes the serving cycle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(FAIL_SCORE);
    const { token, userId, questionId, cycleId } = await freshUserAtQuestion();
    const attempt = async (expectedStatus = 200) => {
      const response = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
        randomUUID(),
        cycleId,
      );
      expect(response.status, JSON.stringify(response.body)).toBe(expectedStatus);
      await vi.waitFor(async () => {
        const claim = await pool.query<{ count: number }>(
          'SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
          [userId, questionId],
        );
        expect(claim.rows[0].count).toBe(0);
      });
      return response;
    };

    const first = await attempt();
    expect(first.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });
    expect(first.body.next).toBeUndefined();
    expect(first.body.finalFeedback).toBeUndefined();

    const second = await attempt();
    expect(second.body).toMatchObject({ passed: false, attemptNo: 2, attemptsLeft: 1 });

    const third = await attempt();
    expect(third.body).toMatchObject({ passed: false, attemptNo: 3, attemptsLeft: 0 });
    expect(third.body.finalFeedback).toContain('final feedback');
    expect(third.body.next).toBeDefined();
    expect(third.body.next.question.id).not.toBe(questionId);

    // The stale cycle cannot be reopened for a direct fourth submission.
    const fourth = await attempt(409);
    expect(fourth.status).toBe(409);
    expect(fourth.body.code).toBe('PRACTICE_CYCLE_CLOSED');

    const next = third.body.next;
    const nextAttempt = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      next.question.id,
      randomUUID(),
      next.cycleId,
    );
    expect(nextAttempt.body).toMatchObject({ attemptNo: 1, attemptsLeft: 2 });
  });

  it('resets to attempt 1 after a pass and offers the next question', async () => {
    const { token, questionId, cycleId } = await freshUserAtQuestion();
    const attempt = () =>
      answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
        randomUUID(),
        cycleId,
      );

    vi.spyOn(Math, 'random').mockReturnValue(FAIL_SCORE);
    const failed = await attempt();
    expect(failed.body).toMatchObject({ passed: false, attemptNo: 1 });

    vi.spyOn(Math, 'random').mockReturnValue(PASS_SCORE);
    const passed = await attempt();
    expect(passed.body).toMatchObject({ passed: true, attemptNo: 2 });
    expect(passed.body.next).toBeDefined();
    expect(passed.body.next.question.id).not.toBe(questionId);
    expect(passed.body.attemptsLeft).toBe(0);
    expect(passed.body.finalFeedback).toBeUndefined();

    // A passed cycle is closed; only the returned next cycle starts at 1.
    const afterPass = await attempt();
    expect(afterPass.status).toBe(409);
    const next = passed.body.next;
    const nextAnswer = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      next.question.id,
      randomUUID(),
      next.cycleId,
    );
    expect(nextAnswer.body).toMatchObject({ attemptNo: 1 });
  });

  it('excludes the completed question even when ranking would otherwise select it again', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(FAIL_SCORE);
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const questions = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id', [
      level,
    ]);
    const [current, ...alternatives] = questions.rows;
    for (const alternative of alternatives) {
      const cycleId = await createClosedPracticeCycle(userId, alternative.id);
      await pool.query(
        `INSERT INTO attempts
           (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
         VALUES ($1, $2, 'practice', 1, 'prior answer', 90, true, 'passed', $3)`,
        [userId, alternative.id, cycleId],
      );
      await pool.query(
        `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
         VALUES ($1, $2, 'mastered', 90, 1)`,
        [userId, alternative.id],
      );
    }
    const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(assignment.body.question.id).toBe(current.id);
    const attempt = () =>
      answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        current.id,
        randomUUID(),
        assignment.body.cycleId,
      );

    expect((await attempt()).body).toMatchObject({ attemptNo: 1, attemptsLeft: 2 });
    expect((await attempt()).body).toMatchObject({ attemptNo: 2, attemptsLeft: 1 });
    const final = await attempt();

    expect(final.status).toBe(200);
    expect(final.body).toMatchObject({ attemptNo: 3, attemptsLeft: 0 });
    expect(final.body.next.question.id).not.toBe(current.id);
  });
});

describe('practice feedback response bounds', () => {
  // authoredAnswerHint takes a full questions row; only prompt_word and
  // translations influence the hint.
  const questionRow = (translations: QuestionRow['translations']): QuestionRow => ({
    id: '00000000-0000-4000-8000-000000000000',
    cefr_level: 'A1',
    prompt_word: 'hometown',
    question_text: 'Describe your hometown.',
    translations,
  });

  it('uses a trimmed authored example and safely falls back when translations are incomplete', () => {
    const question = questionRow({
      te: { word: 'ఊరు', question: 'మీ ఊరు గురించి చెప్పండి.', examples: [{ en: '  My hometown is peaceful.  ' }] },
    });
    expect(authoredAnswerHint(question, 'te')).toBe('My hometown is peaceful.');
    expect(authoredAnswerHint(questionRow({}), 'te')).toBe('a few clear, on-topic sentences about "hometown"');
  });

  it.each([
    ['the requested language is absent', { hi: { word: 'नगर', question: 'प्रश्न', examples: [{ en: 'नमस्ते' }] } }],
    [
      'the authored examples property is absent',
      { te: { word: 'ఊరు', question: 'ప్రశ్న', examples: undefined } } as unknown as QuestionRow['translations'],
    ],
    ['the authored example list is empty', { te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [] } }],
    [
      'the first example has no English text',
      { te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [{ native: 'నా ఊరు' }] } },
    ],
  ] as Array<[string, QuestionRow['translations']]>)('falls back when %s', (_caseName, malformedTranslation) => {
    expect(authoredAnswerHint(questionRow(malformedTranslation), 'te')).toBe(
      'a few clear, on-topic sentences about "hometown"',
    );
  });

  it('caps unexpectedly large authored examples to the mobile contract', () => {
    const feedback = buildFinalFeedback('Keep practicing.', 'x'.repeat(10_000));
    expect(feedback).toHaveLength(MAX_FINAL_FEEDBACK_LENGTH);
    expect(feedback).toContain('Keep practicing.');
    expect(feedback.endsWith(". Let's move on!")).toBe(true);
  });

  it('caps unexpectedly large provider feedback even when no authored hint can fit', () => {
    expect(buildFinalFeedback('x'.repeat(10_000), 'short hint')).toHaveLength(MAX_FINAL_FEEDBACK_LENGTH);
  });

  it('validates and trims authored native examples before using them', () => {
    const valid = questionRow({
      te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [{ native: '  నా ఊరు ప్రశాంతంగా ఉంటుంది.  ' }] },
    });
    expect(authoredNativeExample(valid, 'te')).toBe('నా ఊరు ప్రశాంతంగా ఉంటుంది.');
    expect(authoredNativeExample(questionRow({}), 'te')).toBeUndefined();
    expect(
      authoredNativeExample(
        questionRow({
          te: { word: 'ఊరు', question: 'ప్రశ్న', examples: undefined },
        } as unknown as QuestionRow['translations']),
        'te',
      ),
    ).toBeUndefined();
    expect(
      authoredNativeExample(questionRow({ te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [] } }), 'te'),
    ).toBeUndefined();
    expect(
      authoredNativeExample(
        questionRow({ te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [{ en: 'English only' }] } }),
        'te',
      ),
    ).toBeUndefined();
    expect(
      authoredNativeExample(
        questionRow({ te: { word: 'ఊరు', question: 'ప్రశ్న', examples: [{ native: '   ' }] } }),
        'te',
      ),
    ).toBeUndefined();
  });

  it('caps native fallback feedback while preserving its prefix and closing guidance', () => {
    const suffix = ' — try saying it in English next!';
    const feedback = buildNativeFallbackFeedback('Needs more detail.', 'న'.repeat(2_000));
    expect(feedback).toHaveLength(800);
    expect(feedback.startsWith('Needs more detail. An on-topic answer could be: ')).toBe(true);
    expect(feedback.endsWith(suffix)).toBe(true);
    expect(buildNativeFallbackFeedback('Record again.')).toBe('Record again.');
    expect(buildNativeFallbackFeedback('x'.repeat(1_000))).toHaveLength(800);
    expect(buildNativeFallbackFeedback('x'.repeat(1_000), 'native example')).toHaveLength(800);
  });

  it('budgets the lead-in against the provider feedback, never promising a sliced-away example', () => {
    const lead = ' An on-topic answer could be: ';
    const suffix = ' — try saying it in English next!';

    // One character of example room left: the lead-in still earns its place.
    const tightFeedback = 'p'.repeat(800 - lead.length - suffix.length - 1);
    const tight = buildNativeFallbackFeedback(tightFeedback, 'నా ఊరు');
    expect(tight).toBe(`${tightFeedback}${lead}న${suffix}`);
    expect(tight).toHaveLength(800);

    // One character more of provider feedback and nothing fits: the learner
    // reads the feedback alone instead of a dangling "answer could be: ".
    const exactFeedback = 'p'.repeat(800 - lead.length - suffix.length);
    expect(buildNativeFallbackFeedback(exactFeedback, 'నా ఊరు')).toBe(exactFeedback);
    // The grading schema allows up to 800 characters, so a 750-character
    // feedback arrives whole rather than hard-cut inside the dropped lead-in.
    const longFeedback = 'p'.repeat(750);
    expect(buildNativeFallbackFeedback(longFeedback, 'నా ఊరు')).toBe(longFeedback);
  });
});
