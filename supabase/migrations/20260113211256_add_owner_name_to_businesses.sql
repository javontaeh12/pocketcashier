/*
  # Add owner name to businesses table

  1. Changes
    - Add `owner_name` column to `businesses` table
      - `owner_name` (text) - Name of the business owner/admin
      - Required field for admin identification
  
  2. Notes
    - This field will be used to display the owner's name in the developer portal
    - Existing businesses will have null values initially, to be filled by admins in settings
*/

-- Add owner_name column to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN owner_name text;
  END IF;
END $$;
