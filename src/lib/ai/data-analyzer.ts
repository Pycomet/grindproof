import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Task analysis result types
 */
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  overdue: number;
  completionRate: number;
  pendingThisWeek: number;
  pendingNextWeek: number;
  completedLate: number;
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  activeUnder50Percent: number;
  completionRate: number;
  newGoalsThisWeek: number;
  highPriorityActive: number;
}

export interface TaskPattern {
  type: string;
  description: string;
  confidence: number;
  occurrences: number;
  evidence: string[];
}

export interface GoalPattern {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface UserAnalysis {
  taskStats: TaskStats;
  goalStats: GoalStats;
  taskPatterns: TaskPattern[];
  goalPatterns: GoalPattern[];
  evidenceStats: {
    total: number;
    thisWeek: number;
    byType: Record<string, number>;
  };
}

/**
 * Fetch and analyze user tasks
 */
export async function fetchUserTasksAnalysis(
  userId: string,
  supabase: SupabaseClient
): Promise<{ tasks: any[]; stats: TaskStats }> {
  // Fetch all tasks for the user
  const { data: tasks, error } = await (supabase as any)
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  const allTasks = tasks || [];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  
  const startOfNextWeek = new Date(endOfWeek);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  // Calculate stats
  const completed = allTasks.filter(t => t.status === 'completed');
  const pending = allTasks.filter(t => t.status === 'pending');
  const skipped = allTasks.filter(t => t.status === 'skipped');
  
  const overdue = pending.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < now;
  });

  const pendingThisWeek = pending.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= startOfWeek && dueDate < endOfWeek;
  });

  const pendingNextWeek = pending.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= startOfNextWeek && dueDate < endOfNextWeek;
  });

  // Count tasks completed late (due_date < updated_at)
  const completedLate = completed.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date(t.updated_at);
  });

  const stats: TaskStats = {
    total: allTasks.length,
    completed: completed.length,
    pending: pending.length,
    skipped: skipped.length,
    overdue: overdue.length,
    completionRate: allTasks.length > 0 ? completed.length / allTasks.length : 0,
    pendingThisWeek: pendingThisWeek.length,
    pendingNextWeek: pendingNextWeek.length,
    completedLate: completedLate.length,
  };

  return { tasks: allTasks, stats };
}

/**
 * Fetch and analyze user goals
 */
