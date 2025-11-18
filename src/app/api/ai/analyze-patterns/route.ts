import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { createServerClient } from '@/lib/supabase/server';
import { analyzeUserData } from '@/lib/ai/data-analyzer';
import { PATTERN_DETECTION_PROMPT } from '@/lib/prompts/pattern-detection-prompt';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

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

    // Parse request body (optional timeRange parameter)
    let timeRange = 'all';
    try {
      const body = await request.json();
      timeRange = body.timeRange || 'all';
    } catch {
      // Body is optional, use default
    }

    // Fetch and analyze user data
    const analysis = await analyzeUserData(user.id, supabase);

    // Prepare data summary for AI
    const dataSummary = {
      tasks: {
        total: analysis.taskStats.total,
        completed: analysis.taskStats.completed,
        pending: analysis.taskStats.pending,
        skipped: analysis.taskStats.skipped,
        overdue: analysis.taskStats.overdue,
        completionRate: Math.round(analysis.taskStats.completionRate * 100),
        completedLate: analysis.taskStats.completedLate,
      },
      goals: {
        total: analysis.goalStats.total,
        active: analysis.goalStats.active,
        completed: analysis.goalStats.completed,
        activeUnder50Percent: analysis.goalStats.activeUnder50Percent,
        newGoalsThisWeek: analysis.goalStats.newGoalsThisWeek,
        completionRate: Math.round(analysis.goalStats.completionRate * 100),
      },
      evidence: {
        total: analysis.evidenceStats.total,
        thisWeek: analysis.evidenceStats.thisWeek,
      },
      detectedPatterns: {
        task: analysis.taskPatterns,
        goal: analysis.goalPatterns,
      },
    };

    // Get AI model for pattern analysis
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: PATTERN_DETECTION_PROMPT,
    });

    // Generate pattern analysis
    const result = await model.generateContent(
      `Analyze this user's behavior data and detect patterns:\n\n${JSON.stringify(dataSummary, null, 2)}`
    );
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiPatterns: any[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiPatterns = parsed.patterns || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Continue with detected patterns from analysis
    }

    // Fetch existing patterns to avoid duplicates
    const { data: existingPatterns } = await (supabase as any)
      .from('patterns')
      .select('pattern_type, last_occurred')
      .eq('user_id', user.id);

    const existingTypes = new Set(
      (existingPatterns || []).map((p: any) => p.pattern_type)
    );

    // Combine detected patterns from analysis and AI
    const allDetectedPatterns = [
      ...analysis.taskPatterns.map(p => ({
        type: p.type,
        description: p.description,
        confidence: p.confidence,
        occurrences: p.occurrences,
        evidence: p.evidence,
      })),
      ...analysis.goalPatterns.map(p => ({
        type: p.type,
        description: p.description,
        confidence: p.confidence,
        occurrences: 1,
        evidence: p.evidence,
      })),
      ...aiPatterns.filter((p: any) => p.shouldSave !== false),
    ];

    // Save new patterns to database
    const savedPatterns = [];
    const now = new Date();

    for (const pattern of allDetectedPatterns) {
      if (pattern.confidence < 0.5) continue; // Skip low confidence patterns

      if (existingTypes.has(pattern.type)) {
        // Update existing pattern
        const { data: updated } = await (supabase as any)
          .from('patterns')
          .update({
            description: pattern.description,
            confidence: pattern.confidence,
            occurrences: pattern.occurrences || 1,
            last_occurred: now.toISOString(),
          })
          .eq('user_id', user.id)
          .eq('pattern_type', pattern.type)
          .select()
          .maybeSingle();

        if (updated) {
          savedPatterns.push({
            id: updated.id,
            type: updated.pattern_type,
            description: updated.description,
            confidence: updated.confidence,
            action: 'updated',
          });
        }
      } else {
        // Create new pattern
        const { data: created } = await (supabase as any)
          .from('patterns')
          .insert({
            user_id: user.id,
            pattern_type: pattern.type,
            description: pattern.description,
            confidence: pattern.confidence,
            occurrences: pattern.occurrences || 1,
            first_detected: now.toISOString(),
            last_occurred: now.toISOString(),
          })
          .select()
          .maybeSingle();

        if (created) {
          savedPatterns.push({
            id: created.id,
            type: created.pattern_type,
            description: created.description,
            confidence: created.confidence,
            action: 'created',
          });
          existingTypes.add(pattern.type);
        }
      }
    }

    return NextResponse.json({
      success: true,
      analysis: dataSummary,
      patternsDetected: allDetectedPatterns.length,
      patternsSaved: savedPatterns.length,
      patterns: savedPatterns,
    });

  } catch (error: any) {
    console.error('Pattern analysis error:', error);

    // Handle Gemini API errors
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        {
          error: 'AI analysis temporarily unavailable due to quota limits. Please try again later.',
          errorType: 'quota_exceeded',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('API key')) {
      return NextResponse.json(
        {
          error: 'AI analysis temporarily unavailable due to configuration issue.',
          errorType: 'service_unavailable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze patterns. Please try again.',
        errorType: 'unknown',
      },
      { status: 500 }
    );
  }
}

