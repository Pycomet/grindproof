# GrindProof AI Coach Robustness Overhaul

**Date**: 2026-04-16
**Status**: Design — pending implementation plan
**Approach**: Pattern Engine + Smart Context (Approach B)

---

## Problem Statement

The AI coach is a stateless text generator, not a real coach. It has no memory, no context awareness at conversation start, no pattern detection capability, and a scoring model that's trivially gameable. The system prompt promises data-driven accountability coaching but the architecture delivers a chatbot with optional database lookups.

### Critical Gaps

1. **No context injection** — Coach starts every conversation blind. Zero data about the user's current situation.
2. **No memory** — Every page refresh is a blank slate. Coach can't track commitments or reference past sessions.
3. **No pattern detection** — System prompt says "detect avoidance, overcommitment" but provides no data to detect from.
4. **Streak hardcoded to 0** in the AI tool — coach never knows the actual streak.
5. **Weekly roast disconnected** — Rich analysis generated weekly but inaccessible to the live coach.
6. **Scoring model too simple** — No priority weighting, no anti-gaming, consistency credits check-ins without completions.
7. **Task tools lack coaching context** — No reflections, no goal joins, no task age, no carry-over tracking.
8. **Check-in data doesn't feed back** — Patterns from daily check-ins aren't aggregated anywhere the coach can access.

---

## Architecture Overview

### Core Principle

The coach doesn't need to be a smarter AI — it needs to be a **better-informed** AI. This design focuses on giving it the right data at the right time.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Context approach | Conditional proactive | Coach stays quiet if things look normal, flags when something is off |
| Memory model | Session-based with coach notes | Real coaches check notes, not replay transcripts |
| Pattern detection | Hybrid — pre-computed + real-time tools | Historical patterns computed on schedule, real-time lookups for fresh data |
| Note extraction | Inline via AI tool | Coach saves notes during conversation, no unreliable "conversation end" detection |
| Data storage | Unified `coach_memory` table | One table, one query, multiple writers (coach, pattern engine, weekly roast) |

### Data Flow

```
Evening Check-in Submit
  → submitEveningReflections (existing)
  → computeUserPatterns() (new — fire-and-forget)
    → analyzeCarryOverFrequency()
    → analyzeExcuseTrends()
    → analyzeGoalStagnation()
    → analyzeCompletionVelocity()
    → analyzeTimePatterns()
    → writes to coach_memory (source: pattern_engine)

User Opens Chat
  → POST /api/ai/chat
  → buildCoachContext(userId, supabase)
    → parallel queries: snapshot + coach_memory + today's tasks
    → assemble context string with conditional alerts
  → streamText(system_prompt + context, messages, tools)

During Conversation
  → Coach calls save_coach_note for commitments, patterns, recommendations
  → Coach calls update_coach_note to mark commitments fulfilled/broken
  → Coach calls get_reflection_history / get_task_history for deeper analysis

Weekly Roast (Sunday 9am)
  → Reads coach_memory for active patterns (instead of re-deriving)
  → Generates roast with continuity (references past roast, coach notes)
  → Writes high-severity insights back to coach_memory (source: weekly_roast)
```

---

## Section 1: Database Changes

### New Table: `coach_memory`

Unified storage for everything the coach needs to remember across sessions.

```sql
CREATE TABLE coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,        -- commitment, recommendation, pattern, observation, excuse_flagged
  content TEXT NOT NULL,          -- natural language note
  source TEXT NOT NULL,           -- coach_inline, pattern_engine, weekly_roast
  severity TEXT,                  -- info, warning, critical (nullable)
  related_to JSONB,              -- { taskIds: [], goalIds: [], score: 72, carryOverCount: 6 }
  pattern_key TEXT,              -- nullable, used by pattern engine for deduplication (carry_over, excuse_trends, goal_stagnation, velocity, time_patterns)
  status TEXT NOT NULL DEFAULT 'active',  -- active, fulfilled, broken, expired, superseded
  expires_at TIMESTAMPTZ,        -- auto-expire (30d default, 7d for commitments)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_memory_user_active
  ON coach_memory (user_id, status, created_at DESC);

CREATE INDEX idx_coach_memory_pattern_dedup
  ON coach_memory (user_id, source, pattern_key)
  WHERE pattern_key IS NOT NULL;
```

