import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const CART_TOKEN_KEY = 'cart_session_token';

export interface CartProduct {
  id: string;
  itemType: 'product';
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface CartService {
  id: string;
  itemType: 'service';
  serviceId: string;
  serviceName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export type CartItem = CartProduct | CartService;

export interface CartBooking {
  serviceId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  timezone: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

interface UnifiedCartContextType {
  businessId: string | null;
  items: CartItem[];
  booking: CartBooking | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  loading: boolean;
  sessionToken: string;

  setBusinessId: (id: string) => void;
  addProduct: (productId: string, productName: string, priceCents: number, quantity: number) => Promise<void>;
  addService: (serviceId: string, serviceName: string, priceCents: number) => Promise<void>;
  addBooking: (booking: CartBooking) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const UnifiedCartContext = createContext<UnifiedCartContextType | undefined>(undefined);

export function UnifiedCartProvider({ children }: { children: ReactNode }) {
  const [businessId, setBusinessIdState] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [booking, setBooking] = useState<CartBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(() => {
    const stored = localStorage.getItem(CART_TOKEN_KEY);
    if (stored) return stored;
    const newToken = crypto.randomUUID();
    localStorage.setItem(CART_TOKEN_KEY, newToken);
    return newToken;
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0) +
    (booking ? items.find(i => i.itemType === 'service')?.lineTotalCents || 0 : 0);
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + taxCents;

  const setBusinessId = (id: string) => {
    if (businessId && businessId !== id && (items.length > 0 || booking)) {
      const shouldClear = confirm(
        'Your cart contains items from another business. Clear cart to continue?'
      );
      if (shouldClear) {
        clearCart();
      } else {
        return;
      }
    }
    setBusinessIdState(id);
  };

  const refreshCart = async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('get-or-create-cart', {
        body: { businessId, sessionToken },
      });

      if (response.error) throw response.error;

      const { items: cartItems, booking: cartBooking } = response.data;

      const mappedItems: CartItem[] = cartItems.map((item: any) => ({
        id: item.id,
        itemType: item.item_type,
        productId: item.product_id,
        serviceId: item.service_id,
        productName: item.title_snapshot,
        serviceName: item.title_snapshot,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
        lineTotalCents: item.line_total_cents,
      }));

      setItems(mappedItems);

      if (cartBooking) {
        const { data: service } = await supabase
          .from('menu_items')
          .select('name')
          .eq('id', cartBooking.service_id)
          .maybeSingle();

        setBooking({
          serviceId: cartBooking.service_id,
          serviceName: service?.name || 'Service',
          startTime: cartBooking.start_time,
          endTime: cartBooking.end_time,
          timezone: cartBooking.timezone,
          customerName: cartBooking.customer_name,
          customerPhone: cartBooking.customer_phone,
          notes: cartBooking.notes,
        });
      } else {
        setBooking(null);
      }
    } catch (err) {
      console.error('Error refreshing cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productId: string, productName: string, priceCents: number, quantity: number) => {
    if (!businessId) {
      throw new Error('Business ID not set');
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('add-cart-item', {
        body: {
          sessionToken,
          businessId,
          itemType: 'product',
          itemId: productId,
          quantity,
        },
      });

      if (response.error) throw response.error;
      await refreshCart();
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addService = async (serviceId: string, serviceName: string, priceCents: number) => {
    if (!businessId) {
      throw new Error('Business ID not set');
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('add-cart-item', {
        body: {
          sessionToken,
          businessId,
          itemType: 'service',
          itemId: serviceId,
          quantity: 1,
        },
      });

      if (response.error) throw response.error;
      await refreshCart();
    } catch (err) {
      console.error('Error adding service:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async (bookingDetails: CartBooking) => {
    if (!businessId) {
      throw new Error('Business ID not set');
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('add-cart-booking', {
        body: {
          sessionToken,
          businessId,
          serviceId: bookingDetails.serviceId,
          startTime: bookingDetails.startTime,
          endTime: bookingDetails.endTime,
          timezone: bookingDetails.timezone,
          customerName: bookingDetails.customerName,
          customerPhone: bookingDetails.customerPhone,
          notes: bookingDetails.notes,
        },
      });

      if (response.error) throw response.error;
      await refreshCart();
    } catch (err) {
      console.error('Error adding booking:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('remove-cart-item', {
        body: { sessionToken, itemId },
      });

      if (response.error) throw response.error;
      await refreshCart();
    } catch (err) {
      console.error('Error removing item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('update-cart-item', {
        body: { sessionToken, itemId, quantity },
      });

      if (response.error) throw response.error;
      await refreshCart();
    } catch (err) {
      console.error('Error updating quantity:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('clear-cart', {
        body: { sessionToken },
      });

      if (response.error) throw response.error;

      setItems([]);
      setBooking(null);
      setBusinessIdState(null);

      const newToken = crypto.randomUUID();
      localStorage.setItem(CART_TOKEN_KEY, newToken);
      setSessionToken(newToken);
    } catch (err) {
      console.error('Error clearing cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      refreshCart();
    }
  }, [businessId]);

  return (
    <UnifiedCartContext.Provider
      value={{
        businessId,
        items,
        booking,
        subtotalCents,
        taxCents,
        totalCents,
        loading,
        sessionToken,
        setBusinessId,
        addProduct,
        addService,
        addBooking,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </UnifiedCartContext.Provider>
  );
}

export function useUnifiedCart() {
  const context = useContext(UnifiedCartContext);
  if (!context) {
    throw new Error('useUnifiedCart must be used within UnifiedCartProvider');
  }
  return context;
}
