import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { appRouter } from '@/server/trpc/routers/_app';
import { createContext } from '@/server/trpc/context';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

/**
 * Detect if user message is a command
 */
function detectCommand(message: string): 'roast' | 'patterns' | 'create_task' | 'delete_task' | null {
  const lowerMsg = message.toLowerCase().trim();
  
  // Roast commands
  if (
    lowerMsg.includes('generate roast') ||
    lowerMsg.includes('roast me') ||
    lowerMsg.includes('weekly report') ||
    lowerMsg.includes('how did i do this week') ||
    lowerMsg === 'roast'
  ) {
    return 'roast';
  }
  
  // Pattern analysis commands
  if (
    lowerMsg.includes('analyze patterns') ||
    lowerMsg.includes('what patterns') ||
    lowerMsg.includes('detect patterns') ||
    lowerMsg.includes('my patterns')
  ) {
    return 'patterns';
  }
  
  // Task creation commands
  if (
    lowerMsg.includes('add task') ||
    lowerMsg.includes('create task') ||
    lowerMsg.includes('new task') ||
    lowerMsg.includes('add:') ||
    lowerMsg.startsWith('task:') ||
    (lowerMsg.includes('remind me') && (lowerMsg.includes('to ') || lowerMsg.includes('about ')))
  ) {
    return 'create_task';
  }
  
  // Task deletion commands
  if (
    lowerMsg.includes('delete task') ||
    lowerMsg.includes('remove task') ||
    lowerMsg.includes('cancel task') ||
    lowerMsg.includes('delete:') ||
    lowerMsg.includes('remove:')
  ) {
    return 'delete_task';
  }
  
  return null;
}

/**
 * Check if message is a response to a validation question
 */
function isValidationResponse(messages: any[]): { type: 'create_task' | 'delete_task' | null; data?: any } {
  if (messages.length < 2) return { type: null };
  
  const lastAssistant = messages[messages.length - 2];
  const lastUser = messages[messages.length - 1];
  
  if (lastAssistant.role !== 'assistant' || lastUser.role !== 'user') {
    return { type: null };
  }

  const assistantContent = lastAssistant.content || '';
  const userResponse = lastUser.content.toLowerCase().trim();

  // Check for task creation validation
  if (assistantContent.includes('📋 Task Creation') || assistantContent.includes('VALIDATION_CREATE_TASK')) {
    // Extract task data from previous messages
    const createCommandMsg = messages.find((m: any, idx: number) => 
      idx < messages.length - 2 && 
      detectCommand(m.content) === 'create_task'
    );
    
    if (createCommandMsg) {
      return { type: 'create_task', data: { originalMessage: createCommandMsg.content, response: lastUser.content } };
    }
  }

  // Check for task deletion confirmation
  if (assistantContent.includes('⚠️ Confirm Deletion') || assistantContent.includes('VALIDATION_DELETE_TASK')) {
    const deleteCommandMsg = messages.find((m: any, idx: number) => 
      idx < messages.length - 2 && 
      detectCommand(m.content) === 'delete_task'
    );
    
    if (deleteCommandMsg || assistantContent.includes('Task ID:')) {
      // Extract task ID from assistant message
      const taskIdMatch = assistantContent.match(/Task ID:\s*([a-f0-9-]{36})/i);
      const taskId = taskIdMatch ? taskIdMatch[1] : null;
      
      if (userResponse === 'yes' || userResponse === 'y' || userResponse === 'confirm') {
        return { type: 'delete_task', data: { taskId, confirmed: true } };
      } else if (userResponse === 'no' || userResponse === 'n' || userResponse === 'cancel') {
        return { type: 'delete_task', data: { confirmed: false } };
      }
    }
  }

  // Check for task selection (a, b, c, etc.)
  if (assistantContent.includes('Choose between') || assistantContent.includes('VALIDATION_SELECT_TASK')) {
    const letterMatch = userResponse.match(/^([a-z])$/);
    if (letterMatch) {
      // Extract task list from assistant message
      const taskMatches = assistantContent.matchAll(/^([a-z])\.\s*(.+?)\s*\(ID:\s*([a-f0-9-]{36})\)/gim);
      const tasks: Array<{ letter: string; title: string; id: string }> = [];
      for (const match of taskMatches) {
        tasks.push({ letter: match[1], title: match[2], id: match[3] });
      }
      
      const selected = tasks.find(t => t.letter === letterMatch[1]);
      if (selected) {
        return { type: 'delete_task', data: { taskId: selected.id, needsConfirmation: true } };
      }
    }
  }

  return { type: null };
}