### Alter Table: `tasks`

Add carry-over tracking:

```sql
ALTER TABLE tasks ADD COLUMN carry_over_count INTEGER NOT NULL DEFAULT 0;
```

Increment in two places:
- `carryOverTasks` mutation in `dailyCheck.ts`
- `submitEveningReflections` mutation when a skipped task rolls to tomorrow

---

## Section 2: Context Injection — `buildCoachContext()`

### Function Signature

```
buildCoachContext(userId: string, supabase: SupabaseClient) → Promise<string>
```

Located in: `src/lib/ai/context.ts` (new file)

### Three Parallel Queries

**Query 1: Current Snapshot**
- Accountability score (using new weighted formula), tier, streak, delta from last week
- Active goals with completion percentages

**Query 2: Today's Tasks**
- All tasks due today with status, priority, title
- All overdue tasks (due before today, status = pending)

**Query 3: Coach Memory**
- `SELECT * FROM coach_memory WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 20`

### Conditional Alerts

Computed from query results. Only included when triggered:

| Condition | Alert |
|-----------|-------|
| Score dropped 10+ points from last week | `ALERT: Score dropped from X to Y this week` |
| Streak broken (was 3+ days, now 0) | `ALERT: Streak broken after X days` |
| 3+ overdue tasks | `ALERT: X tasks overdue` |
| Task with carry_over_count >= 3 | `ALERT: "Task name" carried over X times` |
| Active commitment with passed deadline | `ALERT: User committed to "X" by DATE — no evidence of completion` |
| 5+ active goals under 50% complete | `ALERT: X active goals under 50% — overcommitment risk` |

### Output Format

```
=== CURRENT USER CONTEXT ===

ALERTS:
- Score dropped from 72 to 61 this week
- "Redesign landing page" carried over 4 times

ACCOUNTABILITY: Score 61/100 (Grinding) | Streak: 3 days | Completion: 58% | Consistency: 43%
Delta: -11 from last week

TODAY (April 16):
- [pending] Fix auth bug (high priority, due today)
- [pending] Write API tests (medium, due today)
- [completed] Review PR #42 (medium)
- [overdue] Update documentation (low, due Apr 14)

ACTIVE GOALS:
- Ship v2 auth system: 6/10 tasks done (60%)
- Redesign landing page: 1/8 tasks done (12%)
- API performance: 3/3 tasks done (100%)

COACH MEMORY (recent):
- [commitment, Apr 14] User committed to finishing auth bug by Apr 16
- [pattern, Apr 15] User carries over tasks 38% of the time — mostly low-priority items pushed indefinitely
- [recommendation, Apr 13] Suggested limiting daily tasks to 4 max
- [excuse_flagged, Apr 12] "Priorities changed" used 3rd time this month
- [observation, Apr 10] User responds well to specific deadlines, poorly to open-ended goals

=== END CONTEXT ===

When ALERTS are present, open the conversation by addressing the most critical one. When no alerts, stay quiet until the user engages.
```

### Token Budget

Estimated 400-800 tokens depending on data volume. Combined with system prompt (~600 tokens), total system message stays under 1500 tokens.

### Integration Point

In `src/app/api/ai/chat/route.ts`:
```typescript
const coachContext = await buildCoachContext(user.id, supabase);
const system = GRINDPROOF_SYSTEM_PROMPT + "\n\n" + coachContext;
```

---

## Section 3: New AI Tools

### `save_coach_note`

The memory tool. Called inline during conversations.

- **Input**: `category` (commitment | recommendation | pattern_flagged | observation | excuse_called), `content` (string), `relatedTo` (optional jsonb), `expiresInDays` (number, default 30, commitments default 7)
- **Behavior**: Insert into `coach_memory` with `source = 'coach_inline'`
- **Returns**: `{ success: true, noteId: string }`

### `update_coach_note`

Marks commitments as fulfilled or broken.

- **Input**: `noteId` (string), `status` (fulfilled | broken | expired)
- **Behavior**: Update `coach_memory` row, set `updated_at`
- **Returns**: `{ success: true }`

### `get_reflection_history`

Surfaces past excuses and reflections.

- **Input**: `days` (number, default 30), `limit` (number, default 20)
- **Behavior**: Query tasks where `reflection IS NOT NULL`, ordered by `due_date DESC`
- **Returns**: Array of `{ taskTitle, reflection, dueDate, status }`

