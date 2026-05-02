"use client";

interface Props {
  streak: number;
  color: string; // red | orange | amber | green | purple
  size?: number;
}

const HEX: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  purple: "#a855f7",
};

// Ember — tiny dim teardrop, barely alive
function EmberFlame({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes ember-pulse {
          0%   { opacity: 0.35; }
          100% { opacity: 0.55; }
        }
        .ember { animation: ember-pulse 3s ease-in-out infinite alternate; }
      `}</style>
      <path
        className="ember"
        d="M20 30 C14 30 11 25 11 21 C11 17 14 14 17 11 C18 9 19 7 20 5 C21 7 22 9 23 11 C26 14 29 17 29 21 C29 25 26 30 20 30Z"
        fill="#9f9f9f"
        opacity="0.45"
      />
      <path
        className="ember"
        d="M20 28 C16 28 14 24.5 14 22 C14 20 16 18 18 16 C18.8 15 19.4 13.5 20 12 C20.6 13.5 21.2 15 22 16 C24 18 26 20 26 22 C26 24.5 24 28 20 28Z"
        fill="#ef4444"
        opacity="0.15"
      />
    </svg>
  );
}

// Kindling — small warm flame, orange, slight flicker
function KindlingFlame({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes kindle-flicker {
          0%   { transform-origin: bottom center; transform: scaleY(1) scaleX(1);   opacity: 0.85; }
          50%  { transform-origin: bottom center; transform: scaleY(1.05) scaleX(0.97); opacity: 1;    }
          100% { transform-origin: bottom center; transform: scaleY(0.97) scaleX(1.02); opacity: 0.9;  }
        }
        .kindle { animation: kindle-flicker 2.4s ease-in-out infinite alternate; }
      `}</style>
      <path
        className="kindle"
        d="M20 32 C13 32 9 26 9 21 C9 16 13 12 16 8 C17.5 5.5 19 3 20 1 C21 3 22.5 5.5 24 8 C27 12 31 16 31 21 C31 26 27 32 20 32Z"
        fill="#f97316"
        opacity="0.9"
      />
      <path
        className="kindle"
        d="M20 28 C16 28 13.5 24 13.5 21 C13.5 18 16 15.5 18 13 C18.8 14 19.5 15.5 20 17 C20.5 15.5 21.2 14 22 13 C24 15.5 26.5 18 26.5 21 C26.5 24 24 28 20 28Z"
        fill="#fed7aa"
        opacity="0.5"
      />
    </svg>
  );
}

