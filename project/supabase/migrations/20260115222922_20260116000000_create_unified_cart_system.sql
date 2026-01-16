/*
  # Create Unified Cart System for Shop + Bookings

  This migration creates a unified shopping cart system that allows customers to 
  purchase shop products and book appointments in a single checkout transaction.

  1. New Tables
    - `carts` - Master cart table
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key) - Enforces single-business cart
      - `customer_id` (uuid, nullable) - Links to auth.users if logged in
      - `customer_email` (text, nullable) - Collected at checkout
      - `customer_name` (text, nullable) - Collected at checkout
      - `customer_phone` (text, nullable) - Optional phone
      - `session_token` (text, unique) - For anonymous cart persistence
      - `status` (text) - 'active', 'checked_out', 'abandoned'
      - `expires_at` (timestamptz) - Auto-abandonment after 24h
      - `created_at`, `updated_at`

    - `cart_items` - Products and services in cart
      - `id` (uuid, primary key)
      - `cart_id` (uuid, foreign key)
      - `item_type` (text) - 'product' or 'service'
      - `product_id` (uuid, nullable) - If item_type='product'
      - `service_id` (uuid, nullable) - If item_type='service' (links to menu_items)
      - `quantity` (integer) - For products, always 1 for services
      - `unit_price_cents` (integer) - Snapshot at add time
      - `line_total_cents` (integer) - quantity * unit_price_cents
      - `title_snapshot` (text) - Product/service name at add time
      - `metadata` (jsonb) - Extra data like options, notes
      - `created_at`

    - `cart_booking_details` - One booking slot per cart (optional)
      - `cart_id` (uuid, primary key) - One-to-one with carts
      - `service_id` (uuid) - Links to menu_items
      - `start_time` (timestamptz) - Booking start
      - `end_time` (timestamptz) - Booking end
      - `timezone` (text) - Customer timezone
      - `customer_name` (text) - Name for booking
      - `customer_phone` (text) - Phone for booking
      - `notes` (text) - Special requests
      - `status` (text) - 'draft', 'pending_payment', 'confirmed', 'cancelled'
      - `calendar_event_id` (text) - Google Calendar ID after confirmation
      - `created_at`, `updated_at`

    - `checkout_sessions` - Payment session tracking
      - `id` (uuid, primary key)
      - `cart_id` (uuid, unique) - Links to cart
      - `business_id` (uuid) - Denormalized for easy lookup
      - `square_location_id` (text) - Square location for payment
      - `idempotency_key` (text, unique) - Prevent duplicate charges
      - `amount_total_cents` (integer) - Total charge amount
      - `currency` (text) - Default 'USD'
      - `square_payment_id` (text) - Square payment ID after success
      - `square_order_id` (text) - Square order ID if applicable
      - `status` (text) - 'pending', 'paid', 'failed'
      - `error_message` (text) - Error details if failed
      - `created_at`, `updated_at`, `paid_at`

  2. Indexes
    - carts: (session_token) for anonymous lookup
    - carts: (customer_email, business_id) for customer lookup
    - carts: (business_id, status, updated_at) for cleanup
    - cart_items: (cart_id) for cart contents
    - checkout_sessions: (idempotency_key) for idempotency
    - checkout_sessions: (square_payment_id) for webhook lookup

  3. Security (RLS)
    - Carts: Service role only for server-side cart management
    - Cart items: Service role only
    - Cart booking details: Service role only
    - Checkout sessions: Service role only for payment processing
    - All cart operations via edge functions for security

  4. Data Integrity
    - Foreign keys with CASCADE for cleanup
    - CHECK constraints for valid statuses
    - UNIQUE constraints on idempotency keys
    - cart_items enforces product_id OR service_id based on item_type
    - One booking per cart (cart_booking_details primary key = cart_id)
    - Amounts in cents for precision

  5. Business Logic Constraints
    - Cart can only contain items from one business
    - Cart can have multiple products but max one booking
    - Checkout session is idempotent via idempotency_key
    - Booking only confirmed after payment success
*/

-- Create carts table
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  customer_name text,
  customer_phone text,
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  service_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  title_snapshot text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cart_item_type_check CHECK (
    (item_type = 'product' AND product_id IS NOT NULL) OR
    (item_type = 'service' AND service_id IS NOT NULL)
  )
);

-- Create cart_booking_details table (one-to-one with carts)
CREATE TABLE IF NOT EXISTS cart_booking_details (
  cart_id uuid PRIMARY KEY REFERENCES carts(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  customer_name text,
  customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'confirmed', 'cancelled')),
  calendar_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create checkout_sessions table
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL UNIQUE REFERENCES carts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  square_location_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  amount_total_cents integer NOT NULL CHECK (amount_total_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  square_payment_id text,
  square_order_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_session_token
  ON carts(session_token);

CREATE INDEX IF NOT EXISTS idx_carts_customer_email_business
  ON carts(customer_email, business_id)
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carts_cleanup
  ON carts(business_id, status, updated_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
  ON cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
  ON cart_items(product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cart_booking_service
  ON cart_booking_details(service_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_idempotency
  ON checkout_sessions(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_square_payment
  ON checkout_sessions(square_payment_id)
  WHERE square_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_cart
  ON checkout_sessions(cart_id);

-- Enable RLS on all tables (server-side only via edge functions)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_booking_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role only (all operations via edge functions)
CREATE POLICY "Service role can manage carts"
  ON carts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage cart_items"
  ON cart_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage cart_booking_details"
  ON cart_booking_details FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage checkout_sessions"
  ON checkout_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger to update carts updated_at
CREATE OR REPLACE FUNCTION update_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_carts_updated_at();

-- Create trigger to update cart_booking_details updated_at
CREATE OR REPLACE FUNCTION update_cart_booking_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cart_booking_details_updated_at
  BEFORE UPDATE ON cart_booking_details
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_booking_details_updated_at();

-- Create trigger to update checkout_sessions updated_at
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_checkout_sessions_updated_at
  BEFORE UPDATE ON checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_checkout_sessions_updated_at();

-- Function to get or create cart for session
CREATE OR REPLACE FUNCTION get_or_create_cart(
  p_session_token text,
  p_business_id uuid
) RETURNS uuid AS $$
DECLARE
  v_cart_id uuid;
BEGIN
  -- Try to find existing active cart for this session and business
  SELECT id INTO v_cart_id
  FROM carts
  WHERE session_token = p_session_token
    AND business_id = p_business_id
    AND status = 'active'
    AND expires_at > now();
  
  -- If not found, create new cart
  IF v_cart_id IS NULL THEN
    INSERT INTO carts (business_id, session_token)
    VALUES (p_business_id, p_session_token)
    RETURNING id INTO v_cart_id;
  END IF;
  
  RETURN v_cart_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate cart total
CREATE OR REPLACE FUNCTION calculate_cart_total(p_cart_id uuid)
RETURNS integer AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(SUM(line_total_cents), 0)
  INTO v_total
  FROM cart_items
  WHERE cart_id = p_cart_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
