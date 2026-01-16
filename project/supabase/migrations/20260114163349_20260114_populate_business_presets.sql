/*
  # Populate Business Presets with Sample Categories

  1. Added Presets
    - Coffee Shop - Cafe/coffee themed with warm colors
    - Bakery - Sweet pastry themed with soft colors
    - Restaurant - General dining with classic colors
    - Juice Bar - Health-focused with vibrant colors
    - Catering - Professional catering service
    
  2. Each preset includes
    - Color scheme appropriate for the business type
    - Sample menu items for that category
    - Display toggles suited to business type
*/

DO $$
DECLARE
  coffee_preset_id uuid;
  bakery_preset_id uuid;
  restaurant_preset_id uuid;
  juice_preset_id uuid;
  catering_preset_id uuid;
BEGIN
  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Coffee Shop', 'Perfect for cafes and coffee shops', 'Cafe', '#8B5A3C', '#D2691E', '#ffffff', '#FFF8DC', '#6B4423', 'Start your day with us!', true, true, true)
  RETURNING id INTO coffee_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Bakery', 'Ideal for bakeries and pastry shops', 'Bakery', '#E6B8D7', '#C99AC0', '#2d1b2e', '#FFF5F9', '#D4A5C9', 'Fresh baked every morning', true, true, true)
  RETURNING id INTO bakery_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Restaurant', 'General restaurant setup with classic styling', 'Restaurant', '#1F2937', '#DC2626', '#ffffff', '#F9FAFB', '#111827', 'Join us for an unforgettable meal', true, true, true)
  RETURNING id INTO restaurant_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Juice Bar', 'Health-focused with vibrant tropical colors', 'Health', '#FF6B6B', '#4ECDC4', '#ffffff', '#FFF5E6', '#FF6B6B', 'Get your daily dose of health!', true, true, false)
  RETURNING id INTO juice_preset_id;

  INSERT INTO business_presets (name, description, category, primary_color, secondary_color, text_color, page_background_color, hero_banner_bg_color, hero_message, show_menu, show_reviews, show_events)
  VALUES 
    ('Catering Service', 'Professional catering and event planning', 'Catering', '#2C3E50', '#3498DB', '#ffffff', '#ECF0F1', '#34495E', 'Exceptional catering for your event', true, false, true)
  RETURNING id INTO catering_preset_id;

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (coffee_preset_id, 'Espresso', 'Strong and bold', 3.50, 'Coffee', 1),
    (coffee_preset_id, 'Cappuccino', 'Creamy and smooth', 4.50, 'Coffee', 2),
    (coffee_preset_id, 'Latte', 'Milk-based coffee drink', 4.50, 'Coffee', 3),
    (coffee_preset_id, 'Iced Coffee', 'Refreshing cold coffee', 4.00, 'Cold Drinks', 4),
    (coffee_preset_id, 'Croissant', 'Buttery pastry', 3.50, 'Pastries', 5),
    (coffee_preset_id, 'Bagel', 'Fresh baked daily', 2.50, 'Pastries', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (bakery_preset_id, 'Chocolate Croissant', 'Rich and decadent', 4.00, 'Pastries', 1),
    (bakery_preset_id, 'Sourdough Bread', 'Artisan baked', 5.50, 'Bread', 2),
    (bakery_preset_id, 'Blueberry Muffin', 'Fresh berries inside', 3.75, 'Muffins', 3),
    (bakery_preset_id, 'Cheesecake', 'Homemade delight', 5.50, 'Cakes', 4),
    (bakery_preset_id, 'Macarons', 'Delicate and colorful', 2.50, 'Pastries', 5),
    (bakery_preset_id, 'Cookies', 'Assorted flavors', 2.00, 'Cookies', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (restaurant_preset_id, 'Grilled Salmon', 'Atlantic salmon fillet', 24.99, 'Entrees', 1),
    (restaurant_preset_id, 'Ribeye Steak', 'Premium aged beef', 29.99, 'Entrees', 2),
    (restaurant_preset_id, 'Pasta Primavera', 'Fresh seasonal vegetables', 16.99, 'Entrees', 3),
    (restaurant_preset_id, 'Caesar Salad', 'Classic with house croutons', 11.99, 'Salads', 4),
    (restaurant_preset_id, 'French Fries', 'Golden and crispy', 5.99, 'Sides', 5),
    (restaurant_preset_id, 'Chocolate Cake', 'Decadent layers', 7.99, 'Desserts', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (juice_preset_id, 'Green Detox Juice', 'Spinach, kale, cucumber', 7.99, 'Green Juices', 1),
    (juice_preset_id, 'Orange Sunrise', 'Fresh squeezed citrus', 6.99, 'Orange Juices', 2),
    (juice_preset_id, 'Berry Blast Smoothie', 'Mixed berries and yogurt', 8.99, 'Smoothies', 3),
    (juice_preset_id, 'Tropical Paradise', 'Mango, pineapple, coconut', 8.50, 'Smoothies', 4),
    (juice_preset_id, 'Acai Bowl', 'Topped with granola and fruit', 10.99, 'Bowls', 5),
    (juice_preset_id, 'Protein Shake', 'Muscle-building blend', 9.99, 'Shakes', 6);

  INSERT INTO preset_menu_items (preset_id, name, description, price, item_type, display_order)
  VALUES
    (catering_preset_id, 'Buffet Package', 'Feeds 25 people', 199.99, 'Packages', 1),
    (catering_preset_id, 'Premium Catering', 'Feeds 50 people', 349.99, 'Packages', 2),
    (catering_preset_id, 'Appetizer Platter', '20 pieces assorted', 89.99, 'Appetizers', 3),
    (catering_preset_id, 'Main Course Selection', 'Your choice of 3 entrees', 14.99, 'Per Person', 4),
    (catering_preset_id, 'Dessert Spread', 'Assorted pastries and sweets', 59.99, 'Desserts', 5),
    (catering_preset_id, 'Bar Service', 'Full beverage setup', 99.99, 'Services', 6);

END $$;
