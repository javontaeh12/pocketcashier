/*
  # Update default settings trigger to include subscription fields

  1. Changes
    - Update create_default_settings function to include subscription_status and can_link_square
    - Ensures all new businesses get proper default values for subscription validation
*/

CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings (business_id, admin_email, subscription_status, can_link_square)
  VALUES (NEW.id, COALESCE(NEW.user_id::text, ''), 'none', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
