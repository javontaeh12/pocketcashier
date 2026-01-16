/*
  # Add Session Token Verification

  1. Changes
    - Add `session_token_hash` column to chat_sessions for secure token verification
    - Add index on session_token_hash for fast lookup
    - Add `token_created_at` to track token age
    - Create helper function to verify tokens
  
  2. Purpose
    - Support server-side session verification without RLS lookups
    - Prevent SESSION_CHECK_ERROR from RLS policy failures
    - Enable robust session verification for anonymous visitors
  
  3. Security
    - Tokens are hashed before storage (not stored plaintext)
    - Service role can verify tokens directly
    - Client receives unhashed token to send with each request
*/

-- Add session token columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'session_token_hash'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN session_token_hash text UNIQUE;
    ALTER TABLE chat_sessions ADD COLUMN token_created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on session_token_hash for fast verification
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token_hash 
  ON chat_sessions(session_token_hash);

-- Function to hash tokens (using SHA256)
CREATE OR REPLACE FUNCTION hash_session_token(token text) RETURNS text AS $$
BEGIN
  RETURN encode(digest(token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to verify session by token
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
    AND business_id = p_business_id
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
$$ LANGUAGE plpgsql;

-- Function to create or verify session
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
    -- Create new session
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
$$ LANGUAGE plpgsql;
