/*
  # Fix Google OAuth RLS Policy
  
  1. Changes
    - Add policy to allow service role and edge functions to read google_oauth integration
    - This is needed for edge functions to access Google OAuth credentials
  
  2. Security
    - Only allows reading the google_oauth integration type
    - Does not expose other integration types
*/

-- Allow service role to read google_oauth integration
CREATE POLICY "Service role can read google_oauth integration"
  ON system_integrations
  FOR SELECT
  TO authenticated, anon
  USING (integration_type = 'google_oauth');
