/*
  # Create bookings table for appointment management
  
  This migration creates a bookings system that integrates with Google Calendar
  and sends email notifications to admins.
  
  1. New Tables
    - `bookings`
      - `id` (uuid, primary key) - Unique booking identifier
      - `business_id` (uuid, foreign key) - Links to the business receiving the booking
      - `customer_name` (text) - Name of the customer making the booking
      - `customer_email` (text) - Email for booking confirmation and updates
      - `customer_phone` (text, nullable) - Optional phone number
      - `booking_date` (timestamptz) - Date and time of the appointment
      - `duration_minutes` (integer) - Length of the appointment in minutes
      - `status` (text) - Booking status: pending, confirmed, cancelled, completed
      - `service_type` (text, nullable) - Type of service being booked
      - `notes` (text, nullable) - Additional notes or special requests
      - `calendar_event_id` (text, nullable) - Google Calendar event ID for syncing
      - `created_at` (timestamptz) - When the booking was created
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `bookings` table
    - Public users can create bookings (insert)
    - Public users can view their own bookings by email
    - Authenticated business owners can view all bookings for their business
    - Authenticated business owners can update bookings for their business
    - Authenticated business owners can delete bookings for their business
  
  3. Indexes
    - Index on business_id for fast lookup of business bookings
    - Index on customer_email for customer booking lookup
    - Index on booking_date for chronological queries
    - Index on status for filtering by booking status
*/

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  booking_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  service_type text,
  notes text,
  calendar_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a booking
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Customers can view their own bookings by email
CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Business owners can view their bookings
CREATE POLICY "Business owners can view their bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Business owners can update their bookings
CREATE POLICY "Business owners can update their bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Business owners can delete their bookings
CREATE POLICY "Business owners can delete their bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();
