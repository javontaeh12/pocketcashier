import { useState } from 'react';
import { Building2, CreditCard, MessageSquare, LogOut, Code2, X, Home, Users, Plug } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MetaTags } from '../../components/MetaTags';
import { BusinessesTab } from './BusinessesTab';
import { OwnersTab } from './OwnersTab';
import { SupportTab } from './SupportTab';
import { IntegrationsTab } from './IntegrationsTab';

type Tab = 'businesses' | 'owners' | 'integrations' | 'support';

export function DeveloperPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('businesses');
  const [signingOut, setSigningOut] = useState(false);
  const { signOut, isDeveloper, impersonatedBusinessId, impersonateBusiness } = useAuth();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
    }
  };

  if (!isDeveloper) {
    window.location.hash = '#developer-login';
    return null;
  }

  if (impersonatedBusinessId) {
    window.location.hash = '#admin';
    return null;
  }

  const tabs = [
    { id: 'businesses' as Tab, name: 'Businesses', icon: Building2 },
    { id: 'owners' as Tab, name: 'Owners', icon: Users },
    { id: 'integrations' as Tab, name: 'Integrations', icon: Plug },
    { id: 'support' as Tab, name: 'Support', icon: MessageSquare },
  ];

  return (
    <>
      <MetaTags
        title="Developer Portal - Pocket Cashier"
        description="System administration and business management"
      />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Developer Portal</h1>
                <p className="text-blue-200 text-sm hidden sm:block">System Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = '';
                  window.location.reload();
                }}
                className="flex items-center gap-2 bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium text-sm sm:text-base"
              >
                <Home className="h-4 w-4" />
                Home
              </a>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {impersonatedBusinessId && (
        <div className="bg-yellow-500 text-yellow-900 py-2 sm:py-3 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="font-semibold text-sm sm:text-base">
              Viewing as Business Admin (Impersonation Mode Active)
            </p>
            <button
              onClick={() => impersonateBusiness(null)}
              className="flex items-center gap-2 bg-yellow-900 text-yellow-100 px-3 py-1.5 rounded hover:bg-yellow-800 transition text-sm whitespace-nowrap"
            >
              <X className="h-4 w-4" />
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 border-b border-gray-200">
          <div className="sm:hidden mb-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          <nav className="hidden sm:flex gap-4" aria-label="Developer Portal Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {activeTab === 'businesses' && <BusinessesTab />}
          {activeTab === 'owners' && <OwnersTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'support' && <SupportTab />}
        </div>
      </div>
    </div>
    </>
  );
}
