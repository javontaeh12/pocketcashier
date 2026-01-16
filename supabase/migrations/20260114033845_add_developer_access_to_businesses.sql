/*
  # Add developer access to view all businesses

  ## Changes
  - Add RLS policy allowing developers to read all businesses
  - This enables the developer portal to display all businesses and owners
  
  ## Security
  - Only users in the developer_accounts table can access all businesses
  - Regular business owners can still only see their own business
  - This maintains the principle of least privilege
*/

CREATE POLICY "Developers can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_accounts
      WHERE developer_accounts.user_id = auth.uid()
    )
  );