/**
 * Handle task creation validation - asks questions about missing parameters
 */
async function handleCreateTaskValidation(
  request: NextRequest,
  message: string,
  user: any,
  supabase: SupabaseClient
): Promise<NextResponse> {
  // Parse task details from natural language
  const parseModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a task parser. Extract task details from user messages and return ONLY valid JSON in this exact format:
{
  "title": "string (required)",
  "description": "string (optional)",
  "dueDate": "YYYY-MM-DD or null",
  "startTime": "HH:MM or null",
  "endTime": "HH:MM or null",
  "priority": "high|medium|low",
  "tags": ["tag1", "tag2"]
}

Today is ${new Date().toISOString().split('T')[0]}. Parse relative dates like "tomorrow", "next week", etc.
If time is mentioned, extract it. If no date is mentioned, return null for dueDate.`,
  });

  const parseResult = await parseModel.generateContent(
    `Parse this task request into JSON: "${message}"`
  );
  const parseResponse = await parseResult.response;
  const parseText = parseResponse.text();

  // Extract JSON from response
  let taskData: any;
  try {
    const jsonMatch = parseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      taskData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    // Fallback: try to extract title from message
    const titleMatch = message.match(/(?:add|create|new task|task:)\s*:?\s*(.+?)(?:\s+tomorrow|\s+at|\s+on|$)/i);
    taskData = {
      title: titleMatch ? titleMatch[1].trim() : message.replace(/^(add|create|new task|task:)\s*:?\s*/i, '').trim(),
      priority: 'medium',
    };
  }

  if (!taskData.title || taskData.title.trim().length === 0) {
    return NextResponse.json({
      text: "I couldn't understand what task you want to create. Please try again with a clear task description, like 'Add task: workout tomorrow at 6am'.",
    });
  }

  // Build validation questions for missing important fields
  const questions: string[] = [];
  const missingFields: string[] = [];

  // Check for due date - important for time-sensitive tasks
  if (!taskData.dueDate) {
    // Check if title suggests it's time-sensitive
    const timeSensitiveKeywords = ['tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'next week', 'deadline', 'due'];
    const lowerTitle = taskData.title.toLowerCase();
    const isTimeSensitive = timeSensitiveKeywords.some(keyword => lowerTitle.includes(keyword));
    
    if (!isTimeSensitive) {
      questions.push('When is this due? (e.g., "tomorrow", "next Monday", or "no deadline")');
      missingFields.push('dueDate');
    }
  }

  // Check for priority if it's a high-priority sounding task
  if (!taskData.priority || taskData.priority === 'medium') {
    const urgentKeywords = ['urgent', 'important', 'asap', 'critical', 'emergency'];
    const lowerTitle = taskData.title.toLowerCase();
    const isUrgent = urgentKeywords.some(keyword => lowerTitle.includes(keyword));
    
    if (isUrgent && !taskData.priority) {
      questions.push('What priority should this be? (high, medium, or low)');
      missingFields.push('priority');
    }
  }

  // If we have questions, ask them
  if (questions.length > 0) {
    let validationText = `📋 **Task Creation**\n\nI'm creating a task: **${taskData.title}**\n\n`;
    
    if (taskData.description) {
      validationText += `Description: ${taskData.description}\n\n`;
    }
    
    validationText += `To complete the setup, I need a few details:\n\n`;
    questions.forEach((q, idx) => {
      validationText += `${idx + 1}. ${q}\n`;
    });
    
    validationText += `\nPlease provide the missing information, or reply "skip" for any field you don't want to specify.\n\nVALIDATION_CREATE_TASK`;
    
    return NextResponse.json({
      text: validationText,
      pendingTaskData: taskData,
    });
  }

  // All required info is present, create the task
  return await createTaskFromData(request, taskData, user);
}

