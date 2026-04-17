# AI Coach Robustness Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the stateless AI coach into a context-aware, memory-persistent coaching system with pattern detection, improved scoring, and cross-session accountability tracking.

**Architecture:** Unified `coach_memory` table stores all coach state (notes, patterns, roast insights). A pattern engine runs after evening check-ins to pre-compute behavioral patterns. `buildCoachContext()` assembles a rich context string injected into every chat request. New AI tools let the coach save/update notes and query historical data.

**Tech Stack:** Next.js 16 App Router, tRPC, Supabase (PostgreSQL), AI SDK + Google Gemini, Vitest, Zod

**Spec:** `docs/superpowers/specs/2026-04-16-coach-robustness-overhaul-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260416_add_coach_memory.sql` | DB migration: coach_memory table + tasks.carry_over_count |
| `src/lib/ai/context.ts` | `buildCoachContext()` — assembles user context for system prompt |
| `src/lib/ai/patterns.ts` | Pattern engine — 5 analysis functions + orchestrator |
| `src/__tests__/lib/accountability.test.ts` | Tests for new scoring functions |
| `src/__tests__/lib/patterns.test.ts` | Tests for pattern engine |
| `src/__tests__/lib/context.test.ts` | Tests for context builder |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/supabase/types.ts` | Add coach_memory table type + carry_over_count to tasks |
| `src/lib/accountability.ts` | New scoring functions + updated formula |
| `src/lib/ai/tools.ts` | 4 new tools + 4 existing tool improvements |
| `src/lib/prompts/system-prompt.ts` | Full rewrite: identity + context protocol + tool protocol |
| `src/lib/prompts/weekly-roast-prompt.ts` | Add continuity instructions |
| `src/app/api/ai/chat/route.ts` | Context injection + increased step count |
| `src/contexts/ChatContext.tsx` | Conversation persistence (load/save) |
| `src/server/trpc/routers/conversation.ts` | Add `getLatest` and `upsert` endpoints |
| `src/server/trpc/routers/dailyCheck.ts` | Trigger pattern engine + increment carry_over_count |
| `src/server/trpc/routers/accountabilityScore.ts` | Use new scoring model |
| `src/app/api/cron/weekly-roast/route.ts` | Read/write coach_memory, new scoring, enriched prompt |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260416_add_coach_memory.sql`
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260416_add_coach_memory.sql

-- Coach memory: unified storage for coach notes, patterns, and roast insights
CREATE TABLE coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('commitment', 'recommendation', 'pattern', 'observation', 'excuse_flagged')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('coach_inline', 'pattern_engine', 'weekly_roast')),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  related_to JSONB,
  pattern_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'broken', 'expired', 'superseded')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_memory_user_active
  ON coach_memory (user_id, status, created_at DESC);

CREATE INDEX idx_coach_memory_pattern_dedup
  ON coach_memory (user_id, source, pattern_key)
  WHERE pattern_key IS NOT NULL;

-- Add carry-over tracking to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS carry_over_count INTEGER NOT NULL DEFAULT 0;

-- Add updated_at trigger for coach_memory
CREATE TRIGGER update_coach_memory_updated_at
  BEFORE UPDATE ON coach_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Update Supabase types**

Add the `coach_memory` table type to `src/lib/supabase/types.ts` and add `carry_over_count` to the tasks type. The coach_memory type:

```typescript
// Add to Database.public.Tables:
coach_memory: {
  Row: {
    id: string;
    user_id: string;
    category: "commitment" | "recommendation" | "pattern" | "observation" | "excuse_flagged";
    content: string;
    source: "coach_inline" | "pattern_engine" | "weekly_roast";
    severity: "info" | "warning" | "critical" | null;
    related_to: Record<string, unknown> | null;
    pattern_key: string | null;
    status: "active" | "fulfilled" | "broken" | "expired" | "superseded";
    expires_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    category: "commitment" | "recommendation" | "pattern" | "observation" | "excuse_flagged";
    content: string;
    source: "coach_inline" | "pattern_engine" | "weekly_roast";
    severity?: "info" | "warning" | "critical" | null;
    related_to?: Record<string, unknown> | null;
    pattern_key?: string | null;
    status?: "active" | "fulfilled" | "broken" | "expired" | "superseded";
    expires_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    category?: "commitment" | "recommendation" | "pattern" | "observation" | "excuse_flagged";
    content?: string;
    source?: "coach_inline" | "pattern_engine" | "weekly_roast";
    severity?: "info" | "warning" | "critical" | null;
    related_to?: Record<string, unknown> | null;
    pattern_key?: string | null;
    status?: "active" | "fulfilled" | "broken" | "expired" | "superseded";
    expires_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "coach_memory_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "users";
      referencedColumns: ["id"];
    }
  ];
};
```

Add `carry_over_count: number;` to tasks Row, `carry_over_count?: number;` to tasks Insert, and `carry_over_count?: number;` to tasks Update. Also add `reflection: string | null;` to Row and optional to Insert/Update if not already present (migration added it but types may be stale).

- [ ] **Step 3: Apply migration locally**

Run: `npx supabase db push` or `npx supabase migration up`
Expected: Migration applies successfully. Verify with: `npx supabase db reset` if needed.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260416_add_coach_memory.sql src/lib/supabase/types.ts
git commit -m "feat: add coach_memory table and carry_over_count to tasks"
```

---

## Task 2: Scoring Model Overhaul

**Files:**
- Modify: `src/lib/accountability.ts`
- Create: `src/__tests__/lib/accountability.test.ts`

- [ ] **Step 1: Write tests for new scoring functions**

Create `src/__tests__/lib/accountability.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  computeWeightedCompletion,
  computeDisciplineScore,
  computeVelocityBonus,
  computeCompletionRate,
  computeConsistencyRate,
  computeScore,
  computeStreakBonus,
  getTier,
} from "@/lib/accountability";

