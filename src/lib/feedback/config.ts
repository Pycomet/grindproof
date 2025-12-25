/**
 * Feedback System Configuration
 * Easy-to-modify configuration for feedback triggers and behavior
 */

import { FeedbackConfig } from './types';

export const feedbackConfig: FeedbackConfig = {
  triggers: {
    // Trigger after AI chat sessions (when user has engaged meaningfully)
    afterChatSession: {
      enabled: true,
      minMessages: 3, // only trigger if user sent at least 3 messages
    },
    
    // Trigger after evening check-in completion
    afterEveningCheckIn: {
      enabled: true,
    },
    
    // Trigger after task completion milestones
    taskMilestones: {
      enabled: true,
      every: 10, // trigger every 10th task completion
    },
  },
  
  cooldown: {
    // Global cooldown: 3 days between any feedback prompts
    global: 3 * 24 * 60 * 60 * 1000,
    
    // Per-trigger cooldown: 7 days before showing same trigger again
    perTrigger: 7 * 24 * 60 * 60 * 1000,
  },
  
  // Stop asking after 3 consecutive dismissals
  maxDismissals: 3,
  
  // Auto-hide popup after 10 seconds of no interaction
  autoHideDelay: 10000,
};

// Helper to get config for specific trigger
export function getTriggerConfig(triggerType: keyof FeedbackConfig['triggers']) {
  return feedbackConfig.triggers[triggerType];
}

