/*
  # Fix chat_sessions Column Name Mismatch

  1. Problem
    - The `chat_sessions` table was created with a `metadata` column
    - The RPC functions reference `session_context` column which doesn't exist
    - This causes session creation to fail with USER_MESSAGE_INSERT_ERROR
  
  2. Changes
    - Rename `metadata` column to `session_context` in chat_sessions table
    - Recreate the RPC functions with correct column references
  
  3. Security
    - No changes to RLS policies
*/

-- Rename metadata column to session_context if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'metadata'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'session_context'
  ) THEN
    ALTER TABLE chat_sessions RENAME COLUMN metadata TO session_context;
  END IF;
END $$;

-- Add session_context column if neither exists (fresh install case)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'session_context'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN session_context jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Recreate the verify_session_token function with correct column reference
CREATE OR REPLACE FUNCTION verify_session_token(p_token text, p_business_id uuid)
RETURNS TABLE(
  session_id uuid,
  business_id uuid,
  visitor_id text,
  user_id uuid,
  session_context jsonb,
  is_valid boolean
) AS $$
DECLARE
  v_token_hash text;
  v_session_id uuid;
BEGIN
  v_token_hash := hash_session_token(p_token);
  
  SELECT id INTO v_session_id
  FROM chat_sessions
  WHERE session_token_hash = v_token_hash 
    AND chat_sessions.business_id = p_business_id
    AND (token_created_at > now() - interval '24 hours' OR token_created_at IS NULL);
  
  IF v_session_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      cs.id,
      cs.business_id,
      cs.visitor_id,
      cs.user_id,
      cs.session_context,
      true as is_valid
    FROM chat_sessions cs
    WHERE cs.id = v_session_id;
  ELSE
    RETURN QUERY
    SELECT 
      NULL::uuid,
      NULL::uuid,
      NULL::text,
      NULL::uuid,
      '{}'::jsonb,
      false as is_valid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the get_or_create_session function with correct column reference
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_session_id uuid,
  p_business_id uuid,
  p_visitor_id text,
  p_user_id uuid,
  p_token text
)
RETURNS TABLE(
  session_id uuid,
  business_id uuid,
  visitor_id text,
  user_id uuid,
  session_context jsonb,
  token_hash text,
  is_new_session boolean
) AS $$
DECLARE
  v_token_hash text;
  v_exists boolean;
BEGIN
  v_token_hash := hash_session_token(p_token);
  
  -- Check if session exists
  SELECT EXISTS(
    SELECT 1 FROM chat_sessions 
    WHERE id = p_session_id
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    -- Create new session with correct column name
    INSERT INTO chat_sessions (id, business_id, visitor_id, user_id, session_context, session_token_hash, token_created_at)
    VALUES (p_session_id, p_business_id, p_visitor_id, p_user_id, '{}'::jsonb, v_token_hash, now())
    ON CONFLICT (id) DO NOTHING;
    
    RETURN QUERY
    SELECT 
      p_session_id,
      p_business_id,
      p_visitor_id,
      p_user_id,
      '{}'::jsonb,
      v_token_hash,
      true as is_new_session;
  ELSE
    -- Return existing session
    RETURN QUERY
    SELECT 
      cs.id,
      cs.business_id,
      cs.visitor_id,
      cs.user_id,
      cs.session_context,
      v_token_hash,
      false as is_new_session
    FROM chat_sessions cs
    WHERE cs.id = p_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
