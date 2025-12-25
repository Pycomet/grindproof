'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInterface } from '@/components/ChatInterface';
import { CreateTaskDialog } from '@/components/TaskDialogs';
import { useFeedbackContext } from '@/contexts/FeedbackContext';

interface ChatWidgetProps {
  goals?: Array<{ id: string; title: string }>;
  onCreateTask: (data: any) => void;
  isCreatingTask: boolean;
  isCalendarConnected?: boolean;
}

type WidgetState = 'collapsed' | 'menu' | 'expanded';

export function ChatWidget({
  goals = [],
  onCreateTask,
  isCreatingTask,
  isCalendarConnected = false,
}: ChatWidgetProps) {
  const [widgetState, setWidgetState] = useState<WidgetState>('collapsed');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [chatMessageCount, setChatMessageCount] = useState(0);
  const widgetRef = useRef<HTMLDivElement>(null);
  const { triggerFeedback } = useFeedbackContext();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetState === 'menu' && widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setWidgetState('collapsed');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [widgetState]);

  // Close widget on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (widgetState === 'expanded') {
          setWidgetState('collapsed');
        } else if (widgetState === 'menu') {
          setWidgetState('collapsed');
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [widgetState]);

  const handleWidgetClick = () => {
    if (widgetState === 'collapsed') {
      setWidgetState('menu');
    } else if (widgetState === 'menu') {
      setWidgetState('collapsed');
    }
  };

  const handleCreateTask = () => {
    setWidgetState('collapsed');
    setIsTaskDialogOpen(true);
  };

  const handleChatWithAI = () => {
    setWidgetState('expanded');
  };

  const handleCloseChat = () => {
    setWidgetState('collapsed');
    
    // Trigger feedback after closing chat (if user had meaningful engagement)
    if (chatMessageCount > 0) {
      triggerFeedback('chat', chatMessageCount);
      setChatMessageCount(0); // Reset count
    }
  };

  const handleTaskDialogClose = (open: boolean) => {
    setIsTaskDialogOpen(open);
  };

  return (
    <>
      <div ref={widgetRef} className="fixed bottom-6 right-6 z-50">
        {/* Expanded Chat Interface - Full Screen on Mobile, Floating Card on Desktop */}
        <AnimatePresence>
          {widgetState === 'expanded' && (
            <>
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden"
                style={{ right: 'auto', bottom: 'auto', left: 0, top: 0, width: '100vw', height: '100vh' }}
                onClick={handleCloseChat}
              />

              {/* Chat Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-4 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <div className="text-xl">💬</div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Coach</h3>
                  </div>
                  <button
                    onClick={handleCloseChat}
                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Close chat"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Chat Content */}
                <div className="flex-1 overflow-hidden">
                  <ChatInterface 
                    compact={true}
                    onMessageSent={() => setChatMessageCount((prev) => prev + 1)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Quick Action Menu */}
        <AnimatePresence>
          {widgetState === 'menu' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-20 right-0 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              <button
                onClick={handleCreateTask}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors border-b border-zinc-200 dark:border-zinc-700"
              >
                <svg
                  className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Create Task</span>
              </button>
              <button
                onClick={handleChatWithAI}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>Talk to Coach</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Widget Button - Collapsed State */}
        <AnimatePresence>
          {widgetState !== 'expanded' && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWidgetClick}
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-all hover:shadow-xl dark:bg-zinc-50 dark:text-zinc-900 ${
                widgetState === 'menu' ? 'ring-4 ring-zinc-900/30 dark:ring-zinc-50/30' : ''
              }`}
              aria-label="Open quick actions"
            >
              <AnimatePresence mode="wait">
                {widgetState === 'collapsed' ? (
                  <motion.svg
                    key="chat"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Task Creation Dialog */}
      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogClose}
        onSubmit={onCreateTask}
        isPending={isCreatingTask}
        goals={goals}
        isCalendarConnected={isCalendarConnected}
      />
    </>
  );
}

