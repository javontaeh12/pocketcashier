/*
  # Add Four New Business Presets

  1. Added Presets
    - Barber Shop - Professional barber services with warm tones
    - Meal Prep - Health-focused meal prep service
    - Clothing Store - Fashion retail with modern styling
    - Live Sound Production Company - Event production with professional colors
    
  2. Each preset includes
    - Color scheme appropriate for the business type
    - Sample menu items/services for that category
    - Display toggles suited to business type
*/

DO $$
DECLARE
  barber_preset_id uuid;
  mealprep_preset_id uuid;
  clothing_preset_id uuid;
  livesound_preset_id uuid;
BEGIN
  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Barber Shop', 'Professional barbershop with classic styling', 'Services', '#1a1a1a', '#D4AF37', '#ffffff', '#F5F5F5', '#2D2D2D', 'Premium cuts and grooming', true, true, false)
  RETURNING id INTO barber_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Meal Prep', 'Healthy meal prep and nutrition service', 'Food', '#2ECC71', '#27AE60', '#ffffff', '#F0FFF4', '#1E5631', 'Fuel your body, fuel your goals!', true, true, false)
  RETURNING id INTO mealprep_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Clothing Store', 'Fashion retail with modern aesthetic', 'Retail', '#000000', '#FF69B4', '#ffffff', '#FAFAFA', '#1A1A1A', 'Discover your unique style', true, true, false)
  RETURNING id INTO clothing_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Live Sound Production', 'Professional audio and event production', 'Services', '#1a1a2e', '#FF006E', '#ffffff', '#0F3460', '#16213E', 'Professional sound for your event', true, true, true)
  RETURNING id INTO livesound_preset_id;

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (barber_preset_id, 'Standard Haircut', 'Classic men''s cut', 25.00, 'Haircuts', 1),
    (barber_preset_id, 'Fade Haircut', 'Modern fade with line work', 30.00, 'Haircuts', 2),
    (barber_preset_id, 'Hot Shave', 'Traditional straight razor shave', 20.00, 'Shaves', 3),
    (barber_preset_id, 'Beard Trim', 'Beard shaping and grooming', 15.00, 'Grooming', 4),
    (barber_preset_id, 'Haircut + Shave', 'Complete grooming package', 40.00, 'Packages', 5),
    (barber_preset_id, 'Kids Haircut', 'Children''s cut', 20.00, 'Haircuts', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (mealprep_preset_id, 'Protein Pack', 'Grilled chicken, rice, and vegetables', 12.99, 'Meals', 1),
    (mealprep_preset_id, 'Vegan Power Bowl', 'Quinoa, avocado, and seasonal veggies', 11.99, 'Meals', 2),
    (mealprep_preset_id, 'Salmon Deluxe', 'Grilled salmon with sweet potato', 14.99, 'Meals', 3),
    (mealprep_preset_id, 'Breakfast Bundle', '5 days of prepared breakfasts', 49.99, 'Packages', 4),
    (mealprep_preset_id, 'Weekly Meal Plan', '5 lunches + 5 dinners', 89.99, 'Packages', 5),
    (mealprep_preset_id, 'Custom Meal Prep', 'Build your own meal plan', 13.99, 'Custom', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (clothing_preset_id, 'T-Shirts', 'Quality cotton tees', 24.99, 'Tops', 1),
    (clothing_preset_id, 'Jeans', 'Premium denim in multiple styles', 64.99, 'Bottoms', 2),
    (clothing_preset_id, 'Jackets', 'Seasonal outerwear', 89.99, 'Outerwear', 3),
    (clothing_preset_id, 'Dresses', 'Casual and formal options', 54.99, 'Dresses', 4),
    (clothing_preset_id, 'Accessories', 'Belts, scarves, and more', 19.99, 'Accessories', 5),
    (clothing_preset_id, 'Footwear', 'Shoes for every occasion', 79.99, 'Shoes', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (livesound_preset_id, 'Small Event Sound', 'Up to 100 people, 4 hours', 499.99, 'Packages', 1),
    (livesound_preset_id, 'Medium Event Sound', 'Up to 300 people, 6 hours', 899.99, 'Packages', 2),
    (livesound_preset_id, 'Large Event Sound', 'Up to 1000 people, 8 hours', 1499.99, 'Packages', 3),
    (livesound_preset_id, 'DJ Services', 'Music and entertainment', 399.99, 'Services', 4),
    (livesound_preset_id, 'Lighting Package', 'Professional stage lighting', 349.99, 'Services', 5),
    (livesound_preset_id, 'Complete Production', 'Sound, lights, and DJ', 1999.99, 'Packages', 6);

END $$;
