/*
  # Add show_videos toggle to businesses table
  
  1. Changes
    - Add `show_videos` boolean column to businesses table (default true)
    - Add `show_videos` boolean column to business_presets table (default true)
  
  2. Purpose
    - Allow businesses to control whether the video gallery section is displayed on their public page
    - Provide consistent visibility controls across all page sections
*/

-- Add show_videos column to businesses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'show_videos'
  ) THEN
    ALTER TABLE businesses ADD COLUMN show_videos boolean DEFAULT true;
  END IF;
END $$;

-- Add show_videos column to business_presets table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_presets' AND column_name = 'show_videos'
  ) THEN
    ALTER TABLE business_presets ADD COLUMN show_videos boolean DEFAULT true;
  END IF;
END $$;