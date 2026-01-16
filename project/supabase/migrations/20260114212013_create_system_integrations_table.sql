/*
  # Create System Integrations Table
  
  1. New Tables
    - `system_integrations`
      - `id` (uuid, primary key)
      - `integration_type` (text) - e.g., 'google_oauth', 'mailerlite', etc.
      - `config` (jsonb) - stores integration configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `system_integrations` table
    - Only developers can read and write system integrations
*/

CREATE TABLE IF NOT EXISTS system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text UNIQUE NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;

-- Developers can read system integrations
CREATE POLICY "Developers can view system integrations"
  ON system_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'developer'
    )
  );

-- Developers can update system integrations
CREATE POLICY "Developers can update system integrations"
  ON system_integrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'developer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'developer'
    )
  );

-- Developers can insert system integrations
CREATE POLICY "Developers can insert system integrations"
  ON system_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'developer'
    )
  );

-- Insert default Google OAuth integration placeholder
INSERT INTO system_integrations (integration_type, config) 
VALUES ('google_oauth', '{"client_id": "", "client_secret": ""}')
ON CONFLICT (integration_type) DO NOTHING;