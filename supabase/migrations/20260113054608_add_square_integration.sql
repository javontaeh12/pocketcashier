/*
  # Add Square Integration

  1. New Columns in settings table
    - `square_access_token` (text, encrypted) - OAuth access token from Square
    - `square_refresh_token` (text, encrypted) - OAuth refresh token from Square
    - `square_merchant_id` (text) - Square merchant/account ID
    - `square_enabled` (boolean) - Whether Square integration is enabled
    - `square_connected_at` (timestamptz) - When Square account was connected
  
  2. Purpose
    - Store secure Square API credentials per business
    - Allow business owners to connect their Square account via OAuth
    - Enable payment processing integration
  
  3. Security
    - RLS policies already enabled on settings table
    - Tokens should only be readable/writable by authenticated users (admins)
    - In production, these should be encrypted at rest using Supabase's encryption
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_access_token'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_access_token text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_refresh_token'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_refresh_token text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_merchant_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_merchant_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_enabled'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'square_connected_at'
  ) THEN
    ALTER TABLE settings ADD COLUMN square_connected_at timestamptz;
  END IF;
END $$;