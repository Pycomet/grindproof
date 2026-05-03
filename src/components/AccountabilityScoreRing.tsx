"use client";

const RING_STROKE_COLORS: Record<string, string> = {
  red: "#f87171",
  orange: "#fb923c",
  amber: "#fbbf24",
  green: "#4ade80",
  purple: "#a78bfa",
};

const TIER_TEXT_COLORS: Record<string, string> = {
  red: "text-tier-slacking",
  orange: "text-tier-warming",
  amber: "text-tier-grinding",
  green: "text-tier-locked",
  purple: "text-tier-proven",
};

const NEXT_TIER_AT: Record<string, number | null> = {
  red: 40,
  orange: 60,
  amber: 75,
  green: 90,
  purple: null,
};

interface Props {
  score: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showNextTier?: boolean;
  /** When true the arc sweeps in from empty on mount */
  animated?: boolean;
}

export function AccountabilityScoreRing({
  score,
  color,
  size = 64,
  strokeWidth = 4,
  label,
  showNextTier = false,
  animated = false,
}: Props) {
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const stroke = RING_STROKE_COLORS[color] || RING_STROKE_COLORS.purple;
  const textColor = TIER_TEXT_COLORS[color] || "text-tier-proven";

  const nextAt = NEXT_TIER_AT[color] ?? null;
  // Clamp to avoid negative "pts to next" when score is at or past a boundary
  const ptsToNext = nextAt !== null ? Math.max(0, nextAt - score) : null;

  // Notch dot at the tip of the progress arc
  const progressAngleRad = -Math.PI / 2 + (clamped / 100) * 2 * Math.PI;
  const notchX = center + radius * Math.cos(progressAngleRad);
  const notchY = center + radius * Math.sin(progressAngleRad);

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: size }}
      role="img"
      aria-label={`Accountability score ${score} out of 100`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {animated && (
            <style>{`
              @keyframes ring-sweep-${size} {
                from { stroke-dashoffset: ${circumference.toFixed(2)}; }
                to   { stroke-dashoffset: ${offset.toFixed(2)}; }
              }
              .ring-sweep-${size} {
                animation: ring-sweep-${size} 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            `}</style>
          )}
          {/* Track: tier color at low opacity */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={0.15}
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animated ? circumference : offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            className={animated ? `ring-sweep-${size}` : undefined}
          />
          {/* Notch dot at arc tip — hidden at 100% since linecap already marks it */}
          {clamped > 0 && clamped < 100 && (
            <circle
              cx={notchX}
              cy={notchY}
              r={strokeWidth * 0.8}
              fill={stroke}
            />
          )}
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums ${textColor}`}
        >
          {label ?? score}
        </div>
      </div>
      {showNextTier && ptsToNext !== null && ptsToNext > 0 && (
        <div className="mt-1 text-[10px] tabular-nums text-zinc-400">
          {ptsToNext} pts to next
        </div>
      )}
      {showNextTier && ptsToNext === null && (
        <div className="mt-1 text-[10px] text-tier-proven">Max tier</div>
      )}
    </div>
  );
}
