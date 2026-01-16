/*
  # Add orders enabled toggle to businesses
  
  1. Changes
    - Add `orders_enabled` column to `businesses` table
      - Defaults to true (orders enabled by default)
      - Allows businesses to temporarily stop accepting orders
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'orders_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN orders_enabled boolean DEFAULT true;
  END IF;
END $$;