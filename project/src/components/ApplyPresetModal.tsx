import { useEffect, useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type BusinessPreset = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  primary_color: string;
  secondary_color: string;
};

interface ApplyPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess: () => void;
}

export function ApplyPresetModal({
  isOpen,
  onClose,
  businessId,
  onSuccess,
}: ApplyPresetModalProps) {
  const [presets, setPresets] = useState<BusinessPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setError('');
      setSuccess(false);
      setSelectedPreset(null);
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('business_presets')
        .select('id, name, description, category, primary_color, secondary_color')
        .order('name');

      if (fetchError) throw fetchError;
      setPresets(data || []);
      if (data && data.length > 0) {
        setSelectedPreset(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading presets:', err);
      setError('Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset) return;

    setApplying(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-business-preset`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          presetId: selectedPreset,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply preset');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error applying preset:', err);
      setError(err.message || 'Failed to apply preset');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Preset Applied!</h3>
          <p className="text-gray-600">
            Your business template has been successfully applied with new colors, settings, and sample menu items.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Apply Business Template</h2>
          <button
            onClick={onClose}
            disabled={applying}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-gray-600 mt-3">Loading templates...</p>
            </div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates available
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Select a template to apply to your business. This will update your colors, settings, and add sample menu items.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      disabled={applying}
                      className={`relative p-4 rounded-lg border-2 transition text-left ${
                        selectedPreset === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${applying ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0 border-2 border-gray-200"
                          style={{
                            backgroundColor: preset.primary_color,
                            borderColor: preset.secondary_color
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm">{preset.name}</h4>
                          <p className="text-xs text-gray-500">{preset.category}</p>
                          {preset.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{preset.description}</p>
                          )}
                        </div>
                        {selectedPreset === preset.id && (
                          <div className="absolute top-3 right-3">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
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
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Applying a template will update your business colors, display settings, and add sample menu items. Your existing items and settings won't be deleted.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={applying}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPreset}
                  disabled={!selectedPreset || applying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {applying ? 'Applying Template...' : 'Apply Template'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
