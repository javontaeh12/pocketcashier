/*
  # Add upcoming section title to businesses

  1. New Columns
    - `upcoming_section_title` (text, nullable)
      - Allows businesses to customize the title of their upcoming events section
      - Defaults to null (will fall back to "Upcoming Events")

  2. Security
    - No RLS changes needed - existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'upcoming_section_title'
  ) THEN
    ALTER TABLE businesses ADD COLUMN upcoming_section_title text DEFAULT NULL;
  END IF;
END $$;
