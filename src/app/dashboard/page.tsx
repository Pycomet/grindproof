/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileSwipeView } from '@/components/MobileSwipeView';
import { Logo } from '@/components/Logo';
import { trpc } from '@/lib/trpc/client';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CreateTaskDialog, EditTaskDialog, CompleteTaskDialog, RescheduleTaskDialog, RecurringTaskEditDialog } from '@/components/TaskDialogs';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { TaskListSkeleton, GoalListSkeleton } from '@/components/LoadingSkeletons';
import { ChatInterface } from '@/components/ChatInterface';

type ViewMode = 'chat' | 'today' | 'goals' | 'evening' | 'weekly' | 'integrations';

export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('chat');
  const [isFabTaskDialogOpen, setIsFabTaskDialogOpen] = useState(false);

  // Use AppContext instead of individual queries
  const { user, goals, setUser, refreshTasks, refreshIntegrations, isGoogleCalendarConnected } = useApp();
  const { isOnline, pendingCount } = useOfflineSync();
  
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setIsFabTaskDialogOpen(false);
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [setUser]);

  // Check if we just came back from OAuth and refresh integrations
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('integration') === 'success') {
      // Small delay to ensure database is updated
      setTimeout(async () => {
        await refreshIntegrations();
      }, 500);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshIntegrations]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  const handleCreateTaskFromFab = (data: any) => {
    createTaskMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      reminders: data.reminders && data.reminders.length > 0 ? data.reminders : undefined,
      goalId: data.goalId || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
      syncWithCalendar: data.syncWithCalendar,
      recurrenceRule: data.recurrenceRule || undefined,
    });
  };

  const views = [
    {
      id: 'chat',
      emoji: '💬',
      title: 'AI Chat',
      content: <ChatInterface />,
    },
    {
      id: 'today',
      emoji: '✓',
      title: 'Tasks',
      content: <TodayView />,
    },
    {
      id: 'goals',
      emoji: '🎯',
      title: 'Goals',
      content: <GoalsView />,
    },
    {
      id: 'evening',
      emoji: '🌙',
      title: 'Reality Check',
      content: <EveningCheck />,
    },
    {
      id: 'weekly',
      emoji: '📊',
      title: 'Weekly Roast',
      content: <WeeklyRoast />,
    },
    {
      id: 'integrations',
      emoji: '🔗',
      title: 'Integrations',
      content: <Integrations />,
    },
  ];

  const getCurrentViewIndex = () => {
    return views.findIndex(v => v.id === view);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" href="/" />
            <div className="flex items-center gap-4">
              <div className="hidden text-sm text-zinc-500 sm:block">{currentTime}</div>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop View Tabs - Hidden on Mobile */}
      <div className="hidden border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setView('chat')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'chat'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              💬
            </button>
            <button
              onClick={() => setView('today')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'today'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              ✓ Tasks
            </button>
            <button
              onClick={() => setView('goals')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'goals'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              🎯 Goals
            </button>
            <button
              onClick={() => setView('evening')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'evening'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              🌙 Reality Check
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'weekly'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              📊 Weekly Roast
            </button>
            <button
              onClick={() => setView('integrations')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'integrations'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              🔗 Integrations
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Swipe View */}
      <div className="block h-[calc(100vh-73px)] md:hidden">
        <MobileSwipeView views={views} initialView={getCurrentViewIndex()} />
      </div>

      {/* Desktop Content - Hidden on Mobile */}
      <main className="hidden md:block mx-auto max-w-5xl px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChatInterface />
            </motion.div>
          )}
          {view === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <TodayView />
            </motion.div>
          )}
          {view === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <GoalsView />
            </motion.div>
          )}
          {view === 'evening' && (
            <motion.div
              key="evening"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <EveningCheck />
            </motion.div>
          )}
          {view === 'weekly' && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <WeeklyRoast />
            </motion.div>
          )}
          {view === 'integrations' && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <Integrations />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent FAB (Floating Action Button) */}
      <button
        onClick={() => setIsFabTaskDialogOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl dark:bg-zinc-50 dark:text-zinc-900"
        aria-label="Add Task"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Global Task Creation Dialog */}
      <CreateTaskDialog
        open={isFabTaskDialogOpen}
        onOpenChange={setIsFabTaskDialogOpen}
        onSubmit={handleCreateTaskFromFab}
        isPending={createTaskMutation.isPending}
        goals={goals?.map(g => ({ id: g.id, title: g.title }))}
        isCalendarConnected={isGoogleCalendarConnected()}
      />
    </div>
  );
}

