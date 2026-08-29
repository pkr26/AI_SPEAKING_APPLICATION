import type { QueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from './auth';
import {
  isNativeOutcome,
  type PracticeAnswerMode,
  type PracticeOutcome,
  type PracticeQuestionPayload,
  type Question,
  type User,
} from './types';

export interface PracticeFeedback {
  questionId: string;
  result: PracticeOutcome;
  question?: Question;
  /** Durable local handoff cleared only after the learner leaves this card. */
  requestId?: string;
}

/** Retry state for the question the learner is still on, kept after the
 * feedback card is dismissed so screens can show "Attempt N of 3" up front. */
interface PracticeAttemptStatus {
  questionId: string;
  cycleId: string;
  attemptsLeft: number;
}

/** Client-side tally of the current practice session for the Home summary.
 * Counts every processed spoken answer; silence remains free. */
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
  showFeedback: (
    questionId: string,
    result: PracticeOutcome,
    question?: Question,
    requestId?: string,
  ) => void;
  restoreFeedback: (
    questionId: string,
    result: PracticeOutcome,
    question: Question | undefined,
    requestId?: string,
  ) => void;
  clearFeedback: () => void;
  resetSessionTally: () => void;
  resetPracticeFlow: () => void;
}

const PracticeFlowContext = createContext<PracticeFlowValue | undefined>(undefined);

export function PracticeFlowProvider({ children }: { children: React.ReactNode }) {
  const { sessionVersion, user } = useAuth();

  // Practice state belongs to one placement phase as well as one auth
  // session. A profile refresh can move this mounted tree into a remote
  // diagnostic reset, a pending level reveal, or an acknowledged placement
  // without rotating the token. Remount before the route guard changes so
  // answer mode, feedback, retry identity, and the Home-session tally cannot
  // leak across that transition.
  const placementPhase = !user
    ? 'no-profile'
    : `${user.id}:${user.diagnosticCompleted ? 'complete' : 'incomplete'}:${
        user.diagnosticAcknowledged === false ? 'reveal-pending' : 'acknowledged'
      }`;

  // Remounting the state owner destroys transcripts and feedback immediately
  // on every authentication or placement transition.
  return (
    <PracticeFlowStateProvider key={`${sessionVersion}:${placementPhase}`}>
      {children}
    </PracticeFlowStateProvider>
  );
}

function PracticeFlowStateProvider({ children }: { children: React.ReactNode }) {
  const [answerMode, setAnswerMode] = useState<PracticeAnswerMode>('english');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<PracticeAttemptStatus | null>(null);
  const [sessionTally, setSessionTally] = useState<SessionTally>(EMPTY_TALLY);

  const showFeedback = useCallback(
    (questionId: string, result: PracticeOutcome, question?: Question, requestId?: string) => {
      setFeedback({
        questionId,
        result,
        ...(question === undefined ? {} : { question }),
        ...(requestId === undefined ? {} : { requestId }),
      });
      // Every processed spoken answer shares the same three-try cycle. Silence
      // keeps both the durable server count and this session summary unchanged.
      if (result.noSpeech) return;
      const native = isNativeOutcome(result);
      setSessionTally((tally) => ({
        attempts: tally.attempts + 1,
        passed: tally.passed + (!native && result.passed ? 1 : 0),
        mastered: tally.mastered + (!native && result.mastered ? 1 : 0),
        levelUps: tally.levelUps + (!native && result.levelUp ? 1 : 0),
      }));
      if ((native || !result.passed) && result.attemptsLeft > 0) {
        setAttemptStatus({
          questionId,
          cycleId: result.cycleId,
          attemptsLeft: result.attemptsLeft,
        });
      } else {
        setAttemptStatus(null);
      }
    },
    [],
  );
  const restoreFeedback = useCallback(
    (
      questionId: string,
      result: PracticeOutcome,
      question: Question | undefined,
      requestId?: string,
    ) => {
      const native = isNativeOutcome(result);
      setAnswerMode(native ? 'native' : 'english');
      setFeedback({
        questionId,
        result,
        ...(question === undefined ? {} : { question }),
        ...(requestId === undefined ? {} : { requestId }),
      });
      if ((result.noSpeech || native || !result.passed) && result.attemptsLeft > 0) {
        setAttemptStatus({
          questionId,
          cycleId: result.cycleId,
          attemptsLeft: result.attemptsLeft,
        });
      } else {
        setAttemptStatus(null);
      }
    },
    [],
  );
  const clearFeedback = useCallback(() => setFeedback(null), []);
  const resetSessionTally = useCallback(() => setSessionTally(EMPTY_TALLY), []);
  const resetPracticeFlow = useCallback(() => {
    setAnswerMode('english');
    setFeedback(null);
    setAttemptStatus(null);
    setSessionTally(EMPTY_TALLY);
  }, []);

  const value = useMemo(
    () => ({
      answerMode,
      feedback,
      attemptStatus,
      sessionTally,
      setAnswerMode,
      showFeedback,
      restoreFeedback,
      clearFeedback,
      resetSessionTally,
      resetPracticeFlow,
    }),
    [
      answerMode,
      feedback,
      attemptStatus,
      sessionTally,
      showFeedback,
      restoreFeedback,
      clearFeedback,
      resetSessionTally,
      resetPracticeFlow,
    ],
  );

  return <PracticeFlowContext.Provider value={value}>{children}</PracticeFlowContext.Provider>;
}

/**
 * A real scored miss moves a new word into revision on the server. The cached
 * practice question is pinned (staleTime: Infinity) until feedback advances
 * it, so every screen that submits an English attempt must mirror that
 * transition locally or the kind badge and revision counter go stale. Native
 * speech is a real failed practice try for progress purposes; silence is free.
 */
export function applyFailedAttemptToQuestionCache(
  queryClient: QueryClient,
  user: User,
  questionId: string,
  result: PracticeOutcome,
): void {
  if (result.noSpeech) return;
  queryClient.setQueryData<PracticeQuestionPayload>(
    ['practice-question', user.id, user.cefrLevel],
    (current) => {
      if (!current || current.question.id !== questionId || current.cycleId !== result.cycleId) {
        return current;
      }
      const isFailedAnswer = isNativeOutcome(result) || !result.passed;
      return {
        ...current,
        ...(result.attemptsLeft > 0
          ? { attemptsUsed: result.attemptNo, attemptsLeft: result.attemptsLeft }
          : {}),
        kind: isFailedAnswer && current.kind === 'new' ? 'revision' : current.kind,
        progress: {
          ...current.progress,
          learningCount:
            isFailedAnswer && current.kind === 'new'
              ? current.progress.learningCount + 1
              : current.progress.learningCount,
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
