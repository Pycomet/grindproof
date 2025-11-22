import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { VALIDATION_CONFIG, AI_CONFIG } from '@/lib/config';
import { createServerClient } from '@/lib/supabase/server';
import { analyzeUserData } from '@/lib/ai/data-analyzer';
import { WEEKLY_ROAST_PROMPT } from '@/lib/prompts/weekly-roast-prompt';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

interface WeeklyMetrics {
  weekStart: Date;
  weekEnd: Date;
  alignmentScore: number;
  honestyScore: number;
  completionRate: number;
  newProjectsStarted: number;
  evidenceSubmissions: number;
  tasksPlanned: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksOverdue: number;
}

function getWeekBoundaries(weekStart?: string): { start: Date; end: Date } {
  let start: Date;
  
  if (weekStart) {
    start = new Date(weekStart);
  } else {
    // Default to current week (Sunday start)
    start = new Date();
    start.setDate(start.getDate() - start.getDay());
  }
  
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  
  return { start, end };
}

async function calculateWeeklyMetrics(
  userId: string,
  supabase: any,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyMetrics> {
  // Fetch tasks for the week
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  const weekTasks = tasks || [];

  // Fetch goals created this week
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  const weekGoals = goals || [];

  // Fetch all active goals to check completion percentage
  const { data: activeGoals } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');

  const activeGoalIds = (activeGoals || []).map((g: any) => g.id);

  // Fetch all tasks for active goals to calculate completion rates
  let allGoalTasks = [];
  if (activeGoalIds.length > 0) {
    const { data: goalTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .in('goal_id', activeGoalIds);
    
    allGoalTasks = goalTasks || [];
  }

  // Count new goals created while existing goals are under 50% complete
  let newProjectsStarted = 0;
  for (const goal of weekGoals) {
    const goalsUnder50 = activeGoalIds.filter((gid: string) => {
      const tasks = allGoalTasks.filter((t: any) => t.goal_id === gid);
      if (tasks.length === 0) return true;
      const completed = tasks.filter((t: any) => t.status === 'completed').length;
      return completed / tasks.length < 0.5;
    });
    
    if (goalsUnder50.length >= 3) {
      newProjectsStarted++;
    }
  }

  // Fetch evidence submitted this week (need task IDs first)
  const { data: allUserTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId);

  const userTaskIds = (allUserTasks || []).map((t: any) => t.id);

  let evidenceSubmissions = 0;
  let validatedEvidenceCount = 0;
  if (userTaskIds.length > 0) {
    const { data: evidence } = await supabase
      .from('evidence')
      .select('*')
      .in('task_id', userTaskIds)
      .gte('submitted_at', weekStart.toISOString())
      .lt('submitted_at', weekEnd.toISOString());

    evidenceSubmissions = (evidence || []).length;
    validatedEvidenceCount = (evidence || []).filter((e: any) => e.ai_validated === true).length;
  }

  // Calculate metrics
  const completed = weekTasks.filter((t: any) => t.status === 'completed');
  const skipped = weekTasks.filter((t: any) => t.status === 'skipped');
  const pending = weekTasks.filter((t: any) => t.status === 'pending');
  const overdue = pending.filter((t: any) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  // Tasks that were supposed to be done this week (due date in week range)
  const { data: plannedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', weekStart.toISOString())
    .lt('due_date', weekEnd.toISOString());

  const planned = plannedTasks || [];
  const plannedCompleted = planned.filter((t: any) => t.status === 'completed');

  // Alignment score: planned vs actually completed
  const alignmentScore = planned.length > 0 
    ? plannedCompleted.length / planned.length 
    : weekTasks.length > 0 
      ? completed.length / weekTasks.length 
      : 0;

  // Honesty score: weighted by AI validation (configurable weights)
  const validatedWeight = VALIDATION_CONFIG.EVIDENCE_WEIGHTS.VALIDATED;
  const unvalidatedWeight = VALIDATION_CONFIG.EVIDENCE_WEIGHTS.UNVALIDATED;
  const honestyScore = completed.length > 0 
    ? Math.min(
        (validatedEvidenceCount * validatedWeight + (evidenceSubmissions - validatedEvidenceCount) * unvalidatedWeight) / completed.length,
        1.0
      )
    : 0;

  // Completion rate: completed / (completed + pending + skipped)
  const totalTasksWithStatus = weekTasks.length;
  const completionRate = totalTasksWithStatus > 0 
    ? completed.length / totalTasksWithStatus 
    : 0;

  return {
    weekStart,
    weekEnd,
    alignmentScore: Math.round(alignmentScore * 100) / 100,
    honestyScore: Math.round(honestyScore * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
    newProjectsStarted,
    evidenceSubmissions,
    tasksPlanned: planned.length,
    tasksCompleted: completed.length,
    tasksSkipped: skipped.length,
    tasksOverdue: overdue.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    let weekStartStr: string | undefined;
    try {
      const body = await request.json();
      weekStartStr = body.weekStart;
    } catch {
      // Body is optional
    }

    // Calculate week boundaries
    const { start: weekStart, end: weekEnd } = getWeekBoundaries(weekStartStr);

    // Calculate weekly metrics
    const metrics = await calculateWeeklyMetrics(user.id, supabase, weekStart, weekEnd);

    // Get comprehensive user analysis
    const analysis = await analyzeUserData(user.id, supabase);

    // Fetch existing patterns
    const { data: patterns } = await (supabase as any)
      .from('patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('confidence', { ascending: false })
      .limit(5);

    // Fetch accountability scores for the week (reflections)
    const { data: accountabilityScores } = await (supabase as any)
      .from('accountability_scores')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', weekStart.toISOString().split('T')[0])
      .lt('week_start', weekEnd.toISOString().split('T')[0])
      .order('week_start', { ascending: true });

    // Extract all reflections from the week
    const weekReflections: string[] = [];
    const reflectionPatterns: Record<string, number> = {};
    
    if (accountabilityScores) {
      accountabilityScores.forEach((score: any) => {
        const metadata = score.roast_metadata || {};
        const reflections = metadata.reflections || {};
        
        Object.values(reflections).forEach((reflection: any) => {
          if (reflection && typeof reflection === 'string') {
            weekReflections.push(reflection.toLowerCase());
            
            // Detect common excuse patterns
            const commonExcuses = {
              'distracted': /distract|interrupt/i,
              'time_underestimated': /underestimate|took longer|more time/i,
              'tired': /tired|exhausted|energy|sleep/i,
              'procrastination': /procrastinat|put off|delay/i,
              'forgot': /forgot|remember/i,
              'unexpected': /unexpected|came up|emergency/i,
              'priority_change': /priority|changed|urgent/i,
            };
            
            Object.entries(commonExcuses).forEach(([pattern, regex]) => {
              if (regex.test(reflection)) {
                reflectionPatterns[pattern] = (reflectionPatterns[pattern] || 0) + 1;
              }
            });
          }
        });
      });
    }

    // Prepare data for AI
    const roastData = {
      week: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      },
      metrics: {
        alignmentScore: Math.round(metrics.alignmentScore * 100),
        honestyScore: Math.round(metrics.honestyScore * 100),
        completionRate: Math.round(metrics.completionRate * 100),
        tasksPlanned: metrics.tasksPlanned,
        tasksCompleted: metrics.tasksCompleted,
        tasksSkipped: metrics.tasksSkipped,
        tasksOverdue: metrics.tasksOverdue,
        newProjectsStarted: metrics.newProjectsStarted,
        evidenceSubmissions: metrics.evidenceSubmissions,
      },
      patterns: (patterns || []).map((p: any) => ({
        type: p.pattern_type,
        description: p.description,
        confidence: Math.round(p.confidence * 100),
      })),
      reflections: {
        totalReflections: weekReflections.length,
        topExcuses: Object.entries(reflectionPatterns)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([pattern, count]) => ({
            pattern: pattern.replace('_', ' '),
            count,
          })),
        sampleReflections: weekReflections.slice(0, 5),
      },
      overall: {
        totalGoals: analysis.goalStats.total,
        activeGoals: analysis.goalStats.active,
        goalsUnder50Percent: analysis.goalStats.activeUnder50Percent,
        totalTasks: analysis.taskStats.total,
        overdueTasksTotal: analysis.taskStats.overdue,
      },
    };

    // Generate roast with AI
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.MODELS.TEXT,
      systemInstruction: WEEKLY_ROAST_PROMPT,
    });

    const result = await model.generateContent(
      `Generate a Weekly Roast Report based on this data:\n\n${JSON.stringify(roastData, null, 2)}`
    );
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiInsights: any = {
      insights: [],
      recommendations: [],
      weekSummary: 'Week complete. Keep pushing forward.',
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiInsights = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Use fallback insights
      aiInsights = {
        insights: [
          {
            emoji: '📊',
            text: `${metrics.tasksCompleted}/${metrics.tasksPlanned} tasks completed this week`,
            severity: metrics.completionRate >= 0.7 ? 'positive' : 'medium',
          },
        ],
        recommendations: ['Focus on completing pending tasks before adding new ones'],
        weekSummary: 'Week analyzed. Review your metrics above.',
      };
    }

    // Save accountability score to database
    const weekStartDate = weekStart.toISOString().split('T')[0];

    // Check if score already exists for this week
    const { data: existingScore } = await (supabase as any)
      .from('accountability_scores')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStartDate)
      .maybeSingle();

    if (existingScore) {
      // Update existing score
      await (supabase as any)
        .from('accountability_scores')
        .update({
          alignment_score: metrics.alignmentScore,
          honesty_score: metrics.honestyScore,
          completion_rate: metrics.completionRate,
          new_projects_started: metrics.newProjectsStarted,
          evidence_submissions: metrics.evidenceSubmissions,
          insights: aiInsights.insights || [],
          recommendations: aiInsights.recommendations || [],
          week_summary: aiInsights.weekSummary || null,
        })
        .eq('id', existingScore.id);
    } else {
      // Create new score
      await (supabase as any)
        .from('accountability_scores')
        .insert({
          user_id: user.id,
          week_start: weekStartDate,
          alignment_score: metrics.alignmentScore,
          honesty_score: metrics.honestyScore,
          completion_rate: metrics.completionRate,
          new_projects_started: metrics.newProjectsStarted,
          evidence_submissions: metrics.evidenceSubmissions,
          insights: aiInsights.insights || [],
          recommendations: aiInsights.recommendations || [],
          week_summary: aiInsights.weekSummary || null,
        });
    }

    // Return roast data
    return NextResponse.json({
      success: true,
      weekStart: weekStartDate,
      alignmentScore: metrics.alignmentScore,
      honestyScore: metrics.honestyScore,
      completionRate: metrics.completionRate,
      newProjectsStarted: metrics.newProjectsStarted,
      evidenceSubmissions: metrics.evidenceSubmissions,
      metrics: {
        tasksPlanned: metrics.tasksPlanned,
        tasksCompleted: metrics.tasksCompleted,
        tasksSkipped: metrics.tasksSkipped,
        tasksOverdue: metrics.tasksOverdue,
      },
      insights: aiInsights.insights || [],
      recommendations: aiInsights.recommendations || [],
      weekSummary: aiInsights.weekSummary,
    });

  } catch (error: any) {
    console.error('Roast generation error:', error);

    // Handle Gemini API errors
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        {
          error: 'AI roast generation temporarily unavailable due to quota limits. Please try again later.',
          errorType: 'quota_exceeded',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('API key')) {
      return NextResponse.json(
        {
          error: 'AI roast generation temporarily unavailable due to configuration issue.',
          errorType: 'service_unavailable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate roast. Please try again.',
        errorType: 'unknown',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

