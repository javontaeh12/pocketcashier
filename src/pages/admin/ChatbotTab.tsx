import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function ChatbotTab() {
  const { businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [businessType, setBusinessType] = useState('general');
  const [chatbotTone, setChatbotTone] = useState('');
  const [enableBookings, setEnableBookings] = useState(true);
  const [enableReferrals, setEnableReferrals] = useState(true);
  const [enableServiceHelp, setEnableServiceHelp] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('chatbot_enabled, business_type, chatbot_tone, chatbot_goals')
        .eq('id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setChatbotEnabled(data.chatbot_enabled ?? true);
        setBusinessType(data.business_type || 'general');
        setChatbotTone(data.chatbot_tone || '');

        if (data.chatbot_goals) {
          setEnableBookings(data.chatbot_goals.enable_bookings ?? true);
          setEnableReferrals(data.chatbot_goals.enable_referrals ?? true);
          setEnableServiceHelp(data.chatbot_goals.enable_service_help ?? true);
        }
      }
    } catch (err) {
      console.error('Error loading chatbot settings:', err);
      setError('Failed to load chatbot settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          chatbot_enabled: chatbotEnabled,
          business_type: businessType,
          chatbot_tone: chatbotTone || null,
          chatbot_goals: {
            enable_bookings: enableBookings,
            enable_referrals: enableReferrals,
            enable_service_help: enableServiceHelp,
          },
        })
        .eq('id', businessId);

      if (error) throw error;

      setSuccess('Chatbot settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving chatbot settings:', err);
      setError(err.message || 'Failed to save chatbot settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">AI Chatbot Settings</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Configure your business chatbot to help customers with bookings, referrals, and service selection.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Enable Chatbot */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900">Enable AI Chatbot</h3>
              <p className="text-sm text-gray-600 mt-1">
                Show the chatbot widget on your business page
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={chatbotEnabled}
                onChange={(e) => setChatbotEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General Business</option>
              <option value="barber">Barber / Hair Salon</option>
              <option value="catering">Catering / Food Service</option>
              <option value="fitness">Fitness / Training</option>
              <option value="creator">Content Creator / Influencer</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              This helps the chatbot adapt its language and recommendations to your business
            </p>
          </div>

          {/* Chatbot Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Tone (Optional)
            </label>
            <textarea
              value={chatbotTone}
              onChange={(e) => setChatbotTone(e.target.value)}
              placeholder="e.g., friendly and casual, professional, enthusiastic..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-600">
              Optional: Describe the tone or personality you want the chatbot to have
            </p>
          </div>

          {/* Chatbot Goals */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Chatbot Capabilities</h3>
            <p className="text-sm text-gray-600">
              Choose what the chatbot can help customers with
            </p>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={enableBookings}
                  onChange={(e) => setEnableBookings(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Booking Assistance</div>
                  <div className="text-sm text-gray-600">
                    Help customers schedule appointments and bookings
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={enableReferrals}
                  onChange={(e) => setEnableReferrals(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Referral Program</div>
                  <div className="text-sm text-gray-600">
                    Promote your referral program and help customers get codes
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={enableServiceHelp}
                  onChange={(e) => setEnableServiceHelp(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Service Selection</div>
                  <div className="text-sm text-gray-600">
                    Help customers browse and choose from your services
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Section */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Preview Welcome Message</h3>
            <div className="text-sm text-gray-700">
              {businessType === 'barber' && "👋 Welcome! Ready to book a haircut or beard trim?"}
              {businessType === 'catering' && "👋 Hi! Looking for catering services for your event?"}
              {businessType === 'fitness' && "👋 Hey! Ready to schedule a training session?"}
              {businessType === 'creator' && "👋 Welcome! Interested in my content or services?"}
              {businessType === 'general' && "👋 Hi! How can I help you today?"}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Chatbot Settings'}</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How the Chatbot Works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="mt-0.5">•</span>
            <span>The chatbot appears as a widget in the bottom-right corner of your business page</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5">•</span>
            <span>It can answer questions, recommend services, and guide customers through bookings</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5">•</span>
            <span>All booking confirmations require customer approval before being created</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5">•</span>
            <span>The chatbot adapts its responses based on your business type</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
