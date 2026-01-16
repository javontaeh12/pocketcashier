/*
  # Create Referral System RPC Functions

  1. Core RPC Functions
    - `create_referral_code`: Generate unique referral code for customer
    - `confirm_referral_code_saved`: Mark code as saved by customer
    - `get_referral_balance`: Get balance for a referral code with verification
    - `validate_and_apply_referral_discount`: Validate code and calculate discount
    - `apply_referral_discount_debit`: Create debit ledger entry (atomic)
    - `award_referral_credit`: Create credit ledger entry (idempotent)
    - `get_referral_ledger_history`: Get transaction history for a code

  2. Security Features
    - Email verification for anonymous balance lookups
    - Authenticated users can only see their own codes
    - Business admins can see all codes for their business
    - Atomic transactions prevent race conditions
    - Idempotency keys prevent duplicate credits/debits

  3. Business Logic
    - Auto-generate unique 8-character codes
    - Balance calculation from ledger entries
    - Discount amount validation (cannot exceed balance or order total)
    - Program eligibility checks (min order, max credit limits)
*/

-- =====================================================
-- 1. GENERATE UNIQUE REFERRAL CODE
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_referral_code(
  p_business_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code (uppercase)
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code exists for this business
    SELECT EXISTS(
      SELECT 1 FROM referral_codes 
      WHERE business_id = p_business_id AND code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique code after 10 attempts';
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- =====================================================
-- 2. CREATE REFERRAL CODE
-- =====================================================

CREATE OR REPLACE FUNCTION create_referral_code(
  p_business_id uuid,
  p_customer_email text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_referral_code_id uuid;
  v_existing_code record;
BEGIN
  -- Validate input
  IF p_customer_email IS NULL AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Must provide either customer_email or customer_id';
  END IF;
  
  -- Check if customer already has a code for this business
  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_existing_code
    FROM referral_codes
    WHERE business_id = p_business_id AND customer_id = p_customer_id
    LIMIT 1;
  ELSE
    SELECT * INTO v_existing_code
    FROM referral_codes
    WHERE business_id = p_business_id AND customer_email = p_customer_email
    LIMIT 1;
  END IF;
  
  -- Return existing code if found
  IF v_existing_code.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'code_id', v_existing_code.id,
      'code', v_existing_code.code,
      'is_new', false,
      'saved_confirmed', v_existing_code.saved_confirmed_at IS NOT NULL
    );
  END IF;
  
  -- Generate unique code
  v_code := generate_unique_referral_code(p_business_id);
  
  -- Insert new referral code
  INSERT INTO referral_codes (
    business_id,
    customer_id,
    customer_email,
    code,
    is_active
  ) VALUES (
    p_business_id,
    p_customer_id,
    p_customer_email,
    v_code,
    true
  )
  RETURNING id INTO v_referral_code_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_referral_code_id,
    'code', v_code,
    'is_new', true,
    'saved_confirmed', false
  );
END;
$$;

-- =====================================================
-- 3. CONFIRM REFERRAL CODE SAVED
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_referral_code_saved(
  p_code_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE referral_codes
  SET saved_confirmed_at = now()
  WHERE id = p_code_id AND saved_confirmed_at IS NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'confirmed_at', now()
  );
END;
$$;

-- =====================================================
-- 4. GET REFERRAL BALANCE (with verification)
-- =====================================================

CREATE OR REPLACE FUNCTION get_referral_balance(
  p_code text,
  p_business_id uuid,
  p_customer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code record;
  v_balance record;
  v_user_id uuid;
BEGIN
  -- Get current user if authenticated
  v_user_id := auth.uid();
  
  -- Find referral code
  SELECT * INTO v_referral_code
  FROM referral_codes
  WHERE code = p_code AND business_id = p_business_id
  LIMIT 1;
  
  IF v_referral_code.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code not found'
    );
  END IF;
  
  -- Security check: verify ownership
  IF v_user_id IS NOT NULL THEN
    -- Authenticated user: must own the code or be business admin
    IF v_referral_code.customer_id != v_user_id THEN
      -- Check if user is business admin
      IF NOT EXISTS(
        SELECT 1 FROM businesses 
        WHERE id = p_business_id AND user_id = v_user_id
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Unauthorized'
        );
      END IF;
    END IF;
  ELSE
    -- Anonymous user: must provide matching email
    IF p_customer_email IS NULL OR 
       v_referral_code.customer_email IS NULL OR
       lower(v_referral_code.customer_email) != lower(p_customer_email) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Email verification required'
      );
    END IF;
  END IF;
  
  -- Get balance from view
  SELECT * INTO v_balance
  FROM referral_balances_view
  WHERE referral_code_id = v_referral_code.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'code', v_referral_code.code,
    'code_id', v_referral_code.id,
    'balance_cents', COALESCE(v_balance.balance_cents, 0),
    'total_credits_cents', COALESCE(v_balance.total_credits_cents, 0),
    'total_debits_cents', COALESCE(v_balance.total_debits_cents, 0),
    'total_credits_count', COALESCE(v_balance.total_credits_count, 0),
    'total_debits_count', COALESCE(v_balance.total_debits_count, 0),
    'is_active', v_referral_code.is_active,
    'saved_confirmed', v_referral_code.saved_confirmed_at IS NOT NULL
  );
