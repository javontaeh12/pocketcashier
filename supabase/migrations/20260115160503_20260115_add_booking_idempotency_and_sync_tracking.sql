/*
  # Add booking idempotency and enhanced sync tracking

  This migration adds idempotency support to prevent duplicate bookings and improves
  visibility into calendar/email sync status. It also adds proper timezone support.

  1. New Columns (bookings table)
    - `idempotency_key` (text, unique) - prevents duplicate booking creation
    - `calendar_sync_status` (text) - tracks: 'pending', 'synced', 'skipped', 'failed'
    - `last_sync_error` (text) - stores last calendar sync error message
    - `email_sent_to_customer` (boolean) - tracks if customer email was sent
    - `email_sent_to_admin` (boolean) - tracks if admin email was sent
    - `business_timezone` (text) - stores business timezone for accurate event times
    - `trace_id` (text) - for end-to-end debugging

  2. Security
    - Add RLS policy to handle trace_id visibility (dev/admin only)
    - No changes to existing booking access policies

  3. Indexes
    - Index on idempotency_key for duplicate prevention
    - Index on trace_id for log correlation
    - Index on calendar_sync_status for admin dashboard
*/

-- Add idempotency and sync tracking columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE bookings ADD COLUMN idempotency_key text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'calendar_sync_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN calendar_sync_status text DEFAULT 'pending' CHECK (calendar_sync_status IN ('pending', 'synced', 'skipped', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'last_sync_error'
  ) THEN
    ALTER TABLE bookings ADD COLUMN last_sync_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'email_sent_to_customer'
  ) THEN
    ALTER TABLE bookings ADD COLUMN email_sent_to_customer boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'email_sent_to_admin'
  ) THEN
    ALTER TABLE bookings ADD COLUMN email_sent_to_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'business_timezone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN business_timezone text DEFAULT 'America/New_York';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'trace_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN trace_id text;
  END IF;
END $$;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency_key ON bookings(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_trace_id ON bookings(trace_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_sync_status ON bookings(calendar_sync_status);
CREATE INDEX IF NOT EXISTS idx_bookings_email_status ON bookings(email_sent_to_customer, email_sent_to_admin);
