'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  validateFile,
  uploadFile,
  STORAGE_LIMITS,
  STORAGE_BUCKETS,
  formatFileSize,
  StorageValidationError,
  type StorageBucket,
} from '@/lib/storage/upload';
import { trpc } from '@/lib/trpc/client';

interface FileUploadProps {
  bucket: StorageBucket;
  userId: string;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  existingFiles?: string[];
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export function FileUpload({
  bucket,
  userId,
  onUploadComplete,
  onUploadError,
  maxFiles = 1,
  existingFiles = [],
  className = '',
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUploadMutation = trpc.upload.validateUpload.useMutation();

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Check if we've reached max files limit
      const totalFiles = existingFiles.length + uploadingFiles.length + files.length;
      if (totalFiles > maxFiles) {
        const error = `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`;
        onUploadError?.(error);
        return;
      }

      // Add files to uploading state
      const newUploadingFiles: UploadingFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadIndex = uploadingFiles.length + i;

        try {
          // Client-side validation
          await validateFile(file);

          // Server-side validation
          await validateUploadMutation.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type as any,
            bucket,
          });

          // Upload file
          const url = await uploadFile(file, bucket, userId, (progress) => {
            setUploadingFiles((prev) => {
              const updated = [...prev];
              if (updated[uploadIndex]) {
                updated[uploadIndex].progress = progress;
              }
              return updated;
            });
          });

          // Mark as success
          setUploadingFiles((prev) => {
            const updated = [...prev];
            if (updated[uploadIndex]) {
              updated[uploadIndex].status = 'success';
              updated[uploadIndex].progress = 100;
              updated[uploadIndex].url = url;
            }
            return updated;
          });

          // Notify parent
          onUploadComplete(url);

          // Remove from uploading list after 2 seconds
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((_, idx) => idx !== uploadIndex));
          }, 2000);
        } catch (error) {
          const errorMessage =
            error instanceof StorageValidationError
              ? error.message
              : error instanceof Error
              ? error.message
              : 'Failed to upload file';

          setUploadingFiles((prev) => {
            const updated = [...prev];
            if (updated[uploadIndex]) {
              updated[uploadIndex].status = 'error';
              updated[uploadIndex].error = errorMessage;
            }
            return updated;
          });

          onUploadError?.(errorMessage);
        }
      }
    },
    [bucket, userId, maxFiles, existingFiles, uploadingFiles, onUploadComplete, onUploadError, validateUploadMutation]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeUploadingFile = useCallback((index: number) => {
    setUploadingFiles((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={STORAGE_LIMITS.ALLOWED_IMAGE_TYPES.join(',')}
          multiple={maxFiles > 1}
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop your image{maxFiles > 1 ? 's' : ''} here, or
          </p>
          <Button type="button" variant="outline" onClick={handleButtonClick}>
            Browse Files
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
            Supported: {STORAGE_LIMITS.ALLOWED_IMAGE_TYPES.map((type) => type.split('/')[1].toUpperCase()).join(', ')}
            <br />
            Max size: {formatFileSize(STORAGE_LIMITS.MAX_FILE_SIZE)}
            {maxFiles > 1 && ` • Max ${maxFiles} files`}
          </p>
        </div>
      </div>

      {/* Uploading files preview */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="shrink-0">
                {uploadingFile.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {uploadingFile.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {uploadingFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {formatFileSize(uploadingFile.file.size)}
                  </span>
                </div>

                {uploadingFile.status === 'uploading' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}

                {uploadingFile.status === 'success' && (
                  <p className="text-xs text-green-600 dark:text-green-400">Upload complete</p>
                )}

                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400">{uploadingFile.error}</p>
                )}
              </div>

              {uploadingFile.status === 'error' && (
                <button
                  onClick={() => removeUploadingFile(index)}
                  className="shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilePreviewProps {
  url: string;
  onRemove?: () => void;
  className?: string;
}

export function FilePreview({ url, onRemove, className = '' }: FilePreviewProps) {
  return (
    <div className={`relative group ${className}`}>
      <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove image"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

