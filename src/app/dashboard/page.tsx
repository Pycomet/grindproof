"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { TaskList } from "@/components/TaskList";
import { GoalList } from "@/components/GoalList";

import { MorningCheckIn } from "@/components/MorningCheckIn";
import { EveningCheckIn } from "@/components/EveningCheckIn";
import { WeeklyRoastCard } from "@/components/WeeklyRoastCard";
import { StoicQuote } from "@/components/StoicQuote";
import { ChatPanel } from "@/components/ChatPanel";
import { AccountabilityWidget } from "@/components/AccountabilityWidget";
import { Day1Orientation } from "@/components/Day1Orientation";
import { ReentryBanner } from "@/components/ReentryBanner";
import { SetupChecklistCard } from "@/components/setup/SetupChecklistCard";
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
    <div className="mx-auto max-w-7xl lg:flex lg:gap-6 px-4 py-6 pb-20 lg:pb-6">
      <main className="flex-1 lg:max-w-xl space-y-3">
        <SetupChecklistCard />
        <Day1Orientation />
        <ReentryBanner />
        <AccountabilityWidget />
        <StoicQuote />
        <WeeklyRoastCard />

        {shouldShowMorning() && <MorningCheckIn />}
        {shouldShowEvening() && <EveningCheckIn />}

        <TaskList />

        <GoalList />
      </main>
      <aside className="hidden lg:block lg:w-[380px] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <ChatPanel docked />
      </aside>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{getGreeting()}</span>
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <DashboardContent />
    </div>
  );
}
