import { useState, useEffect } from 'react';
import { Trash2, Plus, Calendar, Clock, Upload, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  image_url: string | null;
  created_at: string;
}

export function EventsTab() {
  const { businessId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upcomingText, setUpcomingText] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '12:00',
    image_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!businessId) return;
    try {
      const [eventsResult, businessResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('business_id', businessId)
          .order('event_date', { ascending: true }),
        supabase
          .from('businesses')
          .select('upcoming_section_title')
          .eq('id', businessId)
          .maybeSingle()
      ]);

      setEvents(eventsResult.data || []);
      setUpcomingText(businessResult.data?.upcoming_section_title || '');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!businessId) return;
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('business_id', businessId)
        .order('event_date', { ascending: true });
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!businessId) return;
    setSavingTitle(true);
    try {
      await supabase
        .from('businesses')
        .update({ upcoming_section_title: upcomingText || null })
        .eq('id', businessId);
      alert('Upcoming section text saved successfully!');
    } catch (error) {
      console.error('Error saving title:', error);
      alert('Failed to save section text');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.title || !formData.event_date) return;

    try {
      const eventDateTime = `${formData.event_date}T${formData.event_time}:00+00:00`;

      if (editingId) {
        await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description || null,
            event_date: eventDateTime,
            image_url: formData.image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
      } else {
        await supabase
          .from('events')
          .insert({
            business_id: businessId,
            title: formData.title,
            description: formData.description || null,
            event_date: eventDateTime,
            image_url: formData.image_url || null,
          });
      }

      setFormData({
        title: '',
        description: '',
        event_date: '',
        event_time: '12:00',
        image_url: '',
      });
      setEditingId(null);
      setShowForm(false);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await supabase
        .from('events')
        .delete()
        .eq('id', id);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleEdit = (event: Event) => {
    const date = new Date(event.event_date);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: date.toISOString().split('T')[0],
      event_time: date.toTimeString().slice(0, 5),
      image_url: event.image_url || '',
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      event_time: '12:00',
      image_url: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    setUploading(true);
    try {
      const fileName = `event-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('business-assets')
        .upload(`${businessId}/events/${fileName}`, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('business-assets')
        .getPublicUrl(`${businessId}/events/${fileName}`);

      setFormData({ ...formData, image_url: publicUrl.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Section</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Text (Optional)</label>
            <textarea
              value={upcomingText}
              onChange={(e) => setUpcomingText(e.target.value)}
              placeholder="Add a custom message for your upcoming events section. Leave blank for default 'Upcoming' title."
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{upcomingText.length}/200 characters</p>
          </div>
          <button
            onClick={handleSaveTitle}
            disabled={savingTitle}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {savingTitle ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-sm text-gray-600">Add custom text that will appear above your upcoming events. If left blank, "Upcoming" will be displayed as the section title.</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Create Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
            <div className="flex flex-col gap-3">
              {formData.image_url && (
                <div className="relative inline-block">
                  <img
                    src={formData.image_url}
                    alt="Event preview"
                    className="h-48 w-full object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-red-700 shadow-lg"
                  >
                    ✕
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <Upload className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Grand Opening Party"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingId ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No events yet. Create one to get started!</p>
          </div>
        ) : (
          events.map((event) => {
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
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-48 sm:h-24 sm:w-24 w-full object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                    {event.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formattedDate}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formattedTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(event)}
                      className="flex-1 sm:flex-none px-3 py-1 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
