import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type BusinessPreset = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  primary_color: string;
  secondary_color: string;
};

interface PresetSelectorProps {
  onSelect: (presetId: string) => void;
  isLoading?: boolean;
}

export function PresetSelector({ onSelect, isLoading }: PresetSelectorProps) {
  const [presets, setPresets] = useState<BusinessPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('business_presets')
        .select('id, name, description, category, primary_color, secondary_color')
        .order('name');

      if (error) throw error;
      setPresets(data || []);
      if (data && data.length > 0) {
        setSelectedPreset(data[0].id);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading presets...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Business Type</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select a preset template to start with pre-configured settings and sample menu items. You can customize everything later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setSelectedPreset(preset.id)}
            className={`relative p-4 rounded-lg border-2 transition text-left ${
              selectedPreset === preset.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-gray-200"
                style={{
                  backgroundColor: preset.primary_color,
                  borderColor: preset.secondary_color
                }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{preset.category}</p>
                {preset.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{preset.description}</p>
                )}
              </div>
              {selectedPreset === preset.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => selectedPreset && onSelect(selectedPreset)}
        disabled={!selectedPreset || isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating Account...' : 'Continue with Selected Template'}
      </button>
    </div>
  );
}
