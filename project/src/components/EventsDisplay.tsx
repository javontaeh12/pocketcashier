import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  image_url: string;
}

export function EventsDisplay({ businessId }: { businessId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [businessId]);

  const loadEvents = async () => {
    try {
      const { data, error: err } = await supabase
        .from('events')
        .select('*')
        .eq('business_id', businessId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(3);

      if (err) throw err;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || events.length === 0) return null;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 bg-gradient-to-b from-amber-50 to-orange-50">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">Upcoming</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden">
            {event.image_url && (
              <img src={event.image_url} alt={event.title} crossOrigin="anonymous" className="w-full h-32 sm:h-40 object-cover" />
            )}
            <div className="p-3 sm:p-4">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">{event.title}</h3>
              {event.description && (
                <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
              )}
              <div className="flex items-center text-xs sm:text-sm text-gray-500 gap-2">
                <Calendar className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                <span>{new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
