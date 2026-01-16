import { useEffect, useRef, useState } from 'react';
import { Upload, Loader, Palette } from 'lucide-react';
import { supabase, Business } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

function extractColorsFromImage(imageUrl: string): Promise<{ primary: string; secondary: string; text: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ primary: '#2563eb', secondary: '#16a34a', text: '#ffffff' });
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const colorCounts: { [key: string]: number } = {};

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 128) continue;

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > 240 || brightness < 15) continue;

        const roundedR = Math.round(r / 30) * 30;
        const roundedG = Math.round(g / 30) * 30;
        const roundedB = Math.round(b / 30) * 30;
        const color = `${roundedR},${roundedG},${roundedB}`;

        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }

      const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });

      const primary = sortedColors[0] || '#2563eb';
      const secondary = sortedColors[1] || '#16a34a';

      const [r, g, b] = sortedColors[0]?.match(/[0-9a-f]{2}/gi)?.map(x => parseInt(x, 16)) || [37, 99, 235];
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const text = brightness > 128 ? '#000000' : '#ffffff';

      resolve({ primary, secondary, text });
    };
    img.onerror = () => {
      resolve({ primary: '#2563eb', secondary: '#16a34a', text: '#ffffff' });
    };
    img.src = imageUrl;
  });
}

export function LogoTab() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#16a34a');
  const [textColor, setTextColor] = useState('#ffffff');
  const [pageBackgroundColor, setPageBackgroundColor] = useState('#f3f4f6');
  const { businessId } = useAuth();
  const logoSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  const loadBusiness = async () => {
    if (!businessId) return;

    try {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (data) {
        setBusiness(data);
        setBusinessName(data.name);
        setPrimaryColor(data.primary_color || '#2563eb');
        setSecondaryColor(data.secondary_color || '#16a34a');
        setTextColor(data.text_color || '#ffffff');
        setPageBackgroundColor(data.page_background_color || '#f3f4f6');
      }
    } catch (error) {
      console.error('Error loading business:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      const colors = await extractColorsFromImage(data.publicUrl);
      setPrimaryColor(colors.primary);
      setSecondaryColor(colors.secondary);
      setTextColor(colors.text);

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          logo_url: data.publicUrl,
          primary_color: colors.primary,
          secondary_color: colors.secondary,
          text_color: colors.text,
          page_background_color: pageBackgroundColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (updateError) throw updateError;

      loadBusiness();
      alert('Logo uploaded and colors extracted successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBusinessName = async () => {
    if (!business) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ name: businessName, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (error) throw error;

      loadBusiness();
      alert('Business name updated successfully!');
    } catch (error) {
      console.error('Error updating business name:', error);
      alert('Failed to update business name');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveColors = async () => {
    if (!business) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          text_color: textColor,
          page_background_color: pageBackgroundColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      loadBusiness();
      alert('Colors updated successfully!');

      setTimeout(() => {
        if (logoSectionRef.current) {
          logoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } catch (error) {
      console.error('Error updating colors:', error);
      alert('Failed to update colors');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Public Menu Settings</h2>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Business Name</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="My Food Truck"
            />
            <button
              onClick={handleSaveBusinessName}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This name will appear on your customer-facing menu page.
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Brand Colors</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Colors are automatically extracted from your logo. You can customize them below.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color (Buttons & Accents)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-full sm:w-20 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color (Price & Success)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-12 w-full sm:w-20 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="#16a34a"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Color on Primary Background
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-12 w-full sm:w-20 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Background Color
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="color"
                  value={pageBackgroundColor}
                  onChange={(e) => setPageBackgroundColor(e.target.value)}
                  className="h-12 w-full sm:w-20 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={pageBackgroundColor}
                  onChange={(e) => setPageBackgroundColor(e.target.value)}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="#f3f4f6"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveColors}
                disabled={saving}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {saving ? 'Saving Colors...' : 'Save Colors'}
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Color Preview:</p>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="h-16 rounded-lg flex items-center justify-center font-semibold text-sm"
                  style={{ backgroundColor: primaryColor, color: textColor }}
                >
                  Primary
                </div>
                <div
                  className="h-16 rounded-lg flex items-center justify-center font-semibold text-white text-sm"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref={logoSectionRef} className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Business Logo</h3>

          {business?.logo_url && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
              <img
                src={business.logo_url}
                alt="Business logo"
                className="h-32 w-32 object-contain border rounded-lg bg-gray-50 p-2"
              />
            </div>
          )}

          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base whitespace-nowrap">
              {uploading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Uploading...</span>
                  <span className="sm:hidden">Upload...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Upload New Logo</span>
                  <span className="sm:hidden">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              This logo will appear in the header of your customer-facing menu page.
              Recommended size: 200x200 pixels or larger.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes to your logo, colors, and business name will appear immediately on your customer-facing menu page.
          </p>
        </div>
      </div>
    </div>
  );
}
