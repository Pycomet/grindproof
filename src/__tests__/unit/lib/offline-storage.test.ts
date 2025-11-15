import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineStorage } from '@/lib/offline/storage';
import type { AppTask, AppGoal, AppIntegration } from '@/contexts/AppContext';

// Mock IndexedDB
const mockIDB = {
  databases: new Map<string, any>(),
};

// Simple IndexedDB mock
global.indexedDB = {
  open: vi.fn((name: string, version: number) => {
    const request = {
      result: null as any,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    };

    setTimeout(() => {
      if (!mockIDB.databases.has(name)) {
        // Trigger upgrade
        const db = {
          objectStoreNames: {
            contains: (storeName: string) => false,
          },
          createObjectStore: vi.fn((storeName: string, options: any) => {
            return {
              createIndex: vi.fn(),
            };
          }),
          transaction: vi.fn(),
        };
        
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: { result: db } } as any);
        }

        mockIDB.databases.set(name, {
          stores: new Map(),
        });
      }

      const dbData = mockIDB.databases.get(name);
      request.result = {
        transaction: (storeNames: string[], mode: string) => {
          const tx = {
            objectStore: (storeName: string) => {
              if (!dbData.stores.has(storeName)) {
                dbData.stores.set(storeName, new Map());
              }
              const store = dbData.stores.get(storeName);

              return {
                getAll: () => {
                  const req = { result: Array.from(store.values()), onsuccess: null as any, onerror: null as any };
                  setTimeout(() => req.onsuccess?.(), 0);
                  return req;
                },
                get: (id: string) => {
                  const req = { result: store.get(id), onsuccess: null as any, onerror: null as any };
                  setTimeout(() => req.onsuccess?.(), 0);
                  return req;
                },
                put: (value: any) => {
                  const req = { onsuccess: null as any, onerror: null as any };
                  store.set(value.id, value);
                  setTimeout(() => req.onsuccess?.(), 0);
                  return req;
                },
                delete: (id: string) => {
                  const req = { onsuccess: null as any, onerror: null as any };
                  store.delete(id);
                  setTimeout(() => req.onsuccess?.(), 0);
                  return req;
                },
                clear: () => {
                  const req = { onsuccess: null as any, onerror: null as any };
                  store.clear();
                  setTimeout(() => req.onsuccess?.(), 0);
                  return req;
                },
              };
            },
            oncomplete: null as any,
            onerror: null as any,
          };
          setTimeout(() => tx.oncomplete?.(), 0);
          return tx;
        },
      };

      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }),
} as any;