// Burning — medium amber/yellow flame, more motion
function BurningFlame({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes burn-flicker {
          0%   { transform-origin: 50% 100%; transform: scaleY(1)    scaleX(1);    opacity: 0.9;  }
          40%  { transform-origin: 50% 100%; transform: scaleY(1.08) scaleX(0.96); opacity: 1;    }
          70%  { transform-origin: 50% 100%; transform: scaleY(0.96) scaleX(1.03); opacity: 0.95; }
          100% { transform-origin: 50% 100%; transform: scaleY(1.04) scaleX(0.98); opacity: 1;    }
        }
        .burn { animation: burn-flicker 2s ease-in-out infinite alternate; }
      `}</style>
      {/* Outer amber body */}
      <path
        className="burn"
        d="M20 34 C11 34 7 27 7 21 C7 15 11 10 15 6 C16.5 3.5 18.5 1.5 20 0 C21.5 1.5 23.5 3.5 25 6 C29 10 33 15 33 21 C33 27 29 34 20 34Z"
        fill="#f59e0b"
      />
      {/* Mid yellow core */}
      <path
        className="burn"
        d="M20 30 C14.5 30 12 25.5 12 22 C12 18.5 14.5 15.5 17 13 C18 14.5 18.8 16.5 20 18 C21.2 16.5 22 14.5 23 13 C25.5 15.5 28 18.5 28 22 C28 25.5 25.5 30 20 30Z"
        fill="#fde68a"
        opacity="0.8"
      />
      {/* Hot center */}
      <path
        d="M20 27 C17.5 27 16 24.5 16 22.5 C16 21 17 19.5 18.5 18.5 C19 19.5 19.5 20.8 20 21.5 C20.5 20.8 21 19.5 21.5 18.5 C23 19.5 24 21 24 22.5 C24 24.5 22.5 27 20 27Z"
        fill="white"
        opacity="0.4"
      />
    </svg>
  );
}

// Raging — tall green flame, white-hot center
function RagingFlame({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes rage-flicker {
          0%   { transform-origin: 50% 100%; transform: scaleY(1)    scaleX(1);    opacity: 1;    }
          30%  { transform-origin: 50% 100%; transform: scaleY(1.1)  scaleX(0.95); opacity: 0.95; }
          60%  { transform-origin: 50% 100%; transform: scaleY(0.97) scaleX(1.04); opacity: 1;    }
          100% { transform-origin: 50% 100%; transform: scaleY(1.06) scaleX(0.97); opacity: 0.97; }
        }
        @keyframes rage-side {
          0%   { opacity: 0.6; }
          100% { opacity: 0.9; }
        }
        .rage-main { animation: rage-flicker 1.8s ease-in-out infinite alternate; }
        .rage-side { animation: rage-side 1.4s ease-in-out infinite alternate; }
      `}</style>
      {/* Side wisps */}
      <path
        className="rage-side"
        d="M14 32 C10 32 8 28 8 25 C8 22 10 19.5 12 17 C12.8 18.5 13.2 20.5 13.5 22 C14.5 20 15.5 18 17 16 C15 19 14 22 14 25 C14 27.5 14.5 30 14 32Z"
        fill="#22c55e"
        opacity="0.5"
      />
      <path
        className="rage-side"
        d="M26 32 C30 32 32 28 32 25 C32 22 30 19.5 28 17 C27.2 18.5 26.8 20.5 26.5 22 C25.5 20 24.5 18 23 16 C25 19 26 22 26 25 C26 27.5 25.5 30 26 32Z"
        fill="#22c55e"
        opacity="0.5"
      />
      {/* Main body */}
      <path
        className="rage-main"
        d="M20 35 C10.5 35 6 27.5 6 21 C6 14.5 10.5 9 15 5 C16.5 2.5 18.5 0.5 20 0 C21.5 0.5 23.5 2.5 25 5 C29.5 9 34 14.5 34 21 C34 27.5 29.5 35 20 35Z"
        fill="#22c55e"
      />
      {/* Core */}
      <path
        className="rage-main"
        d="M20 31 C14 31 11 26 11 22 C11 18 14 15 17 12 C18 14 19 16.5 20 18 C21 16.5 22 14 23 12 C26 15 29 18 29 22 C29 26 26 31 20 31Z"
        fill="#86efac"
        opacity="0.7"
      />
      {/* White hot center */}
      <path
        d="M20 27 C17 27 15.5 24 15.5 22 C15.5 20 17 18 18.5 17 C19 18.2 19.5 19.8 20 21 C20.5 19.8 21 18.2 21.5 17 C23 18 24.5 20 24.5 22 C24.5 24 23 27 20 27Z"
        fill="white"
        opacity="0.65"
      />
    </svg>
  );
}

