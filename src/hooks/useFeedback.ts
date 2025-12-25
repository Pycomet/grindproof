/**
 * useFeedback Hook
 * Smart trigger logic with rate limiting and cooldown management
 */

import { useState, useEffect, useCallback } from 'react';
import { feedbackConfig } from '@/lib/feedback/config';
import { FeedbackTriggerType, FeedbackCooldownState } from '@/lib/feedback/types';

const STORAGE_KEY = 'grindproof_feedback_cooldown';

// Get cooldown state from localStorage
function getCooldownState(): FeedbackCooldownState {
  if (typeof window === 'undefined') {
    return {
      lastFeedbackTimestamp: null,
      lastFeedbackByTrigger: {
        chat: null,
        eveningCheck: null,
        taskMilestone: null,
      },
      consecutiveDismissals: 0,
      taskCompletionCount: 0,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse feedback cooldown state:', error);
  }

  return {
    lastFeedbackTimestamp: null,
    lastFeedbackByTrigger: {
      chat: null,
      eveningCheck: null,
      taskMilestone: null,
    },
    consecutiveDismissals: 0,
    taskCompletionCount: 0,
  };
}

// Save cooldown state to localStorage
function saveCooldownState(state: FeedbackCooldownState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save feedback cooldown state:', error);
  }
}

// Check if we can show feedback for this trigger
function canShowFeedback(
  triggerType: FeedbackTriggerType,
  state: FeedbackCooldownState,
  messageCount?: number
): boolean {
  const now = Date.now();
  
  // Check if user has dismissed too many times
  if (state.consecutiveDismissals >= feedbackConfig.maxDismissals) {
    return false;
  }

  // Check global cooldown
  if (state.lastFeedbackTimestamp) {
    const timeSinceLastFeedback = now - state.lastFeedbackTimestamp;
    if (timeSinceLastFeedback < feedbackConfig.cooldown.global) {
      return false;
    }
  }

  // Check per-trigger cooldown
  const lastTriggerTime = state.lastFeedbackByTrigger[triggerType];
  if (lastTriggerTime) {
    const timeSinceLastTrigger = now - lastTriggerTime;
    if (timeSinceLastTrigger < feedbackConfig.cooldown.perTrigger) {
      return false;
    }
  }

  // Check trigger-specific conditions
  const triggerConfigMap = {
    chat: 'afterChatSession',
    eveningCheck: 'afterEveningCheckIn',
    taskMilestone: 'taskMilestones',
  } as const;

  const configKey = triggerConfigMap[triggerType];
  const triggerConfig = feedbackConfig.triggers[configKey];

  if (!triggerConfig.enabled) {
    return false;
  }

  // For chat trigger, check minimum message count
  if (triggerType === 'chat' && triggerConfig.minMessages) {
    if (!messageCount || messageCount < triggerConfig.minMessages) {
      return false;
    }
  }

  // For task milestone trigger, check if we've hit the milestone
  if (triggerType === 'taskMilestone' && triggerConfig.every) {
    if (state.taskCompletionCount % triggerConfig.every !== 0) {
      return false;
    }
  }

  return true;
}

export function useFeedback() {
  const [cooldownState, setCooldownState] = useState<FeedbackCooldownState>(getCooldownState);

  // Sync state changes to localStorage
  useEffect(() => {
    saveCooldownState(cooldownState);
  }, [cooldownState]);

  // Attempt to trigger feedback
  const triggerFeedback = useCallback(
    (triggerType: FeedbackTriggerType, messageCount?: number): boolean => {
      const state = getCooldownState();

      if (!canShowFeedback(triggerType, state, messageCount)) {
        return false;
      }

      // Update last shown timestamp
      const now = Date.now();
      const newState: FeedbackCooldownState = {
        ...state,
        lastFeedbackTimestamp: now,
        lastFeedbackByTrigger: {
          ...state.lastFeedbackByTrigger,
          [triggerType]: now,
        },
      };

      setCooldownState(newState);
      return true;
    },
    []
  );

  // Record dismissal
  const recordDismissal = useCallback(() => {
    const state = getCooldownState();
    const newState: FeedbackCooldownState = {
      ...state,
      consecutiveDismissals: state.consecutiveDismissals + 1,
    };
    setCooldownState(newState);
  }, []);

  // Record submission (resets dismissal count)
  const recordSubmission = useCallback(() => {
    const state = getCooldownState();
    const newState: FeedbackCooldownState = {
      ...state,
      consecutiveDismissals: 0,
    };
    setCooldownState(newState);
  }, []);

  // Increment task completion count
  const incrementTaskCount = useCallback(() => {
    const state = getCooldownState();
    const newState: FeedbackCooldownState = {
      ...state,
      taskCompletionCount: state.taskCompletionCount + 1,
    };
    setCooldownState(newState);
  }, []);

  // Reset dismissals (useful if you want to give users another chance)
  const resetDismissals = useCallback(() => {
    const state = getCooldownState();
    const newState: FeedbackCooldownState = {
      ...state,
      consecutiveDismissals: 0,
    };
    setCooldownState(newState);
  }, []);

  return {
    triggerFeedback,
    recordDismissal,
    recordSubmission,
    incrementTaskCount,
    resetDismissals,
    cooldownState,
  };
}

