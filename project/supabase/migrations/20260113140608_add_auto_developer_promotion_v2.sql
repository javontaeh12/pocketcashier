/*
  # Auto-promote Developer Accounts

  1. Changes
    - Creates a function to check and promote users to developer status based on email
    - Adds a trigger to automatically promote developers on user creation
    - This ensures Contact@budgetbrandingonline.com becomes a developer automatically

  2. Security
    - Function runs with security definer to access auth schema
    - Only promotes specific whitelisted emails
*/

-- Function to check and promote developer accounts
CREATE OR REPLACE FUNCTION public.check_and_promote_developer()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  developer_emails TEXT[] := ARRAY['contact@budgetbrandingonline.com'];
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Check if email matches developer list (case-insensitive)
  IF LOWER(user_email) = ANY(SELECT LOWER(unnest(developer_emails))) THEN
    -- Extract name from email (part before @)
    user_name := SPLIT_PART(user_email, '@', 1);
    
    -- Create developer account if it doesn't exist
    INSERT INTO public.developer_accounts (user_id, name, email, created_at)
    VALUES (NEW.user_id, user_name, user_email, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on businesses table (since every user gets a business)
DROP TRIGGER IF EXISTS auto_promote_developer_trigger ON public.businesses;
CREATE TRIGGER auto_promote_developer_trigger
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.check_and_promote_developer();

-- Also create a function to manually check existing users
CREATE OR REPLACE FUNCTION public.promote_existing_developers()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  developer_emails TEXT[] := ARRAY['contact@budgetbrandingonline.com'];
  user_record RECORD;
  user_name TEXT;
BEGIN
  FOR user_record IN
    SELECT id, email
    FROM auth.users
    WHERE LOWER(email) = ANY(SELECT LOWER(unnest(developer_emails)))
  LOOP
    -- Extract name from email (part before @)
    user_name := SPLIT_PART(user_record.email, '@', 1);
    
    -- Create developer account if it doesn't exist
    INSERT INTO public.developer_accounts (user_id, name, email, created_at)
    VALUES (user_record.id, user_name, user_record.email, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Run the function to promote any existing users
SELECT public.promote_existing_developers();