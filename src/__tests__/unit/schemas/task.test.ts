import { describe, it, expect } from 'vitest';
import {
  taskSchema,
  createTaskSchema,
  updateTaskSchema,
  recurrencePatternSchema,
} from '@/server/trpc/routers/task';

describe('Task Schemas', () => {
  describe('recurrencePatternSchema', () => {
    it('should validate a valid daily recurrence pattern', () => {
      const pattern = {
        type: 'daily' as const,
        interval: 1,
      };

      const result = recurrencePatternSchema.safeParse(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate a valid weekly recurrence pattern', () => {
      const pattern = {
        type: 'weekly' as const,
        interval: 2,
        daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        endDate: new Date('2024-12-31'),
      };

      const result = recurrencePatternSchema.safeParse(pattern);
      expect(result.success).toBe(true);
    });

    it('should validate RRULE format', () => {
      const pattern = {
        type: 'custom' as const,
        interval: 1,
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      };

      const result = recurrencePatternSchema.safeParse(pattern);
      expect(result.success).toBe(true);
    });

    it('should reject invalid interval', () => {
      const pattern = {
        type: 'daily' as const,
        interval: 0,
      };

      const result = recurrencePatternSchema.safeParse(pattern);
      expect(result.success).toBe(false);
    });

    it('should reject invalid days of week', () => {
      const pattern = {
        type: 'weekly' as const,
        interval: 1,
        daysOfWeek: [7, 8], // Invalid day numbers
      };

      const result = recurrencePatternSchema.safeParse(pattern);
      expect(result.success).toBe(false);
    });
  });

  describe('taskSchema', () => {
    it('should validate a complete task', () => {
      const task = {
        id: '123',
        userId: '456',
        goalId: '789',
        title: 'Complete project',
        description: 'Finish the implementation',
        dueDate: new Date('2024-12-31'),
        startTime: null,
        endTime: null,
        reminders: ['15min', '1hour'],
        status: 'pending' as const,
        completionProof: null,
        tags: ['work', 'urgent'],
        googleCalendarEventId: 'event123',
        isSyncedWithCalendar: true,
        recurrencePattern: {
          type: 'daily' as const,
          interval: 1,
        },
        parentTaskId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = taskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it('should validate task with minimal fields', () => {
      const task = {
        id: '123',
        userId: '456',
        goalId: null,
        title: 'Simple task',
        description: null,
        dueDate: null,
        startTime: null,
        endTime: null,
        reminders: null,
        status: 'pending' as const,
        completionProof: null,
        tags: null,
        googleCalendarEventId: null,
        isSyncedWithCalendar: false,
        recurrencePattern: null,
        parentTaskId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = taskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const task = {
        id: '123',
        userId: '456',
        goalId: null,
        title: 'Test task',
        description: null,
        dueDate: null,
        status: 'invalid' as any,
        completionProof: null,
        tags: null,
        googleCalendarEventId: null,
        isSyncedWithCalendar: false,
        recurrencePattern: null,
        parentTaskId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = taskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });
  });

  describe('createTaskSchema', () => {
    it('should validate valid task creation data', () => {
      const data = {
        title: 'New task',
        description: 'Task description',
        dueDate: new Date('2024-12-31'),
        goalId: '123',
        tags: ['work', 'learning'],
        recurrencePattern: {
          type: 'daily' as const,
          interval: 1,
        },
        syncWithCalendar: true,
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate minimal task creation data', () => {
      const data = {
        title: 'Simple task',
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.syncWithCalendar).toBe(true); // Default value
      }
    });

    it('should reject empty title', () => {
      const data = {
        title: '',
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing title', () => {
      const data = {};

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('should validate complete update data', () => {
      const data = {
        id: '123',
        title: 'Updated task',
        description: 'New description',
        dueDate: new Date('2024-12-31'),
        goalId: '456',
        tags: ['updated'],
        status: 'completed' as const,
        recurrencePattern: {
          type: 'weekly' as const,
          interval: 1,
          daysOfWeek: [1, 3, 5],
        },
      };

      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate partial update (only ID and title)', () => {
      const data = {
        id: '123',
        title: 'Updated title',
      };

      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject update without ID', () => {
      const data = {
        title: 'Updated task',
      };

      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty title in update', () => {
      const data = {
        id: '123',
        title: '',
      };

      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow clearing optional fields', () => {
      const data = {
        id: '123',
        description: undefined,
        dueDate: undefined,
        goalId: undefined,
      };

      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