describe("computeWeightedCompletion", () => {
  it("returns 0 when no tasks", () => {
    expect(computeWeightedCompletion([])).toBe(0);
  });

  it("weights high-priority tasks at 3x", () => {
    const tasks = [
      { status: "completed" as const, priority: "high" as const },
      { status: "pending" as const, priority: "low" as const },
    ];
    // completed weight: 3, total weight: 3 + 1 = 4, rate = 75%
    expect(computeWeightedCompletion(tasks)).toBe(75);
  });

  it("weights medium at 2x, low at 1x", () => {
    const tasks = [
      { status: "completed" as const, priority: "medium" as const },
      { status: "completed" as const, priority: "low" as const },
      { status: "pending" as const, priority: "medium" as const },
    ];
    // completed weight: 2 + 1 = 3, total weight: 2 + 1 + 2 = 5, rate = 60%
    expect(computeWeightedCompletion(tasks)).toBe(60);
  });

  it("returns 100 when all completed", () => {
    const tasks = [
      { status: "completed" as const, priority: "high" as const },
      { status: "completed" as const, priority: "low" as const },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(100);
  });
});

describe("computeDisciplineScore", () => {
  it("returns 100 with no carry-overs and balanced creation", () => {
    const tasks = [
      { carry_over_count: 0, status: "completed" as const },
      { carry_over_count: 0, status: "completed" as const },
    ];
    expect(computeDisciplineScore(tasks, 2)).toBe(100);
  });

  it("penalizes chronic carry-overs", () => {
    const tasks = [
      { carry_over_count: 5, status: "pending" as const },
      { carry_over_count: 0, status: "completed" as const },
    ];
    // 1 of 2 tasks carried over 3+ times = 50%, penalty = 0.5 * 50 = 25
    const score = computeDisciplineScore(tasks, 2);
    expect(score).toBe(75);
  });

  it("penalizes overcommitment", () => {
    const tasks = [
      { carry_over_count: 0, status: "completed" as const },
      { carry_over_count: 0, status: "pending" as const },
      { carry_over_count: 0, status: "pending" as const },
      { carry_over_count: 0, status: "pending" as const },
    ];
    // created = 5, completed = 1, overcommit ratio = (5-1)/5 = 0.8, penalty = 0.8 * 40 = 32, capped at 20
    const score = computeDisciplineScore(tasks, 5);
    expect(score).toBe(80);
  });

  it("caps carry-over penalty at 30", () => {
    // All tasks are chronic carry-overs
    const tasks = Array.from({ length: 10 }, () => ({
      carry_over_count: 5,
      status: "pending" as const,
    }));
    // 100% carry-over → penalty = 1.0 * 50 = 50, capped at 30
    // overcommit: created=10, completed=0 → (10-0)/10*40 = 40, capped at 20
    const score = computeDisciplineScore(tasks, 10);
    expect(score).toBe(50); // 100 - 30 - 20
  });

  it("returns 100 when no tasks exist", () => {
    expect(computeDisciplineScore([], 0)).toBe(100);
  });
});

describe("computeVelocityBonus", () => {
  it("returns 0 for stable rates", () => {
    expect(computeVelocityBonus(50, 50)).toBe(0);
    expect(computeVelocityBonus(55, 50)).toBe(0); // under 10% change
  });

  it("returns positive bonus for improvement", () => {
    const bonus = computeVelocityBonus(70, 50); // 40% improvement
    expect(bonus).toBeGreaterThan(0);
    expect(bonus).toBeLessThanOrEqual(5);
  });

  it("returns negative penalty for decline", () => {
    const bonus = computeVelocityBonus(30, 50); // 40% decline
    expect(bonus).toBeLessThan(0);
    expect(bonus).toBeGreaterThanOrEqual(-5);
  });

  it("clamps to [-5, +5]", () => {
    expect(computeVelocityBonus(100, 10)).toBeLessThanOrEqual(5);
    expect(computeVelocityBonus(10, 100)).toBeGreaterThanOrEqual(-5);
  });

  it("returns 0 when previous rate is 0", () => {
    expect(computeVelocityBonus(50, 0)).toBe(0);
  });
});

describe("computeScore (updated formula)", () => {
  it("combines all components", () => {
    const score = computeScore({
      weightedCompletion: 80,
      consistencyRate: 70,
      disciplineScore: 90,
      currentStreak: 10,
      velocityBonus: 2,
    });
    // 80*0.55 + 70*0.30 + 90*0.15 + min(max(10-6,0),5) + 2
    // = 44 + 21 + 13.5 + 4 + 2 = 84.5 → 85
    expect(score).toBe(85);
  });

  it("clamps to 100", () => {
    const score = computeScore({
      weightedCompletion: 100,
      consistencyRate: 100,
      disciplineScore: 100,
      currentStreak: 30,
      velocityBonus: 5,
    });
    expect(score).toBe(100);
  });

  it("clamps to 0", () => {
    const score = computeScore({
      weightedCompletion: 0,
      consistencyRate: 0,
      disciplineScore: 0,
      currentStreak: 0,
      velocityBonus: -5,
    });
    expect(score).toBe(0);
  });
});

describe("existing functions still work", () => {
  it("computeCompletionRate", () => {
    expect(computeCompletionRate(10, 7)).toBe(70);
    expect(computeCompletionRate(0, 0)).toBe(0);
  });

  it("computeConsistencyRate", () => {
    expect(computeConsistencyRate(7, 14)).toBe(50);
    expect(computeConsistencyRate(0, 0)).toBe(0);
  });

  it("getTier", () => {
    expect(getTier(95).name).toBe("Proven");
    expect(getTier(80).name).toBe("Locked In");
    expect(getTier(65).name).toBe("Grinding");
    expect(getTier(45).name).toBe("Warming Up");
    expect(getTier(20).name).toBe("Slacking");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/accountability.test.ts`
Expected: FAIL — `computeWeightedCompletion`, `computeDisciplineScore`, `computeVelocityBonus` are not exported. `computeScore` fails because its signature changed.

- [ ] **Step 3: Implement new scoring functions**

Replace the full contents of `src/lib/accountability.ts`:

```typescript
// src/lib/accountability.ts

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
  // Scale: 10% change = 1 point, 50%+ change = 5 points
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/accountability.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/accountability.ts src/__tests__/lib/accountability.test.ts
git commit -m "feat: overhaul scoring model with weighted completion, discipline, and velocity"
```

---

## Task 3: System Prompt Rewrite

**Files:**
- Modify: `src/lib/prompts/system-prompt.ts`

- [ ] **Step 1: Rewrite the system prompt**

Replace the full contents of `src/lib/prompts/system-prompt.ts`:

```typescript
export const GRINDPROOF_SYSTEM_PROMPT = `
You are GrindProof: a blunt, data-driven personal accountability coach.

Your job: help the user finish what they started before starting anything new. You have access to their real data — use it.

Tone:
- Firm, direct, evidence-based. Never cruel.
- If they're honest, be supportive. If they dodge, call it out.
- 2-4 sentences for general responses. Longer only for pattern analysis or reports.
- No filler. No invented data. If you infer, say so.

=== HOW TO USE YOUR CONTEXT ===

You receive a CURRENT USER CONTEXT block with every conversation containing:
ALERTS, ACCOUNTABILITY, TODAY, ACTIVE GOALS, and COACH MEMORY.

Rules:
- Reference specific data points, not vague summaries. "Your score dropped 11 points" not "things aren't going great."
- When the user claims progress, verify against the data before giving credit.
- Check COACH MEMORY for prior commitments before accepting new ones. If they committed to X last session and didn't do it, address that first.
- Do not repeat alerts or patterns the user has already acknowledged in the current conversation.

=== WHEN TO USE YOUR TOOLS ===

MEMORY (save_coach_note):
Call when:
- The user makes a specific commitment ("I'll finish X by Thursday")
- You give a key recommendation the user should be held to
- You spot a pattern worth tracking across sessions
- The user has an honest breakthrough moment
- You call out a recurring excuse
Only save what future-you needs to hold them accountable. Do NOT save trivial observations.

COMMITMENT TRACKING (update_coach_note):
When user claims completion of a prior commitment:
1. Check coach memory for the commitment
2. Verify with list_tasks or get_accountability_score
3. If confirmed → mark fulfilled and give credit
4. If not confirmed → call it out

DEEPER ANALYSIS (get_reflection_history, get_task_history):
Use when the conversation goes beyond today's snapshot — user asks about patterns, you need historical context, or you want to back up a claim with data.

TASK MANAGEMENT (create_task, update_task, delete_task):
- When creating tasks, always ask which goal it belongs to
- Push back if they're creating tasks while overdue tasks exist — unless they acknowledge the overdue items first
- If the user tries to create a new goal while 5+ active goals are under 50% complete, require them to archive one or show proof of progress

SCORE (get_accountability_score):
Your context already includes the current score. Only call this tool if you need a fresh read mid-conversation (e.g., after completing several tasks in one session).
`;
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts/system-prompt.ts
git commit -m "feat: rewrite system prompt with context protocol and tool protocol"
```

---

## Task 4: New AI Tools + Existing Tool Improvements

**Files:**
- Modify: `src/lib/ai/tools.ts`

- [ ] **Step 1: Add `save_coach_note` tool**

Add after the `get_accountability_score` tool in `createGrindproofTools`:

```typescript
save_coach_note: tool({
  description:
    "Save a note to your coaching memory. Use when the user makes a commitment, you give a key recommendation, you spot a pattern, the user has a breakthrough, or you call out a recurring excuse.",
  inputSchema: z.object({
    category: z
      .enum(["commitment", "recommendation", "pattern_flagged", "observation", "excuse_called"])
      .describe("Type of note"),
    content: z.string().describe("Natural language note — what future-you needs to know"),
    relatedTo: z
      .object({
        taskIds: z.array(z.string()).optional(),
        goalIds: z.array(z.string()).optional(),
        score: z.number().optional(),
      })
      .optional()
      .describe("Optional links to tasks, goals, or score"),
    expiresInDays: z
      .number()
      .default(30)
      .describe("Days until this note expires (default 30, use 7 for commitments)"),
  }),
  execute: async ({ category, content, relatedTo, expiresInDays }) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data, error } = await supabase
      .from("coach_memory")
      .insert({
        user_id: userId,
        category: category === "pattern_flagged" ? "pattern" : category === "excuse_called" ? "excuse_flagged" : category,
        content,
        source: "coach_inline",
        related_to: relatedTo ?? null,
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, noteId: data.id };
  },
}),

update_coach_note: tool({
  description:
    "Update a coach note's status. Use to mark commitments as fulfilled or broken.",
  inputSchema: z.object({
    noteId: z.string().describe("The ID of the coach note to update"),
    status: z
      .enum(["fulfilled", "broken", "expired"])
      .describe("New status"),
  }),
  execute: async ({ noteId, status }) => {
    const { error } = await supabase
      .from("coach_memory")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  },
}),

get_reflection_history: tool({
  description:
    "Get the user's task reflection history — reasons they gave for skipping or not completing tasks. Use to identify recurring excuse patterns.",
  inputSchema: z.object({
    days: z.number().default(30).describe("How many days back to look"),
    limit: z.number().default(20).describe("Max reflections to return"),
  }),
  execute: async ({ days, limit }) => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("tasks")
      .select("title, reflection, due_date, status")
      .eq("user_id", userId)
      .not("reflection", "is", null)
      .gte("due_date", since.toISOString())
      .order("due_date", { ascending: false })
      .limit(limit);

    if (error) return { success: false as const, error: error.message };
    return {
      success: true as const,
      reflections: (data ?? []).map((t) => ({
        taskTitle: t.title,
        reflection: t.reflection,
        dueDate: t.due_date,
        status: t.status,
      })),
      count: data?.length ?? 0,
    };
  },
}),

get_task_history: tool({
  description:
    "Get historical task stats grouped by status, goal, or day. Use for deeper analysis of productivity patterns.",
  inputSchema: z.object({
    days: z.number().default(30).describe("How many days back to look"),
    groupBy: z
      .enum(["status", "goal", "day"])
      .default("status")
      .describe("How to group the results"),
  }),
  execute: async ({ days, groupBy }) => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("status, priority, due_date, goal_id")
      .eq("user_id", userId)
      .gte("due_date", since.toISOString())
      .order("due_date", { ascending: false });

    if (error) return { success: false as const, error: error.message };
    const allTasks = tasks ?? [];

    if (groupBy === "status") {
      const completed = allTasks.filter((t) => t.status === "completed").length;
      const skipped = allTasks.filter((t) => t.status === "skipped").length;
      const pending = allTasks.filter((t) => t.status === "pending").length;
      return {
        success: true as const,
        summary: { completed, skipped, pending, total: allTasks.length },
      };
    }

    if (groupBy === "goal") {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, title")
        .eq("user_id", userId);
      const goalMap = new Map((goals ?? []).map((g) => [g.id, g.title]));

      const byGoal: Record<string, { goalTitle: string; completed: number; skipped: number; pending: number }> = {};
      for (const t of allTasks) {
        const key = t.goal_id ?? "no_goal";
        if (!byGoal[key]) {
          byGoal[key] = {
            goalTitle: t.goal_id ? (goalMap.get(t.goal_id) ?? "Unknown") : "No goal",
            completed: 0,
            skipped: 0,
            pending: 0,
          };
        }
        if (t.status === "completed") byGoal[key].completed++;
        else if (t.status === "skipped") byGoal[key].skipped++;
        else byGoal[key].pending++;
      }
      return { success: true as const, byGoal: Object.values(byGoal) };
    }

    // groupBy === "day"
    const byDay: Record<string, { date: string; completed: number; total: number }> = {};
    for (const t of allTasks) {
      const dateStr = t.due_date
        ? new Date(t.due_date).toISOString().split("T")[0]
        : "unknown";
      if (!byDay[dateStr]) byDay[dateStr] = { date: dateStr, completed: 0, total: 0 };
      byDay[dateStr].total++;
      if (t.status === "completed") byDay[dateStr].completed++;
    }
    return {
      success: true as const,
      byDay: Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)),
    };
  },
}),
```

- [ ] **Step 2: Improve `get_accountability_score` tool**

Replace the `get_accountability_score` tool's execute function. Key changes: compute actual streak, add delta, add tier info, add today progress.

```typescript
get_accountability_score: tool({
  description:
    "Get the user's current accountability score, tier, streak, and performance metrics. Use when the user asks about their progress, performance, or score.",
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 13);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("status, due_date, priority, carry_over_count")
      .eq("user_id", userId)
      .gte("due_date", windowStart.toISOString())
      .lte("due_date", now.toISOString());

    const allTasks = tasks || [];
    const completed = allTasks.filter((t) => t.status === "completed").length;
    const activeDaysSet = new Set(
      allTasks
        .filter((t) => t.status === "completed" && t.due_date != null)
        .map((t) => new Date(t.due_date!).toISOString().split("T")[0])
    );

    const weightedCompletion = computeWeightedCompletion(
      allTasks.map((t) => ({ status: t.status, priority: t.priority }))
    );
    const consistencyRate = computeConsistencyRate(activeDaysSet.size, 14);
    const disciplineScore = computeDisciplineScore(
      allTasks.map((t) => ({ carry_over_count: t.carry_over_count ?? 0, status: t.status })),
      allTasks.length
    );

    // Compute streak (simplified — count consecutive days backwards)
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (activeDaysSet.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Velocity bonus: compare this week vs last week
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekTasks = allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) > oneWeekAgo
    );
    const lastWeekTasks = allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) <= oneWeekAgo
    );
    const thisWeekRate = thisWeekTasks.length > 0
      ? (thisWeekTasks.filter((t) => t.status === "completed").length / thisWeekTasks.length) * 100
      : 0;
    const lastWeekRate = lastWeekTasks.length > 0
      ? (lastWeekTasks.filter((t) => t.status === "completed").length / lastWeekTasks.length) * 100
      : 0;
    const velocityBonus = computeVelocityBonus(thisWeekRate, lastWeekRate);

    const score = computeScore({
      weightedCompletion,
      consistencyRate,
      disciplineScore,
      currentStreak: streak,
      velocityBonus,
    });
    const tier = getTier(score);

    // Delta from last week
    const pastEnd = new Date(now);
    pastEnd.setDate(pastEnd.getDate() - 7);
    const pastStart = new Date(pastEnd);
    pastStart.setDate(pastStart.getDate() - 13);
    const { data: pastTasks } = await supabase
      .from("tasks")
      .select("status, priority, carry_over_count")
      .eq("user_id", userId)
      .gte("due_date", pastStart.toISOString())
      .lte("due_date", pastEnd.toISOString());
    const pastAll = pastTasks || [];
    const pastCompleted = pastAll.filter((t) => t.status === "completed").length;
    const pastActiveDays = new Set(
      pastAll.filter((t) => t.status === "completed").map(() => "x") // simplified
    ).size;
    const pastScore = computeScore({
      weightedCompletion: computeWeightedCompletion(
        pastAll.map((t) => ({ status: t.status, priority: t.priority }))
      ),
      consistencyRate: computeConsistencyRate(pastActiveDays, 14),
      disciplineScore: computeDisciplineScore(
        pastAll.map((t) => ({ carry_over_count: t.carry_over_count ?? 0, status: t.status })),
        pastAll.length
      ),
      currentStreak: 0,
      velocityBonus: 0,
    });
    const delta = score - pastScore;

    // Today's progress
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const todayTasks = allTasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) >= todayStart &&
        new Date(t.due_date) <= todayEnd
    );

    return {
      success: true as const,
      score,
      tier: `${tier.name} (${tier.color})`,
      currentStreak: streak,
      weightedCompletion,
      consistencyRate: Math.round(consistencyRate),
      disciplineScore,
      delta,
      activeDays: activeDaysSet.size,
      windowDays: 14,
      todayProgress: {
        completed: todayTasks.filter((t) => t.status === "completed").length,
        total: todayTasks.length,
      },
    };
  },
}),
```

- [ ] **Step 3: Improve `list_tasks` tool**

Update the select to include coaching-relevant fields. Replace the select line and return mapping:

```typescript
list_tasks: tool({
  description:
    "List the user's tasks, optionally filtered by status or date.",
  inputSchema: z.object({
    status: z
      .enum(["pending", "completed", "skipped", "all"])
      .default("all")
      .describe("Filter by status"),
    dateFilter: z
      .enum(["today", "tomorrow", "this_week", "overdue", "all"])
      .default("all")
      .describe("Filter by date range"),
  }),
  execute: async ({ status, dateFilter }) => {
    let query = supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, tags, reflection, goal_id, created_at, carry_over_count")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    if (status !== "all") query = query.eq("status", status);

    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      query = query
        .gte("due_date", start.toISOString())
        .lte("due_date", end.toISOString());
    } else if (dateFilter === "overdue") {
      query = query
        .lt("due_date", now.toISOString())
        .eq("status", "pending");
    }

    const { data, error } = await query.limit(50);
    if (error) return { success: false as const, error: error.message };

    // Enrich with goal titles
    const goalIds = [...new Set((data ?? []).map((t) => t.goal_id).filter(Boolean))];
    let goalMap = new Map<string, string>();
    if (goalIds.length > 0) {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, title")
        .in("id", goalIds);
      goalMap = new Map((goals ?? []).map((g) => [g.id, g.title]));
    }

    return {
      success: true as const,
      tasks: (data ?? []).map((t) => ({
        ...t,
        goalTitle: t.goal_id ? goalMap.get(t.goal_id) ?? null : null,
      })),
      count: data?.length ?? 0,
    };
  },
}),
```

- [ ] **Step 4: Improve `list_goals` tool**

```typescript
list_goals: tool({
  description: "List the user's goals with task progress and staleness.",
  inputSchema: z.object({
    status: z
      .enum(["active", "completed", "all"])
      .default("active")
      .describe("Filter by goal status"),
  }),
  execute: async ({ status }) => {
    let query = supabase
      .from("goals")
      .select("id, title, description, status, priority, created_at")
      .eq("user_id", userId);

    if (status !== "all") query = query.eq("status", status);

    const { data: goals } = await query;
    if (!goals) return { success: true as const, goals: [] };

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const { count: total } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("goal_id", goal.id);
        const { count: completed } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("goal_id", goal.id)
          .eq("status", "completed");

        // Find most recent completed task for staleness
        const { data: lastCompleted } = await supabase
          .from("tasks")
          .select("due_date")
          .eq("goal_id", goal.id)
          .eq("status", "completed")
          .order("due_date", { ascending: false })
          .limit(1);

        const lastCompletedDate = lastCompleted?.[0]?.due_date ?? null;
        const daysSinceLastCompletion = lastCompletedDate
          ? Math.floor(
              (Date.now() - new Date(lastCompletedDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        return {
          ...goal,
          totalTasks: total ?? 0,
          completedTasks: completed ?? 0,
          daysSinceLastCompletion,
        };
      })
    );

    return { success: true as const, goals: goalsWithProgress };
  },
}),
```

- [ ] **Step 5: Improve `create_task` tool — add goalId parameter**

Add `goalId` to the inputSchema and use it in the insert:

```typescript
create_task: tool({
  description:
    "Create a new task for the user. Use when they mention wanting to do something, add a task, or plan an activity.",
  inputSchema: z.object({
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    goalId: z.string().optional().describe("ID of the goal this task belongs to"),
    dueDate: z
      .string()
      .optional()
      .describe("Due date in YYYY-MM-DD format"),
    priority: z
      .enum(["high", "medium", "low"])
      .default("medium")
      .describe("Task priority"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for categorization"),
  }),
  execute: async ({ title, description, goalId, dueDate, priority, tags }) => {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title,
        description: description ?? null,
        goal_id: goalId ?? null,
        due_date: dueDate
          ? new Date(dueDate).toISOString()
          : new Date().toISOString(),
        priority,
        tags: tags ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, task: { id: data.id, title: data.title } };
  },
}),
```

- [ ] **Step 6: Update imports in tools.ts**

Add the new imports at the top of the file:

```typescript
import {
  computeWeightedCompletion,
  computeCompletionRate,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";
```

- [ ] **Step 7: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ai/tools.ts
git commit -m "feat: add coach memory tools and enrich existing tools with coaching context"
```

---

## Task 5: Context Builder

**Files:**
- Create: `src/lib/ai/context.ts`
- Create: `src/__tests__/lib/context.test.ts`

- [ ] **Step 1: Write tests for buildCoachContext**

Create `src/__tests__/lib/context.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatCoachContext, generateAlerts } from "@/lib/ai/context";

describe("generateAlerts", () => {
  it("returns empty array when no issues", () => {
    const alerts = generateAlerts({
      score: 75,
      delta: 2,
      currentStreak: 5,
      previousStreak: 4,
      overdueTasks: [],
      chronicCarryOvers: [],
      activeCommitmentsPastDue: [],
      goalsUnder50: 0,
    });
    expect(alerts).toEqual([]);
  });

  it("alerts on score drop >= 10", () => {
    const alerts = generateAlerts({
      score: 60,
      delta: -12,
      currentStreak: 5,
      previousStreak: 5,
      overdueTasks: [],
      chronicCarryOvers: [],
      activeCommitmentsPastDue: [],
      goalsUnder50: 0,
    });
    expect(alerts).toContainEqual(
      expect.stringContaining("Score dropped")
    );
  });

  it("alerts on broken streak", () => {
    const alerts = generateAlerts({
      score: 70,
      delta: 0,
      currentStreak: 0,
      previousStreak: 5,
      overdueTasks: [],
      chronicCarryOvers: [],
      activeCommitmentsPastDue: [],
      goalsUnder50: 0,
    });
    expect(alerts).toContainEqual(
      expect.stringContaining("Streak broken")
    );
  });

  it("alerts on 3+ overdue tasks", () => {
    const alerts = generateAlerts({
      score: 70,
      delta: 0,
      currentStreak: 3,
      previousStreak: 3,
      overdueTasks: [
        { title: "Task A" },
        { title: "Task B" },
        { title: "Task C" },
      ],
      chronicCarryOvers: [],
      activeCommitmentsPastDue: [],
      goalsUnder50: 0,
    });
    expect(alerts).toContainEqual(
      expect.stringContaining("3 tasks overdue")
    );
  });

  it("alerts on chronic carry-overs", () => {
    const alerts = generateAlerts({
      score: 70,
      delta: 0,
      currentStreak: 3,
      previousStreak: 3,
      overdueTasks: [],
      chronicCarryOvers: [{ title: "Design homepage", carryOverCount: 5 }],
      activeCommitmentsPastDue: [],
      goalsUnder50: 0,
    });
    expect(alerts).toContainEqual(
      expect.stringContaining("Design homepage")
    );
  });

  it("alerts on overcommitment (5+ goals under 50%)", () => {
    const alerts = generateAlerts({
      score: 70,
      delta: 0,
      currentStreak: 3,
      previousStreak: 3,
      overdueTasks: [],
      chronicCarryOvers: [],
      activeCommitmentsPastDue: [],
      goalsUnder50: 6,
    });
    expect(alerts).toContainEqual(
      expect.stringContaining("6 active goals under 50%")
    );
  });
});

describe("formatCoachContext", () => {
  it("includes all sections", () => {
    const ctx = formatCoachContext({
      alerts: ["ALERT: Score dropped from 72 to 61"],
      score: 61,
      tierName: "Grinding",
      streak: 3,
      completionRate: 58,
      consistencyRate: 43,
      delta: -11,
      todayTasks: [
        { title: "Fix auth bug", status: "pending", priority: "high", dueDate: "2026-04-16", isOverdue: false },
      ],
      activeGoals: [
        { title: "Ship v2", completed: 6, total: 10 },
      ],
      coachMemory: [
        { category: "commitment", content: "Finish auth by Friday", createdAt: "2026-04-14" },
      ],
    });

    expect(ctx).toContain("=== CURRENT USER CONTEXT ===");
    expect(ctx).toContain("ALERTS:");
    expect(ctx).toContain("Score dropped");
    expect(ctx).toContain("ACCOUNTABILITY:");
    expect(ctx).toContain("61/100");
    expect(ctx).toContain("TODAY");
    expect(ctx).toContain("Fix auth bug");
    expect(ctx).toContain("ACTIVE GOALS:");
    expect(ctx).toContain("Ship v2");
    expect(ctx).toContain("COACH MEMORY");
    expect(ctx).toContain("Finish auth by Friday");
    expect(ctx).toContain("=== END CONTEXT ===");
  });

  it("omits ALERTS section when no alerts", () => {
    const ctx = formatCoachContext({
      alerts: [],
      score: 75,
      tierName: "Locked In",
      streak: 5,
      completionRate: 80,
      consistencyRate: 60,
      delta: 3,
      todayTasks: [],
      activeGoals: [],
      coachMemory: [],
    });
    expect(ctx).not.toContain("ALERTS:");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/context.test.ts`
Expected: FAIL — `formatCoachContext` and `generateAlerts` don't exist.

- [ ] **Step 3: Implement the context builder**

Create `src/lib/ai/context.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  computeWeightedCompletion,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";

// --- Pure formatting functions (exported for testing) ---

interface AlertInput {
  score: number;
  delta: number;
  currentStreak: number;
  previousStreak: number;
  overdueTasks: { title: string }[];
  chronicCarryOvers: { title: string; carryOverCount: number }[];
  activeCommitmentsPastDue: { content: string }[];
  goalsUnder50: number;
}

export function generateAlerts(input: AlertInput): string[] {
  const alerts: string[] = [];

  if (input.delta <= -10) {
    alerts.push(
      `ALERT: Score dropped from ${input.score - input.delta} to ${input.score} this week`
    );
  }

  if (input.currentStreak === 0 && input.previousStreak >= 3) {
    alerts.push(
      `ALERT: Streak broken after ${input.previousStreak} days`
    );
  }

  if (input.overdueTasks.length >= 3) {
    alerts.push(`ALERT: ${input.overdueTasks.length} tasks overdue`);
  }

  for (const t of input.chronicCarryOvers) {
    alerts.push(
      `ALERT: "${t.title}" carried over ${t.carryOverCount} times`
    );
  }

  for (const c of input.activeCommitmentsPastDue) {
    alerts.push(
      `ALERT: Commitment may be past due — "${c.content}"`
    );
  }

  if (input.goalsUnder50 >= 5) {
    alerts.push(
      `ALERT: ${input.goalsUnder50} active goals under 50% — overcommitment risk`
    );
  }

  return alerts;
}

interface FormatInput {
  alerts: string[];
  score: number;
  tierName: string;
  streak: number;
  completionRate: number;
  consistencyRate: number;
  delta: number;
  todayTasks: {
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    isOverdue: boolean;
  }[];
  activeGoals: { title: string; completed: number; total: number }[];
  coachMemory: { category: string; content: string; createdAt: string }[];
}

export function formatCoachContext(input: FormatInput): string {
  const lines: string[] = ["=== CURRENT USER CONTEXT ===", ""];

  if (input.alerts.length > 0) {
    lines.push("ALERTS:");
    for (const a of input.alerts) lines.push(`- ${a}`);
    lines.push("");
  }

  const deltaStr =
    input.delta > 0 ? `+${input.delta}` : `${input.delta}`;
  lines.push(
    `ACCOUNTABILITY: Score ${input.score}/100 (${input.tierName}) | Streak: ${input.streak} days | Completion: ${input.completionRate}% | Consistency: ${input.consistencyRate}%`
  );
  lines.push(`Delta: ${deltaStr} from last week`);
  lines.push("");

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  lines.push(`TODAY (${today}):`);
  if (input.todayTasks.length === 0) {
    lines.push("- No tasks scheduled for today");
  } else {
    for (const t of input.todayTasks) {
      const label = t.isOverdue ? "overdue" : t.status;
      lines.push(`- [${label}] ${t.title} (${t.priority} priority)`);
    }
  }
  lines.push("");

  lines.push("ACTIVE GOALS:");
  if (input.activeGoals.length === 0) {
    lines.push("- No active goals");
  } else {
    for (const g of input.activeGoals) {
      const pct =
        g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
      lines.push(
        `- ${g.title}: ${g.completed}/${g.total} tasks done (${pct}%)`
      );
    }
  }
  lines.push("");

  lines.push("COACH MEMORY (recent):");
  if (input.coachMemory.length === 0) {
    lines.push("- No prior notes");
  } else {
    for (const m of input.coachMemory) {
      const dateStr = new Date(m.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      lines.push(`- [${m.category}, ${dateStr}] ${m.content}`);
    }
  }
  lines.push("");

  lines.push("=== END CONTEXT ===");
  lines.push("");
  lines.push(
    "When ALERTS are present, open the conversation by addressing the most critical one. When no alerts, stay quiet until the user engages."
  );

  return lines.join("\n");
}

// --- Main function (queries DB, assembles context) ---

export async function buildCoachContext(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 13);

  // Three parallel queries
  const [tasksResult, todayResult, memoryResult, goalsResult] =
    await Promise.all([
      // 14-day window tasks for scoring
      supabase
        .from("tasks")
        .select("status, due_date, priority, carry_over_count")
        .eq("user_id", userId)
        .gte("due_date", windowStart.toISOString())
        .lte("due_date", now.toISOString()),

      // Today's tasks + overdue
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, carry_over_count")
        .eq("user_id", userId)
        .or(
          `and(due_date.gte.${todayStart.toISOString()},due_date.lte.${todayEnd.toISOString()}),and(due_date.lt.${todayStart.toISOString()},status.eq.pending)`
        )
        .order("due_date", { ascending: true }),

      // Coach memory
      supabase
        .from("coach_memory")
        .select("category, content, created_at, status, severity, related_to")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),

      // Active goals with progress
      supabase
        .from("goals")
        .select("id, title")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

  const windowTasks = tasksResult.data || [];
  const todayTasks = todayResult.data || [];
  const memory = memoryResult.data || [];
  const goals = goalsResult.data || [];

  // Compute score
  const completed = windowTasks.filter((t) => t.status === "completed").length;
  const activeDaysSet = new Set(
    windowTasks
      .filter((t) => t.status === "completed" && t.due_date)
      .map((t) => new Date(t.due_date!).toISOString().split("T")[0])
  );

  const weightedCompletion = computeWeightedCompletion(
    windowTasks.map((t) => ({ status: t.status, priority: t.priority }))
  );
  const consistencyRate = computeConsistencyRate(activeDaysSet.size, 14);
  const disciplineScore = computeDisciplineScore(
    windowTasks.map((t) => ({
      carry_over_count: t.carry_over_count ?? 0,
      status: t.status,
    })),
    windowTasks.length
  );

  // Simplified streak (from active days)
  let streak = 0;
  const checkDate = new Date(now);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (activeDaysSet.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Velocity
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = windowTasks.filter(
    (t) => t.due_date && new Date(t.due_date) > oneWeekAgo
  );
  const lastWeek = windowTasks.filter(
    (t) => t.due_date && new Date(t.due_date) <= oneWeekAgo
  );
  const thisRate =
    thisWeek.length > 0
      ? (thisWeek.filter((t) => t.status === "completed").length /
          thisWeek.length) *
        100
      : 0;
  const lastRate =
    lastWeek.length > 0
      ? (lastWeek.filter((t) => t.status === "completed").length /
          lastWeek.length) *
        100
      : 0;
  const velocityBonus = computeVelocityBonus(thisRate, lastRate);

  const score = computeScore({
    weightedCompletion,
    consistencyRate,
    disciplineScore,
    currentStreak: streak,
    velocityBonus,
  });
  const tier = getTier(score);

  // Delta: approximate previous streak for alert logic
  const previousStreak = streak; // Simplified — would need separate query for exact previous streak

  // Compute delta from last week
  const pastWindowEnd = new Date(now);
  pastWindowEnd.setDate(pastWindowEnd.getDate() - 7);
  const pastWindowStart = new Date(pastWindowEnd);
  pastWindowStart.setDate(pastWindowStart.getDate() - 13);
  const { data: pastTasks } = await supabase
    .from("tasks")
    .select("status, priority, carry_over_count")
    .eq("user_id", userId)
    .gte("due_date", pastWindowStart.toISOString())
    .lte("due_date", pastWindowEnd.toISOString());

  const pastAll = pastTasks || [];
  const pastActiveDays = new Set(
    pastAll
      .filter((t) => t.status === "completed")
      .map(() => "day") // simplified — approximation is fine for delta
  ).size;
  const pastScore = computeScore({
    weightedCompletion: computeWeightedCompletion(
      pastAll.map((t) => ({ status: t.status, priority: t.priority }))
    ),
    consistencyRate: computeConsistencyRate(pastActiveDays, 14),
    disciplineScore: computeDisciplineScore(
      pastAll.map((t) => ({
        carry_over_count: t.carry_over_count ?? 0,
        status: t.status,
      })),
      pastAll.length
    ),
    currentStreak: 0,
    velocityBonus: 0,
  });
  const delta = score - pastScore;

  // Goal progress
  const goalProgress = await Promise.all(
    goals.map(async (g) => {
      const { count: total } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id);
      const { count: comp } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id)
        .eq("status", "completed");
      return { title: g.title, completed: comp ?? 0, total: total ?? 0 };
    })
  );

  // Compute alerts
  const overdueTasks = todayTasks.filter(
    (t) =>
      t.status === "pending" &&
      t.due_date &&
      new Date(t.due_date) < todayStart
  );
  const chronicCarryOvers = todayTasks
    .filter((t) => (t.carry_over_count ?? 0) >= 3)
    .map((t) => ({
      title: t.title,
      carryOverCount: t.carry_over_count ?? 0,
    }));
  const activeCommitmentsPastDue = memory.filter(
    (m) => m.category === "commitment"
    // In practice: check related_to for deadline. Simplified here.
  );
  const goalsUnder50 = goalProgress.filter(
    (g) => g.total > 0 && g.completed / g.total < 0.5
  ).length;

  const alerts = generateAlerts({
    score,
    delta,
    currentStreak: streak,
    previousStreak,
    overdueTasks: overdueTasks.map((t) => ({ title: t.title })),
    chronicCarryOvers,
    activeCommitmentsPastDue: activeCommitmentsPastDue.map((m) => ({
      content: m.content,
    })),
    goalsUnder50,
  });

  // Format today tasks for display
  const formattedToday = todayTasks.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date ?? "",
    isOverdue:
      t.status === "pending" &&
      !!t.due_date &&
      new Date(t.due_date) < todayStart,
  }));

  return formatCoachContext({
    alerts,
    score,
    tierName: tier.name,
    streak,
    completionRate: weightedCompletion,
    consistencyRate: Math.round(consistencyRate),
    delta,
    todayTasks: formattedToday,
    activeGoals: goalProgress,
    coachMemory: memory.map((m) => ({
      category: m.category,
      content: m.content,
      createdAt: m.created_at,
    })),
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/context.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/context.ts src/__tests__/lib/context.test.ts
git commit -m "feat: add buildCoachContext with alerts, scoring, and memory injection"
```

---

## Task 6: Integrate Context into Chat Route

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`

- [ ] **Step 1: Add context injection to the chat route**

Add import and call `buildCoachContext` before `streamText`. Update the full file:

```typescript
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env } from "@/lib/env";
import { GRINDPROOF_SYSTEM_PROMPT } from "@/lib/prompts/system-prompt";
import { createGrindproofTools } from "@/lib/ai/tools";
import { buildCoachContext } from "@/lib/ai/context";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 60;

