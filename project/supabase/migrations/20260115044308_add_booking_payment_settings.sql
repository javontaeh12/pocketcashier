/*
  # Add Booking Payment Settings

  1. Changes to businesses table
    - `booking_payment_enabled` (boolean) - Whether booking payments are enabled
    - `booking_payment_type` (text) - 'deposit' or 'full'
    - `booking_deposit_percentage` (numeric) - Percentage for deposits (0-100)
  
  2. Changes to bookings table
    - `payment_amount` (numeric) - Amount charged for booking
    - `payment_status` (text) - 'pending', 'completed', 'failed'
    - `payment_id` (text) - Square payment ID
    - `menu_item_id` (uuid) - Link to selected service
  
  3. Security
    - All fields use existing RLS policies
*/

-- Add booking payment settings to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'booking_payment_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN booking_payment_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'booking_payment_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN booking_payment_type text DEFAULT 'full' CHECK (booking_payment_type IN ('deposit', 'full'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'booking_deposit_percentage'
  ) THEN
    ALTER TABLE businesses ADD COLUMN booking_deposit_percentage numeric(5,2) DEFAULT 50.00 CHECK (booking_deposit_percentage >= 0 AND booking_deposit_percentage <= 100);
  END IF;
END $$;

-- Add payment fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_amount numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'menu_item_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL;
  END IF;
END $$;