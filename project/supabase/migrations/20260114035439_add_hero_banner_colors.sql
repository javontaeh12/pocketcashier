/*
  # Add hero banner color customization

  1. New Columns
    - `hero_banner_bg_color` (text) - Background color for hero banner
    - `hero_banner_text_color` (text) - Text color for hero banner
  
  2. Changes
    - Added color fields to businesses table for hero banner customization
    - Defaults to dark gray background with white text

  3. Important Notes
    - Hero banner background defaults to #1f2937 (dark gray)
    - Hero banner text defaults to #ffffff (white)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'hero_banner_bg_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN hero_banner_bg_color text DEFAULT '#1f2937';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'hero_banner_text_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN hero_banner_text_color text DEFAULT '#ffffff';
  END IF;
END $$;