import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Video {
  id: string;
  storage_path: string;
  title: string | null;
  position: number;
}

interface VideoSectionProps {
  businessId: string;
}

export function VideoSection({ businessId }: VideoSectionProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  useEffect(() => {
    loadVideos();
  }, [businessId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_videos')
        .select('id, storage_path, title, position')
        .eq('business_id', businessId)
        .order('position', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('business-videos')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  if (loading || videos.length === 0) {
    return null;
  }

  const currentVideo = videos[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);
  };

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg" style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}>
              <video
                key={currentVideo.id}
                src={getPublicUrl(currentVideo.storage_path)}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                loop
                autoPlay
                playsInline
                controlsList="nofullscreen"
                onLoadedMetadata={handleVideoMetadata}
              />
            </div>

            {videos.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors"
                  aria-label="Previous video"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors"
                  aria-label="Next video"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {videos.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-gray-900 w-8'
                      : 'bg-gray-400 hover:bg-gray-600'
                  }`}
                  aria-label={`Go to video ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
