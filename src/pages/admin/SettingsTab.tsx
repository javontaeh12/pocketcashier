import { useEffect, useState } from 'react';
import { Save, Mail, CreditCard, ExternalLink, CheckCircle, AlertCircle, Truck, Instagram, Building2, Palette, Trash2, Megaphone, Eye, EyeOff, Lock, GripVertical } from 'lucide-react';
import { supabase, Settings } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { truncateToLimit, getFieldLimit } from '../../lib/fieldLimits';
import { ApplyPresetModal } from '../../components/ApplyPresetModal';

interface SectionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
}

interface SectionOrder {
  hero_message: string;
  business_info: string;
  menu: string;
  bookings: string;
  shop: string;
  videos: string;
  reviews: string;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mailerliteApiKey, setMailerliteApiKey] = useState('');
  const [mailerliteGroupId, setMailerliteGroupId] = useState('');
  const [mailerliteEnabled, setMailerliteEnabled] = useState(false);
  const [squareApplicationId, setSquareApplicationId] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');
  const [squareConnected, setSquareConnected] = useState(false);
  const [squareMerchantId, setSquareMerchantId] = useState('');
  const [squareConnectedAt, setSquareConnectedAt] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [displayName, setDisplayName] = useState(true);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [instagramPageUrl, setInstagramPageUrl] = useState('');
  const [applePay, setApplePay] = useState(false);
  const [applePayEmail, setApplePayEmail] = useState('');
  const [squarePay, setSquarePay] = useState(false);
  const [zelle, setZelle] = useState(false);
  const [zelleEmail, setZelleEmail] = useState('');
  const [zellePhone, setZellePhone] = useState('');
  const [cashApp, setCashApp] = useState(false);
  const [cashAppHandle, setCashAppHandle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingCountry, setShippingCountry] = useState('US');
  const [shippingPricePerMile, setShippingPricePerMile] = useState('0');
  const [menuSectionTitle, setMenuSectionTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [showReviews, setShowReviews] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showBookings, setShowBookings] = useState(false);
  const [showVideos, setShowVideos] = useState(true);
  const [showBusinessInfo, setShowBusinessInfo] = useState(true);
  const [showHeroMessage, setShowHeroMessage] = useState(true);
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(['hero_message', 'business_info', 'menu', 'bookings', 'shop', 'videos', 'reviews']);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [customerDataRetentionDays, setCustomerDataRetentionDays] = useState(14);
  const { businessId, signOut } = useAuth();


  useEffect(() => {
    if (businessId) {
      loadSettings();
    }
  }, [businessId]);

  const loadSettings = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (data) {
        setSettings(data);
        setAdminEmail(data.admin_email);
        setMailerliteApiKey(data.mailerlite_api_key || '');
        setMailerliteGroupId(data.mailerlite_group_id || '');
        setMailerliteEnabled(data.mailerlite_enabled || false);
        setSquareApplicationId(data.square_application_id || '');
        setSquareConnected(data.square_enabled || false);
        setSquareMerchantId(data.square_merchant_id || '');
        setSquareConnectedAt(data.square_connected_at || '');
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, owner_name, url_slug, display_name, phone, location, facebook_page_url, instagram_page_url, page_description, shipping_enabled, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country, shipping_price_per_mile, menu_section_title, square_location_id, show_menu, show_reviews, show_events, show_bookings, show_videos, show_business_info, show_hero_message, orders_enabled, chatbot_enabled, section_display_order, customer_data_retention_days')
        .eq('id', businessId)
        .maybeSingle();

      if (businessData) {
        setBusinessName(businessData.name);
        setOwnerName(businessData.owner_name || '');
        setDisplayName(businessData.display_name ?? true);
        setPhone(businessData.phone || '');
        setLocation(businessData.location || '');
        setFacebookPageUrl(businessData.facebook_page_url || '');
        setInstagramPageUrl(businessData.instagram_page_url || '');
        setPageDescription(businessData.page_description || '');
        setShippingEnabled(businessData.shipping_enabled || false);
        setSquareLocationId(businessData.square_location_id || '');
        setShippingAddress(businessData.shipping_address || '');
        setShippingCity(businessData.shipping_city || '');
        setShippingState(businessData.shipping_state || '');
        setShippingZip(businessData.shipping_zip || '');
        setShippingCountry(businessData.shipping_country || 'US');
        setShippingPricePerMile(businessData.shipping_price_per_mile?.toString() || '0');
        setMenuSectionTitle(businessData.menu_section_title || '');
        setShowMenu(businessData.show_menu ?? true);
        setShowReviews(businessData.show_reviews ?? true);
        setShowEvents(businessData.show_events ?? true);
        setShowBookings(businessData.show_bookings ?? false);
        setShowVideos(businessData.show_videos ?? true);
        setShowBusinessInfo(businessData.show_business_info ?? true);
        setShowHeroMessage(businessData.show_hero_message ?? true);
        setOrdersEnabled(businessData.orders_enabled ?? true);
        setChatbotEnabled(businessData.chatbot_enabled ?? false);
        setCustomerDataRetentionDays(businessData.customer_data_retention_days || 14);
        if (businessData.section_display_order) {
          setSectionOrder(businessData.section_display_order);
        }
      }

      const { data: shopSettingsData } = await supabase
        .from('shop_settings')
        .select('shop_enabled')
        .eq('business_id', businessId)
        .maybeSingle();

      if (shopSettingsData) {
        setShopEnabled(shopSettingsData.shop_enabled ?? false);
      }

      if (data?.payment_methods) {
        setApplePay(data.payment_methods.apple_pay?.enabled || false);
        setApplePayEmail(data.payment_methods.apple_pay?.email || '');
        setSquarePay(data.payment_methods.square_pay?.enabled || false);
        setZelle(data.payment_methods.zelle?.enabled || false);
        setZelleEmail(data.payment_methods.zelle?.email || '');
        setZellePhone(data.payment_methods.zelle?.phone || '');
        setCashApp(data.payment_methods.cash_app?.enabled || false);
        setCashAppHandle(data.payment_methods.cash_app?.handle || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {

      if (settings) {
        const { error } = await supabase
          .from('settings')
          .update({
            admin_email: adminEmail,
            mailerlite_api_key: mailerliteApiKey || null,
            mailerlite_enabled: mailerliteEnabled,
            mailerlite_group_id: mailerliteGroupId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({
            business_id: businessId,
            admin_email: adminEmail,
            mailerlite_api_key: mailerliteApiKey || null,
            mailerlite_enabled: mailerliteEnabled,
            mailerlite_group_id: mailerliteGroupId || null,
            square_application_id: squareApplicationId || null,
            square_enabled: false
          });

        if (error) throw error;
      }

      loadSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessName = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    if (!businessName.trim()) {
      alert('Please enter a business name');
      return;
    }

    if (!ownerName.trim()) {
      alert('Please enter your name');
      return;
    }

    const limitedName = truncateToLimit(businessName, 'BUSINESS_NAME');

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: limitedName,
          owner_name: ownerName.trim(),
          display_name: displayName,
          phone: phone || null,
          location: location || null,
          facebook_page_url: facebookPageUrl || null,
          instagram_page_url: instagramPageUrl || null,
          menu_section_title: menuSectionTitle || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      setBusinessName(limitedName);
      alert('Business information saved successfully!');
    } catch (error) {
      console.error('Error saving business information:', error);
      alert('Failed to save business information');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentMethods = async () => {
    if (!settings) {
      alert('Settings not found. Please log in again.');
      return;
    }

    if (applePay && !applePayEmail) {
      alert('Please enter your Apple Pay email address');
      return;
    }

    if (zelle && !zelleEmail && !zellePhone) {
      alert('Please enter at least one contact method for Zelle (email or phone)');
      return;
    }

    if (cashApp && !cashAppHandle) {
      alert('Please enter your Cash App handle (e.g., $YourHandle)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          payment_methods: {
            apple_pay: {
              enabled: applePay,
              email: applePayEmail
            },
            square_pay: {
              enabled: squarePay
            },
            zelle: {
              enabled: zelle,
              email: zelleEmail,
              phone: zellePhone
            },
            cash_app: {
              enabled: cashApp,
              handle: cashAppHandle
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      alert('Payment methods saved successfully!');
    } catch (error) {
      console.error('Error saving payment methods:', error);
      alert('Failed to save payment methods');
    } finally {
      setSaving(false);
    }
  };


  const handleSavePageDescription = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          page_description: pageDescription || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      alert('Page description saved successfully!');
    } catch (error) {
      console.error('Error saving page description:', error);
      alert('Failed to save page description');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    if (shippingEnabled) {
      if (!shippingAddress.trim() || !shippingCity.trim() || !shippingState.trim() || !shippingZip.trim()) {
        alert('Please fill in all shipping address fields');
        return;
      }
      if (parseFloat(shippingPricePerMile) < 0) {
        alert('Price per mile must be a positive number');
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          shipping_enabled: shippingEnabled,
          shipping_address: shippingAddress.trim() || null,
          shipping_city: shippingCity.trim() || null,
          shipping_state: shippingState.trim() || null,
          shipping_zip: shippingZip.trim() || null,
          shipping_country: shippingCountry,
          shipping_price_per_mile: parseFloat(shippingPricePerMile) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      alert('Shipping settings saved successfully!');
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      alert('Failed to save shipping settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibilityToggles = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          show_menu: showMenu,
          show_reviews: showReviews,
          show_events: showEvents,
          show_bookings: showBookings,
          show_videos: showVideos,
          show_business_info: showBusinessInfo,
          show_hero_message: showHeroMessage,
          orders_enabled: ordersEnabled,
          section_display_order: sectionOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (businessError) throw businessError;

      const { data: existingShopSettings } = await supabase
        .from('shop_settings')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (existingShopSettings) {
        const { error: shopError } = await supabase
          .from('shop_settings')
          .update({
            shop_enabled: shopEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('business_id', businessId);

        if (shopError) throw shopError;
      } else {
        const { error: shopError } = await supabase
          .from('shop_settings')
          .insert({
            business_id: businessId,
            shop_enabled: shopEnabled
          });

        if (shopError) throw shopError;
      }

      alert('Section visibility settings saved successfully!');
    } catch (error) {
      console.error('Error saving visibility settings:', error);
      alert('Failed to save visibility settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = sectionOrder.indexOf(draggedItem);
    const targetIndex = sectionOrder.indexOf(targetId);

    const newOrder = [...sectionOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setSectionOrder(newOrder);
    setDraggedItem(null);
  };

  const getSectionInfo = (sectionId: string) => {
    const sectionMap: Record<string, { label: string; icon: React.ReactNode }> = {
      hero_message: { label: 'Hero Message Banner', icon: <Eye className="h-5 w-5" /> },
      business_info: { label: 'Business Info Banner', icon: <Eye className="h-5 w-5" /> },
      menu: { label: 'Menu/Services Section', icon: <Eye className="h-5 w-5" /> },
      bookings: { label: 'Bookings Section', icon: <Eye className="h-5 w-5" /> },
      shop: { label: 'Shop Section', icon: <Eye className="h-5 w-5" /> },
      videos: { label: 'Video Gallery Section', icon: <Eye className="h-5 w-5" /> },
      reviews: { label: 'Reviews Section', icon: <Eye className="h-5 w-5" /> },
    };
    return sectionMap[sectionId];
  };

  const getSectionVisibility = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'hero_message': return showHeroMessage;
      case 'business_info': return showBusinessInfo;
      case 'menu': return showMenu;
      case 'bookings': return showBookings;
      case 'shop': return shopEnabled;
      case 'videos': return showVideos;
      case 'reviews': return showReviews;
      default: return false;
    }
  };

  const handleSaveCustomerRetention = async () => {
    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          customer_data_retention_days: customerDataRetentionDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      alert(`Customer data will be retained for ${customerDataRetentionDays} day(s). Old customer records will be automatically deleted after this period.`);
    } catch (error) {
      console.error('Error saving customer retention settings:', error);
      alert('Failed to save customer retention settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100">
                <svg className="h-6 w-6 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-900">Initializing Settings</h3>
              <p className="mt-2 text-sm text-blue-700">
                Your settings are being prepared. This may take a moment on the initial load. Please wait...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="max-w-2xl space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Business Information</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Update your business name. This appears on your ordering page and in customer communications.
          </p>

          <div className="mb-4">
            <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Your name as the business owner/admin
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={getFieldLimit('BUSINESS_NAME')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="My Coffee Shop"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              {businessName.length}/{getFieldLimit('BUSINESS_NAME')} characters
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={displayName}
                onChange={(e) => setDisplayName(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Display business name on website</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Turn off to hide your business name from the public menu page
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="menuSectionTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Services/Menu Section Title (Optional)
            </label>
            <input
              type="text"
              id="menuSectionTitle"
              value={menuSectionTitle}
              onChange={(e) => setMenuSectionTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Services"
            />
            <p className="text-xs text-gray-500 mt-2">
              Customize the title of your menu section. Leave empty to use "Services"
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
              <p className="text-xs text-gray-500 mt-2">
                Will be displayed as a clickable link on your menu page
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location/Address (Optional)
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main St, City, State 12345"
              />
              <p className="text-xs text-gray-500 mt-2">
                Displayed on your menu page below your business name
              </p>
            </div>

            <div>
              <label htmlFor="facebookPageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Page URL (Optional)
              </label>
              <input
                type="url"
                id="facebookPageUrl"
                value={facebookPageUrl}
                onChange={(e) => setFacebookPageUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.facebook.com/yourpage"
              />
              <p className="text-xs text-gray-500 mt-2">
                Facebook Like button will appear on your menu page if provided
              </p>
            </div>

            <div>
              <label htmlFor="instagramPageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Instagram Page URL (Optional)
              </label>
              <input
                type="url"
                id="instagramPageUrl"
                value={instagramPageUrl}
                onChange={(e) => setInstagramPageUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.instagram.com/yourpage"
              />
              <p className="text-xs text-gray-500 mt-2">
                Instagram button will appear on your menu page if provided
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveBusinessName}
            disabled={saving || !businessName || !ownerName}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Business Information'}</span>
          </button>
        </div>

        <div className="bg-cyan-50 border-l-4 border-cyan-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Megaphone className="h-5 w-5 text-cyan-600" />
            <h3 className="text-lg font-semibold text-cyan-900">Page Description for Social Sharing</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Customize the description that appears when your business link is shared on social media platforms like Facebook, Twitter, and WhatsApp. This text is displayed in the link preview.
          </p>

          <div className="mb-4">
            <label htmlFor="pageDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Page Description (Optional)
            </label>
            <textarea
              id="pageDescription"
              value={pageDescription}
              onChange={(e) => setPageDescription(e.target.value)}
              maxLength={160}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 resize-none"
              placeholder="e.g., Order delicious food online from our menu. Fast service and fresh ingredients!"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-2">
              {pageDescription.length}/160 characters (recommended for optimal display)
            </p>
          </div>

          <button
            onClick={handleSavePageDescription}
            disabled={saving}
            className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Page Description'}</span>
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Palette className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">Apply Business Template</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Choose a pre-designed template to instantly update your business colors, branding settings, and add sample menu items. Perfect for quickly refreshing your business look or getting started with a professional design.
          </p>

          <button
            onClick={() => setPresetModalOpen(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition flex items-center space-x-2"
          >
            <Palette className="h-5 w-5" />
            <span>Browse Templates</span>
          </button>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Eye className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Section Visibility & Order Controls</h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Control which sections appear on your public business page and arrange them in your preferred order. Drag items to reorder them—this is how they'll display on your website. Turn off sections you don't need.
          </p>

          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Current Display Order</p>
            {sectionOrder.map((sectionId) => {
              const info = getSectionInfo(sectionId);
              const isVisible = getSectionVisibility(sectionId);
              if (!info) return null;

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sectionId)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, sectionId)}
                  className={`bg-white p-4 rounded-lg border-2 transition cursor-move ${
                    draggedItem === sectionId
                      ? 'border-blue-400 bg-blue-50 opacity-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 flex-grow">{info.label}</span>
                    {isVisible ? (
                      <Eye className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">Section Toggles</p>
            <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {ordersEnabled ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Accept Orders</span>
                    <p className="text-xs text-gray-500">Enable order placement for customers</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ordersEnabled}
                  onChange={(e) => setOrdersEnabled(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showMenu ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Menu/Services Section</span>
                    <p className="text-xs text-gray-500">Display your products and services</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showMenu}
                  onChange={(e) => setShowMenu(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showBookings ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Bookings Section</span>
                    <p className="text-xs text-gray-500">Allow customers to book appointments</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showBookings}
                  onChange={(e) => setShowBookings(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {shopEnabled ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Shop Section</span>
                    <p className="text-xs text-gray-500">Display your online store products</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shopEnabled}
                  onChange={(e) => setShopEnabled(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showVideos ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Video Gallery Section</span>
                    <p className="text-xs text-gray-500">Display your video content</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showVideos}
                  onChange={(e) => setShowVideos(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showReviews ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Reviews Section</span>
                    <p className="text-xs text-gray-500">Show customer reviews and testimonials</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showReviews}
                  onChange={(e) => setShowReviews(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 opacity-60">
              <label className="flex items-center justify-between cursor-not-allowed group">
                <div className="flex items-center space-x-3">
                  {showEvents ? (
                    <Eye className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Events Section</span>
                    <p className="text-xs text-gray-500">Display upcoming events and schedules</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showEvents}
                  disabled={true}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 opacity-60">
              <label className="flex items-center justify-between cursor-not-allowed group">
                <div className="flex items-center space-x-3">
                  {chatbotEnabled ? (
                    <Eye className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">AI Chatbot</span>
                    <p className="text-xs text-gray-500">Enable AI-powered customer support chat</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={chatbotEnabled}
                  disabled={true}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showBusinessInfo ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Business Info Banner</span>
                    <p className="text-xs text-gray-500">Show business name, phone, and location</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showBusinessInfo}
                  onChange={(e) => setShowBusinessInfo(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  {showHeroMessage ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Hero Message Banner</span>
                    <p className="text-xs text-gray-500">Display your promotional banner message</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showHeroMessage}
                  onChange={(e) => setShowHeroMessage(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            </div>
          </div>

          <button
            onClick={handleSaveVisibilityToggles}
            disabled={saving}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center space-x-2 transition"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Visibility & Order Settings'}</span>
          </button>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-600 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Mail className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-900">MailerLite Integration</h3>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailerliteEnabled}
                  onChange={(e) => setMailerliteEnabled(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable MailerLite Lead Capture</span>
              </label>
              <p className="text-sm text-gray-500">
                Automatically add customers from orders to your MailerLite subscriber list.
              </p>
            </div>

            {mailerliteEnabled && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  MailerLite API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={mailerliteApiKey}
                  onChange={(e) => setMailerliteApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your MailerLite API key"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Find this in your MailerLite account settings under Integration.
                </p>
              </div>

              <div>
                <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-2">
                  MailerLite Group ID (optional)
                </label>
                <input
                  type="text"
                  id="groupId"
                  value={mailerliteGroupId}
                  onChange={(e) => setMailerliteGroupId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123456"
                />
                <p className="text-sm text-gray-500 mt-2">
                  If specified, customers will be added to this group.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !adminEmail || (mailerliteEnabled && !mailerliteApiKey)}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        <div className="bg-emerald-50 border-l-4 border-emerald-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-emerald-900">Square Location Setup</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Square payment processing is managed at the system level. Enter your Square Location ID below to enable payments for your business.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Configure Your Location ID</h4>
            <p className="text-sm text-blue-700 mb-3">
              Find your location ID in your <a href="https://squareup.com/dashboard/locations" target="_blank" rel="noopener noreferrer" className="underline font-medium">Square Dashboard</a> under Locations settings.
            </p>
            <div className="mb-3">
              <label htmlFor="squareLocationId" className="block text-sm font-medium text-gray-700 mb-2">
                Square Location ID
              </label>
              <input
                type="text"
                id="squareLocationId"
                value={squareLocationId}
                onChange={(e) => setSquareLocationId(e.target.value)}
                maxLength={getFieldLimit('SQUARE_LOCATION_ID')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="L..."
              />
              <p className="text-xs text-gray-500 mt-2">
                {squareLocationId.length}/{getFieldLimit('SQUARE_LOCATION_ID')} characters
              </p>
            </div>
            <button
              onClick={handleSaveSquareLocationId}
              disabled={saving || !squareLocationId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Location ID'}
            </button>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Payment Options</h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Configure which payment methods you'd like to offer your customers at checkout.
          </p>

          <div className="space-y-6">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={applePay}
                  onChange={(e) => setApplePay(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Apple Pay</span>
              </label>
              {applePay && (
                <div className="ml-7 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label htmlFor="applePayEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Apple Pay Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    id="applePayEmail"
                    value={applePayEmail}
                    onChange={(e) => setApplePayEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="your-apple-id@example.com"
                    required={applePay}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Your Apple Pay email address where customers can send payments
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={cashApp}
                  onChange={(e) => setCashApp(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Cash App</span>
              </label>
              {cashApp && (
                <div className="ml-7 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label htmlFor="cashAppHandle" className="block text-sm font-medium text-gray-700 mb-2">
                    Cash App Handle <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="cashAppHandle"
                    value={cashAppHandle}
                    onChange={(e) => setCashAppHandle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="$YourCashTag"
                    required={cashApp}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Your Cash App $Cashtag (e.g., $YourName)
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={zelle}
                  onChange={(e) => setZelle(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Zelle</span>
              </label>
              {zelle && (
                <div className="ml-7 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <label htmlFor="zelleEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Zelle Email
                    </label>
                    <input
                      type="email"
                      id="zelleEmail"
                      value={zelleEmail}
                      onChange={(e) => setZelleEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="zelle@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="zellePhone" className="block text-sm font-medium text-gray-700 mb-2">
                      Zelle Phone Number
                    </label>
                    <input
                      type="tel"
                      id="zellePhone"
                      value={zellePhone}
                      onChange={(e) => setZellePhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Provide at least one contact method (email or phone) for Zelle payments
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={squarePay}
                  onChange={(e) => setSquarePay(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Square Pay</span>
                <span className="text-xs text-gray-500">(requires Square connection below)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSavePaymentMethods}
            disabled={saving}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Payment Options'}</span>
          </button>
        </div>

        <div className="bg-orange-50 border-l-4 border-orange-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Truck className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Shipping Settings</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Configure shipping options for delivery orders. When enabled, shipping costs will be calculated based on distance from your location to the customer.
          </p>

          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shippingEnabled}
                onChange={(e) => setShippingEnabled(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable shipping for orders</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Turn on to offer delivery/shipping options at checkout
            </p>
          </div>

          {shippingEnabled && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                  required={shippingEnabled}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="shippingCity"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                    required={shippingEnabled}
                  />
                </div>

                <div>
                  <label htmlFor="shippingState" className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="shippingState"
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="State"
                    required={shippingEnabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shippingZip" className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="shippingZip"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                    required={shippingEnabled}
                  />
                </div>

                <div>
                  <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    id="shippingCountry"
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pricePerMile" className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Mile ($) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="pricePerMile"
                  min="0"
                  step="0.01"
                  value={shippingPricePerMile}
                  onChange={(e) => setShippingPricePerMile(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1.50"
                  required={shippingEnabled}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Shipping cost will be calculated as: distance (miles) × price per mile
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveShipping}
            disabled={saving}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Shipping Settings'}</span>
          </button>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Customer Data Retention</h3>

          <p className="text-sm text-gray-600 mb-4">
            Control how long customer information is stored in your system. Customer records older than the selected period will be automatically deleted to protect privacy.
          </p>

          <div className="mb-6">
            <label htmlFor="retentionDays" className="block text-sm font-medium text-gray-700 mb-3">
              Keep customer data for:
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                id="retentionDays"
                min="1"
                max="14"
                value={customerDataRetentionDays}
                onChange={(e) => setCustomerDataRetentionDays(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 min-w-20 text-center">
                <span className="text-lg font-bold text-blue-600">{customerDataRetentionDays}</span>
                <span className="text-xs text-gray-500 ml-1">{customerDataRetentionDays === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="text-gray-500">
                <span className="font-medium">1 day</span>
                <p>Most private</p>
              </div>
              <div className="text-gray-500 text-center">
                <span className="font-medium">7 days</span>
                <p>Recommended</p>
              </div>
              <div className="text-gray-500 text-right">
                <span className="font-medium">14 days</span>
                <p>Default</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">How it works:</span> Customer records will be automatically deleted {customerDataRetentionDays} day{customerDataRetentionDays !== 1 ? 's' : ''} after their last interaction (order, booking, etc.). This helps protect customer privacy and reduce data storage.
            </p>
          </div>

          <button
            onClick={handleSaveCustomerRetention}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Retention Settings'}</span>
          </button>
        </div>

        <div className="bg-violet-50 border-l-4 border-violet-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-violet-900 mb-4">Notification Settings</h3>

          <div className="mb-6">
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email Address
            </label>
            <input
              type="email"
              id="adminEmail"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
            />
            <p className="text-sm text-gray-500 mt-2">
              This email will receive notifications when new orders are placed.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !adminEmail}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Email notifications are sent using Resend. Make sure you have configured your Resend API key in the edge function.
          </p>
        </div>

        <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Delete Account</h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Permanently delete your account and all associated business data. This action cannot be undone.
          </p>

          <div className="mb-4 bg-red-100 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-2">This will delete:</p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Your account and login credentials</li>
              <li>Your business profile and all settings</li>
              <li>All menu items and inventory</li>
              <li>All orders and customer data</li>
              <li>All stored images and files</li>
            </ul>
          </div>

          <div className="mb-6">
            <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm permanently deleting your account:
            </label>
            <input
              type="text"
              id="deleteConfirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount || deleteConfirmation !== 'DELETE'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <Trash2 className="h-5 w-5" />
            <span>{deletingAccount ? 'Deleting...' : 'Delete Account Permanently'}</span>
          </button>
        </div>
      </div>

      <ApplyPresetModal
        isOpen={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        businessId={businessId || ''}
        onSuccess={() => {
          loadSettings();
        }}
      />
    </div>
  );

  async function handleDisconnectSquare() {
    if (!settings) return;
    if (!confirm('Are you sure you want to disconnect your Square account?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          square_access_token: null,
          square_refresh_token: null,
          square_merchant_id: null,
          square_enabled: false,
          square_connected_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      loadSettings();
      alert('Square account disconnected successfully!');
    } catch (error) {
      console.error('Error disconnecting Square:', error);
      alert('Failed to disconnect Square account');
    } finally {
      setSaving(false);
    }
  }

  function getSquareAuthUrl() {
    if (!squareApplicationId) {
      return '#';
    }
    const redirectUri = `${window.location.origin}/square-callback`;
    const scopes = [
      'MERCHANT_PROFILE_READ',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'ORDERS_READ',
      'ORDERS_WRITE'
    ].join('%20');

    return `https://connect.squareup.com/oauth2/authorize?client_id=${squareApplicationId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  }

  async function handleSaveSquareAppId() {
    if (!settings) return;
    if (!squareApplicationId) {
      alert('Please enter your Square Application ID');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          square_application_id: squareApplicationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 500));
      await loadSettings();
      alert('Square Application ID saved successfully! The Connect button should now be visible.');
    } catch (error) {
      console.error('Error saving Square Application ID:', error);
      alert('Failed to save Square Application ID');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSquareLocationId() {
    if (!businessId) return;
    if (!squareLocationId) {
      alert('Please enter your Square Location ID');
      return;
    }

    const limitedLocationId = truncateToLimit(squareLocationId, 'SQUARE_LOCATION_ID');

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          square_location_id: limitedLocationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      loadSettings();
      alert('Square Location ID saved successfully! You can now accept payments.');
    } catch (error) {
      console.error('Error saving Square Location ID:', error);
      alert('Failed to save Square Location ID');
    } finally {
      setSaving(false);
    }
  }

  function getSquareEnvironment() {
    if (!squareApplicationId) return null;
    if (squareApplicationId.startsWith('sandbox-')) {
      return 'sandbox';
    }
    return 'production';
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    if (!window.confirm('This action cannot be undone. Your account, business, and all associated data will be permanently deleted. Are you absolutely sure?')) {
      return;
    }

    setDeletingAccount(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setDeletingAccount(false);
    }
  }
}
