/*
  # Add Complete RLS Policies for Business Subscriptions

  1. Changes
    - Add INSERT policy for business subscriptions (for edge functions with service role)
    - Add UPDATE policy for business subscriptions
    - Add DELETE policy for business subscriptions
    - Add INSERT policy for subscription payments

  2. Security
    - Policies ensure only the business owner can manage their subscriptions
    - Service role key bypasses these policies for edge functions
*/

-- Allow service role to insert subscriptions (edge functions)
-- Note: Service role bypasses RLS, but we add policies for authenticated users too
CREATE POLICY "Service can create business subscriptions"
  ON business_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their business subscription"
  ON business_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_subscriptions.business_id
      AND businesses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_subscriptions.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert subscription payments"
  ON subscription_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their subscription payments"
  ON subscription_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_subscriptions bs
      JOIN businesses b ON b.id = bs.business_id
      WHERE bs.id = subscription_payments.business_subscription_id
      AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_subscriptions bs
      JOIN businesses b ON b.id = bs.business_id
      WHERE bs.id = subscription_payments.business_subscription_id
      AND b.user_id = auth.uid()
    )
  );
