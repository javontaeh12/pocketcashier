import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload } from 'lucide-react';

export function AboutUsTab() {
  const [aboutUsText, setAboutUsText] = useState('');
  const [aboutUsImageUrl, setAboutUsImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { businessId } = useAuth();

  useEffect(() => {
    if (businessId) {
      loadAboutUs();
    }
  }, [businessId]);

  const loadAboutUs = async () => {
    if (!businessId) return;

    try {
      const { data } = await supabase
        .from('businesses')
        .select('about_us_text, about_us_image_url')
        .eq('id', businessId)
        .maybeSingle();

      if (data) {
        setAboutUsText(data.about_us_text || '');
        setAboutUsImageUrl(data.about_us_image_url || '');
        setPreviewUrl(data.about_us_image_url || '');
      }
    } catch (error) {
      console.error('Error loading about us:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !businessId) return;

    try {
      setLoading(true);
      const timestamp = Date.now();
      const fileName = `about-us-${businessId}-${timestamp}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      setAboutUsImageUrl(data.publicUrl);
      setImageFile(null);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    try {
      setLoading(true);

      let imageUrlToSave = aboutUsImageUrl;

      if (imageFile) {
        const uploadedUrl = await handleImageUpload();
        if (!uploadedUrl) return;
        imageUrlToSave = uploadedUrl;
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          about_us_text: aboutUsText,
          about_us_image_url: imageUrlToSave,
        })
        .eq('id', businessId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving about us:', error);
      alert('Failed to save about us information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">About Us</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              About Us Text
            </label>
            <textarea
              value={aboutUsText}
              onChange={(e) => setAboutUsText(e.target.value)}
              placeholder="Tell your customers about your business..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={8}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              About Us Image
            </label>
            <div className="space-y-4">
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setPreviewUrl('');
                      setAboutUsImageUrl('');
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="about-image-input"
                />
                <label
                  htmlFor="about-image-input"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <Upload className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Click to upload image
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save About Us'}
            </button>
            {saved && (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">Saved successfully</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
