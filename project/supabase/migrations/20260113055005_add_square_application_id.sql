/*
  # Add Square Application ID to Settings

  1. New Column
    - `square_application_id` (text) - Square Application/Client ID for OAuth
  
  2. Purpose
    - Allow each business owner to configure their own Square Application ID
    - Enable multi-tenant Square integration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_application_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_application_id text;
  END IF;
END $$;