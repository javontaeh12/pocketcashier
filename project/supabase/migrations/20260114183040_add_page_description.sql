/*
  # Add page description for social media sharing

  1. New Columns
    - `page_description` (text) on `businesses` table
      - Stores the page description shown when business URL is shared on social media
      - Used for Open Graph and Twitter meta tags
  
  2. Details
    - Added to businesses table with default empty string
    - Allows admins to customize the preview text for social sharing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'page_description'
  ) THEN
    ALTER TABLE businesses ADD COLUMN page_description text DEFAULT '';
  END IF;
END $$;
