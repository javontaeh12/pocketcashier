/*
  # Add Minimum Order Items to Businesses

  1. New Column
    - `minimum_order_items` (integer, default 0) on businesses table
    - Allows businesses to set a minimum number of items required per order

  2. Purpose
    - Enforce minimum order quantity before checkout
    - Default is 0 (no minimum)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'minimum_order_items'
  ) THEN
    ALTER TABLE businesses ADD COLUMN minimum_order_items integer DEFAULT 0;
  END IF;
END $$;
