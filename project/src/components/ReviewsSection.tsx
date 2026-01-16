import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  customer_name: string;
  review_text: string;
  created_at: string;
}

export function ReviewsSection({ businessId, primaryColor, secondaryColor }: { businessId: string; primaryColor: string; secondaryColor: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [businessId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !reviewText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('reviews')
        .insert([
          {
            business_id: businessId,
            customer_name: name,
            review_text: reviewText,
          },
        ]);

      if (error) throw error;

      setName('');
      setReviewText('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
        <p className="text-gray-600 mb-12">Share your experience with us</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Leave a Review</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{ focusRingColor: primaryColor }}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about your experience..."
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 resize-none"
                  style={{ focusRingColor: primaryColor }}
                />
                <p className="text-xs text-gray-500 mt-1">{reviewText.length}/500</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !name.trim() || !reviewText.trim()}
                className="w-full py-2 px-4 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ backgroundColor: secondaryColor }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>

              {submitted && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium">
                  Thank you! Your review has been posted.
                </div>
              )}
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{review.customer_name}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{review.review_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
