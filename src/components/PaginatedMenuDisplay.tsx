import { useState, useEffect } from 'react';
import { MenuItem, MenuItemGroup, supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { ChevronDown, Calendar } from 'lucide-react';
import { getPlaceholderPreview } from '../lib/placeholderGenerator';

interface PaginatedMenuDisplayProps {
  groupedItems: Record<string, MenuItem[]>;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  onCheckout: () => void;
  defaultGroupShown?: string | null;
  businessId: string;
  bookingsEnabled?: boolean;
  ordersEnabled?: boolean;
  onBookNow?: (item: MenuItem) => void;
}

export function PaginatedMenuDisplay({
  groupedItems,
  primaryColor,
  secondaryColor,
  textColor,
  onCheckout,
  defaultGroupShown,
  businessId,
  bookingsEnabled = false,
  ordersEnabled = true,
  onBookNow,
}: PaginatedMenuDisplayProps) {
  const { cart, addToCart, removeFromCart } = useCart();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.keys(groupedItems).reduce((acc, key) => ({
      ...acc,
      [key]: false,
    }), {})
  );
  const [groupBackgrounds, setGroupBackgrounds] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadGroupBackgrounds();
  }, [businessId]);

  const loadGroupBackgrounds = async () => {
    try {
      const { data } = await supabase
        .from('menu_item_groups')
        .select('*')
        .eq('business_id', businessId);

      if (data) {
        const backgrounds: Record<string, string | null> = {};
        data.forEach((group: MenuItemGroup) => {
          backgrounds[group.group_name] = group.background_image_url;
        });
        setGroupBackgrounds(backgrounds);
      }
    } catch (error) {
      console.error('Error loading group backgrounds:', error);
    }
  };

  const toggleExpandGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleItemClick = (item: MenuItem) => {
    const isInCart = cart.some((cartItem) => cartItem.id === item.id);
    if (isInCart) {
      removeFromCart(item.id);
    } else {
      addToCart(item);
    }
  };

  const groups = Object.entries(groupedItems);

  return (
    <div className="w-full bg-gray-100">
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No menu items available at the moment.</p>
        </div>
      ) : (
        <div>
          {groups.map(([groupName, items], index) => {
            const isExpanded = expandedGroups[groupName];
            const backgroundImage = groupBackgrounds[groupName];

            const displayBackground = backgroundImage || getPlaceholderPreview(groupName);
            const isPlaceholder = !backgroundImage;

            return (
              <div key={groupName}>
                <div className="relative overflow-hidden" style={{ minHeight: isExpanded ? 'auto' : '300px' }}>
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
                      isPlaceholder ? 'opacity-40' : ''
                    }`}
                    style={{
                      backgroundImage: backgroundImage ? `url(${backgroundImage})` : displayBackground,
                      opacity: isExpanded ? (isPlaceholder ? 0.08 : 0.15) : (isPlaceholder ? 0.4 : 0.8),
                      filter: isExpanded ? 'blur(2px)' : 'blur(0px)',
                    }}
                  />
                  <div className="relative z-10 flex justify-center items-center" style={{ minHeight: isExpanded ? 'auto' : '300px' }}>
                    <div
                      className="inline-block px-6 sm:px-8 py-3 sm:py-3 rounded-full cursor-pointer hover:shadow-lg transition"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => toggleExpandGroup(groupName)}
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold capitalize tracking-tight" style={{ color: textColor }}>
                          {groupName}
                        </h2>
                        <ChevronDown
                          className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          style={{ color: textColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-white bg-opacity-95 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {items.map((item) => {
                          const isInCart = cart.some((cartItem) => cartItem.id === item.id);
                          const showCartIndicator = isInCart && ordersEnabled && !bookingsEnabled;
                          return (
                            <div
                              key={item.id}
                              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition flex flex-col h-full border-4 ${
                                showCartIndicator ? 'border-green-500' : 'border-transparent'
                              }`}
                              style={showCartIndicator ? { boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' } : {}}
                            >
                              {item.image_url && (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  crossOrigin="anonymous"
                                  className={`w-full h-56 sm:h-64 lg:h-72 object-cover flex-shrink-0 ${
                                    showCartIndicator ? 'brightness-90' : ''
                                  }`}
                                />
                              )}
                              <div className={`p-5 sm:p-6 flex flex-col flex-grow ${showCartIndicator ? 'bg-green-50' : ''}`}>
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 leading-snug line-clamp-2">
                                  {item.name}
                                </h3>
                                <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">
                                  {item.description}
                                </p>
                                <div className="flex items-center justify-between mt-auto gap-3">
                                  <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: secondaryColor }}
                                  >
                                    ${item.price.toFixed(2)}
                                  </span>
                                  {showCartIndicator && (
                                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full whitespace-nowrap">
                                      In Cart
                                    </span>
                                  )}
                                </div>

                                <div className="mt-4 flex gap-2">
                                  {bookingsEnabled && onBookNow ? (
                                    <button
                                      onClick={() => onBookNow(item)}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition hover:opacity-90"
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      <Calendar className="w-4 h-4" />
                                      Book Now
                                    </button>
                                  ) : ordersEnabled ? (
                                    <button
                                      onClick={() => handleItemClick(item)}
                                      className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                                        isInCart
                                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          : 'text-white hover:opacity-90'
                                      }`}
                                      style={!isInCart ? { backgroundColor: secondaryColor } : {}}
                                    >
                                      {isInCart ? 'Remove' : 'Add to Cart'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center mt-8">
                        <button
                          onClick={() => toggleExpandGroup(groupName)}
                          className="inline-block px-6 sm:px-8 py-3 sm:py-3 rounded-full hover:shadow-lg transition"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <ChevronDown
                            className="h-6 w-6 sm:h-7 sm:w-7 rotate-180"
                            style={{ color: textColor }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {index < groups.length - 1 && (
                  <div className="border-t-2 border-gray-300" />
                )}
              </div>
            );
          })}

          {cart.length > 0 && !bookingsEnabled && (
            <div className="flex justify-center py-12 px-4 sm:px-6 lg:px-8">
              <button
                onClick={onCheckout}
                className="py-4 px-8 rounded-lg font-semibold text-white transition shadow-lg hover:shadow-xl text-lg"
                style={{ backgroundColor: secondaryColor }}
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
