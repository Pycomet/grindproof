"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AccountabilityScoreRing } from "./AccountabilityScoreRing";

export const TIER_ORDER = ["red", "orange", "amber", "green", "purple"];

const TIER_NAMES: Record<string, string> = {
  red: "Slacking",
  orange: "Warming Up",
  amber: "Grinding",
  green: "Locked In",
  purple: "Proven",
};

const TIER_MESSAGES: Record<string, string> = {
  orange: "You showed up. That's where it starts — now hold it.",
  amber: "Momentum is building. Don't break the chain.",
  green: "You're in a zone most people never reach.",
  purple: "Peak tier. Rare. Don't waste it.",
};

const TIER_BG: Record<string, string> = {
  red: "bg-tier-slacking",
  orange: "bg-tier-warming",
  amber: "bg-tier-grinding",
  green: "bg-tier-locked",
  purple: "bg-tier-proven",
};

const TIER_TEXT: Record<string, string> = {
  red: "text-tier-slacking",
  orange: "text-tier-warming",
  amber: "text-tier-grinding",
  green: "text-tier-locked",
  purple: "text-tier-proven",
};

interface Props {
  fromColor: string;
  toColor: string;
  toName: string;
  score: number;
  onClose: () => void;
}

export function TierUpModal({ fromColor, toColor, toName, score, onClose }: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 800);
    const t2 = setTimeout(() => setPhase(3), 2000);
    const t3 = setTimeout(onClose, 6400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onClose]);

  const fromName = TIER_NAMES[fromColor] ?? fromColor;
  const message = TIER_MESSAGES[toColor] ?? "Keep going.";
  const toIdx = TIER_ORDER.indexOf(toColor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-[280px] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 text-zinc-600 transition-colors hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Phase 1: previous tier */}
        {phase === 1 && (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Previous tier
            </p>
            <span className={`text-xl font-bold ${TIER_TEXT[fromColor] ?? "text-zinc-400"}`}>
              {fromName}
            </span>
            <TierProgressBar activeColor={fromColor} upToColor={fromColor} />
          </div>
        )}

        {/* Phase 2: ring sweeping in */}
        {phase === 2 && (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              New tier unlocked
            </p>
            <AccountabilityScoreRing
              score={score}
              color={toColor}
              size={96}
              strokeWidth={6}
              animated
            />
            <TierProgressBar activeColor={toColor} upToColor={toColor} />
          </div>
        )}

        {/* Phase 3: full reveal */}
        {phase === 3 && (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <AccountabilityScoreRing
              score={score}
              color={toColor}
              size={80}
              strokeWidth={5}
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                You are now
              </p>
              <p className={`mt-1 text-2xl font-bold tracking-tight ${TIER_TEXT[toColor] ?? "text-tier-proven"}`}>
                {toName}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{message}</p>
            <TierProgressBar activeColor={toColor} upToColor={toColor} />
            <button
              onClick={onClose}
              className="mt-1 rounded-md bg-zinc-800 px-6 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Let&apos;s go
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TierProgressBar({
  activeColor,
  upToColor,
}: {
  activeColor: string;
  upToColor: string;
}) {
  const upToIdx = TIER_ORDER.indexOf(upToColor);
  return (
    <div className="flex gap-1">
      {TIER_ORDER.map((t, i) => (
        <div
          key={t}
          className={`h-1 w-6 rounded-full transition-all ${TIER_BG[t]} ${
            i <= upToIdx ? "opacity-100" : "opacity-15"
          }`}
        />
      ))}
    </div>
  );
}
