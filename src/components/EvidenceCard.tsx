'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, Image as ImageIcon, FileText, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

interface Evidence {
  id: string;
  type: 'photo' | 'screenshot' | 'text' | 'link';
  content: string;
  submittedAt: Date;
  aiValidated: boolean;
  validationNotes: string | null;
}

interface EvidenceCardProps {
  evidence: Evidence;
  onRevalidate?: () => void;
}

export function EvidenceCard({ evidence, onRevalidate }: EvidenceCardProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const validateMutation = trpc.evidence.validateEvidence.useMutation();

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateMutation.mutateAsync({ id: evidence.id });
      // Wait a bit then refetch to see updated results
      setTimeout(() => {
        onRevalidate?.();
        setIsValidating(false);
      }, 2000);
    } catch (error) {
      console.error('Validation failed:', error);
      setIsValidating(false);
    }
  };

  const getValidationBadge = () => {
    if (isValidating) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <Clock className="w-3 h-3 animate-spin" />
          Validating
        </span>
      );
    }

    if (evidence.aiValidated) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      );
    }

    if (evidence.aiValidated === false && evidence.validationNotes) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          <XCircle className="w-3 h-3" />
          Invalid
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const getTypeIcon = () => {
    switch (evidence.type) {
      case 'photo':
      case 'screenshot':
        return <ImageIcon className="w-3.5 h-3.5" />;
      case 'text':
        return <FileText className="w-3.5 h-3.5" />;
      case 'link':
        return <LinkIcon className="w-3.5 h-3.5" />;
    }
  };

  const renderCompactContent = () => {
    if (evidence.type === 'photo' || evidence.type === 'screenshot') {
      return (
        <img
          src={evidence.content}
          alt="Evidence thumbnail"
          className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700"
        />
      );
    }

    if (evidence.type === 'link') {
      return (
        <a
          href={evidence.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          {evidence.content}
        </a>
      );
    }

    if (evidence.type === 'text') {
      return (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
          {evidence.content}
        </p>
      );
    }
  };

  const renderExpandedContent = () => {
    if (evidence.type === 'photo' || evidence.type === 'screenshot') {
      return (
        <div className="mt-2">
          <img
            src={evidence.content}
            alt="Evidence"
            className="w-full max-h-64 object-contain rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
        </div>
      );
    }

    if (evidence.type === 'link') {
      return (
        <div className="mt-2">
          <a
            href={evidence.content}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {evidence.content}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      );
    }

    if (evidence.type === 'text') {
      return (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {evidence.content}
          </p>
        </div>
      );
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-950">
      {/* Compact Header - Always Visible */}
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-gray-500 dark:text-gray-400">
          {getTypeIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {!isExpanded && renderCompactContent()}
        </div>

        {getValidationBadge()}

        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {renderExpandedContent()}

          {/* Validation Notes */}
          {evidence.validationNotes && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI Validation:
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {evidence.validationNotes}
              </p>
            </div>
          )}

          {/* Submission Time */}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Submitted {new Date(evidence.submittedAt).toLocaleDateString()} at{' '}
            {new Date(evidence.submittedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          {/* Actions */}
          {!evidence.aiValidated && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleValidate();
                }}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Revalidate'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface EvidenceListProps {
  taskId: string;
}

export function EvidenceList({ taskId }: EvidenceListProps) {
  const { data: evidence, refetch } = trpc.evidence.getByTaskId.useQuery(
    { taskId },
    { refetchOnWindowFocus: false }
  );

  if (!evidence || evidence.length === 0) {
    return null; // Don't show anything if no evidence
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Evidence ({evidence.length})
      </p>
      {evidence.map((item: Evidence) => (
        <EvidenceCard
          key={item.id}
          evidence={item}
          onRevalidate={() => refetch()}
        />
      ))}
    </div>
  );
}
