"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ChatPanel } from "@/components/ChatPanel";

export default function CoachPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.push("/auth/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
              GrindProof Coach
            </h1>
            <p className="text-[11px] text-zinc-500">AI Accountability</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 56px)" }}>
        <ChatPanel docked />
      </div>
    </div>
  );
}
