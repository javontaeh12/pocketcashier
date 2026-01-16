/*
  # Create RPC Functions for Slug Resolution

  1. Functions
    - `resolve_business_slug(slug text)` - Returns business data by current slug
    - `resolve_slug_with_redirect(slug text)` - Returns redirect info if slug changed
    - `check_slug_availability(slug text, business_id uuid)` - Check if slug is available
  
  2. Security
    - All functions are SECURITY DEFINER to bypass RLS
    - Only expose safe, public business data
    - Rate limiting should be implemented at application level
  
  3. Return Types
    - Safe subset of business data (no sensitive fields)
    - Redirect information for old slugs
    - Availability status for admin UI
*/

-- Function to resolve current business by slug
-- Returns only public-safe fields
CREATE OR REPLACE FUNCTION resolve_business_slug(slug_param text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  is_active boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.is_active,
    b.created_at
  FROM businesses b
  WHERE lower(b.slug) = lower(slug_param)
    AND b.slug IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if a slug is an old slug and return redirect target
-- Returns the current slug if the input is an old slug
CREATE OR REPLACE FUNCTION resolve_slug_with_redirect(slug_param text)
RETURNS TABLE (
  business_id uuid,
  current_slug text,
  is_redirect boolean,
  is_active boolean
) AS $$
BEGIN
  -- First check if it's a current slug
  RETURN QUERY
  SELECT 
    b.id as business_id,
    b.slug as current_slug,
    false as is_redirect,
    b.is_active
  FROM businesses b
  WHERE lower(b.slug) = lower(slug_param)
    AND b.slug IS NOT NULL;
  
  -- If no result, check if it's an old slug
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      b.id as business_id,
      b.slug as current_slug,
      true as is_redirect,
      b.is_active
    FROM business_slug_history h
    JOIN businesses b ON h.business_id = b.id
    WHERE lower(h.old_slug) = lower(slug_param)
      AND b.slug IS NOT NULL
    ORDER BY h.changed_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if a slug is available (for admin UI)
-- Returns true if slug is available, false if taken or reserved
CREATE OR REPLACE FUNCTION check_slug_availability(
  slug_param text, 
  business_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  available boolean,
  reason text
) AS $$
DECLARE
  slug_lower text;
  is_reserved boolean;
  existing_count integer;
BEGIN
  slug_lower := lower(slug_param);
  
  -- Check if reserved
  is_reserved := is_reserved_slug(slug_param);
  IF is_reserved THEN
    RETURN QUERY SELECT false, 'reserved'::text;
    RETURN;
  END IF;
  
  -- Check format (basic check, more detailed in app)
  IF NOT (slug_param ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$') THEN
    RETURN QUERY SELECT false, 'invalid_format'::text;
    RETURN;
  END IF;
  
  -- Check if slug exists for a different business
  SELECT COUNT(*) INTO existing_count
  FROM businesses
  WHERE lower(slug) = slug_lower
    AND slug IS NOT NULL
    AND (business_id_param IS NULL OR id != business_id_param);
  
  IF existing_count > 0 THEN
    RETURN QUERY SELECT false, 'taken'::text;
    RETURN;
  END IF;
  
  -- Slug is available
  RETURN QUERY SELECT true, 'available'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION resolve_business_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_slug_with_redirect(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_slug_availability(text, uuid) TO authenticated;
