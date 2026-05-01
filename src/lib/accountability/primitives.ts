/**
 * Pure scoring primitives. No I/O, no Date math beyond what's passed in.
 *
 * The score is a weighted blend of three components plus two bounded bonuses:
 *
 *   score = 0.60·weightedCompletion
 *         + 0.30·consistencyRate
 *         + 0.10·disciplineScore
 *         + streakBonus      (0..5)
 *         + velocityBonus    (-5..5)
 *
 * The previous formula (0.55/0.30/0.15) double-counted incomplete tasks: the
 * "overcommit" branch of disciplineScore was algebraically (1 − completionRate)
 * repackaged, so a single skipped task lowered both weightedCompletion and
 * disciplineScore. The overcommit branch is gone; chronic carry-over is now
 * the only signal disciplineScore tracks, and weightedCompletion absorbs the
 * weight that used to live in the duplicated penalty.
 */

const PRIORITY_WEIGHTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function computeWeightedCompletion(
  tasks: { status: string; priority: string }[]
): number {
  if (tasks.length === 0) return 0;
  let completedWeight = 0;
  let totalWeight = 0;
  for (const t of tasks) {
    const w = PRIORITY_WEIGHTS[t.priority] ?? 1;
    totalWeight += w;
    if (t.status === "completed") completedWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((completedWeight / totalWeight) * 100);
}

export function computeCompletionRate(
  totalTasks: number,
  completedTasks: number
): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

export function computeConsistencyRate(
  activeDays: number,
  windowDays: number
): number {
  if (windowDays === 0) return 0;
  return (activeDays / windowDays) * 100;
}

/**
 * Penalize chronic carry-over only. A task that's been rolled forward 3+
 * times signals avoidance: it should be broken down, delegated, or dropped.
 * Cap at 30 so a chronically messy week can't single-handedly tank the
 * score — overall completion still dominates.
 */
export function computeDisciplineScore(
  tasks: { carry_over_count: number; status: string }[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _legacyTotalCreated?: number
): number {
  if (tasks.length === 0) return 100;

  const chronicCarryOvers = tasks.filter(
    (t) => t.carry_over_count >= 3
  ).length;
  const carryOverRatio = chronicCarryOvers / tasks.length;
  const carryOverPenalty = Math.min(carryOverRatio * 50, 30);

  return Math.max(0, Math.round(100 - carryOverPenalty));
}

export function computeVelocityBonus(
  currentRate: number,
  previousRate: number
): number {
  if (previousRate === 0) return 0;
  const change = (currentRate - previousRate) / previousRate;
  if (Math.abs(change) < 0.1) return 0;
  const raw = Math.sign(change) * Math.min(Math.abs(change) * 10, 5);
  return Math.round(Math.max(-5, Math.min(5, raw)));
}

export function computeStreakBonus(currentStreak: number): number {
  if (currentStreak < 7) return 0;
  return Math.min(currentStreak - 6, 5);
}

export function computeScore(input: {
  weightedCompletion: number;
  consistencyRate: number;
  disciplineScore: number;
  currentStreak: number;
  velocityBonus: number;
}): number {
  const raw =
    input.weightedCompletion * 0.6 +
    input.consistencyRate * 0.3 +
    input.disciplineScore * 0.1 +
    computeStreakBonus(input.currentStreak) +
    input.velocityBonus;
  return Math.min(Math.max(Math.round(raw), 0), 100);
}

export type Tier = {
  name: "Slacking" | "Warming Up" | "Grinding" | "Locked In" | "Proven";
  color: "red" | "orange" | "amber" | "green" | "purple";
};

export function getTier(score: number): Tier {
  if (score >= 90) return { name: "Proven", color: "purple" };
  if (score >= 75) return { name: "Locked In", color: "green" };
  if (score >= 60) return { name: "Grinding", color: "amber" };
  if (score >= 40) return { name: "Warming Up", color: "orange" };
  return { name: "Slacking", color: "red" };
}

/**
 * Tier hysteresis: only allow the tier to drop after the score has been below
 * the threshold for at least `requiredBelow` consecutive prior snapshots.
 * Upward moves are immediate. Prevents the daily 89↔90 flip between
 * "Locked In" and "Proven".
 */
export function getTierWithHysteresis(
  score: number,
  priorScores: number[],
  requiredBelow = 3
): Tier {
  const naive = getTier(score);
  if (priorScores.length === 0) return naive;
  const previousTier = getTier(priorScores[0]);

  // Tier upgrades take effect immediately.
  if (tierRank(naive) >= tierRank(previousTier)) return naive;

  // Tier downgrade: require the score to have been below the previous tier's
  // threshold for `requiredBelow` consecutive snapshots (today included).
  const threshold = lowerBoundOf(previousTier);
  let consecutiveBelow = 1; // today
  for (const s of priorScores) {
    if (s < threshold) consecutiveBelow++;
    else break;
    if (consecutiveBelow >= requiredBelow) return naive;
  }
  return previousTier;
}

function tierRank(t: Tier): number {
  switch (t.name) {
    case "Slacking":
      return 0;
    case "Warming Up":
      return 1;
    case "Grinding":
      return 2;
    case "Locked In":
      return 3;
    case "Proven":
      return 4;
  }
}

function lowerBoundOf(t: Tier): number {
  switch (t.name) {
    case "Proven":
      return 90;
    case "Locked In":
      return 75;
    case "Grinding":
      return 60;
    case "Warming Up":
      return 40;
    case "Slacking":
      return 0;
  }
}
