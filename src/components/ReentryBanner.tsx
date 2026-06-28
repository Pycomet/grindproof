"use client";

import { useEffect, useMemo } from "react";

import { trpc } from "@/lib/trpc/client";

export function ReentryBanner() {
  const { data, isLoading } = trpc.retention.getReentryState.useQuery();
  const utils = trpc.useUtils();
  const markReengaged = trpc.retention.markReengagedFromLink.useMutation({
    onSuccess: () => {
      utils.retention.getReentryState.invalidate();
      utils.accountabilityScore.getRecentEvents.invalidate();
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const day = params.get("day");
    const sig = params.get("sig");

    if (!uid || !day || !sig || markReengaged.isPending || markReengaged.isSuccess) {
      return;
    }

    markReengaged.mutate({ uid, day, sig });

    params.delete("uid");
    params.delete("day");
    params.delete("sig");

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [markReengaged]);

  const copy = useMemo(() => {
    if (!data) return null;

    if (data.isReturningFromBadWeek) {
      return {
        title: "Brutal week. Most people quit here.",
        body: "Keep the standard for the work. Keep the door open for yourself. One tap: plan tomorrow.",
        cta: "Plan tomorrow",
      };
    }

    return {
      title: "Yesterday was logged as missed.",
      body: "That wasn't a missed task. It was a missed day. Plan now and reset the week.",
      cta: "Plan today",
    };
  }, [data]);

  if (isLoading || markReengaged.isPending || !data?.shouldShowReentry || !copy) {
    return null;
  }

  return (
    <div className="rounded-md border border-border border-l-2 border-l-tier-grinding bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{copy.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.body}</p>
        </div>
        <a
          href="/dashboard"
          className="shrink-0 rounded-full bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-900 transition-opacity hover:opacity-90"
        >
          {copy.cta}
        </a>
      </div>
    </div>
  );
}
