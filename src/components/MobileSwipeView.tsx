'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useState } from 'react';

interface SwipeViewProps {
  views: {
    id: string;
    emoji: string;
    title: string;
    content: React.ReactNode;
  }[];
  initialView?: number;
}

export function MobileSwipeView({ views, initialView = 0 }: SwipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialView);
  const [direction, setDirection] = useState(0);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Gradient backgrounds for each view
  const gradients = [
    'from-blue-500/10 via-cyan-500/10 to-teal-500/10', // Tasks - Cool tech vibes
    'from-purple-500/10 via-pink-500/10 to-rose-500/10', // Goals - Warm colors
    'from-orange-500/10 via-red-500/10 to-pink-500/10', // Reality Check - Evening colors
    'from-pink-500/10 via-purple-500/10 to-indigo-500/10', // Weekly Roast - Gradient blend
    'from-indigo-500/10 via-purple-500/10 to-pink-500/10', // Integrations - Tech purple
  ];

  const handleDragEnd = (e: any, info: PanInfo) => {
    const swipeThreshold = 100; // Distance threshold
    const velocityThreshold = 300; // Velocity threshold
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Velocity-based swipe detection for natural feel
    const shouldSwipe = Math.abs(velocity) > velocityThreshold || Math.abs(offset) > swipeThreshold;
    
    // Higher velocity = easier swipe, more responsive feel
    const velocityFactor = Math.abs(velocity) / 1000;
    const effectiveThreshold = swipeThreshold * (1 - Math.min(velocityFactor, 0.7));

    if (shouldSwipe && Math.abs(offset) > effectiveThreshold) {
      if (offset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      } else if (offset < 0 && currentIndex < views.length - 1) {
        // Swipe left - go to next
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Dot Indicators with Toggle */}
      <div className="absolute left-0 right-0 top-4 z-20 flex items-center justify-center gap-3">
        <div className="flex gap-2">
          {views.map((view, index) => (
            <button
              key={view.id}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-zinc-900 dark:bg-zinc-50'
                  : 'w-2 bg-zinc-300 dark:bg-zinc-700'
              }`}
              aria-label={`Go to ${views[index].title}`}
            />
          ))}
        </div>
        
        {/* Collapse/Expand Toggle */}
        <button
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
          className="rounded-full bg-zinc-200/80 p-1.5 backdrop-blur-sm transition-all hover:bg-zinc-300 dark:bg-zinc-800/80 dark:hover:bg-zinc-700"
          aria-label={isHeaderExpanded ? "Collapse header" : "Expand header"}
        >
          <svg
            className={`h-3 w-3 text-zinc-700 transition-transform dark:text-zinc-300 ${
              isHeaderExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Swipeable Content */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { 
              type: 'spring', 
              stiffness: 400, 
              damping: 40,
              mass: 0.8,
              velocity: direction * 50,
            },
            opacity: { duration: 0.15 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          dragMomentum={true}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex h-full w-full flex-col"
        >
          {/* Card Header with Gradient - Collapsible */}
          <motion.div
            className={`relative flex-shrink-0 overflow-hidden bg-gradient-to-br ${gradients[currentIndex]} dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800`}
            initial={false}
            animate={{
              height: isHeaderExpanded ? 'auto' : '56px',
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {isHeaderExpanded ? (
              <div className="px-6 pb-8 pt-16 text-center">
                <div className="inline-flex items-center justify-center">
                  <div className="text-6xl drop-shadow-sm">{views[currentIndex].emoji}</div>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {views[currentIndex].title}
                </h2>
                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-zinc-900 dark:bg-zinc-50"></div>
              </div>
            ) : (
              <div className="flex h-14 items-center justify-center pt-10">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {views[currentIndex].emoji} {views[currentIndex].title}
                </span>
              </div>
            )}
          </motion.div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
            {views[currentIndex].content}
          </div>

          {/* Swipe Hint */}
          {currentIndex < views.length - 1 && (
            <div className="flex-shrink-0 pb-4 text-center text-xs text-zinc-400">
              ← Swipe to navigate →
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

