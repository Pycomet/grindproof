/**
 * Gemini Function Calling Tool Definitions
 *
 * This file defines all the function schemas that Gemini can call.
 * Using native function calling ensures structured, validated outputs
 * instead of relying on regex extraction from unstructured text.
 */

import type { FunctionDeclaration } from '@google/generative-ai';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateTaskParams {
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface UpdateTaskParams {
  searchQuery: string; // Keywords to find the task
  updates: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'pending' | 'completed' | 'skipped';
  };
}

export interface DeleteTaskParams {
  searchQuery: string; // Keywords to find the task to delete
}

export interface SearchTasksParams {
  query: string;
  status?: 'pending' | 'completed' | 'skipped' | 'all';
  dateFilter?: 'today' | 'tomorrow' | 'this_week' | 'overdue';
}

export interface SearchGoalsParams {
  query: string;
  status?: 'active' | 'completed' | 'archived';
}

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================

export const createTaskFunction: FunctionDeclaration = {
  name: 'create_task',
  description: `Create a new task for the user with specified details.

Use this when the user wants to:
- Add a new task or todo item
- Create a reminder
- Schedule something to do
- Add something to their task list

Examples of when to use:
- "add task to workout tomorrow"
- "remind me to call mom next monday"
- "create task: finish report by friday"
- "new task workout at 6am"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {
      title: {
        type: 'STRING' as const,
        description: 'Clear, specific task title (required). Should be concise and actionable.',
      },
      description: {
        type: 'STRING' as const,
        description: 'Optional detailed description of the task. Include any additional context or notes.',
        nullable: true,
      },
      dueDate: {
        type: 'STRING' as const,
        description: `Due date in YYYY-MM-DD format. Parse relative dates:
- "tomorrow" = ${getTomorrowDate()}
- "today" = ${getTodayDate()}
- "next monday" = calculate next Monday's date
- If no date mentioned, leave null`,
        nullable: true,
      },
      startTime: {
        type: 'STRING' as const,
        description: 'Start time in HH:MM format (24-hour). Example: "06:00" for 6am, "14:30" for 2:30pm. Only include if specifically mentioned.',
        nullable: true,
      },
      endTime: {
        type: 'STRING' as const,
        description: 'End time in HH:MM format (24-hour). Only include if specifically mentioned.',
        nullable: true,
      },
      priority: {
        type: 'STRING' as const,
        description: `Task priority level. Default to "medium" unless specified or implied.
- "high": urgent, important, asap, critical, deadline
- "medium": normal tasks (default)
- "low": nice-to-have, someday, maybe`,
        enum: ['high', 'medium', 'low'],
      },
      tags: {
        type: 'ARRAY' as const,
        description: 'Optional tags for categorization. Extract from context (e.g., "workout", "work", "personal")',
        items: {
          type: 'STRING' as const,
        },
        nullable: true,
      },
    },
    required: ['title', 'priority'],
  },
};

export const updateTaskFunction: FunctionDeclaration = {
  name: 'update_task',
  description: `Update an existing task by searching for it and applying changes.

Use this when the user wants to:
- Modify an existing task
- Change task details (title, date, priority, status)
- Reschedule a task
- Mark a task as completed/skipped

Examples of when to use:
- "change workout to tomorrow"
- "update gym task to high priority"
- "reschedule meeting to next week"
- "mark the report task as completed"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {
      searchQuery: {
        type: 'STRING' as const,
        description: `Keywords to find the task. Extract the task identifier from user message.

Examples:
- "change workout to tomorrow" → searchQuery: "workout"
- "update my gym task" → searchQuery: "gym"
- "reschedule the meeting" → searchQuery: "meeting"`,
      },
      updates: {
        type: 'OBJECT' as const,
        description: 'Object containing fields to update. Only include fields that should be changed.',
        properties: {
          title: {
            type: 'STRING' as const,
            description: 'New task title',
            nullable: true,
          },
          description: {
            type: 'STRING' as const,
            description: 'New task description',
            nullable: true,
          },
          dueDate: {
            type: 'STRING' as const,
            description: `New due date in YYYY-MM-DD format. Parse relative dates:
- "tomorrow" = ${getTomorrowDate()}
- "today" = ${getTodayDate()}
- "next week" = ${getNextWeekDate()}`,
            nullable: true,
          },
          priority: {
            type: 'STRING' as const,
            description: 'New priority level',
            enum: ['high', 'medium', 'low'],
            nullable: true,
          },
          status: {
            type: 'STRING' as const,
            description: 'New task status',
            enum: ['pending', 'completed', 'skipped'],
            nullable: true,
          },
        },
      },
    },
    required: ['searchQuery', 'updates'],
  },
};

