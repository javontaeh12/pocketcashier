/*
  # Fix Session Token Hash Uniqueness Constraint

  1. Problem
    - The session_token_hash has a UNIQUE constraint globally
    - This causes conflicts when same token is reused for the same business/visitor
    - Should allow reuse of token for a session that already exists
  
  2. Changes
    - Remove simple UNIQUE constraint on session_token_hash
    - Add composite unique constraint on (business_id, visitor_id, session_token_hash)
    - Update get_or_create_session to use ON CONFLICT properly
*/

-- Drop the old simple unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'chat_sessions' 
    AND constraint_name = 'chat_sessions_session_token_hash_key'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE chat_sessions DROP CONSTRAINT chat_sessions_session_token_hash_key;
  END IF;
END $$;

-- Add composite unique constraint (business_id, visitor_id, session_token_hash)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'chat_sessions' 
    AND constraint_name = 'chat_sessions_token_per_visitor_unique'
  ) THEN
    ALTER TABLE chat_sessions 
    ADD CONSTRAINT chat_sessions_token_per_visitor_unique UNIQUE (business_id, visitor_id, session_token_hash);
  END IF;
END $$;

-- Drop and recreate the index on session_token_hash
DROP INDEX IF EXISTS idx_chat_sessions_token_hash;
CREATE INDEX idx_chat_sessions_token_hash ON chat_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_business_visitor_token ON chat_sessions(business_id, visitor_id, session_token_hash);

-- Update get_or_create_session to properly handle token conflicts
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
  v_existing_session_id uuid;
BEGIN
  v_token_hash := hash_session_token(p_token);
  
  -- Check if we already have a session with this token for this business/visitor
  SELECT id INTO v_existing_session_id
  FROM chat_sessions
  WHERE business_id = p_business_id 
    AND visitor_id = p_visitor_id
    AND session_token_hash = v_token_hash
    AND (token_created_at > now() - interval '24 hours' OR token_created_at IS NULL)
  LIMIT 1;
  
  IF v_existing_session_id IS NOT NULL THEN
    -- Return the existing session (from previous browser tab/window)
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
    WHERE cs.id = v_existing_session_id;
  ELSE
    -- Create new session with this token
    -- Use ON CONFLICT to handle race conditions
    INSERT INTO chat_sessions (
      id, 
      business_id, 
      visitor_id, 
      user_id, 
      session_context, 
      session_token_hash, 
      token_created_at
    )
    VALUES (
      p_session_id, 
      p_business_id, 
      p_visitor_id, 
      p_user_id, 
      '{}'::jsonb, 
      v_token_hash, 
      now()
    )
    ON CONFLICT (business_id, visitor_id, session_token_hash) DO UPDATE
    SET token_created_at = now()
    WHERE chat_sessions.business_id = p_business_id
      AND chat_sessions.visitor_id = p_visitor_id
      AND chat_sessions.session_token_hash = v_token_hash;
    
    RETURN QUERY
    SELECT 
      p_session_id,
      p_business_id,
      p_visitor_id,
      p_user_id,
      '{}'::jsonb,
      v_token_hash,
      true as is_new_session;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
