import { useEffect, useState } from 'react';
import { Save, Key, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function IntegrationsTab() {
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [squareApplicationId, setSquareApplicationId] = useState('');
  const [squareAccessToken, setSquareAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: googleData, error: googleError } = await supabase
        .from('system_integrations')
        .select('config')
        .eq('integration_type', 'google_oauth')
        .maybeSingle();

      if (googleError) throw googleError;

      if (googleData?.config) {
        setGoogleClientId(googleData.config.client_id || '');
        setGoogleClientSecret(googleData.config.client_secret || '');
      }

      const { data: squareData, error: squareError } = await supabase
        .from('system_integrations')
        .select('config')
        .eq('integration_type', 'square_global')
        .maybeSingle();

      if (squareError) throw squareError;

      if (squareData?.config) {
        setSquareApplicationId(squareData.config.application_id || '');
        setSquareAccessToken(squareData.config.access_token || '');
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      setMessage({ type: 'error', text: 'Failed to load integrations' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error: googleError } = await supabase
        .from('system_integrations')
        .upsert({
          integration_type: 'google_oauth',
          config: {
            client_id: googleClientId,
            client_secret: googleClientSecret,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'integration_type',
        });

      if (googleError) throw googleError;

      const { error: squareError } = await supabase
        .from('system_integrations')
        .upsert({
          integration_type: 'square_global',
          config: {
            application_id: squareApplicationId,
            access_token: squareAccessToken,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'integration_type',
        });

      if (squareError) throw squareError;

      setMessage({ type: 'success', text: 'Integration settings saved successfully!' });
    } catch (error) {
      console.error('Error saving integrations:', error);
      setMessage({ type: 'error', text: 'Failed to save integration settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Integrations</h2>
        <p className="text-gray-600">
          Configure system-wide integrations that will be available to all business accounts.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center space-x-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Google OAuth - Calendar Integration</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Configure Google OAuth credentials to enable Google Calendar integration. When customers book appointments, events will be automatically created in connected Google Calendars.
          Get these credentials from your{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Google Cloud Console
          </a>
          .
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="googleClientId" className="block text-sm font-medium text-gray-700 mb-2">
              Google Client ID
            </label>
            <input
              type="text"
              id="googleClientId"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your-client-id.apps.googleusercontent.com"
            />
            <p className="text-xs text-gray-500 mt-2">
              Find this in Google Cloud Console under APIs & Services &gt; Credentials
            </p>
          </div>

          <div>
            <label htmlFor="googleClientSecret" className="block text-sm font-medium text-gray-700 mb-2">
              Google Client Secret
            </label>
            <input
              type="password"
              id="googleClientSecret"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your Google client secret"
            />
            <p className="text-xs text-gray-500 mt-2">
              Keep this secret safe. It will be stored securely in the database.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console and create/select a project</li>
              <li>Enable the Google Calendar API</li>
              <li>Create OAuth 2.0 credentials (Web application type)</li>
              <li>
                Add authorized redirect URI:{' '}
                <code className="bg-blue-100 px-1 rounded text-xs">
                  {window.location.origin}/functions/v1/google-calendar-oauth?action=callback
                </code>
              </li>
              <li>Copy the Client ID and Client Secret here</li>
            </ol>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2 transition-colors"
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Google OAuth Settings'}</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Square Global Credentials</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Configure global Square credentials that will be available to all business accounts.
          Get these credentials from your{' '}
          <a
            href="https://developer.squareup.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Square Developer Dashboard
          </a>
          .
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="squareApplicationId" className="block text-sm font-medium text-gray-700 mb-2">
              Square Application ID
            </label>
            <input
              type="text"
              id="squareApplicationId"
              value={squareApplicationId}
              onChange={(e) => setSquareApplicationId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Your Square Application ID"
            />
            <p className="text-xs text-gray-500 mt-2">
              Find this in Square Developer Dashboard under your application settings
            </p>
          </div>

          <div>
            <label htmlFor="squareAccessToken" className="block text-sm font-medium text-gray-700 mb-2">
              Square Access Token
            </label>
            <input
              type="password"
              id="squareAccessToken"
              value={squareAccessToken}
              onChange={(e) => setSquareAccessToken(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your Square access token"
            />
            <p className="text-xs text-gray-500 mt-2">
              Keep this token secure. It will be stored securely in the database.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Setup Instructions</h4>
            <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
              <li>Go to Square Developer Dashboard and select your application</li>
              <li>Navigate to the Credentials tab</li>
              <li>Copy your Application ID from the Sandbox or Production environment</li>
              <li>Generate and copy your Access Token</li>
              <li>Paste both values here to enable Square for all businesses</li>
            </ol>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2 transition-colors"
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Square Credentials'}</span>
        </button>
      </div>
    </div>
  );
}
