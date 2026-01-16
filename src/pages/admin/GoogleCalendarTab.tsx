import { useEffect, useState } from 'react';
import { Calendar, Link2, XCircle, RefreshCw, CheckCircle, AlertCircle, Clock, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UpcomingBookingsSection } from './UpcomingBookingsSection';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  status: string;
}

interface CalendarIntegration {
  is_connected: boolean;
  calendar_id: string;
  updated_at: string;
}

export function GoogleCalendarTab() {
  const { businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      loadIntegration();

      const wasConnecting = sessionStorage.getItem('google_calendar_connecting');
      if (wasConnecting === businessId) {
        sessionStorage.removeItem('google_calendar_connecting');
        setConnecting(false);
        setAuthUrl(null);
        loadIntegration();
      }

      const connected = localStorage.getItem('google_calendar_connected');
      if (connected === 'true') {
        localStorage.removeItem('google_calendar_connected');
        setConnecting(false);
        setAuthUrl(null);
        loadIntegration();
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        window.history.replaceState({}, '', window.location.pathname + '?tab=google-calendar');
        setConnecting(false);
        setAuthUrl(null);
        loadIntegration();
      }
    }
  }, [businessId]);

  useEffect(() => {
    if (integration?.is_connected) {
      loadEvents();
    }
  }, [integration]);

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

  const loadEvents = async () => {
    if (!businessId) return;

    setLoadingEvents(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-calendar-events?business_id=${businessId}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load events');
      }

      setEvents(result.events || []);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const connectCalendar = async () => {
    if (!businessId) return;

    setConnecting(true);
    setError('');
    setAuthUrl(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConnecting(false);
        throw new Error('You are not logged in. Please sign in again.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth?action=get-auth-url&business_id=${businessId}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let result;
        try {
          result = await response.json();
        } catch {
          result = { error: `HTTP ${response.status}` };
        }
        setConnecting(false);
        throw new Error(result.error || `Failed to get authorization URL`);
      }

      const result = await response.json();

      if (!result.authUrl) {
        setConnecting(false);
        throw new Error('Server did not provide an authorization URL');
      }

      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isAndroid = /android/i.test(userAgent);
      const isMobile = isIOS || isAndroid || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      setAuthUrl(result.authUrl);

      if (isMobile) {
        sessionStorage.setItem('google_calendar_connecting', businessId);
      } else {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const authWindow = window.open(
          result.authUrl,
          'Google Calendar Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!authWindow) {
          setConnecting(false);
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        let pollCount = 0;
        const maxPolls = 120;
        const checkWindow = setInterval(async () => {
          pollCount++;

          try {
            if (authWindow?.closed) {
              clearInterval(checkWindow);
              setConnecting(false);
              await new Promise(resolve => setTimeout(resolve, 500));
              loadIntegration();
              return;
            }
          } catch (err) {
            console.error('Error checking window:', err);
          }

          if (pollCount >= maxPolls) {
            clearInterval(checkWindow);
            setConnecting(false);
          }
        }, 500);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        setError('Connection timeout. Please check your internet and try again.');
      } else {
        setError(err.message || 'Failed to get authorization URL');
      }

      setConnecting(false);
      setAuthUrl(null);
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
      setEvents([]);
    } catch (err: any) {
      console.error('Error disconnecting calendar:', err);
      setError(err.message || 'Failed to disconnect calendar');
    }
  };

  const formatEventDate = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    if (!start) return 'No date';

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (event.start.date) {
      return startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    const sameDay = startDate.toDateString() === endDate.toDateString();

    if (sameDay) {
      return `${startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} ${startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })} - ${endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }

    return `${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} ${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const isUpcoming = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return false;
    return new Date(start) > new Date();
  };

  const isPast = (event: CalendarEvent) => {
    const end = event.end.dateTime || event.end.date;
    if (!end) return false;
    return new Date(end) < new Date();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UpcomingBookingsSection />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </h3>
            <p className="text-sm text-gray-600">
              Connect your Google Calendar to view and manage bookings
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
              Link your Google Calendar to automatically sync and view all your bookings and appointments in one place.
            </p>

            {authUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 mb-3 font-medium">
                    Ready to connect! Tap the button below:
                  </p>
                  <a
                    href={authUrl}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-base font-medium"
                  >
                    <Link2 className="h-5 w-5" />
                    Sign in with Google
                  </a>
                </div>
                <button
                  onClick={() => setAuthUrl(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={connectCalendar}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-5 w-5" />
                  {connecting ? 'Loading...' : 'Connect Google Calendar'}
                </button>

                {connecting && (
                  <div className="mt-4 text-sm text-gray-500">
                    Getting authorization link...
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={loadEvents}
                  disabled={loadingEvents}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingEvents ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={disconnectCalendar}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Calendar Events</h4>

              {loadingEvents ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No events found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border-2 transition ${
                        isPast(event)
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : isUpcoming(event)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-gray-900 flex-1">
                          {event.summary || 'Untitled Event'}
                        </h5>
                        {isUpcoming(event) && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Upcoming
                          </span>
                        )}
                        {isPast(event) && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                            Past
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatEventDate(event)}</span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {event.description}
                        </p>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Attendees ({event.attendees.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {event.attendees.map((attendee, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {attendee.displayName || attendee.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900 mb-1">Important: Use a Computer to Connect</h4>
            <p className="text-sm text-orange-800">
              Please use a desktop or laptop computer to link your Google Calendar. Mobile connections may not work reliably with the authorization process.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Calendar Integration</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>View all your calendar events and bookings in one place</li>
          <li>Automatically sync with your Google Calendar</li>
          <li>See upcoming and past appointments with full details</li>
          <li>Manage attendee information and event locations</li>
        </ul>
      </div>
    </div>
  );
}
