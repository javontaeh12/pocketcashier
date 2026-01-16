import { useEffect, useState } from 'react';
import { Calendar, Link2, XCircle, RefreshCw, CheckCircle, AlertCircle, Clock, Mail, Phone, User, MessageSquare, CheckCircleIcon, XIcon, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Booking {
  id: string;
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  service_type: string | null;
  notes: string | null;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarIntegration {
  is_connected: boolean;
  calendar_id: string;
  updated_at: string;
}

export function BookingsTab() {
  const { businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      loadIntegration();
      loadBookings();
    }
  }, [businessId]);

  const loadIntegration = async () => {
    if (!businessId) return;

    try {
      const { data, error: integrationError } = await supabase
        .from('google_calendar_integrations')
        .select('is_connected, calendar_id, updated_at')
        .eq('business_id', businessId)
        .maybeSingle();

      if (data) {
        setIntegration(data);
      }
    } catch (err) {
      console.error('Error loading integration:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!businessId) return;

    try {
      const { data, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .order('booking_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load bookings');
    }
  };

  const connectCalendar = async () => {
    if (!businessId) return;

    setConnecting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth?action=get-auth-url&business_id=${businessId}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get authorization URL');
      }

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        result.authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkWindow);
          setConnecting(false);
          loadIntegration();
        }
      }, 500);
    } catch (err: any) {
      console.error('Error connecting calendar:', err);
      setError(err.message || 'Failed to connect calendar');
      setConnecting(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!businessId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth?action=disconnect`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: businessId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to disconnect calendar');
      }

      setIntegration(null);
    } catch (err: any) {
      console.error('Error disconnecting calendar:', err);
      setError(err.message || 'Failed to disconnect calendar');
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    setUpdatingStatus(bookingId);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      setBookings(bookings.map(b =>
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteBooking = async (bookingId: string, calendarEventId: string | null) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      if (calendarEventId && integration?.is_connected) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-calendar-event`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventId: calendarEventId,
              }),
            });
          } catch (err) {
            console.error('Failed to delete calendar event:', err);
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (deleteError) throw deleteError;

      setBookings(bookings.filter(b => b.id !== bookingId));
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking');
    }
  };

  const formatBookingDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  const isPast = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const upcomingBookings = bookings.filter(b => isUpcoming(b.booking_date) && b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => isPast(b.booking_date) || b.status === 'cancelled');

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </h3>
            <p className="text-sm text-gray-600">
              Connect your Google Calendar to automatically sync bookings
            </p>
          </div>
          {integration?.is_connected && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!integration?.is_connected ? (
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Connect Your Google Calendar
            </h4>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Link your Google Calendar to automatically sync bookings. When customers book appointments, they'll be added to your calendar automatically.
            </p>
            <button
              onClick={connectCalendar}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Link2 className="h-5 w-5" />
              {connecting ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Calendar: {integration.calendar_id}</p>
                <p className="text-sm text-gray-600">
                  Last synced: {new Date(integration.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={disconnectCalendar}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Bookings</h3>
          <button
            onClick={loadBookings}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {upcomingBookings.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Upcoming Bookings</h4>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-1">
                            {booking.service_type || 'Appointment'}
                          </h5>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatBookingDate(booking.booking_date)}</span>
                            <span className="text-gray-400">({booking.duration_minutes} min)</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{booking.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{booking.customer_email}</span>
                        </div>
                        {booking.customer_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{booking.customer_phone}</span>
                          </div>
                        )}
                      </div>

                      {booking.notes && (
                        <div className="mb-4 p-3 bg-white rounded border border-blue-100">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-700">{booking.notes}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t border-blue-200">
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            disabled={updatingStatus === booking.id}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Confirm
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            disabled={updatingStatus === booking.id}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          disabled={updatingStatus === booking.id}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XIcon className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteBooking(booking.id, booking.calendar_event_id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {booking.calendar_event_id && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Synced with Google Calendar</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastBookings.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Past Bookings</h4>
                <div className="space-y-3">
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-lg border bg-gray-50 border-gray-200 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">
                            {booking.service_type || 'Appointment'}
                          </h5>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{formatBookingDate(booking.booking_date)}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p>{booking.customer_name} - {booking.customer_email}</p>
                      </div>

                      <button
                        onClick={() => deleteBooking(booking.id, booking.calendar_event_id)}
                        className="mt-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How Bookings Work</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>Customers can book appointments directly from your business page</li>
          <li>You'll receive email notifications for new bookings</li>
          <li>Bookings automatically sync with your Google Calendar when connected</li>
          <li>Confirm, complete, or cancel bookings as needed</li>
        </ul>
      </div>
    </div>
  );
}
