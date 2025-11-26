import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionCall } from '@google/generative-ai';
import { env } from '@/lib/env';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/prompts/system-prompt';
import { createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { appRouter } from '@/server/trpc/routers/_app';
import { createContext } from '@/server/trpc/context';
import {
  GRINDPROOF_TOOLS,
  CreateTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
  SearchTasksParams,
  SearchGoalsParams,
} from '@/lib/ai/function-tools';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

// ============================================================================
// FUNCTION EXECUTION HANDLERS
// ============================================================================

/**
 * Execute create_task function
 */
async function executeCreateTask(
  params: CreateTaskParams,
  request: NextRequest,
  user: any
): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    console.log('[FUNCTION] create_task called with params:', params);

    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      return {
        success: false,
        message: 'Task title is required. Please provide a clear task description.',
        error: 'MISSING_TITLE',
      };
    }

    // Parse dates and times
    let dueDate: Date | undefined;
    let startTime: Date | undefined;
    let endTime: Date | undefined;

    if (params.dueDate) {
      try {
        dueDate = new Date(params.dueDate);
        if (isNaN(dueDate.getTime())) {
          dueDate = undefined;
        }
      } catch {
        dueDate = undefined;
      }
    }

    if (params.startTime && dueDate) {
      try {
        const [hours, minutes] = params.startTime.split(':').map(Number);
        startTime = new Date(dueDate);
        startTime.setHours(hours, minutes || 0, 0, 0);
      } catch {
        startTime = undefined;
      }
    }

    if (params.endTime && dueDate) {
      try {
        const [hours, minutes] = params.endTime.split(':').map(Number);
        endTime = new Date(dueDate);
        endTime.setHours(hours, minutes || 0, 0, 0);
      } catch {
        endTime = undefined;
      }
    }

    // Create tRPC caller
    const ctx = await createContext({ req: request });
    const caller = appRouter.createCaller(ctx);

    // Create the task
    const createdTask = await caller.task.create({
      title: params.title.trim(),
      description: params.description || undefined,
      dueDate: dueDate,
      startTime: startTime,
      endTime: endTime,
      priority: params.priority || 'medium',
      tags: params.tags || undefined,
      syncWithCalendar: false,
    });

    console.log('[FUNCTION] Task created successfully:', createdTask.id);

    return {
      success: true,
      message: `Task "${createdTask.title}" created successfully${
        dueDate ? ` with due date ${dueDate.toLocaleDateString()}` : ''
      }${startTime ? ` at ${startTime.toLocaleTimeString()}` : ''}.`,
      data: createdTask,
    };
  } catch (error: any) {
    console.error('[FUNCTION] create_task error:', error);
    return {
      success: false,
      message: `Failed to create task: ${error.message || 'Unknown error'}`,
      error: error.message,
    };
  }
}

/**
 * Execute update_task function
 */