export async function fetchUserGoalsAnalysis(
  userId: string,
  supabase: SupabaseClient
): Promise<{ goals: any[]; stats: GoalStats }> {
  // Fetch all goals for the user
  const { data: goals, error } = await (supabase as any)
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch goals: ${error.message}`);
  }

  const allGoals = goals || [];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Fetch tasks to calculate goal completion rates
  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('id, goal_id, status')
    .eq('user_id', userId);

  const allTasks = tasks || [];

  // Calculate stats
  const active = allGoals.filter(g => g.status === 'active');
  const completed = allGoals.filter(g => g.status === 'completed');
  const paused = allGoals.filter(g => g.status === 'paused');
  const highPriorityActive = active.filter(g => g.priority === 'high');

  // Calculate goals under 50% complete
  const activeUnder50Percent = active.filter(g => {
    const goalTasks = allTasks.filter(t => t.goal_id === g.id);
    if (goalTasks.length === 0) return true; // No tasks = 0% complete
    const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
    const completionRate = completedTasks / goalTasks.length;
    return completionRate < 0.5;
  });

  // Count new goals created this week
  const newGoalsThisWeek = allGoals.filter(g => {
    const createdAt = new Date(g.created_at);
    return createdAt >= startOfWeek;
  });

  const stats: GoalStats = {
    total: allGoals.length,
    active: active.length,
    completed: completed.length,
    paused: paused.length,
    activeUnder50Percent: activeUnder50Percent.length,
    completionRate: allGoals.length > 0 ? completed.length / allGoals.length : 0,
    newGoalsThisWeek: newGoalsThisWeek.length,
    highPriorityActive: highPriorityActive.length,
  };

  return { goals: allGoals, stats };
}

/**
 * Analyze task patterns to detect behavioral issues
 */
export function analyzeTaskPatterns(tasks: any[]): TaskPattern[] {
  const patterns: TaskPattern[] = [];
  const now = new Date();

  if (tasks.length === 0) {
    return patterns;
  }

  // Pattern 1: Procrastination (tasks completed late)
  const completedLate = tasks.filter(t => {
    if (t.status !== 'completed' || !t.due_date) return false;
    return new Date(t.due_date) < new Date(t.updated_at);
  });

  if (completedLate.length > 0) {
    const completedWithDueDate = tasks.filter(t => t.status === 'completed' && t.due_date).length;
    const rate = completedWithDueDate > 0 ? completedLate.length / completedWithDueDate : 0;
    // Only flag as procrastination if rate > 0.5 (more than half of tasks completed late)
    if (rate > 0.5) {
      patterns.push({
        type: 'procrastination',
        description: `${completedLate.length} tasks completed after due date`,
        confidence: Math.min(rate, 1.0),
        occurrences: completedLate.length,
        evidence: completedLate.slice(0, 3).map(t => t.title),
      });
    }
  }

  // Pattern 2: Task skipping behavior
  const skipped = tasks.filter(t => t.status === 'skipped');
  if (skipped.length > 0) {
    const rate = skipped.length / tasks.length;
    if (rate > 0.2) {
      patterns.push({
        type: 'task_skipping',
        description: `${skipped.length} tasks skipped (${Math.round(rate * 100)}% of all tasks)`,
        confidence: Math.min(rate * 2, 1.0),
        occurrences: skipped.length,
        evidence: skipped.slice(0, 3).map(t => t.title),
      });
    }
  }

  // Pattern 3: Overdue tasks accumulation
  const overdue = tasks.filter(t => {
    if (t.status !== 'pending' || !t.due_date) return false;
    return new Date(t.due_date) < now;
  });

  if (overdue.length >= 5) {
    patterns.push({
      type: 'overcommitment',
      description: `${overdue.length} overdue tasks piling up`,
      confidence: Math.min(overdue.length / 10, 1.0),
      occurrences: overdue.length,
      evidence: overdue.slice(0, 3).map(t => t.title),
    });
  }

  // Pattern 4: Tasks without due dates (vague planning)
  const noDueDate = tasks.filter(t => t.status === 'pending' && !t.due_date);
  if (noDueDate.length > 0) {
    const rate = noDueDate.length / tasks.filter(t => t.status === 'pending').length;
    if (rate > 0.5) {
      patterns.push({
        type: 'vague_planning',
        description: `${noDueDate.length} pending tasks without due dates`,
        confidence: Math.min(rate, 1.0),
        occurrences: noDueDate.length,
        evidence: noDueDate.slice(0, 3).map(t => t.title),
      });
    }
  }

  return patterns;
}

/**
 * Analyze goal patterns to detect issues
 */
export function analyzeGoalPatterns(goals: any[], tasks: any[]): GoalPattern[] {
  const patterns: GoalPattern[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  if (goals.length === 0) {
    return patterns;
  }

  const active = goals.filter(g => g.status === 'active');

  // Pattern 1: New project addiction (3+ active goals under 50% complete)
  const activeUnder50 = active.filter(g => {
    const goalTasks = tasks.filter(t => t.goal_id === g.id);
    if (goalTasks.length === 0) return true;
    const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
    return completedTasks / goalTasks.length < 0.5;
  });

  if (activeUnder50.length >= 3) {
    patterns.push({
      type: 'new_project_addiction',
      description: `${activeUnder50.length} active goals under 50% complete`,
      confidence: Math.min(activeUnder50.length / 5, 1.0),
      evidence: activeUnder50.slice(0, 3).map(g => g.title),
    });
  }

  // Pattern 2: Goal abandonment (goals with no recent tasks)
  const abandoned = active.filter(g => {
    const goalTasks = tasks.filter(t => t.goal_id === g.id);
    if (goalTasks.length === 0) return true;
    
    const recentActivity = goalTasks.some(t => {
      return new Date(t.updated_at) > thirtyDaysAgo;
    });
    
    return !recentActivity;
  });

  if (abandoned.length > 0) {
    patterns.push({
      type: 'goal_abandonment',
      description: `${abandoned.length} active goals with no activity in 30+ days`,
      confidence: Math.min(abandoned.length / 3, 1.0),
      evidence: abandoned.slice(0, 3).map(g => g.title),
    });
  }

  // Pattern 3: Goals without tasks (planning without execution)
  const noTasks = active.filter(g => {
    const goalTasks = tasks.filter(t => t.goal_id === g.id);
    return goalTasks.length === 0;
  });

  if (noTasks.length > 0) {
    const rate = noTasks.length / active.length;
    if (rate > 0.3) {
      patterns.push({
        type: 'planning_without_execution',
        description: `${noTasks.length} active goals with no tasks created`,
        confidence: Math.min(rate * 1.5, 1.0),
        evidence: noTasks.slice(0, 3).map(g => g.title),
      });
    }
  }

  return patterns;
}

/**
 * Fetch evidence statistics
 */
export async function fetchEvidenceStats(
  userId: string,
  supabase: SupabaseClient
): Promise<{ total: number; thisWeek: number; byType: Record<string, number> }> {
  // Get user's task IDs first
  const { data: userTasks } = await (supabase as any)
    .from('tasks')
    .select('id')
    .eq('user_id', userId);

  const taskIds = (userTasks || []).map(t => t.id);

  if (taskIds.length === 0) {
    return { total: 0, thisWeek: 0, byType: {} };
  }

  // Fetch all evidence for user's tasks
  const { data: evidence } = await (supabase as any)
    .from('evidence')
    .select('*')
    .in('task_id', taskIds);

  const allEvidence = evidence || [];
  
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeek = allEvidence.filter(e => new Date(e.submitted_at) >= startOfWeek);

  const byType: Record<string, number> = {};
  allEvidence.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });

  return {
    total: allEvidence.length,
    thisWeek: thisWeek.length,
    byType,
  };
}

/**
 * Comprehensive user analysis
 * Fetches and analyzes all user data
 */
export async function analyzeUserData(
  userId: string,
  supabase: SupabaseClient
): Promise<UserAnalysis> {
  // Fetch tasks and goals
  const { tasks, stats: taskStats } = await fetchUserTasksAnalysis(userId, supabase);
  const { goals, stats: goalStats } = await fetchUserGoalsAnalysis(userId, supabase);
  
  // Analyze patterns
  const taskPatterns = analyzeTaskPatterns(tasks);
  const goalPatterns = analyzeGoalPatterns(goals, tasks);
  
  // Fetch evidence stats
  const evidenceStats = await fetchEvidenceStats(userId, supabase);

  return {
    taskStats,
    goalStats,
    taskPatterns,
    goalPatterns,
    evidenceStats,
  };
}

