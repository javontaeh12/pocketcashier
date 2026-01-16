/*
  # Create Business Slug History Table

  1. New Table: business_slug_history
    - `id` (uuid, primary key) - Unique identifier
    - `business_id` (uuid, foreign key) - References businesses(id)
    - `old_slug` (text, not null) - Previous slug value
    - `new_slug` (text, not null) - New slug value
    - `changed_at` (timestamptz) - When the change occurred
    - `changed_by_admin_id` (uuid) - Which admin made the change
  
  2. Indexes
    - Index on old_slug for redirect lookups
    - Index on business_id for history queries
    - Composite index on (old_slug, business_id) for efficient lookups
  
  3. Security
    - Enable RLS
    - Public can read (for redirect resolution)
    - Only authenticated admins can write (via trigger)
  
  4. Trigger
    - Automatically log slug changes to history table
*/

-- Create business_slug_history table
CREATE TABLE IF NOT EXISTS business_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by_admin_id uuid REFERENCES auth.users(id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_slug_history_old_slug ON business_slug_history(old_slug);
CREATE INDEX IF NOT EXISTS idx_slug_history_business_id ON business_slug_history(business_id);
CREATE INDEX IF NOT EXISTS idx_slug_history_lookup ON business_slug_history(old_slug, business_id);

-- Enable RLS
ALTER TABLE business_slug_history ENABLE ROW LEVEL SECURITY;

-- Public read access for redirect resolution
CREATE POLICY "Anyone can read slug history for redirects"
  ON business_slug_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only system/authenticated users can insert (via trigger)
CREATE POLICY "System can insert slug history"
  ON business_slug_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically log slug changes
CREATE OR REPLACE FUNCTION log_slug_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if slug actually changed and both old and new are not null
  IF OLD.slug IS DISTINCT FROM NEW.slug 
     AND OLD.slug IS NOT NULL 
     AND NEW.slug IS NOT NULL THEN
    INSERT INTO business_slug_history (
      business_id, 
      old_slug, 
      new_slug, 
      changed_by_admin_id
    ) VALUES (
      NEW.id,
      OLD.slug,
      NEW.slug,
      NEW.created_by_admin_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log slug changes
DROP TRIGGER IF EXISTS trigger_log_slug_change ON businesses;
CREATE TRIGGER trigger_log_slug_change
AFTER UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION log_slug_change();