// Today View Component
function TodayView() {
  const [activeFilter, setActiveFilter] = useState('today');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRecurringEditOpen, setIsRecurringEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [pendingRecurringAction, setPendingRecurringAction] = useState<'edit-single' | 'edit-all' | null>(null);
  
  // Use AppContext instead of tRPC queries
  const { tasks: allTasks, goals, refreshTasks, isLoading, isHydrated, isGoogleCalendarConnected } = useApp();
  const isCalendarConnected = isGoogleCalendarConnected();
  
  // Get date filters
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(today);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Mutations
  const syncMutation = trpc.task.syncFromCalendar.useMutation({
    onSuccess: async (data) => {
      // Show sync results
      const messages = [];
      if (data.created > 0) messages.push(`${data.created} tasks created`);
      if (data.updated > 0) messages.push(`${data.updated} tasks updated`);
      if (data.deleted > 0) messages.push(`${data.deleted} tasks deleted`);
      
      if (messages.length > 0) {
        console.log(`✅ Calendar synced: ${messages.join(', ')}`);
      } else {
        console.log('✅ Calendar synced: Already up to date');
      }
      
      // Refresh tasks from context
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshTasks();
      setIsSyncing(false);
    },
    onError: (error) => {
      setIsSyncing(false);
      alert(`❌ Calendar sync failed!\n\nError: ${error.message}\n\nPlease check your calendar connection and try again.`);
    },
  });

  const createMutation = trpc.task.create.useMutation({
    onSuccess: async (data) => {
      await refreshTasks();
      setIsCreateOpen(false);
      // Show success feedback if calendar synced
      if (data.isSyncedWithCalendar) {
        console.log('✅ Task created and synced with Google Calendar');
      }
    },
    onError: (error) => {
      console.error('❌ Failed to create task:', error.message);
      alert(`❌ Failed to create task!\n\nError: ${error.message}`);
    },
  });

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: async (data) => {
      await refreshTasks();
      setIsEditOpen(false);
      setSelectedTask(null);
      // Show success feedback if calendar synced
      if (data.isSyncedWithCalendar) {
        console.log('✅ Task updated and synced with Google Calendar');
      }
    },
    onError: (error) => {
      console.error('❌ Failed to update task:', error.message);
      alert(`❌ Failed to update task!\n\nError: ${error.message}`);
    },
  });

  const completeMutation = trpc.task.complete.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setIsCompleteOpen(false);
      setSelectedTask(null);
    },
  });

  const skipMutation = trpc.task.skip.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setIsRescheduleOpen(false);
      setSelectedTask(null);
    },
  });

  const rescheduleMutation = trpc.task.reschedule.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setIsRescheduleOpen(false);
      setSelectedTask(null);
    },
  });

  const deleteTaskMutation = trpc.task.delete.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setSelectedTask(null);
    },
  });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate();
  };

  const handleCreateTask = (data: any) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      reminders: data.reminders && data.reminders.length > 0 ? data.reminders : undefined,
      goalId: data.goalId || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
      syncWithCalendar: data.syncWithCalendar,
      recurrenceRule: data.recurrenceRule || undefined,
    });
  };

  const handleUpdateTask = (data: any) => {
    if (selectedTask) {
      updateMutation.mutate({
        id: selectedTask.id,
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate || undefined,
        startTime: data.startTime !== undefined ? (data.startTime || undefined) : undefined,
        endTime: data.endTime !== undefined ? (data.endTime || undefined) : undefined,
        reminders: data.reminders !== undefined ? (data.reminders && data.reminders.length > 0 ? data.reminders : undefined) : undefined,
        goalId: data.goalId || undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        syncWithCalendar: data.syncWithCalendar,
        recurrenceRule: data.recurrenceRule || undefined,
        completionProof: data.completionProof || undefined,
      });
    }
  };

  const handleCompleteTask = (proof: string) => {
    if (selectedTask) {
      completeMutation.mutate({
        id: selectedTask.id,
        proof: proof || undefined,
      });
    }
  };

  const handleSkipTask = () => {
    if (selectedTask) {
      skipMutation.mutate({ id: selectedTask.id });
    }
  };

  const handleRescheduleTask = (newDate: Date) => {
    if (selectedTask) {
      rescheduleMutation.mutate({
        id: selectedTask.id,
        newDueDate: newDate,
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate({ id: taskId });
    }
  };

  // Filter and sort tasks (skipped tasks hidden by default, completed tasks go to bottom)
  const filteredTasks = (allTasks || [])
    .filter(task => {
      // If viewing skipped filter, only show skipped tasks
      if (activeFilter === 'skipped') {
        return task.status === 'skipped';
      }
      
      // For all other filters, hide skipped tasks by default
      if (task.status === 'skipped') {
        return false;
      }
      
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      
      if (activeFilter === 'today') {
        return dueDate && dueDate >= today && dueDate < tomorrow;
      }
      if (activeFilter === 'week') {
        return dueDate && dueDate >= today && dueDate < weekEnd;
      }
      if (activeFilter === 'nextweek') {
        return dueDate && dueDate >= nextWeekStart && dueDate < nextWeekEnd;
      }
      if (activeFilter === 'month') {
        return dueDate && dueDate >= today && dueDate <= monthEnd;
      }
      if (activeFilter === 'overdue') {
        return dueDate && dueDate < today && task.status === 'pending';
      }
      return true; // 'all' (excluding skipped)
    })
    .sort((a, b) => {
      // Completed/skipped go to bottom (by availability)
      if ((a.status === 'completed' || a.status === 'skipped') && 
          b.status === 'pending') return 1;
      if (a.status === 'pending' && 
          (b.status === 'completed' || b.status === 'skipped')) return -1;
      
      // Sort by priority (high > medium > low) for urgency
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date (earlier = more urgent)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // Finally, sort by creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Calculate counts (excluding skipped tasks except for skipped count)
  const todayCount = (allTasks || []).filter(t => {
    if (t.status === 'skipped') return false;
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && dueDate >= today && dueDate < tomorrow;
  }).length;

  const weekCount = (allTasks || []).filter(t => {
    if (t.status === 'skipped') return false;
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && dueDate >= today && dueDate < weekEnd;
  }).length;

  const nextWeekCount = (allTasks || []).filter(t => {
    if (t.status === 'skipped') return false;
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && dueDate >= nextWeekStart && dueDate < nextWeekEnd;
  }).length;

  const monthCount = (allTasks || []).filter(t => {
    if (t.status === 'skipped') return false;
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && dueDate >= today && dueDate <= monthEnd;
  }).length;

  const overdueCount = (allTasks || []).filter(t => {
    if (t.status === 'skipped') return false;
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    return dueDate && dueDate < today && t.status === 'pending';
  }).length;

  const allCount = (allTasks || []).filter(t => t.status !== 'skipped').length;
  
  const skippedCount = (allTasks || []).filter(t => t.status === 'skipped').length;

  const filters = [
    { id: 'today', label: 'Today', count: todayCount },
    { id: 'week', label: 'This Week', count: weekCount },
    { id: 'nextweek', label: 'Next Week', count: nextWeekCount },
    { id: 'month', label: 'This Month', count: monthCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'all', label: 'All', count: allCount },
    { id: 'skipped', label: 'Skipped', count: skippedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Tasks ✓
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {filteredTasks.filter(t => t.status === 'completed').length} of {filteredTasks.length} completed
          </p>
        </div>
        {isCalendarConnected && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync tasks with Google Calendar"
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </span>
            ) : '🔄 Sync Calendar'}
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeFilter === filter.id
                ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900'
                : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {filter.label}
            <span className={`ml-1.5 ${
              activeFilter === filter.id ? 'opacity-80' : 'opacity-60'
            }`}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      {!isHydrated || isLoading ? (
        <TaskListSkeleton count={5} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.2,
                delay: index < 10 ? index * 0.05 : 0,
              }}
              layout
              className={`rounded-lg border p-3 sm:p-4 transition-all ${
              task.status === 'completed'
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                : task.status === 'skipped'
                ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                : 'border-zinc-200 bg-white hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="flex items-start gap-2">
                {/* Checkbox */}
                <button 
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    task.status === 'completed'
                      ? 'border-green-600 bg-green-600'
                      : task.status === 'skipped'
                      ? 'border-red-600 bg-red-600'
                      : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700'
                  }`}
                >
                  {task.status === 'completed' && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {task.status === 'skipped' && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`text-sm font-medium truncate ${
                      task.status === 'completed'
                        ? 'text-zinc-500 line-through dark:text-zinc-500'
                        : task.status === 'skipped'
                        ? 'text-red-500 line-through dark:text-red-400'
                        : 'text-zinc-900 dark:text-zinc-50'
                    }`}>
                      {task.title}
                    </h3>
                    {task.isSyncedWithCalendar && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">🔗</span>
                    )}
                    {task.recurrenceRule && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 flex-shrink-0" title="Recurring task">🔁</span>
                    )}
                    {task.recurringEventId && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 flex-shrink-0" title={`Series ID: ${task.recurringEventId}`}>📆</span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{task.description}</p>
                  )}
                  
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {task.startTime && task.endTime && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        ⏰ {new Date(task.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(task.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    {task.dueDate && !(task.startTime && task.endTime) && (
                      <span className="text-xs text-zinc-500">
                        📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.reminders && task.reminders.length > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        🔔 {task.reminders.length}
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <>
                        {task.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  
                  {/* Show completion proof if task is completed and has proof */}
                  {task.status === 'completed' && task.completionProof && (
                    <div className="mt-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">✓ Proof of Completion:</p>
                      <p className="mt-0.5 text-xs text-green-600 dark:text-green-400 break-words">{task.completionProof}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mobile Actions */}
              <div className="mt-2 flex gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    console.log('Opening edit dialog with task:', task);
                    setSelectedTask(task);
                    // Check if task is recurring
                    if (task.recurringEventId) {
                      setIsRecurringEditOpen(true);
                    } else {
                      setIsEditOpen(true);
                    }
                  }}
                  className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 transition-colors"
                >
                  Edit
                </button>
                {task.status !== 'completed' && task.status !== 'skipped' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsCompleteOpen(true);
                      }}
                      className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsRescheduleOpen(true);
                      }}
                      className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      Skip
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-start gap-3">
              {/* Checkbox */}
              <button 
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  task.status === 'completed'
                    ? 'border-green-600 bg-green-600'
                    : task.status === 'skipped'
                    ? 'border-red-600 bg-red-600'
                    : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700'
                }`}
              >
                {task.status === 'completed' && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {task.status === 'skipped' && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${
                    task.status === 'completed'
                      ? 'text-zinc-500 line-through dark:text-zinc-500'
                      : task.status === 'skipped'
                      ? 'text-red-500 line-through dark:text-red-400'
                      : 'text-zinc-900 dark:text-zinc-50'
                  }`}>
                    {task.title}
                  </h3>
                  {task.isSyncedWithCalendar && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">🔗</span>
                  )}
                  {task.recurrenceRule && (
                    <span className="text-xs text-purple-600 dark:text-purple-400" title="Recurring task">🔁</span>
                  )}
                  {task.recurringEventId && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400" title={`Series ID: ${task.recurringEventId}`}>📆</span>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {task.description && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{task.description}</p>
                )}
                {/* Show completion proof if task is completed and has proof */}
                {task.status === 'completed' && task.completionProof && (
                  <div className="mt-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-2">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">✓ Proof of Completion:</p>
                    <p className="mt-0.5 text-xs text-green-600 dark:text-green-400 break-words">{task.completionProof}</p>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {task.startTime && task.endTime && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      ⏰ {new Date(task.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(task.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                  {task.dueDate && !(task.startTime && task.endTime) && (
                    <span className="text-xs text-zinc-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.reminders && task.reminders.length > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      🔔 {task.reminders.length} reminder{task.reminders.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    // Check if task is recurring
                    if (task.recurringEventId) {
                      setIsRecurringEditOpen(true);
                    } else {
                      setIsEditOpen(true);
                    }
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 transition-colors"
                  title="Edit task"
                >
                  Edit
                </button>
                {task.status !== 'completed' && task.status !== 'skipped' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsCompleteOpen(true);
                      }}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20 transition-colors"
                      title="Mark as complete"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsRescheduleOpen(true);
                      }}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20 transition-colors"
                      title="Skip or reschedule"
                    >
                      Skip
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                  title="Delete task"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State / Add Task */}
      {filteredTasks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="text-4xl">📝</div>
          <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add your first task to get started or sync from Google Calendar
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Add Task
            </button>
            {isCalendarConnected && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </span>
                ) : '🔄 Sync Calendar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateTask}
        isPending={createMutation.isPending}
        goals={goals?.map(g => ({ id: g.id, title: g.title }))}
        isCalendarConnected={isCalendarConnected}
      />

      {selectedTask && (
        <>
          <EditTaskDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            onSubmit={handleUpdateTask}
            isPending={updateMutation.isPending}
            goals={goals?.map(g => ({ id: g.id, title: g.title }))}
            isCalendarConnected={isCalendarConnected}
            task={selectedTask}
          />

          <CompleteTaskDialog
            open={isCompleteOpen}
            onOpenChange={setIsCompleteOpen}
            onSubmit={handleCompleteTask}
            isPending={completeMutation.isPending}
            taskTitle={selectedTask.title}
          />

          <RescheduleTaskDialog
            open={isRescheduleOpen}
            onOpenChange={setIsRescheduleOpen}
            onSkip={handleSkipTask}
            onReschedule={handleRescheduleTask}
            isPending={skipMutation.isPending || rescheduleMutation.isPending}
            taskTitle={selectedTask.title}
          />
          <RecurringTaskEditDialog
            open={isRecurringEditOpen}
            onOpenChange={setIsRecurringEditOpen}
            onEditSingle={() => {
              // Edit only this instance
              setIsEditOpen(true);
            }}
            onEditAll={() => {
              // Edit all instances - will be handled in the edit dialog
              setPendingRecurringAction('edit-all');
              setIsEditOpen(true);
            }}
            taskTitle={selectedTask.title}
          />
        </>
      )}
    </div>
  );
}

// Goals View Component
function GoalsView() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    timeHorizon: '' as '' | 'daily' | 'weekly' | 'monthly' | 'annual',
    status: 'active' as 'active' | 'completed' | 'paused',
    targetDate: undefined as Date | undefined,
    githubRepos: [] as string[],
  });

  // Use AppContext
  const { goals, tasks: allTasks, refreshGoals, refreshTasks, isGoogleCalendarConnected } = useApp();
  
  // Keep these tRPC queries as they're not core data
  const { data: githubIntegration } = trpc.integration.getByServiceType.useQuery({ serviceType: 'github' });
  const { data: githubActivity } = trpc.integration.getGitHubActivity.useQuery({ hours: 24 * 30 }); // Last 30 days for more repos
  
  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: async () => {
      await refreshTasks();
      setIsCreateTaskOpen(false);
      setSelectedGoal(null);
    },
  });
  
  const createMutation = trpc.goal.create.useMutation({
    onSuccess: () => {
      refreshGoals();
      setIsCreateOpen(false);
      resetForm();
    },
  });
  
  const updateMutation = trpc.goal.update.useMutation({
    onSuccess: () => {
      refreshGoals();
      setIsEditOpen(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      refreshGoals();
      setIsDeleteOpen(false);
      setSelectedGoal(null);
    },
  });

  const availableRepos = githubActivity?.repositories || [];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      timeHorizon: '',
      status: 'active',
      targetDate: undefined,
      githubRepos: [],
    });
    setSelectedGoal(null);
    setShowCalendar(false);
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      timeHorizon: formData.timeHorizon || undefined,
      status: formData.status,
      targetDate: formData.targetDate,
      githubRepos: formData.githubRepos.length > 0 ? formData.githubRepos : undefined,
    });
  };

  const handleEdit = () => {
    if (!selectedGoal) return;
    updateMutation.mutate({
      id: selectedGoal.id,
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      timeHorizon: formData.timeHorizon || undefined,
      status: formData.status,
      targetDate: formData.targetDate,
      githubRepos: formData.githubRepos.length > 0 ? formData.githubRepos : undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedGoal) return;
    deleteMutation.mutate({ id: selectedGoal.id });
  };

  const openEditDialog = (goal: any) => {
    setSelectedGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      priority: goal.priority,
      timeHorizon: goal.timeHorizon || '',
      status: goal.status,
      targetDate: goal.targetDate,
      githubRepos: goal.githubRepos || [],
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (goal: any) => {
    setSelectedGoal(goal);
    setIsDeleteOpen(true);
  };

  const openViewDialog = (goal: any) => {
    setSelectedGoal(goal);
    setIsViewOpen(true);
  };

  // Split goals into active and completed
  const activeGoals = goals?.filter((g: any) => g.status !== 'completed') || [];
  const completedGoals = goals?.filter((g: any) => g.status === 'completed') || [];
  const totalGoals = goals?.length || 0;

  const getTaskCountsForGoal = (goalId: string) => {
    const goalTasks = allTasks?.filter(t => t.goalId === goalId) || [];
    const completed = goalTasks.filter(t => t.status === 'completed').length;
    return { total: goalTasks.length, completed };
  };

  const handleCreateTaskForGoal = (data: any) => {
    createTaskMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      reminders: data.reminders && data.reminders.length > 0 ? data.reminders : undefined,
      goalId: selectedGoal?.id || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
      syncWithCalendar: data.syncWithCalendar,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'paused': return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
      default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Goals 🎯
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {goals?.length || 0} {goals?.length === 1 ? 'goal' : 'goals'} tracked
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              + Create Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a new goal to track your progress and achievements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Launch new feature"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Add details about your goal..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeHorizon">Time Horizon</Label>
                  <Select value={formData.timeHorizon} onValueChange={(value: any) => setFormData({ ...formData, timeHorizon: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Button
                  variant="outline"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full justify-start text-left font-normal"
                >
                  {formData.targetDate ? formData.targetDate.toLocaleDateString() : 'Pick a date'}
                </Button>
                {showCalendar && (
                  <Calendar
                    mode="single"
                    selected={formData.targetDate}
                    onSelect={(date) => {
                      setFormData({ ...formData, targetDate: date });
                      setShowCalendar(false);
                    }}
                    className="rounded-md border"
                  />
                )}
              </div>

              {githubIntegration && availableRepos.length > 0 && (
                <div className="space-y-2">
                  <Label>GitHub Repositories (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableRepos.map((repo) => (
                      <button
                        key={repo}
                        onClick={() => {
                          const isSelected = formData.githubRepos.includes(repo);
                          setFormData({
                            ...formData,
                            githubRepos: isSelected
                              ? formData.githubRepos.filter(r => r !== repo)
                              : [...formData.githubRepos, repo]
                          });
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          formData.githubRepos.includes(repo)
                            ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                            : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {repo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals List */}
      {totalGoals === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            No goals yet
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Create your first goal to start tracking your progress
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              {activeGoals.map((goal: any) => (
                <div
                  key={goal.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header with badges and actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg truncate">
                          {goal.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Badge className={`${getPriorityColor(goal.priority)} text-xs`}>
                            {goal.priority === 'high' && '🔴'}
                            {goal.priority === 'medium' && '🟡'}
                            {goal.priority === 'low' && '🟢'}
                            <span className="ml-1 hidden sm:inline">{goal.priority}</span>
                          </Badge>
                          <Badge className={`${getStatusColor(goal.status)} text-xs`}>
                            {goal.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Icon buttons for mobile, text buttons for desktop */}
                      <div className="flex gap-1 sm:gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(goal)}
                          className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                          aria-label="Edit goal"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="ml-1.5 hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(goal)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 sm:h-9 sm:w-auto sm:px-3"
                          aria-label="Delete goal"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="ml-1.5 hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 sm:line-clamp-none">
                        {goal.description}
                      </p>
                    )}

                    {/* Task Counts and Warning */}
                    {(() => {
                      const { total, completed } = getTaskCountsForGoal(goal.id);
                      return (
                        <div className="space-y-2">
                          {total === 0 ? (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-900">
                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                ⚠️ No tasks yet. Add tasks to start tracking progress!
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Tasks: {completed}/{total} completed
                              </span>
                              <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[100px]">
                                <div
                                  className="h-full bg-green-600 transition-all"
                                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {goal.timeHorizon && (
                        <span className="flex items-center gap-1">
                          ⏱️ <span className="hidden sm:inline">{goal.timeHorizon}</span><span className="sm:hidden capitalize">{goal.timeHorizon.slice(0,1)}</span>
                        </span>
                      )}
                      {goal.targetDate && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {goal.githubRepos && goal.githubRepos.length > 0 && (
                        <span className="flex items-center gap-1">
                          🐙 {goal.githubRepos.length}
                        </span>
                      )}
                    </div>

                    {/* GitHub Repos */}
                    {goal.githubRepos && goal.githubRepos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {goal.githubRepos.slice(0, 3).map((repo: string) => (
                          <span
                            key={repo}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-none"
                          >
                            {repo}
                          </span>
                        ))}
                        {goal.githubRepos.length > 3 && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            +{goal.githubRepos.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed Goals Section */}
          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 sm:p-4"
                aria-label={showCompleted ? 'Collapse completed goals' : 'Expand completed goals'}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-xl sm:text-2xl">✅</div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">
                      Completed Goals ({completedGoals.length}/{totalGoals})
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
                      {showCompleted ? 'Tap to collapse' : 'Tap to expand'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`h-5 w-5 text-zinc-500 transition-transform shrink-0 ${showCompleted ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCompleted && (
                <div className="space-y-4">
                  {completedGoals.map((goal: any) => (
                    <div
                      key={goal.id}
                      className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm backdrop-blur-sm dark:border-green-900 dark:bg-green-950/20 sm:p-6"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-xl sm:text-2xl shrink-0">✅</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg truncate">
                                {goal.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <Badge className={`${getPriorityColor(goal.priority)} text-xs`}>
                                  {goal.priority === 'high' && '🔴'}
                                  {goal.priority === 'medium' && '🟡'}
                                  {goal.priority === 'low' && '🟢'}
                                  <span className="ml-1 hidden sm:inline">{goal.priority}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(goal)}
                            className="h-8 w-8 p-0 shrink-0 sm:h-9 sm:w-auto sm:px-3"
                            aria-label="View goal details"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="ml-1.5 hidden sm:inline">View</span>
                          </Button>
                        </div>

                        {/* Description */}
                        {goal.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {goal.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          {goal.timeHorizon && (
                            <span className="flex items-center gap-1">
                              ⏱️ <span className="hidden sm:inline">{goal.timeHorizon}</span><span className="sm:hidden capitalize">{goal.timeHorizon.slice(0,1)}</span>
                            </span>
                          )}
                          {goal.updatedAt && (
                            <span className="flex items-center gap-1">
                              📅 {new Date(goal.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {goal.githubRepos && goal.githubRepos.length > 0 && (
                            <span className="flex items-center gap-1">
                              🐙 {goal.githubRepos.length}
                            </span>
                          )}
                        </div>

                        {/* GitHub Repos */}
                        {goal.githubRepos && goal.githubRepos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {goal.githubRepos.slice(0, 3).map((repo: string) => (
                              <span
                                key={repo}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-none"
                              >
                                {repo}
                              </span>
                            ))}
                            {goal.githubRepos.length > 3 && (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                +{goal.githubRepos.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your goal details and track your progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Launch new feature"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description / Notes</Label>
              <Textarea
                id="edit-description"
                placeholder="Add details about your goal..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-timeHorizon">Time Horizon</Label>
                <Select value={formData.timeHorizon} onValueChange={(value: any) => setFormData({ ...formData, timeHorizon: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline (Optional)</Label>
              <Button
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full justify-start text-left font-normal"
              >
                {formData.targetDate ? formData.targetDate.toLocaleDateString() : 'Pick a date'}
              </Button>
              {showCalendar && (
                <Calendar
                  mode="single"
                  selected={formData.targetDate}
                  onSelect={(date) => {
                    setFormData({ ...formData, targetDate: date });
                    setShowCalendar(false);
                  }}
                  className="rounded-md border"
                />
              )}
            </div>

            {githubIntegration && availableRepos.length > 0 && (
              <div className="space-y-2">
                <Label>GitHub Repositories (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {availableRepos.map((repo) => (
                    <button
                      key={repo}
                      onClick={() => {
                        const isSelected = formData.githubRepos.includes(repo);
                        setFormData({
                          ...formData,
                          githubRepos: isSelected
                            ? formData.githubRepos.filter(r => r !== repo)
                            : [...formData.githubRepos, repo]
                        });
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        formData.githubRepos.includes(repo)
                          ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                          : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {repo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {selectedGoal && (() => {
              const goalTasks = (allTasks || []).filter(t => t.goalId === selectedGoal.id);
              const completed = goalTasks.filter(t => t.status === 'completed').length;
              return (
                <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Tasks ({completed}/{goalTasks.length} completed)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditOpen(false);
                        setTimeout(() => setIsCreateTaskOpen(true), 100);
                      }}
                      className="text-xs"
                    >
                      + Add Task
                    </Button>
                  </div>
                  {goalTasks.length === 0 ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-900">
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        No tasks yet. Click "+ Add Task" to get started!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {goalTasks.map(task => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 rounded-lg border p-2 ${
                            task.status === 'completed'
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                              : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
                          }`}
                        >
                          <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                            task.status === 'completed'
                              ? 'border-green-600 bg-green-600'
                              : 'border-zinc-400'
                          }`}>
                            {task.status === 'completed' && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`flex-1 text-sm ${
                            task.status === 'completed'
                              ? 'text-zinc-600 line-through dark:text-zinc-400'
                              : 'text-zinc-900 dark:text-zinc-50'
                          }`}>
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-zinc-500">
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.title || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedGoal?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteOpen(false);
              setSelectedGoal(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Goal Dialog (Read-only) */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Goal Details</DialogTitle>
            <DialogDescription>
              Viewing completed goal - this goal is now read-only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                {selectedGoal?.title}
              </div>
            </div>

            {selectedGoal?.description && (
              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  {selectedGoal?.description}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedGoal?.priority || 'medium')}>
                    {selectedGoal?.priority === 'high' && '🔴'}
                    {selectedGoal?.priority === 'medium' && '🟡'}
                    {selectedGoal?.priority === 'low' && '🟢'}
                    {' '}{selectedGoal?.priority}
                  </Badge>
                </div>
              </div>

              {selectedGoal?.timeHorizon && (
                <div className="space-y-2">
                  <Label>Time Horizon</Label>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {selectedGoal?.timeHorizon}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedGoal?.status || 'completed')}>
                  ✅ {selectedGoal?.status}
                </Badge>
              </div>
            </div>

            {selectedGoal?.targetDate && (
              <div className="space-y-2">
                <Label>Target Date</Label>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  {new Date(selectedGoal?.targetDate).toLocaleDateString()}
                </div>
              </div>
            )}

            {selectedGoal?.updatedAt && (
              <div className="space-y-2">
                <Label>Completed On</Label>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  {new Date(selectedGoal?.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}

            {selectedGoal?.githubRepos && selectedGoal?.githubRepos.length > 0 && (
              <div className="space-y-2">
                <Label>GitHub Repositories</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedGoal?.githubRepos.map((repo: string) => (
                    <span
                      key={repo}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {repo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setIsViewOpen(false);
              setSelectedGoal(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog from Goal */}
      {selectedGoal && (
        <CreateTaskDialog
          open={isCreateTaskOpen}
          onOpenChange={setIsCreateTaskOpen}
          onSubmit={handleCreateTaskForGoal}
          isPending={createTaskMutation.isPending}
          goals={goals?.map(g => ({ id: g.id, title: g.title }))}
          initialGoalId={selectedGoal.id}
          isCalendarConnected={isGoogleCalendarConnected()}
        />
      )}
    </div>
  );
}

// Evening Reality Check Component
function EveningCheck() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(24); // Default: 24 hours

  // Fetch GitHub activity with time range
  const { data: githubActivity, isLoading: githubLoading, refetch: refetchGitHub } = trpc.integration.getGitHubActivity.useQuery({
    hours: timeRange,
  });

  // Fetch Google Calendar activity with time range
  const { data: calendarActivity, isLoading: calendarLoading, refetch: refetchCalendar } = trpc.integration.getGoogleCalendarActivity.useQuery({
    hours: timeRange,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Refresh both regular data and integrations
    Promise.all([
      new Promise((resolve) => setTimeout(resolve, 800)),
      refetchGitHub(),
      refetchCalendar(),
    ]).then(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    });
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const tasks = [
    {
      id: 1,
      title: 'Work on AI Assistant',
      planned: true,
      githubCommits: 0,
      expectedRepo: 'ai-assistant',
      actualActivity: '6 commits to random-fork',
      status: 'mismatch' as const,
    },
    {
      id: 2,
      title: 'Gym Session',
      planned: true,
      requiresProof: true,
      proofProvided: false,
      status: 'pending' as const,
    },
    {
      id: 3,
      title: 'Team Standup',
      planned: true,
      calendarAttended: true,
      status: 'completed' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Reality Check Time 🔍
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Let&apos;s see how your day actually went:
          </p>
        </div>
        
        {/* Refresh Button - Responsive Design */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 py-2.5 shadow-sm transition-all hover:shadow-md disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto sm:justify-start"
        >
          {/* Refresh Icon */}
          <div className={`relative flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}>
            <svg
              className="h-4 w-4 text-zinc-700 dark:text-zinc-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {!isRefreshing && (
              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
            )}
          </div>
          
          {/* Last Updated Text */}
          <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0">
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 sm:mt-0">
              {getTimeAgo(lastUpdated)}
            </div>
          </div>
        </button>
      </div>

      {/* GitHub Activity Summary - Only show if GitHub is connected */}
      {githubActivity && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Warning banner if token needs reconnection */}
          {githubActivity.needsReconnect && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Limited access to private repositories
                  </p>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    Your GitHub token doesn&apos;t have the &quot;repo&quot; scope. Please{' '}
                    <button
                      onClick={() => (window.location.href = '/api/integrations/github/connect')}
                      className="font-semibold underline hover:no-underline"
                    >
                      reconnect your GitHub account
                    </button>{' '}
                    to see activity from private repositories.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🐙</div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  GitHub Activity
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  @{githubActivity.githubUsername}
                </p>
              </div>
            </div>
            
            {/* Time Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Time range:
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value={1}>Last Hour</option>
                <option value={24}>Last 24 Hours</option>
                <option value={168}>Last 7 Days</option>
                <option value={720}>Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {githubActivity.commits}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Commits
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {githubActivity.pullRequests}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Pull Requests
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {githubActivity.issues}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Issues
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {githubActivity.repositories.length}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Repositories
              </div>
            </div>
          </div>

          {githubActivity.repositories.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Repositories worked on:
              </p>
              <div className="flex flex-wrap gap-2">
                {githubActivity.repositories.slice(0, 5).map((repo) => (
                  <span
                    key={repo}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {repo}
                  </span>
                ))}
                {githubActivity.repositories.length > 5 && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    +{githubActivity.repositories.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {githubActivity.totalEvents === 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                {timeRange === 1 
                  ? 'No activity in the last hour'
                  : timeRange === 24
                  ? 'No activity in the last 24 hours'
                  : timeRange === 168
                  ? 'No activity in the last 7 days'
                  : 'No activity in the last 30 days'}
              </p>
            </div>
          )}
        </div>
      )}

      {githubLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🐙</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading GitHub activity...
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Activity Summary - Only show if Calendar is connected */}
      {calendarActivity && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Warning banner if token needs reconnection */}
          {calendarActivity.needsReconnect && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Calendar token expired
                  </p>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    Please{' '}
                    <button
                      onClick={() => (window.location.href = '/api/integrations/google-calendar/connect')}
                      className="font-semibold underline hover:no-underline"
                    >
                      reconnect your Google Calendar
                    </button>{' '}
                    to continue syncing events.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Calendar Events
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {calendarActivity.email}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {calendarActivity.totalEvents}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Total Events
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {calendarActivity.pastEvents}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Past Events
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {calendarActivity.upcomingEvents}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Upcoming
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {calendarActivity.acceptedEvents}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Accepted
              </div>
            </div>
          </div>

          {calendarActivity.totalEvents === 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                {timeRange === 1 
                  ? 'No events in the last hour'
                  : timeRange === 24
                  ? 'No events in the last 24 hours'
                  : timeRange === 168
                  ? 'No events in the last 7 days'
                  : 'No events in the last 30 days'}
              </p>
            </div>
          )}
        </div>
      )}

      {calendarLoading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📅</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading calendar activity...
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-xl border p-6 shadow-sm transition-all ${
              task.status === 'completed'
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                : task.status === 'mismatch'
                ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {task.title}
                  </h3>
                  {task.status === 'completed' && (
                    <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                      ✓ Completed
                    </span>
                  )}
                  {task.status === 'mismatch' && (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                      ⚠ Mismatch
                    </span>
                  )}
                </div>

                {task.status === 'mismatch' && (
                  <div className="mt-3 space-y-2 rounded-lg bg-white p-4 dark:bg-zinc-900">
                    <div className="text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Planned:
                      </span>{' '}
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {task.expectedRepo}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        GitHub shows:
                      </span>{' '}
                      <span className="text-red-600 dark:text-red-400">
                        {task.actualActivity}
                      </span>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        What happened?
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['Meeting overrun', 'Got distracted', 'Task too vague', 'Other'].map(
                          (reason) => (
                            <button
                              key={reason}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              {reason}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {task.requiresProof && !task.proofProvided && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      You said you went to the gym. Upload proof:
                    </p>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
                        📸 Add Photo
                      </button>
                      <button className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
                        📝 Add Note
                      </button>
                      <button className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400">
                        ⏭️ Skip Proof
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Skipped proof 3 times this week. Honesty score: 42%
                    </p>
                  </div>
                )}

                {task.status === 'completed' && (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Automatically verified via calendar
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Weekly Roast Report Component
function WeeklyRoast() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roastData, setRoastData] = useState<any>(null);

  // Get current week start (Sunday)
  const getCurrentWeekStart = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  };
  
  const weekStart = getCurrentWeekStart();

  // Fetch existing accountability score for current week
  const { data: existingScore, refetch } = trpc.accountabilityScore.getByWeek.useQuery({
    weekStart,
  });

  const handleGenerateRoast = async (regenerate: boolean = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-roast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStart: weekStart.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate roast');
      }

      const data = await response.json();
      setRoastData(data);
      
      // Refetch the accountability score
      await refetch();
    } catch (err: any) {
      console.error('Error generating roast:', err);
      setError(err.message || 'Failed to generate roast. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Use roast data from API or existing score
  const displayData = roastData || (existingScore ? {
    alignmentScore: existingScore.alignmentScore || 0,
    honestyScore: existingScore.honestyScore || 0,
    completionRate: existingScore.completionRate || 0,
    newProjectsStarted: existingScore.newProjectsStarted || 0,
    evidenceSubmissions: existingScore.evidenceSubmissions || 0,
    insights: existingScore.insights || [],
    recommendations: existingScore.recommendations || [],
    weekSummary: existingScore.weekSummary || 'Roast generated. Review your metrics above.',
  } : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-red-50 to-orange-50 p-8 dark:border-zinc-800 dark:from-red-950/20 dark:to-orange-950/20">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Weekly Roast Report 🔥
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Time to face the music. Here&apos;s how you really did this week:
        </p>
        {existingScore && (
          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
            <span>
              Generated: {new Date(existingScore.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })} at {new Date(existingScore.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            {existingScore.updatedAt.getTime() !== existingScore.createdAt.getTime() && (
              <span>
                Updated: {new Date(existingScore.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })} at {new Date(existingScore.updatedAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400"></div>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Analyzing your week...
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Crunching the numbers and detecting patterns
          </p>
        </div>
      )}

      {/* No Roast Generated Yet */}
      {!displayData && !isGenerating && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 text-6xl">📊</div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Ready for Your Weekly Roast?
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Generate an AI-powered analysis of your week&apos;s performance
          </p>
          <button
            onClick={() => handleGenerateRoast(false)}
            disabled={isGenerating}
            className="mt-6 rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Generate This Week&apos;s Roast 🔥
          </button>
        </div>
      )}

      {/* Display Roast Data */}
      {displayData && !isGenerating && (
        <>
      {/* Score Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-medium text-zinc-500">Alignment Score</div>
          <div className="mt-2 flex items-end gap-2">
                <div className={`text-4xl font-bold ${
                  displayData.alignmentScore >= 0.7 ? 'text-green-600' :
                  displayData.alignmentScore >= 0.4 ? 'text-orange-600' :
              'text-red-600'
            }`}>
                  {Math.round(displayData.alignmentScore * 100)}%
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full transition-all ${
                    displayData.alignmentScore >= 0.7 ? 'bg-green-600' :
                    displayData.alignmentScore >= 0.4 ? 'bg-orange-600' :
                'bg-red-600'
              }`}
                  style={{ width: `${Math.round(displayData.alignmentScore * 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500">Honesty Score</div>
          <div className="mt-2 flex items-end gap-2">
                <div className={`text-4xl font-bold ${
                  displayData.honestyScore >= 0.7 ? 'text-green-600' :
                  displayData.honestyScore >= 0.4 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {Math.round(displayData.honestyScore * 100)}%
                </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
                  className={`h-full transition-all ${
                    displayData.honestyScore >= 0.7 ? 'bg-green-600' :
                    displayData.honestyScore >= 0.4 ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.round(displayData.honestyScore * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-medium text-zinc-500">Completion Rate</div>
              <div className="mt-2 flex items-end gap-2">
                <div className={`text-4xl font-bold ${
                  displayData.completionRate >= 0.7 ? 'text-green-600' :
                  displayData.completionRate >= 0.4 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {Math.round(displayData.completionRate * 100)}%
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full transition-all ${
                    displayData.completionRate >= 0.7 ? 'bg-green-600' :
                    displayData.completionRate >= 0.4 ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.round(displayData.completionRate * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

          {/* Week Summary */}
          {displayData.weekSummary && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg text-zinc-900 dark:text-zinc-50">
                {displayData.weekSummary}
              </p>
            </div>
          )}

      {/* Insights */}
          {displayData.insights && displayData.insights.length > 0 && (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          The Uncomfortable Truth
        </h3>
        <div className="mt-4 space-y-3">
                {displayData.insights.map((insight: any, idx: number) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg p-4 ${
                insight.severity === 'high'
                  ? 'bg-red-50 dark:bg-red-950/20'
                  : insight.severity === 'medium'
                  ? 'bg-orange-50 dark:bg-orange-950/20'
                  : 'bg-green-50 dark:bg-green-950/20'
              }`}
            >
              <span className="text-2xl">{insight.emoji}</span>
              <span className="flex-1 text-zinc-900 dark:text-zinc-50">{insight.text}</span>
            </div>
          ))}
        </div>
      </div>
          )}

          {/* Recommendations */}
          {displayData.recommendations && displayData.recommendations.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-50">
                Next Week&apos;s Challenge
              </h3>
              <ul className="mt-4 space-y-2">
                {displayData.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-900 dark:text-blue-50">
                    <span className="font-bold">{idx + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate Button */}
      <div className="flex justify-center pt-4">
            <button
              onClick={() => handleGenerateRoast(true)}
              disabled={isGenerating}
              className="rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isGenerating ? 'Generating...' : existingScore ? 'Regenerate Roast 🔄' : 'I\'ll Do Better Next Week 💪'}
        </button>
      </div>
        </>
      )}
    </div>
  );
}

// Integrations Component
function Integrations() {
  // Get AppContext refresh function to sync integrations state
  const { refreshIntegrations: refreshAppIntegrations } = useApp();
  
  // Preset avatar URLs
  const presetAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=aurora',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=zoe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=mia',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sam',
  ];

  // Profile management
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = trpc.profile.getCurrent.useQuery();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      refetchProfile();
      setProfileName(profile?.name || '');
      setProfilePicUrl(profile?.profilePicUrl || '');
    },
  });

  const [profileName, setProfileName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || '');
      setProfilePicUrl(profile.profilePicUrl || '');
    }
  }, [profile]);

  // Check if we just came back from OAuth and refresh integrations
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('integration') === 'success') {
      // Small delay to ensure database is updated
      setTimeout(async () => {
        await refreshAppIntegrations();
      }, 500);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshAppIntegrations]);

  // Integrations
  const { data: userIntegrations, isLoading: integrationsLoading, refetch: refetchIntegrations } = trpc.integration.getAll.useQuery();
  const createIntegration = trpc.integration.create.useMutation({
    onSuccess: async () => {
      await refetchIntegrations();
      // Also refresh AppContext integrations to update isGoogleCalendarConnected
      await refreshAppIntegrations();
    },
  });
  const deleteIntegration = trpc.integration.delete.useMutation({
    onSuccess: async () => {
      await refetchIntegrations();
      // Also refresh AppContext integrations to update isGoogleCalendarConnected
      await refreshAppIntegrations();
    },
  });

  // Available service types
  const availableServices = [
    {
      id: 'github',
      name: 'GitHub',
      icon: '🐙',
      description: 'Track commits, PRs, and validate dev work automatically',
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      icon: '📅',
      description: 'Sync events and track meeting attendance',
    },
  ];

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      name: profileName || undefined,
      profilePicUrl: profilePicUrl || undefined,
    });
    setIsEditingProfile(false);
  };

  const handleConnect = (serviceType: string) => {
    // For GitHub, redirect to OAuth flow
    if (serviceType === 'github') {
      window.location.href = '/api/integrations/github/connect';
      return;
    }
    
    // For Google Calendar, redirect to OAuth flow
    if (serviceType === 'google_calendar') {
      window.location.href = '/api/integrations/google-calendar/connect';
      return;
    }
    
    // For other services, create a placeholder integration
    // In the future, this would trigger OAuth flow
    createIntegration.mutate({
      serviceType,
      credentials: { placeholder: true },
      status: 'connected',
    });
  };

  const handleDisconnect = (integrationId: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      deleteIntegration.mutate({ id: integrationId });
    }
  };

  const isServiceConnected = (serviceType: string) => {
    return userIntegrations?.some((int) => int.serviceType === serviceType && int.status === 'connected');
  };

  const getConnectedIntegration = (serviceType: string) => {
    return userIntegrations?.find((int) => int.serviceType === serviceType);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Profile & Integrations 🔗
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your profile and connect external services
        </p>
      </div>

      {/* Profile Management Section */}
      <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Profile Settings
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                Manage your personal information
              </p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-300 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-600 transition-colors shadow-sm touch-manipulation"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {profileLoading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50"></div>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-4">Loading profile...</p>
          </div>
        ) : (
          <form onSubmit={handleProfileSubmit} className="p-4 sm:p-6 md:p-8">
            {/* Avatar Section - Prominent Display */}
            <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Avatar Display */}
                <div className="flex-shrink-0">
                  {profile?.profilePicUrl ? (
                    <div className="relative">
                      <img
                        src={profile.profilePicUrl}
                        alt="Profile"
                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl sm:rounded-2xl object-cover border-3 sm:border-4 border-zinc-200 dark:border-zinc-700 shadow-lg"
                      />
                      {isEditingProfile && (
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md">
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white dark:text-zinc-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center border-3 sm:border-4 border-zinc-200 dark:border-zinc-700 shadow-lg">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-semibold text-zinc-600 dark:text-zinc-300">
                        {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar Info */}
                <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                  <h4 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    Profile Picture
                  </h4>
                  {!isEditingProfile && (
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                      {profile?.profilePicUrl ? 'Custom avatar selected' : 'No avatar selected'}
                    </p>
                  )}
                  {isEditingProfile && (
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500 mb-0 sm:mb-4">
                      Choose an avatar from the options below
                    </p>
                  )}
                </div>
              </div>

              {/* Avatar Selection Grid */}
              {isEditingProfile && (
                <div className="mt-4 sm:mt-6">
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-3 md:grid-cols-8 md:gap-4">
                    {presetAvatars.map((avatarUrl) => (
                      <button
                        key={avatarUrl}
                        type="button"
                        onClick={() => setProfilePicUrl(avatarUrl)}
                        className={`group relative aspect-square rounded-lg sm:rounded-xl border-2 overflow-hidden transition-all active:scale-95 touch-manipulation ${
                          profilePicUrl === avatarUrl
                            ? 'border-zinc-900 dark:border-zinc-50 ring-2 sm:ring-4 ring-zinc-900/20 dark:ring-zinc-50/20 shadow-md sm:shadow-lg scale-105'
                            : 'border-zinc-300 dark:border-zinc-700 active:border-zinc-500 dark:active:border-zinc-500'
                        }`}
                      >
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                        {profilePicUrl === avatarUrl && (
                          <div className="absolute inset-0 bg-zinc-900/30 dark:bg-zinc-50/30 flex items-center justify-center">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 sm:w-4 sm:h-4 text-white dark:text-zinc-900"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 dark:group-active:bg-white/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfilePicUrl('')}
                    className="mt-3 sm:mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors touch-manipulation py-1"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 sm:space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Display Name
                </label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-base border-2 border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent transition-all touch-manipulation"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-base text-zinc-900 dark:text-zinc-50">
                      {profile?.name || <span className="text-zinc-400 dark:text-zinc-500 italic">Not set</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Email Address
                </label>
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm sm:text-base text-zinc-900 dark:text-zinc-50 break-all">
                      {profile?.email || <span className="text-zinc-400 dark:text-zinc-500 italic">Not set</span>}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md whitespace-nowrap">
                      Read-only
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                    Email is managed through your account settings
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditingProfile && (
              <div className="flex flex-col gap-3 mt-6 sm:mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="w-full px-6 py-3.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-manipulation"
                >
                  {updateProfile.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileName(profile?.name || '');
                    setProfilePicUrl(profile?.profilePicUrl || '');
                  }}
                  className="w-full px-6 py-3.5 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Integrations Section */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Connected Services
        </h3>
        <div className="space-y-4">
          {integrationsLoading ? (
            <p className="text-zinc-500">Loading integrations...</p>
          ) : (
            availableServices.map((service) => {
              const connected = isServiceConnected(service.id);
              const integration = getConnectedIntegration(service.id);

              return (
                <div
                  key={service.id}
                  className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{service.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {service.name}
                          </h3>
                          {connected ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                              ✓ Connected
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {service.description}
                        </p>
                        {connected && integration && (
                          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            {service.id === 'github' && integration.metadata && (integration.metadata as { githubUsername?: string }).githubUsername && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Connected as:</span> @{(integration.metadata as { githubUsername?: string }).githubUsername}
                              </span>
                            )}
                            {service.id === 'google_calendar' && integration.metadata && (integration.metadata as { email?: string }).email && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Connected as:</span> {(integration.metadata as { email?: string }).email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    {connected && integration ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={deleteIntegration.isPending}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50"
                        >
                          {deleteIntegration.isPending ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(service.id)}
                        disabled={createIntegration.isPending}
                        className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {createIntegration.isPending ? 'Connecting...' : `Connect ${service.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="text-4xl">🚀</div>
        <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
          More Integrations Coming Soon
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Strava, Notion, Trello, and more...
        </p>
      </div>
    </div>
  );
}

