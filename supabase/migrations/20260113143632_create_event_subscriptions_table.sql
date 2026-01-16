/*
  # Create Event Subscriptions Table

  1. New Tables
    - `event_subscriptions` - Stores customer event notifications
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `email` (text)
      - `name` (text, optional)
      - `mailerlite_subscriber_id` (text, optional)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `event_subscriptions` table
    - Anyone can subscribe to event notifications
    - Subscribers can view subscriptions
*/

CREATE TABLE IF NOT EXISTS event_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  mailerlite_subscriber_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to events"
  ON event_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Subscribers can view subscriptions"
  ON event_subscriptions FOR SELECT
  USING (true);

CREATE INDEX idx_event_subscriptions_event_id ON event_subscriptions(event_id);
CREATE INDEX idx_event_subscriptions_email ON event_subscriptions(email);