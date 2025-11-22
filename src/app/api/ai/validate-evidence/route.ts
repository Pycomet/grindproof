import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateEvidenceInternal } from './validate';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { evidenceId } = await request.json();

    if (!evidenceId) {
      return NextResponse.json(
        { error: 'Evidence ID is required' },
        { status: 400 }
      );
    }

    // Verify evidence belongs to user's task
    const { data: evidence, error: evidenceError } = await (supabase as any)
      .from('evidence')
      .select('*, tasks!inner(user_id)')
      .eq('id', evidenceId)
      .maybeSingle();

    if (evidenceError || !evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Verify the evidence belongs to a task owned by the user
    if (evidence.tasks.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Perform validation
    await validateEvidenceInternal(evidenceId);

    // Fetch updated evidence
    const { data: updatedEvidence } = await (supabase as any)
      .from('evidence')
      .select('ai_validated, validation_notes')
      .eq('id', evidenceId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      validated: updatedEvidence?.ai_validated || false,
      notes: updatedEvidence?.validation_notes || 'Validation completed',
    });
  } catch (error: any) {
    console.error('Evidence validation error:', error);

    // Handle Gemini API errors
    if (
      error.message?.includes('quota') ||
      error.message?.includes('RESOURCE_EXHAUSTED')
    ) {
      return NextResponse.json(
        {
          error:
            'AI validation temporarily unavailable due to quota limits. Please try again later.',
          errorType: 'quota_exceeded',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to validate evidence. Please try again.',
        errorType: 'unknown',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
