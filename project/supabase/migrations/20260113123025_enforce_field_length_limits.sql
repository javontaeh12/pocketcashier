/*
  # Enforce 45-character field length limits

  1. Changes
    - Add CHECK constraint to `url_slug` column (45 chars max)
    - Add CHECK constraint to `square_location_id` column (45 chars max)
    
  2. Security
    - Prevents any insertion or update exceeding 45 characters
    - Database-level enforcement as final safety layer
    - Character length validation: char_length(column_name) <= 45

  3. Notes
    - CHECK constraints work at database level
    - Combined with client-side and application-level validation
    - All three layers ensure no value can bypass the limit
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'url_slug_max_length' AND table_name = 'businesses'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT url_slug_max_length CHECK (char_length(url_slug) <= 45);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'square_location_id_max_length' AND table_name = 'settings'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT square_location_id_max_length CHECK (char_length(square_location_id) <= 45);
  END IF;
END $$;
