/*
  # Add Payment Status to Orders

  1. Changes to orders table
    - `payment_status` (text) - Whether payment is required/completed (pending, completed, failed)
    - `payment_required` (boolean) - Whether Square payment is required for this order
    
  2. Purpose
    - Track payment completion status separately from order fulfillment status
    - Allow orders to require Square payment when integration is enabled
    - Prevent order completion until payment is processed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_required'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_required boolean DEFAULT false;
  END IF;
END $$;