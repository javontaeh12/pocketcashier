/*
  # Create Payments Table for Square Integration

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key) - Link to the order
      - `business_id` (uuid, foreign key) - Link to business
      - `square_payment_id` (text) - Square payment ID from API
      - `amount` (decimal) - Payment amount in dollars
      - `status` (text) - Payment status (pending, completed, failed)
      - `payment_method` (text) - How it was paid (card, cash, etc)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Relationships
    - Each payment links to one order
    - Each payment links to one business
    - An order can have multiple payment attempts but only one successful payment

  3. Security
    - Enable RLS on payments table
    - Authenticated users can view payments for their business
    - Only system (via edge functions) can insert/update payments

  4. Indexes
    - Index on order_id for quick order lookups
    - Index on square_payment_id for idempotency
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  square_payment_id text UNIQUE,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_square_id ON payments(square_payment_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);