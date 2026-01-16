/*
  # Add About Us fields to businesses table

  1. New Columns
    - `about_us_text` (text) - Main about us content
    - `about_us_image_url` (text) - URL to about us image from storage
  
  2. Changes
    - Add two new fields to store business about information
    - Fields are nullable to maintain backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'about_us_text'
  ) THEN
    ALTER TABLE businesses ADD COLUMN about_us_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'about_us_image_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN about_us_image_url text;
  END IF;
END $$;