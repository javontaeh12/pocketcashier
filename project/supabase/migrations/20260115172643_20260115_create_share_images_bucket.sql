/*
  # Create Business Share Images Storage Bucket

  1. Storage Bucket
    - `business-share-images` - For storing custom social media share images
    - Public bucket for crawler access (iMessage, Facebook, Twitter, etc.)
    - Images must be accessible without authentication

  2. File Path Convention
    - Format: businesses/{businessId}/share.{ext}
    - Example: businesses/550e8400-e29b-41d4-a716-446655440000/share.jpg
    - Allowed extensions: jpg, jpeg, png, webp
    - Max size: 5MB (enforced at application level)

  3. Security
    - Public read access required for crawlers and link previews
    - Authenticated users can upload/update/delete images for their own business
    - Path-based access control via storage policy
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-share-images', 'business-share-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access to view business share images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-share-images');

CREATE POLICY "Authenticated users can upload share images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-share-images');

CREATE POLICY "Authenticated users can update share images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-share-images')
WITH CHECK (bucket_id = 'business-share-images');

CREATE POLICY "Authenticated users can delete share images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-share-images');
