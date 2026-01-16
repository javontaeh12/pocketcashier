/*
  # Auto-enable Square when Location ID is set

  1. New Function
    - Create trigger function that automatically enables Square integration when square_location_id is set on businesses table
  
  2. New Trigger
    - AFTER UPDATE on businesses table
    - When square_location_id is set (not null), automatically set square_enabled = true in settings
    - Allows manual square_location_id entry to auto-activate the integration
  
  3. Security
    - Trigger runs with definer privileges to bypass RLS
    - Only updates square_enabled flag, no data loss
*/

CREATE OR REPLACE FUNCTION auto_enable_square_on_location_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.square_location_id IS NOT NULL AND OLD.square_location_id IS NULL THEN
    UPDATE settings
    SET square_enabled = true, updated_at = now()
    WHERE business_id = NEW.id AND square_enabled = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_enable_square_on_location_id_trigger ON businesses;

CREATE TRIGGER auto_enable_square_on_location_id_trigger
AFTER UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION auto_enable_square_on_location_id();
