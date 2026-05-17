import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Flame, Check, AlertTriangle, XCircle } from "lucide-react";
import { RoastCounter } from "@/components/marketing/RoastCounter";

export const revalidate = 3600;

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-zinc-700 bg-zinc-900/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/how-it-works"
              className="hidden whitespace-nowrap text-sm text-zinc-300 transition-colors hover:text-zinc-50 sm:inline"
            >
              How It Works
            </Link>
            <Link
              href="/auth/login"
              className="whitespace-nowrap text-sm text-zinc-300 transition-colors hover:text-zinc-50"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 sm:px-5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl">
            {/* Hero Headline */}
            <h1 className="text-6xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1.05] text-zinc-50 max-w-3xl font-[family-name:var(--font-space-grotesk)]">
              Track what you plan.<br />
              Prove what you did.<br />
              <span className="text-brand">Get roasted for the gap.</span>
            </h1>

            {/* Bite Sub-line */}
            <p className="mt-6 text-xl text-zinc-300 max-w-2xl">
              Stop lying to yourself. The accountability app that calls out your BS — every morning, every evening, and once a week with the receipts.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-base font-semibold text-brand-foreground transition-opacity duration-150 hover:opacity-90"
              >
                Stop Bullshitting — Sign Up
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-8 py-4 text-base font-semibold text-zinc-50 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900"
              >
                See How It Works
              </Link>
            </div>

            {/* Stat tiles */}
            <div className="mt-16 grid grid-cols-3 gap-6 border-t border-zinc-800 pt-12 max-w-2xl">
              <div>
                <div className="text-3xl font-bold text-zinc-50 font-[family-name:var(--font-geist-mono)]">9am</div>
                <div className="mt-1 text-sm text-zinc-400">Plan the day</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-zinc-50 font-[family-name:var(--font-geist-mono)]">6pm</div>
                <div className="mt-1 text-sm text-zinc-400">Reckon with it</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-zinc-50 font-[family-name:var(--font-geist-mono)]">Sun</div>
                <div className="mt-1 text-sm text-zinc-400">Get the receipts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Preview Section */}
        <div className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-zinc-50 mb-12 text-center font-[family-name:var(--font-space-grotesk)]">
              What you actually see
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Morning Check-in mockup */}
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                <p className="mb-3 text-xs font-semibold text-zinc-50">Morning Check-in</p>
                <p className="mb-3 text-xs text-zinc-300">
                  You left 3 tasks unfinished yesterday. Carry over?
                </p>
                <div className="mb-3 space-y-2">
                  {[
                    { label: "Write project proposal", checked: true },
                    { label: "Review pull requests", checked: true },
                    { label: "Reply to client email", checked: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <div
                        className={`h-4 w-4 rounded border-2 ${
                          item.checked
                            ? "border-zinc-50 bg-zinc-50"
                            : "border-zinc-600"
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

              {/* Evening Reality Check mockup */}
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                <p className="mb-3 text-xs font-semibold text-zinc-50">Evening Reality Check</p>
                <p className="mb-3 text-xs text-zinc-300">2 tasks still pending. What happened?</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Write project proposal</span>
                      <div className="flex gap-1">
                        <span className="rounded bg-green-900/40 px-2 py-1 text-xs text-green-400">
                          Done
                        </span>
                        <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                          Skipped
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Review pull requests</span>
                      <div className="flex gap-1">
                        <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                          Done
                        </span>
                        <span className="rounded bg-red-900/40 px-2 py-1 text-xs text-red-400">
                          Skipped
                        </span>
                      </div>
                    </div>
                    <input
                      readOnly
                      value="ran out of time after the long meeting"
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Weekly Roast Block */}
        <div className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-zinc-50 mb-12 text-center font-[family-name:var(--font-space-grotesk)]">
              What Sunday looks like
            </h2>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-50">
                  <Flame className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-zinc-50 mb-4 font-[family-name:var(--font-space-grotesk)]">
                    Weekly Roast Report
                  </h3>
                  <div className="rounded-md border border-zinc-800 bg-zinc-900 p-5 text-sm">
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
        </div>

        {/* Final CTA */}
        <div className="px-4 py-16 text-center">
          <RoastCounter />
          <Link
            href="/auth/signup"
            className="inline-block rounded-full bg-brand px-8 py-4 text-base font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            Ready to Stop Bullshitting? Let&apos;s Go
          </Link>
        </div>
      </main>

      {/* Footer */}
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
