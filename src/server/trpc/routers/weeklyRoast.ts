import { router, protectedProcedure } from "../context";

// Note: weekly_roasts table is created by the MVP v2 migration but
// Supabase types have not been regenerated yet. Using `as any` for
// the table name and casting the result until types are updated.
export const weeklyRoastRouter = router({
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await (ctx.db as any)
      .from("weekly_roasts")
      .select("id, week_start, week_end, roast_data, task_stats, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const row = data as any;
    return {
      id: row.id as string,
      weekStart: row.week_start as string,
      weekEnd: row.week_end as string,
      roastData: row.roast_data as {
        weekSummary: string;
        insights: { emoji: string; text: string; severity: string }[];
        recommendations: string[];
      },
      taskStats: row.task_stats as {
        total: number;
        completed: number;
        skipped: number;
        pending: number;
        completionRate: number;
      },
      createdAt: row.created_at as string,
    };
  }),
});