// Nuclear — towering purple/white multi-layer glow
function NuclearFlame({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes nuclear-main {
          0%   { transform-origin: 50% 100%; transform: scaleY(1)    scaleX(1);    opacity: 1;    }
          25%  { transform-origin: 50% 100%; transform: scaleY(1.12) scaleX(0.93); opacity: 0.95; }
          55%  { transform-origin: 50% 100%; transform: scaleY(0.95) scaleX(1.05); opacity: 1;    }
          80%  { transform-origin: 50% 100%; transform: scaleY(1.08) scaleX(0.96); opacity: 0.97; }
          100% { transform-origin: 50% 100%; transform: scaleY(1.02) scaleX(0.99); opacity: 1;    }
        }
        @keyframes nuclear-glow {
          0%   { opacity: 0.35; }
          100% { opacity: 0.6;  }
        }
        @keyframes nuclear-inner {
          0%   { opacity: 0.7; }
          100% { opacity: 1;   }
        }
        .nuke-glow  { animation: nuclear-glow  2.2s ease-in-out infinite alternate; }
        .nuke-main  { animation: nuclear-main  1.6s ease-in-out infinite alternate; }
        .nuke-inner { animation: nuclear-inner 1.2s ease-in-out infinite alternate; }
      `}</style>
      {/* Outer purple glow halo */}
      <ellipse
        className="nuke-glow"
        cx="20"
        cy="30"
        rx="13"
        ry="5"
        fill="#a855f7"
        opacity="0.3"
      />
      {/* Wide outer corona */}
      <path
        className="nuke-glow"
        d="M20 36 C8 36 3 28 3 21 C3 14 7.5 8.5 12 4.5 C14 2.5 17 0.5 20 0 C23 0.5 26 2.5 28 4.5 C32.5 8.5 37 14 37 21 C37 28 32 36 20 36Z"
        fill="#a855f7"
        opacity="0.35"
      />
      {/* Main purple body */}
      <path
        className="nuke-main"
        d="M20 34 C11 34 7 27 7 21 C7 15 11 10 15 6 C16.8 3.5 18.8 1 20 0 C21.2 1 23.2 3.5 25 6 C29 10 33 15 33 21 C33 27 29 34 20 34Z"
        fill="#a855f7"
      />
      {/* Mid violet layer */}
      <path
        className="nuke-main"
        d="M20 30 C13.5 30 11 25.5 11 22 C11 18.5 13.5 15.5 16.5 12.5 C17.5 14 18.5 16 20 17.5 C21.5 16 22.5 14 23.5 12.5 C26.5 15.5 29 18.5 29 22 C29 25.5 26.5 30 20 30Z"
        fill="#d8b4fe"
        opacity="0.75"
      />
      {/* Inner bright core */}
      <path
        className="nuke-inner"
        d="M20 26 C17 26 15 23.5 15 21.5 C15 19.5 16.5 17.5 18.5 16.5 C19 17.8 19.5 19.3 20 20.5 C20.5 19.3 21 17.8 21.5 16.5 C23.5 17.5 25 19.5 25 21.5 C25 23.5 23 26 20 26Z"
        fill="white"
        opacity="0.5"
      />
      {/* Tip spark */}
      <path
        className="nuke-inner"
        d="M20 5 C19.3 6.5 18.8 8 19.5 9.5 C20 10.5 20 11.5 20 12 C20 11.5 20 10.5 20.5 9.5 C21.2 8 20.7 6.5 20 5Z"
        fill="white"
        opacity="0.6"
      />
    </svg>
  );
}

const FLAME_COMPONENTS: Record<
  string,
  React.ComponentType<{ size: number }>
> = {
  red: EmberFlame,
  orange: KindlingFlame,
  amber: BurningFlame,
  green: RagingFlame,
  purple: NuclearFlame,
};

const TIER_TEXT_COLORS: Record<string, string> = {
  red: "text-tier-slacking",
  orange: "text-tier-warming",
  amber: "text-tier-grinding",
  green: "text-tier-locked",
  purple: "text-tier-proven",
};

export function StreakFlame({ streak, color, size = 40 }: Props) {
  const FlameComponent = FLAME_COMPONENTS[color] ?? NuclearFlame;
  const textColor = TIER_TEXT_COLORS[color] ?? "text-tier-proven";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <FlameComponent size={size} />
      <span
        className={`font-mono text-sm font-bold tabular-nums ${textColor}`}
      >
        {streak}
      </span>
    </div>
  );
}
