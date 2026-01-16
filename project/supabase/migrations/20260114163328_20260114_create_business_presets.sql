/*
  # Create Business Presets Tables

  1. New Tables
    - `business_presets` - Predefined business profile templates
    - `preset_menu_items` - Default menu items for each preset
    
  2. Description
    - Business presets allow admins to start with pre-configured settings, colors, and menu items
    - Each preset includes business colors, display settings, and sample menu items
    - Users select a preset during signup to initialize their business quickly
    
  3. Security
    - Enable RLS on both tables
    - Public read access for preset data (anyone can view presets during signup)
    - No write access for regular users (only admins can manage presets)
*/

CREATE TABLE IF NOT EXISTS business_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#16a34a',
  text_color text DEFAULT '#ffffff',
  page_background_color text DEFAULT '#f3f4f6',
  hero_banner_bg_color text DEFAULT '#1f2937',
  hero_banner_text_color text DEFAULT '#ffffff',
  hero_message text,
  show_menu boolean DEFAULT true,
  show_reviews boolean DEFAULT true,
  show_events boolean DEFAULT true,
  show_business_info boolean DEFAULT true,
  show_hero_message boolean DEFAULT true,
  orders_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preset_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES business_presets(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  item_type text NOT NULL,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read presets"
  ON business_presets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read preset menu items"
  ON preset_menu_items FOR SELECT
  USING (true);
