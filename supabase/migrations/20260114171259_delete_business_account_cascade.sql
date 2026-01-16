/*
  # Create delete_business_account function

  1. New Functions
    - `delete_business_account(business_id uuid)` - Deletes a business and all associated data cascading through all tables

  2. Deletes
    - All orders and order items for the business
    - All payments for the business
    - All menu items for the business
    - All menus for the business
    - All customers for the business
    - All events for the business
    - All event subscriptions for the business
    - All reviews for the business
    - All support messages for the business
    - All subscription data for the business
    - All business subscriptions for the business
    - The business itself
    - The associated auth user

  3. Security
    - Function uses service role to delete auth user
    - RLS policies are bypassed for cascade deletion
*/

CREATE OR REPLACE FUNCTION delete_business_account(business_id uuid)
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the user_id associated with this business
  SELECT b.user_id INTO user_id FROM businesses b WHERE b.id = business_id;

  -- Delete in cascading order (respecting foreign keys)
  -- Start with deepest dependencies first

  -- Delete order items first (depends on orders and menu_items)
  DELETE FROM order_items
  WHERE order_id IN (SELECT id FROM orders WHERE business_id = business_id);

  -- Delete payments (depends on orders)
  DELETE FROM payments WHERE business_id = business_id;

  -- Delete orders
  DELETE FROM orders WHERE business_id = business_id;

  -- Delete customers
  DELETE FROM customers WHERE business_id = business_id;

  -- Delete menu associations (depends on menus and menu_items)
  DELETE FROM menu_associations
  WHERE menu_id IN (SELECT id FROM menus WHERE business_id = business_id)
     OR menu_item_id IN (SELECT id FROM menu_items WHERE business_id = business_id);

  -- Delete menu items
  DELETE FROM menu_items WHERE business_id = business_id;

  -- Delete menus
  DELETE FROM menus WHERE business_id = business_id;

  -- Delete event subscriptions (depends on events)
  DELETE FROM event_subscriptions
  WHERE event_id IN (SELECT id FROM events WHERE business_id = business_id);

  -- Delete events
  DELETE FROM events WHERE business_id = business_id;

  -- Delete reviews
  DELETE FROM reviews WHERE business_id = business_id;

  -- Delete google reviews
  DELETE FROM google_reviews WHERE business_id = business_id;

  -- Delete support messages
  DELETE FROM support_messages WHERE business_id = business_id;

  -- Delete subscription payments (depends on business_subscriptions)
  DELETE FROM subscription_payments
  WHERE business_subscription_id IN (
    SELECT id FROM business_subscriptions WHERE business_id = business_id
  );

  -- Delete business subscriptions
  DELETE FROM business_subscriptions WHERE business_id = business_id;

  -- Delete subscriptions
  DELETE FROM subscriptions WHERE business_id = business_id;

  -- Delete settings
  DELETE FROM settings WHERE business_id = business_id;

  -- Delete the business itself
  DELETE FROM businesses WHERE id = business_id;

  -- Delete the auth user if it exists
  IF user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_business_account(uuid) TO authenticated;