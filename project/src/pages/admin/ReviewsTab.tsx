import { useState, useEffect } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Review {
  id: string;
  customer_name: string;
  review_text: string;
  created_at: string;
}

export function ReviewsTab() {
  const { businessId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    if (!businessId) return;
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting review:', error);
        alert('Failed to delete review');
      } else {
        loadReviews();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
        <p className="text-gray-600 text-sm mt-1">
          Manage reviews from your customers
        </p>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No reviews yet. Customers can submit reviews on your menu page.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{review.customer_name}</h3>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-3">{review.review_text}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition flex-shrink-0"
                  title="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
