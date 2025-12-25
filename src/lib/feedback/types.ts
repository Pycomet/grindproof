/**
 * Feedback System Types
 * Type definitions for the user feedback collection system
 */

export type FeedbackTriggerType = 'chat' | 'eveningCheck' | 'taskMilestone';

export type FeedbackType = 'star' | 'emoji' | 'thumbs';

export interface FeedbackData {
  triggerType: FeedbackTriggerType;
  feedbackType: FeedbackType;
  rating?: number; // 1-5 for star ratings
  emoji?: string; // emoji character
  thumb?: 'up' | 'down';
  comment?: string;
}

export interface FeedbackState {
  isOpen: boolean;
  triggerType: FeedbackTriggerType | null;
}

export interface FeedbackTriggerConfig {
  enabled: boolean;
  minMessages?: number; // for chat trigger
  every?: number; // for milestone trigger
}

export interface FeedbackCooldownConfig {
  global: number; // milliseconds between any prompts
  perTrigger: number; // milliseconds between same trigger type
}

export interface FeedbackConfig {
  triggers: {
    afterChatSession: FeedbackTriggerConfig;
    afterEveningCheckIn: FeedbackTriggerConfig;
    taskMilestones: FeedbackTriggerConfig;
  };
  cooldown: FeedbackCooldownConfig;
  maxDismissals: number;
  autoHideDelay: number; // milliseconds before auto-hide
}

export interface FeedbackCooldownState {
  lastFeedbackTimestamp: number | null;
  lastFeedbackByTrigger: Record<FeedbackTriggerType, number | null>;
  consecutiveDismissals: number;
  taskCompletionCount: number;
}

