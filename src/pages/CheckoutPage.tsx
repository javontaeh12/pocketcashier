import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Lock, CreditCard, DollarSign } from 'lucide-react';
import { supabase, PaymentMethods } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { MetaTags } from '../components/MetaTags';

declare global {
  interface Window {
    Square?: any;
  }
}

export function CheckoutPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joinNewsletter, setJoinNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [squareEnabled, setSquareEnabled] = useState(false);
  const [squareApplicationId, setSquareApplicationId] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingCountry, setShippingCountry] = useState('US');
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingDistance, setShippingDistance] = useState(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);
  const { cart, clearCart, totalAmount } = useCart();
  const { businessId } = useAuth();

  useEffect(() => {
    if (businessId) {
      checkSquareSetup();
    }
  }, [businessId]);

  useEffect(() => {
    if (squareApplicationId) {
      loadSquareSDK();
    }
  }, [squareApplicationId]);

  useEffect(() => {
    if (paymentInProgress && squareLoaded && squareApplicationId && squareLocationId) {
      initializeSquarePayment();
    }
  }, [paymentInProgress, squareLoaded, squareApplicationId, squareLocationId]);

  const loadSquareSDK = () => {
    if (window.Square) {
      setSquareLoaded(true);
      return;
    }

    const script = document.createElement('script');
    // Sandbox app IDs start with 'sandbox-sq0', production IDs start with 'sq0'
    const isSandbox = squareApplicationId.startsWith('sandbox-');
    script.src = isSandbox
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = () => setSquareLoaded(true);
    script.onerror = () => setError('Failed to load payment processor');
    document.body.appendChild(script);
  };

  const checkSquareSetup = async () => {
    if (!businessId) return;

    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('square_enabled, square_application_id, square_location_id, payment_methods')
        .eq('business_id', businessId)
        .maybeSingle();

      setSquareEnabled(settingsData?.square_enabled || false);
      setSquareApplicationId(settingsData?.square_application_id || '');
      setSquareLocationId(settingsData?.square_location_id || '');
      setPaymentMethods(settingsData?.payment_methods || null);

      const { data: businessData } = await supabase
        .from('businesses')
        .select('shipping_enabled')
        .eq('id', businessId)
        .maybeSingle();

      setShippingEnabled(businessData?.shipping_enabled || false);
    } catch (err) {
      console.error('Error checking setup:', err);
    }
  };

  const calculateShippingCost = async () => {
    if (!shippingEnabled || !shippingAddress || !shippingCity || !shippingState || !shippingZip) {
      return;
    }

    setCalculatingShipping(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-shipping`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          customerAddress: {
            address: shippingAddress,
            city: shippingCity,
            state: shippingState,
            zip: shippingZip,
            country: shippingCountry
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate shipping');
      }

      const data = await response.json();
      setShippingCost(data.cost);
      setShippingDistance(data.distance);
    } catch (err: any) {
      console.error('Error calculating shipping:', err);
      setError(err.message || 'Failed to calculate shipping cost');
    } finally {
      setCalculatingShipping(false);
    }
  };

  const initializeSquarePayment = async () => {
    if (!window.Square) return;

    try {
      const payments = window.Square.payments(squareApplicationId, squareLocationId);
      paymentsRef.current = payments;

      const card = await payments.card();
      await card.attach('#card-container');
      cardRef.current = card;
    } catch (err) {
      console.error('Failed to initialize Square payment:', err);
      setError('Failed to initialize payment form');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!businessId) {
        throw new Error('Business not found');
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('minimum_order_items')
        .eq('id', businessId)
        .maybeSingle();

      const minimumOrderItems = businessData?.minimum_order_items || 0;
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

      if (totalItems < minimumOrderItems) {
        throw new Error(`Minimum order is ${minimumOrderItems} item${minimumOrderItems !== 1 ? 's' : ''}. You have ${totalItems}.`);
      }

      if (shippingEnabled && (!shippingAddress || !shippingCity || !shippingState || !shippingZip)) {
        throw new Error('Please fill in all shipping address fields');
      }

      let customer;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('business_id', businessId)
        .maybeSingle();

      if (existingCustomer) {
        customer = existingCustomer;
        await supabase
          .from('customers')
          .update({
            total_orders: existingCustomer.total_orders + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id);
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            name,
            email,
            total_orders: 1
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      const finalTotal = totalAmount + shippingCost;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: customer.id,
          status: 'pending',
          total_amount: finalTotal,
          payment_required: squareEnabled,
          payment_status: squareEnabled ? 'pending' : 'completed',
          shipping_address: shippingEnabled ? shippingAddress : null,
          shipping_city: shippingEnabled ? shippingCity : null,
          shipping_state: shippingEnabled ? shippingState : null,
          shipping_zip: shippingEnabled ? shippingZip : null,
          shipping_country: shippingEnabled ? shippingCountry : null,
          shipping_cost: shippingEnabled ? shippingCost : 0,
          shipping_distance: shippingEnabled ? shippingDistance : null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_order: item.price,
        item_name: item.name
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const hasManualPayments = paymentMethods && (
        paymentMethods.apple_pay?.enabled ||
        paymentMethods.cash_app?.enabled ||
        paymentMethods.zelle?.enabled ||
        squareEnabled
      );

      if (hasManualPayments) {
        setOrderId(order.id);
        setShowPaymentInstructions(true);
      } else {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-email`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: order.id,
            customerEmail: email,
            customerName: name,
            businessId: businessId,
            items: cart,
          }),
        }).catch(() => {});

        if (joinNewsletter) {
          const mailerliteUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-mailerlite-lead`;
          await fetch(mailerliteUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerEmail: email,
              customerName: name,
              businessId: businessId,
            }),
          }).catch(() => {});
        }

        clearCart();
        onSuccess();
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = async (method: string) => {
    setSelectedPaymentMethod(method);

    if (method === 'square' && squareEnabled) {
      setPaymentInProgress(true);
      setShowPaymentInstructions(false);
    } else if (method === 'cash_app' && paymentMethods?.cash_app?.handle) {
      window.open(`https://cash.app/$${paymentMethods.cash_app.handle.replace('$', '')}`, '_blank');
    }
  };

  const handleManualPaymentComplete = async () => {
    if (!orderId) return;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-email`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          customerEmail: email,
          customerName: name,
          businessId: businessId,
          items: cart,
        }),
      }).catch(() => {});

      if (joinNewsletter) {
        const mailerliteUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-mailerlite-lead`;
        await fetch(mailerliteUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerEmail: email,
            customerName: name,
            businessId: businessId,
          }),
        }).catch(() => {});
      }

      clearCart();
      onSuccess();
    } catch (err) {
      console.error('Error completing order:', err);
      setError('Failed to complete order. Please try again.');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardRef.current || !orderId) return;

    setPaymentProcessing(true);
    setError('');

    try {
      const result = await cardRef.current.tokenize();

      if (result.status === 'OK') {
        const paymentApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-square-payment`;
        const paymentResponse = await fetch(paymentApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            sourceId: result.token,
            amount: totalAmount + shippingCost,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok || paymentData.error) {
          throw new Error(paymentData.error || 'Payment processing failed');
        }

        const emailApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-email`;
        await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            customerEmail: email,
            customerName: name,
            businessId: businessId,
            items: cart,
          }),
        }).catch(() => {});

        clearCart();
        onSuccess();
      } else {
        throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (showPaymentInstructions && orderId) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <DollarSign className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Select Payment Method</h1>
            </div>

            <div className="mb-6 sm:mb-8 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-sm sm:text-base text-blue-900">
                Order Total: <span className="font-bold">${(totalAmount + shippingCost).toFixed(2)}</span>
              </p>
            </div>

            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Choose a payment method:</h2>
              <div className="space-y-3">
                {squareEnabled && paymentMethods?.square_pay?.enabled && (
                  <button
                    onClick={() => handlePaymentMethodSelect('square')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Square / Credit Card</p>
                        <p className="text-sm text-gray-600">Pay securely with your credit or debit card</p>
                      </div>
                    </div>
                  </button>
                )}

                {paymentMethods?.apple_pay?.enabled && paymentMethods.apple_pay.email && (
                  <button
                    onClick={() => handlePaymentMethodSelect('apple_pay')}
                    className={`w-full p-4 border-2 rounded-lg transition text-left ${
                      selectedPaymentMethod === 'apple_pay'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Apple Pay</p>
                        <p className="text-sm text-gray-600">Send payment via Apple Pay</p>
                      </div>
                    </div>
                  </button>
                )}

                {paymentMethods?.cash_app?.enabled && paymentMethods.cash_app.handle && (
                  <button
                    onClick={() => handlePaymentMethodSelect('cash_app')}
                    className={`w-full p-4 border-2 rounded-lg transition text-left ${
                      selectedPaymentMethod === 'cash_app'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Cash App</p>
                        <p className="text-sm text-gray-600">Send payment via Cash App</p>
                      </div>
                    </div>
                  </button>
                )}

                {paymentMethods?.zelle?.enabled && (paymentMethods.zelle.email || paymentMethods.zelle.phone) && (
                  <button
                    onClick={() => handlePaymentMethodSelect('zelle')}
                    className={`w-full p-4 border-2 rounded-lg transition text-left ${
                      selectedPaymentMethod === 'zelle'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Zelle</p>
                        <p className="text-sm text-gray-600">Send payment via Zelle</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {selectedPaymentMethod && selectedPaymentMethod !== 'square' && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3">Payment Instructions</h3>

                {selectedPaymentMethod === 'apple_pay' && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-800">
                      1. Open Apple Pay on your device
                    </p>
                    <p className="text-sm text-green-800">
                      2. Send <span className="font-bold">${(totalAmount + shippingCost).toFixed(2)}</span> to:
                    </p>
                    <p className="text-base font-semibold text-green-900 bg-white px-3 py-2 rounded border border-green-300">
                      {paymentMethods?.apple_pay?.email}
                    </p>
                    <p className="text-sm text-green-800">
                      3. Include your order number in the notes if possible
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'cash_app' && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-800">
                      1. Open Cash App on your device
                    </p>
                    <p className="text-sm text-green-800">
                      2. Send <span className="font-bold">${(totalAmount + shippingCost).toFixed(2)}</span> to:
                    </p>
                    <p className="text-base font-semibold text-green-900 bg-white px-3 py-2 rounded border border-green-300">
                      {paymentMethods?.cash_app?.handle}
                    </p>
                    <p className="text-sm text-green-800">
                      3. Include your name ({name}) in the note
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'zelle' && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-800">
                      1. Open your banking app with Zelle
                    </p>
                    <p className="text-sm text-green-800">
                      2. Send <span className="font-bold">${(totalAmount + shippingCost).toFixed(2)}</span> to:
                    </p>
                    {paymentMethods?.zelle?.email && (
                      <p className="text-base font-semibold text-green-900 bg-white px-3 py-2 rounded border border-green-300">
                        Email: {paymentMethods.zelle.email}
                      </p>
                    )}
                    {paymentMethods?.zelle?.phone && (
                      <p className="text-base font-semibold text-green-900 bg-white px-3 py-2 rounded border border-green-300">
                        Phone: {paymentMethods.zelle.phone}
                      </p>
                    )}
                    <p className="text-sm text-green-800">
                      3. Include your name ({name}) in the message
                    </p>
                  </div>
                )}

                <button
                  onClick={handleManualPaymentComplete}
                  className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  I've Completed the Payment
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowPaymentInstructions(false);
                setSelectedPaymentMethod('');
                setOrderId(null);
              }}
              className="w-full bg-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-400 transition font-semibold"
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentInProgress && orderId) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Lock className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Secure Payment</h1>
            </div>

            <div className="mb-6 sm:mb-8 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-sm sm:text-base text-blue-900">
                To complete your order, please proceed with payment of <span className="font-bold">${(totalAmount + shippingCost).toFixed(2)}</span>
              </p>
            </div>

            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Booking Summary</h2>
              <div className="space-y-2 sm:space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm sm:text-base truncate block">{item.name}</span>
                      <span className="text-gray-500 text-xs sm:text-sm">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-sm sm:text-base whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {shippingCost > 0 && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-2">
                    <span className="text-sm sm:text-base text-gray-600">
                      Shipping ({shippingDistance.toFixed(1)} miles):
                    </span>
                    <span className="text-sm sm:text-base font-semibold">${shippingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 gap-2">
                  <span className="text-base sm:text-lg font-bold">Total:</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600">${(totalAmount + shippingCost).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded text-sm sm:text-base">
                {error}
              </div>
            )}

            <div className="bg-white border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold">Payment Information</h3>
              </div>

              <div id="card-container" className="min-h-[120px] text-sm"></div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Lock className="h-3 w-3 flex-shrink-0" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </div>

            <button
              onClick={handlePaymentSubmit}
              disabled={paymentProcessing || !squareLoaded}
              className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-green-700 transition font-semibold text-base sm:text-lg disabled:bg-gray-400 disabled:cursor-not-allowed mb-3 sm:mb-4"
            >
              {paymentProcessing ? 'Processing Payment...' : `Pay $${(totalAmount + shippingCost).toFixed(2)}`}
            </button>

            <button
              onClick={() => {
                setPaymentInProgress(false);
                setOrderId(null);
              }}
              disabled={paymentProcessing}
              className="w-full bg-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-lg hover:bg-gray-400 transition font-semibold text-base sm:text-lg disabled:opacity-50"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title="Checkout - Pocket Cashier"
        description="Complete your order and checkout"
      />
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
          <span>Back to Menu</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Checkout</h1>

          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Booking Summary</h2>
            <div className="space-y-2 sm:space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm sm:text-base truncate block">{item.name}</span>
                    <span className="text-gray-500 text-xs sm:text-sm">× {item.quantity}</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {shippingEnabled && shippingCost > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-2">
                  <span className="text-sm sm:text-base text-gray-600">Subtotal:</span>
                  <span className="text-sm sm:text-base font-semibold">${totalAmount.toFixed(2)}</span>
                </div>
              )}
              {shippingEnabled && shippingCost > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-2">
                  <span className="text-sm sm:text-base text-gray-600">
                    Shipping ({shippingDistance.toFixed(1)} miles):
                  </span>
                  <span className="text-sm sm:text-base font-semibold">${shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 gap-2">
                <span className="text-base sm:text-lg font-bold">Total:</span>
                <span className="text-lg sm:text-xl font-bold text-green-600">${(totalAmount + shippingCost).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} className="pb-24 sm:pb-32">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Your Information</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded mb-4 text-sm sm:text-base">
                {error}
              </div>
            )}

            <div className="space-y-3 sm:space-y-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {shippingEnabled && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3">Shipping Address</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="shippingAddress"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required={shippingEnabled}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        id="shippingCity"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        required={shippingEnabled}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label htmlFor="shippingState" className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        id="shippingState"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                        required={shippingEnabled}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="State"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="shippingZip" className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        id="shippingZip"
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        required={shippingEnabled}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="12345"
                      />
                    </div>

                    <div>
                      <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        id="shippingCountry"
                        value={shippingCountry}
                        onChange={(e) => setShippingCountry(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={calculateShippingCost}
                    disabled={calculatingShipping || !shippingAddress || !shippingCity || !shippingState || !shippingZip}
                    className="w-full bg-blue-600 text-white py-2 sm:py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {calculatingShipping ? 'Calculating...' : 'Calculate Shipping Cost'}
                  </button>

                  {shippingCost > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                      <p className="text-sm sm:text-base text-green-900">
                        <span className="font-semibold">Shipping Cost:</span> ${shippingCost.toFixed(2)} ({shippingDistance.toFixed(1)} miles)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4 mb-6">
              <div className="flex items-center gap-3 pt-1 sm:pt-2">
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={joinNewsletter}
                  onChange={(e) => setJoinNewsletter(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="newsletter" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Join our newsletter for updates and special offers
                </label>
              </div>
            </div>

          </form>
        </div>
      </div>

      <button
        form="checkout-form"
        type="submit"
        disabled={loading || cart.length === 0}
        className="fixed bottom-6 left-4 right-4 sm:bottom-8 sm:left-6 sm:right-6 max-w-3xl mx-auto bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg z-50"
      >
        {loading ? 'Placing Order...' : (squareEnabled || paymentMethods?.apple_pay?.enabled || paymentMethods?.cash_app?.enabled || paymentMethods?.zelle?.enabled) ? 'Continue to Payment' : 'Place Order'}
      </button>
      </div>
    </>
  );
}
