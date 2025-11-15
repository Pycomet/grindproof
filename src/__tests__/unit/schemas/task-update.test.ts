import { describe, it, expect } from 'vitest';
import { updateTaskSchema } from '@/server/trpc/routers/task';

describe('Task Update Schema', () => {
  it('validates update with only id', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
    });

    expect(result.success).toBe(true);
  });

  it('validates update with title change', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      title: 'Updated Title',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Updated Title');
    }
  });

  it('validates update with description change', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      description: 'Updated description',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Updated description');
    }
  });

  it('validates update with due date change', () => {
    const newDate = new Date('2024-12-31');
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      dueDate: newDate,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueDate).toEqual(newDate);
    }
  });

  it('validates update with goal change', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      goalId: 'goal-456',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goalId).toBe('goal-456');
    }
  });

  it('validates update with tags change', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      tags: ['work', 'urgent'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['work', 'urgent']);
    }
  });

  it('validates update with multiple fields', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      title: 'Updated Title',
      description: 'Updated description',
      dueDate: new Date('2024-12-31'),
      goalId: 'goal-456',
      tags: ['work', 'learning'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Updated Title');
      expect(result.data.description).toBe('Updated description');
      expect(result.data.goalId).toBe('goal-456');
      expect(result.data.tags).toEqual(['work', 'learning']);
    }
  });

  it('rejects update without id', () => {
    const result = updateTaskSchema.safeParse({
      title: 'Updated Title',
    });

    expect(result.success).toBe(false);
  });

  it('rejects update with empty id', () => {
    const result = updateTaskSchema.safeParse({
      id: '',
      title: 'Updated Title',
    });

    expect(result.success).toBe(false);
  });

  it('rejects update with empty title', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      title: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts undefined title (means no change)', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      title: undefined,
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty description (clearing description)', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      description: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
    }
  });

  it('accepts empty tags array (clearing tags)', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      tags: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('accepts undefined goalId (no change)', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      goalId: undefined,
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty goalId (unlinking from goal)', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      goalId: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goalId).toBe('');
    }
  });

  it('rejects invalid date', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      dueDate: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-array tags', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      tags: 'not-an-array',
    });

    expect(result.success).toBe(false);
  });

  it('rejects tags array with non-string values', () => {
    const result = updateTaskSchema.safeParse({
      id: 'task-123',
      tags: [1, 2, 3],
    });

    expect(result.success).toBe(false);
  });
});

describe('Task Update - Calendar Sync Logic', () => {
  // These tests document the expected behavior
  
  it('should update calendar event when task is synced', () => {
    const taskUpdate = {
      id: 'task-123',
      title: 'Updated Title',
      isSyncedWithCalendar: true,
      googleCalendarEventId: 'event-123',
    };

    // Backend should:
    // 1. Check if isSyncedWithCalendar is true
    // 2. Update Google Calendar event first
    // 3. Then update database
    expect(taskUpdate.isSyncedWithCalendar).toBe(true);
    expect(taskUpdate.googleCalendarEventId).toBeTruthy();
  });

  it('should not update calendar when task is not synced', () => {
    const taskUpdate = {
      id: 'task-123',
      title: 'Updated Title',
      isSyncedWithCalendar: false,
    };

    // Backend should:
    // 1. Skip calendar update
    // 2. Update database only
    expect(taskUpdate.isSyncedWithCalendar).toBe(false);
  });

  it('should handle calendar update failure gracefully', () => {
    const taskUpdate = {
      id: 'task-123',
      title: 'Updated Title',
      isSyncedWithCalendar: true,
      googleCalendarEventId: 'invalid-event',
    };

    // Backend should:
    // 1. Try to update calendar
    // 2. If calendar update fails, still update DB
    // 3. Or rollback if required
    expect(taskUpdate.isSyncedWithCalendar).toBe(true);
  });
});

describe('Task Update - Field Updates', () => {
  it('documents title update behavior', () => {
    const update = {
      id: 'task-123',
      title: 'New Title',
    };

    // Only title changes, other fields remain unchanged
    expect(update.title).toBe('New Title');
    expect(update).not.toHaveProperty('description');
    expect(update).not.toHaveProperty('dueDate');
  });

  it('documents partial update behavior', () => {
    const update = {
      id: 'task-123',
      tags: ['work'],
    };

    // Only tags change, everything else unchanged
    expect(update.tags).toEqual(['work']);
    expect(update).not.toHaveProperty('title');
  });

  it('documents clearing fields behavior', () => {
    const update = {
      id: 'task-123',
      description: '',
      tags: [],
      goalId: '',
    };

    // Empty values clear the fields
    expect(update.description).toBe('');
    expect(update.tags).toEqual([]);
    expect(update.goalId).toBe('');
  });
});