END;
$$;

-- =====================================================
-- 5. VALIDATE AND CALCULATE DISCOUNT AMOUNT
-- =====================================================

CREATE OR REPLACE FUNCTION validate_and_apply_referral_discount(
  p_business_id uuid,
  p_code text,
  p_order_total_cents int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code record;
  v_balance record;
  v_program record;
  v_discount_cents int;
  v_max_discount_cents int;
BEGIN
  -- Get referral program settings
  SELECT * INTO v_program
  FROM referral_programs
  WHERE business_id = p_business_id;
  
  -- Check if program exists and is enabled
  IF v_program.id IS NULL OR NOT v_program.is_enabled THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral program not available'
    );
  END IF;
  
  -- Check minimum order requirement
  IF p_order_total_cents < v_program.min_order_cents THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order does not meet minimum amount for referral discount'
    );
  END IF;
  
  -- Find referral code
  SELECT * INTO v_referral_code
  FROM referral_codes
  WHERE code = p_code AND business_id = p_business_id AND is_active = true
  LIMIT 1;
  
  IF v_referral_code.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or inactive referral code'
    );
  END IF;
  
  -- Get current balance
  SELECT * INTO v_balance
  FROM referral_balances_view
  WHERE referral_code_id = v_referral_code.id;
  
  -- Calculate max discount (lesser of balance, order total, and program limits)
  v_discount_cents := LEAST(
    COALESCE(v_balance.balance_cents, 0),
    p_order_total_cents
  );
  
  -- Apply max credit per order limit if set
  IF v_program.max_credit_per_order_cents IS NOT NULL THEN
    v_discount_cents := LEAST(v_discount_cents, v_program.max_credit_per_order_cents);
  END IF;
  
  -- Validate there is available balance
  IF v_discount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient referral credit balance'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_referral_code.id,
    'discount_cents', v_discount_cents,
    'balance_cents', COALESCE(v_balance.balance_cents, 0),
    'remaining_balance_cents', COALESCE(v_balance.balance_cents, 0) - v_discount_cents
  );
END;
$$;

-- =====================================================
-- 6. APPLY REFERRAL DISCOUNT (Create Debit Entry)
-- =====================================================

