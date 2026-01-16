import { useEffect, useState } from 'react';
import { User, Mail, Building2, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Owner {
  id: string;
  owner_name: string;
  business_name: string;
  email: string;
  phone: string;
  location: string;
  created_at: string;
  user_id: string;
}

export function OwnersTab() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const { impersonateBusiness } = useAuth();

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      const { data: businessesData, error } = await supabase
        .from('businesses')
        .select('id, name, owner_name, user_id, phone, location, created_at')
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

      const ownersWithEmails = (businessesData || []).map(business => ({
        id: business.id,
        owner_name: business.owner_name || 'Not set',
        business_name: business.name,
        email: business.user_id ? (userEmails[business.user_id] || 'No email') : 'No user assigned',
        phone: business.phone || 'Not provided',
        location: business.location || 'Not provided',
        created_at: business.created_at,
        user_id: business.user_id || ''
      }));

      setOwners(ownersWithEmails);
    } catch (err) {
      console.error('Error loading owners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (businessId: string) => {
    impersonateBusiness(businessId);
    window.location.hash = '#admin';
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading owners...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Business Owners</h2>
        <p className="text-sm sm:text-base text-gray-600">View all business owners and their contact information</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Owner Name</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden md:table-cell">Business</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden sm:table-cell">Email</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden lg:table-cell">Phone</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden xl:table-cell">Location</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900 hidden lg:table-cell">Joined</th>
                <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <User className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{owner.owner_name}</p>
                        <p className="text-xs text-gray-500 truncate md:hidden">{owner.business_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{owner.business_name}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {owner.phone}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 hidden xl:table-cell truncate max-w-xs">
                    {owner.location}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(owner.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <button
                      onClick={() => handleImpersonate(owner.id)}
                      className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-700 transition text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      <ExternalLink className="h-3 sm:h-4 w-3 sm:w-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {owners.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No owners found
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Total Owners:</strong> {owners.length}
        </p>
      </div>
    </div>
  );
}
