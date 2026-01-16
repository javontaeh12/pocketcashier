/*
  # Shop Table RLS Policies

  1. Products Policies
    - Public SELECT: Anyone can view active products from active businesses
    - Admin INSERT/UPDATE/DELETE: Only admins of the business can manage

  2. Shop Orders Policies
    - Admin SELECT: Admins can view their business orders
    - Admin UPDATE: Admins can update order status, notes
    - System INSERT: Edge functions create orders server-side

  3. Shop Order Items Policies
    - Admin SELECT: Admins can view items in their business orders
    - System INSERT: Edge functions create items server-side

  4. Shop Settings Policies
    - Admin SELECT/UPDATE: Only admins of business can manage settings
    - System INSERT: Triggers auto-create on first access

  5. Security Approach
    - No direct client INSERT to orders/order_items (all via edge functions)
    - Admin INSERT restricted to their business via foreign key
    - Public reads only for active products in active businesses
    - All business isolation enforced via business_id checks
*/

-- Products: Public read for active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (
    is_active = true
    AND business_id IN (
      SELECT id FROM businesses WHERE is_active = true
    )
  );

-- Products: Admin can insert
CREATE POLICY "Admins can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Products: Admin can update own products
CREATE POLICY "Admins can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Products: Admin can delete own products
CREATE POLICY "Admins can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Shop Orders: Admin can select own business orders
CREATE POLICY "Admins can view own business orders"
  ON shop_orders FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Shop Orders: Admin can update own business orders
CREATE POLICY "Admins can update own business orders"
  ON shop_orders FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Shop Orders: Service role can insert (via edge functions)
CREATE POLICY "Service role can create orders"
  ON shop_orders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Shop Order Items: Admin can select items
CREATE POLICY "Admins can view order items"
  ON shop_order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM shop_orders
      WHERE business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Shop Order Items: Service role can insert
CREATE POLICY "Service role can create order items"
  ON shop_order_items FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Shop Settings: Admin can select
CREATE POLICY "Admins can view shop settings"
  ON shop_settings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Shop Settings: Admin can insert
CREATE POLICY "Admins can create shop settings"
  ON shop_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Shop Settings: Admin can update
CREATE POLICY "Admins can update shop settings"
  ON shop_settings FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
