/*
  # Add show_bookings column to business_presets table

  1. Changes
    - Add `show_bookings` boolean column to business_presets table
    - Default to false
    - Update Barber preset to enable bookings by default
  
  2. Purpose
    - Enable preset templates to specify booking mode
    - Barber shops use booking mode instead of cart/checkout
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_presets' AND column_name = 'show_bookings'
  ) THEN
    ALTER TABLE business_presets ADD COLUMN show_bookings boolean DEFAULT false;
  END IF;
END $$;

-- Update barber preset to enable bookings
UPDATE business_presets 
SET show_bookings = true 
WHERE category = 'barber' OR name ILIKE '%barber%';
