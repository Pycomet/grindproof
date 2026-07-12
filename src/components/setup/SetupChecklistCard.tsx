"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { getPlatform, isStandalone } from "@/lib/setup/device";

export function SetupChecklistCard() {
  const utils = trpc.useUtils();
  const { data } = trpc.profile.getSetupState.useQuery();
  const { isSubscribed } = useNotificationContext();
  const dismiss = trpc.profile.setSetupState.useMutation({
    onSuccess: () => utils.profile.getSetupState.invalidate(),
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !data || data.setupState !== "pending") return null;

  const platform = getPlatform(navigator.userAgent);
  const installDone = platform !== "ios-safari" || isStandalone();

  const rows = [
    { label: "Install the app", done: installDone },
    { label: "Turn on notifications", done: isSubscribed },
    { label: "Receive a test roast", done: false },
  ];

  return (
    <div className="mb-6 rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-50">
          Setup: {rows.filter((r) => r.done).length} of {rows.length} done
        </p>
        <button
          onClick={() => dismiss.mutate({ setupState: "dismissed" })}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.label}
            href="/dashboard/setup"
            className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-zinc-50"
          >
            {row.done ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <X className="h-4 w-4 text-zinc-600" />
            )}
            <span className={row.done ? "line-through opacity-60" : ""}>
              {row.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
