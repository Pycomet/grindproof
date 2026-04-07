import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      {/* Nav */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-4">
            <Link
              href="/how-it-works"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              How It Works
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-3xl text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="xl" href="/" />
          </div>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Track what you plan. Prove what you did. Get roasted for the gap.
            <br />
            <span className="text-base text-zinc-500">
              The accountability app that actually calls out your BS.
            </span>
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="w-full rounded-full bg-brand px-8 py-4 text-base font-semibold text-brand-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/how-it-works"
              className="w-full rounded-full border-2 border-zinc-300 px-8 py-4 text-base font-semibold text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-900 sm:w-auto"
            >
              How It Works
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-zinc-200 pt-12 dark:border-zinc-800">
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                9am
              </div>
              <div className="mt-1 text-sm text-zinc-500">Morning Plan</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                6pm
              </div>
              <div className="mt-1 text-sm text-zinc-500">Reality Check</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Sun
              </div>
              <div className="mt-1 text-sm text-zinc-500">Weekly Roast</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-200 bg-white/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              &copy; {new Date().getFullYear()} GrindProof. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Terms
              </Link>
              <a
                href="mailto:support@grindproof.co"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
