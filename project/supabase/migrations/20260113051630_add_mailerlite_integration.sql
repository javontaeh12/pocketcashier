/*
  # Add MailerLite Integration

  1. Modified Tables
    - `settings` table
      - Added `mailerlite_api_key` (text, nullable) - MailerLite API key for lead capture
      - Added `mailerlite_enabled` (boolean) - Whether MailerLite integration is enabled
      - Added `mailerlite_group_id` (text, nullable) - MailerLite group ID for capturing leads

  2. Changes
    - Admins can now store their MailerLite API credentials
    - Customers from orders can be automatically added to MailerLite subscribers
    - This enables email marketing and lead capture workflows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'mailerlite_api_key'
  ) THEN
    ALTER TABLE settings ADD COLUMN mailerlite_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'mailerlite_enabled'
  ) THEN
    ALTER TABLE settings ADD COLUMN mailerlite_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'mailerlite_group_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN mailerlite_group_id text;
  END IF;
END $$;