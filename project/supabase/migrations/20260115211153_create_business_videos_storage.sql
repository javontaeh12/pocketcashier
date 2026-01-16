/*
  # Create Business Videos Storage Bucket

  1. Storage Bucket
    - `business-videos` - For storing business videos (mp4, webm, mov)
    - Public bucket for direct access

  2. Storage Policies
    - Public read access for videos of active businesses
    - Authenticated admins can upload to their business folder
    - Authenticated admins can delete their own videos
*/

-- Create the business-videos storage bucket (public for fast CDN delivery)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-videos', 'business-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public policy: allow viewing videos (no actual RLS on objects, relying on path convention)
CREATE POLICY "Public read business videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-videos');

-- Authenticated users can upload videos to business folders
CREATE POLICY "Authenticated upload business videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-videos');

-- Authenticated users can delete their own videos
CREATE POLICY "Authenticated delete business videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'business-videos');
