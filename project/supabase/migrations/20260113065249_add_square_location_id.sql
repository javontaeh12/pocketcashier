/*
  # Add Square Location ID

  This migration:
  1. Adds square_location_id column to settings table
  2. This is required for initializing Square payment forms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_location_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_location_id text;
  END IF;
END $$;