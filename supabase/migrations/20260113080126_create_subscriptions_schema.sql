/*
  # Create Subscription Management System

  1. New Tables
    - `subscription_plans` - Available subscription tiers with pricing
    - `business_subscriptions` - Active subscriptions for each business
    - `subscription_payments` - Payment history and billing records
    - `subscription_features` - Features available in each plan

  2. Table Updates
    - Update `settings` table with subscription-related columns

  3. Security
    - Enable RLS on all new tables
    - Add policies for data access control

  4. Key Features
    - Support for trial periods and auto-renewal
    - Track Square subscription IDs for recurring billing
    - Store billing dates and payment history
    - Feature flags for plan capabilities
*/

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  features jsonb,
  square_integration_included boolean DEFAULT true,
  monthly_transaction_limit integer,
  setup_fee decimal(10, 2) DEFAULT 0,
  square_product_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscription_plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  square_subscription_id text,
  square_customer_id text,
  billing_start_date timestamptz,
  billing_end_date timestamptz,
  trial_end_date timestamptz,
  next_billing_date timestamptz,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  canceled_at timestamptz
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_subscription_id uuid NOT NULL REFERENCES business_subscriptions(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  square_payment_id text,
  payment_method text,
  invoice_url text,
  billing_cycle_start timestamptz,
  billing_cycle_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  limit_value text,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE settings ADD COLUMN subscription_status text DEFAULT 'none';
    ALTER TABLE settings ADD COLUMN can_link_square boolean DEFAULT false;
  END IF;
END $$;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Users can view their business subscription"
  ON business_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_subscriptions.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their subscription payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_subscriptions bs
      JOIN businesses b ON b.id = bs.business_id
      WHERE bs.id = subscription_payments.business_subscription_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view subscription features"
  ON subscription_features FOR SELECT
  USING (true);

INSERT INTO subscription_plans (name, description, price, features, square_integration_included, monthly_transaction_limit)
VALUES 
  ('Starter', 'Perfect for small businesses', 9.99, '{"orders": true, "analytics": false, "api_access": false}', true, 100),
  ('Professional', 'For growing businesses', 24.99, '{"orders": true, "analytics": true, "api_access": true}', true, 1000),
  ('Enterprise', 'Custom enterprise solution', 0, '{"orders": true, "analytics": true, "api_access": true}', true, NULL)
ON CONFLICT DO NOTHING;
