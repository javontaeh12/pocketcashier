/*
  # Add Image Support to Preset Menu Items

  1. Changes
    - Add image_url column to preset_menu_items table for storing menu item images
    - Allows presets to include complete menu item data with images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preset_menu_items' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE preset_menu_items ADD COLUMN image_url text;
  END IF;
END $$;
