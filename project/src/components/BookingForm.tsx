import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BookingFormProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface BookingResult {
  success: boolean;
  trace_id?: string;
  notifications?: {
    calendar_synced: boolean;
    emails_sent: boolean;
  };
}

export function BookingForm({ businessId, businessName, onClose }: BookingFormProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    booking_date: '',
    booking_time: '',
    duration_minutes: 60,
    service_type: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contact', 'datetime']));
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [bookingPaymentEnabled, setBookingPaymentEnabled] = useState(false);
  const [bookingPaymentType, setBookingPaymentType] = useState<'deposit' | 'full'>('full');
  const [bookingDepositPercentage, setBookingDepositPercentage] = useState(50);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [squareAccessToken, setSquareAccessToken] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');

  useEffect(() => {
    loadBusinessSettings();
    loadMenuItems();
  }, [businessId]);

  useEffect(() => {
    if (selectedMenuItem && bookingPaymentEnabled) {
      const item = menuItems.find(m => m.id === selectedMenuItem);
      if (item) {
        if (bookingPaymentType === 'deposit') {
          setPaymentAmount(item.price * (bookingDepositPercentage / 100));
        } else {
          setPaymentAmount(item.price);
        }
      }
    }
  }, [selectedMenuItem, bookingPaymentEnabled, bookingPaymentType, bookingDepositPercentage, menuItems]);

  const loadBusinessSettings = async () => {
    const { data: businessData } = await supabase
      .from('businesses')
      .select('booking_payment_enabled, booking_payment_type, booking_deposit_percentage')
      .eq('id', businessId)
      .maybeSingle();

    const { data: settingsData } = await supabase
      .from('settings')
      .select('square_access_token, square_location_id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (businessData) {
      setBookingPaymentEnabled(businessData.booking_payment_enabled || false);
      setBookingPaymentType(businessData.booking_payment_type || 'full');
      setBookingDepositPercentage(businessData.booking_deposit_percentage || 50);
    }

    if (settingsData) {
      setSquareAccessToken(settingsData.square_access_token || '');
      setSquareLocationId(settingsData.square_location_id || '');
    }
  };

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('id, name, price, description')
      .eq('business_id', businessId)
      .order('name');

    setMenuItems(data || []);
  };

  const processSquarePayment = async () => {
    if (!squareAccessToken || !squareLocationId) {
      throw new Error('Payment system not configured. Please contact the business.');
    }

    setProcessingPayment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-square-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId,
            amount: paymentAmount,
            currency: 'USD',
            customerEmail: formData.customer_email,
            note: `Booking ${bookingPaymentType === 'deposit' ? 'deposit' : 'payment'}`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Payment failed');
      }

      return result.paymentId;
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBookingResult(null);

    try {
      if (bookingPaymentEnabled && !selectedMenuItem) {
        throw new Error('Please select a service');
      }

      let paymentId = null;

      if (bookingPaymentEnabled) {
        try {
          paymentId = await processSquarePayment();
        } catch (paymentError: any) {
          throw new Error(paymentError.message || 'Payment failed. Please try again.');
        }
      }

      const idempotencyKey = `${businessId}-${formData.customer_email}-${formData.booking_date}T${formData.booking_time}-${Date.now()}`;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          booking_date: formData.booking_date,
          booking_time: formData.booking_time,
          duration_minutes: formData.duration_minutes,
          service_type: formData.service_type || menuItems.find(m => m.id === selectedMenuItem)?.name,
          notes: formData.notes,
          menu_item_id: selectedMenuItem || null,
          payment_amount: paymentId ? paymentAmount : null,
          payment_status: paymentId ? 'paid' : 'pending',
          payment_id: paymentId,
          idempotency_key: idempotencyKey,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create booking');
      }

      setBookingResult(result);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'booking_time' && value) {
      setTimeout(() => {
        const newSections = new Set(expandedSections);
        newSections.delete('datetime');
        if (bookingPaymentEnabled && menuItems.length > 0) {
          newSections.add('service');
        } else {
          newSections.add('details');
        }
        setExpandedSections(newSections);
      }, 200);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (success) {
    const calendarSynced = bookingResult?.notifications?.calendar_synced;
    const emailsSent = bookingResult?.notifications?.emails_sent;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {bookingPaymentEnabled ? 'Payment Successful!' : 'Booking Confirmed!'}
          </h3>
          <p className="text-gray-600 mb-4">
            {bookingPaymentEnabled
              ? `Your payment of $${paymentAmount.toFixed(2)} has been processed.`
              : 'Thank you for your booking.'}
          </p>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${emailsSent ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className={emailsSent ? 'text-green-600' : 'text-gray-400'}>
                  {emailsSent ? '✓' : '○'}
                </span>
              </div>
              <span className="text-gray-700">Confirmation email sent</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${calendarSynced ? 'bg-green-100' : 'bg-amber-100'}`}>
                <span className={calendarSynced ? 'text-green-600' : 'text-amber-600'}>
                  {calendarSynced ? '✓' : '○'}
                </span>
              </div>
              <span className="text-gray-700">
                {calendarSynced ? 'Calendar event created' : 'Calendar not synced'}
              </span>
            </div>
          </div>

          {bookingResult?.trace_id && (
            <p className="text-xs text-gray-400 mb-4 font-mono break-all">
              Ref: {bookingResult.trace_id}
            </p>
          )}

          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Book an Appointment</h3>
            <p className="text-sm text-gray-600 mt-1">{businessName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('contact')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition"
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </span>
              <span className="text-lg">{expandedSections.has('contact') ? '−' : '+'}</span>
            </button>
            {expandedSections.has('contact') && (
              <div className="p-4 space-y-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('datetime')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date & Time
              </span>
              <span className="text-lg">{expandedSections.has('datetime') ? '−' : '+'}</span>
            </button>
            {expandedSections.has('datetime') && (
              <div className="p-4 space-y-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <input
                      type="date"
                      name="booking_date"
                      value={formData.booking_date}
                      onChange={handleChange}
                      min={getMinDate()}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                    <input
                      type="time"
                      name="booking_time"
                      value={formData.booking_time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {bookingPaymentEnabled && menuItems.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('service')}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition"
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Select Service
                </span>
                <span className="text-lg">{expandedSections.has('service') ? '−' : '+'}</span>
              </button>
              {expandedSections.has('service') && (
                <div className="p-4 space-y-4 border-t border-gray-200">
                  <select
                    value={selectedMenuItem}
                    onChange={(e) => setSelectedMenuItem(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a service...</option>
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} - ${item.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {selectedMenuItem && paymentAmount > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        {bookingPaymentType === 'deposit'
                          ? `${bookingDepositPercentage}% deposit required: $${paymentAmount.toFixed(2)}`
                          : `Full payment required: $${paymentAmount.toFixed(2)}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('details')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Additional Details
              </span>
              <span className="text-lg">{expandedSections.has('details') ? '−' : '+'}</span>
            </button>
            {expandedSections.has('details') && (
              <div className="p-4 space-y-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
                    <select
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <input
                      type="text"
                      name="service_type"
                      value={formData.service_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Consultation"
                      disabled={bookingPaymentEnabled && selectedMenuItem !== ''}
                    />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Any special requests or information..."
                    />
                  </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || processingPayment}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingPayment
                ? 'Processing Payment...'
                : loading
                ? 'Confirming...'
                : bookingPaymentEnabled
                ? `Pay $${paymentAmount.toFixed(2)} & Book`
                : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
