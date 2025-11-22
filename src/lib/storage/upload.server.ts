import { createServerClient } from '@/lib/supabase/server';
import type { StorageBucket } from './upload';
import { generateFileName } from './upload';

/**
 * Upload file to Supabase Storage (server-side only)
 * DO NOT import this in client components
 */
export async function uploadFileServer(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  bucket: StorageBucket,
  userId: string
): Promise<string> {
  const client = await createServerClient();

  // Generate file path
  const filePath = generateFileName(userId, fileName);

  // Upload to Supabase Storage
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete file from Supabase Storage (server-side only)
 * DO NOT import this in client components
 */
export async function deleteFileServer(url: string, bucket: StorageBucket): Promise<void> {
  const client = await createServerClient();
  const { extractFilePathFromUrl } = await import('./upload');

  // Extract file path from URL
  const filePath = extractFilePathFromUrl(url, bucket);

  if (!filePath) {
    throw new Error('Invalid file URL');
  }

  const { error } = await client.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