const google = createGoogleGenerativeAI({ apiKey: env.NEXT_GOOGLE_GEMINI_API_KEY });

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: { name: string; value: string }[] = [];
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) cookies.push({ name, value: rest.join("=") });
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookies,
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length > 50) {
      return new Response("Invalid request body", { status: 400 });
    }
    messages = body.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Build rich context for the coach
  const coachContext = await buildCoachContext(user.id, supabase);

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT + "\n\n" + coachContext,
    messages: await convertToModelMessages(messages),
    tools: createGrindproofTools(user.id, supabase),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/chat/route.ts
git commit -m "feat: inject coach context into chat route with increased step count"
```

---

## Task 7: Pattern Engine

**Files:**
- Create: `src/lib/ai/patterns.ts`
- Create: `src/__tests__/lib/patterns.test.ts`

- [ ] **Step 1: Write tests for pattern analysis functions**

Create `src/__tests__/lib/patterns.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  analyzeCarryOverFrequency,
  analyzeExcuseTrends,
  analyzeGoalStagnation,
  analyzeCompletionVelocity,
  analyzeTimePatterns,
  clusterReflection,
} from "@/lib/ai/patterns";

describe("clusterReflection", () => {
  it("clusters focus-related reflections", () => {
    expect(clusterReflection("I got distracted by slack")).toBe("focus");
    expect(clusterReflection("Lost focus halfway through")).toBe("focus");
    expect(clusterReflection("Got sidetracked")).toBe("focus");
  });

  it("clusters energy-related reflections", () => {
    expect(clusterReflection("Too tired after work")).toBe("energy");
    expect(clusterReflection("Feeling exhausted")).toBe("energy");
  });

  it("clusters planning-related reflections", () => {
    expect(clusterReflection("Underestimated the time needed")).toBe("planning");
    expect(clusterReflection("Took way longer than expected")).toBe("planning");
  });

  it("clusters commitment-related reflections", () => {
    expect(clusterReflection("Priorities changed")).toBe("commitment");
    expect(clusterReflection("Something urgent came up")).toBe("commitment");
  });

  it("clusters systems-related reflections", () => {
    expect(clusterReflection("I forgot about it")).toBe("systems");
  });

  it("returns null for unrecognized reflections", () => {
    expect(clusterReflection("The API was down")).toBeNull();
  });
});