export const deleteTaskFunction: FunctionDeclaration = {
  name: 'delete_task',
  description: `Delete an existing task by searching for it.

Use this when the user wants to:
- Remove a task
- Cancel a task
- Delete a todo item

Examples:
- "delete workout task"
- "remove the meeting"
- "cancel gym task"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {
      searchQuery: {
        type: 'STRING' as const,
        description: `Keywords to find the task to delete.

Examples:
- "delete workout task" → searchQuery: "workout"
- "remove meeting" → searchQuery: "meeting"`,
      },
    },
    required: ['searchQuery'],
  },
};

export const searchTasksFunction: FunctionDeclaration = {
  name: 'search_tasks',
  description: `Search for tasks by keywords, status, or date filters.

Use this when the user wants to:
- Find specific tasks
- See tasks for a time period
- View tasks by status
- Check their schedule

Examples:
- "show me my tasks today"
- "what do I have tomorrow"
- "find workout tasks"
- "show overdue tasks"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {
      query: {
        type: 'STRING' as const,
        description: 'Search keywords. Can be empty string for broad searches.',
      },
      status: {
        type: 'STRING' as const,
        description: 'Filter by task status',
        enum: ['pending', 'completed', 'skipped', 'all'],
        nullable: true,
      },
      dateFilter: {
        type: 'STRING' as const,
        description: 'Filter by date range',
        enum: ['today', 'tomorrow', 'this_week', 'overdue'],
        nullable: true,
      },
    },
    required: ['query'],
  },
};

export const searchGoalsFunction: FunctionDeclaration = {
  name: 'search_goals',
  description: `Search for goals by keywords or status.

Use this when the user wants to:
- Find specific goals
- View active goals
- Check goal progress

Examples:
- "show my active goals"
- "find fitness goals"
- "what are my goals"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {
      query: {
        type: 'STRING' as const,
        description: 'Search keywords for finding goals',
      },
      status: {
        type: 'STRING' as const,
        description: 'Filter by goal status',
        enum: ['active', 'completed', 'archived'],
        nullable: true,
      },
    },
    required: ['query'],
  },
};

export const generateRoastFunction: FunctionDeclaration = {
  name: 'generate_roast',
  description: `Generate a weekly accountability report with insights and recommendations.

Use this when the user wants to:
- See their weekly report
- Get roasted on their performance
- Review their progress

Examples:
- "roast me"
- "generate roast"
- "how did I do this week"
- "weekly report"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {},
  },
};

export const analyzePatternsFunction: FunctionDeclaration = {
  name: 'analyze_patterns',
  description: `Analyze user behavioral patterns from their task and goal data.

Use this when the user wants to:
- See their behavioral patterns
- Understand their habits
- Get insights on their work style

Examples:
- "analyze my patterns"
- "what patterns do you see"
- "show my behavioral patterns"`,

  parameters: {
    type: 'OBJECT' as const,
    properties: {},
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getNextWeekDate(): string {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split('T')[0];
}

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const ALL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  createTaskFunction,
  updateTaskFunction,
  deleteTaskFunction,
  searchTasksFunction,
  searchGoalsFunction,
  generateRoastFunction,
  analyzePatternsFunction,
];

export const GRINDPROOF_TOOLS = [
  {
    functionDeclarations: ALL_FUNCTION_DECLARATIONS,
  },
];
