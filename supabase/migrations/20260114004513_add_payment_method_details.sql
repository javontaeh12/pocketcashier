/*
  # Extend Payment Methods Configuration

  1. Changes
    - Extends the `payment_methods` JSONB column to support detailed configuration
    - Adds support for Cash App, Zelle, and Apple Pay with their respective account details
    
  2. Payment Method Structure
    - `cash_app`: { enabled: boolean, handle: string }
    - `zelle`: { enabled: boolean, email: string, phone: string }
    - `apple_pay`: { enabled: boolean, email: string }
    - `square_pay`: { enabled: boolean } (existing, kept for backwards compatibility)
    
  3. Notes
    - This is a data structure extension only, no table alterations needed
    - Existing payment_methods data will be preserved
    - Businesses can now configure payment account details for manual payment methods
*/

-- No schema changes needed, this migration documents the extended JSONB structure
-- The payment_methods column already exists and can store any JSON structure

-- Update any existing records that have the old boolean-only structure to the new structure
UPDATE settings
SET payment_methods = jsonb_build_object(
  'cash_app', jsonb_build_object('enabled', false, 'handle', ''),
  'zelle', jsonb_build_object('enabled', COALESCE((payment_methods->>'zelle')::boolean, false), 'email', '', 'phone', ''),
  'apple_pay', jsonb_build_object('enabled', COALESCE((payment_methods->>'apple_pay')::boolean, false), 'email', ''),
  'square_pay', jsonb_build_object('enabled', COALESCE((payment_methods->>'square_pay')::boolean, false))
)
WHERE payment_methods IS NOT NULL;

-- Set default structure for records with NULL payment_methods
UPDATE settings
SET payment_methods = jsonb_build_object(
  'cash_app', jsonb_build_object('enabled', false, 'handle', ''),
  'zelle', jsonb_build_object('enabled', false, 'email', '', 'phone', ''),
  'apple_pay', jsonb_build_object('enabled', false, 'email', ''),
  'square_pay', jsonb_build_object('enabled', false)
)
WHERE payment_methods IS NULL;

-- Alter the default value for new records
ALTER TABLE settings 
ALTER COLUMN payment_methods 
SET DEFAULT jsonb_build_object(
  'cash_app', jsonb_build_object('enabled', false, 'handle', ''),
  'zelle', jsonb_build_object('enabled', false, 'email', '', 'phone', ''),
  'apple_pay', jsonb_build_object('enabled', false, 'email', ''),
  'square_pay', jsonb_build_object('enabled', false)
);