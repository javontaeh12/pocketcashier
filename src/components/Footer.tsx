import { useState } from 'react';
import { Coffee } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Footer() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      const pathname = window.location.pathname;
      const urlSlug = pathname.split('/')[1];
      setTimeout(() => {
        window.location.href = `/${urlSlug}`;
      }, 300);
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">Pocket Cashier</span>
            </div>
            <p className="text-sm text-gray-400">
              Business Suite
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">For Businesses</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = 'admin';
                    window.location.reload();
                  }}
                  className="text-gray-400 hover:text-blue-400 transition"
                >
                  {user ? 'Admin Portal' : 'Business Login'}
                </a>
              </li>
              <li>
                <a
                  href="#signup"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = 'signup';
                    window.location.reload();
                  }}
                  className="text-gray-400 hover:text-blue-400 transition font-semibold"
                >
                  Create Pocket Cashier Account
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Developer</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#developer-login"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = 'developer-login';
                    window.location.reload();
                  }}
                  className="text-gray-400 hover:text-blue-400 transition"
                >
                  Developer Portal
                </a>
              </li>
              <li>
                <a
                  href="https://budgetbrandingonline.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition"
                >
                  Budget Branding Online
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-center text-sm text-gray-500">
                © 2024 Pocket Cashier. All rights reserved.
              </p>
              <a
                href="/privacy-policy"
                className="text-sm text-gray-400 hover:text-blue-400 transition"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="text-sm text-gray-400 hover:text-blue-400 transition"
              >
                Terms of Service
              </a>
            </div>
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 bg-white text-gray-900 font-medium rounded hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            ) : (
              <a
                href="#admin"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = 'admin';
                  window.location.reload();
                }}
                className="px-4 py-2 bg-white text-gray-900 font-medium rounded hover:bg-gray-100 transition"
              >
                Admin Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
