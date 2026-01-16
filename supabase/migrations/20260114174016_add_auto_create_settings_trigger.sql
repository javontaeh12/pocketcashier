/*
  # Create automatic settings record for new businesses

  1. Changes
    - Add trigger to create settings record when a new business is created
    - This ensures every business has a settings record, preventing the settings page from getting stuck
*/

CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings (business_id, admin_email)
  VALUES (NEW.id, COALESCE(NEW.user_id::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_settings_trigger ON businesses;

CREATE TRIGGER create_default_settings_trigger
AFTER INSERT ON businesses
FOR EACH ROW
EXECUTE FUNCTION create_default_settings();