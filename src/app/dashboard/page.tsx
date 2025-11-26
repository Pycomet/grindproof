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
import { SearchInput } from '@/components/SearchInput';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { EvidenceList } from '@/components/EvidenceCard';
import { useNotifications } from '@/hooks/useNotifications';
import { MorningCheckDialog } from '@/components/MorningCheckDialog';
import { EveningCheckDialog } from '@/components/EveningCheckDialog';
import { ChatWidget } from '@/components/ChatWidget';

type ViewMode = 'today' | 'goals' | 'evening' | 'weekly' | 'integrations';

export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('today');
  const [activeModal, setActiveModal] = useState<'morning' | 'evening' | null>(null);

  // Use AppContext instead of individual queries
  const { user, goals, setUser, refreshTasks, refreshIntegrations, isGoogleCalendarConnected } = useApp();

  
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: async () => {
      await refreshTasks();
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

  // Check for modal parameter from notification clicks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modal = urlParams.get('modal');
    if (modal === 'morning' || modal === 'evening') {
      setActiveModal(modal);
      // Set view based on modal type
      setView(modal === 'morning' ? 'today' : 'evening');
    }
  }, []);

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
      content: <RealityCheck />,
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
              <RealityCheck />
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

      {/* Chat Widget - Replaces FAB */}
      <ChatWidget
        goals={goals?.map(g => ({ id: g.id, title: g.title }))}
        onCreateTask={handleCreateTaskFromFab}
        isCreatingTask={createTaskMutation.isPending}
        isCalendarConnected={isGoogleCalendarConnected()}
      />

      {/* Morning & Evening Check Dialogs */}
      <MorningCheckDialog
        open={activeModal === 'morning'}
        onClose={() => {
          setActiveModal(null);
          // Clean up URL parameter
          window.history.replaceState({}, '', window.location.pathname);
        }}
        onComplete={() => {
          refreshTasks();
        }}
      />
      <EveningCheckDialog
        open={activeModal === 'evening'}
        onClose={() => {
          setActiveModal(null);
          // Clean up URL parameter
          window.history.replaceState({}, '', window.location.pathname);
        }}
        onComplete={() => {
          refreshTasks();
        }}
      />
    </div>
  );
}

// Filter Dropdown Component
interface FilterDropdownProps {
  activeFilters: Set<string>;
  onFilterChange: (filters: Set<string>) => void;
  counts: {
    today: number;
    week: number;
    nextweek: number;
    month: number;
    overdue: number;
    all: number;
    skipped: number;
  };
}