/**
 * Handle task creation after validation response
 */
async function handleCreateTaskWithValidation(
  request: NextRequest,
  originalMessage: string,
  validationResponse: string,
  user: any,
  supabase: SupabaseClient
): Promise<NextResponse> {
  // Re-parse original message to get base task data
  const parseModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a task parser. Extract task details from user messages and return ONLY valid JSON.`,
  });

  const parseResult = await parseModel.generateContent(
    `Parse this task request into JSON: "${originalMessage}"`
  );
  const parseResponse = await parseResult.response;
  const parseText = parseResponse.text();

  let taskData: any;
  try {
    const jsonMatch = parseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      taskData = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback parsing
    const titleMatch = originalMessage.match(/(?:add|create|new task|task:)\s*:?\s*(.+?)(?:\s+tomorrow|\s+at|\s+on|$)/i);
    taskData = {
      title: titleMatch ? titleMatch[1].trim() : originalMessage.replace(/^(add|create|new task|task:)\s*:?\s*/i, '').trim(),
    };
  }

  // Parse validation response to extract additional info
  const lowerResponse = validationResponse.toLowerCase();
  
  // Extract due date
  if (lowerResponse.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    taskData.dueDate = tomorrow.toISOString().split('T')[0];
  } else if (lowerResponse.includes('today')) {
    taskData.dueDate = new Date().toISOString().split('T')[0];
  } else if (lowerResponse.match(/\d{4}-\d{2}-\d{2}/)) {
    taskData.dueDate = lowerResponse.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  } else if (!lowerResponse.includes('no deadline') && !lowerResponse.includes('skip')) {
    // Try to parse other date formats
    const dateMatch = lowerResponse.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)/i);
    if (dateMatch) {
      // For simplicity, we'll set a default or ask AI to parse
      taskData.dueDate = null; // Will be handled by AI parsing
    }
  }

  // Extract priority
  if (lowerResponse.includes('high') || lowerResponse.includes('urgent')) {
    taskData.priority = 'high';
  } else if (lowerResponse.includes('low')) {
    taskData.priority = 'low';
  } else if (!taskData.priority) {
    taskData.priority = 'medium';
  }

  // Create the task
  return await createTaskFromData(request, taskData, user);
}

/**
 * Create task from parsed data
 */
async function createTaskFromData(
  request: NextRequest,
  taskData: any,
  user: any
): Promise<NextResponse> {
  // Parse dates and times
  let dueDate: Date | undefined;
  let startTime: Date | undefined;
  let endTime: Date | undefined;

  if (taskData.dueDate) {
    try {
      dueDate = new Date(taskData.dueDate);
      if (isNaN(dueDate.getTime())) {
        dueDate = undefined;
      }
    } catch {
      dueDate = undefined;
    }
  }

  if (taskData.startTime && dueDate) {
    try {
      const [hours, minutes] = taskData.startTime.split(':').map(Number);
      startTime = new Date(dueDate);
      startTime.setHours(hours, minutes || 0, 0, 0);
    } catch {
      startTime = undefined;
    }
  }

  if (taskData.endTime && dueDate) {
    try {
      const [hours, minutes] = taskData.endTime.split(':').map(Number);
      endTime = new Date(dueDate);
      endTime.setHours(hours, minutes || 0, 0, 0);
    } catch {
      endTime = undefined;
    }
  }

  // Create tRPC caller
  const ctx = await createContext({ req: request });
  const caller = appRouter.createCaller(ctx);

  try {
    const createdTask = await caller.task.create({
      title: taskData.title,
      description: taskData.description || undefined,
      dueDate: dueDate,
      startTime: startTime,
      endTime: endTime,
      priority: (taskData.priority || 'medium') as 'high' | 'medium' | 'low',
      tags: taskData.tags || undefined,
      syncWithCalendar: false,
    });

    return NextResponse.json({
      text: `✅ **Task Created!**\n\n**${createdTask.title}**${dueDate ? `\nDue: ${dueDate.toLocaleDateString()}` : ''}${startTime ? `\nTime: ${startTime.toLocaleTimeString()}` : ''}\n\nI've added this to your task list.`,
      commandExecuted: 'create_task',
      data: createdTask,
    });
  } catch (error: any) {
    console.error('Task creation error:', error);
    return NextResponse.json({
      text: `❌ Failed to create task: ${error.message || 'Unknown error'}. Please try again.`,
    });
  }
}

