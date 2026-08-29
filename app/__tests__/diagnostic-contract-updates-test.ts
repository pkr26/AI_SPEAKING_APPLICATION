import { parseDiagnosticAnswerResult, parseDiagnosticNext } from '../src/lib/types';

const question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
} as const;

describe('updated diagnostic contracts', () => {
  it('parses durable answer summaries on active and completed responses', () => {
    const answer = {
      attemptNo: 1,
      promptWord: question.promptWord,
      questionText: question.questionText,
      transcript: 'I helped a friend.',
      score: 75,
      passed: true,
      feedback: 'Clear and relevant.',
    } as const;

    expect(
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 1, maxQuestions: 3 },
        answers: [answer],
      }),
    ).toMatchObject({ answers: [answer] });
    expect(parseDiagnosticNext({ done: true, level: 'B1', answers: [answer] })).toMatchObject({
      answers: [answer],
    });
  });

  it('accepts only the explicit free-retry shape for diagnostic silence', () => {
    const silence = {
      passed: false,
      score: 0,
      transcript: '',
      feedback: 'Please speak clearly and try again.',
      noSpeech: true,
      done: false,
      nextQuestion: question,
    } as const;

    expect(parseDiagnosticAnswerResult(silence)).toEqual(silence);
    expect(() => parseDiagnosticAnswerResult({ ...silence, noSpeech: undefined })).toThrow();
    expect(() => parseDiagnosticAnswerResult({ ...silence, done: true, level: 'A1' })).toThrow();
    expect(() => parseDiagnosticAnswerResult({ ...silence, transcript: 'heard speech' })).toThrow();
  });

  it('rejects malformed durable summaries', () => {
    const base = {
      done: true,
      level: 'B1',
      answers: [
        {
          attemptNo: 2,
          promptWord: 'courage',
          questionText: 'Question?',
          transcript: 'Answer.',
          score: 80,
          passed: true,
          feedback: 'Good.',
        },
      ],
    } as const;
    expect(() => parseDiagnosticNext(base)).toThrow();
    expect(() =>
      parseDiagnosticNext({
        ...base,
        answers: [{ ...base.answers[0], attemptNo: 1, passed: false }],
      }),
    ).toThrow();
  });
});
