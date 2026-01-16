/*
  # Add Section Visibility Toggles to Businesses

  1. New Columns
    - `show_menu` (boolean) - Toggle menu/orders section visibility
    - `show_reviews` (boolean) - Toggle customer reviews section visibility
    - `show_events` (boolean) - Toggle upcoming events section visibility
    - `show_business_info` (boolean) - Toggle business info/phone/location display
    - `show_hero_message` (boolean) - Toggle hero message banner visibility

  2. Modifications
    - Added 5 new boolean columns to businesses table with default values of true
    - Existing businesses will have all sections visible by default
    - Admin can now granularly control which sections appear on their public page

  3. Notes
    - All new columns default to true (visible) for backward compatibility
    - These work independently from data availability (e.g., show_events=true displays events section even if empty)
    - Section visibility is managed in the admin portal Settings tab
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_menu'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_menu boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_reviews'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_reviews boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_events'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_events boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_business_info'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_business_info boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'show_hero_message'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_hero_message boolean DEFAULT true;
  END IF;
END $$;
