import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from './auth';
import type { AttemptResult } from './types';

interface PracticeFeedback {
  questionId: string;
  result: AttemptResult;
}

interface PracticeFlowValue {
  feedback: PracticeFeedback | null;
  showFeedback: (questionId: string, result: AttemptResult) => void;
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
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);

  const showFeedback = useCallback((questionId: string, result: AttemptResult) => {
    setFeedback({ questionId, result });
  }, []);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  const value = useMemo(
    () => ({ feedback, showFeedback, clearFeedback }),
    [feedback, showFeedback, clearFeedback],
  );

  return <PracticeFlowContext.Provider value={value}>{children}</PracticeFlowContext.Provider>;
}

export function usePracticeFlow(): PracticeFlowValue {
  const context = useContext(PracticeFlowContext);
  if (!context) {
    throw new Error('usePracticeFlow must be used within PracticeFlowProvider');
  }
  return context;
}
