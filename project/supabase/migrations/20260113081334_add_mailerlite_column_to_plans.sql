/*
  # Add MailerLite column to subscription plans

  1. Changes
    - Add mailerlite_integration_included column
    - Update existing plans
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'mailerlite_integration_included'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN mailerlite_integration_included boolean DEFAULT false;
  END IF;
END $$;

DELETE FROM subscription_plans;

INSERT INTO subscription_plans (name, description, price, features, square_integration_included, mailerlite_integration_included, monthly_transaction_limit)
VALUES 
  ('Free', 'Basic menu and order management', 0, '{"orders": true, "analytics": false, "api_access": false}', false, false, 50),
  ('Pro', 'Growing business solution with integrations', 24.99, '{"orders": true, "analytics": true, "api_access": false}', true, true, 1000),
  ('Enterprise', 'Full-featured business platform', 199.00, '{"orders": true, "analytics": true, "api_access": true}', true, true, NULL);
