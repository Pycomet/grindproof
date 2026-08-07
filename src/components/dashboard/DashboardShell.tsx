"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Logo } from "@/components/Logo";
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

/**
 * One page width, declared once.
 *
 * The header and the content column previously set their own max-widths
 * (`max-w-xl` vs `max-w-7xl`) and centred independently, which put the logo
 * 352px right of the first card and stranded 284px of empty container on the
 * right. Both boxes share this constant so they cannot drift apart again.
 *
 * 576 (main) + 24 (lg:gap-6) + 380 (aside) + 32 (px-4 both sides) = 1012
 */
const SHELL = "mx-auto w-full max-w-[1012px] px-4";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function shouldShowMorning(): boolean {
  return new Date().getHours() < 11;
}

function shouldShowEvening(): boolean {
  return new Date().getHours() >= 17;
}

function DashboardContent() {
  return (
    <div className={`${SHELL} lg:flex lg:gap-6 py-6 pb-20 lg:pb-6`}>
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

/**
 * The dashboard surface itself, with no auth gate. `/dashboard` wraps this in
 * its session check; the design-QA harness renders it against fixtures. Both
 * share this one definition so the surface can't drift between them.
 */
export function DashboardShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className={`${SHELL} flex items-center justify-between py-4`}>
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
