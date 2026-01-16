import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Calendar, CreditCard, User, Mail, Phone, X } from 'lucide-react';
import { useUnifiedCart } from '../contexts/UnifiedCartContext';
import { supabase } from '../lib/supabase';

interface UnifiedCheckoutProps {
  onSuccess: () => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId?: string) => Promise<any>;
    };
  }
}

export function UnifiedCheckout({ onSuccess, onCancel }: UnifiedCheckoutProps) {
  const { businessId, items, booking, subtotalCents, taxCents, totalCents, sessionToken, clearCart } = useUnifiedCart();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squareInitialized, setSquareInitialized] = useState(false);
  const paymentsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);

  useEffect(() => {
    const initSquare = async () => {
      if (!businessId) return;

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('square_application_id')
          .eq('business_id', businessId)
          .maybeSingle();

        const { data: businessData } = await supabase
          .from('businesses')
          .select('square_location_id')
          .eq('id', businessId)
          .maybeSingle();

        if (settingsError || !settingsData?.square_application_id) {
          setError('Payment system not configured');
          return;
        }

        if (!businessData?.square_location_id) {
          setError('Payment location not configured');
          return;
        }

        if (document.getElementById('square-sdk-script')) {
          await initializeSquarePayments(settingsData.square_application_id, businessData.square_location_id);
          return;
        }

        const script = document.createElement('script');
        script.id = 'square-sdk-script';
        script.src = 'https://web.squarecdn.com/v1/square.js';
        script.async = true;
        script.onload = async () => {
          await initializeSquarePayments(settingsData.square_application_id, businessData.square_location_id);
        };
        script.onerror = () => {
          setError('Failed to load payment system');
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error('Error initializing Square:', err);
        setError('Payment system initialization failed');
      }
    };

    const initializeSquarePayments = async (applicationId: string, locationId: string) => {
      const maxRetries = 3;
      let retryCount = 0;

      const attemptInitialization = async (): Promise<boolean> => {
        try {
          const container = document.getElementById('unified-card-container');
          if (!container) {
            return false;
          }

          if (!window.Square) {
            return false;
          }

          const payments = await window.Square.payments(applicationId, locationId);
          paymentsRef.current = payments;

          const card = await payments.card();
          await card.attach('#unified-card-container');
          cardRef.current = card;
          setSquareInitialized(true);
          return true;
        } catch (err) {
          console.error('Attempt failed:', err);
          return false;
        }
      };

      while (retryCount < maxRetries) {
        const success = await attemptInitialization();
        if (success) return;
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setError('Failed to load payment processor');
    };

    if (businessId) {
      initSquare();
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.destroy().catch(() => {});
      }
    };
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName || !customerEmail) {
      setError('Name and email are required');
      return;
    }

    if (!squareInitialized || !cardRef.current) {
      setError('Payment system is loading. Please try again.');
      return;
    }

    try {
      setLoading(true);

      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error('Failed to process card. Please check your card details.');
      }

      const { data, error: checkoutError } = await supabase.functions.invoke(
        'create-unified-checkout',
        {
          body: {
            sessionToken,
            customerName,
            customerEmail,
            customerPhone,
            sourceId: result.token,
          },
        }
      );

      if (checkoutError) throw checkoutError;
      if (!data?.success) throw new Error('Checkout failed');

      await clearCart();
      onSuccess();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const productItems = items.filter(item => item.itemType === 'product');
  const hasProducts = productItems.length > 0;
  const hasBooking = booking !== null;

  if (!hasProducts && !hasBooking) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Your cart is empty</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

        {hasProducts && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Products</h3>
            </div>
            <div className="space-y-2">
              {productItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.productName} x{item.quantity}
                  </span>
                  <span className="text-gray-900 font-medium">
                    ${(item.lineTotalCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBooking && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Booking</h3>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-900">{booking.serviceName}</p>
              <p className="text-sm text-green-700 mt-1">
                {new Date(booking.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              {booking.notes && (
                <p className="text-sm text-green-600 mt-2 italic">{booking.notes}</p>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (8%):</span>
            <span className="text-gray-900">${(taxCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(123) 456-7890"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Payment Information
          </h3>
          {!squareInitialized ? (
            <div className="text-center py-6 text-gray-500">
              Loading secure payment form...
            </div>
          ) : (
            <div
              id="unified-card-container"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !squareInitialized}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-lg"
          >
            {loading ? 'Processing...' : `Pay $${(totalCents / 100).toFixed(2)}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
