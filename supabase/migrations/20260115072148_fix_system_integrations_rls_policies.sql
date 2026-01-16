/*
  # Fix System Integrations RLS Policies
  
  1. Changes
    - Drop existing RLS policies that query auth.users (causes permission errors)
    - Create new policies that use developer_accounts table instead
    
  2. Security
    - Only users in developer_accounts table can read/write system integrations
    - Uses developer_accounts table which is accessible from RLS policies
*/

-- Drop existing policies that cause permission errors
DROP POLICY IF EXISTS "Developers can view system integrations" ON system_integrations;
DROP POLICY IF EXISTS "Developers can update system integrations" ON system_integrations;
DROP POLICY IF EXISTS "Developers can insert system integrations" ON system_integrations;

-- Create new policies using developer_accounts table
CREATE POLICY "Developers can view system integrations"
  ON system_integrations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
  );

CREATE POLICY "Developers can update system integrations"
  ON system_integrations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
  );

CREATE POLICY "Developers can insert system integrations"
  ON system_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
  );
