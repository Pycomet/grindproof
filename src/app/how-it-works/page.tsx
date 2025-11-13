'use client';

import Link from 'next/link';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Grindproof
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            How Grindproof Works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Three simple steps to stop lying to yourself and actually get shit done.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-12">
          {/* Step 1 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Morning Planning (9am)
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  We pull your tasks from Google Calendar and show you what you planned.
                </p>
                <div className="mt-6 rounded-lg bg-zinc-50 p-4 font-mono text-sm dark:bg-zinc-800">
                  <div className="text-zinc-600 dark:text-zinc-400">
                    Your calendar says: &apos;Work on AI Assistant 2-4pm&apos;
                  </div>
                  <div className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Also planned: &apos;Gym at 6pm&apos;
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Commit
                    </span>
                    <span className="rounded bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      ↻ Reschedule
                    </span>
                    <span className="rounded bg-zinc-100 px-3 py-1 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                      ✗ Skip
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xl font-bold text-white">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Task Validation System
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  We automatically verify what we can. For everything else, we ask for proof.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-950/20">
                    <h3 className="font-semibold text-green-900 dark:text-green-200">
                      Auto-Validated via APIs
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-300">
                      <li>• Dev work → GitHub commits</li>
                      <li>• Meetings → Calendar attendance</li>
                      <li>• Writing → Google Docs last modified</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 dark:bg-orange-950/20">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-200">
                      Self-Reported with Evidence
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-orange-800 dark:text-orange-300">
                      <li>• Gym → Upload workout selfie or Strava screenshot</li>
                      <li>• Video editing → Share project file screenshot</li>
                      <li>• Reading → What&apos;s one key takeaway?</li>
                      <li>• Studying → Summarize what you learned in 2 sentences</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white">
                3
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Evening Reality Check (6pm)
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  We compare what you planned vs. what you actually did. No sugar-coating.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Planned: AI Assistant work
                    </div>
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      GitHub shows: 0 commits to ai-assistant, 6 commits to random-fork
                    </div>
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      What happened?{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        [Got distracted]
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      You said you went to gym. Upload proof:
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      Skipped proof 3 times this week. Honesty score: 42%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus: Weekly Roast */}
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-8 shadow-sm dark:border-red-900 dark:from-red-950/20 dark:to-orange-950/20">
            <div className="flex items-start gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-orange-600 text-xl font-bold text-white">
                🔥
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Weekly Roast Report (Sundays)
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Every Sunday, we compile the most brutally honest summary of your week.
                </p>
                <div className="mt-6 rounded-lg bg-white p-6 font-mono text-sm dark:bg-zinc-900">
                  <div className="text-2xl font-bold text-red-600">Alignment Score: 23%</div>
                  <ul className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                    <li>• Planned AI work 5x → Did it 1x</li>
                    <li>• &quot;Gym&quot; 4x → Proved it 1x</li>
                    <li>• Started 2 new projects instead</li>
                    <li className="text-green-600 dark:text-green-400">
                      • Most honest day: Tuesday
                    </li>
                    <li className="text-red-600 dark:text-red-400">
                      • Biggest bullshit day: Thursday
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ready to Stop Bullshitting? Let&apos;s Go
          </Link>
        </div>
      </main>
    </div>
  );
}