function FilterDropdown({ activeFilters, onFilterChange, counts }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const filterOptions = [
    { id: 'all', label: 'All Tasks', count: counts.all },
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'week', label: 'This Week', count: counts.week },
    { id: 'nextweek', label: 'Next Week', count: counts.nextweek },
    { id: 'month', label: 'This Month', count: counts.month },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'skipped', label: 'Skipped', count: counts.skipped },
  ];

  const toggleFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    // Ensure at least one filter is always active
    if (newFilters.size === 0) {
      newFilters.add('all');
    }
    onFilterChange(newFilters);
  };

  const getActiveFilterLabel = () => {
    if (activeFilters.size === 1 && activeFilters.has('all')) {
      return 'All Tasks';
    }
    if (activeFilters.size === 1) {
      const filter = filterOptions.find(f => activeFilters.has(f.id));
      return filter?.label || 'Filters';
    }
    return `${activeFilters.size} Filters`;
  };

  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:w-auto"
      >
        <span>Filters: {getActiveFilterLabel()}</span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:left-0 sm:right-auto sm:w-64">
            <div className="p-2">
              <div className="mb-2 px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Select filters (multiple allowed)
              </div>
              {filterOptions.map((filter) => (
                <label
                  key={filter.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={activeFilters.has(filter.id)}
                    onChange={() => toggleFilter(filter.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
                  />
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {filter.label}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {filter.count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Today View Component
function TodayView() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['all']));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRecurringEditOpen, setIsRecurringEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [pendingRecurringAction, setPendingRecurringAction] = useState<'edit-single' | 'edit-all' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  
  // Use AppContext instead of tRPC queries
  const { user, tasks: allTasks, goals, refreshTasks, isLoading, isHydrated, isGoogleCalendarConnected } = useApp();
  const isCalendarConnected = isGoogleCalendarConnected();
  
  // Search query
  const { data: searchResults } = trpc.task.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length >= 2 }
  );
  
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Cmd/Ctrl + K to create new task
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCreateOpen(true);
      }
      
      // Cmd/Ctrl + / to focus search
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[placeholder*="Search tasks"]');
        searchInput?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
      priority: data.priority || 'medium',
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
        priority: data.priority || undefined,
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

  const handleToggleComplete = (task: any) => {
    if (task.status === 'completed') {
      console.log('Task is already completed!');
    } else if (task.status !== 'skipped') {
      // Complete: open dialog for proof
      setSelectedTask(task);
      setIsCompleteOpen(true);
    }
  };

  const handleSkipTask = () => {
    if (selectedTask) {
      skipMutation.mutate({ id: selectedTask.id });
    }
  };

  const handleUnskipTask = (task: any) => {
    // Set selected task first, then update status and open dialog
    setSelectedTask(task);
    updateMutation.mutate({
      id: task.id,
      status: 'pending' as const,
    }, {
      onSuccess: async () => {
        await refreshTasks();
      }
    });
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
  // Use search results if search is active, otherwise use normal filtering
  const filteredTasks = searchQuery.length >= 2 && searchResults
    ? searchResults
    : (allTasks || [])
        .filter(task => {
          // Always hide skipped unless explicitly filtered
          if (task.status === 'skipped' && !activeFilters.has('skipped')) {
            return false;
          }
          
          // If only skipped filter is active
          if (activeFilters.size === 1 && activeFilters.has('skipped')) {
            return task.status === 'skipped';
          }
          
          // If 'all' is in filters, show all non-skipped
          if (activeFilters.has('all')) {
            return task.status !== 'skipped';
          }
          
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          
          // Check if task matches any active filter
          return Array.from(activeFilters).some(filter => {
            if (filter === 'today') {
            return dueDate && dueDate >= today && dueDate < tomorrow;
          }
            if (filter === 'week') {
            return dueDate && dueDate >= today && dueDate < weekEnd;
          }
            if (filter === 'nextweek') {
            return dueDate && dueDate >= nextWeekStart && dueDate < nextWeekEnd;
          }
            if (filter === 'month') {
            return dueDate && dueDate >= today && dueDate <= monthEnd;
          }
            if (filter === 'overdue') {
            return dueDate && dueDate < today && task.status === 'pending';
          }
            return false;
          });
        })
        .filter(task => {
          // Apply focus mode after other filters
          if (focusMode && task.status !== 'completed' && task.status !== 'skipped') {
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isDueToday = dueDate && dueDate >= today && dueDate < tomorrow;
            return task.priority === 'high' || isDueToday;
          }
          return true;
        })
        .sort((a, b) => {
          // Status first (pending before completed/skipped)
          if ((a.status === 'completed' || a.status === 'skipped') && 
              b.status === 'pending') return 1;
          if (a.status === 'pending' && 
              (b.status === 'completed' || b.status === 'skipped')) return -1;
          
          // Priority second (high > medium > low)
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
          if (priorityDiff !== 0) return priorityDiff;
          
          // Tasks with due dates come before those without
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          
          // Then by due date (earlier = more urgent)
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
      
          // Finally, sort by creation date (newest first)
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
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-950 pb-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Tasks ✓
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {filteredTasks.filter((t: any) => t.status === 'completed').length} of {filteredTasks.length} completed
              <span className="ml-3 text-xs opacity-60 hidden sm:inline">Press Cmd+K to add task</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-lg bg-white border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:scale-95 dark:bg-white dark:border-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
              title="Create new task (Cmd+K)"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">+ Add Task</span>
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors active:scale-95 whitespace-nowrap ${
                focusMode
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-400'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title={focusMode ? 'Showing only high priority & due today tasks' : 'Click to show only urgent tasks'}
            >
              <span className="sm:hidden">{focusMode ? '🎯 Focus' : '👁️ All'}</span>
              <span className="hidden sm:inline">{focusMode ? '🎯 Focus: High Priority & Today' : '👁️ Show All Tasks'}</span>
            </button>
          {isCalendarConnected && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="Sync tasks with Google Calendar"
            >
              {isSyncing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                    <span className="hidden sm:inline">Syncing...</span>
                </span>
                ) : (
                  <>
                    <span className="sm:hidden">🔄</span>
                    <span className="hidden sm:inline">🔄 Sync</span>
                  </>
                )}
            </button>
          )}
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
        <SearchInput
          onSearch={setSearchQuery}
          placeholder="Search tasks..."
              className="w-full"
        />
          </div>
        {!searchQuery && (
            <div className="sm:shrink-0">
              <FilterDropdown
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                counts={{
                  today: todayCount,
                  week: weekCount,
                  nextweek: nextWeekCount,
                  month: monthCount,
                  overdue: overdueCount,
                  all: allCount,
                  skipped: skippedCount,
                }}
              />
        </div>
      )}
        </div>
      </div>

      {/* Task List */}
      {!isHydrated || isLoading ? (
        <TaskListSkeleton count={5} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task: any, index: number) => (
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
              style={{
                borderLeftWidth: '5px',
                borderLeftColor: 
                  task.priority === 'high' ? '#ef4444' : 
                  task.priority === 'medium' ? '#f59e0b' : 
                  '#10b981'
              }}
              className={`rounded-lg border p-3 sm:p-4 transition-all ${
              // Background based on status  
              task.status === 'completed'
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                : task.status === 'skipped'
                ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                : task.priority === 'high'
                ? 'border-red-100 bg-white hover:bg-red-50/30 hover:shadow-md dark:border-red-900/30 dark:bg-zinc-900 dark:hover:bg-red-950/10'
                : task.priority === 'medium'
                ? 'border-amber-100 bg-white hover:bg-amber-50/30 hover:shadow-md dark:border-amber-900/30 dark:bg-zinc-900 dark:hover:bg-amber-950/10'
                : 'border-zinc-200 bg-white hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="flex items-start gap-2">
                {/* Toggle Switch */}
                {task.status !== 'skipped' && (
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      task.status === 'completed'
                        ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                        : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600'
                    }`}
                    role="switch"
                    aria-checked={task.status === 'completed'}
                    title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        task.status === 'completed' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
                {task.status === 'skipped' && (
                  <button
                    onClick={() => handleUnskipTask(task)}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-red-600 bg-red-600 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    title="Unskip and edit task"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {/* Priority Badge - subtle */}
                    {task.status !== 'completed' && task.status !== 'skipped' && (
                      <>
                        {task.priority === 'high' && (
                          <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
                            HIGH
                          </span>
                        )}
                        {task.priority === 'medium' && (
                          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                            MED
                          </span>
                        )}
                        {task.priority === 'low' && (
                          <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-600 dark:bg-green-950/20 dark:text-green-400">
                            LOW
                          </span>
                        )}
                      </>
                    )}
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
                      <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">🔗</span>
                    )}
                    {task.recurrenceRule && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 shrink-0" title="Recurring task">🔁</span>
                    )}
                    {task.recurringEventId && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0" title={`Series ID: ${task.recurringEventId}`}>📆</span>
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
                    {!task.dueDate && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        📌 No due date
                      </span>
                    )}
                    {task.reminders && task.reminders.length > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        🔔 {task.reminders.length}
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <>
                        {task.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                          <span key={`${task.id}-tag-${tagIndex}`} className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
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
                      <p className="mt-0.5 text-xs text-green-600 dark:text-green-400 wrap-break-word">{task.completionProof}</p>
                    </div>
                  )}
                  
                  {/* Show evidence with AI validation */}
                  {task.status === 'completed' && (
                    <div className="mt-3">
                      <EvidenceList taskId={task.id} />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mobile Actions */}
              <div className="mt-2 flex gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {task.status === 'pending' && (
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
                )}
                {task.status !== 'completed' && task.status !== 'skipped' && (
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setIsRescheduleOpen(true);
                    }}
                    className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20 transition-colors"
                  >
                    Skip
                  </button>
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
              {/* Toggle Switch */}
              {task.status !== 'skipped' && (
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    task.status === 'completed'
                      ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                      : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600'
                  }`}
                  role="switch"
                  aria-checked={task.status === 'completed'}
                  title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      task.status === 'completed' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
              {task.status === 'skipped' && (
                <button
                  onClick={() => handleUnskipTask(task)}
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-red-600 bg-red-600 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  title="Unskip and edit task"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Task Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {/* Priority Badge - subtle */}
                  {task.status !== 'completed' && task.status !== 'skipped' && (
                    <>
                      {task.priority === 'high' && (
                        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/20 dark:text-red-400">
                          HIGH
                        </span>
                      )}
                      {task.priority === 'medium' && (
                        <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                          MED
                        </span>
                      )}
                      {task.priority === 'low' && (
                        <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-950/20 dark:text-green-400">
                          LOW
                        </span>
                      )}
                    </>
                  )}
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
                      {task.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                        <span key={`${task.id}-tag-${tagIndex}`} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
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
                    <p className="mt-0.5 text-xs text-green-600 dark:text-green-400 wrap-break-word">{task.completionProof}</p>
                  </div>
                )}
                
                {/* Show evidence with AI validation */}
                {task.status === 'completed' && (
                  <div className="mt-3">
                    <EvidenceList taskId={task.id} />
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
                  {!task.dueDate && !(task.startTime && task.endTime) && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      📌 No due date
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
                {task.status === 'pending' && (
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
                )}
                {task.status !== 'completed' && task.status !== 'skipped' && (
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
        <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 sm:p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="text-4xl">📝</div>
          <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add your first task to get started{isCalendarConnected ? ' or sync from Google Calendar' : ''}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-95 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Add Task
            </button>
            {isCalendarConnected && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <span className="flex items-center gap-2 justify-center">
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
            taskId={selectedTask.id}
            userId={user?.id || ''}
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

// Goals Filter Dropdown Component
interface GoalsFilterDropdownProps {
  activeFilters: Set<string>;
  onFilterChange: (filters: Set<string>) => void;
  counts: {
    all: number;
    high: number;
    medium: number;
    low: number;
    active: number;
    paused: number;
    completed: number;
    daily: number;
    weekly: number;
    monthly: number;
    annual: number;
  };
}

function GoalsFilterDropdown({ activeFilters, onFilterChange, counts }: GoalsFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const filterGroups = [
    {
      label: 'Priority',
      options: [
        { id: 'high', label: '🔴 High', count: counts.high },
        { id: 'medium', label: '🟡 Medium', count: counts.medium },
        { id: 'low', label: '🟢 Low', count: counts.low },
      ]
    },
    {
      label: 'Status',
      options: [
        { id: 'active', label: 'Active', count: counts.active },
        { id: 'paused', label: 'Paused', count: counts.paused },
        { id: 'completed', label: 'Completed', count: counts.completed },
      ]
    },
    {
      label: 'Time Horizon',
      options: [
        { id: 'daily', label: 'Daily', count: counts.daily },
        { id: 'weekly', label: 'Weekly', count: counts.weekly },
        { id: 'monthly', label: 'Monthly', count: counts.monthly },
        { id: 'annual', label: 'Annual', count: counts.annual },
      ]
    }
  ];

  const toggleFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    if (filterId === 'all') {
      onFilterChange(new Set(['all']));
      return;
    }
    
    // Remove 'all' when selecting specific filters
    newFilters.delete('all');
    
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    
    // If no filters selected, default to 'all'
    if (newFilters.size === 0) {
      newFilters.add('all');
    }
    onFilterChange(newFilters);
  };

  const getActiveFilterLabel = () => {
    if (activeFilters.size === 1 && activeFilters.has('all')) {
      return 'All Goals';
    }
    if (activeFilters.size === 1) {
      const allOptions = filterGroups.flatMap(g => g.options);
      const filter = allOptions.find(f => activeFilters.has(f.id));
      return filter?.label || 'Filters';
    }
    return `${activeFilters.size} Filters`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:px-4"
      >
        <span className="hidden sm:inline">Filters:</span> <span>{getActiveFilterLabel()}</span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 max-h-[80vh] overflow-y-auto">
            <div className="p-2">
              {/* All Goals Option */}
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <input
                  type="checkbox"
                  checked={activeFilters.has('all')}
                  onChange={() => toggleFilter('all')}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
                />
                <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  All Goals
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {counts.all}
                </span>
              </label>

              {/* Separator */}
              <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />

              {/* Filter Groups */}
              {filterGroups.map((group, groupIdx) => (
                <div key={group.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.has(option.id)}
                        onChange={() => toggleFilter(option.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
                      />
                      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {option.label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {option.count}
                      </span>
                    </label>
                  ))}
                  {groupIdx < filterGroups.length - 1 && (
                    <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
                  )}
                </div>
              ))}
            </div>
          </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['all']));
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
  
  // Search query
  const { data: searchResults } = trpc.goal.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length >= 2 }
  );
  
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

  const markAsCompleteMutation = trpc.goal.update.useMutation({
    onSuccess: () => {
      refreshGoals();
    },
  });

  const markAsActiveMutation = trpc.goal.update.useMutation({
    onSuccess: () => {
      refreshGoals();
    },
  });

  const availableRepos = githubActivity?.repositories || [];

  const handleMarkAsComplete = (goal: any) => {
    markAsCompleteMutation.mutate({
      id: goal.id,
      status: 'completed',
    });
  };

  const handleMarkAsActive = (goal: any) => {
    markAsActiveMutation.mutate({
      id: goal.id,
      status: 'active',
    });
  };

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

  // Use search results if search is active, otherwise use normal filtering
  const displayGoals = searchQuery.length >= 2 && searchResults ? searchResults : goals;
  
  // Calculate filter counts
  const allGoals = displayGoals || [];
  const filterCounts = {
    all: allGoals.length,
    high: allGoals.filter((g: any) => g.priority === 'high').length,
    medium: allGoals.filter((g: any) => g.priority === 'medium').length,
    low: allGoals.filter((g: any) => g.priority === 'low').length,
    active: allGoals.filter((g: any) => g.status === 'active').length,
    paused: allGoals.filter((g: any) => g.status === 'paused').length,
    completed: allGoals.filter((g: any) => g.status === 'completed').length,
    daily: allGoals.filter((g: any) => g.timeHorizon === 'daily').length,
    weekly: allGoals.filter((g: any) => g.timeHorizon === 'weekly').length,
    monthly: allGoals.filter((g: any) => g.timeHorizon === 'monthly').length,
    annual: allGoals.filter((g: any) => g.timeHorizon === 'annual').length,
  };

  // Apply filters
  const filteredGoals = allGoals.filter((g: any) => {
    // If 'all' is selected, show everything
    if (activeFilters.has('all')) {
      return true;
    }

    // Check if goal matches any active filter
    const matchesPriority = activeFilters.has(g.priority);
    const matchesStatus = activeFilters.has(g.status);
    const matchesTimeHorizon = g.timeHorizon && activeFilters.has(g.timeHorizon);

    // Goal must match at least one filter from each category that has active filters
    const hasPriorityFilter = Array.from(activeFilters).some(f => ['high', 'medium', 'low'].includes(f));
    const hasStatusFilter = Array.from(activeFilters).some(f => ['active', 'paused', 'completed'].includes(f));
    const hasTimeHorizonFilter = Array.from(activeFilters).some(f => ['daily', 'weekly', 'monthly', 'annual'].includes(f));

    const priorityMatch = !hasPriorityFilter || matchesPriority;
    const statusMatch = !hasStatusFilter || matchesStatus;
    const timeHorizonMatch = !hasTimeHorizonFilter || matchesTimeHorizon;

    return priorityMatch && statusMatch && timeHorizonMatch;
  });
  
  // Define helper function first
  const getTaskCountsForGoal = (goalId: string) => {
    const goalTasks = allTasks?.filter(t => t.goalId === goalId) || [];
    const completed = goalTasks.filter(t => t.status === 'completed').length;
    return { total: goalTasks.length, completed };
  };
  
  // Split goals into active and completed
  const activeGoals = (filteredGoals?.filter((g: any) => g.status !== 'completed') || [])
    .sort((a: any, b: any) => {
      // Priority first (high > medium > low)
      const priorityWeight: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by deadline urgency (closer deadlines first)
      if (a.targetDate && !b.targetDate) return -1;
      if (!a.targetDate && b.targetDate) return 1;
      if (a.targetDate && b.targetDate) {
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }

      // Finally by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const completedGoals = filteredGoals?.filter((g: any) => g.status === 'completed') || [];
  const totalGoals = filteredGoals?.length || 0;
  
  // Calculate stats for summary
  const goalsWithTasks = activeGoals.filter((g: any) => {
    const { total } = getTaskCountsForGoal(g.id);
    return total > 0;
  });
  const onTrackGoals = goalsWithTasks.filter((g: any) => {
    const { total, completed } = getTaskCountsForGoal(g.id);
    return completed / total >= 0.5; // 50% or more completed
  }).length;

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
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-950 pb-4 space-y-4">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between pt-2">
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

        {/* Stats Summary */}
        {totalGoals > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Active</div>
              <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activeGoals.length}</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
              <div className="text-xs font-medium text-green-700 dark:text-green-400">Completed</div>
              <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">{completedGoals.length}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">On Track</div>
              <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">{onTrackGoals}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400">No Tasks</div>
              <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                {activeGoals.length - goalsWithTasks.length}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          onSearch={setSearchQuery}
          placeholder="Search goals..."
          className="w-full sm:w-96"
        />
          {!searchQuery && (
            <GoalsFilterDropdown
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              counts={filterCounts}
            />
          )}
        </div>
      </div>

      {/* Goals List */}
      {totalGoals === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-8 text-center dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 sm:p-12">
          <div className="text-5xl mb-4 sm:text-6xl">🎯</div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2 sm:text-xl">
            Set Your First Goal
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
            Goals help you stay focused and track your progress. Start by creating a goal and break it down into actionable tasks.
          </p>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Goal
          </Button>
        </div>
      ) : activeGoals.length === 0 && completedGoals.length > 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-8 text-center dark:border-green-900 dark:bg-green-950/20 sm:p-12">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-green-900 dark:text-green-50 mb-2">
            All Goals Completed!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300 mb-6">
            Amazing work! You've completed all your goals. Ready to set new ones?
          </p>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create New Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              {activeGoals.map((goal: any) => {
                const { total, completed } = getTaskCountsForGoal(goal.id);
                const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                const daysRemaining = goal.targetDate 
                  ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                
                return (
                <div
                  key={goal.id}
                  className={`rounded-xl border-l-4 p-4 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900 sm:p-6 ${
                    // Priority left border
                    goal.priority === 'high' 
                      ? 'border-l-red-500' 
                      : goal.priority === 'medium' 
                      ? 'border-l-yellow-500' 
                      : 'border-l-green-500'
                  } border-r border-t border-b border-zinc-200 bg-white dark:border-r-zinc-800 dark:border-t-zinc-800 dark:border-b-zinc-800`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header with badges and actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">
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
                          {goal.timeHorizon && (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 text-xs">
                              {goal.timeHorizon}
                            </Badge>
                          )}
                          {daysRemaining !== null && (
                            <Badge className={`text-xs ${
                              daysRemaining < 0 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                : daysRemaining <= 7
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                            }`}>
                              {daysRemaining < 0 
                                ? `${Math.abs(daysRemaining)}d overdue` 
                                : daysRemaining === 0
                                ? 'Due today'
                                : `${daysRemaining}d left`}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Icon buttons for mobile, text buttons for desktop */}
                      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setIsCreateTaskOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 sm:h-9 sm:w-auto sm:px-3"
                          aria-label="Add task"
                          title="Add task to goal"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="ml-1.5 hidden lg:inline">Task</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsComplete(goal)}
                          disabled={markAsCompleteMutation.isPending}
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 sm:h-9 sm:w-auto sm:px-3"
                          aria-label="Mark as complete"
                          title="Mark as complete"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="ml-1.5 hidden lg:inline">Done</span>
                        </Button>
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
                          <span className="ml-1.5 hidden lg:inline">Edit</span>
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
                          <span className="ml-1.5 hidden lg:inline">Delete</span>
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 sm:line-clamp-none">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                          {total === 0 ? (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-900">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            ⚠️ No tasks yet
                          </p>
                          <button
                            onClick={() => {
                              setSelectedGoal(goal);
                              setIsCreateTaskOpen(true);
                            }}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline"
                          >
                            Add first task
                          </button>
                        </div>
                            </div>
                          ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            Progress
                              </span>
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                            {completed}/{total} tasks · {progressPercent}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPercent === 100 
                                ? 'bg-green-600' 
                                : progressPercent >= 50
                                ? 'bg-blue-600'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {goal.targetDate && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {goal.githubRepos && goal.githubRepos.length > 0 && (
                        <span className="flex items-center gap-1">
                          🐙 {goal.githubRepos.length} {goal.githubRepos.length === 1 ? 'repo' : 'repos'}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        📝 {total} {total === 1 ? 'task' : 'tasks'}
                      </span>
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
                );
              })}
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

                          <div className="flex gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsActive(goal)}
                              disabled={markAsActiveMutation.isPending}
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 sm:h-9 sm:w-auto sm:px-3"
                              aria-label="Reopen goal"
                              title="Mark as active"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span className="ml-1.5 hidden sm:inline">Reopen</span>
                            </Button>
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
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
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
function RealityCheck() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(24); // Default: 24 hours
  const [showReflections, setShowReflections] = useState(true); // Default to true so reflections are visible
  const [showPastCheckIns, setShowPastCheckIns] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch today's task comparison
  const { data: comparison, isLoading: comparisonLoading, refetch: refetchComparison } = trpc.dailyCheck.getEveningComparison.useQuery();

  // Fetch all accountability scores for past check-ins
  const { data: allScores } = trpc.accountabilityScore.getAll.useQuery();

  // Set selectedDate to the most recent check-in when data loads
  useEffect(() => {
    if (allScores && allScores.length > 0) {
      console.log('All scores loaded:', allScores);
      const mostRecent = allScores[0];
      console.log('Most recent score:', mostRecent);
      console.log('RoastMetadata:', mostRecent.roastMetadata);
      
      // Only set selectedDate if it's not already set or different
      const mostRecentDate = new Date(mostRecent.weekStart);
      if (!selectedDate || selectedDate.toISOString().split('T')[0] !== mostRecentDate.toISOString().split('T')[0]) {
        setSelectedDate(mostRecentDate);
      }
    }
  }, [allScores]);

  // Fetch GitHub activity with time range
  const { data: githubActivity, isLoading: githubLoading, refetch: refetchGitHub } = trpc.integration.getGitHubActivity.useQuery({
    hours: timeRange,
  });

  // Fetch Google Calendar activity with time range
  const { data: calendarActivity, isLoading: calendarLoading, refetch: refetchCalendar } = trpc.integration.getGoogleCalendarActivity.useQuery({
    hours: timeRange,
  });

  // Debug: Log when showReflections changes
  useEffect(() => {
    console.log('Reality Check - showReflections state changed to:', showReflections);
  }, [showReflections]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Refresh all data: tasks, integrations
    Promise.all([
      new Promise((resolve) => setTimeout(resolve, 800)),
      refetchComparison(),
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
          <div className={`relative shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}>
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

      {/* Today's Task Performance */}
      {comparison && (
        <div className="rounded-xl border border-zinc-200 bg-linear-to-br from-orange-50 to-white p-6 shadow-sm dark:border-zinc-800 dark:from-orange-950/20 dark:to-zinc-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">📊</div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Today's Performance
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                How your plan matched reality
              </p>
            </div>
          </div>

          {/* Helper Text */}
          <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold">💡 Alignment Score:</span> Shows how well you followed your plan today. It&apos;s calculated as: (completed tasks ÷ total planned tasks) × 100. Higher = better execution!
            </p>
          </div>

          {/* Alignment Score */}
          <div className="mb-6 rounded-lg border border-orange-200 bg-white p-4 dark:border-orange-900/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Alignment Score</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  {comparison.stats.completed} of {comparison.stats.total} tasks completed
                </p>
              </div>
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round((comparison.stats.alignmentScore) * 100)}%
              </div>
            </div>
          </div>

          {/* Task Status Legend */}
          <div className="mb-3 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold">Task Status:</span> <span className="text-green-600">✓ Completed</span> · <span className="text-red-600">✗ Skipped</span> · <span className="text-yellow-600">⏱ Pending</span>
            </p>
          </div>

          {/* Toggle Reflections Button */}
          {(() => {
            const hasReflections = comparison.existingReflection && Object.keys(comparison.existingReflection.reflections || {}).length > 0;
            const hasEvidence = comparison.existingReflection && Object.keys(comparison.existingReflection.evidenceUrls || {}).length > 0;
            
            return (hasReflections || hasEvidence) && (
              <button
                onClick={() => {
                  console.log('Toggle reflections clicked. Current state:', showReflections);
                  setShowReflections(!showReflections);
                }}
                className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                <svg className={`h-4 w-4 transition-transform ${showReflections ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showReflections ? 'Hide' : 'Show'} reflections & evidence
                <span className="text-xs text-zinc-500">
                  ({hasReflections && hasEvidence ? 'reasons & proof' : hasReflections ? 'reasons for incomplete tasks' : 'uploaded proof'})
                </span>
              </button>
            );
          })()}

          {/* Task Breakdown */}
          {comparison.tasks && comparison.tasks.length > 0 ? (
            <div className="space-y-2">
              {[...comparison.tasks]
                .sort((a, b) => {
                  const aIncomplete = a.status !== 'completed' ? 0 : 1;
                  const bIncomplete = b.status !== 'completed' ? 0 : 1;
                  return aIncomplete - bIncomplete;
                })
                .map((task: any) => {
                  const reflection = comparison.existingReflection?.reflections?.[task.id];
                  const evidenceUrls = comparison.existingReflection?.evidenceUrls?.[task.id] || [];
                  
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <div className="flex items-start gap-3 p-3">
                        {task.status === 'completed' ? (
                          <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : task.status === 'skipped' ? (
                          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 shrink-0 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                          {task.description && (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{task.description}</p>
                          )}
                          
                          {/* Show reflection if available and toggled on */}
                          {showReflections && reflection && task.status !== 'completed' && (
                            <div className="mt-2 rounded-md bg-blue-50 p-2 dark:bg-blue-950/20 border-l-4 border-blue-500">
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">💭 Your reflection:</p>
                              <p className="text-sm text-blue-800 dark:text-blue-300 italic">&quot;{reflection}&quot;</p>
                            </div>
                          )}
                          
                          {/* Show evidence for completed tasks */}
                          {showReflections && evidenceUrls.length > 0 && task.status === 'completed' && (
                            <div className="mt-2 rounded-md bg-green-50 p-2 dark:bg-green-950/20 border-l-4 border-green-500">
                              <p className="text-xs font-medium text-green-900 dark:text-green-200 mb-1">
                                📎 Evidence uploaded: {evidenceUrls.length} file(s)
                              </p>
                            </div>
                          )}
                        </div>
                        <Badge
                          className={
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : task.status === 'skipped'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
              No tasks planned for today
            </p>
          )}
        </div>
      )}

      {/* Past Check-ins Section */}
      {allScores && allScores.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setShowPastCheckIns(!showPastCheckIns)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Past Check-ins
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  View your reflection history ({allScores.length} check-ins)
                </p>
              </div>
            </div>
            <svg 
              className={`h-5 w-5 text-zinc-500 transition-transform ${showPastCheckIns ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPastCheckIns && (
            <div className="mt-6 space-y-4">
              {/* Quick Stats Overview */}
              {(() => {
                const avgAlignment = allScores.reduce((acc: number, s: any) => acc + (s.alignmentScore || 0), 0) / allScores.length;
                const totalReflections = allScores.reduce((acc: number, s: any) => {
                  const metadata = s.roastMetadata || {};
                  const reflectionCount = Object.keys(metadata.reflections || {}).length;
                  console.log(`Score ID: ${s.id}, Metadata:`, metadata, `Reflection count: ${reflectionCount}`);
                  return acc + reflectionCount;
                }, 0);
                console.log('Total reflections across all scores:', totalReflections);
                const bestDay = allScores.reduce((best: any, s: any) => {
                  return (s.alignmentScore || 0) > (best.alignmentScore || 0) ? s : best;
                }, allScores[0]);
                const recentTrend = allScores.slice(0, 3);
                const trendDirection = recentTrend.length >= 2 
                  ? (recentTrend[0].alignmentScore || 0) - (recentTrend[recentTrend.length - 1].alignmentScore || 0)
                  : 0;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Avg Alignment</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {Math.round(avgAlignment * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Best Day</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {Math.round((bestDay.alignmentScore || 0) * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Check-ins</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {allScores.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Trend</p>
                      <p className={`text-2xl font-bold ${trendDirection > 0 ? 'text-green-600' : trendDirection < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
                        {trendDirection > 0 ? '📈' : trendDirection < 0 ? '📉' : '➡️'} {Math.abs(Math.round(trendDirection * 100))}%
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Patterns & Insights */}
              {(() => {
                // Analyze all reflections for patterns
                const allReflections: string[] = [];
                const excusePatterns: Record<string, number> = {};
                
                allScores.forEach((score: any) => {
                  const metadata = score.roastMetadata || {};
                  const reflections = metadata.reflections || {};
                  Object.values(reflections).forEach((reflection: any) => {
                    if (reflection && typeof reflection === 'string') {
                      allReflections.push(reflection.toLowerCase());
                      
                      const patterns = {
                        'Distracted': /distract|interrupt/i,
                        'Time underestimated': /underestimate|took longer|more time/i,
                        'Tired/exhausted': /tired|exhausted|energy|sleep/i,
                        'Procrastination': /procrastinat|put off|delay/i,
                        'Forgot': /forgot|remember/i,
                        'Unexpected issues': /unexpected|came up|emergency/i,
                        'Priority changed': /priority|changed|urgent/i,
                      };
                      
                      Object.entries(patterns).forEach(([pattern, regex]) => {
                        if (regex.test(reflection)) {
                          excusePatterns[pattern] = (excusePatterns[pattern] || 0) + 1;
                        }
                      });
                    }
                  });
                });

                const topExcuses = Object.entries(excusePatterns)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3);

                if (topExcuses.length > 0) {
                  return (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                      <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-3">
                        🔍 Your Most Common Patterns:
                      </h4>
                      <div className="space-y-2">
                        {topExcuses.map(([pattern, count]) => (
                          <div key={pattern} className="flex items-center justify-between">
                            <span className="text-sm text-orange-800 dark:text-orange-300">{pattern}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 bg-orange-200 dark:bg-orange-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-500 dark:bg-orange-400"
                                  style={{ width: `${(count / allReflections.length) * 100 * 3}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-orange-900 dark:text-orange-200 w-8">
                                {count}×
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Recent Check-ins List */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  Recent Check-ins:
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allScores.slice(0, 10).map((score: any) => {
                    const metadata = score.roastMetadata || {};
                    const reflectionCount = Object.keys(metadata.reflections || {}).length;
                    const alignment = Math.round((score.alignmentScore || 0) * 100);
                    
                    return (
                      <button
                        key={score.id}
                        onClick={() => setSelectedDate(new Date(score.weekStart))}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          selectedDate.toISOString().split('T')[0] === (typeof score.weekStart === 'string' ? score.weekStart : new Date(score.weekStart).toISOString().split('T')[0])
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/20'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {new Date(score.weekStart).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                              {reflectionCount} reflection{reflectionCount !== 1 ? 's' : ''} · {score.completedTasks}/{score.totalTasks} tasks
                            </p>
                          </div>
                          <div className={`text-xl font-bold ${
                            alignment >= 70 ? 'text-green-600' :
                            alignment >= 40 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {alignment}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display selected check-in */}
              {(() => {
                const selectedDateStr = selectedDate.toISOString().split('T')[0];
                const selectedScore = allScores.find((s: any) => {
                  const scoreWeekStart = typeof s.weekStart === 'string' ? s.weekStart : new Date(s.weekStart).toISOString().split('T')[0];
                  return scoreWeekStart === selectedDateStr;
                });
                
                if (!selectedScore) return null;
                
                const metadata = selectedScore.roastMetadata || {};
                const reflections = metadata.reflections || {};
                const evidenceUrls = metadata.evidenceUrls || {};
                const hasReflections = Object.keys(reflections).length > 0;
                const hasEvidence = Object.keys(evidenceUrls).length > 0;

                return (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    {/* Stats */}
                    <div className="mb-4 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                          {Math.round((selectedScore.alignmentScore || 0) * 100)}%
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">Alignment</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                          {selectedScore.completedTasks || 0}/{selectedScore.totalTasks || 0}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">Tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                          {Object.keys(reflections).length}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">Reflections</p>
                      </div>
                    </div>

                    {/* Reflections */}
                    {hasReflections && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                          Your Reflections:
                        </h4>
                        {Object.entries(reflections).map(([taskId, reflection]: [string, any]) => (
                          <div key={taskId} className="rounded-md bg-blue-50 p-3 dark:bg-blue-950/20">
                            <p className="text-sm text-blue-800 dark:text-blue-300 italic">
                              &quot;{reflection}&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Evidence count */}
                    {hasEvidence && (
                      <div className="mt-3 rounded-md bg-green-50 p-3 dark:bg-green-950/20">
                        <p className="text-sm font-medium text-green-900 dark:text-green-200">
                          📎 {Object.values(evidenceUrls).flat().length} evidence file(s) uploaded
                        </p>
                      </div>
                    )}

                    {!hasReflections && !hasEvidence && (
                      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
                        No reflections or evidence recorded for this check-in
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
      <div className="rounded-xl border border-zinc-200 bg-linear-to-br from-red-50 to-orange-50 p-8 dark:border-zinc-800 dark:from-red-950/20 dark:to-orange-950/20">
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
          {/* Helper Text for Metrics */}
          <div className="hidden md:block rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📊 Understanding Your Scores:
            </h4>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
              <p><span className="font-semibold">Alignment Score:</span> How well your actions matched your plans (completed tasks ÷ planned tasks)</p>
              <p><span className="font-semibold">Honesty Score:</span> How truthful you are with yourself based on evidence, reflections, and actual vs claimed completion</p>
              <p><span className="font-semibold">Completion Rate:</span> Percentage of all your tasks (not just today) that you actually finish</p>
              <p><span className="font-semibold">New Projects:</span> Goals you started while existing goals are under 50% complete (red flag for focus issues)</p>
              <p><span className="font-semibold">Evidence Submissions:</span> How many times you uploaded proof of completion (validates honesty)</p>
              <p><span className="font-semibold">Patterns:</span> Recurring behaviors the AI detected in your work habits (based on your data)</p>
            </div>
          </div>

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
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          AI-analyzed observations from your week. Color indicates severity: Red = critical issue, Orange = warning, Green = win!
        </p>
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
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                AI-generated action items based on your patterns and reflections. These are specific steps to improve next week.
              </p>
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
  // Get AppContext refresh function and user
  const { user, refreshIntegrations: refreshAppIntegrations } = useApp();
  
  // Notification hooks
  const { 
    permission, 
    isSupported, 
    isSubscribed, 
    isLoading: notificationLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification 
  } = useNotifications();
  
  const { data: notificationSettings, refetch: refetchSettings } = trpc.notification.getSettings.useQuery();
  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => {
      refetchSettings();
    },
  });
  
  const [notifMorningEnabled, setNotifMorningEnabled] = useState(true);
  const [notifMorningTime, setNotifMorningTime] = useState('09:00');
  const [notifEveningEnabled, setNotifEveningEnabled] = useState(true);
  const [notifEveningTime, setNotifEveningTime] = useState('18:00');
  const [userTimezone, setUserTimezone] = useState('');
  
  // Initialize notification settings
  useEffect(() => {
    if (notificationSettings) {
      setNotifMorningEnabled(notificationSettings.morningCheckEnabled);
      setNotifMorningTime(notificationSettings.morningCheckTime);
      setNotifEveningEnabled(notificationSettings.eveningCheckEnabled);
      setNotifEveningTime(notificationSettings.eveningCheckTime);
      setUserTimezone(notificationSettings.timezone);
    }
  }, [notificationSettings]);
  
  // Detect timezone on mount
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  // Profile management
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = trpc.profile.getCurrent.useQuery();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      refetchProfile();
      setProfileName(profile?.name || '');
    },
  });

  const [profileName, setProfileName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || '');
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
  
  // Notification handlers
  const handleSubscribe = async () => {
    try {
      await subscribe();
      // Save timezone preference
      if (userTimezone) {
        await updateSettings.mutateAsync({ timezone: userTimezone });
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to enable notifications. Please try again.');
    }
  };
  
  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      alert('Failed to disable notifications. Please try again.');
    }
  };
  
  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Failed to send test notification:', error);
      alert('Failed to send test notification. Make sure notifications are enabled.');
    }
  };

  const handleTestMorningNotification = async () => {
    try {
      await sendTestNotification('morning');
    } catch (error) {
      console.error('Failed to send morning test notification:', error);
      alert('Failed to send morning notification. Make sure notifications are enabled.');
    }
  };

  const handleTestEveningNotification = async () => {
    try {
      await sendTestNotification('evening');
    } catch (error) {
      console.error('Failed to send evening test notification:', error);
      alert('Failed to send evening notification. Make sure notifications are enabled.');
    }
  };
  
  const handleSaveNotificationSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        morningCheckEnabled: notifMorningEnabled,
        morningCheckTime: notifMorningTime,
        eveningCheckEnabled: notifEveningEnabled,
        eveningCheckTime: notifEveningTime,
        timezone: userTimezone,
      });
      alert('Notification settings saved!');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      alert('Failed to save notification settings. Please try again.');
    }
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
        <div className="bg-linear-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
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
            {/* Avatar Section - Profile Picture Upload */}
            <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Profile Picture Upload Component */}
                {user && (
                  <ProfilePictureUpload
                    userId={user.id}
                    currentPictureUrl={profile?.profilePicUrl}
                    onUploadComplete={() => {
                      refetchProfile();
                    }}
                  />
                )}

                {/* Avatar Info */}
                <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                  <h4 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    Profile Picture
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    {profile?.profilePicUrl ? 'Click to change your profile picture' : 'Click to upload your profile picture'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Supported: JPEG, PNG, WebP • Max 5MB
                  </p>
                </div>
              </div>
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

      {/* Push Notifications Section */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Push Notifications 🔔
        </h3>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!isSupported ? (
            <div className="text-center py-8">
              <p className="text-zinc-600 dark:text-zinc-400">
                Push notifications are not supported in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Permission Status */}
              <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                    Notification Status
                  </h4>
                  <div className="flex items-center gap-2">
                    {permission === 'granted' && isSubscribed ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        ✓ Enabled
                      </span>
                    ) : permission === 'denied' ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                        ✗ Blocked
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Not Enabled
                      </span>
                    )}
                  </div>
                  {permission === 'denied' && (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      Please enable notifications in your browser settings
                    </p>
                  )}
                  {userTimezone && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      Timezone: {userTimezone}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isSubscribed ? (
                    <button
                      onClick={handleSubscribe}
                      disabled={notificationLoading || permission === 'denied'}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {notificationLoading ? 'Enabling...' : 'Enable Notifications'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleTestNotification}
                        disabled={notificationLoading}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Test
                      </button>
                      <button
                        onClick={handleUnsubscribe}
                        disabled={notificationLoading}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50"
                      >
                        {notificationLoading ? 'Disabling...' : 'Disable'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Notification Settings */}
              {isSubscribed && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Notification Schedule
                  </h4>
                  
                  {/* Morning Check */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notifMorningEnabled}
                          onChange={(e) => setNotifMorningEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            🌅 Morning Planning
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Set priorities for the day
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={notifMorningTime}
                        onChange={(e) => setNotifMorningTime(e.target.value)}
                        disabled={!notifMorningEnabled}
                        className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleTestMorningNotification}
                        disabled={notificationLoading}
                        className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors disabled:opacity-50"
                        title="Test morning notification"
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Evening Check */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notifEveningEnabled}
                          onChange={(e) => setNotifEveningEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            🌙 Evening Reality Check
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Review what you accomplished
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={notifEveningTime}
                        onChange={(e) => setNotifEveningTime(e.target.value)}
                        disabled={!notifEveningEnabled}
                        className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleTestEveningNotification}
                        disabled={notificationLoading}
                        className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors disabled:opacity-50"
                        title="Test evening notification"
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveNotificationSettings}
                    disabled={updateSettings.isPending}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {updateSettings.isPending ? 'Saving...' : 'Save Notification Settings'}
                  </button>
                </div>
              )}
            </div>
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

