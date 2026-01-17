import { useState, useEffect } from 'react';
import { Package, ShoppingBag, Users, Image, CreditCard, Settings, Home, MessageSquare, Calendar, Star, Megaphone, Info, Palette, Link, Gift, Bot, Film, Menu, X, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MetaTags } from '../../components/MetaTags';
import { AccountInfoCard } from '../../components/AccountInfoCard';
import { MenuItemsTab } from './MenuItemsTab';
import { OrdersTab } from './OrdersTab';
import { CustomersTab } from './CustomersTab';
import { LogoTab } from './LogoTab';
import { PaymentsTab } from './PaymentsTab';
import { SettingsTab } from './SettingsTab';
import { SupportTab } from './SupportTab';
import { EventsTab } from './EventsTab';
import { ReviewsTab } from './ReviewsTab';
import { HeroMessageTab } from './HeroMessageTab';
import { AboutUsTab } from './AboutUsTab';
import { BookingsTab } from './BookingsTab';
import { PresetManagementTab } from './PresetManagementTab';
import { BusinessSlugTab } from './BusinessSlugTab';
import { ReferralsTab } from './ReferralsTab';
import { ChatbotTab } from './ChatbotTab';
import { VideoGalleryTab } from './VideoGalleryTab';
import { ManageShopTab } from './ManageShopTab';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';

type TabType = 'menu' | 'orders' | 'customers' | 'logo' | 'payments' | 'settings' | 'support' | 'events' | 'reviews' | 'hero' | 'about' | 'bookings' | 'presets' | 'page-url' | 'referrals' | 'chatbot' | 'videos' | 'shop';

export function AdminPortal() {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [businessUrl, setBusinessUrl] = useState<string>('/');
  const [businessName, setBusinessName] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { businessId } = useAuth();

  useEffect(() => {
    if (businessId) {
      loadBusinessUrl();
    }
  }, [businessId]);

  const loadBusinessUrl = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from('businesses')
      .select('url_slug, name, slug')
      .eq('id', businessId)
      .maybeSingle();

    if (data) {
      setBusinessName(data.name || '');
      if (data.slug) {
        setBusinessUrl(`/${data.slug}`);
      } else if (data.url_slug) {
        setBusinessUrl(`/${data.url_slug}`);
      } else {
        // Fallback to businessId if no slug is configured
        setBusinessUrl(`/${businessId}`);
      }
    } else {
      // Fallback to businessId if no data found
      setBusinessUrl(`/${businessId}`);
    }
  };


  const tabs = [
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
    { id: 'page-url' as TabType, label: 'Page URL', icon: Link },
    { id: 'referrals' as TabType, label: 'Referrals', icon: Gift },
    { id: 'payments' as TabType, label: 'Payments', icon: CreditCard },
    { id: 'menu' as TabType, label: 'Services', icon: Package },
    { id: 'about' as TabType, label: 'About Us', icon: Info },
    { id: 'presets' as TabType, label: 'Manage Templates', icon: Palette },
    { id: 'orders' as TabType, label: 'Orders', icon: ShoppingBag },
    { id: 'bookings' as TabType, label: 'Bookings', icon: Calendar },
    { id: 'shop' as TabType, label: 'Manage Shop', icon: Store },
    { id: 'customers' as TabType, label: 'Customers', icon: Users },
    { id: 'events' as TabType, label: 'Upcoming', icon: Calendar },
    { id: 'reviews' as TabType, label: 'Reviews', icon: Star },
    { id: 'hero' as TabType, label: 'Hero Message', icon: Megaphone },
    { id: 'logo' as TabType, label: 'Menu Setting', icon: Image },
    { id: 'videos' as TabType, label: 'Video Gallery', icon: Film },
    { id: 'chatbot' as TabType, label: 'AI Chatbot', icon: Bot },
    { id: 'support' as TabType, label: 'Support', icon: MessageSquare },
  ];

  const handleTabSelect = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  return (
    <>
      <MetaTags
        title="Admin Portal - Pocket Cashier"
        description="Manage your menu, orders, customers, and business settings"
      />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            </div>
            <a
              href={businessUrl}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition rounded-lg"
            >
              <Home className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">View Menu</span>
            </a>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`fixed inset-y-0 top-16 left-0 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ease-in-out w-64 z-30 lg:relative lg:top-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isComingSoon = tab.id === 'shop' || tab.id === 'chatbot';
                return (
                  <div key={tab.id} className="relative">
                    <button
                      onClick={() => {
                        if (!isComingSoon) {
                          handleTabSelect(tab.id);
                          setSidebarOpen(false);
                        }
                      }}
                      disabled={isComingSoon}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm relative ${
                        isComingSoon
                          ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-400'
                          : activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                    {isComingSoon && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Coming Soon</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
              <div className="mb-6">
                <AccountInfoCard />
              </div>

              <div className={`bg-white rounded-lg shadow-md p-6 ${activeTab !== 'settings' ? 'admin-tab-pattern' : ''}`}>
                {activeTab === 'menu' && <MenuItemsTab />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'bookings' && <BookingsTab />}
                {activeTab === 'shop' && businessId && <ManageShopTab businessId={businessId} />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'events' && <EventsTab />}
                {activeTab === 'reviews' && <ReviewsTab />}
                {activeTab === 'about' && <AboutUsTab />}
                {activeTab === 'hero' && <HeroMessageTab />}
                {activeTab === 'logo' && <LogoTab />}
                {activeTab === 'videos' && <VideoGalleryTab />}
                {activeTab === 'page-url' && businessId && <BusinessSlugTab businessId={businessId} businessName={businessName} />}
                {activeTab === 'payments' && <PaymentsTab />}
                {activeTab === 'referrals' && businessId && <ReferralsTab businessId={businessId} />}
                {activeTab === 'chatbot' && <ChatbotTab />}
                {activeTab === 'presets' && <PresetManagementTab />}
                {activeTab === 'settings' && <SettingsTab />}
                {activeTab === 'support' && <SupportTab />}
              </div>

              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
