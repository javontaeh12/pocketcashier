/*
  # Add Color Theme Fields to Businesses Table

  1. Changes
    - Add `primary_color` column to store the main brand color (default: blue)
    - Add `secondary_color` column to store accent color (default: green)
    - Add `text_color` column to store text color on primary background (default: white)
  
  2. Purpose
    - Enable dynamic theming based on business logo
    - Allow automatic color extraction from uploaded logos
    - Provide customizable brand colors throughout the application
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN primary_color text DEFAULT '#2563eb';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'secondary_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN secondary_color text DEFAULT '#16a34a';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'text_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN text_color text DEFAULT '#ffffff';
  END IF;
END $$;