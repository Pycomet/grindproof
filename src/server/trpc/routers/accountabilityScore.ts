import { z } from "zod";
import { router, protectedProcedure } from "../context";
import {
  computeCompletionRate,
  computeConsistencyRate,
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

async function computeStreak(
  db: any,
  userId: string,
  today: Date
): Promise<number> {
  let streak = 0;
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dayStart = startOfDay(checkDate);
    const dayEnd = endOfDay(checkDate);

    const { count: taskCount } = await db
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("due_date", dayStart)
      .lte("due_date", dayEnd);

    const { count: checkInCount } = await db
      .from("daily_checks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    if ((taskCount ?? 0) > 0 || (checkInCount ?? 0) > 0) {
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
    .select("status, due_date")
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

  const activeDays = new Set([
    ...activeDaysFromTasks,
    ...activeDaysFromCheckIns,
  ]).size;

  return { total, completed, activeDays };
}

export const accountabilityScoreRouter = router({
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
    const stats = await getWindowStats(ctx.db, userId, windowStart, today);

    const currentStreak = await computeStreak(ctx.db, userId, today);

    const completionRate = computeCompletionRate(stats.total, stats.completed);
    const consistencyRate = computeConsistencyRate(
      stats.activeDays,
      WINDOW_DAYS
    );
    const score = computeScore({
      completionRate,
      consistencyRate,
      currentStreak,
    });
    const tier = getTier(score);

    const pastEnd = new Date(today);
    pastEnd.setDate(pastEnd.getDate() - 7);
    const pastStart = new Date(pastEnd);
    pastStart.setDate(pastStart.getDate() - (WINDOW_DAYS - 1));
    const pastStats = await getWindowStats(ctx.db, userId, pastStart, pastEnd);
    const pastCompletionRate = computeCompletionRate(
      pastStats.total,
      pastStats.completed
    );
    const pastConsistencyRate = computeConsistencyRate(
      pastStats.activeDays,
      WINDOW_DAYS
    );
    const pastScore = computeScore({
      completionRate: pastCompletionRate,
      consistencyRate: pastConsistencyRate,
      currentStreak: 0,
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
      completionRate,
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

      const trend: {
        date: string;
        score: number;
        completed: number;
        total: number;
      }[] = [];

      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { data: dayTasks } = await ctx.db
          .from("tasks")
          .select("status")
          .eq("user_id", userId)
          .gte("due_date", dayStart)
          .lte("due_date", dayEnd);

        const tasks = dayTasks || [];
        const total = tasks.length;
        const completed = tasks.filter(
          (t: any) => t.status === "completed"
        ).length;

        const windowStart = new Date(date);
        windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
        const stats = await getWindowStats(
          ctx.db,
          userId,
          windowStart,
          date
        );
        const cr = computeCompletionRate(stats.total, stats.completed);
        const conr = computeConsistencyRate(stats.activeDays, WINDOW_DAYS);
        const dayScore = computeScore({
          completionRate: cr,
          consistencyRate: conr,
          currentStreak: 0,
        });

        trend.push({ date: dateStr, score: dayScore, completed, total });
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
