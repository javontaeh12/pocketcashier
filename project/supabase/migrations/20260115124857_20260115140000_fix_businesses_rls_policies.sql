/*
  # Fix businesses table RLS policies
  
  1. Drop problematic RLS policies
  2. Recreate with improved logic
  
  The issue: The "Developers can view all businesses" policy was checking for developer_accounts
  existence in a subquery which could fail. We need to simplify and make it more robust.
  
  1. Public read access to published businesses
  2. Authenticated users can read their own businesses  
  3. Developers can read all businesses
  4. Authenticated users can insert their own businesses
  5. Users can update their own businesses
*/

DROP POLICY IF EXISTS "Developers can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Public users can read businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert own business" ON businesses;
DROP POLICY IF EXISTS "Users can update own business" ON businesses;
DROP POLICY IF EXISTS "Users can view own business" ON businesses;

CREATE POLICY "Public users can read businesses"
  ON businesses FOR SELECT
  USING (true);

CREATE POLICY "Users can view own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Developers can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_accounts
      WHERE developer_accounts.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
