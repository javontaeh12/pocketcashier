/*
  # Add payment and menu item fields to bookings table
  
  This migration adds additional fields to the bookings table to support:
  - Menu item booking references
  - Payment tracking for paid bookings
  
  1. Changes
    - Add `menu_item_id` (uuid, nullable, foreign key) - Links to menu item if booking is for a specific service/item
    - Add `payment_amount` (numeric, nullable) - Amount paid for the booking
    - Add `payment_status` (text, default 'pending') - Status of payment: pending, paid, refunded
    - Add `payment_id` (text, nullable) - External payment processor transaction ID
  
  2. Important Notes
    - All fields are nullable to support both paid and free bookings
    - These fields integrate with Square payment processing
    - Menu item reference allows linking bookings to specific services
*/

-- Add menu item reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'menu_item_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add payment tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_amount numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_id text;
  END IF;
END $$;

-- Create index for menu item lookups
CREATE INDEX IF NOT EXISTS idx_bookings_menu_item_id ON bookings(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);