async function executeUpdateTask(
  params: UpdateTaskParams,
  request: NextRequest,
  user: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; data?: any; error?: string; needsSelection?: boolean; options?: any[] }> {
  try {
    console.log('[FUNCTION] update_task called with params:', params);

    if (!params.searchQuery || params.searchQuery.trim().length === 0) {
      return {
        success: false,
        message: 'Search query is required to find the task to update.',
        error: 'MISSING_SEARCH_QUERY',
      };
    }

    // Search for matching tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, description')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .ilike('title', `%${params.searchQuery}%`)
      .limit(10);

    if (!tasks || tasks.length === 0) {
      return {
        success: false,
        message: `I couldn't find any tasks matching "${params.searchQuery}". Please check your task list or try a different search term.`,
        error: 'NO_TASKS_FOUND',
      };
    }

    // If multiple matches, return for user selection
    if (tasks.length > 1) {
      return {
        success: false,
        message: `I found ${tasks.length} tasks matching "${params.searchQuery}". Please be more specific about which task you want to update.`,
        error: 'MULTIPLE_MATCHES',
        needsSelection: true,
        options: tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority,
        })),
      };
    }

    const task = tasks[0];

    // Check if there are any updates
    if (!params.updates || Object.keys(params.updates).length === 0) {
      return {
        success: false,
        message: `Found task "${task.title}" but no changes were specified. What would you like to update?`,
        error: 'NO_UPDATES_SPECIFIED',
      };
    }

    // Create tRPC caller
    const ctx = await createContext({ req: request });
    const caller = appRouter.createCaller(ctx);

    // Prepare update payload
    const updatePayload: any = { id: task.id };

    if (params.updates.title) updatePayload.title = params.updates.title;
    if (params.updates.description !== undefined) updatePayload.description = params.updates.description;
    if (params.updates.dueDate) {
      updatePayload.dueDate = new Date(params.updates.dueDate);
    }
    if (params.updates.priority) updatePayload.priority = params.updates.priority;
    if (params.updates.status) updatePayload.status = params.updates.status;

    console.log('[FUNCTION] Updating task with payload:', updatePayload);

    // Execute update
    const updatedTask = await caller.task.update(updatePayload);

    // Build change summary
    const changes: string[] = [];
    if (params.updates.title) changes.push(`Title: "${task.title}" → "${params.updates.title}"`);
    if (params.updates.description !== undefined) changes.push('Description updated');
    if (params.updates.dueDate) {
      changes.push(`Due date: ${task.due_date || 'none'} → ${new Date(params.updates.dueDate).toLocaleDateString()}`);
    }
    if (params.updates.priority) changes.push(`Priority: ${task.priority} → ${params.updates.priority}`);
    if (params.updates.status) changes.push(`Status: ${task.status} → ${params.updates.status}`);

    return {
      success: true,
      message: `Updated "${updatedTask.title}":\n${changes.join('\n')}`,
      data: { updatedTask, changes },
    };
  } catch (error: any) {
    console.error('[FUNCTION] update_task error:', error);
    return {
      success: false,
      message: `Failed to update task: ${error.message || 'Unknown error'}`,
      error: error.message,
    };
  }
}

/**
 * Execute delete_task function
 */
async function executeDeleteTask(
  params: DeleteTaskParams,
  request: NextRequest,
  user: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; data?: any; error?: string; needsConfirmation?: boolean }> {
  try {
    console.log('[FUNCTION] delete_task called with params:', params);

    if (!params.searchQuery || params.searchQuery.trim().length === 0) {
      return {
        success: false,
        message: 'Search query is required to find the task to delete.',
        error: 'MISSING_SEARCH_QUERY',
      };
    }

    // Search for matching tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .ilike('title', `%${params.searchQuery}%`)
      .limit(10);

    if (!tasks || tasks.length === 0) {
      return {
        success: false,
        message: `I couldn't find any tasks matching "${params.searchQuery}".`,
        error: 'NO_TASKS_FOUND',
      };
    }

    // If multiple matches, return options for user selection
    if (tasks.length > 1) {
      const options = tasks.map((t: any, idx: number) => ({
        letter: String.fromCharCode(97 + idx), // a, b, c, ...
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
      }));

      return {
        success: false,
        message: `I found ${tasks.length} tasks matching "${params.searchQuery}". Which one do you want to delete?\n\n${options
          .map((o) => `${o.letter}) ${o.title}${o.dueDate ? ` (Due: ${new Date(o.dueDate).toLocaleDateString()})` : ''}`)
          .join('\n')}\n\nReply with the letter to select.`,
        error: 'MULTIPLE_MATCHES',
        data: { options },
      };
    }

    const task = tasks[0];

    // Single match - need confirmation before deletion
    return {
      success: false,
      message: `⚠️ Are you sure you want to delete "${task.title}"?\n\nReply with **yes** to confirm or **no** to cancel.`,
      needsConfirmation: true,
      data: { taskId: task.id, taskTitle: task.title },
    };
  } catch (error: any) {
    console.error('[FUNCTION] delete_task error:', error);
    return {
      success: false,
      message: `Failed to delete task: ${error.message || 'Unknown error'}`,
      error: error.message,
    };
  }
}

/**
 * Execute search_tasks function
 */
