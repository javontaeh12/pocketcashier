import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ShopSettings {
  id: string;
  shop_enabled: boolean;
  notification_email: string | null;
  order_prefix: string;
}

interface ShopSettingsTabProps {
  businessId: string;
}

export function ShopSettingsTab({ businessId }: ShopSettingsTabProps) {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [formData, setFormData] = useState({
    shop_enabled: false,
    notification_email: '',
    order_prefix: 'ORD-',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data);
        setFormData({
          shop_enabled: data.shop_enabled,
          notification_email: data.notification_email || '',
          order_prefix: data.order_prefix,
        });
      } else {
        const { data: newSettings, error: upsertError } = await supabase
          .from('shop_settings')
          .upsert({
            business_id: businessId,
            shop_enabled: false,
            notification_email: null,
            order_prefix: 'ORD-',
          }, {
            onConflict: 'business_id'
          })
          .select()
          .single();

        if (upsertError) throw upsertError;
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load shop settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      formData.notification_email &&
      !formData.notification_email.includes('@')
    ) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);

      if (settings) {
        const { error: updateError } = await supabase
          .from('shop_settings')
          .update({
            shop_enabled: formData.shop_enabled,
            notification_email: formData.notification_email || null,
            order_prefix: formData.order_prefix,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (updateError) throw updateError;
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Shop Settings
          </h3>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.shop_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shop_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Enable Shop
                  </span>
                  <p className="text-sm text-gray-600">
                    Display and allow customers to purchase products
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Notification Email
              </label>
              <input
                type="email"
                value={formData.notification_email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notification_email: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Where to send new order notifications
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order ID Prefix
              </label>
              <input
                type="text"
                value={formData.order_prefix}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ORD-"
              />
              <p className="text-xs text-gray-500 mt-1">
                Prefix for display order IDs (e.g., ORD-001)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Shop Status</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            Shop is currently{' '}
            <span className="font-semibold">
              {formData.shop_enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </p>
          <p>
            Order notifications will be sent to:{' '}
            <span className="font-semibold">
              {formData.notification_email || 'Not configured'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
