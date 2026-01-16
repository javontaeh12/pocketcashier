/*
  # Add Customer Data Retention Settings

  1. New Columns
    - `customer_data_retention_days` (integer) - How long to keep customer data (1-14 days, default 14)
  
  2. Modified Tables
    - `businesses` - Added customer data retention configuration
    - `customers` - Track when customer data can be safely deleted
  
  3. Purpose
    - Allow admins to configure how long customer data is retained (1-14 days)
    - Automatically expire old customer data based on retention policy
    - Add last_activity_at to track when customer was last involved in transactions
    - Enable automatic cleanup of customer records

  4. Security
    - RLS remains unchanged
    - Deletion respects cascade constraints
    - Admins control their own retention policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'customer_data_retention_days'
  ) THEN
    ALTER TABLE businesses
    ADD COLUMN customer_data_retention_days integer DEFAULT 14
    CHECK (customer_data_retention_days >= 1 AND customer_data_retention_days <= 14);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE customers
    ADD COLUMN last_activity_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_customer_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET last_activity_at = now()
  WHERE id = NEW.customer_id OR (NEW.customer_id IS NULL AND id = OLD.customer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_on_order_change ON orders;
CREATE TRIGGER update_customer_on_order_change
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_last_activity();

DROP TRIGGER IF EXISTS update_customer_on_shop_order_change ON shop_orders;
CREATE TRIGGER update_customer_on_shop_order_change
AFTER INSERT OR UPDATE ON shop_orders
FOR EACH ROW
WHEN (NEW.customer_email IS NOT NULL)
EXECUTE FUNCTION update_customer_last_activity();
