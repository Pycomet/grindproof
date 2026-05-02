'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Flame, Check, AlertTriangle, XCircle } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" href="/" />
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/auth/login"
                className="whitespace-nowrap text-sm text-zinc-300 transition-colors hover:text-zinc-50"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 sm:px-6"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-50 sm:text-5xl font-[family-name:var(--font-space-grotesk)]">
            How Grindproof Works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-300">
            Three simple steps to stop lying to yourself and actually get shit done.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-12">
          {/* Step 1 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-foreground font-[family-name:var(--font-geist-mono)] tabular-nums">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-50 font-[family-name:var(--font-space-grotesk)]">
                  Morning Planning
                </h2>
                <p className="mt-2 text-zinc-300">
                  Every morning, Grindproof surfaces the tasks you didn&apos;t finish
                  yesterday and makes you decide — carry them forward or start fresh.
                  No quietly forgetting them.
                </p>
                <div className="mt-6 rounded-md border border-zinc-700 bg-zinc-950 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                    Morning Check-in
                  </p>
                  <p className="mb-3 text-xs text-zinc-400">
                    You left 3 tasks unfinished yesterday. Carry over?
                  </p>
                  <div className="mb-3 space-y-2">
                    {[
                      { label: 'Write project proposal', checked: true },
                      { label: 'Review pull requests', checked: true },
                      { label: 'Reply to client email', checked: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        <div
                          className={`h-4 w-4 rounded border-2 ${
                            item.checked
                              ? 'border-zinc-50 bg-zinc-50'
                              : 'border-zinc-600'
                          }`}
                        />
                        <span className="text-zinc-300">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-900">
                      Carry over 2 tasks
                    </span>
                    <span className="rounded-full border border-zinc-600 px-3 py-1 text-xs font-medium text-zinc-300">
                      Skip, fresh start
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  After you decide, your AI coach weighs in — calling out if you&apos;re
                  overcommitting or making a smart call.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xl font-bold text-zinc-50 font-[family-name:var(--font-geist-mono)] tabular-nums">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-50 font-[family-name:var(--font-space-grotesk)]">
                  Task &amp; Goal Tracking
                </h2>
                <p className="mt-2 text-zinc-300">
                  Add tasks with due dates and priorities, link them to goals, and track
                  progress through a today view or full-week view. You decide what matters.
                  The app just holds you to it.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-md border border-zinc-700 bg-zinc-950 p-4">
                    <h3 className="font-semibold text-zinc-50">
                      Manual Task Management
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                      <li>• Create tasks with due dates and priority levels</li>
                      <li>• Link tasks to goals to see real progress</li>
                      <li>• Switch between Today view and Week view</li>
                    </ul>
                  </div>
                  <div className="rounded-md border border-zinc-700 bg-zinc-950 p-4">
                    <h3 className="font-semibold text-zinc-50">Goal Progress</h3>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                      <li>• Goals show a live progress bar based on completed tasks</li>
                      <li>• Click any goal to see all its linked tasks</li>
                      <li>• Active goals are always visible — no hiding from them</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs">
                  <div className="mb-2 flex items-center justify-between text-zinc-400">
                    <span>Launch side project</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                      4/7 tasks
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full w-[57%] rounded-full bg-zinc-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xl font-bold text-zinc-50 font-[family-name:var(--font-geist-mono)] tabular-nums">
                3
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-50 font-[family-name:var(--font-space-grotesk)]">
                  Evening Reality Check
                </h2>
                <p className="mt-2 text-zinc-300">
                  At the end of the day, every pending task gets reviewed. Mark it done or
                  mark it skipped — but if you skipped it, you have to say why. One line.
                  That&apos;s it. No excuses, just honesty.
                </p>
                <div className="mt-6 rounded-md border border-zinc-700 bg-zinc-950 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                    Evening Reality Check
                  </p>
                  <p className="mb-3 text-xs text-zinc-400">
                    2 tasks still pending. What happened?
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">
                          Write project proposal
                        </span>
                        <div className="flex gap-1">
                          <span className="rounded-sm bg-green-500/15 px-2 py-1 text-xs text-green-400">
                            Done
                          </span>
                          <span className="rounded-sm bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                            Skipped
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">
                          Review pull requests
                        </span>
                        <div className="flex gap-1">
                          <span className="rounded-sm bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                            Done
                          </span>
                          <span className="rounded-sm bg-red-500/15 px-2 py-1 text-xs text-red-400">
                            Skipped
                          </span>
                        </div>
                      </div>
                      <input
                        readOnly
                        value="ran out of time after the long meeting"
                        className="w-full rounded-sm border border-zinc-700 bg-transparent px-2 py-1 text-xs text-zinc-400"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  Once you submit, your AI coach reads the whole picture and calls out
                  patterns — consistently skipping the same task type, or giving credit
                  when you actually delivered.
                </p>
              </div>
            </div>
          </div>

          {/* Bonus: Weekly Roast */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-50">
                <Flame className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-50 font-[family-name:var(--font-space-grotesk)]">
                  Weekly Roast Report
                </h2>
                <p className="mt-2 text-zinc-300">
                  Every week, the AI compiles your task stats, spots patterns you&apos;d
                  rather ignore, and tells you exactly what to do differently. No fluff.
                </p>
                <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-5 text-sm">
                  <div className="mb-3 flex gap-3 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums">
                    <span className="text-green-400">68% done</span>
                    <span className="text-zinc-400">17/25 tasks</span>
                    <span className="text-zinc-400">4 skipped</span>
                  </div>
                  <p className="mb-3 text-zinc-300">
                    Solid execution Monday through Wednesday, then you fell off a cliff.
                    Thursday and Friday were a write-off. You know why.
                  </p>
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-400" />
                      <span className="text-green-400">
                        5-day streak on deep work tasks — keep that up
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-400" />
                      <span className="text-zinc-400">
                        You skipped &quot;admin tasks&quot; every single day this week
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
                      <span className="text-red-400">
                        3 tasks carried over 4+ times — either do them or delete them
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-400">Recommendations</p>
                    <p className="text-xs text-zinc-300">
                      Schedule admin tasks before 10am when your avoidance instincts are still asleep.
                    </p>
                    <p className="text-xs text-zinc-300">
                      Cut your daily task count by 2 — you&apos;re consistently overplanning Thursday onward.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/auth/signup"
            className="inline-block rounded-full bg-brand px-8 py-4 text-base font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            Ready to Stop Bullshitting? Let&apos;s Go
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-zinc-400">
              &copy; {new Date().getFullYear()} GrindProof. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                Terms
              </Link>
              <a
                href="mailto:support@grindproof.co"
                className="text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
