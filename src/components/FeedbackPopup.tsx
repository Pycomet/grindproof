/**
 * FeedbackPopup Component
 * Non-disruptive feedback collection popup
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Smile, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { useFeedbackContext } from '@/contexts/FeedbackContext';
import { trpc } from '@/lib/trpc/client';
import { FeedbackType } from '@/lib/feedback/types';
import { feedbackConfig } from '@/lib/feedback/config';

const FEEDBACK_TYPES = [
  { type: 'star' as FeedbackType, icon: Star, label: 'Star Rating' },
  { type: 'emoji' as FeedbackType, icon: Smile, label: 'Emoji' },
  { type: 'thumbs' as FeedbackType, icon: ThumbsUp, label: 'Thumbs Up/Down' },
];

export function FeedbackPopup() {
  const { feedbackState, recordDismissal, recordSubmission } = useFeedbackContext();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('star');
  const [rating, setRating] = useState(0);
  const [emoji, setEmoji] = useState('');
  const [thumb, setThumb] = useState<'up' | 'down' | undefined>(undefined);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedbackMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      recordSubmission();
      
      // Close after showing success message
      setTimeout(() => {
        resetForm();
      }, 2000);
    },
  });

  // Auto-hide timer
  useEffect(() => {
    if (!feedbackState.isOpen || submitted) return;

    const timer = setTimeout(() => {
      recordDismissal();
    }, feedbackConfig.autoHideDelay);

    return () => clearTimeout(timer);
  }, [feedbackState.isOpen, submitted, recordDismissal]);

  // Reset form when closing
  useEffect(() => {
    if (!feedbackState.isOpen) {
      resetForm();
    }
  }, [feedbackState.isOpen]);

  const resetForm = () => {
    setFeedbackType('star');
    setRating(0);
    setEmoji('');
    setThumb(undefined);
    setComment('');
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (!feedbackState.triggerType) return;

    submitFeedbackMutation.mutate({
      triggerType: feedbackState.triggerType,
      feedbackType,
      rating: feedbackType === 'star' ? rating : undefined,
      emoji: feedbackType === 'emoji' ? emoji : undefined,
      thumb: feedbackType === 'thumbs' ? thumb : undefined,
      comment: comment || undefined,
    });
  };

  const handleDismiss = () => {
    recordDismissal();
  };

  const isSubmitDisabled =
    (feedbackType === 'star' && rating === 0) ||
    (feedbackType === 'emoji' && !emoji) ||
    (feedbackType === 'thumbs' && !thumb);

  const getTriggerMessage = () => {
    switch (feedbackState.triggerType) {
      case 'chat':
        return 'How was your coaching experience?';
      case 'eveningCheck':
        return 'How was your check-in experience?';
      case 'taskMilestone':
        return 'How is GrindProof helping you?';
      default:
        return 'How was your experience?';
    }
  };

  return (
    <AnimatePresence>
      {feedbackState.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-40 max-w-md"
        >
          <Card className="shadow-2xl border-2">
            <CardContent className="p-6 flex flex-col gap-4">
              {/* Header with close button */}
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-base">
                  {getTriggerMessage()}
                </span>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors -mt-1"
                  aria-label="Dismiss feedback"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!submitted ? (
                <>
                  {/* Feedback type selector */}
                  <div className="flex gap-2">
                    {FEEDBACK_TYPES.map((ft) => (
                      <Button
                        key={ft.type}
                        size="icon"
                        variant={feedbackType === ft.type ? 'secondary' : 'ghost'}
                        onClick={() => setFeedbackType(ft.type)}
                        aria-label={ft.label}
                      >
                        <ft.icon className="w-5 h-5" />
                      </Button>
                    ))}
                  </div>

                  {/* Star rating */}
                  {feedbackType === 'star' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={`text-yellow-400 transition-opacity ${
                            n <= rating ? '' : 'opacity-30'
                          }`}
                          onClick={() => setRating(n)}
                          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                        >
                          <Star
                            className="w-6 h-6"
                            fill={n <= rating ? '#facc15' : 'none'}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Emoji rating */}
                  {feedbackType === 'emoji' && (
                    <div className="flex gap-2">
                      {[
                        { e: '😊', label: 'Happy' },
                        { e: '😐', label: 'Neutral' },
                        { e: '😞', label: 'Unhappy' },
                      ].map((em) => (
                        <button
                          key={em.e}
                          className={`text-3xl transition-all ${
                            emoji === em.e
                              ? 'ring-2 ring-primary rounded-full scale-110'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          onClick={() => setEmoji(em.e)}
                          aria-label={em.label}
                        >
                          {em.e}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thumbs rating */}
                  {feedbackType === 'thumbs' && (
                    <div className="flex gap-2">
                      <button
                        className={`p-3 rounded-full border transition-all ${
                          thumb === 'up'
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-400 scale-110'
                            : 'border-border hover:border-green-300'
                        }`}
                        onClick={() => setThumb('up')}
                        aria-label="Thumbs up"
                      >
                        <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </button>
                      <button
                        className={`p-3 rounded-full border transition-all ${
                          thumb === 'down'
                            ? 'bg-red-100 dark:bg-red-900/30 border-red-400 scale-110'
                            : 'border-border hover:border-red-300'
                        }`}
                        onClick={() => setThumb('down')}
                        aria-label="Thumbs down"
                      >
                        <ThumbsDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}

                  {/* Comment textarea */}
                  <Textarea
                    placeholder="Additional comments (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      onClick={handleDismiss}
                      size="sm"
                    >
                      Maybe Later
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitDisabled || submitFeedbackMutation.isPending}
                      size="sm"
                    >
                      {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="text-4xl">🎉</div>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    Thank you for your feedback!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

