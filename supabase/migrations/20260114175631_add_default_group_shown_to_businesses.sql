/*
  # Add default group shown to businesses

  1. Changes
    - Add `default_group_shown` column to businesses table to store which menu group should be expanded by default
    - Stores the category name (item_type) that should be open when customers first view the menu
    - Defaults to NULL (no group expanded by default)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'default_group_shown'
  ) THEN
    ALTER TABLE businesses ADD COLUMN default_group_shown text DEFAULT NULL;
  END IF;
END $$;