"use client";

import { useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import { AnimatePresence, motion } from "framer-motion";

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

  if (docked) {
    return (
      <div className="flex flex-col h-full rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            GrindProof Coach
          </h3>
          <span className="text-xs text-zinc-500">AI Accountability</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
              <p>
                I&apos;m your accountability coach. Ask me anything, or tell me
                what you&apos;re working on.
              </p>
            </div>
          )}
          {messages.map((message) => {
            const text = message.parts?.find(p => p.type === "text")?.text ?? "";
            const isCheckin = message.role === "user" && /^\[(Morning check-in|Evening reality check)\]/.test(text);

            if (isCheckin) {
              return (
                <div key={message.id} className="mb-3 text-center">
                  <div className="inline-block max-w-full text-2xs text-zinc-500 px-3 py-1 rounded-sm bg-zinc-50 dark:bg-zinc-800 border border-border">
                    ⓘ {text.startsWith("[Morning") ? "Morning check-in submitted" : "Evening reality check submitted"}
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
                        className={`inline-block max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
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
              <div className="inline-block rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
                ...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || isLoading) return;
            sendMessage(input);
            setInput("");
          }}
          className="border-t border-border px-4 py-3 shrink-0"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Talk to your coach..."
              aria-label="Message to coach"
              className="flex-1 rounded-md border border-input bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open AI coach chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform hover:scale-105 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 flex h-[70vh] flex-col rounded-t-lg border-t border-border bg-card shadow-2xl md:inset-x-auto md:bottom-24 md:right-6 md:h-[500px] md:w-[400px] md:rounded-lg md:border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                GrindProof Coach
              </h3>
              <span className="text-xs text-zinc-500">AI Accountability</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
                  <p>
                    I&apos;m your accountability coach. Ask me anything, or tell me
                    what you&apos;re working on.
                  </p>
                </div>
              )}
              {messages.map((message) => {
                const text = message.parts?.find(p => p.type === "text")?.text ?? "";
                const isCheckin = message.role === "user" && /^\[(Morning check-in|Evening reality check)\]/.test(text);

                if (isCheckin) {
                  return (
                    <div key={message.id} className="mb-3 text-center">
                      <div className="inline-block max-w-full text-2xs text-zinc-500 px-3 py-1 rounded-sm bg-zinc-50 dark:bg-zinc-800 border border-border">
                        ⓘ {text.startsWith("[Morning") ? "Morning check-in submitted" : "Evening reality check submitted"}
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
                            className={`inline-block max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                              message.role === "user"
                                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
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
                  <div className="inline-block rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
                    ...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isLoading) return;
                sendMessage(input);
                setInput("");
              }}
              className="border-t border-border px-4 py-3"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Talk to your coach..."
                  aria-label="Message to coach"
                  className="flex-1 rounded-md border border-input bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
