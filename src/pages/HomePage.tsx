import { useEffect, useRef, useState } from 'react';
import { Minus, Trash2, Settings, ChevronLeft, ChevronRight, Calendar, Facebook, Bell, Instagram as InstagramIcon, Info, Gift, MapPin } from 'lucide-react';
import { supabase, Business, MenuItem } from '../lib/supabase';
import { CartProvider, useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { EventsDisplay } from '../components/EventsDisplay';
import { ReviewsDisplay } from '../components/ReviewsDisplay';
import { UpcomingEventsDisplay } from '../components/UpcomingEventsDisplay';
import { PaginatedMenuDisplay } from '../components/PaginatedMenuDisplay';
import { ReviewsSection } from '../components/ReviewsSection';
import { VideoSection } from '../components/VideoSection';
import { MetaTags } from '../components/MetaTags';
import { Footer } from '../components/Footer';
import { AboutUsModal } from '../components/AboutUsModal';
import { BookingForm } from '../components/BookingForm';
import { BookingCalendarModal } from '../components/BookingCalendarModal';
import { ReferralModal } from '../components/ReferralModal';
import { ChatWidget } from '../components/ChatWidget';
import { DirectionsModal } from '../components/DirectionsModal';
import { ShopCartProvider, useShopCart } from '../contexts/ShopCartContext';
import { ShopDisplay } from '../components/ShopDisplay';
import { ShopCheckout } from '../components/ShopCheckout';

interface HomePageProps {
  onCheckout: () => void;
  businessId?: string;
  shareUrl?: string;
}

interface ShopSettings {
  shop_enabled: boolean;
}

function HomePageContent({ onCheckout, businessId: overriddenBusinessId, shareUrl }: HomePageProps) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showShopCheckout, setShowShopCheckout] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<MenuItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMenuInView, setIsMenuInView] = useState(true);
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuSectionRef = useRef<HTMLDivElement | null>(null);
  const { cart, addToCart, updateQuantity, removeFromCart, totalAmount } = useCart();
  const { user, businessId: authBusinessId } = useAuth();
  const businessId = overriddenBusinessId || authBusinessId;
  const shopCart = useShopCart();

  const scroll = (type: string, direction: 'left' | 'right') => {
    const container = scrollContainerRefs.current[type];
    if (container) {
      const scrollAmount = 320;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleFacebookShare = async () => {
    const urlToShare = shareUrl || window.location.href;

    await navigator.clipboard.writeText(urlToShare);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const facebookAppLink = `fb://share/?link=${encodeURIComponent(urlToShare)}`;
    const facebookWebLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;

    if (isMobile) {
      window.location.href = facebookAppLink;
    } else {
      window.open(facebookWebLink, 'facebook-share', 'width=580,height=400');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    if (businessId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!menuSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsMenuInView(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(menuSectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [menuItems]);

  const loadData = async () => {
    if (!businessId) return;

    try {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      setBusiness(businessData);

      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('item_type');

      setMenuItems(itemsData || []);

      const { data: shopSettingsData } = await supabase
        .from('shop_settings')
        .select('shop_enabled')
        .eq('business_id', businessId)
        .maybeSingle();

      setShopSettings(shopSettingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.item_type]) {
      acc[item.item_type] = [];
    }
    acc[item.item_type].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <>
        <MetaTags />
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      </>
    );
  }

  if (!businessId) {
    return (
      <>
        <MetaTags />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <Settings className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h1>
            <p className="text-gray-600 mb-6">
              Please log in to the admin portal to set up your menu and start taking orders.
            </p>
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'admin';
                window.location.reload();
              }}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Go to Admin Portal
            </a>
          </div>
        </div>
      </>
    );
  }

  const primaryColor = business?.primary_color || '#2563eb';
  const secondaryColor = business?.secondary_color || '#16a34a';
  const textColor = business?.text_color || '#ffffff';
  const pageBackgroundColor = business?.page_background_color || '#f3f4f6';
  const heroBannerBgColor = business?.hero_banner_bg_color || '#1f2937';
  const heroBannerTextColor = business?.hero_banner_text_color || '#ffffff';

  return (
    <>
      <MetaTags
        title={business ? `${business.name} - Pocket Cashier` : 'Pocket Cashier - Business Suite'}
        description={business?.page_description || 'Business Suite'}
        image={business?.logo_url}
        imageAlt={business?.name ? `${business.name} Logo` : 'Business Logo'}
        url={window.location.href}
      />
      <div className="min-h-screen" style={{ backgroundColor: pageBackgroundColor }}>
        <header
        className="bg-white relative overflow-visible border-2 border-black h-auto"
        style={business?.logo_url ? {
          backgroundImage: `url(${business.logo_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(255, 255, 255, 0.5)'
        } : {}}
      >
        <div className="absolute top-4 right-4 z-20">
          <a
            href="#admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-sm"
            title="Admin Portal"
          >
            <Settings className="h-5 w-5" />
            <span>Admin</span>
          </a>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40 lg:py-56 relative z-10 flex flex-col items-center justify-center">
          {business?.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              crossOrigin="anonymous"
              className="h-48 sm:h-64 lg:h-80 w-48 sm:w-64 lg:w-80 object-contain border-2 border-black rounded-lg"
              style={{
                boxShadow: '0 0 30px rgba(0, 0, 0, 0.2), 0 0 60px rgba(0, 0, 0, 0.1)'
              }}
            />
          )}
        </div>
      </header>

      {business?.show_business_info && (business?.display_name || business?.phone || business?.location) && (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center text-center">
              {business?.display_name && (
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mb-3">{business?.name}</h2>
              )}
              {(business?.location || business?.phone) && (
                <div className="space-y-2 mb-4">
                  {business?.location && (
                    <p className="text-gray-700 text-sm sm:text-base">{business.location}</p>
                  )}
                  {business?.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base transition inline-block"
                    >
                      {business.phone}
                    </a>
                  )}
                </div>
              )}
              {(() => {
                const buttons = [
                  { condition: true, key: 'share' },
                  { condition: business?.facebook_page_url, key: 'facebook' },
                  { condition: business?.instagram_page_url, key: 'instagram' },
                  { condition: business?.location, key: 'directions' },
                  { condition: businessId, key: 'subscribe' },
                  { condition: businessId, key: 'referral' },
                  { condition: business?.about_us_text, key: 'about' }
                ].filter(b => b.condition);

                const buttonCount = buttons.length;
                const isOdd = buttonCount % 2 === 1;
                let currentIndex = 0;

                return (
                  <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
                    <button
                      onClick={handleFacebookShare}
                      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                    >
                      <Facebook className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{copied ? 'Link Copied!' : 'Share on Facebook'}</span>
                    </button>
                    {business?.facebook_page_url && (
                      <a
                        href={business.facebook_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <Facebook className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Like Us</span>
                      </a>
                    )}
                    {business?.instagram_page_url && (
                      <a
                        href={business.instagram_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <InstagramIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Follow Us</span>
                      </a>
                    )}
                    {business?.location && (
                      <button
                        onClick={() => setShowDirectionsModal(true)}
                        className={`bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <MapPin className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Directions</span>
                      </button>
                    )}
                    {businessId && (
                      <button
                        onClick={() => setShowSubscriptionModal(true)}
                        className={`bg-gray-900 hover:bg-gray-800 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <Bell className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Subscribe for Notifications</span>
                      </button>
                    )}
                    {businessId && (
                      <button
                        onClick={() => setShowReferralModal(true)}
                        className={`bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <Gift className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">Referral Rewards</span>
                      </button>
                    )}
                    {business?.about_us_text && (
                      <button
                        onClick={() => setShowAboutModal(true)}
                        className={`bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition font-semibold flex items-center gap-2 justify-center ${isOdd && ++currentIndex === buttonCount ? 'col-span-2' : ''}`}
                      >
                        <Info className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">About Us</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {!business?.orders_enabled && (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto bg-red-50 border-2 border-red-200 rounded-xl p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Calendar className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Currently Closed</h3>
            <p className="text-gray-700 mb-6">
              We're not accepting orders at the moment. Check out our upcoming events below to see when we'll be back!
            </p>
            <a
              href="#upcoming-events"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              View Upcoming Events
            </a>
          </div>
        </div>
      )}

      {(() => {
        const getSectionComponent = (sectionId: string) => {
          switch (sectionId) {
            case 'hero_message':
              return business?.show_hero_message && business?.hero_message && (
                <div key="hero_message" className="w-full px-4 sm:px-6 lg:px-8 py-3 border-t-2 border-b-2" style={{ backgroundColor: heroBannerBgColor, borderColor: heroBannerBgColor }}>
                  <div className="max-w-7xl mx-auto text-center">
                    <p className="text-base sm:text-lg font-semibold" style={{ color: heroBannerTextColor }}>{business.hero_message}</p>
                  </div>
                </div>
              );

            case 'business_info':
              return null;

            case 'menu':
              return business?.show_menu && business?.orders_enabled && (
                <div key="menu">
                  <div ref={menuSectionRef} className="w-full py-8 bg-white border-b-2 border-gray-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <h2 className="text-3xl sm:text-4xl font-bold text-center" style={{ color: primaryColor }}>{business?.menu_section_title || 'Services'}</h2>
                    </div>
                  </div>
                  <PaginatedMenuDisplay
                    groupedItems={groupedItems}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    textColor={textColor}
                    onCheckout={onCheckout}
                    defaultGroupShown={business?.default_group_shown}
                    businessId={businessId!}
                    bookingsEnabled={business?.show_bookings || false}
                    ordersEnabled={business?.orders_enabled || false}
                    onBookNow={(item) => setSelectedServiceForBooking(item)}
                  />
                  {cart.length > 0 && !business?.show_bookings && (
                    <div
                      className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-40"
                    >
                      <div className="max-w-4xl mx-auto">
                        <button
                          onClick={() => setShowCart(true)}
                          className="w-full py-3 px-6 rounded-lg font-bold text-base sm:text-lg transition shadow-xl hover:shadow-2xl transform hover:scale-105"
                          style={{
                            backgroundColor: primaryColor,
                            color: textColor
                          }}
                        >
                          View Order ({cart.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );

            case 'bookings':
              return null;

            case 'shop':
              return shopSettings?.shop_enabled && businessId && (
                <ShopDisplay
                  key="shop"
                  businessId={businessId}
                  onAddToCart={(product, quantity) => {
                    shopCart.addItem(
                      product.id,
                      product.name,
                      product.price_cents,
                      quantity
                    );
                    setShowShopCheckout(true);
                  }}
                />
              );

            case 'videos':
              return business?.show_videos && businessId && <VideoSection key="videos" businessId={businessId} />;

            case 'reviews':
              return business?.show_reviews && businessId && (
                <div key="reviews">
                  <ReviewsDisplay businessId={businessId} />
                  <ReviewsSection businessId={businessId} primaryColor={primaryColor} secondaryColor={secondaryColor} />
                </div>
              );

            default:
              return null;
          }
        };

        const sectionOrder = business?.section_display_order || ['hero_message', 'business_info', 'menu', 'bookings', 'shop', 'videos', 'reviews'];

        return sectionOrder.map(sectionId => getSectionComponent(sectionId)).filter(Boolean);
      })()}

      {business?.show_events && businessId && <UpcomingEventsDisplay businessId={businessId} primaryColor={primaryColor} secondaryColor={secondaryColor} />}

      <Footer />

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-6">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3 sm:space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              crossOrigin="anonymous"
                              className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                            <p className="font-bold text-sm sm:text-base" style={{ color: secondaryColor }}>${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="bg-gray-200 p-2 rounded hover:bg-gray-300 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="bg-gray-200 p-2 rounded hover:bg-gray-300 transition"
                              aria-label="Increase quantity"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
                              aria-label="Remove from cart"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {business?.show_bookings && (
                          <button
                            onClick={() => {
                              setShowCart(false);
                              setShowBookingModal(true);
                            }}
                            className="w-full px-3 py-2 rounded text-white font-semibold text-sm transition hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Book Now
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex justify-between text-lg sm:text-xl font-bold mb-4">
                      <span>Total:</span>
                      <span style={{ color: secondaryColor }}>${totalAmount.toFixed(2)}</span>
                    </div>

                    {business?.show_bookings && (
                      <button
                        onClick={() => {
                          setShowCart(false);
                          setShowBookingModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition hover:opacity-90 mb-3"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Calendar className="w-5 h-5" />
                        Book an Appointment
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      <AboutUsModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        businessName={business?.name || ''}
        aboutUsText={business?.about_us_text}
        aboutUsImageUrl={business?.about_us_image_url}
      />

      <DirectionsModal
        isOpen={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        address={business?.location || null}
        businessName={business?.name || 'Business'}
      />

      {businessId && (
        <ReferralModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          businessId={businessId}
        />
      )}

      {showBookingModal && businessId && business && (
        <BookingForm
          businessId={businessId}
          businessName={business.name || 'Our Business'}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {selectedServiceForBooking && businessId && (
        <BookingCalendarModal
          isOpen={true}
          onClose={() => setSelectedServiceForBooking(null)}
          businessId={businessId}
          menuItem={selectedServiceForBooking}
        />
      )}

      {business && business.chatbot_enabled && businessId && (
        <ChatWidget
          businessId={businessId}
          businessName={business.name}
          onNavigate={(target) => {
            if (target === 'services' && menuSectionRef.current) {
              menuSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onOpenModal={(modal) => {
            if (modal === 'booking') {
              setShowBookingModal(true);
            } else if (modal === 'referrals') {
              setShowReferralModal(true);
            }
          }}
          onSelectService={(serviceId) => {
            const service = menuItems.find(item => item.id === serviceId);
            if (service) {
              setSelectedServiceForBooking(service);
            }
          }}
        />
      )}

      {showShopCheckout && businessId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">Checkout</h2>
              <button
                onClick={() => setShowShopCheckout(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-6">
              <ShopCheckout
                businessId={businessId}
                onSuccess={() => {
                  setShowShopCheckout(false);
                  alert('Order placed successfully! Check your email for confirmation.');
                }}
                onCancel={() => setShowShopCheckout(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HomePage(props: HomePageProps) {
  return (
    <CartProvider>
      <ShopCartProvider>
        <HomePageContent {...props} />
      </ShopCartProvider>
    </CartProvider>
  );
}
