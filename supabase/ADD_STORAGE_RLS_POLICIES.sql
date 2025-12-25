-- ============================================
-- Storage RLS Policies for File Uploads
-- ============================================
-- Run this in your Supabase SQL Editor
-- Important: Run each policy separately if needed

-- ============================================
-- Profile Pictures Bucket Policies
-- ============================================

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to profile pictures
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- ============================================
-- Task Evidence Bucket Policies
-- ============================================

-- Allow authenticated users to upload task evidence
CREATE POLICY "Users can upload task evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own task evidence
CREATE POLICY "Users can update their own task evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own task evidence
CREATE POLICY "Users can delete their own task evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to task evidence
CREATE POLICY "Public can view task evidence"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-evidence');

-- ============================================
-- ALTERNATIVE: If the above doesn't work, try these simpler policies
-- (Comment out the above and use these instead)
-- ============================================

-- Simple policy for profile-pictures (all authenticated users can manage their own files)
-- CREATE POLICY "profile-pictures-all"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (
--   bucket_id = 'profile-pictures' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- )
-- WITH CHECK (
--   bucket_id = 'profile-pictures' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Simple policy for task-evidence (all authenticated users can manage their own files)
-- CREATE POLICY "task-evidence-all"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (
--   bucket_id = 'task-evidence' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- )
-- WITH CHECK (
--   bucket_id = 'task-evidence' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Public read for both buckets
-- CREATE POLICY "public-read-all"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (
--   bucket_id IN ('profile-pictures', 'task-evidence')
-- );

