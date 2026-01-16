import { useEffect, useState } from 'react';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  service_type: string | null;
  notes: string | null;
}

export function UpcomingBookingsSection() {
  const { businessId } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      loadUpcomingBookings();
    }
  }, [businessId]);

  const loadUpcomingBookings = async () => {
    if (!businessId) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .gt('booking_date', now)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading upcoming bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBookingTime = (bookingDate: string, durationMinutes: number) => {
    const start = new Date(bookingDate);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    return `${start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} ${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
        {bookings.length > 0 && (
          <span className="ml-auto text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No upcoming bookings</p>
          <p className="text-sm text-gray-400">All bookings will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-base mb-1">
                    {booking.service_type || 'Appointment'}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatBookingTime(booking.booking_date, booking.duration_minutes)}</span>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{booking.customer_name}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a
                    href={`mailto:${booking.customer_email}`}
                    className="text-blue-600 hover:underline truncate"
                  >
                    {booking.customer_email}
                  </a>
                </div>

                {booking.customer_phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                      {booking.customer_phone}
                    </a>
                  </div>
                )}

                {booking.notes && (
                  <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm line-clamp-2">{booking.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
