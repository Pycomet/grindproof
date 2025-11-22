import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFile,
  validateFileType,
  validateFileSize,
  validateImageDimensions,
  formatFileSize,
  StorageValidationError,
  STORAGE_LIMITS,
} from '@/lib/storage/upload';

describe('File Upload Validation', () => {
  describe('validateFileType', () => {
    it('should accept valid image types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

      validTypes.forEach((type) => {
        const file = new File(['test'], 'test.jpg', { type });
        expect(() => validateFileType(file)).not.toThrow();
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['image/gif', 'image/svg+xml', 'application/pdf', 'text/plain'];

      invalidTypes.forEach((type) => {
        const file = new File(['test'], 'test.file', { type });
        expect(() => validateFileType(file)).toThrow(StorageValidationError);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const file = new File(['a'.repeat(1024 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      }); // 1MB
      expect(() => validateFileSize(file)).not.toThrow();
    });

    it('should reject files exceeding size limit', () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'test.jpg', { type: 'image/jpeg' });
      expect(() => validateFileSize(file)).toThrow(StorageValidationError);
      expect(() => validateFileSize(file)).toThrow(/exceeds maximum/);
    });

    it('should accept files at exact size limit', () => {
      const content = 'a'.repeat(STORAGE_LIMITS.MAX_FILE_SIZE);
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' });
      expect(() => validateFileSize(file)).not.toThrow();
    });
  });

  describe('validateImageDimensions', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('should accept images within dimension limits', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock Image constructor
      const mockImage = {
        width: 1920,
        height: 1080,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const validationPromise = validateImageDimensions(file);

      // Trigger onload
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await expect(validationPromise).resolves.not.toThrow();
    });

    it('should reject images exceeding dimension limits', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock Image constructor
      const mockImage = {
        width: 5000,
        height: 5000,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const validationPromise = validateImageDimensions(file);

      // Trigger onload
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await expect(validationPromise).rejects.toThrow(StorageValidationError);
      await expect(validationPromise).rejects.toThrow(/dimensions exceed maximum/);
    });

    it('should handle image load errors', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock Image constructor
      const mockImage = {
        width: 0,
        height: 0,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const validationPromise = validateImageDimensions(file);

      // Trigger onerror
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 0);

      await expect(validationPromise).rejects.toThrow(StorageValidationError);
      await expect(validationPromise).rejects.toThrow(/Failed to load image/);
    });
  });

  describe('validateFile', () => {
    beforeEach(() => {
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('should accept valid files', async () => {
      const file = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      // Mock Image constructor
      const mockImage = {
        width: 1920,
        height: 1080,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const validationPromise = validateFile(file);

      // Trigger onload
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await expect(validationPromise).resolves.not.toThrow();
    });

    it('should reject files with invalid type', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(validateFile(file)).rejects.toThrow(StorageValidationError);
    });

    it('should reject files that are too large', async () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'test.jpg', { type: 'image/jpeg' });

      await expect(validateFile(file)).rejects.toThrow(StorageValidationError);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(100)).toBe('100 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 5)).toBe('5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });
  });
});

describe('Storage Constants', () => {
  it('should have correct storage limits', () => {
    expect(STORAGE_LIMITS.MAX_FILE_SIZE).toBe(5 * 1024 * 1024); // 5MB
    expect(STORAGE_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
    expect(STORAGE_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/png');
    expect(STORAGE_LIMITS.ALLOWED_IMAGE_TYPES).toContain('image/webp');
    expect(STORAGE_LIMITS.MAX_IMAGE_DIMENSION).toBe(4096);
  });
});

