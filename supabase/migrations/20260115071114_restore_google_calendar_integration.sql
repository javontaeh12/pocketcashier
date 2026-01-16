/*
  # Restore Google Calendar Integration

  Restores the Google Calendar integration tables and columns needed for
  creating calendar events when customers book services.

  ## Changes
  - Create google_calendar_integrations table
  - Add calendar_event_id column to bookings table
  - Set up RLS policies for calendar integration
*/

CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  calendar_id text,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can manage own calendar integration"
  ON google_calendar_integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = google_calendar_integrations.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = google_calendar_integrations.business_id
      AND businesses.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN calendar_event_id text;
  END IF;
END $$;
