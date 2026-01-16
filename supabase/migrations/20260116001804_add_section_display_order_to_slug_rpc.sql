/*
  # Add section_display_order to Slug Resolution RPC

  1. Changes
    - Update `resolve_business_slug()` to return section_display_order field
    - Returns section_display_order as jsonb for proper ordering on public pages

  2. Security
    - Still SECURITY DEFINER to bypass RLS
    - Only public-safe fields exposed
*/

-- Drop and recreate function with new signature
DROP FUNCTION IF EXISTS resolve_business_slug(text);

CREATE OR REPLACE FUNCTION resolve_business_slug(slug_param text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  is_active boolean,
  created_at timestamptz,
  page_description text,
  share_title text,
  share_description text,
  share_image_path text,
  section_display_order jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.is_active,
    b.created_at,
    b.page_description,
    b.share_title,
    b.share_description,
    b.share_image_path,
    b.section_display_order
  FROM businesses b
  WHERE lower(b.slug) = lower(slug_param)
    AND b.slug IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION resolve_business_slug(text) TO anon, authenticated;
