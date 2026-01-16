/*
  # Update business presets with show_videos field
  
  1. Changes
    - Set `show_videos` to true for all existing business presets
  
  2. Purpose
    - Ensure all presets have the video gallery section enabled by default
    - Maintain consistency with other visibility toggles
*/

-- Update all existing presets to have show_videos enabled
UPDATE business_presets 
SET show_videos = true 
WHERE show_videos IS NULL OR show_videos = false;