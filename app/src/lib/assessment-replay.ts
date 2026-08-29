import { isUuid } from './params';
import type { PendingAssessment } from './pending-assessment';
import {
  ContractError,
  parseAttemptResult,
  parseDiagnosticAnswerResult,
  parseNativeAttemptResult,
  parseQuestion,
  type DiagnosticAnswerResult,
  type PracticeOutcome,
  type Question,
} from './types';

export type AssessmentReplayContext = 'diagnostic' | 'practice' | 'practice-native';

interface AssessmentReplayBase {
  context: AssessmentReplayContext;
  questionId: string;
  cycleId: string | null;
  question: Question;
}

export type ParsedAssessmentReplayStatus =
  | ({ status: 'processing' } & AssessmentReplayBase)
  | ({
      status: 'completed';
      context: 'diagnostic';
      result: DiagnosticAnswerResult;
    } & Omit<AssessmentReplayBase, 'context'>)
  | ({
      status: 'completed';
      context: 'practice' | 'practice-native';
      result: PracticeOutcome;
    } & Omit<AssessmentReplayBase, 'context'>);

export function assessmentContextForEndpoint(
  endpoint: PendingAssessment['endpoint'],
): AssessmentReplayContext {
  if (endpoint === '/diagnostic/answer') return 'diagnostic';
  if (endpoint === '/practice/attempt/native') return 'practice-native';
  return 'practice';
}

/**
 * Validates a status response against the exact durable handoff identity.
 * Unknown additive fields are tolerated, while a mismatched account route,
 * question, or practice cycle fails closed before any feedback is published.
 */
export function parseAssessmentReplayStatus(
  value: unknown,
  pending: PendingAssessment,
): ParsedAssessmentReplayStatus {
  if (!value || typeof value !== 'object') throw new ContractError();
  const candidate = value as Record<string, unknown>;
  if (candidate.status !== 'processing' && candidate.status !== 'completed') {
    throw new ContractError();
  }
  const context = assessmentContextForEndpoint(pending.endpoint);
  const questionId = candidate.questionId;
  if (
    candidate.context !== context ||
    typeof questionId !== 'string' ||
    !isUuid(questionId) ||
    questionId !== pending.questionId
  ) {
    throw new ContractError();
  }
  const question = parseQuestion(candidate.question);
  if (question.id !== pending.questionId) throw new ContractError();
  const expectedCycleId = pending.cycleId ?? null;
  const cycleId = candidate.cycleId;
  if (
    (cycleId !== null && (typeof cycleId !== 'string' || !isUuid(cycleId))) ||
    cycleId !== expectedCycleId
  ) {
    throw new ContractError();
  }
  const base: AssessmentReplayBase = {
    context,
    questionId: pending.questionId,
    cycleId: expectedCycleId,
    question,
  };
  if (candidate.status === 'processing') return { status: 'processing', ...base };
  if (!Object.hasOwn(candidate, 'response')) throw new ContractError();
  if (context === 'diagnostic') {
    return {
      status: 'completed',
      ...base,
      context,
      result: parseDiagnosticAnswerResult(candidate.response),
    };
  }
  return {
    status: 'completed',
    ...base,
    context,
    result:
      context === 'practice-native'
        ? parseNativeAttemptResult(candidate.response, pending.cycleId!)
        : parseAttemptResult(candidate.response, pending.cycleId!),
  };
}
