'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import type { Database } from '@/lib/supabase/types';
import { offlineStorage } from '@/lib/offline/storage';
import { useNotifications } from '@/hooks/useNotifications';
import type { ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

// Types from database
type Task = Database['public']['Tables']['tasks']['Row'];
type Goal = Database['public']['Tables']['goals']['Row'];
type Integration = Database['public']['Tables']['integrations']['Row'];

// Transform database types to app types with Date objects
export interface AppTask extends Omit<Task, 'due_date' | 'start_time' | 'end_time' | 'created_at' | 'updated_at' | 'reminders' | 'goal_id' | 'priority' | 'recurrence_rule' | 'recurring_event_id' | 'completion_proof'> {
  dueDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSyncedWithCalendar: boolean;
  reminders: string[] | null;
  goalId: string | null;
  priority: 'high' | 'medium' | 'low';
  recurrenceRule: string | null;
  recurringEventId: string | null;
  completionProof: string | null;
}

export interface AppGoal extends Omit<Goal, 'target_date' | 'created_at' | 'updated_at'> {
  targetDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppIntegration extends Omit<Integration, 'created_at' | 'updated_at'> {
  createdAt: Date;
  updatedAt: Date;
}

interface AppState {
  user: User | null;
  tasks: AppTask[];
  goals: AppGoal[];
  integrations: AppIntegration[];
  isLoading: boolean;
  isHydrated: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  notificationsEnabled: boolean;
  notificationsSupported: boolean;
}

interface AppContextType extends AppState {
  // User methods
  setUser: (user: User | null) => void;
  
  // Task methods
  addTask: (task: AppTask) => void;
  updateTask: (id: string, updates: Partial<AppTask>) => void;
  deleteTask: (id: string) => void;
  refreshTasks: () => Promise<void>;
  
  // Goal methods
  addGoal: (goal: AppGoal) => void;
  updateGoal: (id: string, updates: Partial<AppGoal>) => void;
  deleteGoal: (id: string) => void;
  refreshGoals: () => Promise<void>;
  
  // Integration methods
  addIntegration: (integration: AppIntegration) => void;
  updateIntegration: (id: string, updates: Partial<AppIntegration>) => void;
  deleteIntegration: (id: string) => void;
  refreshIntegrations: () => Promise<void>;
  isGoogleCalendarConnected: () => boolean;
  
  // General methods
  refreshAll: () => Promise<void>;
  setSyncStatus: (status: AppState['syncStatus']) => void;
  
  // Notification methods
  enableNotifications: () => Promise<boolean>;
  clearAllNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TASKS: 'grindproof_tasks',
  GOALS: 'grindproof_goals',
  INTEGRATIONS: 'grindproof_integrations',
  USER: 'grindproof_user',
};

// Helper functions to transform database types
function transformTaskFromDb(task: any): AppTask {
  // Handle both snake_case (from DB) and camelCase (from tRPC) formats
  return {
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : (task.due_date ? new Date(task.due_date) : null),
    startTime: task.startTime ? new Date(task.startTime) : (task.start_time ? new Date(task.start_time) : null),
    endTime: task.endTime ? new Date(task.endTime) : (task.end_time ? new Date(task.end_time) : null),
    createdAt: task.createdAt ? new Date(task.createdAt) : new Date(task.created_at || task.createdAt),
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date(task.updated_at || task.updatedAt),
    isSyncedWithCalendar: task.isSyncedWithCalendar ?? task.is_synced_with_calendar ?? false,
    reminders: task.reminders ? (Array.isArray(task.reminders) ? task.reminders : null) : null,
    goalId: task.goalId ?? task.goal_id ?? null,
    priority: task.priority || 'medium',
    recurrenceRule: task.recurrenceRule ?? task.recurrence_rule ?? null,
    recurringEventId: task.recurringEventId ?? task.recurring_event_id ?? null,
    completionProof: task.completionProof ?? task.completion_proof ?? null,
  };
}

function transformGoalFromDb(goal: any): AppGoal {
  // Handle both snake_case (from DB) and camelCase (from tRPC) formats
  return {
    ...goal,
    targetDate: goal.targetDate ? new Date(goal.targetDate) : (goal.target_date ? new Date(goal.target_date) : null),
    createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(goal.created_at || goal.createdAt),
    updatedAt: goal.updatedAt ? new Date(goal.updatedAt) : new Date(goal.updated_at || goal.updatedAt),
  };
}

function transformIntegrationFromDb(integration: any): AppIntegration {
  // Handle both snake_case (from DB) and camelCase (from tRPC) formats
  return {
    ...integration,
    service_type: integration.service_type || integration.serviceType,
    user_id: integration.user_id || integration.userId,
    createdAt: integration.createdAt ? new Date(integration.createdAt) : new Date(integration.created_at || integration.createdAt),
    updatedAt: integration.updatedAt ? new Date(integration.updatedAt) : new Date(integration.updated_at || integration.updatedAt),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    tasks: [],
    goals: [],
    integrations: [],
    isLoading: true,
    isHydrated: false,
    syncStatus: 'idle',
    notificationsEnabled: false,
    notificationsSupported: false,
  });

  // Handle notification received while app is in foreground
  const handleNotificationReceived = useCallback((notification: PushNotificationSchema) => {
    console.log('📱 Notification received:', notification);
    // You can show a toast or alert here
    // For now, we'll just log it
  }, []);

  // Handle notification tapped
  const handleNotificationTapped = useCallback((action: ActionPerformed) => {
    console.log('📱 Notification tapped:', action);
    
    // Handle navigation based on notification data
    const data = action.notification.data;
    if (data?.route) {
      // Route to the appropriate page
      window.location.href = data.route as string;
    }
  }, []);

  // Initialize notifications hook
  const notifications = useNotifications({
    onNotificationReceived: handleNotificationReceived,
    onNotificationTapped: handleNotificationTapped,
  });

  // TRPC queries
  const { data: tasksData, refetch: refetchTasks } = trpc.task.getAll.useQuery(undefined, {
    enabled: !!state.user && state.isHydrated,
    refetchOnWindowFocus: false,
  });

  const { data: goalsData, refetch: refetchGoals } = trpc.goal.getAll.useQuery(undefined, {
    enabled: !!state.user && state.isHydrated,
    refetchOnWindowFocus: false,
  });

  const { data: integrationsData, refetch: refetchIntegrations } = trpc.integration.getAll.useQuery(undefined, {
    enabled: !!state.user && state.isHydrated,
    refetchOnWindowFocus: false,
  });

  // Update notification state when hook changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      notificationsEnabled: notifications.isEnabled,
      notificationsSupported: notifications.isSupported,
    }));
  }, [notifications.isEnabled, notifications.isSupported]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Try to load from localStorage first for instant UI
          const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
          const storedGoals = localStorage.getItem(STORAGE_KEYS.GOALS);
          const storedIntegrations = localStorage.getItem(STORAGE_KEYS.INTEGRATIONS);

          setState(prev => ({
            ...prev,
            user,
            tasks: storedTasks ? JSON.parse(storedTasks).map((t: any) => ({
              ...t,
              dueDate: t.dueDate ? new Date(t.dueDate) : null,
              startTime: t.startTime ? new Date(t.startTime) : null,
              endTime: t.endTime ? new Date(t.endTime) : null,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt),
            })) : [],
            goals: storedGoals ? JSON.parse(storedGoals).map((g: any) => ({
              ...g,
              targetDate: g.targetDate ? new Date(g.targetDate) : null,
              createdAt: new Date(g.createdAt),
              updatedAt: new Date(g.updatedAt),
            })) : [],
            integrations: storedIntegrations ? JSON.parse(storedIntegrations).map((i: any) => ({
              ...i,
              service_type: i.service_type || i.serviceType,
              user_id: i.user_id || i.userId,
              createdAt: new Date(i.createdAt),
              updatedAt: new Date(i.updatedAt),
            })) : [],
            isLoading: false,
            isHydrated: true,
          }));

          // Auto-request notification permissions on mobile after a short delay
          // This gives the user time to see the app first
          if (notifications.isSupported) {
            setTimeout(() => {
              notifications.requestPermission().catch(console.error);
            }, 3000);
          }
        } else {
          setState(prev => ({
            ...prev,
            user: null,
            isLoading: false,
            isHydrated: true,
          }));
        }
      } catch (error) {
        console.error('Error hydrating state:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isHydrated: true,
        }));
      }
    };

    hydrate();
  }, [notifications]);

  // Sync with server data when it arrives
  useEffect(() => {
    if (tasksData && state.isHydrated) {
      const transformedTasks = tasksData.map(transformTaskFromDb);
      // Use queueMicrotask to avoid cascading renders
      queueMicrotask(() => {
        setState(prev => ({ ...prev, tasks: transformedTasks }));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(transformedTasks));
      });
    }
  }, [tasksData, state.isHydrated]);

  useEffect(() => {
    if (goalsData && state.isHydrated) {
      const transformedGoals = goalsData.map(transformGoalFromDb);
      queueMicrotask(() => {
        setState(prev => ({ ...prev, goals: transformedGoals }));
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(transformedGoals));
      });
    }
  }, [goalsData, state.isHydrated]);

  useEffect(() => {
    if (integrationsData && state.isHydrated) {
      const transformedIntegrations = integrationsData.map(transformIntegrationFromDb);
      queueMicrotask(() => {
        setState(prev => ({ ...prev, integrations: transformedIntegrations }));
        localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(transformedIntegrations));
      });
    }
  }, [integrationsData, state.isHydrated]);

  // Methods
  const setUser = useCallback((user: User | null) => {
    setState(prev => ({ ...prev, user }));
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.GOALS);
      localStorage.removeItem(STORAGE_KEYS.INTEGRATIONS);
    }
  }, []);

  // Optimistic update methods with rollback
  const addTask = useCallback((task: AppTask) => {
    const previousTasks = state.tasks;
    
    // Optimistically update UI
    setState(prev => {
      const newTasks = [...prev.tasks, task];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
      offlineStorage.saveTasks(newTasks).catch(console.error);
      return { ...prev, tasks: newTasks };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(previousTasks));
        offlineStorage.saveTasks(previousTasks).catch(console.error);
        return { ...prev, tasks: previousTasks };
      });
    };
  }, [state.tasks]);

  const updateTask = useCallback((id: string, updates: Partial<AppTask>) => {
    const previousTasks = state.tasks;
    
    // Optimistically update UI
    setState(prev => {
      const newTasks = prev.tasks.map(task => 
        task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
      );
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
      offlineStorage.saveTasks(newTasks).catch(console.error);
      return { ...prev, tasks: newTasks };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(previousTasks));
        offlineStorage.saveTasks(previousTasks).catch(console.error);
        return { ...prev, tasks: previousTasks };
      });
    };
  }, [state.tasks]);

  const deleteTask = useCallback((id: string) => {
    const previousTasks = state.tasks;
    
    // Optimistically update UI
    setState(prev => {
      const newTasks = prev.tasks.filter(task => task.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
      offlineStorage.saveTasks(newTasks).catch(console.error);
      return { ...prev, tasks: newTasks };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(previousTasks));
        offlineStorage.saveTasks(previousTasks).catch(console.error);
        return { ...prev, tasks: previousTasks };
      });
    };
  }, [state.tasks]);

  const refreshTasks = useCallback(async () => {
    await refetchTasks();
  }, [refetchTasks]);

  const addGoal = useCallback((goal: AppGoal) => {
    const previousGoals = state.goals;
    
    // Optimistically update UI
    setState(prev => {
      const newGoals = [...prev.goals, goal];
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
      offlineStorage.saveGoals(newGoals).catch(console.error);
      return { ...prev, goals: newGoals };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(previousGoals));
        offlineStorage.saveGoals(previousGoals).catch(console.error);
        return { ...prev, goals: previousGoals };
      });
    };
  }, [state.goals]);

  const updateGoal = useCallback((id: string, updates: Partial<AppGoal>) => {
    const previousGoals = state.goals;
    
    // Optimistically update UI
    setState(prev => {
      const newGoals = prev.goals.map(goal => 
        goal.id === id ? { ...goal, ...updates, updatedAt: new Date() } : goal
      );
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
      offlineStorage.saveGoals(newGoals).catch(console.error);
      return { ...prev, goals: newGoals };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(previousGoals));
        offlineStorage.saveGoals(previousGoals).catch(console.error);
        return { ...prev, goals: previousGoals };
      });
    };
  }, [state.goals]);

  const deleteGoal = useCallback((id: string) => {
    const previousGoals = state.goals;
    
    // Optimistically update UI
    setState(prev => {
      const newGoals = prev.goals.filter(goal => goal.id !== id);
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
      offlineStorage.saveGoals(newGoals).catch(console.error);
      return { ...prev, goals: newGoals };
    });

    // Return rollback function
    return () => {
      setState(prev => {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(previousGoals));
        offlineStorage.saveGoals(previousGoals).catch(console.error);
        return { ...prev, goals: previousGoals };
      });
    };
  }, [state.goals]);

  const refreshGoals = useCallback(async () => {
    await refetchGoals();
  }, [refetchGoals]);

  const addIntegration = useCallback((integration: AppIntegration) => {
    setState(prev => {
      const newIntegrations = [...prev.integrations, integration];
      localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(newIntegrations));
      return { ...prev, integrations: newIntegrations };
    });
  }, []);

  const updateIntegration = useCallback((id: string, updates: Partial<AppIntegration>) => {
    setState(prev => {
      const newIntegrations = prev.integrations.map(integration => 
        integration.id === id ? { ...integration, ...updates, updatedAt: new Date() } : integration
      );
      localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(newIntegrations));
      return { ...prev, integrations: newIntegrations };
    });
  }, []);

  const deleteIntegration = useCallback((id: string) => {
    setState(prev => {
      const newIntegrations = prev.integrations.filter(integration => integration.id !== id);
      localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(newIntegrations));
      return { ...prev, integrations: newIntegrations };
    });
  }, []);

  const refreshIntegrations = useCallback(async () => {
    await refetchIntegrations();
  }, [refetchIntegrations]);

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      await Promise.all([refetchTasks(), refetchGoals(), refetchIntegrations()]);
      setState(prev => ({ ...prev, syncStatus: 'synced' }));
      setTimeout(() => {
        setState(prev => ({ ...prev, syncStatus: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, [refetchTasks, refetchGoals, refetchIntegrations]);

  const setSyncStatus = useCallback((status: AppState['syncStatus']) => {
    setState(prev => ({ ...prev, syncStatus: status }));
  }, []);

  const enableNotifications = useCallback(async () => {
    return await notifications.requestPermission();
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    await notifications.removeAllNotifications();
  }, [notifications]);

  const contextValue: AppContextType = {
    ...state,
    setUser,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks,
    addGoal,
    updateGoal,
    deleteGoal,
    refreshGoals,
    addIntegration,
    updateIntegration,
    deleteIntegration,
    refreshIntegrations,
    isGoogleCalendarConnected: () => {
      return state.integrations.some(
        (i) => i.service_type === 'google_calendar' && i.status === 'connected'
      );
    },
    refreshAll,
    setSyncStatus,
    enableNotifications,
    clearAllNotifications,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

