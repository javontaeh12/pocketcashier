/*
  # Add billing frequency to subscription plans

  1. Changes
    - Add billing_frequency column to track monthly/annual plans
    - Update existing plans with correct frequencies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'billing_frequency'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN billing_frequency text DEFAULT 'monthly';
  END IF;
END $$;

UPDATE subscription_plans SET billing_frequency = 'monthly' WHERE name IN ('Free', 'Pro');
UPDATE subscription_plans SET billing_frequency = 'annual' WHERE name = 'Enterprise';
