"use client";

import { useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { trpc } from "@/lib/trpc/client";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Info } from "lucide-react";

/**
 * Opening move for the coach panel.
 *
 * The panel used to greet an empty conversation with one generic sentence,
 * which on desktop left the largest region of the dashboard doing nothing.
 * These prompts are built from the user's actual score, streak, today's
 * progress and goal count, so the first thing the coach says already knows
 * what kind of week this is. Per design-system-phase-3 §6.1.
 */
function ChatEmptyState({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  const { data } = trpc.accountabilityScore.getScore.useQuery();
  const { goals } = useTaskContext();

  const prompts: string[] = [];

  if (data) {
    const { score, tier, currentStreak, delta, today } = data;
    const openGoals = goals.filter((g) => g.status === "active");
    const { completed, total } = today;

    // Most specific signal first, so an unusual week leads the conversation.
    // Every branch below is reachable — a steady mid-week user still gets a
    // prompt built from their own numbers rather than the generic fallbacks.
    if (delta <= -20) {
      prompts.push("What happened last week?");
    }
    if (tier?.name === "Slacking") {
      prompts.push(`Score ${score} — what's actually getting in the way?`);
    }
    if (total === 0) {
      prompts.push("Nothing planned today. What's worth committing to?");
    } else if (completed === 0) {
      prompts.push(`0/${total} done today. What should I ship first?`);
    } else if (completed === total) {
      prompts.push("Everything's done. What should tomorrow look like?");
    } else {
      prompts.push(`${completed}/${total} done today — what do I take next?`);
    }
    if (openGoals.length >= 5) {
      prompts.push(`Help me cut a goal — ${openGoals.length} is too many.`);
    }
    if (currentStreak >= 3) {
      prompts.push(`${currentStreak} days in. How do I not break it?`);
    }
  }

  // Always leave the user something to press, including on first load.
  for (const fallback of [
    "What should I focus on today?",
    "Review my plan with me.",
  ]) {
    if (prompts.length >= 3) break;
    prompts.push(fallback);
  }

  return (
    <div className="flex h-full flex-col justify-end gap-2 p-4">
      <p className="text-sm text-muted-foreground">
        {data ? "I've seen your week. Pick one:" : "Pick one to start:"}
      </p>
      {prompts.slice(0, 3).map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPick(prompt)}
          className="rounded-sm border border-border px-3 py-2 text-left text-sm text-foreground outline-none transition-colors duration-150 hover:border-brand hover:bg-brand/5 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

export function ChatPanel({ docked = false }: { docked?: boolean }) {
  const { user } = useAuth();
  const { messages, sendMessage, status, isOpen, setIsOpen, input, setInput } =
    useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return null;

  const renderMessages = () => (
    <>
      {messages.length === 0 && <ChatEmptyState onPick={sendMessage} />}
      {messages.map((message) => {
        const text =
          message.parts?.find((p) => p.type === "text")?.text ?? "";
        const isCheckin =
          message.role === "user" &&
          /^\[(Morning check-in|Evening reality check)\]/.test(text);

        if (isCheckin) {
          return (
            <div key={message.id} className="mb-3 text-center">
              <div className="inline-flex items-center gap-1.5 max-w-full text-2xs text-muted-foreground px-3 py-1 rounded-sm bg-accent border border-border">
                <Info className="h-3 w-3" />
                {text.startsWith("[Morning")
                  ? "Morning check-in submitted"
                  : "Evening reality check submitted"}
              </div>
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={`mb-3 ${message.role === "user" ? "text-right" : "text-left"}`}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div
                    key={i}
                    className={`inline-block max-w-[85%] rounded-md px-4 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-zinc-50 text-zinc-900"
                        : "bg-accent text-foreground"
                    }`}
                  >
                    {part.text}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      })}
      {isLoading && (
        <div className="mb-3 text-left">
          <div className="inline-block rounded-md bg-accent px-4 py-2 text-sm text-muted-foreground">
            ...
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const renderInputForm = (className: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput("");
      }}
      className={className}
    >
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to your coach..."
          aria-label="Message to coach"
          className="flex-1 rounded-sm border border-input bg-transparent px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-zinc-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );

  if (docked) {
    return (
      <div className="flex flex-col h-full rounded-md border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">
            GrindProof Coach
          </h3>
          <span className="gp-eyebrow">AI Accountability</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {renderMessages()}
        </div>
        {renderInputForm("border-t border-border px-4 py-3 shrink-0")}
      </div>
    );
  }

  return (
    <>
      {/* Floating button — no scale on hover/press */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open AI coach chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-50 text-zinc-900 shadow-lg transition-opacity hover:opacity-90 active:opacity-85"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel — direct ease-out, no spring */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 flex h-[70vh] flex-col rounded-t-md border-t border-border bg-card shadow-lg md:inset-x-auto md:bottom-24 md:right-6 md:h-[500px] md:w-[400px] md:rounded-md md:border"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                GrindProof Coach
              </h3>
              <span className="gp-eyebrow">AI Accountability</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {renderMessages()}
            </div>
            {renderInputForm("border-t border-border px-4 py-3")}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
