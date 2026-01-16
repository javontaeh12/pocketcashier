/*
  # Fix delete_business_account function parameter shadowing

  1. Changes
    - Rename function parameter from business_id to p_business_id to avoid column name conflicts
    - Update all references in the function to use the correct parameter name
  
  2. Security
    - Function still uses SECURITY DEFINER to delete auth user
    - Maintains all existing cascade deletion logic
*/

DROP FUNCTION IF EXISTS delete_business_account(uuid);

CREATE OR REPLACE FUNCTION delete_business_account(p_business_id uuid)
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the user_id associated with this business
  SELECT b.user_id INTO user_id FROM businesses b WHERE b.id = p_business_id;

  -- Delete in cascading order (respecting foreign keys)
  -- Start with deepest dependencies first

  -- Delete order items first (depends on orders and menu_items)
  DELETE FROM order_items
  WHERE order_id IN (SELECT id FROM orders WHERE business_id = p_business_id);

  -- Delete payments (depends on orders)
  DELETE FROM payments WHERE business_id = p_business_id;

  -- Delete orders
  DELETE FROM orders WHERE business_id = p_business_id;

  -- Delete customers
  DELETE FROM customers WHERE business_id = p_business_id;

  -- Delete menu associations (depends on menus and menu_items)
  DELETE FROM menu_associations
  WHERE menu_id IN (SELECT id FROM menus WHERE business_id = p_business_id)
     OR menu_item_id IN (SELECT id FROM menu_items WHERE business_id = p_business_id);

  -- Delete menu items
  DELETE FROM menu_items WHERE business_id = p_business_id;

  -- Delete menus
  DELETE FROM menus WHERE business_id = p_business_id;

  -- Delete event subscriptions (depends on events)
  DELETE FROM event_subscriptions
  WHERE event_id IN (SELECT id FROM events WHERE business_id = p_business_id);

  -- Delete events
  DELETE FROM events WHERE business_id = p_business_id;

  -- Delete reviews
  DELETE FROM reviews WHERE business_id = p_business_id;

  -- Delete google reviews (if table exists)
  DELETE FROM google_reviews WHERE business_id = p_business_id;

  -- Delete support messages
  DELETE FROM support_messages WHERE business_id = p_business_id;

  -- Delete subscription payments (depends on business_subscriptions)
  DELETE FROM subscription_payments
  WHERE business_subscription_id IN (
    SELECT id FROM business_subscriptions WHERE business_id = p_business_id
  );

  -- Delete business subscriptions
  DELETE FROM business_subscriptions WHERE business_id = p_business_id;

  -- Delete subscriptions
  DELETE FROM subscriptions WHERE business_id = p_business_id;

  -- Delete settings
  DELETE FROM settings WHERE business_id = p_business_id;

  -- Delete the business itself
  DELETE FROM businesses WHERE id = p_business_id;

  -- Delete the auth user if it exists
  IF user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_business_account(uuid) TO authenticated;
