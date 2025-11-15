import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: GRINDPROOF_SYSTEM_PROMPT,
    });

    // Convert our message format to Gemini format
    // Our format: { role: 'user' | 'assistant', content: string }
    // Gemini format: { role: 'user' | 'model', parts: [{ text: string }] }
    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Start a chat session with history
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1), // All messages except the last one
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Send the last message
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API error:', error);

    // Handle specific error types
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('invalid') || error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid API configuration. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    );
  }
}

