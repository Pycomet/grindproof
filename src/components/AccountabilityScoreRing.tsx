"use client";

const RING_STROKE_COLORS: Record<string, string> = {
  red: "#f87171",
  orange: "#fb923c",
  amber: "#fbbf24",
  green: "#4ade80",
  purple: "#a78bfa",
};

interface Props {
  score: number;
  color: string;
  size?: number;
  /** Stroke width relative to size; default keeps it visually consistent. */
  strokeWidth?: number;
  /** Optional label override (defaults to the score). */
  label?: string;
}

export function AccountabilityScoreRing({
  score,
  color,
  size = 64,
  strokeWidth = 4,
  label,
}: Props) {
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const stroke = RING_STROKE_COLORS[color] || RING_STROKE_COLORS.purple;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Accountability score ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-zinc-200 dark:stroke-zinc-800"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-zinc-900 dark:text-white">
        {label ?? score}
      </div>
    </div>
  );
}
