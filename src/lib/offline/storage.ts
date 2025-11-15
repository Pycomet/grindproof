import type { AppTask, AppGoal, AppIntegration } from '@/contexts/AppContext';

// IndexedDB database name and version
const DB_NAME = 'grindproof_offline';
const DB_VERSION = 1;

// Object store names
const STORES = {
  TASKS: 'tasks',
  GOALS: 'goals',
  INTEGRATIONS: 'integrations',
  PENDING_MUTATIONS: 'pending_mutations',
};

// Mutation types for the queue
export type MutationType = 
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'CREATE_GOAL'
  | 'UPDATE_GOAL'
  | 'DELETE_GOAL'
  | 'CREATE_INTEGRATION'
  | 'UPDATE_INTEGRATION'
  | 'DELETE_INTEGRATION';

export interface PendingMutation {
  id: string;
  type: MutationType;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.GOALS)) {
          db.createObjectStore(STORES.GOALS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.INTEGRATIONS)) {
          db.createObjectStore(STORES.INTEGRATIONS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_MUTATIONS)) {
          const mutationStore = db.createObjectStore(STORES.PENDING_MUTATIONS, { keyPath: 'id' });
          mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Generic get all items from a store
  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic get single item from a store
  private async getFromStore<T>(storeName: string, id: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic put item in store
  private async putInStore<T>(storeName: string, item: T): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Generic delete item from store
  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Generic clear store
  private async clearStore(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Tasks operations
  async getTasks(): Promise<AppTask[]> {
    return this.getAllFromStore<AppTask>(STORES.TASKS);
  }

  async getTask(id: string): Promise<AppTask | null> {
    return this.getFromStore<AppTask>(STORES.TASKS, id);
  }

  async saveTask(task: AppTask): Promise<void> {
    return this.putInStore(STORES.TASKS, task);
  }

  async saveTasks(tasks: AppTask[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.TASKS], 'readwrite');
    const store = transaction.objectStore(STORES.TASKS);

    for (const task of tasks) {
      store.put(task);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.deleteFromStore(STORES.TASKS, id);
  }

  async clearTasks(): Promise<void> {
    return this.clearStore(STORES.TASKS);
  }

  // Goals operations
  async getGoals(): Promise<AppGoal[]> {
    return this.getAllFromStore<AppGoal>(STORES.GOALS);
  }

  async getGoal(id: string): Promise<AppGoal | null> {
    return this.getFromStore<AppGoal>(STORES.GOALS, id);
  }

  async saveGoal(goal: AppGoal): Promise<void> {
    return this.putInStore(STORES.GOALS, goal);
  }

  async saveGoals(goals: AppGoal[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.GOALS], 'readwrite');
    const store = transaction.objectStore(STORES.GOALS);

    for (const goal of goals) {
      store.put(goal);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteGoal(id: string): Promise<void> {
    return this.deleteFromStore(STORES.GOALS, id);
  }

  async clearGoals(): Promise<void> {
    return this.clearStore(STORES.GOALS);
  }

  // Integrations operations
  async getIntegrations(): Promise<AppIntegration[]> {
    return this.getAllFromStore<AppIntegration>(STORES.INTEGRATIONS);
  }

  async getIntegration(id: string): Promise<AppIntegration | null> {
    return this.getFromStore<AppIntegration>(STORES.INTEGRATIONS, id);
  }

  async saveIntegration(integration: AppIntegration): Promise<void> {
    return this.putInStore(STORES.INTEGRATIONS, integration);
  }

  async saveIntegrations(integrations: AppIntegration[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.INTEGRATIONS], 'readwrite');
    const store = transaction.objectStore(STORES.INTEGRATIONS);

    for (const integration of integrations) {
      store.put(integration);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteIntegration(id: string): Promise<void> {
    return this.deleteFromStore(STORES.INTEGRATIONS, id);
  }

  async clearIntegrations(): Promise<void> {
    return this.clearStore(STORES.INTEGRATIONS);
  }

  // Pending mutations queue operations
  async addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const fullMutation: PendingMutation = {
      id: `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...mutation,
    };

    return this.putInStore(STORES.PENDING_MUTATIONS, fullMutation);
  }

  async getPendingMutations(): Promise<PendingMutation[]> {
    return this.getAllFromStore<PendingMutation>(STORES.PENDING_MUTATIONS);
  }

  async removePendingMutation(id: string): Promise<void> {
    return this.deleteFromStore(STORES.PENDING_MUTATIONS, id);
  }

  async updatePendingMutationRetryCount(id: string, retryCount: number): Promise<void> {
    const mutation = await this.getFromStore<PendingMutation>(STORES.PENDING_MUTATIONS, id);
    if (mutation) {
      mutation.retryCount = retryCount;
      await this.putInStore(STORES.PENDING_MUTATIONS, mutation);
    }
  }

  async clearPendingMutations(): Promise<void> {
    return this.clearStore(STORES.PENDING_MUTATIONS);
  }

  // Clear all data
  async clearAll(): Promise<void> {
    await Promise.all([
      this.clearTasks(),
      this.clearGoals(),
      this.clearIntegrations(),
      this.clearPendingMutations(),
    ]);
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();


