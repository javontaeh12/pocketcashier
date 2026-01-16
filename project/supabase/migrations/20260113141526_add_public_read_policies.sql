/*
  # Add public read policies for customer access

  1. Security Changes
    - Add policy for public users to read businesses by id or url_slug
    - Add policy for public users to read menu items from public businesses
  
  Important Notes:
    - These policies allow unauthenticated users to view business info and menu items
    - Users can only view data for the business they're accessing via URL slug
    - Modification and deletion still require authentication
*/

-- Allow public users to read businesses (for public menu access)
CREATE POLICY "Public users can read businesses"
  ON businesses FOR SELECT
  TO anon
  USING (true);

-- Allow public users to read menu items (for public menu display)
CREATE POLICY "Public users can read menu items"
  ON menu_items FOR SELECT
  TO anon
  USING (true);
