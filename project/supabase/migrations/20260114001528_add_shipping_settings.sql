/*
  # Add Shipping Settings to Businesses

  1. New Columns
    - `shipping_enabled` (boolean, default false) - Enable/disable shipping functionality
    - `shipping_address` (text) - Business address for shipping calculations
    - `shipping_city` (text) - City
    - `shipping_state` (text) - State/Province
    - `shipping_zip` (text) - ZIP/Postal code
    - `shipping_country` (text, default 'US') - Country
    - `shipping_price_per_mile` (numeric, default 0) - Cost per mile for shipping
    - `shipping_latitude` (numeric) - Cached latitude for distance calculations
    - `shipping_longitude` (numeric) - Cached longitude for distance calculations

  2. Purpose
    - Allow businesses to configure shipping options
    - Store address for distance-based shipping calculations
    - Set price per mile for shipping
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_city'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_state'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_zip'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_zip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_country'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_country text DEFAULT 'US';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_price_per_mile'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_price_per_mile numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_latitude'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'shipping_longitude'
  ) THEN
    ALTER TABLE businesses ADD COLUMN shipping_longitude numeric;
  END IF;
END $$;
