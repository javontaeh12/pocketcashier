/*
  # Add Developer Accounts and Support Chat System

  1. New Tables
    - `developer_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamptz)
    
    - `support_messages`
      - `id` (uuid, primary key)
      - `business_id` (uuid, references businesses)
      - `sender_type` (text) - 'admin' or 'developer'
      - `sender_id` (uuid)
      - `message` (text)
      - `created_at` (timestamptz)
      - `read` (boolean)

  2. Security
    - Enable RLS on both tables
    - Developers can access all data
    - Admins can only access their own business support messages
*/

-- Create developer_accounts table
CREATE TABLE IF NOT EXISTS developer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE developer_accounts ENABLE ROW LEVEL SECURITY;

-- Developer accounts can read their own data
CREATE POLICY "Developers can read own account"
  ON developer_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'developer')),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read messages for their business
CREATE POLICY "Admins can read own business messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Admins can insert messages for their business
CREATE POLICY "Admins can send messages"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
    AND sender_type = 'admin'
    AND sender_id = auth.uid()
  );

-- Developers can read all messages
CREATE POLICY "Developers can read all messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
  );

-- Developers can send messages to any business
CREATE POLICY "Developers can send messages"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
    AND sender_type = 'developer'
    AND sender_id = auth.uid()
  );

-- Developers and admins can update read status
CREATE POLICY "Users can update read status"
  ON support_messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
    OR business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM developer_accounts)
    OR business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_business_id ON support_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_accounts_user_id ON developer_accounts(user_id);
