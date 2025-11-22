import { env } from './env';

/**
 * Application configuration
 * All configurable values with defaults pulled from environment variables
 */

// Storage Configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: parseInt(env.STORAGE_MAX_FILE_SIZE_MB || '5') * 1024 * 1024, // Convert MB to bytes
  MAX_IMAGE_DIMENSION: parseInt(env.STORAGE_MAX_IMAGE_DIMENSION || '4096'),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  BUCKETS: {
    PROFILE_PICTURES: env.STORAGE_PROFILE_BUCKET || 'profile-pictures',
    TASK_EVIDENCE: env.STORAGE_EVIDENCE_BUCKET || 'task-evidence',
  },
} as const;

// AI Model Configuration
export const AI_CONFIG = {
  MODELS: {
    TEXT: env.AI_TEXT_MODEL,
    VISION: env.AI_VISION_MODEL,
  },
} as const;

// Validation Configuration
export const VALIDATION_CONFIG = {
  MIN_CONFIDENCE: parseFloat(env.VALIDATION_MIN_CONFIDENCE || '0.5'),
  EVIDENCE_WEIGHTS: {
    VALIDATED: parseFloat(env.VALIDATION_VALIDATED_WEIGHT || '1.0'),
    UNVALIDATED: parseFloat(env.VALIDATION_UNVALIDATED_WEIGHT || '0.5'),
  },
} as const;

// App Configuration
export const APP_CONFIG = {
  BASE_URL: env.NEXT_PUBLIC_APP_URL || 
    (env.NEXT_PUBLIC_VERCEL_URL ? `https://${env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
    (typeof window !== 'undefined' ? window.location.origin : null) ||
    (process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000'),
} as const;

// Re-export for convenience
export const STORAGE_LIMITS = {
  MAX_FILE_SIZE: STORAGE_CONFIG.MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES: STORAGE_CONFIG.ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_DIMENSION: STORAGE_CONFIG.MAX_IMAGE_DIMENSION,
} as const;

export const STORAGE_BUCKETS = STORAGE_CONFIG.BUCKETS;

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

