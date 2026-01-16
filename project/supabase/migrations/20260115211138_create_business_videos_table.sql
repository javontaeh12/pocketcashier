/*
  # Create Business Videos Gallery

  1. New Tables
    - `business_videos`
      - `id` uuid primary key
      - `business_id` uuid (references businesses)
      - `storage_path` text (path in Supabase Storage)
      - `title` text (optional video title)
      - `position` integer (for ordering videos, 1-4)
      - `created_at` and `updated_at` timestamps

  2. Constraints
    - Max 4 videos per business enforced via trigger
    - position uniqueness per business
    - Foreign key on business_id with cascade delete

  3. Security
    - Enable RLS on business_videos
    - Public can SELECT videos for active businesses
    - Business admin (via user_id) can INSERT/UPDATE/DELETE their own videos

  4. Indexes
    - Index on business_id for fast lookups
    - Index on position for ordering
*/

-- Create business_videos table
CREATE TABLE IF NOT EXISTS business_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title text,
  position int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, position)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_business_videos_business_id ON business_videos(business_id);
CREATE INDEX IF NOT EXISTS idx_business_videos_position ON business_videos(business_id, position);

-- Enable RLS
ALTER TABLE business_videos ENABLE ROW LEVEL SECURITY;

-- Trigger to enforce max 4 videos per business
CREATE OR REPLACE FUNCTION check_video_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM business_videos WHERE business_id = NEW.business_id) >= 4 THEN
    RAISE EXCEPTION 'Maximum 4 videos per business';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_count_trigger
BEFORE INSERT ON business_videos
FOR EACH ROW
EXECUTE FUNCTION check_video_limit();

-- RLS Policies

-- Public can view videos for active businesses
CREATE POLICY "Public view active business videos"
  ON business_videos FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.is_active = true
    )
  );

-- Authenticated admins can view their own business videos
CREATE POLICY "Admins view own business videos"
  ON business_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.user_id = auth.uid()
    )
  );

-- Admins can insert videos for their business
CREATE POLICY "Admins insert own business videos"
  ON business_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.user_id = auth.uid()
    )
  );

-- Admins can update their own business videos
CREATE POLICY "Admins update own business videos"
  ON business_videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.user_id = auth.uid()
    )
  );

-- Admins can delete their own business videos
CREATE POLICY "Admins delete own business videos"
  ON business_videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_videos.business_id
        AND businesses.user_id = auth.uid()
    )
  );
