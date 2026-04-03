import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env } from "@/lib/env";
import { GRINDPROOF_SYSTEM_PROMPT } from "@/lib/prompts/system-prompt";
import { createGrindproofTools } from "@/lib/ai/tools";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 60;

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      })
    )
    .max(50),
});

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

  let messages: z.infer<typeof messageSchema>["messages"];
  try {
    const body = await req.json();
    const parsed = messageSchema.parse(body);
    messages = parsed.messages;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT,
    messages,
    tools: createGrindproofTools(user.id, supabase),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
