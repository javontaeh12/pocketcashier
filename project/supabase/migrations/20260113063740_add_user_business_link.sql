/*
  # Link Users to Businesses

  1. Changes
    - Add `user_id` column to businesses table to link each business to an admin user
    - Add unique constraint to ensure one user = one business
    - Update RLS policies to restrict access based on user ownership
    
  2. Security
    - Users can only view and manage their own business data
    - Anonymous users cannot view any business or menu items
*/

-- Add user_id column to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
  END IF;
END $$;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view business info" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can update business info" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can insert business info" ON businesses;
DROP POLICY IF EXISTS "Anyone can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can insert menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can update menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can view order items" ON order_items;

-- New restrictive policies for businesses table
CREATE POLICY "Users can view own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- New restrictive policies for menu_items table
CREATE POLICY "Users can view own menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = menu_items.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = menu_items.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = menu_items.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = menu_items.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = menu_items.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- New restrictive policies for settings table
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = settings.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = settings.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = settings.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = settings.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- New restrictive policies for customers table
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = customers.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- New restrictive policies for orders table
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = orders.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = orders.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = orders.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- New restrictive policies for order_items table
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN businesses ON businesses.id = orders.business_id
      WHERE orders.id = order_items.order_id
      AND businesses.user_id = auth.uid()
    )
  );