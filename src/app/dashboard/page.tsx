"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TaskList } from "@/components/TaskList";
import { GoalList } from "@/components/GoalList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { MorningCheckIn } from "@/components/MorningCheckIn";
import { EveningCheckIn } from "@/components/EveningCheckIn";
import { WeeklyRoastCard } from "@/components/WeeklyRoastCard";
import { ChatPanel } from "@/components/ChatPanel";
import { useEffect } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function shouldShowMorning(): boolean {
  const hour = new Date().getHours();
  return hour < 11;
}

function shouldShowEvening(): boolean {
  const hour = new Date().getHours();
  return hour >= 17;
}

function DashboardContent() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <WeeklyRoastCard />

      {shouldShowMorning() && <MorningCheckIn />}
      {shouldShowEvening() && <EveningCheckIn />}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Today&apos;s Tasks
        </h2>
        <TaskList />
        <div className="mt-2">
          <AddTaskForm />
        </div>
      </div>

      <GoalList />
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TaskProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
              <Logo size="md" href="/" />
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">{getGreeting()}</span>
                <button
                  onClick={signOut}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <DashboardContent />
          <ChatPanel />
        </div>
      </NotificationProvider>
    </TaskProvider>
  );
}
