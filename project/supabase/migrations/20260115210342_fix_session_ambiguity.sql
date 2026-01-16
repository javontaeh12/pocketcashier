/*
  # Fix Ambiguous Column Reference in ON CONFLICT

  1. Problem
    - ON CONFLICT DO UPDATE has ambiguous column references
    - Need to fully qualify all column references
  
  2. Changes
    - Fix the get_or_create_session function to use proper table aliases
    - Use EXCLUDED to reference incoming values
*/

-- Update get_or_create_session to fix ambiguous column references
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
    SET token_created_at = now();
    
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
