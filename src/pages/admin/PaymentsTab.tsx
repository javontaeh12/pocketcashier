import { useEffect, useState } from 'react';
import { ExternalLink, DollarSign, Check, Clock, X as XIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  payment_method: string;
  square_payment_id: string;
  created_at: string;
}

interface SquareSettings {
  square_enabled: boolean;
  square_merchant_id?: string;
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price_at_order: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface OrderDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer: Customer;
  order_items: OrderItem[];
}

export function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [squareSettings, setSquareSettings] = useState<SquareSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [bookingPaymentEnabled, setBookingPaymentEnabled] = useState(false);
  const [bookingPaymentType, setBookingPaymentType] = useState<'deposit' | 'full'>('full');
  const [bookingDepositPercentage, setBookingDepositPercentage] = useState(50);
  const [savingBookingSettings, setSavingBookingSettings] = useState(false);
  const { businessId } = useAuth();

  useEffect(() => {
    if (businessId) {
      loadPaymentsData();
    }
  }, [businessId]);

  const loadPaymentsData = async () => {
    if (!businessId) return;

    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('square_enabled, square_merchant_id')
        .eq('business_id', businessId)
        .maybeSingle();

      setSquareSettings(settingsData || { square_enabled: false });

      const { data: businessData } = await supabase
        .from('businesses')
        .select('booking_payment_enabled, booking_payment_type, booking_deposit_percentage')
        .eq('id', businessId)
        .maybeSingle();

      if (businessData) {
        setBookingPaymentEnabled(businessData.booking_payment_enabled || false);
        setBookingPaymentType(businessData.booking_payment_type || 'full');
        setBookingDepositPercentage(businessData.booking_deposit_percentage || 50);
      }

      if (settingsData?.square_enabled) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBookingPaymentSettings = async () => {
    if (!businessId) return;

    setSavingBookingSettings(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          booking_payment_enabled: bookingPaymentEnabled,
          booking_payment_type: bookingPaymentType,
          booking_deposit_percentage: bookingDepositPercentage,
        })
        .eq('id', businessId);

      if (error) throw error;
      alert('Booking payment settings saved successfully!');
    } catch (error) {
      console.error('Error saving booking payment settings:', error);
      alert('Failed to save booking payment settings');
    } finally {
      setSavingBookingSettings(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5" />;
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'failed':
        return <XIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const handleOrderClick = async (orderId: string) => {
    setLoadingOrder(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setSelectedOrder(data as any);
    } catch (error) {
      console.error('Error loading order details:', error);
      alert('Failed to load order details');
    } finally {
      setLoadingOrder(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!squareSettings?.square_enabled) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payments</h2>

        <div className="max-w-2xl">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-16 w-16 bg-black rounded-lg flex items-center justify-center">
                <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Square Payments</h3>
                <p className="text-gray-600">Accept payments through Square</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Connect your Square account to accept payments for your orders. Square provides secure payment processing
              and helps you manage all your transactions in one place.
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Features:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Accept credit cards, debit cards, and digital wallets</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Secure payment processing with PCI compliance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Real-time transaction reporting and analytics</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Automatic receipts and customer notifications</span>
                  </li>
                </ul>
              </div>
            </div>

            <a
              href="https://squareup.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              <span>Connect Square Account</span>
              <ExternalLink className="h-5 w-5" />
            </a>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Getting Started:</strong> If you don't have a Square account yet, you'll be able to create one during the connection process. It only takes a few minutes to set up.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Payments</h2>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Booking Payment Settings</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure how customers pay for booking appointments (requires Square integration)
        </p>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="bookingPaymentEnabled"
              checked={bookingPaymentEnabled}
              onChange={(e) => setBookingPaymentEnabled(e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
            <label htmlFor="bookingPaymentEnabled" className="ml-3 text-sm font-medium">
              Require payment for bookings
            </label>
          </div>

          {bookingPaymentEnabled && (
            <div className="ml-8 space-y-4 border-l-2 border-blue-200 pl-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Type</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="paymentTypeFull"
                      name="paymentType"
                      value="full"
                      checked={bookingPaymentType === 'full'}
                      onChange={(e) => setBookingPaymentType(e.target.value as 'full')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="paymentTypeFull" className="ml-2 text-sm">
                      Full payment required
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="paymentTypeDeposit"
                      name="paymentType"
                      value="deposit"
                      checked={bookingPaymentType === 'deposit'}
                      onChange={(e) => setBookingPaymentType(e.target.value as 'deposit')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="paymentTypeDeposit" className="ml-2 text-sm">
                      Deposit only
                    </label>
                  </div>
                </div>
              </div>

              {bookingPaymentType === 'deposit' && (
                <div>
                  <label htmlFor="depositPercentage" className="block text-sm font-medium mb-2">
                    Deposit Percentage
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      id="depositPercentage"
                      min="10"
                      max="100"
                      step="5"
                      value={bookingDepositPercentage}
                      onChange={(e) => setBookingDepositPercentage(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold w-12 text-right">{bookingDepositPercentage}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={saveBookingPaymentSettings}
            disabled={savingBookingSettings}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {savingBookingSettings ? 'Saving...' : 'Save Booking Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 truncate">${totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-10 sm:h-12 w-10 sm:w-12 text-green-200 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm">Completed Payments</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                {payments.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <Check className="h-10 sm:h-12 w-10 sm:w-12 text-blue-200 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm">Pending Payments</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-10 sm:h-12 w-10 sm:w-12 text-yellow-200 flex-shrink-0" />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b">
          <h3 className="font-semibold text-base sm:text-lg">Transaction History</h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold">Date</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold">Order</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold">Amount</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold hidden sm:table-cell">Method</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                      <div className="font-mono text-xs">{new Date(payment.created_at).toLocaleDateString()}</div>
                      <div className="text-gray-500 text-xs hidden sm:block">{new Date(payment.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 font-mono text-xs sm:text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleOrderClick(payment.order_id)}
                        className="text-blue-600 hover:text-blue-800 underline font-semibold"
                      >
                        {payment.order_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 font-semibold text-xs sm:text-sm whitespace-nowrap">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm hidden sm:table-cell whitespace-nowrap">
                      {payment.payment_method}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="capitalize hidden sm:inline">{payment.status}</span>
                        <span className="capitalize sm:hidden">{payment.status.charAt(0).toUpperCase()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Order ID</p>
                    <p className="font-mono font-semibold">{selectedOrder.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-semibold capitalize">{selectedOrder.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Time</p>
                    <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-semibold">{selectedOrder.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold">{selectedOrder.customer.email}</p>
                  </div>
                  {selectedOrder.customer.phone && (
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-semibold">{selectedOrder.customer.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center pb-3 border-b last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-semibold">{item.item_name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-green-600">
                        ${(item.price_at_order * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <p className="text-lg font-bold">Total</p>
                  <p className="text-xl font-bold text-green-600">
                    ${selectedOrder.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <p className="text-gray-700">Loading order details...</p>
          </div>
        </div>
      )}
    </div>
  );
}
