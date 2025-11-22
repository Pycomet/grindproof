# File Upload Storage

This module provides secure file upload functionality using Supabase Storage with comprehensive validation.

## Features

- **Image Upload Support**: JPEG, PNG, and WebP formats
- **Client-side Validation**: File type, size, and dimension checks
- **Server-side Validation**: Additional security layer via tRPC
- **Storage Buckets**: Separate buckets for profile pictures and task evidence
- **RLS Security**: Row-level security policies ensure users can only access their own files
- **Progress Tracking**: Upload progress callbacks for better UX

## Storage Buckets

### Profile Pictures
- **Bucket**: `profile-pictures`
- **Max Size**: 5MB
- **Allowed Types**: JPEG, PNG, WebP
- **Access**: Public read, authenticated write

### Task Evidence
- **Bucket**: `task-evidence`
- **Max Size**: 5MB
- **Allowed Types**: JPEG, PNG, WebP
- **Access**: Public read, authenticated write

## Usage

### Using the FileUpload Component

```tsx
import { FileUpload } from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/storage/upload';

function MyComponent() {
  const userId = 'user-123';

  const handleUploadComplete = (url: string) => {
    console.log('File uploaded:', url);
    // Update your state or database with the URL
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
  };

  return (
    <FileUpload
      bucket={STORAGE_BUCKETS.TASK_EVIDENCE}
      userId={userId}
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      maxFiles={3}
    />
  );
}
```

### Manual File Upload (Client-side)

```tsx
import { uploadFile, STORAGE_BUCKETS } from '@/lib/storage/upload';

async function handleFileUpload(file: File, userId: string) {
  try {
    const url = await uploadFile(
      file,
      STORAGE_BUCKETS.TASK_EVIDENCE,
      userId,
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    );
    
    console.log('Uploaded file URL:', url);
    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Validating Files Before Upload

```tsx
import { validateFile } from '@/lib/storage/upload';

async function checkFile(file: File) {
  try {
    await validateFile(file);
    console.log('File is valid');
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}
```

### Using the Upload Router (tRPC)

```tsx
import { trpc } from '@/lib/trpc/client';

function MyComponent() {
  const validateMutation = trpc.upload.validateUpload.useMutation();
  const deleteMutation = trpc.upload.deleteFile.useMutation();

  const handleValidate = async (file: File) => {
    const result = await validateMutation.mutateAsync({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type as any,
      bucket: 'task-evidence',
    });
    
    console.log('Validation result:', result);
  };

  const handleDelete = async (url: string) => {
    await deleteMutation.mutateAsync({
      url,
      bucket: 'task-evidence',
    });
  };
}
```

## Validation Rules

### File Type
- Only image files are allowed
- Supported formats: JPEG, PNG, WebP

### File Size
- Maximum: 5MB
- Files exceeding this limit will be rejected

### Image Dimensions
- Maximum: 4096x4096 pixels
- Images larger than this will be rejected

## Error Handling

All validation errors throw `StorageValidationError` with descriptive messages:

```tsx
import { StorageValidationError } from '@/lib/storage/upload';

try {
  await validateFile(file);
} catch (error) {
  if (error instanceof StorageValidationError) {
    // Handle validation error
    console.error('Validation failed:', error.message);
  } else {
    // Handle other errors
    console.error('Unknown error:', error);
  }
}
```

## Security

### Row-Level Security (RLS)
- Users can only upload/delete files in their own folders
- File paths are structured as: `{bucket}/{userId}/{timestamp}-{random}.{ext}`
- RLS policies enforce folder ownership

### Validation Layers
1. **Client-side**: Immediate feedback before upload
2. **Server-side**: tRPC validation procedure
3. **Supabase**: Bucket-level constraints (size, MIME types)
4. **RLS Policies**: Database-level access control

## Database Integration

### Tasks
Add attachments to tasks:

```tsx
const task = await trpc.task.create.mutate({
  title: 'My Task',
  attachments: ['https://...image1.jpg', 'https://...image2.jpg'],
});
```

### Evidence
Add image evidence:

```tsx
const evidence = await trpc.evidence.create.mutate({
  taskId: 'task-123',
  type: 'photo',
  content: 'https://...evidence.jpg', // URL from Supabase Storage
});
```

### Profile Pictures
Update profile picture:

```tsx
const profile = await trpc.profile.update.mutate({
  profilePicUrl: 'https://...profile.jpg',
});
```

## Utilities

### Format File Size
```tsx
import { formatFileSize } from '@/lib/storage/upload';

console.log(formatFileSize(1024)); // "1 KB"
console.log(formatFileSize(5242880)); // "5 MB"
```

## Testing

Tests are located in:
- `src/__tests__/integration/api/file-upload.test.ts` - Validation tests
- `src/__tests__/integration/api/upload-router.test.ts` - Router tests

Run tests:
```bash
npm test -- src/__tests__/integration/api/file-upload.test.ts
npm test -- src/__tests__/integration/api/upload-router.test.ts
```

## Migrations

Storage buckets and RLS policies are created via migration:
- `supabase/migrations/20250122_add_storage_buckets.sql`

Task attachments field is added via:
- `supabase/migrations/20250122_add_attachments_to_tasks.sql`

