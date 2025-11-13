'use client';

import { useState } from 'react';
import Link from 'next/link';

type ViewMode = 'morning' | 'evening' | 'weekly';

export default function Dashboard() {
  const [view, setView] = useState<ViewMode>('morning');
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Grindproof
            </Link>
            <div className="text-sm text-zinc-500">{currentTime}</div>
          </div>
        </div>
      </header>

      {/* View Tabs */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setView('morning')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                view === 'morning'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              🌅 Morning Plan
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {view === 'morning' && <MorningPlan />}
        {view === 'evening' && <EveningCheck />}
        {view === 'weekly' && <WeeklyRoast />}
      </main>
    </div>
  );
}

// Morning Planning Component
function MorningPlan() {
  const tasks = [
    {
      id: 1,
      title: 'Work on AI Assistant',
      time: '2:00 PM - 4:00 PM',
      source: 'Google Calendar',
      type: 'auto' as const,
    },
    {
      id: 2,
      title: 'Gym Session',
      time: '6:00 PM',
      source: 'Google Calendar',
      type: 'evidence' as const,
    },
    {
      id: 3,
      title: 'Team Standup',
      time: '10:00 AM',
      source: 'Google Calendar',
      type: 'auto' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Good Morning 👋
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Here's what you planned for today. Confirm or adjust:
        </p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {task.title}
                  </h3>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {task.type === 'auto' ? '🤖 Auto-tracked' : '📸 Needs proof'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                  <span>⏰ {task.time}</span>
                  <span>• {task.source}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                ✓ Commit
              </button>
              <button className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                ↻ Reschedule
              </button>
              <button className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800">
                ✗ Skip
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full rounded-lg border-2 border-dashed border-zinc-300 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-400">
        + Add Custom Task
      </button>
    </div>
  );
}

// Evening Reality Check Component
function EveningCheck() {
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
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Reality Check Time 🔍
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Let's see how your day actually went:
        </p>
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