/**
 * Handle task deletion validation - finds tasks and asks for confirmation
 */
async function handleDeleteTaskValidation(
  request: NextRequest,
  message: string,
  user: any,
  supabase: SupabaseClient
): Promise<NextResponse> {
  // Fetch user's pending tasks
  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .limit(20);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({
      text: "I couldn't find any pending tasks to delete.",
    });
  }

  // Try to find matching tasks
  const lowerMsg = message.toLowerCase();
  const searchTerm = lowerMsg.replace(/^(delete|remove|cancel)\s*(task)?\s*:?\s*/i, '').trim();
  
  const matchingTasks = tasks.filter((t: any) => 
    t.title.toLowerCase().includes(searchTerm) || 
    searchTerm.includes(t.title.toLowerCase())
  );

  if (matchingTasks.length === 0) {
    return NextResponse.json({
      text: `I couldn't find a task matching "${searchTerm}". Here are your pending tasks:\n${tasks.slice(0, 10).map((t: any, idx: number) => `${idx + 1}. ${t.title}`).join('\n')}\n\nPlease specify which one to delete.`,
    });
  }

  if (matchingTasks.length === 1) {
    // Single match - ask for confirmation
    const task = matchingTasks[0];
    return NextResponse.json({
      text: `⚠️ **Confirm Deletion**\n\nAre you sure you want to delete "${task.title}"?\n\nReply with **yes** to confirm or **no** to cancel.\n\nVALIDATION_DELETE_TASK\nTask ID: ${task.id}`,
    });
  }

  // Multiple matches - list them with letters
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let taskList = `I found ${matchingTasks.length} tasks matching "${searchTerm}". Please choose which one to delete:\n\n`;
  
  matchingTasks.slice(0, 10).forEach((task: any, idx: number) => {
    taskList += `${letters[idx]}. ${task.title} (ID: ${task.id})\n`;
  });
  
  taskList += `\nReply with the letter (a-${letters[Math.min(matchingTasks.length - 1, 9)]}) to select a task.\n\nVALIDATION_SELECT_TASK`;
  
  return NextResponse.json({
    text: taskList,
  });
}

/**
 * Fetch user context (current tasks, goals, patterns and recent accountability scores)
 */
