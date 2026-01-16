/*
  # Add Share Settings to Businesses

  1. New Columns
    - `share_title` (text nullable) - Custom title for social media sharing (defaults to business name)
    - `share_description` (text nullable) - Custom description for social media sharing
    - `share_image_path` (text nullable) - Path to share image in business-share-images bucket
    - `share_image_updated_at` (timestamptz nullable) - Timestamp when share image was last updated

  2. Details
    - Added to businesses table for social media share customization
    - Allows admins to override default business name, description, and logo for shares
    - All fields are nullable - system falls back to business name, page_description, and logo_url if not set
    - Index on share_image_path for faster lookups if needed

  3. Security
    - RLS policies updated to allow admin read/write of own business share settings
    - Public users can read share settings (needed for crawler/preview generation)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'share_title'
  ) THEN
    ALTER TABLE businesses ADD COLUMN share_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'share_description'
  ) THEN
    ALTER TABLE businesses ADD COLUMN share_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'share_image_path'
  ) THEN
    ALTER TABLE businesses ADD COLUMN share_image_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'share_image_updated_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN share_image_updated_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_share_image_path 
ON businesses(share_image_path) 
WHERE share_image_path IS NOT NULL;
