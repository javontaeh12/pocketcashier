import { useEffect, useState } from 'react';
import { Building2, Mail, ExternalLink, Calendar, Phone, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Business {
  id: string;
  name: string;
  user_id: string;
  email: string;
  phone: string;
  location: string;
  created_at: string;
  url_slug: string;
}

export function BusinessesTab() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const { impersonateBusiness } = useAuth();

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const { data: businessesData, error } = await supabase
        .from('businesses')
        .select('id, name, user_id, phone, location, created_at, url_slug')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = (businessesData || [])
        .filter(b => b.user_id)
        .map(b => b.user_id);

      let userEmails: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-emails`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userIds }),
            }
          );
          userEmails = await response.json();
        } catch (err) {
          console.error('Error fetching user emails:', err);
        }
      }

      const businessesWithEmails = (businessesData || []).map(business => ({
        ...business,
        email: business.user_id ? (userEmails[business.user_id] || 'No email') : 'No user assigned',
        phone: business.phone || 'Not provided',
        location: business.location || 'Not provided'
      }));

      setBusinesses(businessesWithEmails);
    } catch (err) {
      console.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (businessId: string) => {
    impersonateBusiness(businessId);
    window.location.hash = '#admin';
  };

  const handleViewMenu = (urlSlug: string) => {
    window.open(`/${urlSlug}`, '_blank');
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading businesses...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Business Accounts</h2>
        <p className="text-sm sm:text-base text-gray-600">View and manage all business admin accounts</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Business Name</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden sm:table-cell">Admin Email</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden lg:table-cell">Phone</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden xl:table-cell">Location</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden md:table-cell">Created</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => (
                <tr key={business.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Building2 className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{business.name}</p>
                        <p className="text-xs text-gray-500 truncate sm:hidden">{business.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{business.email}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{business.phone}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 hidden xl:table-cell truncate max-w-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{business.location}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(business.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleImpersonate(business.id)}
                        className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 transition text-xs sm:text-sm font-medium whitespace-nowrap"
                      >
                        <ExternalLink className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span>View Admin</span>
                      </button>
                      <button
                        onClick={() => handleViewMenu(business.url_slug)}
                        className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-green-700 transition text-xs sm:text-sm font-medium whitespace-nowrap"
                      >
                        <ExternalLink className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span>View Menu</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {businesses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No businesses found
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Total Businesses:</strong> {businesses.length}
        </p>
      </div>
    </div>
  );
}
