/*
  # Create customer reviews table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `customer_name` (text, customer's display name)
      - `review_text` (text, the review content)
      - `created_at` (timestamp, when review was submitted)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for public read access (customers can see all reviews)
    - Add policy for anyone to insert new reviews
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  review_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can submit reviews"
  ON reviews
  FOR INSERT
  TO public
  WITH CHECK (true);
