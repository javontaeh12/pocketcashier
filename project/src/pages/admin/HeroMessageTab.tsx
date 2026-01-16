import { useState, useEffect } from 'react';
import { Megaphone, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FIELD_LIMITS } from '../../lib/fieldLimits';

export function HeroMessageTab() {
  const [heroMessage, setHeroMessage] = useState('');
  const [heroBannerBgColor, setHeroBannerBgColor] = useState('#1f2937');
  const [heroBannerTextColor, setHeroBannerTextColor] = useState('#ffffff');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { businessId } = useAuth();

  useEffect(() => {
    loadHeroMessage();
  }, [businessId]);

  const loadHeroMessage = async () => {
    if (!businessId) return;

    try {
      const { data } = await supabase
        .from('businesses')
        .select('hero_message, hero_banner_bg_color, hero_banner_text_color')
        .eq('id', businessId)
        .maybeSingle();

      if (data?.hero_message) {
        setHeroMessage(data.hero_message);
      }
      if (data?.hero_banner_bg_color) {
        setHeroBannerBgColor(data.hero_banner_bg_color);
      }
      if (data?.hero_banner_text_color) {
        setHeroBannerTextColor(data.hero_banner_text_color);
      }
    } catch (err) {
      console.error('Error loading hero message:', err);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          hero_message: heroMessage.trim() || null,
          hero_banner_bg_color: heroBannerBgColor,
          hero_banner_text_color: heroBannerTextColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving hero message:', err);
      setError('Failed to save hero message. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remainingChars = FIELD_LIMITS.HERO_MESSAGE - heroMessage.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-full">
          <Megaphone className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hero Message</h2>
          <p className="text-gray-600 text-sm">Display an announcement banner between business info and menu</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Megaphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-semibold mb-1">Use this message for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Free shipping announcements</li>
              <li>Order deadlines and cut-off times</li>
              <li>Special promotions or discounts</li>
              <li>Important business updates</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banner Message
        </label>
        <textarea
          value={heroMessage}
          onChange={(e) => setHeroMessage(e.target.value.slice(0, FIELD_LIMITS.HERO_MESSAGE))}
          placeholder="e.g., Free shipping on orders over $50! Order by Friday 5 PM for weekend delivery."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-500">
            {remainingChars} characters remaining
          </p>
          {heroMessage.trim() && (
            <button
              onClick={() => setHeroMessage('')}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Message
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Banner Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={heroBannerBgColor}
                onChange={(e) => setHeroBannerBgColor(e.target.value)}
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={heroBannerBgColor}
                onChange={(e) => setHeroBannerBgColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="#000000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={heroBannerTextColor}
                onChange={(e) => setHeroBannerTextColor(e.target.value)}
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={heroBannerTextColor}
                onChange={(e) => setHeroBannerTextColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </div>

      {heroMessage.trim() && (
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
          <div className="border-t-2 border-b-2 rounded-lg p-3" style={{ backgroundColor: heroBannerBgColor, borderColor: heroBannerBgColor }}>
            <p className="text-lg font-semibold text-center" style={{ color: heroBannerTextColor }}>{heroMessage}</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">This banner will appear between your business info and menu</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm font-medium">Hero message saved successfully!</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Hero Message'}
        </button>
      </div>
    </div>
  );
}
