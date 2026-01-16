/*
  # Add Hero Message to Businesses

  1. Changes
    - Add `hero_message` column to `businesses` table
      - Text field to store promotional/announcement messages
      - Used for free shipping notices, order deadlines, etc.
      - Displayed as a banner between business info and menu
    
  2. Notes
    - Column is optional (nullable) so existing businesses aren't affected
    - Default is null (no message displayed)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'hero_message'
  ) THEN
    ALTER TABLE businesses ADD COLUMN hero_message text;
  END IF;
END $$;