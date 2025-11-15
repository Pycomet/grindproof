'use client';

import { motion } from 'framer-motion';

const shimmerVariants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear' as const,
    },
  },
};

export function TaskSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          {/* Title skeleton */}
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-5 w-3/4 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
          
          {/* Description skeleton */}
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-4 w-full rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
          
          {/* Tags skeleton */}
          <div className="flex gap-2">
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
                className="h-6 w-16 rounded-full bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
                style={{
                  backgroundSize: '200% 100%',
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Action buttons skeleton */}
        <div className="flex gap-2">
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-8 w-8 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-8 w-8 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-3">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <motion.div
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="h-6 w-2/3 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
              style={{
                backgroundSize: '200% 100%',
              }}
            />
            <div className="flex gap-2">
              {[1, 2].map((i) => (
                <motion.div
                  key={i}
                  variants={shimmerVariants}
                  initial="initial"
                  animate="animate"
                  className="h-5 w-12 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                />
              ))}
            </div>
          </div>
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-8 w-20 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
        
        {/* Description */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-4 w-full rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
          style={{
            backgroundSize: '200% 100%',
          }}
        />
        
        {/* Progress bar */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-2 w-full rounded-full bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </motion.div>
  );
}

export function GoalListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GoalSkeleton key={i} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-4">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-8 w-1/2 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
          style={{
            backgroundSize: '200% 100%',
          }}
        />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="h-4 w-full rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800"
              style={{
                backgroundSize: '200% 100%',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