### `get_task_history`

Historical view for deeper analysis.

- **Input**: `days` (number, default 30), `groupBy` ("status" | "goal" | "day", default "status")
- **Behavior**: Query tasks in range, group and count by dimension
- **Returns**:
  - `groupBy "status"` → `{ completed, skipped, pending, total }`
  - `groupBy "goal"` → `[{ goalTitle, completed, skipped, pending }]`
  - `groupBy "day"` → `[{ date, completed, total }]`

### Improvements to Existing Tools

**`get_accountability_score`**:
- Compute actual streak (replace hardcoded `currentStreak: 0`)
- Add `delta` (score change from last week)
- Add tier description
- Add `todayProgress` (completed/total)

**`list_tasks`**:
- Include `reflection` field
- Include `goal_id` + goal title (join)
- Include `created_at` for task age
- Include `carry_over_count`

**`list_goals`**:
- Include `description`
- Include `created_at`
- Filter to active goals by default
- Compute staleness: days since last completed task under goal

**`create_task`**:
- Add optional `goalId` parameter

---

## Section 4: Pattern Engine

### Trigger

Called at the end of `submitEveningReflections` in `dailyCheck.ts`. Non-blocking (fire-and-forget or `waitUntil`).

```typescript
// After updating tasks...
computeUserPatterns(ctx.db, ctx.user.id); // no await — fire and forget
return { success: true, count: input.reflections.length };
```

Located in: `src/lib/ai/patterns.ts` (new file)

### Pattern Functions

Each function: `analyze*(db, userId) → { content, severity, relatedTo?, patternKey } | null`

Returns null if no pattern detected. On detection, supersedes prior entry with same `pattern_key` and inserts fresh row.

**1. `analyzeCarryOverFrequency`** (pattern_key: `carry_over`)
- Query tasks from last 30 days
- Count tasks with `carry_over_count >= 3`
- If >20% are chronic carry-overs → severity `warning`
- If any single task has `carry_over_count >= 5` → severity `critical`, name the task
- Example: `"38% of tasks in the last 30 days were carried over 3+ times. 'Redesign landing page' has been carried over 6 times — it's either too big, not important, or being avoided."`

**2. `analyzeExcuseTrends`** (pattern_key: `excuse_trends`)
- Query tasks with non-null `reflection` from last 30 days
- Keyword clustering:
  - `distracted / lost focus / sidetracked` → "focus"
  - `tired / exhausted / burnout / energy` → "energy"
  - `underestimated / took longer / not enough time` → "planning"
  - `priorities changed / something came up / urgent` → "commitment"
  - `forgot / didn't remember` → "systems"
- If any cluster appears 3+ times → flag
- Example: `"'Focus' issues mentioned 5 times in 30 days. 'Planning' issues mentioned 3 times. Focus is the dominant blocker — not capacity."`

**3. `analyzeGoalStagnation`** (pattern_key: `goal_stagnation`)
- For each active goal, find most recent completed task
- 14+ days with no completion → severity `warning`
- 30+ days → severity `critical`
- New goals created while stagnant goals exist → flag new-project addiction
- Example: `"'Redesign landing page' has had no completed tasks in 22 days despite 7 pending tasks. Meanwhile, 2 new goals were created. Classic new-project-addiction pattern."`

**4. `analyzeCompletionVelocity`** (pattern_key: `velocity`)
- Compare completed-per-day average: last 7 days vs previous 7 days
- Drop of 30%+ → severity `warning`
- Increase of 30%+ → severity `info` (positive)
- Tasks created/day > completed/day consistently → overcommitment flag
- Example: `"Completion velocity dropped 40% this week (2.1/day -> 1.3/day). Task creation stayed at 3.2/day — accumulating debt faster than clearing it."`

**5. `analyzeTimePatterns`** (pattern_key: `time_patterns`)
- Group completed tasks by day of week
- Group skipped/carried-over tasks by day of week
- If skip rate on any day is 2x+ the average → flag
- Example: `"Friday skip rate is 62% vs your average of 28%. You consistently overcommit heading into the weekend."`

### Expiry Cleanup

