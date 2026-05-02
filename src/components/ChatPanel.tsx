"use client";

import { useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Info } from "lucide-react";

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
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
          <p>
            I&apos;m your accountability coach. Ask me anything, or tell me
            what you&apos;re working on.
          </p>
        </div>
      )}
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
