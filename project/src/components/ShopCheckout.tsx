import { useState, useRef, useEffect } from 'react';
import { useShopCart } from '../contexts/ShopCartContext';
import { supabase } from '../lib/supabase';

interface ShopCheckoutProps {
  businessId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface SquareWeb {
  payments: (applicationId: string, locationId?: string) => Promise<any>;
}

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId?: string) => Promise<any>;
    };
  }
}

export function ShopCheckout({
  businessId,
  onSuccess,
  onCancel,
}: ShopCheckoutProps) {
  const { items, subtotal, clearCart } = useShopCart();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squareInitialized, setSquareInitialized] = useState(false);
  const paymentsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);
  const paymentContainerRef = useRef<HTMLDivElement>(null);

  const taxCents = Math.round(subtotal * 0.08);
  const totalCents = subtotal + taxCents;
  const totalDollars = (totalCents / 100).toFixed(2);

  useEffect(() => {
    const initSquare = async () => {
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

        console.log('Square Configuration:', {
          applicationId: settingsData?.square_application_id,
          locationId: businessData?.square_location_id,
          hasApplicationId: !!settingsData?.square_application_id,
          hasLocationId: !!businessData?.square_location_id
        });

        if (settingsError || !settingsData?.square_application_id) {
          setError('Square Application ID not configured. Please set it up in the Payments tab.');
          return;
        }

        if (!businessData?.square_location_id) {
          setError('Square Location ID not configured. Please set it up in the Payments tab.');
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://web.squarecdn.com/v1/square.js';
        script.async = true;
        script.onload = async () => {
          try {
            if (!window.Square) {
              throw new Error('Square SDK not loaded');
            }

            console.log('Initializing Square with:', {
              appId: settingsData.square_application_id,
              locationId: businessData.square_location_id
            });

            const payments = await window.Square.payments(
              settingsData.square_application_id,
              businessData.square_location_id
            );

            if (payments) {
              paymentsRef.current = payments;
              const card = await payments.card();
              await card.attach('#sq-card-container');
              cardRef.current = card;
              setSquareInitialized(true);
              console.log('Square initialized successfully');
            }
          } catch (err) {
            console.error('Failed to initialize Square payments:', err);
            setError(
              err instanceof Error
                ? `Payment setup error: ${err.message}. Please verify your Square Application ID and Location ID match your Square account.`
                : 'Failed to load payment processor. Please check your Square configuration.'
            );
          }
        };
        script.onerror = () => {
          console.error('Failed to load Square SDK script');
          setError('Failed to load Square payment system');
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error('Error initializing Square:', err);
        setError('Payment system initialization failed');
      }
    };

    if (businessId) {
      initSquare();
    }
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName || !customerEmail) {
      setError('Name and email are required');
      return;
    }

    if (!squareInitialized) {
      setError('Payment system is loading. Please try again.');
      return;
    }

    try {
      setLoading(true);

      if (!cardRef.current) {
        throw new Error('Payment form not ready');
      }

      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK' || !result.token) {
        throw new Error('Failed to tokenize card. Please check your card details.');
      }

      const nonce = result.token;

      const idempotencyKey = `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-shop-order',
        {
          body: {
            businessId,
            customerName,
            customerEmail,
            customerPhone,
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
            subtotalCents: subtotal,
            taxCents,
            totalCents,
            idempotencyKey,
          },
        }
      );

      if (orderError) throw new Error(orderError.message);
      if (!orderData?.orderId) throw new Error('Failed to create order');

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'process-shop-payment',
        {
          body: {
            businessId,
            orderId: orderData.orderId,
            totalCents,
            sourceId: nonce,
            buyerEmail: customerEmail,
            idempotencyKey,
          },
        }
      );

      if (paymentError) throw new Error(paymentError.message);
      if (!paymentData?.success) throw new Error('Payment failed');

      clearCart();
      onSuccess();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error ? err.message : 'Payment processing failed'
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
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
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex justify-between text-sm text-gray-600"
            >
              <span>
                {item.productName} x{item.quantity}
              </span>
              <span>${(item.lineTotal / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (8%):</span>
              <span>${(taxCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total:</span>
              <span>${totalDollars}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
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

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">
            Card Details
          </h3>
          {!squareInitialized ? (
            <div className="text-center py-6 text-gray-500">
              Loading secure payment form...
            </div>
          ) : (
            <div
              ref={paymentContainerRef}
              id="sq-card-container"
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
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? 'Processing...' : `Pay ${totalDollars}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
