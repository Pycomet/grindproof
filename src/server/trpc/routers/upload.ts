import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { STORAGE_BUCKETS, deleteFile } from "@/lib/storage/upload";

/**
 * Upload schemas
 */
export const uploadMetadataSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().positive("File size must be positive"),
  fileType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  bucket: z.enum([STORAGE_BUCKETS.PROFILE_PICTURES, STORAGE_BUCKETS.TASK_EVIDENCE]),
});

export const deleteFileSchema = z.object({
  url: z.string().url("Invalid file URL"),
  bucket: z.enum([STORAGE_BUCKETS.PROFILE_PICTURES, STORAGE_BUCKETS.TASK_EVIDENCE]),
});

/**
 * Upload router
 * Handles file upload metadata and deletion
 * Note: Actual file uploads are done client-side to Supabase Storage
 */
export const uploadRouter = router({
  /**
   * Validate upload metadata
   * This procedure validates that the file metadata is correct before client uploads
   */
  validateUpload: protectedProcedure
    .input(uploadMetadataSchema)
    .mutation(async ({ ctx, input }) => {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

      // Validate file size
      if (input.fileSize > MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Current size: ${(input.fileSize / (1024 * 1024)).toFixed(2)}MB`
        );
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(input.fileType)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`);
      }

      // Return success with user ID for path generation
      return {
        success: true,
        userId: ctx.user.id,
        bucket: input.bucket,
      };
    }),

  /**
   * Delete file from storage
   * Only the owner can delete their files (enforced by RLS policies)
   */
  deleteFile: protectedProcedure
    .input(deleteFileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Extract user ID from URL to verify ownership
        const urlPath = new URL(input.url).pathname;
        const pathParts = urlPath.split('/');
        const bucketIndex = pathParts.indexOf(input.bucket);
        
        if (bucketIndex === -1) {
          throw new Error('Invalid file URL');
        }
        
        // Get user ID from path (should be first part after bucket)
        const fileUserId = pathParts[bucketIndex + 1];
        
        // Verify the file belongs to the current user
        if (fileUserId !== ctx.user.id) {
          throw new Error('Access denied: You can only delete your own files');
        }

        // Delete the file
        await deleteFile(input.url, input.bucket);

        return {
          success: true,
          message: 'File deleted successfully',
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to delete file: ${error.message}`);
        }
        throw new Error('Failed to delete file: Unknown error');
      }
    }),

  /**
   * Get upload statistics for the current user
   */
  getUploadStats: protectedProcedure.query(async ({ ctx }) => {
    // Get all profile pictures for the user
    const { data: profilePics, error: profileError } = await ctx.db
      .from("profiles")
      .select("profile_pic_url")
      .eq("id", ctx.user.id)
      .maybeSingle();

    // Get all task evidence for the user's tasks
    const { data: userTasks } = await ctx.db
      .from("tasks")
      .select("id")
      .eq("user_id", ctx.user.id);

    const taskIds = (userTasks || []).map(t => t.id);

    let evidenceCount = 0;
    if (taskIds.length > 0) {
      const { data: evidence } = await (ctx.db as any)
        .from("evidence")
        .select("id")
        .in("task_id", taskIds)
        .in("type", ["photo", "screenshot"]);

      evidenceCount = (evidence || []).length;
    }

    return {
      hasProfilePicture: !!profilePics?.profile_pic_url,
      evidenceCount,
      totalUploads: (profilePics?.profile_pic_url ? 1 : 0) + evidenceCount,
    };
  }),
});