describe('Offline Storage', () => {
  beforeEach(async () => {
    mockIDB.databases.clear();
    await offlineStorage.init();
  });

  afterEach(async () => {
    await offlineStorage.clearAll();
  });

  describe('Tasks Operations', () => {
    it('should save a task', async () => {
      const task: AppTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'pending',
        dueDate: new Date(),
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      await offlineStorage.saveTask(task);
      const retrieved = await offlineStorage.getTask('task-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('task-1');
      expect(retrieved?.title).toBe('Test Task');
    });

    it('should save multiple tasks', async () => {
      const tasks: AppTask[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'pending',
          dueDate: null,
          startTime: null,
          endTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSyncedWithCalendar: false,
          reminders: null,
          goalId: null,
          goal_id: null,
        } as any,
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'completed',
          dueDate: null,
          startTime: null,
          endTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSyncedWithCalendar: false,
          reminders: null,
          goalId: null,
          goal_id: null,
        } as any,
      ];

      await offlineStorage.saveTasks(tasks);
      const retrieved = await offlineStorage.getTasks();

      expect(retrieved.length).toBe(2);
      expect(retrieved).toContainEqual(expect.objectContaining({ id: 'task-1' }));
      expect(retrieved).toContainEqual(expect.objectContaining({ id: 'task-2' }));
    });

    it('should get all tasks', async () => {
      const tasks: AppTask[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'pending',
          dueDate: null,
          startTime: null,
          endTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSyncedWithCalendar: false,
          reminders: null,
          goalId: null,
          goal_id: null,
        } as any,
      ];

      await offlineStorage.saveTasks(tasks);
      const retrieved = await offlineStorage.getTasks();

      expect(retrieved).toHaveLength(1);
    });

    it('should delete a task', async () => {
      const task: AppTask = {
        id: 'task-to-delete',
        title: 'Delete Me',
        status: 'pending',
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      await offlineStorage.saveTask(task);
      await offlineStorage.deleteTask('task-to-delete');
      const retrieved = await offlineStorage.getTask('task-to-delete');

      expect(retrieved).toBeNull();
    });

    it('should clear all tasks', async () => {
      const tasks: AppTask[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'pending',
          dueDate: null,
          startTime: null,
          endTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSyncedWithCalendar: false,
          reminders: null,
          goalId: null,
          goal_id: null,
        } as any,
      ];

      await offlineStorage.saveTasks(tasks);
      await offlineStorage.clearTasks();
      const retrieved = await offlineStorage.getTasks();

      expect(retrieved).toHaveLength(0);
    });
  });

  describe('Goals Operations', () => {
    it('should save and retrieve a goal', async () => {
      const goal: AppGoal = {
        id: 'goal-1',
        title: 'Test Goal',
        status: 'active',
        priority: 'high',
        targetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      await offlineStorage.saveGoal(goal);
      const retrieved = await offlineStorage.getGoal('goal-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('goal-1');
      expect(retrieved?.title).toBe('Test Goal');
    });

    it('should save multiple goals', async () => {
      const goals: AppGoal[] = [
        {
          id: 'goal-1',
          title: 'Goal 1',
          status: 'active',
          priority: 'high',
          targetDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: 'goal-2',
          title: 'Goal 2',
          status: 'completed',
          priority: 'medium',
          targetDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      await offlineStorage.saveGoals(goals);
      const retrieved = await offlineStorage.getGoals();

      expect(retrieved.length).toBe(2);
    });
  });

  describe('Pending Mutations Queue', () => {
    it('should add a pending mutation', async () => {
      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'New Task' },
      });

      const mutations = await offlineStorage.getPendingMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe('CREATE_TASK');
      expect(mutations[0].retryCount).toBe(0);
    });

    it('should generate unique IDs for pending mutations', async () => {
      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task 1' },
      });

      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task 2' },
      });

      const mutations = await offlineStorage.getPendingMutations();
      expect(mutations).toHaveLength(2);
      expect(mutations[0].id).not.toBe(mutations[1].id);
    });

    it('should remove a pending mutation', async () => {
      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task' },
      });

      const mutations = await offlineStorage.getPendingMutations();
      const mutationId = mutations[0].id;

      await offlineStorage.removePendingMutation(mutationId);
      const remaining = await offlineStorage.getPendingMutations();

      expect(remaining).toHaveLength(0);
    });

    it('should update retry count for pending mutation', async () => {
      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task' },
      });

      const mutations = await offlineStorage.getPendingMutations();
      const mutationId = mutations[0].id;

      await offlineStorage.updatePendingMutationRetryCount(mutationId, 3);
      const updated = await offlineStorage.getPendingMutations();

      expect(updated[0].retryCount).toBe(3);
    });

    it('should clear all pending mutations', async () => {
      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task 1' },
      });

      await offlineStorage.addPendingMutation({
        type: 'UPDATE_TASK',
        data: { id: 'task-1', title: 'Updated' },
      });

      await offlineStorage.clearPendingMutations();
      const mutations = await offlineStorage.getPendingMutations();

      expect(mutations).toHaveLength(0);
    });
  });

  describe('Clear All Data', () => {
    it('should clear all data from all stores', async () => {
      // Add data to all stores
      await offlineStorage.saveTask({
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any);

      await offlineStorage.saveGoal({
        id: 'goal-1',
        title: 'Goal',
        status: 'active',
        priority: 'high',
        targetDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await offlineStorage.addPendingMutation({
        type: 'CREATE_TASK',
        data: { title: 'Task' },
      });

      // Clear all
      await offlineStorage.clearAll();

      // Verify all stores are empty
      const tasks = await offlineStorage.getTasks();
      const goals = await offlineStorage.getGoals();
      const mutations = await offlineStorage.getPendingMutations();

      expect(tasks).toHaveLength(0);
      expect(goals).toHaveLength(0);
      expect(mutations).toHaveLength(0);
    });
  });
});

