import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { createServerClient } from '@/lib/supabase/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

/**
 * Detect if user message is a command
 */
function detectCommand(message: string): 'roast' | 'patterns' | null {
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
  
  return null;
}

/**
 * Fetch user context (patterns and recent accountability scores)
 */
async function fetchUserContext(userId: string, supabase: any): Promise<string> {
  try {
    // Fetch recent patterns
    const { data: patterns } = await supabase
      .from('patterns')
      .select('pattern_type, description, confidence')
      .eq('user_id', userId)
      .order('last_occurred', { ascending: false })
      .limit(3);

    // Fetch recent accountability score
    const { data: scores } = await supabase
      .from('accountability_scores')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1);

    let contextStr = '\n\nUSER CONTEXT:\n';

    if (patterns && patterns.length > 0) {
      contextStr += '\nRecent Patterns Detected:\n';
      patterns.forEach((p: any) => {
        contextStr += `- ${p.pattern_type}: ${p.description} (${Math.round(p.confidence * 100)}% confidence)\n`;
      });
    }

    if (scores && scores.length > 0) {
      const score = scores[0];
      contextStr += '\nLast Week Performance:\n';
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

    // Regular chat - fetch user context
    const userContext = await fetchUserContext(user.id, supabase);

    // Fetch conversation history for context (if not the current conversation)
    let conversationContext = '';
    try {
      let query = supabase
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
      systemInstruction: GRINDPROOF_SYSTEM_PROMPT + userContext + conversationContext,
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
        maxOutputTokens: 1000,
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

