import { useAuth } from '../contexts/AuthContext';
import { LogOut, Mail, Calendar } from 'lucide-react';

export function AccountInfoCard() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Account Information</h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="break-all">{user.email}</span>
          </div>

          {user.created_at && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Joined {formatDate(user.created_at)}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
