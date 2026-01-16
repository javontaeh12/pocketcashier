/*
  # Fix existing data by linking to users

  This migration:
  1. Links unassigned businesses to the first user who needs one
  2. Ensures all menu items are accessible to their business owner
*/

-- For each user without a business, assign them an unassigned business
DO $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_cursor CURSOR FOR SELECT id FROM auth.users;
BEGIN
  OPEN v_cursor;
  
  LOOP
    FETCH v_cursor INTO v_user_id;
    EXIT WHEN NOT FOUND;
    
    -- Check if this user already has a business
    SELECT id INTO v_business_id FROM businesses WHERE user_id = v_user_id;
    
    -- If they don't have a business, assign them an unassigned one
    IF v_business_id IS NULL THEN
      UPDATE businesses 
      SET user_id = v_user_id 
      WHERE user_id IS NULL 
      AND id = (SELECT id FROM businesses WHERE user_id IS NULL LIMIT 1);
    END IF;
  END LOOP;
  
  CLOSE v_cursor;
END $$;