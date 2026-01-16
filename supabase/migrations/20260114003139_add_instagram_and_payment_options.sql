/*
  # Add Instagram and Payment Options

  1. New Columns
    - `instagram_page_url` (text, nullable) - Instagram page link for business information section
    - `payment_methods` (jsonb, default: {}) - Payment method availability and configuration

  2. Details
    - Instagram page URL follows same pattern as Facebook page URL
    - Payment methods stored as JSON object with boolean flags for: apple_pay, square_pay, zelle
    - Example: {"apple_pay": true, "square_pay": true, "zelle": true}

  3. Migration Process
    - Add instagram_page_url column to businesses table
    - Add payment_methods column to settings table with default empty object
    - Ensures backward compatibility with existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'instagram_page_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN instagram_page_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE settings ADD COLUMN payment_methods jsonb DEFAULT '{"apple_pay": false, "square_pay": false, "zelle": false}'::jsonb;
  END IF;
END $$;