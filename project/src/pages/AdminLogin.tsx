import { useState, useEffect } from 'react';
import { LogIn, ExternalLink, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MetaTags } from '../components/MetaTags';
import { supabase } from '../lib/supabase';

export function AdminLogin({ businessId }: { businessId?: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [businessUrl, setBusinessUrl] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (businessId) {
      loadBusinessUrl();
    }
  }, [businessId]);

  const loadBusinessUrl = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from('businesses')
      .select('url_slug')
      .eq('id', businessId)
      .maybeSingle();

    if (data?.url_slug) {
      setBusinessUrl(data.url_slug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail) {
      setForgotError('Email is required');
      return;
    }

    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    if (forgotPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: forgotEmail,
          password: forgotPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setForgotSuccess('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotEmail('');
        setForgotPassword('');
        setForgotConfirmPassword('');
        setForgotSuccess('');
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <MetaTags
        title="Admin Login - Pocket Cashier"
        description="Sign in to manage your business"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-full">
            <LogIn className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Admin Portal
        </h1>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="flex-1 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition rounded-lg text-sm"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="flex-1 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition rounded-lg text-sm"
              >
                Forgot Password?
              </button>
            )}
          </div>
        </form>

        {businessUrl && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href={`/${businessUrl}`}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-semibold text-base"
            >
              <ExternalLink className="h-5 w-5" />
              View Menu as Guest
            </a>
          </div>
        )}
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail('');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleForgotPassword}>
              {forgotError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
                  {forgotSuccess}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="forgotEmail"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotSuccess}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.value)}
                    required
                    disabled={forgotSuccess}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                    disabled={forgotSuccess}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading || forgotSuccess}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
              >
                {forgotLoading ? 'Resetting...' : forgotSuccess ? 'Password Reset' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail('');
                  setForgotPassword('');
                  setForgotConfirmPassword('');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="w-full mt-3 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition rounded-lg text-sm"
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
