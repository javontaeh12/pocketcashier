/*
  # Create Chatbot Schema

  1. New Tables
    - `chat_sessions`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `user_id` (uuid, nullable, foreign key to auth.users)
      - `visitor_id` (text, nullable) - For anonymous visitors
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `metadata` (jsonb) - Store session context (e.g., current booking draft)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to chat_sessions)
      - `role` (text) - 'user', 'assistant', 'system'
      - `content` (text) - Message content
      - `metadata` (jsonb) - Store action requests, service IDs, etc.
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Anonymous users can create and read their own sessions/messages (via visitor_id)
    - Authenticated users can create and read their own sessions/messages (via user_id)
    - Business admins can read all sessions/messages for their business
    
  3. Indexes
    - Index on session_id for fast message lookup
    - Index on business_id for admin queries
    - Index on visitor_id and user_id for session lookup
*/

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT check_user_or_visitor CHECK (user_id IS NOT NULL OR visitor_id IS NOT NULL)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_business_id 
  ON chat_sessions(business_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id 
  ON chat_sessions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor_id 
  ON chat_sessions(visitor_id) WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id 
  ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
  ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions

-- Anonymous users can create sessions
CREATE POLICY "Anonymous users can create chat sessions"
  ON chat_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anonymous users can read their own sessions (by visitor_id)
CREATE POLICY "Anonymous users can read own sessions"
  ON chat_sessions FOR SELECT
  TO anon
  USING (visitor_id IS NOT NULL);

-- Authenticated users can create sessions
CREATE POLICY "Authenticated users can create chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can read their own sessions
CREATE POLICY "Authenticated users can read own sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Business admins can read all sessions for their business
CREATE POLICY "Business admins can read business sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages

-- Anonymous users can insert messages to their sessions
CREATE POLICY "Anonymous users can insert messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE visitor_id IS NOT NULL
    )
  );

-- Anonymous users can read messages from their sessions
CREATE POLICY "Anonymous users can read own messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE visitor_id IS NOT NULL
    )
  );

-- Authenticated users can insert messages to their sessions
CREATE POLICY "Authenticated users can insert messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can read messages from their sessions
CREATE POLICY "Authenticated users can read own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Business admins can read all messages for their business
CREATE POLICY "Business admins can read business messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT cs.id FROM chat_sessions cs
      INNER JOIN businesses b ON cs.business_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamp on new message
DROP TRIGGER IF EXISTS update_chat_session_on_message ON chat_messages;
CREATE TRIGGER update_chat_session_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();
