import { useState, useEffect } from 'react';
import { Upload, Trash2, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Video {
  id: string;
  business_id: string;
  storage_path: string;
  title: string | null;
  position: number;
  created_at: string;
}

export function VideoGalleryTab() {
  const { businessId } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      loadVideos();
    }
  }, [businessId]);

  const loadVideos = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('business_videos')
        .select('*')
        .eq('business_id', businessId)
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;
      setVideos(data || []);
    } catch (err: any) {
      setError('Failed to load videos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!businessId) return;

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, WebM, or MOV)');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('Video file must be less than 100MB');
      return;
    }

    if (videos.length >= 4) {
      setError('Maximum 4 videos per business');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('business-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert database record
      const { data: insertedVideo, error: insertError } = await supabase
        .from('business_videos')
        .insert({
          business_id: businessId,
          storage_path: fileName,
          title: file.name.replace(/\.[^/.]+$/, ''),
          position: videos.length + 1,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setVideos([...videos, insertedVideo]);
      setSuccess('Video uploaded successfully!');

      // Reset file input
      event.target.value = '';

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (videoId: string, storagePath: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      setError(null);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('business-videos')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('business_videos')
        .delete()
        .eq('id', videoId);

      if (dbError) throw dbError;

      setVideos(videos.filter((v) => v.id !== videoId));
      setSuccess('Video deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleUpdateTitle = async (videoId: string, newTitle: string) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('business_videos')
        .update({ title: newTitle })
        .eq('id', videoId);

      if (updateError) throw updateError;

      setVideos(
        videos.map((v) =>
          v.id === videoId ? { ...v, title: newTitle } : v
        )
      );
      setSuccess('Title updated!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Update failed: ' + err.message);
    }
  };

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('business-videos')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Gallery</h2>
        <p className="text-gray-600 text-sm mb-6">Upload videos to display them directly on your business page</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="text-sm font-medium text-gray-700">
            {videos.length} of 4 videos used
          </div>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(videos.length / 4) * 100}%` }}
            />
          </div>
        </div>

        <label
          className={`block w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
            videos.length >= 4
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-blue-300 bg-blue-50 hover:border-blue-400'
          }`}
        >
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            disabled={uploading || videos.length >= 4}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <div className="font-medium text-gray-900">
            {uploading ? 'Uploading...' : 'Click to upload video'}
          </div>
          <div className="text-sm text-gray-600">MP4, WebM, or MOV up to 100MB</div>
          {videos.length >= 4 && (
            <div className="text-sm text-red-600 mt-2">Gallery is full</div>
          )}
        </label>
      </div>

      {videos.length > 0 && (
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Videos</h3>
          {videos.map((video) => (
            <div
              key={video.id}
              className="border border-gray-200 rounded-lg p-4 flex gap-4 items-start"
            >
              <div className="flex-shrink-0 w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                <video
                  src={getPublicUrl(video.storage_path)}
                  className="w-full h-full object-cover"
                  playsInline
                  controlsList="nofullscreen"
                />
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={video.title || ''}
                  onChange={(e) => handleUpdateTitle(video.id, e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value !== video.title) {
                      handleUpdateTitle(video.id, e.target.value);
                    }
                  }}
                  placeholder="Video title (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-sm"
                />
                <div className="text-xs text-gray-500">
                  Position: {video.position} • Uploaded{' '}
                  {new Date(video.created_at).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => handleDelete(video.id, video.storage_path)}
                className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete video"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {videos.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Play className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">
            No videos uploaded yet. Upload videos to display them on your business page.
          </p>
        </div>
      )}
    </div>
  );
}