The `buildCoachContext()` query already filters by `status = 'active'`, so expired rows don't appear in context. A lightweight cleanup runs inside `computeUserPatterns()` (which fires after every evening check-in):

```sql
UPDATE coach_memory SET status = 'expired', updated_at = now()
WHERE user_id = $1 AND status = 'active' AND expires_at < now();
```

One extra query per evening check-in. No separate cron needed.

### Supersession Logic

Before writing any pattern:
```sql
UPDATE coach_memory
SET status = 'superseded', updated_at = now()
WHERE user_id = $1 AND pattern_key = $2 AND status = 'active';
```

Then insert the fresh pattern.

---

## Section 5: Scoring Model Improvements

### New Formula

```
weighted_completion = sum(task_weight for completed) / sum(task_weight for all) * 100
consistency_rate = (active_days / window_days) * 100    -- active day = 1+ completed task
discipline_score = 100 - carry_over_penalty - overcommit_penalty
velocity_bonus = clamp(completion_velocity_trend, -5, +5)
streak_bonus = min(max(streak - 6, 0), 5)

score = (weighted_completion * 0.55)
      + (consistency_rate * 0.30)
      + (discipline_score * 0.15)
      + streak_bonus
      + velocity_bonus

clamped to [0, 100]
```

### Priority Weights

| Priority | Weight |
|----------|--------|
| high | 3 |
| medium | 2 |
| low | 1 |

### Discipline Score Components

```
carry_over_penalty = (tasks_carried_over_3_plus / total_tasks) * 50   -- capped at 30
overcommit_penalty = max(0, (created - completed) / created * 40)     -- capped at 20, only if creating > completing
discipline_score = max(0, 100 - carry_over_penalty - overcommit_penalty)
```

### Consistency Change

Active day now requires at least 1 completed task. Check-ins alone no longer count for consistency. Check-ins still count for streak calculation (showing up matters for streaks).

### Velocity Bonus

- Compare completion rate this week vs last week
- Improving by 10%+ → +1 to +5 (scaled)
- Declining by 10%+ → -1 to -5 (scaled)
- Stable → 0

### Anti-Gaming Properties

| Strategy | Old | New |
|----------|-----|-----|
| Create 20 trivial low-priority tasks, complete all | 100% | High weighted completion but discipline penalty if high-priority work ignored |
| Check in daily, complete nothing | Full consistency credit | Consistency = 0 |
| Create 10, complete 5, carry over 5 forever | 50% completion only | Carry-over + overcommit penalties hit discipline score |
| Complete everything planned | 100% | Still 100% — not gaming if you follow through |

### Tier Thresholds

Unchanged: Proven (90+), Locked In (75+), Grinding (60+), Warming Up (40+), Slacking (<40).

### New Functions

- `computeWeightedCompletion(tasks: { status, priority }[]) → number`
- `computeDisciplineScore(tasks: { carry_over_count, status }[], created: number) → number`
- `computeVelocityBonus(currentRate: number, previousRate: number) → number`
- Updated `computeScore()` signature to accept new inputs
- Updated `computeConsistencyRate()` — only counts days with completions

### Callers to Update

- `get_accountability_score` AI tool
- `accountabilityScore` router (getScore, getScoreTrend)
- `weekly-roast` cron job
- `buildCoachContext()`

---

## Section 6: System Prompt Rewrite

### Structure: Identity + Context Protocol + Tool Protocol

**IDENTITY** (~150 tokens):
```
You are GrindProof: a blunt, data-driven personal accountability coach.

Your job: help the user finish what they started before starting anything new. You have access to their real data — use it.

Tone:
- Firm, direct, evidence-based. Never cruel.
- If they're honest, be supportive. If they dodge, call it out.
- 2-4 sentences for general responses. Longer only for pattern analysis or reports.
- No filler. No invented data. If you infer, say so.
```

**CONTEXT PROTOCOL** (~200 tokens):
```
=== HOW TO USE YOUR CONTEXT ===

You receive a CURRENT USER CONTEXT block with every conversation containing:
ALERTS, ACCOUNTABILITY, TODAY, ACTIVE GOALS, and COACH MEMORY.

Rules:
- Reference specific data points, not vague summaries.
- When the user claims progress, verify against the data before giving credit.
- Check COACH MEMORY for prior commitments before accepting new ones.
- Do not repeat alerts the user has already acknowledged in the current conversation.
```

