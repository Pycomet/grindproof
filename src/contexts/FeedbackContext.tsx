/**
 * FeedbackContext
 * Global state provider for feedback popup
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FeedbackState, FeedbackTriggerType } from '@/lib/feedback/types';
import { useFeedback as useFeedbackHook } from '@/hooks/useFeedback';

interface FeedbackContextType {
  feedbackState: FeedbackState;
  openFeedback: (triggerType: FeedbackTriggerType) => void;
  closeFeedback: () => void;
  triggerFeedback: (triggerType: FeedbackTriggerType, messageCount?: number) => boolean;
  recordDismissal: () => void;
  recordSubmission: () => void;
  incrementTaskCount: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    isOpen: false,
    triggerType: null,
  });

  const {
    triggerFeedback: checkTrigger,
    recordDismissal: recordDismissalHook,
    recordSubmission: recordSubmissionHook,
    incrementTaskCount: incrementTaskCountHook,
  } = useFeedbackHook();

  const openFeedback = useCallback((triggerType: FeedbackTriggerType) => {
    setFeedbackState({
      isOpen: true,
      triggerType,
    });
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedbackState({
      isOpen: false,
      triggerType: null,
    });
  }, []);

  const triggerFeedback = useCallback(
    (triggerType: FeedbackTriggerType, messageCount?: number): boolean => {
      const canShow = checkTrigger(triggerType, messageCount);
      
      if (canShow) {
        openFeedback(triggerType);
        return true;
      }
      
      return false;
    },
    [checkTrigger, openFeedback]
  );

  const recordDismissal = useCallback(() => {
    recordDismissalHook();
    closeFeedback();
  }, [recordDismissalHook, closeFeedback]);

  const recordSubmission = useCallback(() => {
    recordSubmissionHook();
    closeFeedback();
  }, [recordSubmissionHook, closeFeedback]);

  const incrementTaskCount = useCallback(() => {
    incrementTaskCountHook();
  }, [incrementTaskCountHook]);

  return (
    <FeedbackContext.Provider
      value={{
        feedbackState,
        openFeedback,
        closeFeedback,
        triggerFeedback,
        recordDismissal,
        recordSubmission,
        incrementTaskCount,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedbackContext() {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error('useFeedbackContext must be used within a FeedbackProvider');
  }
  return context;
}

