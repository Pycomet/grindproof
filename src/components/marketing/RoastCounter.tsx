import { Flame } from "lucide-react";
import { getRoastCount, type RoastCountDisplay } from "@/lib/marketing/roast-count";

async function loadDisplay(): Promise<RoastCountDisplay> {
  try {
    const result = await getRoastCount();
    return result.display;
  } catch (err) {
    console.error("[RoastCounter] failed to load count:", err);
    return { mode: "hidden" };
  }
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export async function RoastCounter() {
  const display = await loadDisplay();

  if (display.mode === "hidden") return null;

  const label =
    display.mode === "weekly"
      ? "roasts delivered this week"
      : "roasts delivered";

  return (
    <div
      data-testid="roast-counter"
      data-mode={display.mode}
      className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300"
    >
      <Flame className="h-4 w-4 text-brand" aria-hidden="true" />
      <span>
        <span className="font-semibold text-zinc-50 font-[family-name:var(--font-geist-mono)] tabular-nums">
          {formatCount(display.count)}
        </span>{" "}
        {label}
      </span>
    </div>
  );
}