**TOOL PROTOCOL** (~250 tokens):
```
=== WHEN TO USE YOUR TOOLS ===

MEMORY (save_coach_note):
Call when the user makes a commitment, you give a key recommendation, you spot a
pattern, the user has a breakthrough, or you call out a recurring excuse.
Only save what future-you needs to hold them accountable.

COMMITMENT TRACKING (update_coach_note):
When user claims completion: check memory for commitment → verify with data → mark
fulfilled or call out.

DEEPER ANALYSIS (get_reflection_history, get_task_history):
Use when conversation goes beyond today's snapshot.

TASK MANAGEMENT (create/update/delete_task):
Always ask which goal a new task belongs to.
Push back on new tasks while overdue tasks exist.
Block new goals if 5+ active goals under 50%.

SCORE (get_accountability_score):
Context already includes current score. Only call for a fresh read mid-conversation.
```

---

## Section 7: Chat Persistence

### Conversation Loading

On `ChatProvider` mount:
1. Call `trpc.conversation.getLatest` (new endpoint)
2. If conversation exists and `updated_at` < 24 hours old → load as `initialMessages`
3. Otherwise → start fresh

### Conversation Saving

After each assistant response completes (`status` transitions from `streaming` to `ready`):
1. Debounce 1 second
2. Call `trpc.conversation.upsert` with current messages + conversation ID

### New Conversation Router Endpoints

**`getLatest`**: Returns most recent conversation for user (single row, `ORDER BY updated_at DESC LIMIT 1`), or null.

**`upsert`**: If `conversationId` provided → update. If not → create and return ID.

### 24-Hour Rolling Window

Conversations older than 24 hours are not loaded. Long-term memory lives in `coach_memory`. This keeps context clean and forces reliance on coach notes for cross-session continuity.

---

## Section 8: Weekly Roast Integration

### Changes to Cron Job

**1. Read patterns from `coach_memory`** instead of re-deriving:
```sql
SELECT content, severity, category FROM coach_memory
WHERE user_id = $1 AND status = 'active'
ORDER BY created_at DESC LIMIT 20
```

**2. Write high-severity roast insights back to `coach_memory`**:
- Each insight with severity "high" → insert as `source = 'weekly_roast'`, `category = 'observation'`, `expires_at = now() + 14 days`

**3. Use new scoring model** — same `computeScore()` as live coach.

**4. Enrich roast prompt payload** with:
- Active patterns from coach memory
- Recent coach notes (commitments, recommendations)
- Previous roast summary (for continuity)

**5. Add to roast prompt**:
```
If a pattern has already been flagged in coach memory, build on it rather than restating it.
If a commitment was made and broken, call it out explicitly.
Reference the previous week's roast for continuity when available.
```

### What Stays the Same

- Cron trigger logic (Sunday ~9am user local time)
- Roast output format (JSON: insights, recommendations, weekSummary)
- `weekly_roasts` table schema
- Email delivery via Resend
- `roastSchema` Zod validation

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/context.ts` | `buildCoachContext()` function |
| `src/lib/ai/patterns.ts` | Pattern engine (5 analysis functions + orchestrator) |
| `supabase/migrations/XXXX_add_coach_memory.sql` | coach_memory table + tasks.carry_over_count |

## Modified Files

| File | Changes |
|------|---------|
| `src/lib/prompts/system-prompt.ts` | Full rewrite — identity + context protocol + tool protocol |
| `src/lib/ai/tools.ts` | 4 new tools + improvements to 4 existing tools |
| `src/lib/accountability.ts` | New scoring functions, updated formula |
| `src/app/api/ai/chat/route.ts` | Context injection, increased step count |
| `src/contexts/ChatContext.tsx` | Conversation persistence (load/save) |
| `src/server/trpc/routers/conversation.ts` | Add `getLatest` and `upsert` endpoints |
| `src/server/trpc/routers/dailyCheck.ts` | Trigger pattern engine, increment carry_over_count |
| `src/server/trpc/routers/accountabilityScore.ts` | Use new scoring model |
| `src/app/api/cron/weekly-roast/route.ts` | Read/write coach_memory, use new scoring, enrich prompt |
| `src/lib/prompts/weekly-roast-prompt.ts` | Add continuity instructions |
