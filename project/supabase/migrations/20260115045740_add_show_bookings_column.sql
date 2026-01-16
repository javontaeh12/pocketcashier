/*
  # Add show_bookings column to businesses table

  1. Changes
    - Add `show_bookings` boolean column to businesses table
    - Default to false
    - Allows businesses to enable booking-only mode (bypassing cart/checkout)
  
  2. Purpose
    - Enable businesses like barbers to use direct booking flow
    - When enabled, services show "Book Now" instead of "Add to Cart"
    - Cart and checkout are hidden when bookings are enabled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_bookings'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_bookings boolean DEFAULT false;
  END IF;
END $$;
