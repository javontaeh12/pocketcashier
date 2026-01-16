/*
  # Add Menu Item Groups Table

  1. New Tables
    - `menu_item_groups`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `group_name` (text, the name of the group/item_type)
      - `background_image_url` (text, nullable, URL to the background image)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `menu_item_groups` table
    - Add policy for public read access
    - Add policy for authenticated business owners to manage their groups

  3. Indexes
    - Unique index on business_id + group_name to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS menu_item_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  background_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, group_name)
);

ALTER TABLE menu_item_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view menu item groups"
  ON menu_item_groups FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Business owners can insert their menu item groups"
  ON menu_item_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their menu item groups"
  ON menu_item_groups FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their menu item groups"
  ON menu_item_groups FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Developers can manage all menu item groups"
  ON menu_item_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_accounts
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM developer_accounts
      WHERE user_id = auth.uid()
    )
  );