async function executeSearchTasks(
  params: SearchTasksParams,
  user: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    console.log('[FUNCTION] search_tasks called with params:', params);

    let query = supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, description')
      .eq('user_id', user.id);

    // Apply status filter
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    // Apply date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    if (params.dateFilter === 'today') {
      query = query.gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString());
    } else if (params.dateFilter === 'tomorrow') {
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      query = query.gte('due_date', tomorrow.toISOString()).lt('due_date', dayAfterTomorrow.toISOString());
    } else if (params.dateFilter === 'this_week') {
      query = query.gte('due_date', today.toISOString()).lt('due_date', endOfWeek.toISOString());
    } else if (params.dateFilter === 'overdue') {
      query = query.lt('due_date', today.toISOString()).in('status', ['pending', 'in_progress']);
    }

    // Apply text search if query is provided
    if (params.query && params.query.trim().length > 0) {
      query = query.ilike('title', `%${params.query}%`);
    }

    const { data: tasks, error } = await query.order('due_date', { ascending: true }).limit(20);

    if (error) {
      console.error('[FUNCTION] search_tasks error:', error);
      return {
        success: false,
        message: 'Failed to search tasks.',
        error: error.message,
      };
    }

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: 'No tasks found matching your search criteria.',
        data: { tasks: [] },
      };
    }

    // Format task list
    const taskList = tasks
      .map((t: any) => {
        const dueText = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date';
        const statusEmoji = t.status === 'completed' ? '✅' : t.status === 'skipped' ? '⏭️' : '📋';
        return `${statusEmoji} ${t.title} (${dueText}, ${t.priority} priority)`;
      })
      .join('\n');

    return {
      success: true,
      message: `Found ${tasks.length} task(s):\n\n${taskList}`,
      data: { tasks },
    };
  } catch (error: any) {
    console.error('[FUNCTION] search_tasks error:', error);
    return {
      success: false,
      message: `Failed to search tasks: ${error.message || 'Unknown error'}`,
      error: error.message,
    };
  }
}

/**
 * Execute search_goals function
 */
async function executeSearchGoals(
  params: SearchGoalsParams,
  user: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    console.log('[FUNCTION] search_goals called with params:', params);

    let query = supabase
      .from('goals')
      .select('id, title, description, status, priority, target_date')
      .eq('user_id', user.id);

    // Apply status filter
    if (params.status) {
      query = query.eq('status', params.status);
    }

    // Apply text search
    if (params.query && params.query.trim().length > 0) {
      query = query.ilike('title', `%${params.query}%`);
    }

    const { data: goals, error } = await query.order('created_at', { ascending: false }).limit(20);

    if (error) {
      console.error('[FUNCTION] search_goals error:', error);
      return {
        success: false,
        message: 'Failed to search goals.',
        error: error.message,
      };
    }

    if (!goals || goals.length === 0) {
      return {
        success: true,
        message: 'No goals found matching your search criteria.',
        data: { goals: [] },
      };
    }

    // Format goal list
    const goalList = goals
      .map((g: any) => {
        const statusEmoji = g.status === 'completed' ? '✅' : g.status === 'archived' ? '📦' : '🎯';
        const targetText = g.target_date ? ` (Target: ${new Date(g.target_date).toLocaleDateString()})` : '';
        return `${statusEmoji} ${g.title}${targetText}`;
      })
      .join('\n');

    return {
      success: true,
      message: `Found ${goals.length} goal(s):\n\n${goalList}`,
      data: { goals },
    };
  } catch (error: any) {
    console.error('[FUNCTION] search_goals error:', error);
    return {
      success: false,
      message: `Failed to search goals: ${error.message || 'Unknown error'}`,
      error: error.message,
    };
  }
}

/**
 * Execute generate_roast function
 */
