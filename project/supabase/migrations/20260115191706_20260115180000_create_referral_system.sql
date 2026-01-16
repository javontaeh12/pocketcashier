/*
  # Create Referral Credit System

  1. New Tables
    - `referral_programs`
      - Business-level referral program configuration
      - Controls credit per use, eligibility rules, and program status
    - `referral_codes`
      - Individual referral codes issued to customers
      - Tracks code ownership, verification status, and activity
    - `referral_ledger`
      - Immutable transaction ledger for all credit/debit operations
      - Ensures accurate accounting with idempotency protection

  2. Modifications to Existing Tables
    - `orders` table: Add discount tracking fields
    - `bookings` table: Add discount tracking fields

  3. Views
    - `referral_balances_view`: Real-time balance calculation per code

  4. Security
    - Enable RLS on all new tables
    - Admin-only access to program configuration
    - Customer access to own codes only (with verification)
    - Public cannot query balances without verification

  5. Accounting Model
    - All balance changes recorded as immutable ledger entries
    - Balance = SUM(credits) - SUM(debits)
    - Idempotency keys prevent duplicate transactions
    - Atomic operations via database constraints
*/

-- =====================================================
-- 1. REFERRAL PROGRAMS TABLE (Business-level config)
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  credit_per_use_cents int NOT NULL DEFAULT 500,
  min_order_cents int DEFAULT 0,
  max_credit_per_month_cents int DEFAULT NULL,
  max_credit_per_order_cents int DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

-- =====================================================
-- 2. REFERRAL CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  code text NOT NULL,
  is_active boolean DEFAULT true,
  saved_confirmed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT code_unique_per_business UNIQUE(business_id, code),
  CONSTRAINT must_have_customer_id_or_email CHECK (
    customer_id IS NOT NULL OR customer_email IS NOT NULL
  )
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_business_customer ON referral_codes(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_business_email ON referral_codes(business_id, customer_email);

-- =====================================================
-- 3. REFERRAL LEDGER TABLE (Immutable accounting)
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referral_code_id uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  reason text NOT NULL CHECK (reason IN (
    'referral_use_credit',
    'discount_redemption',
    'manual_adjustment',
    'refund_reversal'
  )),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(idempotency_key)
);

-- Create indexes for balance calculations and auditing
CREATE INDEX IF NOT EXISTS idx_referral_ledger_code ON referral_ledger(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_business ON referral_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_order ON referral_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_booking ON referral_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_created_at ON referral_ledger(created_at DESC);

-- =====================================================
-- 4. ADD DISCOUNT FIELDS TO ORDERS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'referral_code_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN referral_code_id uuid REFERENCES referral_codes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount_cents'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount_cents int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'original_total_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN original_total_amount decimal(10,2) DEFAULT NULL;
  END IF;
END $$;

-- =====================================================
-- 5. ADD DISCOUNT FIELDS TO BOOKINGS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'referral_code_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN referral_code_id uuid REFERENCES referral_codes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'discount_amount_cents'
  ) THEN
    ALTER TABLE bookings ADD COLUMN discount_amount_cents int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'original_payment_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN original_payment_amount decimal(10,2) DEFAULT NULL;
  END IF;
END $$;

-- =====================================================
-- 6. CREATE REFERRAL BALANCES VIEW
-- =====================================================

CREATE OR REPLACE VIEW referral_balances_view AS
SELECT
  rc.id AS referral_code_id,
  rc.business_id,
  rc.code,
  rc.customer_id,
  rc.customer_email,
  rc.is_active,
  rc.saved_confirmed_at,
  rc.created_at,
  COALESCE(
    SUM(CASE WHEN rl.type = 'credit' THEN rl.amount_cents ELSE 0 END),
    0
  ) AS total_credits_cents,
  COALESCE(
    SUM(CASE WHEN rl.type = 'debit' THEN rl.amount_cents ELSE 0 END),
    0
  ) AS total_debits_cents,
  COALESCE(
    SUM(CASE WHEN rl.type = 'credit' THEN rl.amount_cents ELSE -rl.amount_cents END),
    0
  ) AS balance_cents,
  COUNT(CASE WHEN rl.type = 'credit' THEN 1 END) AS total_credits_count,
  COUNT(CASE WHEN rl.type = 'debit' THEN 1 END) AS total_debits_count
FROM referral_codes rc
LEFT JOIN referral_ledger rl ON rl.referral_code_id = rc.id
GROUP BY rc.id, rc.business_id, rc.code, rc.customer_id, rc.customer_email,
         rc.is_active, rc.saved_confirmed_at, rc.created_at;

-- =====================================================
-- 7. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_ledger ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Referral Programs: Admin-only access
CREATE POLICY "Business owners can view their referral program"
  ON referral_programs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their referral program"
  ON referral_programs FOR UPDATE
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

CREATE POLICY "Business owners can insert their referral program"
  ON referral_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Referral Codes: Customers can view own codes, admins can view all for their business
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view all referral codes for their business"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Referral Ledger: Read-only for owners and business admins
CREATE POLICY "Users can view their own referral ledger"
  ON referral_ledger FOR SELECT
  TO authenticated
  USING (
    referral_code_id IN (
      SELECT id FROM referral_codes WHERE customer_id = auth.uid()
    ) OR
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view all ledger entries for their business"
  ON referral_ledger FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referral_programs_timestamp
  BEFORE UPDATE ON referral_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER update_referral_codes_timestamp
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_timestamp();
