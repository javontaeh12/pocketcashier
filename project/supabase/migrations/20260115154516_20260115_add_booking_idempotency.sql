/*
  # Add Idempotency and Audit Logging to Bookings

  1. New Columns
    - `bookings.idempotency_key` (text, UNIQUE) - Client-generated key for duplicate prevention
    - `bookings.trace_id` (text) - Server-generated for request tracing
    - `bookings.calendar_sync_status` (text) - Track calendar integration state
    - `bookings.email_sync_status` (jsonb) - Track which emails were sent
    - `bookings.last_sync_error` (text) - Store last error for debugging

  2. New Tables
    - `booking_events` - Audit trail for all booking state changes
    - `booking_sync_log` - Detailed log of calendar/email operations

  3. Indexes
    - UNIQUE (business_id, idempotency_key) for idempotency detection
    - idx_bookings_trace_id for distributed tracing

  4. Security
    - Booking events are read-only (audit log)
    - Sync log accessible only by business owner
*/

-- Add idempotency and tracing columns to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE bookings ADD COLUMN idempotency_key text;
    CREATE UNIQUE INDEX idx_bookings_idempotency ON bookings(business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'trace_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN trace_id text DEFAULT gen_random_uuid()::text;
    CREATE INDEX idx_bookings_trace_id ON bookings(trace_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'calendar_sync_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN calendar_sync_status text DEFAULT 'pending' CHECK (calendar_sync_status IN ('pending', 'synced', 'failed', 'skipped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'email_sync_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN email_sync_status jsonb DEFAULT '{"customer": "pending", "admin": "pending"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'last_sync_error'
  ) THEN
    ALTER TABLE bookings ADD COLUMN last_sync_error text;
  END IF;
END $$;

-- Create booking_events table for audit trail
CREATE TABLE IF NOT EXISTS booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'confirmed', 'cancelled', 'completed', 'calendar_synced', 'email_sent', 'error')),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_business_id ON booking_events(business_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at);

-- Enable RLS on booking_events
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view booking events"
  ON booking_events FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Create booking_sync_log for detailed operation tracking
CREATE TABLE IF NOT EXISTS booking_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('calendar_create', 'calendar_delete', 'email_customer', 'email_admin')),
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  trace_id text,
  error_message text,
  response_data jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_booking_sync_log_booking_id ON booking_sync_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_sync_log_trace_id ON booking_sync_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_booking_sync_log_operation ON booking_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_booking_sync_log_status ON booking_sync_log(status);

-- Enable RLS on booking_sync_log
ALTER TABLE booking_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view sync logs"
  ON booking_sync_log FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
