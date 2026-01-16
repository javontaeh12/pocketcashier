import { useState } from 'react';
import { Mail, Lock, User, Building2, Loader2, ChevronLeft, Users, Code } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PresetSelector } from '../components/PresetSelector';

export function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'preset' | 'type' | 'details'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'admin' | 'developer' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    contactName: '',
    ownerName: '',
    phone: '',
    location: '',
    facebookPageUrl: '',
    instagramPageUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      if (accountType === 'admin') {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .insert({
            name: formData.businessName,
            user_id: authData.user.id,
            owner_name: formData.ownerName,
            phone: formData.phone,
            location: formData.location,
            facebook_page_url: formData.facebookPageUrl,
            instagram_page_url: formData.instagramPageUrl,
          })
          .select()
          .single();

        if (businessError) throw businessError;

        if (selectedPresetId && businessData?.id) {
          const presetUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-business-preset`;
          await fetch(presetUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              businessId: businessData.id,
              presetId: selectedPresetId,
            }),
          });
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-new-admin-notification`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            businessName: formData.businessName,
            contactName: formData.contactName,
          }),
        });
      } else if (accountType === 'developer') {
        const { error: devError } = await supabase
          .from('developer_accounts')
          .insert({
            user_id: authData.user.id,
            name: formData.contactName,
            email: formData.email,
          });

        if (devError) throw devError;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.hash = accountType === 'admin' ? 'admin' : 'developer';
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Error during signup:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Created!</h2>
          <p className="text-gray-600 mb-4">
            Your Pocket Cashier business account has been successfully created. Redirecting to admin portal...
          </p>
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (step === 'preset') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
            <p className="text-gray-600">Step 1 of 3: Choose your account type</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => {
                setAccountType('admin');
                setStep('type');
              }}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
            >
              <div className="flex flex-col items-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Business Owner</h3>
                <p className="text-gray-600 text-sm">Create a business account to manage your menu, orders, and customer interactions</p>
              </div>
            </button>

            <button
              onClick={() => {
                setAccountType('developer');
                setStep('details');
              }}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition group"
            >
              <div className="flex flex-col items-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:bg-green-200 transition">
                  <Code className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Developer</h3>
                <p className="text-gray-600 text-sm">Access developer tools and manage multiple business accounts</p>
              </div>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href="#admin"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = 'admin';
                  window.location.reload();
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <button
            onClick={() => setStep('preset')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center mb-8">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Business Template</h1>
            <p className="text-gray-600">Step 2 of 3: Start with a template or customize later</p>
          </div>

          <PresetSelector
            onSelect={(presetId) => {
              setSelectedPresetId(presetId);
              setStep('details');
            }}
            isLoading={loading}
          />

          <div className="mt-6 text-center">
            <button
              onClick={() => setStep('details')}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Skip and customize later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <button
          onClick={() => setStep('type')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Step 3 of 3: Enter your details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {accountType === 'admin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Business Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Business Owner Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook Page URL
                </label>
                <input
                  type="url"
                  value={formData.facebookPageUrl}
                  onChange={(e) => setFormData({ ...formData, facebookPageUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://facebook.com/your-business"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram Page URL
                </label>
                <input
                  type="url"
                  value={formData.instagramPageUrl}
                  onChange={(e) => setFormData({ ...formData, instagramPageUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://instagram.com/your-business"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Full Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'admin';
                window.location.reload();
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
