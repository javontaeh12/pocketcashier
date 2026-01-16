import { useState, useEffect } from 'react';
import { Copy, Check, AlertCircle, Link as LinkIcon, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  validateSlugFormat,
  slugify,
  getSlugSuggestion,
  getPublicBusinessUrl
} from '../../lib/slugUtils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface BusinessSlugTabProps {
  businessId: string;
  businessName: string;
}

interface SlugCheckResult {
  available: boolean;
  reason: string;
}

export function BusinessSlugTab({ businessId, businessName }: BusinessSlugTabProps) {
  const [currentSlug, setCurrentSlug] = useState<string>('');
  const [inputSlug, setInputSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [shareImagePath, setShareImagePath] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    loadCurrentSlug();
  }, [businessId]);

  useEffect(() => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    if (!inputSlug) {
      setValidationError(null);
      setAvailabilityError(null);
      return;
    }

    const formatValidation = validateSlugFormat(inputSlug);
    if (!formatValidation.valid) {
      setValidationError(formatValidation.error || null);
      setAvailabilityError(null);
      return;
    }

    setValidationError(null);

    if (inputSlug === currentSlug) {
      setAvailabilityError(null);
      return;
    }

    const timeout = setTimeout(() => {
      checkAvailability(inputSlug);
    }, 500);

    setCheckTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [inputSlug, currentSlug]);

  async function loadCurrentSlug() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('slug, share_title, share_description, share_image_path')
        .eq('id', businessId)
        .single();

      if (fetchError) throw fetchError;

      const slug = data?.slug || '';
      setCurrentSlug(slug);
      setInputSlug(slug);
      setShareTitle(data?.share_title || '');
      setShareDescription(data?.share_description || '');
      setShareImagePath(data?.share_image_path || '');

      if (data?.share_image_path) {
        const { data: urlData } = supabase.storage
          .from('business-share-images')
          .getPublicUrl(data.share_image_path);
        setImagePreview(urlData?.publicUrl || null);
      }
    } catch (err) {
      console.error('Error loading slug:', err);
      setError('Failed to load business page name');
    } finally {
      setLoading(false);
    }
  }

  async function checkAvailability(slug: string) {
    try {
      setChecking(true);
      setAvailabilityError(null);

      const { data, error: rpcError } = await supabase
        .rpc('check_slug_availability', {
          slug_param: slug,
          business_id_param: businessId
        });

      if (rpcError) throw rpcError;

      const result = data[0] as SlugCheckResult;

      if (!result.available) {
        if (result.reason === 'reserved') {
          setAvailabilityError('This name is reserved and cannot be used');
        } else if (result.reason === 'taken') {
          setAvailabilityError('This name is already taken');
        } else if (result.reason === 'invalid_format') {
          setAvailabilityError('Invalid format');
        }
      }
    } catch (err) {
      console.error('Error checking availability:', err);
    } finally {
      setChecking(false);
    }
  }

  async function handleSave() {
    if (!inputSlug) {
      setError('Business page name is required');
      return;
    }

    const validation = validateSlugFormat(inputSlug);
    if (!validation.valid) {
      setError(validation.error || 'Invalid format');
      return;
    }

    if (availabilityError) {
      setError(availabilityError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          slug: inputSlug,
          slug_updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (updateError) {
        if (updateError.code === '23505') {
          setError('This business page name is already taken');
        } else {
          throw updateError;
        }
        return;
      }

      setCurrentSlug(inputSlug);
      setSuccess('Business page name saved successfully!');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving slug:', err);
      setError('Failed to save business page name');
    } finally {
      setSaving(false);
    }
  }

  function handleUseSuggestion() {
    const suggestion = getSlugSuggestion(businessName);
    if (suggestion) {
      setInputSlug(suggestion);
    }
  }

  function handleCopyUrl() {
    if (!currentSlug) return;

    const url = getPublicBusinessUrl(currentSlug);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please use PNG, JPG, or WebP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `businesses/${businessId}/share.${ext}`;

      if (shareImagePath) {
        await supabase.storage
          .from('business-share-images')
          .remove([shareImagePath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('business-share-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        setError('Failed to upload image');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('business-share-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || '';
      setShareImagePath(filePath);
      setImagePreview(publicUrl);
      setSuccess('Image uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    try {
      if (shareImagePath) {
        await supabase.storage
          .from('business-share-images')
          .remove([shareImagePath]);
      }
      setShareImagePath('');
      setImagePreview(null);
      setSuccess('Image removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    }
  }

  async function handleSaveShareSettings() {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          share_title: shareTitle,
          share_description: shareDescription,
          share_image_path: shareImagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (updateError) throw updateError;

      setSuccess('Share settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving share settings:', err);
      setError('Failed to save share settings');
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = currentSlug ? getPublicBusinessUrl(currentSlug) : '';
  const hasChanges = inputSlug !== currentSlug;
  const canSave = hasChanges && inputSlug && !validationError && !availabilityError && !checking;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Page Name</h2>
          <p className="text-gray-600">
            Create a custom URL for your business that customers can visit directly.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Name
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputSlug}
                  onChange={(e) => setInputSlug(slugify(e.target.value))}
                  placeholder="my-business-name"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationError || availabilityError
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <button
                onClick={handleUseSuggestion}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium whitespace-nowrap"
              >
                Suggest from Name
              </button>
            </div>

            {validationError && (
              <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {!validationError && availabilityError && (
              <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{availabilityError}</span>
              </div>
            )}

            {!validationError && !availabilityError && inputSlug && inputSlug !== currentSlug && (
              <div className="mt-2 flex items-start gap-2 text-sm text-green-600">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>This name is available</span>
              </div>
            )}

            <p className="mt-2 text-sm text-gray-500">
              Use lowercase letters, numbers, and hyphens only. Must be 3-60 characters.
            </p>
          </div>

          {inputSlug && !validationError && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview URL
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-mono text-gray-700 break-all">
                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                  <span>{getPublicBusinessUrl(inputSlug)}</span>
                </div>
              </div>
            </div>
          )}

          {currentSlug && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Your Public Business URL
                  </h3>
                  <p className="text-sm font-mono text-blue-800 break-all mb-2">
                    {publicUrl}
                  </p>
                  <p className="text-xs text-blue-700">
                    Share this link with customers to let them view your business directly.
                  </p>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Settings</h3>
            <p className="text-gray-600 text-sm mb-6">
              Customize how your business appears when shared on social media and messaging apps.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Title
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="My Business Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">{shareTitle.length}/60 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Description
                </label>
                <textarea
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="Describe your business in a few words"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">{shareDescription.length}/160 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Image
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Recommended size: 1200x630px. Max 5MB. PNG, JPG, or WebP.
                </p>

                {imagePreview ? (
                  <div className="mb-4 relative">
                    <img
                      src={imagePreview}
                      alt="Share preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleImageUpload}
                      accept={ALLOWED_TYPES.join(',')}
                      className="hidden"
                      id="share-image-input"
                      disabled={uploading}
                    />
                    <label htmlFor="share-image-input" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    </label>
                  </div>
                )}

                {imagePreview && (
                  <div className="mt-3">
                    <label htmlFor="share-image-input-replace" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer font-medium text-sm">
                      <Upload className="h-4 w-4" />
                      Replace Image
                    </label>
                    <input
                      type="file"
                      onChange={handleImageUpload}
                      accept={ALLOWED_TYPES.join(',')}
                      className="hidden"
                      id="share-image-input-replace"
                      disabled={uploading}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveShareSettings}
                disabled={saving || uploading}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  saving || uploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Share Settings'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                canSave && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Page Name'}
            </button>
            {hasChanges && (
              <button
                onClick={() => setInputSlug(currentSlug)}
                disabled={saving}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 mb-1">Important Notes</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Old links will automatically redirect to your new page name</li>
              <li>Changes may take a few moments to propagate</li>
              <li>Choose a page name that is memorable and represents your business</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
