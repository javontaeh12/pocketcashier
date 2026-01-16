/*
  # Update background color column name

  1. Changes
    - Rename `item_background_color` to `page_background_color`
    - Default color is #f3f4f6 (gray-50)
    - Controls the background color of the main page behind items
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'item_background_color'
  ) THEN
    ALTER TABLE businesses RENAME COLUMN item_background_color TO page_background_color;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'page_background_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN page_background_color text DEFAULT '#f3f4f6';
  END IF;
END $$;