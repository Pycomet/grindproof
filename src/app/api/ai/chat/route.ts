import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";
import { createServerClient } from "@supabase/ssr";
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

  const { messages } = await req.json();

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT,
    messages,
    tools: createGrindproofTools(user.id),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
