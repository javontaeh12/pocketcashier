import { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  image_url: string | null;
}

interface UpcomingEventsDisplayProps {
  businessId: string;
  primaryColor: string;
  secondaryColor: string;
}

export function UpcomingEventsDisplay({ businessId, primaryColor, secondaryColor }: UpcomingEventsDisplayProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('Upcoming');
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    email: '',
  });
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    try {
      const [eventsResult, businessResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('business_id', businessId)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true }),
        supabase
          .from('businesses')
          .select('upcoming_section_title')
          .eq('id', businessId)
          .maybeSingle()
      ]);

      setEvents(eventsResult.data || []);
      setSectionTitle(businessResult.data?.upcoming_section_title || 'Upcoming');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !subscriptionForm.email) return;

    setSubscribing(true);
    try {
      const { error: subscriptionError } = await supabase
        .from('event_subscriptions')
        .insert({
          event_id: selectedEvent.id,
          email: subscriptionForm.email,
          name: subscriptionForm.name || null,
        });

      if (subscriptionError) throw subscriptionError;

      setSubscriptionMessage('Successfully subscribed! You will receive an email notification.');
      setSubscriptionForm({ name: '', email: '' });

      setTimeout(() => {
        setSelectedEvent(null);
        setSubscriptionMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error subscribing:', error);
      setSubscriptionMessage('Error subscribing. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return null;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div id="upcoming-events" className="w-full px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Calendar className="h-8 w-8" style={{ color: primaryColor }} />
          {sectionTitle}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const date = new Date(event.event_date);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden text-left border-l-4 h-full flex flex-col"
                style={{ borderLeftColor: secondaryColor }}
              >
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    crossOrigin="anonymous"
                    className="w-full h-auto object-contain flex-shrink-0"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formattedDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formattedTime}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm font-medium" style={{ color: primaryColor }}>
                    <Bell className="h-4 w-4" />
                    Get Notified
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold">Get Notified</h2>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSubscriptionMessage('');
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {selectedEvent.image_url && (
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  crossOrigin="anonymous"
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedEvent.title}</h3>

              <div className="space-y-2 mb-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedEvent.event_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </div>

              {selectedEvent.description && (
                <p className="text-gray-600 text-sm mb-6">{selectedEvent.description}</p>
              )}

              {subscriptionMessage ? (
                <div
                  className="p-4 rounded-lg text-sm font-medium text-center border"
                  style={{
                    backgroundColor: subscriptionMessage.includes('Error') ? '#fee2e2' : '#f0fdf4',
                    color: subscriptionMessage.includes('Error') ? '#991b1b' : '#166534',
                    borderColor: subscriptionMessage.includes('Error') ? '#fecaca' : '#bbf7d0',
                  }}
                >
                  {subscriptionMessage}
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                    <input
                      type="text"
                      value={subscriptionForm.name}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={subscriptionForm.email}
                      onChange={(e) => setSubscriptionForm({ ...subscriptionForm, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full py-2 rounded-lg transition font-semibold text-white flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Mail className="h-4 w-4" />
                    {subscribing ? 'Subscribing...' : 'Subscribe for Notifications'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="w-full py-2 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 transition font-medium text-sm"
                  >
                    Close
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
