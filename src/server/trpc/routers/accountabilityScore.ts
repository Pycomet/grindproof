import { z } from "zod";
import { router, protectedProcedure } from "../context";
import {
  computeWeightedCompletion,
  computeCompletionRate,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";

const WINDOW_DAYS = 14;

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Bulk-fetch active dates, then count consecutive days backwards from today. 2 queries total. */
async function computeStreak(
  db: any,
  userId: string,
  today: Date
): Promise<number> {
  const yearAgo = new Date(today);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const [{ data: tasks }, { data: checkIns }] = await Promise.all([
    db
      .from("tasks")
      .select("due_date")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("due_date", startOfDay(yearAgo))
      .lte("due_date", endOfDay(today)),
    db
      .from("daily_checks")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfDay(yearAgo))
      .lte("created_at", endOfDay(today)),
  ]);

  const activeDates = new Set<string>();
  for (const t of tasks || []) {
    activeDates.add(new Date(t.due_date).toISOString().split("T")[0]);
  }
  for (const c of checkIns || []) {
    activeDates.add(new Date(c.created_at).toISOString().split("T")[0]);
  }

  let streak = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (activeDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

async function getWindowStats(
  db: any,
  userId: string,
  windowStart: Date,
  windowEnd: Date
) {
  const { data: tasks } = await db
    .from("tasks")
    .select("status, due_date, priority, carry_over_count")
    .eq("user_id", userId)
    .gte("due_date", startOfDay(windowStart))
    .lte("due_date", endOfDay(windowEnd));

  const allTasks = tasks || [];
  const total = allTasks.length;
  const completed = allTasks.filter(
    (t: any) => t.status === "completed"
  ).length;

  const activeDaysFromTasks = new Set(
    allTasks
      .filter((t: any) => t.status === "completed")
      .map((t: any) => new Date(t.due_date).toISOString().split("T")[0])
  );

  const { data: checkIns } = await db
    .from("daily_checks")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startOfDay(windowStart))
    .lte("created_at", endOfDay(windowEnd));

  const activeDaysFromCheckIns = new Set(
    (checkIns || []).map((c: any) =>
      new Date(c.created_at).toISOString().split("T")[0]
    )
  );

  const activeDaysCompletionsOnly = activeDaysFromTasks.size;
  const activeDaysAll = new Set([
    ...activeDaysFromTasks,
    ...activeDaysFromCheckIns,
  ]).size;

  return { total, completed, activeDaysCompletionsOnly, activeDaysAll, allTasks };
}

export const accountabilityScoreRouter = router({
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
    const stats = await getWindowStats(ctx.db, userId, windowStart, today);

    const currentStreak = await computeStreak(ctx.db, userId, today);

    const weightedCompletion = computeWeightedCompletion(
      stats.allTasks.map((t: any) => ({ status: t.status, priority: t.priority }))
    );
    const consistencyRate = computeConsistencyRate(
      stats.activeDaysCompletionsOnly,
      WINDOW_DAYS
    );
    const disciplineScore = computeDisciplineScore(
      stats.allTasks.map((t: any) => ({
        carry_over_count: t.carry_over_count,
        status: t.status,
      })),
      stats.total
    );

    // Split tasks into this-week and last-week for velocity bonus
    const midPoint = new Date(today);
    midPoint.setDate(midPoint.getDate() - 7);
    const thisWeekTasks = stats.allTasks.filter(
      (t: any) => new Date(t.due_date) > midPoint
    );
    const lastWeekTasks = stats.allTasks.filter(
      (t: any) => new Date(t.due_date) <= midPoint
    );
    const thisWeekRate = computeCompletionRate(
      thisWeekTasks.length,
      thisWeekTasks.filter((t: any) => t.status === "completed").length
    );
    const lastWeekRate = computeCompletionRate(
      lastWeekTasks.length,
      lastWeekTasks.filter((t: any) => t.status === "completed").length
    );
    const velocityBonus = computeVelocityBonus(thisWeekRate, lastWeekRate);

    const score = computeScore({
      weightedCompletion,
      consistencyRate,
      disciplineScore,
      currentStreak,
      velocityBonus,
    });
    const tier = getTier(score);

    const pastEnd = new Date(today);
    pastEnd.setDate(pastEnd.getDate() - 7);
    const pastStart = new Date(pastEnd);
    pastStart.setDate(pastStart.getDate() - (WINDOW_DAYS - 1));
    const pastStats = await getWindowStats(ctx.db, userId, pastStart, pastEnd);

    const pastWeightedCompletion = computeWeightedCompletion(
      pastStats.allTasks.map((t: any) => ({ status: t.status, priority: t.priority }))
    );
    const pastConsistencyRate = computeConsistencyRate(
      pastStats.activeDaysCompletionsOnly,
      WINDOW_DAYS
    );
    const pastDisciplineScore = computeDisciplineScore(
      pastStats.allTasks.map((t: any) => ({
        carry_over_count: t.carry_over_count,
        status: t.status,
      })),
      pastStats.total
    );
    const pastScore = computeScore({
      weightedCompletion: pastWeightedCompletion,
      consistencyRate: pastConsistencyRate,
      disciplineScore: pastDisciplineScore,
      currentStreak: 0,
      velocityBonus: 0,
    });
    const delta = score - pastScore;

    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("status")
      .eq("user_id", userId)
      .gte("due_date", todayStart)
      .lte("due_date", todayEnd);

    const todayTotal = (todayTasks || []).length;
    const todayCompleted = (todayTasks || []).filter(
      (t: any) => t.status === "completed"
    ).length;

    return {
      score,
      tier,
      currentStreak,
      weightedCompletion,
      consistencyRate,
      delta,
      today: { completed: todayCompleted, total: todayTotal },
    };
  }),

  getScoreTrend: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const today = new Date();
      const numDays = input.days === "all" ? 90 : parseInt(input.days);

      // Fetch all data in the full window (numDays + 14 for rolling score) in 2 queries
      const fullWindowStart = new Date(today);
      fullWindowStart.setDate(fullWindowStart.getDate() - (numDays + WINDOW_DAYS - 2));

      const [{ data: allTasks }, { data: allCheckIns }] = await Promise.all([
        ctx.db
          .from("tasks")
          .select("status, due_date")
          .eq("user_id", userId)
          .gte("due_date", startOfDay(fullWindowStart))
          .lte("due_date", endOfDay(today)),
        (ctx.db as any)
          .from("daily_checks")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", startOfDay(fullWindowStart))
          .lte("created_at", endOfDay(today)),
      ]);

      const tasks = allTasks || [];
      const checkIns = allCheckIns || [];

      // Index tasks by date
      const tasksByDate: Record<string, { total: number; completed: number }> = {};
      for (const t of tasks) {
        const dateStr = new Date(t.due_date as string).toISOString().split("T")[0];
        if (!tasksByDate[dateStr]) tasksByDate[dateStr] = { total: 0, completed: 0 };
        tasksByDate[dateStr].total++;
        if (t.status === "completed") tasksByDate[dateStr].completed++;
      }

      // Index check-in dates
      const checkInDates = new Set<string>();
      for (const c of checkIns) {
        checkInDates.add(new Date(c.created_at).toISOString().split("T")[0]);
      }

      // Compute trend in memory
      const trend: { date: string; score: number; completed: number; total: number }[] = [];

      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayStats = tasksByDate[dateStr] || { total: 0, completed: 0 };

        // Compute rolling 14-day window stats in memory
        let windowTotal = 0;
        let windowCompleted = 0;
        const windowActiveDays = new Set<string>();

        for (let w = 0; w < WINDOW_DAYS; w++) {
          const wDate = new Date(date);
          wDate.setDate(wDate.getDate() - w);
          const wDateStr = wDate.toISOString().split("T")[0];
          const wStats = tasksByDate[wDateStr];
          if (wStats) {
            windowTotal += wStats.total;
            windowCompleted += wStats.completed;
            if (wStats.completed > 0) windowActiveDays.add(wDateStr);
          }
          if (checkInDates.has(wDateStr)) windowActiveDays.add(wDateStr);
        }

        // Approximate using flat completion rate — per-task priority not available in aggregated index
        const cr = computeCompletionRate(windowTotal, windowCompleted);
        const conr = computeConsistencyRate(windowActiveDays.size, WINDOW_DAYS);
        // Streak and velocity omitted from trend: expensive to compute per-day and bonus is small.
        // disciplineScore approximated as 100 since carry_over_count not in the aggregated index.
        const dayScore = computeScore({
          weightedCompletion: cr,
          consistencyRate: conr,
          disciplineScore: 100,
          currentStreak: 0,
          velocityBonus: 0,
        });

        trend.push({ date: dateStr, score: dayScore, completed: dayStats.completed, total: dayStats.total });
      }

      const currentStreak = await computeStreak(ctx.db, userId, today);

      return { trend, currentStreak };
    }),

  getActivityHeatmap: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const today = new Date();
      const numDays = input.days === "all" ? 90 : parseInt(input.days);

      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - (numDays - 1));

      const { data: tasks } = await ctx.db
        .from("tasks")
        .select("status, due_date")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("due_date", startOfDay(windowStart))
        .lte("due_date", endOfDay(today));

      const countByDate: Record<string, number> = {};
      for (const task of tasks || []) {
        const dateStr = new Date(task.due_date as string).toISOString().split("T")[0];
        countByDate[dateStr] = (countByDate[dateStr] || 0) + 1;
      }

      const heatmap: { date: string; count: number }[] = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        heatmap.push({ date: dateStr, count: countByDate[dateStr] || 0 });
      }

      return { heatmap };
    }),
});
