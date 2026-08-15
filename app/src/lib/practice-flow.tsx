import type { QueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from './auth';
import {
  isNativeOutcome,
  type PracticeAnswerMode,
  type PracticeOutcome,
  type PracticeQuestionPayload,
  type User,
} from './types';

interface PracticeFeedback {
  questionId: string;
  result: PracticeOutcome;
}

/** Retry state for the question the learner is still on, kept after the
 * feedback card is dismissed so screens can show "Attempt N of 3" up front. */
interface PracticeAttemptStatus {
  questionId: string;
  attemptsLeft: number;
}

/** Client-side tally of the current practice session for the Home summary.
 * Counts scored English attempts only; native answers and silence are free. */
export interface SessionTally {
  attempts: number;
  passed: number;
  mastered: number;
  levelUps: number;
}

const EMPTY_TALLY: SessionTally = { attempts: 0, passed: 0, mastered: 0, levelUps: 0 };

interface PracticeFlowValue {
  answerMode: PracticeAnswerMode;
  feedback: PracticeFeedback | null;
  attemptStatus: PracticeAttemptStatus | null;
  sessionTally: SessionTally;
  setAnswerMode: (mode: PracticeAnswerMode) => void;
  showFeedback: (questionId: string, result: PracticeOutcome) => void;
  clearFeedback: () => void;
  resetSessionTally: () => void;
}

const PracticeFlowContext = createContext<PracticeFlowValue | undefined>(undefined);

export function PracticeFlowProvider({ children }: { children: React.ReactNode }) {
  const { sessionVersion } = useAuth();

  // Remounting the state owner destroys transcripts and feedback immediately
  // on every authentication transition, including same-user token rotation.
  return <PracticeFlowStateProvider key={sessionVersion}>{children}</PracticeFlowStateProvider>;
}

function PracticeFlowStateProvider({ children }: { children: React.ReactNode }) {
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>('english');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<PracticeAttemptStatus | null>(null);
  const [sessionTally, setSessionTally] = useState<SessionTally>(EMPTY_TALLY);

  const showFeedback = useCallback((questionId: string, result: PracticeOutcome) => {
    setFeedback({ questionId, result });
    // Native answers and silence never count as attempts, so they leave the
    // retry state and the session tally alone. A scored miss with retries left
    // pins the question's attempt state; a pass or the final miss ends it (the
    // word advances).
    if (isNativeOutcome(result) || result.noSpeech) return;
    setSessionTally((tally) => ({
      attempts: tally.attempts + 1,
      passed: tally.passed + (result.passed ? 1 : 0),
      mastered: tally.mastered + (result.mastered ? 1 : 0),
      levelUps: tally.levelUps + (result.levelUp ? 1 : 0),
    }));
    if (!result.passed && (result.attemptsLeft ?? 0) > 0) {
      setAttemptStatus({ questionId, attemptsLeft: result.attemptsLeft! });
    } else {
      setAttemptStatus(null);
    }
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);
  const resetSessionTally = useCallback(() => setSessionTally(EMPTY_TALLY), []);

  const value = useMemo(
    () => ({
      answerMode,
      feedback,
      attemptStatus,
      sessionTally,
      setAnswerMode,
      showFeedback,
      clearFeedback,
      resetSessionTally,
    }),
    [
      answerMode,
      feedback,
      attemptStatus,
      sessionTally,
      showFeedback,
      clearFeedback,
      resetSessionTally,
    ],
  );

  return <PracticeFlowContext.Provider value={value}>{children}</PracticeFlowContext.Provider>;
}

/**
 * A real scored miss moves a new word into revision on the server. The cached
 * practice question is pinned (staleTime: Infinity) until feedback advances
 * it, so every screen that submits an English attempt must mirror that
 * transition locally or the kind badge and revision counter go stale. Native
 * answers and silence never count as attempts.
 */
export function applyFailedAttemptToQuestionCache(
  queryClient: QueryClient,
  user: User,
  questionId: string,
  result: PracticeOutcome,
): void {
  if (isNativeOutcome(result) || result.noSpeech || result.passed) return;
  queryClient.setQueryData<PracticeQuestionPayload>(
    ['practice-question', user.id, user.cefrLevel],
    (current) => {
      if (!current || current.question.id !== questionId || current.kind !== 'new') {
        return current;
      }
      return {
        ...current,
        kind: 'revision',
        progress: {
          ...current.progress,
          learningCount: current.progress.learningCount + 1,
        },
      };
    },
  );
}

export function usePracticeFlow(): PracticeFlowValue {
  const context = useContext(PracticeFlowContext);
  if (!context) {
    throw new Error('usePracticeFlow must be used within PracticeFlowProvider');
  }
  return context;
}
