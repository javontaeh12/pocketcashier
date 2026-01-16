import { useState } from 'react';
import {
  LogIn,
  Store,
  ShoppingCart,
  Calendar,
  CreditCard,
  BarChart,
  Users,
  Mail,
  Settings,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MetaTags } from '../components/MetaTags';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, user, isDeveloper } = useAuth();

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

  const features = [
    {
      icon: Store,
      title: 'Digital Storefront',
      description: 'Create a beautiful online presence with custom menus, pricing, and branding that reflects your business.',
    },
    {
      icon: ShoppingCart,
      title: 'Order Management',
      description: 'Receive and manage orders seamlessly. Track every order from placement to pickup with real-time notifications.',
    },
    {
      icon: CreditCard,
      title: 'Integrated Payments',
      description: 'Accept payments with Square integration. Secure, fast, and reliable payment processing built right in.',
    },
    {
      icon: Calendar,
      title: 'Event Booking',
      description: 'Manage appointments and events with Google Calendar integration. Let customers book directly from your site.',
    },
    {
      icon: Mail,
      title: 'Email Marketing',
      description: 'Build your customer base with MailerLite integration. Capture leads and send targeted campaigns effortlessly.',
    },
    {
      icon: BarChart,
      title: 'Analytics & Insights',
      description: 'Track orders, revenue, and customer behavior. Make data-driven decisions to grow your business.',
    },
    {
      icon: Users,
      title: 'Customer Reviews',
      description: 'Build trust with authentic customer reviews. Showcase testimonials to attract new customers.',
    },
    {
      icon: Settings,
      title: 'Easy Customization',
      description: 'Customize every aspect of your site with an intuitive admin panel. No coding required.',
    },
  ];

  const benefits = [
    'Launch your online business in minutes',
    'No technical skills required',
    'Mobile-optimized for customers on the go',
    'Secure and reliable infrastructure',
    'Dedicated support team',
    '30-day money-back guarantee',
  ];

  return (
    <>
      <MetaTags
        title="Pocket Cashier - Complete Business Management Platform"
        description="Business Suite"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Hero Section with Login */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-b border-orange-500/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Hero Content */}
              <div>
                <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Your Complete
                  </span>
                  <br />
                  <span className="text-white">Business Management</span>
                  <br />
                  <span className="bg-gradient-to-r from-yellow-300 to-yellow-200 bg-clip-text text-transparent">
                    Platform
                  </span>
                </h1>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  Everything you need to run your business online - orders, bookings, payments, and marketing - all in one powerful, easy-to-use platform.
                </p>
                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-slate-900" />
                    </div>
                    <span className="text-slate-200 font-medium">No setup fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-slate-900" />
                    </div>
                    <span className="text-slate-200 font-medium">Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-slate-900" />
                    </div>
                    <span className="text-slate-200 font-medium">24/7 support</span>
                  </div>
                </div>
              </div>

              {/* Login Form or Portal Access */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-orange-500/30">
                {user ? (
                  <>
                    <div className="flex items-center justify-center mb-6">
                      <img src="/b76cc150-67d7-4515-b7ee-a2071ec52eda.png" alt="Pocket Cashier" className="h-20 w-20" />
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                      Welcome Back!
                    </h2>
                    <p className="text-center text-slate-400 mb-6">
                      You're currently signed in
                    </p>

                    <a
                      href={isDeveloper ? '#developer' : '#admin'}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      Access {isDeveloper ? 'Developer' : 'Admin'} Portal
                      <ArrowRight className="h-5 w-5" />
                    </a>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center mb-6">
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-full">
                        <LogIn className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                      {isSignUp ? 'Start Your Free Trial' : 'Sign In to Your Account'}
                    </h2>
                    <p className="text-center text-slate-400 mb-6">
                      {isSignUp ? 'No credit card required' : 'Manage your business from anywhere'}
                    </p>

                    <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-900/30 border border-red-600/50 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                    }}
                    className="w-full mt-3 py-3 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition rounded-lg text-sm font-semibold border border-orange-500/30"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'New to Pocket Cashier? Create Account'}
                  </button>
                </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              <span className="text-white">Everything You Need</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                to Succeed
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Pocket Cashier provides all the tools you need to manage and grow your business in one powerful, easy-to-use platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/50 transition-colors shadow-lg hover:shadow-orange-500/10"
              >
                <div className="bg-gradient-to-r from-orange-500/20 to-red-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 border border-orange-500/30">
                  <feature.icon className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-12 text-white border border-orange-500/20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-black mb-6">
                  <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
                    Why Business Owners Love
                  </span>
                  <br />
                  <span>Pocket Cashier</span>
                </h2>
                <p className="text-slate-300 text-lg mb-8">
                  Join thousands of successful business owners who have simplified their operations and increased revenue with our all-in-one platform.
                </p>
                <div className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="ml-2 font-bold">4.9/5 from 1,200+ reviews</span>
                </div>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="h-3 w-3 text-slate-900" />
                    </div>
                    <span className="text-lg text-slate-200">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-20">
            <h2 className="text-3xl font-black text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Start your free trial today. No credit card required.
            </p>
            <button
              onClick={() => {
                setIsSignUp(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition font-bold text-lg inline-flex items-center gap-2 shadow-lg shadow-orange-500/30"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-sm text-slate-400 mt-6">
              By signing up, you agree to our{' '}
              <a
                href="/terms-of-service"
                className="text-orange-400 hover:text-orange-300 transition font-semibold"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="/privacy-policy"
                className="text-orange-400 hover:text-orange-300 transition font-semibold"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-orange-500/20 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
              <a
                href="/privacy-policy"
                className="text-sm text-slate-400 hover:text-orange-400 transition"
              >
                Privacy Policy
              </a>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600"></div>
              <a
                href="/terms-of-service"
                className="text-sm text-slate-400 hover:text-orange-400 transition"
              >
                Terms of Service
              </a>
            </div>
            <div className="text-center text-slate-500">
              <p className="font-semibold">&copy; 2025 Pocket Cashier. All rights reserved.</p>
              <p className="mt-2 text-sm">
                Simple, clean business management for everyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
