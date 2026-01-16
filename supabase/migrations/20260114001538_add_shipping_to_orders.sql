/*
  # Add Shipping Information to Orders

  1. New Columns
    - `shipping_address` (text) - Customer shipping address
    - `shipping_city` (text) - City
    - `shipping_state` (text) - State/Province
    - `shipping_zip` (text) - ZIP/Postal code
    - `shipping_country` (text) - Country
    - `shipping_cost` (numeric, default 0) - Calculated shipping cost
    - `shipping_distance` (numeric) - Distance in miles

  2. Purpose
    - Store customer shipping information for each order
    - Track calculated shipping costs and distances
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_city'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_state'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_zip'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_zip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_country'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_distance'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_distance numeric;
  END IF;
END $$;
