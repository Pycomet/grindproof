import { describe, it, expect } from 'vitest';
import {
  parseTasksFromAIResponse,
  validateTask,
  type ParsedTask,
} from '@/lib/utils/task-parser';

describe('Task Parser', () => {
  describe('parseTasksFromAIResponse', () => {
    it('should parse bullet point tasks', () => {
      const response = `
        Here are your tasks for today:
        • Work on AI feature
        • Go to the gym
        • Read for 30 minutes
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Work on AI feature');
      expect(tasks[1].title).toBe('Go to the gym');
      expect(tasks[2].title).toBe('Read for 30 minutes');
    });

    it('should parse numbered tasks', () => {
      const response = `
        1. Work on the dashboard
        2. Review pull requests
        3. Update documentation
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Work on the dashboard');
      expect(tasks[1].title).toBe('Review pull requests');
      expect(tasks[2].title).toBe('Update documentation');
    });

    it('should extract time information', () => {
      const response = `
        • Meeting at 10am
        • Lunch at 12:30pm
        • Gym session at 6pm
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Meeting');
      expect(tasks[0].startTime).toBe('10:00');
      expect(tasks[1].title).toBe('Lunch');
      expect(tasks[1].startTime).toBe('12:30');
      expect(tasks[2].title).toBe('Gym session');
      expect(tasks[2].startTime).toBe('18:00');
    });

    it('should extract duration and calculate end time', () => {
      const response = `
        • Work on feature for 2 hours at 10am
        • Meeting for 30 minutes at 2pm
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Work on feature');
      expect(tasks[0].startTime).toBe('10:00');
      expect(tasks[0].estimatedDuration).toBe(120);
      expect(tasks[0].endTime).toBe('12:00');

      expect(tasks[1].title).toBe('Meeting');
      expect(tasks[1].startTime).toBe('14:00');
      expect(tasks[1].estimatedDuration).toBe(30);
      expect(tasks[1].endTime).toBe('14:30');
    });

    it('should extract priority', () => {
      const response = `
        • Fix critical bug (high priority)
        • Code review (medium priority)
        • Update docs (low priority)
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Fix critical bug');
      expect(tasks[0].priority).toBe('high');
      expect(tasks[1].title).toBe('Code review');
      expect(tasks[1].priority).toBe('medium');
      expect(tasks[2].title).toBe('Update docs');
      expect(tasks[2].priority).toBe('low');
    });

    it('should handle mixed formats', () => {
      const response = `
        Based on your priorities, here's what I suggest:

        1. Work on AI feature for 2 hours at 10am (high priority)
        • Go to the gym at 6pm
        - Read for 30 minutes before bed

        Let me know if you need any adjustments!
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Work on AI feature');
      expect(tasks[0].startTime).toBe('10:00');
      expect(tasks[0].estimatedDuration).toBe(120);
      expect(tasks[0].priority).toBe('high');
    });

    it('should skip headers and explanatory text', () => {
      const response = `
        Here's your plan for the day:

        # Morning Tasks
        • Morning workout at 7am

        # Afternoon Tasks
        • Team meeting at 2pm

        I've organized these by time of day.
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Morning workout');
      expect(tasks[1].title).toBe('Team meeting');
    });

    it('should skip very long lines (paragraphs)', () => {
      const response = `
        • Complete task
        This is a very long explanation about why this task is important and what you should do. It goes on and on for over 200 characters which makes it clearly not a task but rather a paragraph of explanatory text that should be ignored.
        • Another task
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Complete task');
      expect(tasks[1].title).toBe('Another task');
    });

    it('should return empty array for no tasks', () => {
      const response = `
        I understand you want to plan your day.
        Could you please tell me more about your priorities?
      `;

      const tasks = parseTasksFromAIResponse(response);

      expect(tasks).toHaveLength(0);
    });

    it('should handle empty response', () => {
      const tasks = parseTasksFromAIResponse('');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('validateTask', () => {
    it('should validate a valid task', () => {
      const task: ParsedTask = {
        title: 'Valid task',
        priority: 'medium',
      };

      expect(validateTask(task)).toBe(true);
    });

    it('should reject task with short title', () => {
      const task: ParsedTask = {
        title: 'ab',
        priority: 'medium',
      };

      expect(validateTask(task)).toBe(false);
    });

    it('should reject task with very long title', () => {
      const task: ParsedTask = {
        title: 'a'.repeat(201),
        priority: 'medium',
      };

      expect(validateTask(task)).toBe(false);
    });

    it('should reject task with invalid time format', () => {
      const task: ParsedTask = {
        title: 'Task',
        startTime: 'invalid',
        priority: 'medium',
      };

      expect(validateTask(task)).toBe(false);
    });

    it('should accept task with valid time format', () => {
      const task: ParsedTask = {
        title: 'Task',
        startTime: '14:30',
        endTime: '15:00',
        priority: 'medium',
      };

      expect(validateTask(task)).toBe(true);
    });
  });
});

