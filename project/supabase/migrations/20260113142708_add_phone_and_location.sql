/*
  # Add phone and location to businesses table
  
  1. New Columns
    - `phone` (text) - Business phone number
    - `location` (text) - Business location/address
  
  2. Notes
    - Both fields are optional (can be null)
    - Phone number can be displayed as a clickable tel: link on the public menu
    - Location will be displayed as business information below the header
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'location'
  ) THEN
    ALTER TABLE businesses ADD COLUMN location TEXT;
  END IF;
END $$;
