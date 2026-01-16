/*
  # Add display_name toggle to businesses table
  
  1. New Columns
    - `display_name` (boolean, default true) - Controls whether business name displays on website
  
  2. Notes
    - Default is true to maintain backward compatibility (business names show by default)
    - Admins can toggle this to hide their business name from the public menu
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN display_name BOOLEAN DEFAULT true;
  END IF;
END $$;
