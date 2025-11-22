import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createTestCaller } from '@/__tests__/utils/trpc-test-utils';
import { STORAGE_BUCKETS } from '@/lib/storage/upload';

describe('Upload Router', () => {
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  const mockUserId = 'test-user-123';

  beforeAll(async () => {
    caller = await createTestCaller({
      user: {
        id: mockUserId,
        email: 'test@example.com',
      } as any,
      db: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          in: vi.fn().mockReturnThis(),
        })),
      } as any,
    });
  });

  describe('validateUpload', () => {
    it('should validate correct upload metadata', async () => {
      const result = await caller.upload.validateUpload({
        fileName: 'test-image.jpg',
        fileSize: 1024 * 1024, // 1MB
        fileType: 'image/jpeg',
        bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId);
      expect(result.bucket).toBe(STORAGE_BUCKETS.TASK_EVIDENCE);
    });

    it('should reject files exceeding size limit', async () => {
      await expect(
        caller.upload.validateUpload({
          fileName: 'large-image.jpg',
          fileSize: 10 * 1024 * 1024, // 10MB
          fileType: 'image/jpeg',
          bucket: STORAGE_BUCKETS.PROFILE_PICTURES,
        })
      ).rejects.toThrow(/exceeds maximum/);
    });

    it('should reject invalid file types', async () => {
      await expect(
        caller.upload.validateUpload({
          fileName: 'document.pdf',
          fileSize: 1024 * 1024,
          fileType: 'application/pdf' as any,
          bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
        })
      ).rejects.toThrow();
    });

    it('should validate different image formats', async () => {
      const imageTypes: Array<'image/jpeg' | 'image/png' | 'image/webp'> = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      for (const fileType of imageTypes) {
        const result = await caller.upload.validateUpload({
          fileName: `test.${fileType.split('/')[1]}`,
          fileSize: 1024 * 1024,
          fileType,
          bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('bucket validation', () => {
    it('should accept profile-pictures bucket', async () => {
      const result = await caller.upload.validateUpload({
        fileName: 'profile.jpg',
        fileSize: 1024 * 1024,
        fileType: 'image/jpeg',
        bucket: STORAGE_BUCKETS.PROFILE_PICTURES,
      });

      expect(result.bucket).toBe(STORAGE_BUCKETS.PROFILE_PICTURES);
    });

    it('should accept task-evidence bucket', async () => {
      const result = await caller.upload.validateUpload({
        fileName: 'evidence.jpg',
        fileSize: 1024 * 1024,
        fileType: 'image/jpeg',
        bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
      });

      expect(result.bucket).toBe(STORAGE_BUCKETS.TASK_EVIDENCE);
    });
  });

  describe('file size boundaries', () => {
    it('should accept file at exact size limit', async () => {
      const result = await caller.upload.validateUpload({
        fileName: 'max-size.jpg',
        fileSize: 5 * 1024 * 1024, // Exactly 5MB
        fileType: 'image/jpeg',
        bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
      });

      expect(result.success).toBe(true);
    });

    it('should reject file just over size limit', async () => {
      await expect(
        caller.upload.validateUpload({
          fileName: 'over-limit.jpg',
          fileSize: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
          fileType: 'image/jpeg',
          bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
        })
      ).rejects.toThrow(/exceeds maximum/);
    });

    it('should accept very small files', async () => {
      const result = await caller.upload.validateUpload({
        fileName: 'tiny.jpg',
        fileSize: 100, // 100 bytes
        fileType: 'image/jpeg',
        bucket: STORAGE_BUCKETS.TASK_EVIDENCE,
      });

      expect(result.success).toBe(true);
    });
  });
});

