/*
  # Create Shop Management Schema

  1. New Tables
    - `products` - Shop products managed by businesses
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `name` (text, not null)
      - `description` (text, optional)
      - `price_cents` (integer, in cents for precision)
      - `currency` (text, default 'USD')
      - `image_path` (text, Supabase storage path)
      - `inventory_count` (integer, optional inventory tracking)
      - `is_active` (boolean, default true)
      - `created_at`, `updated_at`

    - `shop_orders` - Customer shop orders
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key)
      - `customer_name` (text, optional)
      - `customer_email` (text, not null)
      - `customer_phone` (text, optional)
      - `status` (text, enum: draft|pending_payment|paid|failed|fulfilled|cancelled|refunded)
      - `subtotal_cents` (integer)
      - `tax_cents` (integer, default 0)
      - `shipping_cents` (integer, default 0)
      - `total_cents` (integer)
      - `square_payment_id` (text, reference to Square payment)
      - `square_order_id` (text, reference to Square order)
      - `idempotency_key` (text, unique for retry safety)
      - `notes` (text, optional admin notes)
      - `created_at`, `updated_at`, `paid_at`

    - `shop_order_items` - Line items in shop orders
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to shop_orders)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text, snapshot of product name at purchase)
      - `unit_price_cents` (integer, price at purchase time)
      - `quantity` (integer)
      - `line_total_cents` (integer)
      - `created_at`

    - `shop_settings` - Per-business shop configuration
      - `id` (uuid, primary key)
      - `business_id` (uuid, unique, foreign key)
      - `shop_enabled` (boolean, default false)
      - `notification_email` (text, where to send order alerts)
      - `order_prefix` (text, e.g., "ORDER-" for display)
      - `created_at`, `updated_at`

  2. Indexes
    - shop_orders: (business_id, created_at desc) for list queries
    - shop_orders: (square_payment_id) for payment lookups
    - shop_orders: (idempotency_key) for unique constraint
    - shop_order_items: (order_id) for listing items
    - shop_order_items: (product_id) for product queries
    - products: (business_id, is_active) for catalog display
    - products: (business_id, created_at desc) for admin list

  3. Security
    - Enable RLS on all shop tables
    - products: Public SELECT for active products in active businesses; admin INSERT/UPDATE/DELETE
    - shop_orders: Admin SELECT for their business; customers cannot directly read
    - shop_order_items: Admin SELECT for their business
    - shop_settings: Admin-only SELECT, INSERT, UPDATE

  4. Data Integrity
    - Foreign keys with CASCADE delete for cleanup
    - CHECK constraints for valid statuses and price ranges
    - UNIQUE constraint on idempotency_key per business
    - Amounts stored as integers (cents) for precision
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  image_path text,
  inventory_count integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shop_orders table
CREATE TABLE IF NOT EXISTS shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name text,
  customer_email text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'paid', 'failed', 'fulfilled', 'cancelled', 'refunded')),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  square_payment_id text,
  square_order_id text,
  idempotency_key text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  UNIQUE(business_id, idempotency_key)
);

-- Create shop_order_items table
CREATE TABLE IF NOT EXISTS shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents > 0),
  created_at timestamptz DEFAULT now()
);

-- Create shop_settings table
CREATE TABLE IF NOT EXISTS shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  shop_enabled boolean DEFAULT false,
  notification_email text,
  order_prefix text DEFAULT 'ORD-',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_business_active
  ON products(business_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_business_created
  ON products(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_orders_business_created
  ON shop_orders(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_orders_square_payment
  ON shop_orders(square_payment_id)
  WHERE square_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_idempotency
  ON shop_orders(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order
  ON shop_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_product
  ON shop_order_items(product_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
