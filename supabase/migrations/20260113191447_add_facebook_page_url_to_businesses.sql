/*
  # Add Facebook Page URL to Businesses

  1. New Columns
    - `facebook_page_url` (text, nullable)
      - Stores the business's Facebook page URL for displaying Like button
  
  2. Security
    - RLS policies automatically apply to existing data
  
  3. Notes
    - Allows admins to customize their Facebook page for the Like button widget
    - Optional field - Like button only displays if this is populated
*/

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_page_url text;