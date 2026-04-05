import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-50">404</h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Page not found
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
