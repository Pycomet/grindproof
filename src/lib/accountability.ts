// src/lib/accountability.ts

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

export function computeStreakBonus(currentStreak: number): number {
  if (currentStreak < 7) return 0;
  return Math.min(currentStreak - 6, 5);
}

export function computeScore(input: {
  completionRate: number;
  consistencyRate: number;
  currentStreak: number;
}): number {
  const raw =
    input.completionRate * 0.6 +
    input.consistencyRate * 0.4 +
    computeStreakBonus(input.currentStreak);
  return Math.min(Math.round(raw), 100);
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