async function fetchUserContext(userId: string, supabase: SupabaseClient): Promise<string> {
  try {

    // Fetch current tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, start_time, end_time, status, priority, completion_proof, tags, is_synced_with_calendar, recurrence_rule, parent_task_id')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .limit(10);

    // Fetch current goals
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, description, status, priority, target_date, time_horizon')
      .eq('user_id', userId)
      .order('target_date', { ascending: true })
      .limit(10);

    // Fetch recent patterns
    const { data: patterns } = await supabase
      .from('patterns')
      .select('pattern_type, description, confidence')
      .eq('user_id', userId)
      .order('last_occurred', { ascending: false })
      .limit(10);

    // Fetch recent accountability score
    const { data: scores } = await supabase
      .from('accountability_scores')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(10);

    let contextStr = '\n\nUSER CONTEXT:\n';

    if (tasks && tasks.length > 0) {
      contextStr += '\n MyTasks:\n';
      tasks.forEach((t: any) => {
        contextStr += `ID - ${t.id} \n - ${t.title}: ${t.description} (Due: ${t.due_date}, Status: ${t.status}) - ${t.priority} priority \n -${t.tags?.join(', ')} tags \n - ${t.completion_proof} completion proof \n - ${t.is_synced_with_calendar} synced with calendar \n - ${t.recurrence_rule} recurrence rule \n`;
      });
    }

    if (goals && goals.length > 0) {
      contextStr += '\n My Goals:\n';
      goals.forEach((g: any) => {
        contextStr += `ID - ${g.id} \n - ${g.title}: ${g.description} (Target Date: ${g.target_date}, Status: ${g.status}) - ${g.priority} priority \n - ${g.time_horizon} goal \n`;
      });
    }

    if (patterns && patterns.length > 0) {
      contextStr += '\nRecent Patterns Detected:\n';
      patterns.forEach((p: any) => {
        contextStr += `- ${p.pattern_type}: ${p.description} (${Math.round(p.confidence * 100)}% confidence)\n`;
      });
    }

    if (scores && scores.length > 0) {
      const score = scores[0];
      contextStr += '\nCurrent Performance:\n';
      contextStr += `- Alignment: ${Math.round(score.alignment_score * 100)}%\n`;
      contextStr += `- Honesty: ${Math.round(score.honesty_score * 100)}%\n`;
      contextStr += `- Completion: ${Math.round(score.completion_rate * 100)}%\n`;
      contextStr += `- New projects started: ${score.new_projects_started}\n`;
    }

    return contextStr;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    
    // Check if this is a validation response
    const validation = isValidationResponse(messages);
    if (validation.type) {
      // Handle validation responses
      if (validation.type === 'create_task' && validation.data) {
        // User responded to task creation validation - now create the task
        return await handleCreateTaskWithValidation(request, validation.data.originalMessage, validation.data.response, user, supabase);
      }
      
      if (validation.type === 'delete_task' && validation.data) {
        if (validation.data.confirmed === false) {
          return NextResponse.json({
            text: 'Task deletion cancelled. No task was removed.',
          });
        }
        
        if (validation.data.needsConfirmation && validation.data.taskId) {
          // Show confirmation for selected task
          const { data: task } = await (supabase as any)
            .from('tasks')
            .select('id, title')
            .eq('id', validation.data.taskId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!task) {
            return NextResponse.json({
              text: 'Task not found. It may have already been deleted.',
            });
          }
          
          return NextResponse.json({
            text: `⚠️ **Confirm Deletion**\n\nAre you sure you want to delete "${task.title}"?\n\nReply with **yes** to confirm or **no** to cancel.\n\nVALIDATION_DELETE_TASK\nTask ID: ${task.id}`,
          });
        }
        
        if (validation.data.confirmed && validation.data.taskId) {
          // User confirmed - delete the task
          const ctx = await createContext({ req: request });
          const caller = appRouter.createCaller(ctx);
          
          try {
            await caller.task.delete({ id: validation.data.taskId });
            return NextResponse.json({
              text: `✅ **Task Deleted!**\n\nThe task has been removed from your list.`,
              commandExecuted: 'delete_task',
              data: { id: validation.data.taskId },
            });
          } catch (error: any) {
            return NextResponse.json({
              text: `❌ Failed to delete task: ${error.message || 'Unknown error'}.`,
            });
          }
        }
      }
    }
    
    const command = detectCommand(lastMessage.content);

    // Handle commands
    if (command === 'roast') {
      // Call roast generation endpoint
      const roastResponse = await fetch(`${request.nextUrl.origin}/api/ai/generate-roast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '',
        },
      });

      if (!roastResponse.ok) {
        const errorData = await roastResponse.json();
        return NextResponse.json(
          { error: errorData.error || 'Failed to generate roast' },
          { status: roastResponse.status }
        );
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

      return NextResponse.json({ 
        text: roastText,
        commandExecuted: 'roast',
        data: roastData,
      });
    }

    if (command === 'patterns') {
      // Call pattern analysis endpoint
      const patternsResponse = await fetch(`${request.nextUrl.origin}/api/ai/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '',
        },
      });

      if (!patternsResponse.ok) {
        const errorData = await patternsResponse.json();
        return NextResponse.json(
          { error: errorData.error || 'Failed to analyze patterns' },
          { status: patternsResponse.status }
        );
      }

      const patternsData = await patternsResponse.json();

      // Format patterns response
      let patternsText = `🔍 **Pattern Analysis**\n\n`;
      patternsText += `I detected ${patternsData.patternsDetected} patterns in your behavior.\n\n`;
      
      if (patternsData.patterns && patternsData.patterns.length > 0) {
        patternsText += `**Patterns Found:**\n`;
        patternsData.patterns.forEach((pattern: any) => {
          patternsText += `- **${pattern.type}**: ${pattern.description} (${Math.round(pattern.confidence * 100)}% confidence)\n`;
        });
      } else {
        patternsText += `No significant patterns detected yet. Keep logging your tasks and I'll start noticing trends.`;
      }

      return NextResponse.json({ 
        text: patternsText,
        commandExecuted: 'patterns',
        data: patternsData,
      });
    }

    if (command === 'create_task') {
      return await handleCreateTaskValidation(request, lastMessage.content, user, supabase);
    }

    if (command === 'delete_task') {
      return await handleDeleteTaskValidation(request, lastMessage.content, user, supabase);
    }

    // Regular chat - fetch user context
    const userContext = await fetchUserContext(user.id, supabase);

    // Fetch conversation history for context (if not the current conversation)
    let conversationContext = '';
    try {
      let query = (supabase as any)
        .from('conversations')
        .select('messages, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (conversationId) {
        query = query.neq('id', conversationId);
      }
      
      const { data: recentConvos } = await query;
      
      if (recentConvos && recentConvos.length > 0) {
        const recentSummaries = recentConvos
          .map((convo: any) => {
            const msgs = convo.messages || [];
            if (msgs.length > 0) {
              const summary = msgs.slice(0, 4).map((m: any) => 
                `${m.role === 'user' ? 'User' : 'You'}: ${m.content.substring(0, 100)}`
              ).join('\n');
              return summary;
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 2);
        
        if (recentSummaries.length > 0) {
          conversationContext = `\n\nRECENT CONVERSATIONS:\n${recentSummaries.join('\n---\n')}\n\nUse this context to maintain continuity, but focus on the current conversation.`;
        }
      }
    } catch (contextError) {
      console.log('Could not fetch conversation context:', contextError);
    }

    // Get the generative model with enhanced context
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: GRINDPROOF_SYSTEM_PROMPT + userContext + conversationContext + 'Today is ' + new Date().toLocaleDateString() + ' and it is ' + new Date().toLocaleTimeString(),
    });

    // Convert our message format to Gemini format
    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Start a chat session with history
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    // Send the last message
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API error:', error);

    // Handle specific error types with clear user messages
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { 
          error: "We've hit our daily AI message limit. The chat will be back tomorrow! In the meantime, you can still manage your tasks and goals.",
          errorType: 'quota_exceeded',
          retryable: false,
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'AI chat is temporarily unavailable due to a configuration issue. Please contact support.',
          errorType: 'service_unavailable',
          retryable: false,
        },
        { status: 503 }
      );
    }

    if (error.message?.includes('model not found') || error.message?.includes('404')) {
      return NextResponse.json(
        { 
          error: 'AI chat is temporarily unavailable. We\'re working on it!',
          errorType: 'service_unavailable',
          retryable: false,
        },
        { status: 503 }
      );
    }

    // Network or temporary errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return NextResponse.json(
        { 
          error: 'Network error. Check your connection and try again.',
          errorType: 'network_error',
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Generic error
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

