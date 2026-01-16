/*
  # Create Storage Buckets

  1. Storage Buckets
    - `business-logos` - For storing business logos
    - `menu-images` - For storing menu item images

  2. Security
    - Enable public access for reading images
    - Allow authenticated users to upload images
*/

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for business-logos bucket
CREATE POLICY "Public Access to view business logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can upload business logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can update business logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-logos')
WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can delete business logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-logos');

-- Policies for menu-images bucket
CREATE POLICY "Public Access to view menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');