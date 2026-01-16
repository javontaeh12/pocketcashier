import { useEffect, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  reviewer_image_url: string;
  review_date: string;
}

export function ReviewsDisplay({ businessId }: { businessId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [businessId]);

  const loadReviews = async () => {
    try {
      const { data, error: err } = await supabase
        .from('google_reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('review_date', { ascending: false })
        .limit(5);

      if (err) throw err;
      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || reviews.length === 0) return null;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-blue-50 to-sky-50">
      <div className="mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Customer Reviews</h2>
        <div className="flex items-center space-x-4 mt-3">
          {renderStars(Math.round(parseFloat(averageRating)))}
          <span className="text-lg font-semibold text-gray-900">{averageRating}</span>
          <span className="text-gray-600">({reviews.length} reviews)</span>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {reviews.map((review) => (
              <div key={review.id} className="min-w-full px-2 sm:px-4">
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-2xl">
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    {review.reviewer_image_url && (
                      <img
                        src={review.reviewer_image_url}
                        alt={review.reviewer_name}
                        className="h-10 sm:h-12 w-10 sm:w-12 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{review.reviewer_name}</p>
                      {renderStars(review.rating)}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(review.review_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">{review.review_text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {reviews.length > 1 && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
            <button
              onClick={goToPrevious}
              className="p-1.5 sm:p-2 bg-white rounded-full shadow-md hover:shadow-lg transition flex-shrink-0"
              aria-label="Previous review"
            >
              <ChevronLeft className="h-5 sm:h-6 w-5 sm:w-6 text-gray-600" />
            </button>
            <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition ${index === currentIndex ? 'w-6 sm:w-8 bg-gray-900' : 'w-2 bg-gray-300'}`}
                  aria-label={`Go to review ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={goToNext}
              className="p-1.5 sm:p-2 bg-white rounded-full shadow-md hover:shadow-lg transition flex-shrink-0"
              aria-label="Next review"
            >
              <ChevronRight className="h-5 sm:h-6 w-5 sm:w-6 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
