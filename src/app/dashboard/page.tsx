'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { MobileSwipeView } from '@/components/MobileSwipeView';

type ViewMode = 'today' | 'evening' | 'weekly' | 'integrations';

export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('today');
  const [user, setUser] = useState<User | null>(null);
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const views = [
    {
      id: 'today',
      emoji: '✓',
      title: 'Today',
      content: <TodayView />,
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
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Grindproof
            </Link>
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
              ✓ Today
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
        {view === 'today' && <TodayView />}
        {view === 'evening' && <EveningCheck />}
        {view === 'weekly' && <WeeklyRoast />}
        {view === 'integrations' && <Integrations />}
      </main>

      {/* Persistent FAB (Floating Action Button) */}
      <button
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
    </div>
  );
}

// Today View Component
function TodayView() {
  const [activeFilter, setActiveFilter] = useState('today');
  
  const allTasks = [
    {
      id: 1,
      title: 'Work on AI Assistant',
      status: 'todo' as const,
      validation: 'auto' as const,
      source: 'GitHub',
      dueDate: 'today',
    },
    {
      id: 2,
      title: 'Gym session',
      status: 'todo' as const,
      validation: 'evidence' as const,
      source: 'Manual',
      dueDate: 'today',
    },
    {
      id: 3,
      title: 'Team standup',
      status: 'done' as const,
      validation: 'auto' as const,
      source: 'Calendar',
      dueDate: 'today',
    },
    {
      id: 4,
      title: 'Review pull requests',
      status: 'todo' as const,
      validation: 'auto' as const,
      source: 'GitHub',
      dueDate: 'week',
    },
    {
      id: 5,
      title: 'Client presentation prep',
      status: 'todo' as const,
      validation: 'evidence' as const,
      source: 'Manual',
      dueDate: 'week',
    },
    {
      id: 6,
      title: 'Write documentation',
      status: 'done' as const,
      validation: 'auto' as const,
      source: 'GitHub',
      dueDate: 'week',
    },
    {
      id: 7,
      title: 'Quarterly planning meeting',
      status: 'done' as const,
      validation: 'auto' as const,
      source: 'Calendar',
      dueDate: 'week',
    },
    {
      id: 8,
      title: 'Update resume',
      status: 'todo' as const,
      validation: 'evidence' as const,
      source: 'Manual',
      dueDate: 'overdue',
    },
    {
      id: 9,
      title: 'Refactor auth module',
      status: 'todo' as const,
      validation: 'auto' as const,
      source: 'GitHub',
      dueDate: 'overdue',
    },
  ];

  const filteredTasks = allTasks.filter(task => {
    if (activeFilter === 'today') return task.dueDate === 'today';
    if (activeFilter === 'week') return task.dueDate === 'today' || task.dueDate === 'week';
    if (activeFilter === 'overdue') return task.dueDate === 'overdue';
    return true; // 'all'
  });

  const filters = [
    { id: 'today', label: 'Today', count: allTasks.filter(t => t.dueDate === 'today').length },
    { id: 'week', label: 'This Week', count: allTasks.filter(t => t.dueDate === 'today' || t.dueDate === 'week').length },
    { id: 'overdue', label: 'Overdue', count: allTasks.filter(t => t.dueDate === 'overdue').length },
    { id: 'all', label: 'All', count: allTasks.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Today's Tasks ✓
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {filteredTasks.filter(t => t.status === 'done').length} of {filteredTasks.length} completed
        </p>
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
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-lg border p-4 transition-all ${
              task.status === 'done'
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                : 'border-zinc-200 bg-white hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button 
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  task.status === 'done'
                    ? 'border-green-600 bg-green-600'
                    : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700'
                }`}
              >
                {task.status === 'done' && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${
                    task.status === 'done'
                      ? 'text-zinc-500 line-through dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-zinc-50'
                  }`}>
                    {task.title}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {task.validation === 'auto' ? '🤖' : '📸'} {task.source}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {task.status !== 'done' && (
                <div className="flex gap-1">
                  <button className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                    ✏️
                  </button>
                  <button className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                    ⏭
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State / Add Task */}
      {filteredTasks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="text-4xl">📝</div>
          <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add your first task to get started
          </p>
          <button className="mt-4 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}

// Evening Reality Check Component
function EveningCheck() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 800);
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
            Let's see how your day actually went:
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
  const weekData = {
    alignmentScore: 23,
    totalPlanned: 15,
    totalCompleted: 5,
    honestyScore: 42,
    insights: [
      {
        emoji: '💻',
        text: 'Planned AI work 5x → Did it 1x',
        severity: 'high' as const,
      },
      {
        emoji: '💪',
        text: '"Gym" 4x → Proved it 1x',
        severity: 'high' as const,
      },
      {
        emoji: '🚀',
        text: 'Started 2 new projects instead',
        severity: 'medium' as const,
      },
      {
        emoji: '✅',
        text: 'Most honest day: Tuesday',
        severity: 'positive' as const,
      },
      {
        emoji: '🚩',
        text: 'Biggest bullshit day: Thursday',
        severity: 'high' as const,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-red-50 to-orange-50 p-8 dark:border-zinc-800 dark:from-red-950/20 dark:to-orange-950/20">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Weekly Roast Report 🔥
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Time to face the music. Here's how you really did this week:
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500">Alignment Score</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-5xl font-bold text-red-600">{weekData.alignmentScore}%</div>
            <div className="mb-2 text-sm text-zinc-500">
              {weekData.totalCompleted}/{weekData.totalPlanned} tasks
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-red-600 transition-all"
              style={{ width: `${weekData.alignmentScore}%` }}
            ></div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500">Honesty Score</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-5xl font-bold text-orange-600">{weekData.honestyScore}%</div>
            <div className="mb-2 text-sm text-zinc-500">proof provided</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-orange-600 transition-all"
              style={{ width: `${weekData.honestyScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          The Uncomfortable Truth
        </h3>
        <div className="mt-4 space-y-3">
          {weekData.insights.map((insight, idx) => (
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

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button className="rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
          I'll Do Better Next Week 💪
        </button>
      </div>
    </div>
  );
}

// Integrations Component
function Integrations() {
  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      icon: '🐙',
      description: 'Track commits, PRs, and validate dev work automatically',
      connected: false,
      stats: null,
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: '📅',
      description: 'Sync events and track meeting attendance',
      connected: false,
      stats: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Connected Services 🔗
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Link your accounts to automatically track and validate your tasks
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{integration.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {integration.name}
                    </h3>
                    {integration.connected ? (
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
                    {integration.description}
                  </p>

                  {integration.connected && integration.stats && (
                    <div className="mt-3 flex gap-4 text-sm">
                      <span className="text-zinc-500">@username</span>
                      <span className="text-zinc-500">12 commits today</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {integration.connected ? (
                <div className="flex gap-2">
                  <button className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                    Manage
                  </button>
                  <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  Connect {integration.name}
                </button>
              )}
            </div>
          </div>
        ))}
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