async function executeGenerateRoast(request: NextRequest): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    console.log('[FUNCTION] generate_roast called');

    const roastResponse = await fetch(`${request.nextUrl.origin}/api/ai/generate-roast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('Cookie') || '',
      },
    });

    if (!roastResponse.ok) {
      const errorData = await roastResponse.json();
      return {
        success: false,
        message: 'Failed to generate roast report.',
        error: errorData.error || 'Unknown error',
      };
    }

    const roastData = await roastResponse.json();

    // Format roast response
    let roastText = `🔥 **Weekly Roast Report**\n\n`;
    roastText += `${roastData.weekSummary}\n\n`;
    roastText += `**Scores:**\n`;
    roastText += `- Alignment: ${Math.round(roastData.alignmentScore * 100)}%\n`;
    roastText += `- Honesty: ${Math.round(roastData.honestyScore * 100)}%\n`;
    roastText += `- Completion: ${Math.round(roastData.completionRate * 100)}%\n\n`;

    if (roastData.insights && roastData.insights.length > 0) {
      roastText += `**Key Insights:**\n`;
      roastData.insights.forEach((insight: any) => {
        roastText += `${insight.emoji} ${insight.text}\n`;
      });
      roastText += `\n`;
    }

    if (roastData.recommendations && roastData.recommendations.length > 0) {
      roastText += `**Next Week's Challenge:**\n`;
      roastData.recommendations.forEach((rec: string, idx: number) => {
        roastText += `${idx + 1}. ${rec}\n`;
      });
    }

    return {
      success: true,
      message: roastText,
      data: roastData,
    };
  } catch (error: any) {
    console.error('[FUNCTION] generate_roast error:', error);
    return {
      success: false,
      message: 'Failed to generate roast report.',
      error: error.message,
    };
  }
}

/**
 * Execute analyze_patterns function
 */
async function executeAnalyzePatterns(request: NextRequest): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    console.log('[FUNCTION] analyze_patterns called');

    const patternsResponse = await fetch(`${request.nextUrl.origin}/api/ai/analyze-patterns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('Cookie') || '',
      },
    });

    if (!patternsResponse.ok) {
      const errorData = await patternsResponse.json();
      return {
        success: false,
        message: 'Failed to analyze patterns.',
        error: errorData.error || 'Unknown error',
      };
    }

    const patternsData = await patternsResponse.json();

    // Format patterns response
    let patternsText = `🔍 **Pattern Analysis**\n\n`;
    patternsText += `I detected ${patternsData.patternsDetected} pattern(s) in your behavior.\n\n`;

    if (patternsData.patterns && patternsData.patterns.length > 0) {
      patternsText += `**Patterns Found:**\n`;
      patternsData.patterns.forEach((pattern: any) => {
        patternsText += `- **${pattern.type}**: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)\n`;
      });
    } else {
      patternsText += `No significant patterns detected yet. Keep logging your tasks and I'll start noticing trends.`;
    }

    return {
      success: true,
      message: patternsText,
      data: patternsData,
    };
  } catch (error: any) {
    console.error('[FUNCTION] analyze_patterns error:', error);
    return {
      success: false,
      message: 'Failed to analyze patterns.',
      error: error.message,
    };
  }
}

// ============================================================================
// MAIN FUNCTION ROUTER
// ============================================================================

async function executeFunctionCall(
  functionCall: FunctionCall,
  request: NextRequest,
  user: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; data?: any; error?: string; needsConfirmation?: boolean; needsSelection?: boolean; options?: any[] }> {
  console.log(`[FUNCTION CALL] Executing: ${functionCall.name}`);

  switch (functionCall.name) {
    case 'create_task':
      return await executeCreateTask(functionCall.args as CreateTaskParams, request, user);

    case 'update_task':
      return await executeUpdateTask(functionCall.args as UpdateTaskParams, request, user, supabase);

    case 'delete_task':
      return await executeDeleteTask(functionCall.args as DeleteTaskParams, request, user, supabase);

    case 'search_tasks':
      return await executeSearchTasks(functionCall.args as SearchTasksParams, user, supabase);

    case 'search_goals':
      return await executeSearchGoals(functionCall.args as SearchGoalsParams, user, supabase);

    case 'generate_roast':
      return await executeGenerateRoast(request);

    case 'analyze_patterns':
      return await executeAnalyzePatterns(request);

    default:
      console.error(`[FUNCTION CALL] Unknown function: ${functionCall.name}`);
      return {
        success: false,
        message: `Unknown function: ${functionCall.name}`,
        error: 'UNKNOWN_FUNCTION',
      };
  }
}

// ============================================================================
// USER CONTEXT FETCHING (SIMPLIFIED)
// ============================================================================

