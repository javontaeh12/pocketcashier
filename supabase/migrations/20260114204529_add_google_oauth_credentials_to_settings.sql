/*
  # Add Google OAuth Credentials to Settings

  1. Modified Tables
    - `settings` table
      - Added `google_client_id` (text, nullable) - Google OAuth Client ID for authentication
      - Added `google_client_secret` (text, nullable) - Google OAuth Client Secret for authentication

  2. Changes
    - Admins can now store their Google OAuth credentials securely
    - These credentials are used for setting up Google Calendar integration and other Google services
    - Stored per admin account via the settings table linked to their business
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'google_client_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN google_client_id text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'google_client_secret'
  ) THEN
    ALTER TABLE settings ADD COLUMN google_client_secret text DEFAULT NULL;
  END IF;
END $$;
