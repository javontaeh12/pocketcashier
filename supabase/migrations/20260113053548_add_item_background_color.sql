/*
  # Add item background color to businesses

  1. Changes
    - Add `item_background_color` column to `businesses` table
    - Default color is white (#ffffff)
    - Allows customization of the background color for menu item cards
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'item_background_color'
  ) THEN
    ALTER TABLE businesses ADD COLUMN item_background_color text DEFAULT '#ffffff';
  END IF;
END $$;