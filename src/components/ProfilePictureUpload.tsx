'use client';

import { useState } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  validateFile,
  uploadFile,
  STORAGE_BUCKETS,
  StorageValidationError,
} from '@/lib/storage/upload';
import { trpc } from '@/lib/trpc/client';

interface ProfilePictureUploadProps {
  userId: string;
  currentPictureUrl?: string | null;
  onUploadComplete?: () => void;
}

export function ProfilePictureUpload({
  userId,
  currentPictureUrl,
  onUploadComplete,
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const updateProfileMutation = trpc.profile.update.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      // Validate file
      await validateFile(file);

      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload file
      const url = await uploadFile(file, STORAGE_BUCKETS.PROFILE_PICTURES, userId);

      // Update profile
      await updateProfileMutation.mutateAsync({
        profilePicUrl: url,
      });

      // Cleanup preview
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);

      // Notify parent
      onUploadComplete?.();

      // Close dialog
      setIsDialogOpen(false);
    } catch (err) {
      if (err instanceof StorageValidationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to upload profile picture');
      }

      // Cleanup preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Profile Picture Display */}
      <button
        onClick={() => setIsDialogOpen(true)}
        className="relative group"
        aria-label="Change profile picture"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-300 dark:border-gray-700">
          {currentPictureUrl ? (
            <img
              src={currentPictureUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-gray-400 dark:text-gray-600" />
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </button>

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
            <DialogDescription>
              Choose an image to use as your profile picture
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview */}
            {previewUrl || currentPictureUrl ? (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700">
                  <img
                    src={previewUrl || currentPictureUrl || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-300 dark:border-gray-700">
                  <User className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="flex justify-center">
              <label htmlFor="profile-pic-input">
                <Button type="button" disabled={isUploading} asChild>
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Choose Image
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <input
                id="profile-pic-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Supported: JPEG, PNG, WebP • Max 5MB
            </p>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

