/*
  # Add DELETE and UPDATE policies to reviews table

  1. Changes
    - Add policy allowing authenticated users (admins) to delete reviews for their business
    - Add policy allowing authenticated users (admins) to update reviews for their business
  
  2. Security
    - Only authenticated users can modify reviews
    - Must have access to the business (through user_id join)
*/

-- Allow authenticated admins to delete reviews from their business
CREATE POLICY "Authenticated users can delete reviews from their business"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated admins to update reviews from their business
CREATE POLICY "Authenticated users can update reviews from their business"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );
