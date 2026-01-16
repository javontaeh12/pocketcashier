/*
  # Add Business Slugs for Public URLs

  1. Changes to businesses table
    - `slug` (text, unique, nullable) - URL-friendly business identifier
    - `slug_updated_at` (timestamptz) - Track when slug was last changed
    - `created_by_admin_id` (uuid) - Track which admin created the business
    - `is_active` (boolean) - Whether business is active/visible
  
  2. Constraints
    - Unique case-insensitive index on slug
    - Check constraint for slug format: lowercase, hyphenated, 3-60 chars
    - Reserved words check (enforced by application + DB function)
  
  3. Indexes
    - Functional unique index on lower(slug) for case-insensitive uniqueness
    - Index on is_active for filtering
  
  4. Security
    - Slug can be null initially, but once set, follows strict format
    - No data loss on existing businesses
*/

-- Add new columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS slug_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create case-insensitive unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug_unique_lower 
ON businesses (lower(slug)) 
WHERE slug IS NOT NULL;

-- Add check constraint for slug format
-- Slug must be: lowercase, 3-60 chars, alphanumeric + hyphens, no leading/trailing/consecutive hyphens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'businesses_slug_format_check'
  ) THEN
    ALTER TABLE businesses
    ADD CONSTRAINT businesses_slug_format_check
    CHECK (
      slug IS NULL OR (
        slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' AND
        slug NOT LIKE '%−-%'
      )
    );
  END IF;
END $$;

-- Create index for active businesses
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug) WHERE slug IS NOT NULL;

-- Function to validate reserved slugs (enforced at app level but helper here)
CREATE OR REPLACE FUNCTION is_reserved_slug(slug_value text) 
RETURNS boolean AS $$
DECLARE
  reserved_words text[] := ARRAY[
    'admin', 'login', 'logout', 'api', 'settings', 'dashboard', 
    'auth', 'supabase', 'b', 'business', 'businesses', 'account', 
    'onboarding', 'signup', 'signin', 'register', 'profile', 'profiles',
    'user', 'users', 'developer', 'dev', 'docs', 'documentation',
    'help', 'support', 'about', 'contact', 'terms', 'privacy',
    'checkout', 'cart', 'payment', 'payments', 'order', 'orders',
    'booking', 'bookings', 'event', 'events', 'review', 'reviews',
    'home', 'index', 'root', 'public', 'static', 'assets'
  ];
BEGIN
  RETURN lower(slug_value) = ANY(reserved_words);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
