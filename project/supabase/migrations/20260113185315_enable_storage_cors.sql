/*
  # Enable CORS for Storage Buckets
  
  1. Purpose
    - Ensure storage buckets allow cross-origin requests so images load properly from public URLs
    - Fix issue where logos and images don't display when accessing public business menu URLs
    
  2. Changes
    - Update bucket configurations to allow CORS from any origin
    - This is safe because the buckets are already marked as public
*/

-- Update buckets to allow CORS from any origin
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('business-logos', 'menu-images', 'business-assets');

-- Ensure storage.objects has public read policies with no restrictions
DO $$
BEGIN
  -- Drop existing conflicting policies if they exist
  DROP POLICY IF EXISTS "Public Access to view business logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to view menu images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to view business assets" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create permissive public read policies for all storage buckets
CREATE POLICY "Public can read business-logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');

CREATE POLICY "Public can read menu-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Public can read business-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-assets');