/*
  # Create Mobile Order Solution Schema

  1. New Tables
    - `businesses`
      - `id` (uuid, primary key)
      - `name` (text) - Business name
      - `logo_url` (text) - URL to business logo
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `settings`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key)
      - `admin_email` (text) - Email for order notifications
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `menu_items`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key)
      - `name` (text) - Item name
      - `description` (text) - Item description
      - `image_url` (text) - URL to item image
      - `price` (decimal) - Item price
      - `item_type` (text) - Category/type of item
      - `is_available` (boolean) - Whether item is currently available
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customers`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key)
      - `name` (text) - Customer name
      - `email` (text) - Customer email
      - `total_orders` (integer) - Count of orders placed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `status` (text) - Order status (pending, preparing, ready, completed)
      - `total_amount` (decimal) - Total order amount
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `menu_item_id` (uuid, foreign key)
      - `quantity` (integer) - Quantity ordered
      - `price_at_order` (decimal) - Price at time of order
      - `item_name` (text) - Item name snapshot
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin users
    - Add policies for public read access to menu items and business info
    - Add policies for customers to create orders
*/

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'My Business',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  image_url text,
  price decimal(10,2) NOT NULL,
  item_type text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  total_orders integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  total_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_order decimal(10,2) NOT NULL,
  item_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_business ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for businesses table
CREATE POLICY "Anyone can view business info"
  ON businesses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update business info"
  ON businesses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert business info"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for settings table
CREATE POLICY "Authenticated users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for menu_items table
CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (true);

-- Policies for customers table
CREATE POLICY "Anyone can insert customers"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for orders table
CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for order_items table
CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

-- Insert a default business record
INSERT INTO businesses (name) VALUES ('My Food Truck')
ON CONFLICT DO NOTHING;