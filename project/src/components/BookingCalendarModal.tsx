import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface BookingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  menuItem: MenuItem;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function BookingCalendarModal({ isOpen, onClose, businessId, menuItem }: BookingCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBusinessSettings();
      generateTimeSlots();
    }
  }, [isOpen, selectedDate, businessId]);

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
      const combinedData = {
        ...businessData,
        square_access_token: settingsData?.square_access_token,
        square_location_id: settingsData?.square_location_id
      };
      setBusinessSettings(combinedData);

      if (businessData.booking_payment_enabled) {
        if (businessData.booking_payment_type === 'deposit') {
          setPaymentAmount(menuItem.price * (businessData.booking_deposit_percentage / 100));
        } else {
          setPaymentAmount(menuItem.price);
        }
      }
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 18;
    const interval = 30;

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('booking_date')
      .eq('business_id', businessId)
      .gte('booking_date', selectedDate.toISOString().split('T')[0])
      .lt('booking_date', new Date(selectedDate.getTime() + 86400000).toISOString().split('T')[0]);

    const bookedTimes = new Set(
      existingBookings?.map(b => new Date(b.booking_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })) || []
    );

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        slots.push({
          time: timeString,
          available: !bookedTimes.has(timeString)
        });
      }
    }

    setTimeSlots(slots);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date >= today) {
      setSelectedDate(date);
      setSelectedTime(null);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const processSquarePayment = async () => {
    if (!businessSettings?.square_access_token || !businessSettings?.square_location_id) {
      throw new Error('Square payment not configured');
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
            customerEmail,
            note: `Booking deposit for ${menuItem.name}`,
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

    if (!selectedDate || !selectedTime || !customerName || !customerEmail) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let paymentId = null;

      if (businessSettings?.booking_payment_enabled) {
        paymentId = await processSquarePayment();
      }

      const [hours, minutes, period] = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i)?.slice(1) || [];
      let hour = parseInt(hours);
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      const dateString = selectedDate.toISOString().split('T')[0];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: businessId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            booking_date: dateString,
            booking_time: timeString,
            menu_item_id: menuItem.id,
            payment_amount: paymentId ? paymentAmount : null,
            payment_status: paymentId ? 'paid' : 'pending',
            payment_id: paymentId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      alert('Booking confirmed! You will receive a confirmation email shortly.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Book {menuItem.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">{menuItem.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{menuItem.description}</p>
            <p className="text-lg font-bold text-blue-600">
              ${menuItem.price.toFixed(2)}
              {businessSettings?.booking_payment_enabled && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({businessSettings.booking_payment_type === 'deposit'
                    ? `${businessSettings.booking_deposit_percentage}% deposit: $${paymentAmount.toFixed(2)}`
                    : 'Full payment required'})
                </span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Select Date
                </h3>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="px-3 py-1 hover:bg-gray-100 rounded"
                    >
                      ←
                    </button>
                    <span className="font-semibold">{monthName}</span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="px-3 py-1 hover:bg-gray-100 rounded"
                    >
                      →
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isPast = date < today;
                      const isSelected = selectedDate?.getDate() === day &&
                                        selectedDate?.getMonth() === currentDate.getMonth() &&
                                        selectedDate?.getFullYear() === currentDate.getFullYear();

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDateClick(day)}
                          disabled={isPast}
                          className={`p-2 text-center rounded ${
                            isPast
                              ? 'text-gray-300 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Time
                </h3>

                {!selectedDate ? (
                  <div className="border rounded-lg p-8 text-center text-gray-500">
                    Please select a date first
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-2 text-sm rounded ${
                            !slot.available
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : selectedTime === slot.time
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-50 hover:bg-blue-50'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || processingPayment || !selectedDate || !selectedTime}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingPayment ? (
                  'Processing Payment...'
                ) : loading ? (
                  'Confirming...'
                ) : businessSettings?.booking_payment_enabled ? (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Pay & Confirm Booking
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}