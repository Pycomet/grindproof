'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trash2, Plus, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { parseTasksFromAIResponse, isConfidentParse, type ParsedTask } from '@/lib/utils/task-parser';

interface MorningCheckDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function MorningCheckDialog({ open, onClose, onComplete }: MorningCheckDialogProps) {
  const [step, setStep] = useState<'schedule' | 'planning' | 'review'>('schedule');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [prioritiesInput, setPrioritiesInput] = useState<string>('');
  const [isParsingTasks, setIsParsingTasks] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const { data: schedule, isLoading, refetch } = trpc.dailyCheck.getMorningSchedule.useQuery(undefined, {
    enabled: open,
  });

  const savePlan = trpc.dailyCheck.saveMorningPlan.useMutation({
    onSuccess: () => {
      onComplete();
      onClose();
    },
  });

  const refineTasks = trpc.dailyCheck.refineTasks.useMutation();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('schedule');
      setParsedTasks([]);
      setPrioritiesInput('');
      setParsingError(null);
      setIsParsingTasks(false);
      refetch();
    }
  }, [open, refetch]);

  // Hybrid parsing: Local parser → LLM fallback → Error
  const handlePreviewTasks = useCallback(async () => {
    if (!prioritiesInput.trim()) {
      setParsingError('Please enter your priorities for today.');
      return;
    }

    setIsParsingTasks(true);
    setParsingError(null);

    try {
      // Step 1: Try local parser
      const locallyParsed = parseTasksFromAIResponse(prioritiesInput);

      // Step 2: Check if parse is confident
      if (isConfidentParse(locallyParsed)) {
        setParsedTasks(locallyParsed);
        setStep('review');
        return;
      }

      // Step 3: Fallback to LLM for refinement
      const refined = await refineTasks.mutateAsync({
        input: prioritiesInput,
        locallyParsed: locallyParsed,
      });

      if (refined.tasks && refined.tasks.length > 0) {
        setParsedTasks(refined.tasks);
        setStep('review');
      } else {
        setParsingError('Could not parse tasks. Please be more specific about times and priorities.');
      }
    } catch (error: any) {
      console.error('Task parsing error:', error);
      setParsingError('Failed to parse tasks. Please try rephrasing your priorities or add more details like times and priority levels.');
    } finally {
      setIsParsingTasks(false);
    }
  }, [prioritiesInput, refineTasks]);

  const handleSavePlan = async () => {
    if (parsedTasks.length === 0) {
      onClose();
      return;
    }

    await savePlan.mutateAsync({
      tasks: parsedTasks.map(task => ({
        title: task.title,
        description: task.description,
        startTime: task.startTime,
        endTime: task.endTime,
        priority: task.priority || 'medium',
        dueDate: new Date().toISOString(),
        syncToCalendar: task.syncToCalendar || false,
      })),
    });
  };

  const removeTask = (index: number) => {
    setParsedTasks(tasks => tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, updates: Partial<ParsedTask>) => {
    setParsedTasks(tasks => tasks.map((task, i) => 
      i === index ? { ...task, ...updates } : task
    ));
    setEditingIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[75vh] p-0 gap-0">
        <DialogHeader className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            🌅 Good Morning! Let's Plan Your Day
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {step === 'schedule' && 'Review your schedule'}
            {step === 'planning' && 'What are your priorities today?'}
            {step === 'review' && 'Review and confirm your tasks'}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Schedule Overview */}
              {step === 'schedule' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                      Today's Schedule
                    </h3>
                    
                    {schedule?.tasks && schedule.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {[...schedule.tasks]
                          .sort((a, b) => {
                            // Sort incomplete tasks first
                            const aIncomplete = a.status !== 'completed' ? 0 : 1;
                            const bIncomplete = b.status !== 'completed' ? 0 : 1;
                            return aIncomplete - bIncomplete;
                          })
                          .map((task: any) => (
                          <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 ${
                            task.status === 'completed' 
                              ? 'bg-green-50 dark:bg-green-950/20 opacity-75' 
                              : 'bg-zinc-50 dark:bg-zinc-900/50'
                          }`}>
                            <Calendar className={`h-4 w-4 ${task.status === 'completed' ? 'text-green-400' : 'text-zinc-400'}`} />
                            <div className="flex-1">
                              <p className={`font-medium text-zinc-900 dark:text-zinc-50 ${
                                task.status === 'completed' ? 'line-through' : ''
                              }`}>
                                {task.title}
                              </p>
                              {task.start_time && (
                                <p className={`text-xs flex items-center gap-1 mt-1 ${
                                  task.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'
                                }`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(task.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                            {task.status === 'completed' ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                ✓ Done
                              </Badge>
                            ) : (
                              <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-8">No tasks scheduled yet</p>
                    )}
                  </div>

                  <Button
                    onClick={() => setStep('planning')}
                    className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Add More Tasks
                  </Button>
                </div>
              )}

              {/* Step 2: Add Priorities */}
              {step === 'planning' && (
                <div className="space-y-4">
                  {/* Helper Text */}
                  <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      💡 <strong>List your priorities naturally:</strong>
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                      • Go to gym at 6pm<br />
                      • Work on AI feature for 2 hours<br />
                      • Grocery shopping (high priority)
                    </p>
                  </div>

                  {/* Textarea Input */}
                  <Textarea
                    value={prioritiesInput}
                    onChange={(e) => {
                      setPrioritiesInput(e.target.value);
                      setParsingError(null);
                    }}
                    placeholder="List your priorities for today..."
                    className="min-h-[200px] text-base"
                    disabled={isParsingTasks}
                  />

                  {/* Error Message */}
                  {parsingError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <p className="text-sm text-red-900 dark:text-red-200">{parsingError}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep('schedule')}
                      disabled={isParsingTasks}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handlePreviewTasks}
                      disabled={!prioritiesInput.trim() || isParsingTasks}
                      className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50"
                    >
                      {isParsingTasks ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Parsing tasks...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Preview Tasks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Confirm */}
              {step === 'review' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-3 mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      📅 All tasks will be scheduled for <strong>today</strong>. Edit titles and remove any you don't want.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                      Review Your Tasks
                    </h3>
                    
                    {parsedTasks.length > 0 ? (
                      <div className="space-y-2">
                        {parsedTasks.map((task, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            {editingIndex === index ? (
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={task.title}
                                  onChange={(e) => updateTask(index, { title: e.target.value })}
                                  className="font-medium"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => setEditingIndex(null)}>
                                    Done
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                                  {task.description && (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{task.description}</p>
                                  )}
                                  {task.startTime && (
                                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" />
                                      {task.startTime}
                                      {task.estimatedDuration && ` (${task.estimatedDuration}min)`}
                                    </p>
                                  )}
                                </div>

                                {/* Calendar Sync Checkbox */}
                                {schedule?.hasCalendarIntegration && task.startTime && (
                                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={task.syncToCalendar ?? false}
                                      onChange={(e) => updateTask(index, { 
                                        syncToCalendar: e.target.checked 
                                      })}
                                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                                    />
                                    <Calendar className="h-3 w-3" />
                                    <span>Sync</span>
                                  </label>
                                )}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingIndex(index)}
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTask(index)}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-8">
                        No tasks to review. Go back to add some priorities.
                      </p>
                    )}
                  </div>

                  {/* Calendar Integration Info */}
                  {schedule?.hasCalendarIntegration && parsedTasks.some(t => t.startTime) && (
                    <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 p-3">
                      <p className="text-xs text-green-900 dark:text-green-200">
                        ✓ Calendar integration detected. Check "Sync" to add tasks to your calendar.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setStep('planning')}
                    className="w-full"
                  >
                    Add More Tasks
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Skip for Now
            </Button>
            {step === 'review' && (
              <Button
                onClick={handleSavePlan}
                disabled={savePlan.isPending || parsedTasks.length === 0}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {savePlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  `Commit to Plan (${parsedTasks.length} tasks)`
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

