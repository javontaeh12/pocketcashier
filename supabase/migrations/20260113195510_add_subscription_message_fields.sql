/*
  # Add subscription message customization to businesses table

  1. New Columns
    - `subscription_message_title` (text) - Custom title for subscription modal
    - `subscription_message_body` (text) - Custom body/description text
    - `subscription_button_text` (text) - Custom button label

  2. Details
    - Allow businesses to customize the subscription popup messaging
    - Fields have default values for backward compatibility
    - Displayed to customers when they click "Subscribe for Notifications"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_message_title'
  ) THEN
    ALTER TABLE businesses ADD COLUMN subscription_message_title text DEFAULT 'Stay Updated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_message_body'
  ) THEN
    ALTER TABLE businesses ADD COLUMN subscription_message_body text DEFAULT 'Subscribe to receive notifications about our latest offers and updates.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_button_text'
  ) THEN
    ALTER TABLE businesses ADD COLUMN subscription_button_text text DEFAULT 'Subscribe to Notifications';
  END IF;
END $$;