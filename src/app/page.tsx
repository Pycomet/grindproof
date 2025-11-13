'use client';

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      {/* Hero Section */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          {/* Logo/Brand */}
          <div className="mb-8 flex justify-center">
            <Logo size="xl" href="/" />
          </div>

          {/* Tagline */}
          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Track what you plan. Prove what you did. Get roasted for the gap.
            <br />
            <span className="text-base text-zinc-500">
              The accountability app that actually calls out your BS.
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="group relative w-full overflow-hidden rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 -translate-x-full bg-zinc-800 transition-transform group-hover:translate-x-0 dark:bg-zinc-200"></div>
            </Link>
            
            <Link
              href="/how-it-works"
              className="w-full rounded-full border-2 border-zinc-300 px-8 py-4 text-base font-semibold text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-900 sm:w-auto"
            >
              How It Works
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-zinc-200 pt-12 dark:border-zinc-800">
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">9am</div>
              <div className="mt-1 text-sm text-zinc-500">Morning Plan</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">6pm</div>
              <div className="mt-1 text-sm text-zinc-500">Reality Check</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Sun</div>
              <div className="mt-1 text-sm text-zinc-500">Weekly Roast</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
