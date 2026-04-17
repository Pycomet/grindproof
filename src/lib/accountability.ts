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

export function computeDisciplineScore(
  tasks: { carry_over_count: number; status: string }[],
  totalCreated: number
): number {
  if (tasks.length === 0) return 100;

  const chronicCarryOvers = tasks.filter(
    (t) => t.carry_over_count >= 3
  ).length;
  const carryOverRatio = chronicCarryOvers / tasks.length;
  const carryOverPenalty = Math.min(carryOverRatio * 50, 30);

  const completed = tasks.filter((t) => t.status === "completed").length;
  let overcommitPenalty = 0;
  if (totalCreated > 0 && totalCreated > completed) {
    overcommitPenalty = Math.min(
      ((totalCreated - completed) / totalCreated) * 40,
      20
    );
  }

  return Math.max(0, Math.round(100 - carryOverPenalty - overcommitPenalty));
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
    input.weightedCompletion * 0.55 +
    input.consistencyRate * 0.30 +
    input.disciplineScore * 0.15 +
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
