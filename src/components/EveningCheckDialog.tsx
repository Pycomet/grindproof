'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Loader2, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { FileUpload } from '@/components/FileUpload';
import { useApp } from '@/contexts/AppContext';
import { STORAGE_BUCKETS } from '@/lib/config';

interface EveningCheckDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function EveningCheckDialog({ open, onClose, onComplete }: EveningCheckDialogProps) {
  const { user } = useApp();
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState<'overview' | 'reflect' | 'review'>('overview');

  const { data: comparison, isLoading, refetch } = trpc.dailyCheck.getEveningComparison.useQuery(undefined, {
    enabled: open,
  });

  const saveReflection = trpc.dailyCheck.saveEveningReflection.useMutation({
    onSuccess: () => {
      onComplete();
      onClose();
    },
  });

  // Reset state when dialog opens and load existing data
  useEffect(() => {
    if (open) {
      setStep('overview');
      refetch();
    }
  }, [open, refetch]);

  // Load existing reflections and evidence when comparison data is fetched
  useEffect(() => {
    if (comparison?.existingReflection) {
      setReflections(comparison.existingReflection.reflections || {});
      setEvidenceUrls(comparison.existingReflection.evidenceUrls || {});
    } else {
      setReflections({});
      setEvidenceUrls({});
    }
  }, [comparison]);

  const handleSaveReflection = async () => {
    if (!comparison) return;

    await saveReflection.mutateAsync({
      date: new Date().toISOString(),
      alignmentScore: comparison.stats.alignmentScore,
      reflections,
      evidenceUrls,
      completedTasks: comparison.stats.completed,
      totalTasks: comparison.stats.total,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'skipped':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'skipped':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const incompleteTasks = comparison?.tasks.filter(t => t.status !== 'completed') || [];
  
  // Sort tasks: incomplete first, then completed
  const sortedTasks = [...(comparison?.tasks || [])].sort((a, b) => {
    const aIncomplete = a.status !== 'completed' ? 0 : 1;
    const bIncomplete = b.status !== 'completed' ? 0 : 1;
    return aIncomplete - bIncomplete;
  });
  
  const allTasks = sortedTasks;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[75vh] p-0 gap-0">
        <DialogHeader className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            🌙 Evening Reality Check
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {step === 'overview' ? "Let's see how your day went" : 'Share what happened with incomplete tasks'}
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
              {/* Step 1: Overview */}
              {step === 'overview' && (
                <>
                  {/* Alignment Score */}
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 bg-linear-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        Today's Alignment Score
                      </p>
                      <div className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                        {Math.round((comparison?.stats.alignmentScore || 0) * 100)}%
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {comparison?.stats.completed || 0} of {comparison?.stats.total || 0} tasks completed
                      </p>
                    </div>
                  </div>

                  {/* Task Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                      Today's Tasks
                    </h3>
                    
                    {comparison?.tasks && comparison.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {comparison.tasks.map((task: any) => (
                          <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            {getStatusIcon(task.status)}
                            <div className="flex-1">
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{task.description}</p>
                              )}
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-8">No tasks for today</p>
                    )}
                  </div>

                  {/* Integration Activity */}
                  {(comparison?.integrations.hasGitHub || comparison?.integrations.hasCalendar) && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                        Integration Activity
                      </h4>
                      <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                        {comparison.integrations.hasGitHub && (
                          <p>✓ GitHub activity tracked</p>
                        )}
                        {comparison.integrations.hasCalendar && (
                          <p>✓ Calendar events synced</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  {incompleteTasks.length > 0 && (
                    <Button
                      onClick={() => setStep('reflect')}
                      className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Reflect on Incomplete Tasks
                    </Button>
                  )}
                </>
              )}

              {/* Step 2: Reflections */}
              {step === 'reflect' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 p-4">
                    <p className="text-sm text-orange-900 dark:text-orange-200">
                      💭 Reflect on your day. For incomplete tasks, explain what happened. For completed tasks, upload evidence if needed.
                    </p>
                  </div>

                  {allTasks.map((task: any) => (
                    <div key={task.id} className="space-y-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      
                      {/* Reflection input for incomplete tasks */}
                      {task.status !== 'completed' && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            What happened?
                          </label>
                          <Textarea
                            value={reflections[task.id] || ''}
                            onChange={(e) => setReflections(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Be honest... got distracted? priorities changed? underestimated time?"
                            className="min-h-[80px]"
                          />
                        </div>
                      )}

                      {/* Evidence Upload for completed tasks */}
                      {task.status === 'completed' && user && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Upload Evidence (optional)
                          </label>
                          
                          {/* Show existing evidence from database */}
                          {task.evidence && task.evidence.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {task.evidence.map((ev: any, idx: number) => (
                                <div key={ev.id} className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-950/20">
                                  <svg className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-green-900 dark:text-green-200">
                                      Evidence {idx + 1} - {ev.type}
                                    </p>
                                    {ev.type === 'photo' || ev.type === 'screenshot' ? (
                                      <a 
                                        href={ev.content} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-700 dark:text-green-300 underline hover:no-underline"
                                      >
                                        View image
                                      </a>
                                    ) : (
                                      <p className="text-xs text-green-700 dark:text-green-300 line-clamp-2">{ev.content}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <FileUpload
                            bucket={STORAGE_BUCKETS.TASK_EVIDENCE}
                            userId={user.id}
                            simple={true}
                            onUploadComplete={(url) => {
                              setEvidenceUrls(prev => ({
                                ...prev,
                                [task.id]: [...(prev[task.id] || []), url]
                              }));
                            }}
                          />
                          {evidenceUrls[task.id] && evidenceUrls[task.id].length > 0 && (
                            <div className="mt-2 space-y-1">
                              {evidenceUrls[task.id].map((url, idx) => (
                                <p key={idx} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  ✓ New evidence uploaded ({idx + 1})
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-zinc-500 mt-2">
                            {task.evidence && task.evidence.length > 0 
                              ? `${task.evidence.length} evidence item(s) already submitted` 
                              : 'Upload proof to validate completion'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep('overview')}
                      className="flex-1"
                    >
                      Back to Overview
                    </Button>
                    <Button
                      onClick={() => setStep('review')}
                      className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Review & Submit
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {step === 'review' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      📋 Review your reflections and evidence before submitting
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="space-y-3">
                    {allTasks.map((task: any) => {
                      const hasReflection = reflections[task.id];
                      const hasEvidence = evidenceUrls[task.id] && evidenceUrls[task.id].length > 0;
                      
                      if (!hasReflection && !hasEvidence) return null;
                      
                      return (
                        <div key={task.id} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          
                          {hasReflection && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Reflection:</p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">"{reflections[task.id]}"</p>
                            </div>
                          )}
                          
                          {hasEvidence && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Evidence:</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                ✓ {evidenceUrls[task.id].length} file(s) uploaded
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {Object.keys(reflections).length === 0 && Object.keys(evidenceUrls).length === 0 && (
                      <p className="text-center text-zinc-500 py-8">
                        No reflections or evidence added yet
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setStep('reflect')}
                    className="w-full"
                  >
                    Back to Edit
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
                onClick={handleSaveReflection}
                disabled={saveReflection.isPending}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saveReflection.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Complete Check-in'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

