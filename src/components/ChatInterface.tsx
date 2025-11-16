'use client';

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { motion, AnimatePresence } from 'framer-motion';
import { markdownToReact } from '@/lib/markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutations
  const createConversation = trpc.conversation.create.useMutation();
  const updateConversation = trpc.conversation.update.useMutation();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveConversation = async (newMessages: Message[]) => {
    try {
      if (conversationId) {
        // Update existing conversation
        await updateConversation.mutateAsync({
          id: conversationId,
          messages: newMessages,
        });
      } else {
        // Create new conversation
        const result = await createConversation.mutateAsync({
          messages: newMessages,
        });
        setConversationId(result.id);
      }
    } catch (err) {
      console.error('Failed to save conversation:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      
      // Save to database
      await saveConversation(finalMessages);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      // Remove the user message if AI failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl px-4">
              <div className="text-center mb-6">
                <div className="mb-4 text-6xl">💬</div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Your Accountability Coach
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  I'm here to help you stay on track, analyze your patterns, and hold you accountable.
                </p>
              </div>
              
              <div className="md:block hidden space-y-3 text-left">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 cursor-default dark:border-zinc-700 dark:bg-zinc-800/50">
                  <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    📋 Task Management
                  </h4>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>• Create tasks: &quot;Add task: workout tomorrow at 6am&quot;</li>
                    <li>• Delete tasks: &quot;Remove the meeting task&quot;</li>
                    <li>• Ask about your tasks: &quot;What do I have due today?&quot;</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 cursor-default dark:border-zinc-700 dark:bg-zinc-800/50">
                  <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    🔍 Analysis & Insights
                  </h4>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>• Pattern detection: &quot;analyze patterns&quot; or &quot;what patterns do you see?&quot;</li>
                    <li>• Weekly performance: &quot;roast me&quot; or &quot;generate roast&quot;</li>
                    <li>• Goal progress: &quot;How am I doing on my goals?&quot;</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 cursor-default dark:border-zinc-700 dark:bg-zinc-800/50">
                  <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    💬 General Chat
                  </h4>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <li>• Get advice on productivity and accountability</li>
                    <li>• Discuss your goals and progress</li>
                    <li>• Ask questions about your data and patterns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 cursor-text ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.role === 'assistant' 
                        ? markdownToReact(message.content)
                        : message.content
                      }
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-2xl bg-zinc-200 px-4 py-3 cursor-default dark:bg-zinc-800">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-zinc-500"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 cursor-default dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-text dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

