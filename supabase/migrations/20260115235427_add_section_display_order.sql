/*
  # Add Section Display Order

  1. New Columns
    - `section_display_order` (jsonb) - Array of section names in desired display order
  2. Purpose
    - Allows businesses to customize the order sections appear on their website
    - Stores an ordered array of section identifiers
  3. Default Order
    - All sections initialized with a sensible default order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'section_display_order'
  ) THEN
    ALTER TABLE businesses ADD COLUMN section_display_order jsonb DEFAULT '["hero_message", "business_info", "menu", "bookings", "shop", "videos", "reviews"]'::jsonb;
  END IF;
END $$;