/*
  # Create Business Assets Storage Bucket
  
  1. New Storage Bucket
    - `business-assets` - For storing various business assets including event images
  
  2. Security Policies
    - Enable public read access so event images are publicly viewable
    - Allow authenticated users (admin) to upload, update, and delete assets
    - Images are organized by business_id/category/filename
  
  3. Purpose
    - This bucket stores event images and other business-related media
    - Fixes the missing bucket error when uploading event images from admin portal
*/

-- Create storage bucket for business assets (events, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public read access to view business assets
CREATE POLICY "Public Access to view business assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-assets');

-- Policy: Authenticated users can upload business assets
CREATE POLICY "Authenticated users can upload business assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-assets');

-- Policy: Authenticated users can update business assets
CREATE POLICY "Authenticated users can update business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-assets')
WITH CHECK (bucket_id = 'business-assets');

-- Policy: Authenticated users can delete business assets
CREATE POLICY "Authenticated users can delete business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-assets');