/*
  # Add Service Role Policies for Chat Tables

  1. Purpose
    - Ensure edge functions using SERVICE_ROLE_KEY can access chat_sessions and chat_messages
    - SERVICE_ROLE should bypass RLS by default, but explicit policies provide clarity
  
  2. Changes
    - Add SELECT/INSERT/UPDATE policies for service_role on chat_sessions
    - Add SELECT/INSERT policies for service_role on chat_messages
  
  3. Security
    - These policies only apply to service_role (server-side edge functions)
    - Client applications using anon/authenticated keys remain restricted by existing policies
*/

-- Service role can do anything with chat_sessions
CREATE POLICY "Service role has full access to chat_sessions"
  ON chat_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can do anything with chat_messages
CREATE POLICY "Service role has full access to chat_messages"
  ON chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
