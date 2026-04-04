import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env } from "@/lib/env";
import { GRINDPROOF_SYSTEM_PROMPT } from "@/lib/prompts/system-prompt";
import { createGrindproofTools } from "@/lib/ai/tools";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  // Authenticate user
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: { name: string; value: string }[] = [];
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) cookies.push({ name, value: rest.join("=") });
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookies,
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: UIMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length > 50) {
      return new Response("Invalid request body", { status: 400 });
    }
    messages = body.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: createGrindproofTools(user.id, supabase),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
