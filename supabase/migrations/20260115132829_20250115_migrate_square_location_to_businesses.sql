/*
  # Migrate Square Location ID from Settings to Businesses

  1. Migration Details
    - Moves square_location_id from settings table to businesses table
    - This aligns with the new developer-token model where location is business-specific
    - All token storage is removed from settings (tokens now in env secrets)
  
  2. Changes Made
    - Add square_location_id column to businesses table (if not exists)
    - Copy existing values from settings to businesses
    - Remove square_location_id from settings table
    - Remove deprecated token columns from settings table (they're now in env secrets)
  
  3. Backward Compatibility
    - No data loss; values are copied before removal
    - Settings table remains for other configuration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'square_location_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN square_location_id text;
    ALTER TABLE businesses ADD CONSTRAINT square_location_id_max_length CHECK (char_length(square_location_id) <= 45);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_location_id'
  ) THEN
    UPDATE businesses b
    SET square_location_id = s.square_location_id
    FROM settings s
    WHERE b.id = s.business_id AND s.square_location_id IS NOT NULL;
    
    ALTER TABLE settings DROP COLUMN square_location_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_access_token'
  ) THEN
    ALTER TABLE settings DROP COLUMN square_access_token;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_refresh_token'
  ) THEN
    ALTER TABLE settings DROP COLUMN square_refresh_token;
  END IF;
END $$;
