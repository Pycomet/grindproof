'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { offlineStorage, type PendingMutation } from '@/lib/offline/storage';
import { trpc } from '@/lib/trpc/client';
import { useApp } from '@/contexts/AppContext';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { refreshAll, setSyncStatus } = useApp();

  // TRPC mutations
  const createTaskMutation = trpc.task.create.useMutation();
  const updateTaskMutation = trpc.task.update.useMutation();
  const deleteTaskMutation = trpc.task.delete.useMutation();
  const createGoalMutation = trpc.goal.create.useMutation();
  const updateGoalMutation = trpc.goal.update.useMutation();
  const deleteGoalMutation = trpc.goal.delete.useMutation();

  // Process pending mutations
  const processPendingMutations = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const pendingMutations = await offlineStorage.getPendingMutations();
      setPendingCount(pendingMutations.length);

      if (pendingMutations.length === 0) {
        setIsSyncing(false);
        setSyncStatus('idle');
        return;
      }

      // Sort by timestamp to process in order
      const sortedMutations = [...pendingMutations].sort((a, b) => a.timestamp - b.timestamp);

      for (const mutation of sortedMutations) {
        try {
          await processSingleMutation(mutation);
          await offlineStorage.removePendingMutation(mutation.id);
          setPendingCount(prev => Math.max(0, prev - 1));
        } catch (error) {
          console.error('Failed to process mutation:', mutation, error);
          
          // Increment retry count
          const newRetryCount = mutation.retryCount + 1;
          
          // If retry count exceeds 5, remove the mutation
          if (newRetryCount > 5) {
            console.error('Max retries exceeded, removing mutation:', mutation);
            await offlineStorage.removePendingMutation(mutation.id);
          } else {
            await offlineStorage.updatePendingMutationRetryCount(mutation.id, newRetryCount);
          }
        }
      }

      // Refresh all data from server after syncing
      await refreshAll();
      setSyncStatus('synced');
      
      // Reset sync status after a delay
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error processing pending mutations:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshAll, setSyncStatus]);

  // Process a single mutation
  const processSingleMutation = async (mutation: PendingMutation) => {
    switch (mutation.type) {
      case 'CREATE_TASK':
        await createTaskMutation.mutateAsync(mutation.data);
        break;
      case 'UPDATE_TASK':
        await updateTaskMutation.mutateAsync(mutation.data);
        break;
      case 'DELETE_TASK':
        await deleteTaskMutation.mutateAsync({ id: mutation.data.id });
        break;
      case 'CREATE_GOAL':
        await createGoalMutation.mutateAsync(mutation.data);
        break;
      case 'UPDATE_GOAL':
        await updateGoalMutation.mutateAsync(mutation.data);
        break;
      case 'DELETE_GOAL':
        await deleteGoalMutation.mutateAsync({ id: mutation.data.id });
        break;
      default:
        console.warn('Unknown mutation type:', mutation.type);
    }
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Back online - will sync pending changes');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Gone offline - changes will be queued');
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      // Debounce sync by 1 second
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        processPendingMutations();
      }, 1000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOnline, isSyncing, processPendingMutations]);

  // Periodic check for pending mutations (every 30 seconds when online)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      const mutations = await offlineStorage.getPendingMutations();
      setPendingCount(mutations.length);
      
      if (mutations.length > 0 && !isSyncing) {
        processPendingMutations();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, isSyncing, processPendingMutations]);

  // Initial pending count
  useEffect(() => {
    offlineStorage.getPendingMutations().then(mutations => {
      setPendingCount(mutations.length);
    });
  }, []);

  // Queue a mutation when offline
  const queueMutation = useCallback(async (type: PendingMutation['type'], data: any) => {
    await offlineStorage.addPendingMutation({ type, data });
    setPendingCount(prev => prev + 1);
    console.log('📝 Queued mutation:', type, data);
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    if (isOnline) {
      await processPendingMutations();
    }
  }, [isOnline, processPendingMutations]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueMutation,
    forceSync,
  };
}


