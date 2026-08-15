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

interface PracticeFlowValue {
  answerMode: PracticeAnswerMode;
  feedback: PracticeFeedback | null;
  setAnswerMode: (mode: PracticeAnswerMode) => void;
  showFeedback: (questionId: string, result: PracticeOutcome) => void;
  clearFeedback: () => void;
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

  const showFeedback = useCallback((questionId: string, result: PracticeOutcome) => {
    setFeedback({ questionId, result });
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  const value = useMemo(
    () => ({ answerMode, feedback, setAnswerMode, showFeedback, clearFeedback }),
    [answerMode, feedback, showFeedback, clearFeedback],
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