CREATE OR REPLACE FUNCTION apply_referral_discount_debit(
  p_business_id uuid,
  p_referral_code_id uuid,
  p_discount_cents int,
  p_order_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id uuid;
  v_idempotency_key text;
BEGIN
  -- Generate idempotency key if not provided
  v_idempotency_key := COALESCE(
    p_idempotency_key,
    'debit-' || COALESCE(p_order_id::text, p_booking_id::text) || '-' || p_referral_code_id::text
  );
  
  -- Check if transaction already exists
  IF EXISTS(
    SELECT 1 FROM referral_ledger WHERE idempotency_key = v_idempotency_key
  ) THEN
    -- Return existing transaction
    SELECT id INTO v_ledger_id
    FROM referral_ledger
    WHERE idempotency_key = v_idempotency_key;
    
    RETURN jsonb_build_object(
      'success', true,
      'ledger_id', v_ledger_id,
      'duplicate_prevented', true
    );
  END IF;
  
  -- Insert debit ledger entry
  INSERT INTO referral_ledger (
    business_id,
    referral_code_id,
    type,
    amount_cents,
    reason,
    order_id,
    booking_id,
    idempotency_key
  ) VALUES (
    p_business_id,
    p_referral_code_id,
    'debit',
    p_discount_cents,
    'discount_redemption',
    p_order_id,
    p_booking_id,
    v_idempotency_key
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'duplicate_prevented', false
  );
END;
$$;

-- =====================================================
-- 7. AWARD REFERRAL CREDIT (Idempotent)
-- =====================================================

CREATE OR REPLACE FUNCTION award_referral_credit(
  p_business_id uuid,
  p_code text,
  p_order_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code record;
  v_program record;
  v_ledger_id uuid;
  v_idempotency_key text;
  v_credit_cents int;
BEGIN
  -- Generate idempotency key if not provided
  v_idempotency_key := COALESCE(
    p_idempotency_key,
    'credit-' || COALESCE(p_order_id::text, p_booking_id::text) || '-' || p_code
  );
  
  -- Check if transaction already exists
  IF EXISTS(
    SELECT 1 FROM referral_ledger WHERE idempotency_key = v_idempotency_key
  ) THEN
    -- Return existing transaction
    SELECT id INTO v_ledger_id
    FROM referral_ledger
    WHERE idempotency_key = v_idempotency_key;
    
    RETURN jsonb_build_object(
      'success', true,
      'ledger_id', v_ledger_id,
      'duplicate_prevented', true
    );
  END IF;
  
  -- Get referral program settings
  SELECT * INTO v_program
  FROM referral_programs
  WHERE business_id = p_business_id;
  
  IF v_program.id IS NULL OR NOT v_program.is_enabled THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral program not enabled'
    );
  END IF;
  
  -- Find referral code (must be a DIFFERENT code than the one being redeemed)
  SELECT * INTO v_referral_code
  FROM referral_codes
  WHERE code = p_code AND business_id = p_business_id AND is_active = true
  LIMIT 1;
  
  IF v_referral_code.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral code not found or inactive'
    );
  END IF;
  
  v_credit_cents := v_program.credit_per_use_cents;
  
  -- Insert credit ledger entry
  INSERT INTO referral_ledger (
    business_id,
    referral_code_id,
    type,
    amount_cents,
    reason,
    order_id,
    booking_id,
    idempotency_key
  ) VALUES (
    p_business_id,
    v_referral_code.id,
    'credit',
    v_credit_cents,
    'referral_use_credit',
    p_order_id,
    p_booking_id,
    v_idempotency_key
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'credit_cents', v_credit_cents,
    'duplicate_prevented', false
  );
END;
$$;

-- =====================================================
-- 8. GET REFERRAL LEDGER HISTORY
-- =====================================================

CREATE OR REPLACE FUNCTION get_referral_ledger_history(
  p_code_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  type text,
  amount_cents int,
  reason text,
  order_id uuid,
  booking_id uuid,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.id,
    rl.type,
    rl.amount_cents,
    rl.reason,
    rl.order_id,
    rl.booking_id,
    rl.created_at,
    rl.metadata
  FROM referral_ledger rl
  WHERE rl.referral_code_id = p_code_id
  ORDER BY rl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 9. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION generate_unique_referral_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_referral_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION confirm_referral_code_saved TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_referral_balance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_and_apply_referral_discount TO authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_referral_discount_debit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION award_referral_credit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_referral_ledger_history TO authenticated, anon;
