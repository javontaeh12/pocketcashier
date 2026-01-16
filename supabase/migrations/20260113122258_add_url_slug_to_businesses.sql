/*
  # Add URL slug to businesses table

  1. Changes
    - Add `url_slug` column to businesses table
      - `url_slug` (text, unique, for custom business URLs like /my-coffee-shop)
      - Must be lowercase, alphanumeric with hyphens only
      - Default to null initially
    
  2. Notes
    - URL slug allows businesses to have custom shareable URLs
    - Must be unique across all businesses
    - Used for routing: domain.com/{url_slug}
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'url_slug'
  ) THEN
    ALTER TABLE businesses ADD COLUMN url_slug text UNIQUE;
    CREATE INDEX idx_businesses_url_slug ON businesses(url_slug);
  END IF;
END $$;