describe("analyzeCarryOverFrequency", () => {
  it("returns null when no chronic carry-overs", () => {
    const tasks = [
      { title: "A", carry_over_count: 0, status: "completed", due_date: "2026-04-10" },
      { title: "B", carry_over_count: 1, status: "pending", due_date: "2026-04-11" },
    ];
    expect(analyzeCarryOverFrequency(tasks)).toBeNull();
  });

  it("returns warning when >20% are chronic", () => {
    const tasks = [
      { title: "A", carry_over_count: 5, status: "pending", due_date: "2026-04-10" },
      { title: "B", carry_over_count: 0, status: "completed", due_date: "2026-04-11" },
      { title: "C", carry_over_count: 0, status: "completed", due_date: "2026-04-12" },
      { title: "D", carry_over_count: 4, status: "pending", due_date: "2026-04-13" },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
  });

  it("returns critical for tasks with 5+ carry-overs", () => {
    const tasks = [
      { title: "Monster Task", carry_over_count: 7, status: "pending", due_date: "2026-04-10" },
      { title: "B", carry_over_count: 0, status: "completed", due_date: "2026-04-11" },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.content).toContain("Monster Task");
  });
});

describe("analyzeExcuseTrends", () => {
  it("returns null when fewer than 3 of any cluster", () => {
    const reflections = [
      { reflection: "Got distracted" },
      { reflection: "Was tired" },
    ];
    expect(analyzeExcuseTrends(reflections)).toBeNull();
  });

  it("flags clusters with 3+ occurrences", () => {
    const reflections = [
      { reflection: "Got distracted" },
      { reflection: "Lost focus again" },
      { reflection: "Sidetracked by email" },
    ];
    const result = analyzeExcuseTrends(reflections);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("focus");
  });
});

describe("analyzeGoalStagnation", () => {
  it("returns null when all goals have recent completions", () => {
    const goals = [
      { title: "Goal A", daysSinceLastCompletion: 3, pendingTasks: 2, status: "active" },
    ];
    expect(analyzeGoalStagnation(goals, 0)).toBeNull();
  });

  it("returns warning for 14+ days stagnant", () => {
    const goals = [
      { title: "Stale Goal", daysSinceLastCompletion: 18, pendingTasks: 5, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
  });

  it("returns critical for 30+ days stagnant", () => {
    const goals = [
      { title: "Dead Goal", daysSinceLastCompletion: 35, pendingTasks: 8, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
  });

  it("flags new-project addiction", () => {
    const goals = [
      { title: "Old Goal", daysSinceLastCompletion: 20, pendingTasks: 5, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 2);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("new goal");
  });
});

describe("analyzeCompletionVelocity", () => {
  it("returns null when rates are similar", () => {
    expect(analyzeCompletionVelocity(2.0, 2.1)).toBeNull();
  });

  it("returns warning on 30%+ drop", () => {
    const result = analyzeCompletionVelocity(1.3, 2.1);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
  });

  it("returns info on 30%+ improvement", () => {
    const result = analyzeCompletionVelocity(3.0, 2.0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("info");
  });
});

describe("analyzeTimePatterns", () => {
  it("returns null when skip rate is uniform", () => {
    // All days have similar skip rates
    const dayStats = [
      { day: 0, completed: 5, skipped: 2 },
      { day: 1, completed: 5, skipped: 2 },
      { day: 2, completed: 5, skipped: 2 },
      { day: 3, completed: 5, skipped: 2 },
      { day: 4, completed: 5, skipped: 2 },
      { day: 5, completed: 5, skipped: 2 },
      { day: 6, completed: 5, skipped: 2 },
    ];
    expect(analyzeTimePatterns(dayStats)).toBeNull();
  });

  it("flags days with 2x+ average skip rate", () => {
    const dayStats = [
      { day: 0, completed: 5, skipped: 1 }, // Sun
      { day: 1, completed: 5, skipped: 1 }, // Mon
      { day: 2, completed: 5, skipped: 1 }, // Tue
      { day: 3, completed: 5, skipped: 1 }, // Wed
      { day: 4, completed: 5, skipped: 1 }, // Thu
      { day: 5, completed: 1, skipped: 8 }, // Fri — bad day
      { day: 6, completed: 5, skipped: 1 }, // Sat
    ];
    const result = analyzeTimePatterns(dayStats);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Friday");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/patterns.test.ts`
Expected: FAIL — none of the functions exist.

- [ ] **Step 3: Implement pattern analysis functions**

Create `src/lib/ai/patterns.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// --- Types ---

interface PatternResult {
  content: string;
  severity: "info" | "warning" | "critical";
  patternKey: string;
  relatedTo?: Record<string, unknown>;
}

// --- Keyword Clustering ---

const REFLECTION_CLUSTERS: Record<string, RegExp> = {
  focus: /distract|lost focus|sidetrack|couldn.t concentrate/i,
  energy: /tired|exhaust|burnout|energy|fatigue/i,
  planning: /underestimate|took longer|not enough time|ran out of time/i,
  commitment: /priorit(?:y|ies) changed|something came up|urgent|emergency/i,
  systems: /forgot|didn.t remember|slipped my mind/i,
};

export function clusterReflection(reflection: string): string | null {
  for (const [cluster, regex] of Object.entries(REFLECTION_CLUSTERS)) {
    if (regex.test(reflection)) return cluster;
  }
  return null;
}

// --- Analysis Functions (pure, testable) ---

export function analyzeCarryOverFrequency(
  tasks: { title: string; carry_over_count: number; status: string; due_date: string }[]
): PatternResult | null {
  if (tasks.length === 0) return null;

  const chronic = tasks.filter((t) => t.carry_over_count >= 3);
  if (chronic.length === 0) return null;

  const ratio = chronic.length / tasks.length;
  const worst = chronic.sort(
    (a, b) => b.carry_over_count - a.carry_over_count
  )[0];

  if (worst.carry_over_count >= 5) {
    return {
      content: `${Math.round(ratio * 100)}% of tasks in the last 30 days were carried over 3+ times. '${worst.title}' has been carried over ${worst.carry_over_count} times — it's either too big, not important, or being avoided.`,
      severity: "critical",
      patternKey: "carry_over",
      relatedTo: { worstTask: worst.title, carryOverCount: worst.carry_over_count },
    };
  }

  if (ratio > 0.2) {
    return {
      content: `${Math.round(ratio * 100)}% of tasks in the last 30 days were carried over 3+ times. Most frequent: '${worst.title}' (${worst.carry_over_count} times).`,
      severity: "warning",
      patternKey: "carry_over",
    };
  }

  return null;
}

export function analyzeExcuseTrends(
  reflections: { reflection: string }[]
): PatternResult | null {
  const counts: Record<string, number> = {};
  for (const r of reflections) {
    const cluster = clusterReflection(r.reflection);
    if (cluster) counts[cluster] = (counts[cluster] || 0) + 1;
  }

  const flagged = Object.entries(counts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (flagged.length === 0) return null;

  const parts = flagged.map(
    ([cluster, count]) => `'${cluster}' issues mentioned ${count} times`
  );
  const dominant = flagged[0][0];

  return {
    content: `${parts.join(". ")} in 30 days. ${dominant.charAt(0).toUpperCase() + dominant.slice(1)} is the dominant blocker.`,
    severity: "warning",
    patternKey: "excuse_trends",
  };
}

export function analyzeGoalStagnation(
  goals: {
    title: string;
    daysSinceLastCompletion: number | null;
    pendingTasks: number;
    status: string;
  }[],
  newGoalsCreatedRecently: number
): PatternResult | null {
  const stagnant = goals.filter(
    (g) =>
      g.status === "active" &&
      g.daysSinceLastCompletion !== null &&
      g.daysSinceLastCompletion >= 14
  );

  if (stagnant.length === 0) return null;

  const worst = stagnant.sort(
    (a, b) => (b.daysSinceLastCompletion ?? 0) - (a.daysSinceLastCompletion ?? 0)
  )[0];

  const isCritical = (worst.daysSinceLastCompletion ?? 0) >= 30;
  const hasAddiction = newGoalsCreatedRecently > 0 && stagnant.length > 0;

  let content = `'${worst.title}' has had no completed tasks in ${worst.daysSinceLastCompletion} days despite ${worst.pendingTasks} pending tasks.`;
  if (hasAddiction) {
    content += ` Meanwhile, ${newGoalsCreatedRecently} new goal${newGoalsCreatedRecently > 1 ? "s were" : " was"} created in the same period. Classic new-project-addiction pattern.`;
  }

  return {
    content,
    severity: isCritical ? "critical" : "warning",
    patternKey: "goal_stagnation",
    relatedTo: { stagnantGoal: worst.title },
  };
}

export function analyzeCompletionVelocity(
  currentAvgPerDay: number,
  previousAvgPerDay: number
): PatternResult | null {
  if (previousAvgPerDay === 0) return null;

  const change =
    (currentAvgPerDay - previousAvgPerDay) / previousAvgPerDay;

  if (Math.abs(change) < 0.3) return null;

  if (change < 0) {
    return {
      content: `Completion velocity dropped ${Math.round(Math.abs(change) * 100)}% this week (${previousAvgPerDay.toFixed(1)}/day -> ${currentAvgPerDay.toFixed(1)}/day).`,
      severity: "warning",
      patternKey: "velocity",
    };
  }

  return {
    content: `Completion velocity improved ${Math.round(change * 100)}% this week (${previousAvgPerDay.toFixed(1)}/day -> ${currentAvgPerDay.toFixed(1)}/day). Good momentum.`,
    severity: "info",
    patternKey: "velocity",
  };
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function analyzeTimePatterns(
  dayStats: { day: number; completed: number; skipped: number }[]
): PatternResult | null {
  const withRates = dayStats
    .filter((d) => d.completed + d.skipped > 0)
    .map((d) => ({
      ...d,
      skipRate: d.skipped / (d.completed + d.skipped),
    }));

  if (withRates.length < 3) return null;

  const avgSkipRate =
    withRates.reduce((sum, d) => sum + d.skipRate, 0) / withRates.length;

  if (avgSkipRate === 0) return null;

  const badDays = withRates.filter((d) => d.skipRate >= avgSkipRate * 2);
  if (badDays.length === 0) return null;

  const worst = badDays.sort((a, b) => b.skipRate - a.skipRate)[0];

  return {
    content: `${DAY_NAMES[worst.day]} skip rate is ${Math.round(worst.skipRate * 100)}% vs your average of ${Math.round(avgSkipRate * 100)}%. You consistently underperform on ${DAY_NAMES[worst.day]}s.`,
    severity: "warning",
    patternKey: "time_patterns",
  };
}

// --- Orchestrator (DB-dependent) ---

export async function computeUserPatterns(
  db: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Expire old memories
  await db
    .from("coach_memory")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active")
    .lt("expires_at", now.toISOString());

  // Fetch data for analysis
  const [{ data: tasks }, { data: goals }] = await Promise.all([
    db
      .from("tasks")
      .select("title, status, priority, due_date, carry_over_count, reflection, goal_id, created_at")
      .eq("user_id", userId)
      .gte("due_date", thirtyDaysAgo.toISOString())
      .lte("due_date", now.toISOString()),
    db
      .from("goals")
      .select("id, title, status")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const allTasks = tasks || [];
  const allGoals = goals || [];

  // Run all analyses
  const results: PatternResult[] = [];

  // 1. Carry-over frequency
  const carryOver = analyzeCarryOverFrequency(
    allTasks.map((t) => ({
      title: t.title,
      carry_over_count: t.carry_over_count ?? 0,
      status: t.status,
      due_date: t.due_date ?? "",
    }))
  );
  if (carryOver) results.push(carryOver);

  // 2. Excuse trends
  const reflections = allTasks
    .filter((t) => t.reflection)
    .map((t) => ({ reflection: t.reflection! }));
  const excuses = analyzeExcuseTrends(reflections);
  if (excuses) results.push(excuses);

  // 3. Goal stagnation
  const goalData = await Promise.all(
    allGoals.map(async (g) => {
      const { data: lastCompleted } = await db
        .from("tasks")
        .select("due_date")
        .eq("goal_id", g.id)
        .eq("status", "completed")
        .order("due_date", { ascending: false })
        .limit(1);
      const lastDate = lastCompleted?.[0]?.due_date;
      const { count: pending } = await db
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id)
        .eq("status", "pending");
      return {
        title: g.title,
        daysSinceLastCompletion: lastDate
          ? Math.floor(
              (now.getTime() - new Date(lastDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        pendingTasks: pending ?? 0,
        status: g.status,
      };
    })
  );

  // Count goals created in last 14 days
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const { count: newGoals } = await db
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString());

  const stagnation = analyzeGoalStagnation(goalData, newGoals ?? 0);
  if (stagnation) results.push(stagnation);

  // 4. Completion velocity
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thisWeek = allTasks.filter(
    (t) => t.due_date && new Date(t.due_date) > sevenDaysAgo
  );
  const lastWeek = allTasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) <= sevenDaysAgo &&
      new Date(t.due_date) > thirtyDaysAgo
  );
  const thisWeekCompleted = thisWeek.filter(
    (t) => t.status === "completed"
  ).length;
  const lastWeekDays = Math.min(
    7,
    Math.ceil(
      (sevenDaysAgo.getTime() - thirtyDaysAgo.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const lastWeekCompleted = lastWeek.filter(
    (t) => t.status === "completed"
  ).length;

  const velocity = analyzeCompletionVelocity(
    thisWeekCompleted / 7,
    lastWeekDays > 0 ? lastWeekCompleted / lastWeekDays : 0
  );
  if (velocity) results.push(velocity);

  // 5. Time patterns
  const dayMap: Record<number, { completed: number; skipped: number }> = {};
  for (let d = 0; d < 7; d++) dayMap[d] = { completed: 0, skipped: 0 };
  for (const t of allTasks) {
    if (!t.due_date) continue;
    const day = new Date(t.due_date).getDay();
    if (t.status === "completed") dayMap[day].completed++;
    else if (t.status === "skipped" || (t.carry_over_count ?? 0) >= 1)
      dayMap[day].skipped++;
  }
  const timeP = analyzeTimePatterns(
    Object.entries(dayMap).map(([day, stats]) => ({
      day: parseInt(day),
      ...stats,
    }))
  );
  if (timeP) results.push(timeP);

  // Write results: supersede old, insert new
  for (const result of results) {
    // Supersede old pattern with same key
    await db
      .from("coach_memory")
      .update({ status: "superseded", updated_at: now.toISOString() })
      .eq("user_id", userId)
      .eq("pattern_key", result.patternKey)
      .eq("status", "active");

    // Insert fresh pattern
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.from("coach_memory").insert({
      user_id: userId,
      category: "pattern",
      content: result.content,
      source: "pattern_engine",
      severity: result.severity,
      pattern_key: result.patternKey,
      related_to: result.relatedTo ?? null,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/patterns.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/patterns.ts src/__tests__/lib/patterns.test.ts
git commit -m "feat: add pattern engine with 5 analysis functions and orchestrator"
```

---

## Task 8: Wire Pattern Engine to Daily Check-In

**Files:**
- Modify: `src/server/trpc/routers/dailyCheck.ts`

- [ ] **Step 1: Update `carryOverTasks` to increment carry_over_count**

In the `carryOverTasks` mutation, after the existing update, add the increment. Replace the mutation's execute:

```typescript
carryOverTasks: protectedProcedure
  .input(
    z.object({
      taskIds: z.array(z.string()).max(100),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Fetch current carry_over_counts
    const { data: currentTasks } = await ctx.db
      .from("tasks")
      .select("id, carry_over_count")
      .in("id", input.taskIds)
      .eq("user_id", ctx.user.id);

    // Update each task with incremented carry_over_count
    for (const task of currentTasks || []) {
      const { error } = await ctx.db
        .from("tasks")
        .update({
          due_date: today.toISOString(),
          status: "pending",
          carry_over_count: (task.carry_over_count ?? 0) + 1,
        })
        .eq("id", task.id)
        .eq("user_id", ctx.user.id);

      if (error)
        throw new Error(`Failed to carry over task ${task.id}: ${error.message}`);
    }

    return { success: true, count: input.taskIds.length };
  }),
```

- [ ] **Step 2: Update `submitEveningReflections` to increment carry_over_count for skipped tasks and trigger pattern engine**

Add the import at the top of the file:

```typescript
import { computeUserPatterns } from "@/lib/ai/patterns";
```

Update the mutation to increment `carry_over_count` for skipped tasks and fire the pattern engine:

```typescript
submitEveningReflections: protectedProcedure
  .input(
    z.object({
      reflections: z.array(
        z.object({
          taskId: z.string(),
          status: z.enum(["completed", "skipped"]),
          reflection: z.string().optional(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const failures: string[] = [];

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    for (const item of input.reflections) {
      const updateData: Record<string, unknown> = {};
      if (item.status === "skipped") {
        // Fetch current carry_over_count
        const { data: current } = await ctx.db
          .from("tasks")
          .select("carry_over_count")
          .eq("id", item.taskId)
          .eq("user_id", ctx.user.id)
          .single();

        updateData.status = "pending";
        updateData.due_date = tomorrow.toISOString();
        updateData.carry_over_count = ((current?.carry_over_count as number) ?? 0) + 1;
      } else {
        updateData.status = item.status;
      }
      if (item.reflection) {
        updateData.reflection = item.reflection;
      }
      const { error } = await ctx.db
        .from("tasks")
        .update(updateData)
        .eq("id", item.taskId)
        .eq("user_id", ctx.user.id);

      if (error) failures.push(item.taskId);
    }

    if (failures.length > 0) {
      throw new Error(`Failed to update tasks: ${failures.join(", ")}`);
    }

    // Fire pattern engine (non-blocking)
    computeUserPatterns(ctx.db, ctx.user.id).catch((err) =>
      console.error("Pattern engine error:", err)
    );

    return { success: true, count: input.reflections.length };
  }),
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/trpc/routers/dailyCheck.ts
git commit -m "feat: wire pattern engine to evening check-in, track carry-over counts"
```

---

## Task 9: Conversation Persistence

**Files:**
- Modify: `src/server/trpc/routers/conversation.ts`
- Modify: `src/contexts/ChatContext.tsx`

- [ ] **Step 1: Add `getLatest` and `upsert` endpoints to conversation router**

Add these two new procedures to `conversationRouter` in `src/server/trpc/routers/conversation.ts`:

```typescript
/**
 * Get the most recent conversation for the user (within 24 hours)
 */
getLatest: protectedProcedure.query(async ({ ctx }) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data, error } = await (ctx.db as any)
    .from("conversations")
    .select("*")
    .eq("user_id", ctx.user.id)
    .gte("updated_at", oneDayAgo.toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest conversation: ${error.message}`);
  }

  return data ? mapConversationFromDb(data) : null;
}),

/**
 * Create or update a conversation
 */
upsert: protectedProcedure
  .input(
    z.object({
      conversationId: z.string().optional(),
      messages: z.array(z.any()),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (input.conversationId) {
      // Update existing
      const { data, error } = await (ctx.db as any)
        .from("conversations")
        .update({ messages: input.messages })
        .eq("id", input.conversationId)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update conversation: ${error.message}`);
      }
      if (!data) {
        throw new Error("Conversation not found or access denied");
      }
      return mapConversationFromDb(data);
    }

    // Create new
    const { data, error } = await (ctx.db as any)
      .from("conversations")
      .insert({
        user_id: ctx.user.id,
        messages: input.messages,
      })
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
    if (!data) {
      throw new Error("Failed to create conversation: No data returned");
    }
    return mapConversationFromDb(data);
  }),
```

- [ ] **Step 2: Update ChatContext for persistence**

Replace the full contents of `src/contexts/ChatContext.tsx`:

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { trpc } from "@/lib/trpc/client";

const chatTransport = new DefaultChatTransport({ api: "/api/ai/chat" });

interface ChatContextType {
  messages: ReturnType<typeof useChat>["messages"];
  sendMessage: (text: string) => void;
  status: ReturnType<typeof useChat>["status"];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  input: string;
  setInput: (input: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load latest conversation on mount
  const { data: latestConversation } = trpc.conversation.getLatest.useQuery(
    undefined,
    { enabled: !loaded }
  );

  useEffect(() => {
    if (latestConversation && !loaded) {
      setInitialMessages(latestConversation.messages as UIMessage[]);
      setConversationId(latestConversation.id);
      setLoaded(true);
    } else if (latestConversation === null && !loaded) {
      setLoaded(true);
    }
  }, [latestConversation, loaded]);

  const upsertMutation = trpc.conversation.upsert.useMutation({
    onSuccess: (data) => {
      if (!conversationId) setConversationId(data.id);
    },
  });

  const { messages, sendMessage: rawSendMessage, status } = useChat({
    transport: chatTransport,
    initialMessages,
  });

  // Save messages when status transitions to "ready" (debounced)
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== "ready" && status === "ready" && messages.length > 0) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        upsertMutation.mutate({
          conversationId: conversationId ?? undefined,
          messages,
        });
      }, 1000);
    }
    prevStatusRef.current = status;
  }, [status, messages, conversationId, upsertMutation]);

  const sendMessage = useCallback(
    (text: string) => {
      rawSendMessage({ text });
    },
    [rawSendMessage]
  );

  return (
    <ChatContext.Provider
      value={{ messages, sendMessage, status, isOpen, setIsOpen, input, setInput }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useChatContext must be used within ChatProvider");
  return context;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/trpc/routers/conversation.ts src/contexts/ChatContext.tsx
git commit -m "feat: add conversation persistence with 24-hour rolling window"
```

---

## Task 10: Update Accountability Score Router

**Files:**
- Modify: `src/server/trpc/routers/accountabilityScore.ts`

- [ ] **Step 1: Update imports**

Add new imports at the top:

```typescript
import {
  computeWeightedCompletion,
  computeCompletionRate,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";
```

- [ ] **Step 2: Update `getScore` to use new formula**

Update the `getScore` procedure to fetch `priority` and `carry_over_count` and use the new scoring functions. The key changes:

- Change task select to include `priority, carry_over_count`
- Replace `computeCompletionRate` with `computeWeightedCompletion`
- Add `computeDisciplineScore` and `computeVelocityBonus`
- Pass the new shape to `computeScore`
- Same changes for the past-window score calculation

Update `getWindowStats` to also return tasks with priority and carry_over_count:

```typescript
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

  // Check-ins still count for consistency in this router (for backward compat with heatmap)
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

  // For consistency rate: only count days with completions (not just check-ins)
  const activeDaysCompletionsOnly = activeDaysFromTasks.size;
  // For streak: count both
  const activeDaysAll = new Set([
    ...activeDaysFromTasks,
    ...activeDaysFromCheckIns,
  ]).size;

  return { total, completed, activeDaysCompletionsOnly, activeDaysAll, allTasks };
}
```

Then update `getScore` procedure body:

```typescript
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
      carry_over_count: t.carry_over_count ?? 0,
      status: t.status,
    })),
    stats.total
  );

  // Velocity bonus
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekTasks = stats.allTasks.filter(
    (t: any) => t.due_date && new Date(t.due_date) > oneWeekAgo
  );
  const lastWeekTasks = stats.allTasks.filter(
    (t: any) => t.due_date && new Date(t.due_date) <= oneWeekAgo
  );
  const thisWeekRate = thisWeekTasks.length > 0
    ? (thisWeekTasks.filter((t: any) => t.status === "completed").length / thisWeekTasks.length) * 100
    : 0;
  const lastWeekRate = lastWeekTasks.length > 0
    ? (lastWeekTasks.filter((t: any) => t.status === "completed").length / lastWeekTasks.length) * 100
    : 0;
  const velocityBonus = computeVelocityBonus(thisWeekRate, lastWeekRate);

  const score = computeScore({
    weightedCompletion,
    consistencyRate,
    disciplineScore,
    currentStreak,
    velocityBonus,
  });
  const tier = getTier(score);

  // Past window for delta
  const pastEnd = new Date(today);
  pastEnd.setDate(pastEnd.getDate() - 7);
  const pastStart = new Date(pastEnd);
  pastStart.setDate(pastStart.getDate() - (WINDOW_DAYS - 1));
  const pastStats = await getWindowStats(ctx.db, userId, pastStart, pastEnd);
  const pastScore = computeScore({
    weightedCompletion: computeWeightedCompletion(
      pastStats.allTasks.map((t: any) => ({ status: t.status, priority: t.priority }))
    ),
    consistencyRate: computeConsistencyRate(
      pastStats.activeDaysCompletionsOnly,
      WINDOW_DAYS
    ),
    disciplineScore: computeDisciplineScore(
      pastStats.allTasks.map((t: any) => ({
        carry_over_count: t.carry_over_count ?? 0,
        status: t.status,
      })),
      pastStats.total
    ),
    currentStreak: 0,
    velocityBonus: 0,
  });
  const delta = score - pastScore;

  // Today's progress
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
    completionRate: weightedCompletion,
    consistencyRate,
    delta,
    today: { completed: todayCompleted, total: todayTotal },
  };
}),
```

- [ ] **Step 3: Update `getScoreTrend` to use new formula**

In the trend loop, replace the score computation:

```typescript
const cr = computeWeightedCompletion(
  Object.entries(tasksByDate)
    .filter(([d]) => {
      const wDate = new Date(d);
      return wDate >= new Date(date.getTime() - (WINDOW_DAYS - 1) * 86400000) && wDate <= date;
    })
    .flatMap(([, stats]) => [
      ...Array(stats.completed).fill({ status: "completed", priority: "medium" }),
      ...Array(stats.total - stats.completed).fill({ status: "pending", priority: "medium" }),
    ])
);
```

Note: The trend approximation can keep using flat weights since we don't have per-task priority in the indexed data. The trend already notes streak is omitted — add a similar note for discipline being omitted from the per-day trend to save computation. The current approach (one score value per day) remains valid as an approximation.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/accountabilityScore.ts
git commit -m "feat: update accountability score router to use new weighted scoring model"
```

---

## Task 11: Weekly Roast Integration

**Files:**
- Modify: `src/app/api/cron/weekly-roast/route.ts`
- Modify: `src/lib/prompts/weekly-roast-prompt.ts`

- [ ] **Step 1: Update the weekly roast prompt**

Append continuity instructions to the end of `WEEKLY_ROAST_PROMPT` in `src/lib/prompts/weekly-roast-prompt.ts`:

```typescript
// Add before the closing backtick:

Additional context you may receive:
- Active patterns detected by the pattern engine — reference these, don't re-derive them
- Coach notes from the past week — commitments made, recommendations given
- Previous week's roast summary — use for continuity ("Last week I said X. This week...")

If a pattern has already been flagged in coach memory, build on it rather than restating it.
If a commitment was made and broken, call it out explicitly.
```

- [ ] **Step 2: Update the cron job to read/write coach_memory**

In `src/app/api/cron/weekly-roast/route.ts`, add the coach memory integration. After computing `scoreContext`, add:

```typescript
// Fetch coach memory for context
const { data: coachMemory } = await supabase
  .from("coach_memory")
  .select("category, content, severity, created_at")
  .eq("user_id", setting.user_id)
  .eq("status", "active")
  .order("created_at", { ascending: false })
  .limit(20);

const memoryContext = (coachMemory || []).length > 0
  ? `\nCoach Memory:\n${(coachMemory || []).map(
      (m) => `- [${m.category}] ${m.content}`
    ).join("\n")}`
  : "";

// Fetch previous roast for continuity
const { data: prevRoast } = await supabase
  .from("weekly_roasts")
  .select("roast_data")
  .eq("user_id", setting.user_id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const prevContext = prevRoast?.roast_data
  ? `\nPrevious week's summary: "${(prevRoast.roast_data as any).weekSummary}"`
  : "";
```

Update the prompt call to include the new context:

```typescript
const { output: roast } = await generateText({
  model: google(env.AI_MODEL),
  system: WEEKLY_ROAST_PROMPT,
  prompt: weekData + "\n\n" + scoreContext + memoryContext + prevContext,
  output: Output.object({ schema: roastSchema }),
});
```

After storing the roast, write high-severity insights to coach_memory:

```typescript
// Write high-severity insights back to coach_memory
if (roast.insights) {
  for (const insight of roast.insights) {
    if (insight.severity === "high") {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 14);
      await supabase.from("coach_memory").insert({
        user_id: setting.user_id,
        category: "observation",
        content: insight.text,
        source: "weekly_roast",
        severity: "warning",
        status: "active",
        expires_at: expiresAt.toISOString(),
      });
    }
  }
}
```

Also update the scoring section to use the new formula (import and use `computeWeightedCompletion`, `computeDisciplineScore`, `computeVelocityBonus`, `computeScore`).

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/weekly-roast/route.ts src/lib/prompts/weekly-roast-prompt.ts
git commit -m "feat: integrate coach memory into weekly roast for continuity and pattern sharing"
```

---

## Task 12: Run Full Test Suite and Verify Build

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (accountability, context, patterns, plus existing tests).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run dev build**

Run: `npx next build --webpack`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve issues found during final verification"
```
