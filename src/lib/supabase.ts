import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token'
  }
});

export type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  page_background_color: string;
  display_name: boolean;
  phone: string | null;
  location: string | null;
  facebook_page_url: string | null;
  instagram_page_url: string | null;
  hero_message: string | null;
  hero_banner_bg_color: string;
  hero_banner_text_color: string;
  orders_enabled: boolean;
  url_slug: string | null;
  owner_name: string | null;
  upcoming_section_title: string | null;
  minimum_order_items: number;
  show_menu: boolean;
  show_reviews: boolean;
  show_events: boolean;
  show_business_info: boolean;
  show_hero_message: boolean;
  show_videos: boolean;
  show_bookings: boolean;
  about_us_text: string | null;
  about_us_image_url: string | null;
  default_group_shown: string | null;
  page_description: string | null;
  menu_section_title: string | null;
  booking_payment_enabled: boolean;
  booking_payment_type: string | null;
  booking_deposit_percentage: number | null;
  section_display_order: string[];
  share_title: string | null;
  share_description: string | null;
  share_image_path: string | null;
  share_image_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MenuItem = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  item_type: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuItemGroup = {
  id: string;
  business_id: string;
  group_name: string;
  background_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  total_orders: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  business_id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  price_at_order: number;
  item_name: string;
  created_at: string;
};

export type PaymentMethods = {
  cash_app?: {
    enabled: boolean;
    handle: string;
  };
  zelle?: {
    enabled: boolean;
    email: string;
    phone: string;
  };
  apple_pay?: {
    enabled: boolean;
    email: string;
  };
  square_pay?: {
    enabled: boolean;
  };
};

export type Settings = {
  id: string;
  business_id: string;
  admin_email: string;
  mailerlite_api_key?: string;
  mailerlite_enabled?: boolean;
  mailerlite_group_id?: string;
  square_application_id?: string | null;
  square_access_token?: string | null;
  square_refresh_token?: string | null;
  square_merchant_id?: string | null;
  square_enabled?: boolean;
  square_connected_at?: string | null;
  payment_methods?: PaymentMethods;
  created_at: string;
  updated_at: string;
};
