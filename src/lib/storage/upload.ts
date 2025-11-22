// Import from config for consistency
import { STORAGE_LIMITS, STORAGE_BUCKETS } from '@/lib/config';

// Re-export for backward compatibility
export { STORAGE_LIMITS, STORAGE_BUCKETS };

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Validation errors
 */
export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

/**
 * Validate file type
 */
export function validateFileType(file: File): void {
  if (!STORAGE_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    throw new StorageValidationError(
      `Invalid file type. Allowed types: ${STORAGE_LIMITS.ALLOWED_IMAGE_TYPES.join(', ')}`
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): void {
  if (file.size > STORAGE_LIMITS.MAX_FILE_SIZE) {
    const maxSizeMB = STORAGE_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
    throw new StorageValidationError(
      `File size exceeds maximum of ${maxSizeMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      if (img.width > STORAGE_LIMITS.MAX_IMAGE_DIMENSION || img.height > STORAGE_LIMITS.MAX_IMAGE_DIMENSION) {
        reject(
          new StorageValidationError(
            `Image dimensions exceed maximum of ${STORAGE_LIMITS.MAX_IMAGE_DIMENSION}x${STORAGE_LIMITS.MAX_IMAGE_DIMENSION}px. Current: ${img.width}x${img.height}px`
          )
        );
      } else {
        resolve();
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new StorageValidationError('Failed to load image for validation'));
    };

    img.src = objectUrl;
  });
}

/**
 * Validate file completely (type, size, dimensions)
 */
export async function validateFile(file: File): Promise<void> {
  validateFileType(file);
  validateFileSize(file);
  await validateImageDimensions(file);
}

/**
 * Generate a unique file name with user ID and timestamp
 */
export function generateFileName(userId: string, originalFileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const extension = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${userId}/${timestamp}-${randomStr}.${extension}`;
}

/**
 * Upload file to Supabase Storage (client-side)
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Lazy import to avoid module load issues in tests
  const { supabase } = await import('@/lib/supabase/client');
  
  // Validate file
  await validateFile(file);

  // Generate file path
  const filePath = generateFileName(userId, file.name);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Server-side upload function moved to upload.server.ts
// to avoid importing server-only code in client components

/**
 * Delete file from Supabase Storage (client-side)
 */
export async function deleteFile(url: string, bucket: StorageBucket): Promise<void> {
  // Lazy import to avoid module load issues in tests
  const { supabase } = await import('@/lib/supabase/client');
  
  // Extract file path from URL
  const filePath = extractFilePathFromUrl(url, bucket);

  if (!filePath) {
    throw new Error('Invalid file URL');
  }

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// Server-side delete function moved to upload.server.ts
// to avoid importing server-only code in client components

/**
 * Extract file path from public URL
 */
export function extractFilePathFromUrl(url: string, bucket: StorageBucket): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf(bucket);
    
    if (bucketIndex === -1) {
      return null;
    }
    
    // Get everything after the bucket name
    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    return filePath || null;
  } catch {
    return null;
  }
}

// Re-export formatFileSize from config
export { formatFileSize } from '@/lib/config';

