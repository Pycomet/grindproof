import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { AI_CONFIG } from '@/lib/config';
import { createServerClient } from '@/lib/supabase/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

interface ValidationResult {
  validated: boolean;
  confidence: number;
  notes: string;
}

/**
 * Validate image evidence using Gemini Vision API
 */
async function validateImageEvidence(
  imageUrl: string,
  taskTitle: string,
  taskDescription: string | null
): Promise<ValidationResult> {
  try {
    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine MIME type from URL or response
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Use Gemini Vision to analyze image
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.MODELS.VISION,
    });

    const prompt = `You are validating task completion evidence. Analyze this image to determine if it proves the user completed the following task:

Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ''}

Look for:
- Visual proof of work completed (code, designs, documents, screenshots of finished work)
- Evidence of deployment or publication
- Completed deliverables or artifacts
- Progress indicators showing completion
- Any contextual clues that suggest the task was genuinely completed

Do NOT validate if:
- The image is irrelevant to the task
- The image shows work in progress but not completion
- The image appears to be fake or manipulated
- The image is just a screenshot of the task itself

Respond ONLY with valid JSON in this exact format:
{
  "validated": true or false,
  "confidence": 0.0 to 1.0,
  "notes": "Brief explanation of what you see and why it does/doesn't prove completion"
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: contentType,
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse validation response');
    }

    const validation: ValidationResult = JSON.parse(jsonMatch[0]);
    return validation;
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      validated: false,
      confidence: 0,
      notes: `Failed to validate image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate text evidence using Gemini
 */
async function validateTextEvidence(
  text: string,
  taskTitle: string,
  taskDescription: string | null
): Promise<ValidationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.MODELS.TEXT,
    });

    const prompt = `You are validating task completion evidence. Analyze this text to determine if it proves the user completed the following task:

Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ''}

Evidence text: "${text}"

Look for:
- Specific details about what was accomplished
- Concrete results or outcomes
- Technical details or specifics that suggest genuine work
- References to deliverables or artifacts
- Contextual information that suggests real completion

Do NOT validate if:
- The text is vague or generic ("I did it", "Task completed", etc.)
- The text doesn't match the task description
- The text appears copy-pasted or fabricated
- The text is just restating the task without proof

Respond ONLY with valid JSON in this exact format:
{
  "validated": true or false,
  "confidence": 0.0 to 1.0,
  "notes": "Brief explanation of why this text does/doesn't prove completion"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text_response = response.text();

    // Parse JSON response
    const jsonMatch = text_response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse validation response');
    }

    const validation: ValidationResult = JSON.parse(jsonMatch[0]);
    return validation;
  } catch (error) {
    console.error('Text validation error:', error);
    return {
      validated: false,
      confidence: 0,
      notes: `Failed to validate text: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate link evidence using Gemini
 */
async function validateLinkEvidence(
  url: string,
  taskTitle: string,
  taskDescription: string | null
): Promise<ValidationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.MODELS.TEXT,
    });

    const prompt = `You are validating task completion evidence. Analyze this URL to determine if it suggests the user completed the following task:

Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ''}

Evidence URL: "${url}"

Look at the URL structure for:
- GitHub commit/PR URLs
- Deployed website/app URLs
- Published content URLs (blog posts, videos, etc.)
- Documentation or file sharing links
- Any URL that suggests completed deliverables

Do NOT validate if:
- The URL is to a task tracker or planning tool
- The URL is generic or unrelated to the task
- The URL appears suspicious or fake

Note: You're only analyzing the URL itself, not fetching its contents.

Respond ONLY with valid JSON in this exact format:
{
  "validated": true or false,
  "confidence": 0.0 to 1.0,
  "notes": "Brief explanation of why this URL does/doesn't suggest completion"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse validation response');
    }

    const validation: ValidationResult = JSON.parse(jsonMatch[0]);
    return validation;
  } catch (error) {
    console.error('Link validation error:', error);
    return {
      validated: false,
      confidence: 0,
      notes: `Failed to validate link: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Internal validation function that can be called from server-side code
 * This bypasses authentication since it's used internally
 */
export async function validateEvidenceInternal(evidenceId: string): Promise<void> {
  const supabase = await createServerClient();

  // Fetch evidence with task details
  const { data: evidence, error: evidenceError } = await (supabase as any)
    .from('evidence')
    .select('*, tasks!inner(id, title, description, user_id)')
    .eq('id', evidenceId)
    .maybeSingle();

  if (evidenceError || !evidence) {
    throw new Error('Evidence not found');
  }

  // Get task details
  const taskTitle = evidence.tasks.title;
  const taskDescription = evidence.tasks.description;

  // Validate based on evidence type
  let validation: ValidationResult;

  switch (evidence.type) {
    case 'photo':
    case 'screenshot':
      validation = await validateImageEvidence(
        evidence.content,
        taskTitle,
        taskDescription
      );
      break;

    case 'text':
      validation = await validateTextEvidence(
        evidence.content,
        taskTitle,
        taskDescription
      );
      break;

    case 'link':
      validation = await validateLinkEvidence(
        evidence.content,
        taskTitle,
        taskDescription
      );
      break;

    default:
      throw new Error(`Unsupported evidence type: ${evidence.type}`);
  }

  // Update evidence with validation results
  const { error: updateError } = await (supabase as any)
    .from('evidence')
    .update({
      ai_validated: validation.validated,
      validation_notes: validation.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', evidenceId);

  if (updateError) {
    throw new Error(`Failed to update evidence: ${updateError.message}`);
  }
}