async function fetchUserContext(userId: string, supabase: SupabaseClient): Promise<string> {
  try {
    let contextStr = '\n\nUSER CONTEXT:\n';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Fetch critical tasks (today + upcoming week + overdue)
    const { data: criticalTasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, status, priority')
      .eq('user_id', userId)
      .or(`due_date.lt.${today.toISOString()},and(due_date.gte.${today.toISOString()},due_date.lt.${nextWeek.toISOString()})`)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(15); // Reduced from 20

    // Fetch active goals
    const { data: activeGoals } = await supabase
      .from('goals')
      .select('id, title, status, priority')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(8); // Reduced from 10

    // Fetch recent patterns
    const { data: patterns } = await supabase
      .from('patterns')
      .select('pattern_type, description, confidence')
      .eq('user_id', userId)
      .order('last_occurred', { ascending: false })
      .limit(3); // Reduced from 5

    if (criticalTasks && criticalTasks.length > 0) {
      contextStr += '\n🚨 CRITICAL TASKS:\n';
      criticalTasks.forEach((t: any) => {
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const isOverdue = dueDate && dueDate < today;
        const timeStatus = isOverdue ? '[OVERDUE]' : `[${dueDate?.toLocaleDateString()}]`;
        contextStr += `${timeStatus} ${t.title} (${t.priority})\n`;
      });
    }

    if (activeGoals && activeGoals.length > 0) {
      contextStr += '\n🎯 ACTIVE GOALS:\n';
      activeGoals.slice(0, 5).forEach((g: any) => {
        contextStr += `- ${g.title} (${g.priority})\n`;
      });
    }

    if (patterns && patterns.length > 0) {
      contextStr += '\n🧠 BEHAVIORAL PATTERNS:\n';
      patterns.forEach((p: any) => {
        contextStr += `- ${p.pattern_type}: ${p.description}\n`;
      });
    }

    return contextStr;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return '';
  }
}

// ============================================================================
// MAIN POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];

    // Fetch user context
    const userContext = await fetchUserContext(user.id, supabase);

    // Configure model with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: GRINDPROOF_SYSTEM_PROMPT + userContext + '\n\nToday is ' + new Date().toLocaleDateString(),
      tools: GRINDPROOF_TOOLS,
    });

    // Convert messages to Gemini format (limit history to last 10 messages)
    const MAX_HISTORY = 10;
    const recentMessages = messages.slice(-MAX_HISTORY);
    const geminiMessages = recentMessages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Start chat session
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.2,
        topP: 0.1,
      },
    });

    console.log('[CHAT] Sending message:', lastMessage.content);

    // Send message and get response
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    // Check if AI wants to call a function
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      console.log('[CHAT] Function call detected:', functionCalls[0].name);

      // Execute the function
      const functionResult = await executeFunctionCall(functionCalls[0], request, user, supabase);

      // If function needs confirmation or selection, return immediately
      if (functionResult.needsConfirmation || functionResult.needsSelection) {
        return NextResponse.json({
          text: functionResult.message,
          functionExecuted: functionCalls[0].name,
          requiresConfirmation: functionResult.needsConfirmation,
          requiresSelection: functionResult.needsSelection,
          data: functionResult.data,
        });
      }

      // Send function result back to AI for natural language response
      const finalResult = await chat.sendMessage([
        {
          functionResponse: {
            name: functionCalls[0].name,
            response: {
              success: functionResult.success,
              message: functionResult.message,
              data: functionResult.data,
            },
          },
        },
      ]);

      // Return AI's natural language response
      const finalText = finalResult.response.text();
      console.log('[CHAT] Final response after function:', finalText.substring(0, 100));

      return NextResponse.json({
        text: finalText,
        functionExecuted: functionCalls[0].name,
        data: functionResult.data,
      });
    }

    // No function call - regular chat with streaming
    console.log('[CHAT] Regular chat response (no function call)');

    // Get text response
    const textResponse = response.text();

    if (!textResponse || textResponse.trim().length === 0) {
      return NextResponse.json({
        text: 'I apologize, I received an empty response. Please try again.',
      });
    }

    return NextResponse.json({
      text: textResponse,
    });
  } catch (error: any) {
    console.error('Gemini API error:', error);

    // Handle specific error types
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        {
          error: "We've hit our daily message limit. Your coach will be back tomorrow!",
          errorType: 'quota_exceeded',
          retryable: false,
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('API key')) {
      return NextResponse.json(
        {
          error: 'Your coach is temporarily unavailable due to a configuration issue.',
          errorType: 'service_unavailable',
          retryable: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Something went wrong. Please try again in a moment.',
        errorType: 'unknown',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
