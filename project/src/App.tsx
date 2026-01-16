import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnifiedCartProvider } from './contexts/UnifiedCartContext';
import { HomePage } from './pages/HomePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminLogin } from './pages/AdminLogin';
import { AdminPortal } from './pages/admin/AdminPortal';
import { SquareCallback } from './pages/SquareCallback';
import { DeveloperLogin } from './pages/DeveloperLogin';
import { DeveloperPortal } from './pages/developer/DeveloperPortal';
import { SignUpPage } from './pages/SignUpPage';
import { ResetPassword } from './pages/ResetPassword';
import { LandingPage } from './pages/LandingPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { PublicBusinessPage } from './pages/PublicBusinessPage';

type View = 'landing' | 'home' | 'checkout' | 'success' | 'admin' | 'square-callback' | 'developer-login' | 'developer' | 'signup' | 'reset-password' | 'terms-of-service' | 'privacy-policy' | 'public-business';

function SuccessScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for your order. You will receive an email confirmation shortly,
          and another email when your order is ready for pickup.
        </p>
        <button
          onClick={onComplete}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<View>(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    if (pathname === '/square-callback') return 'square-callback';
    if (pathname === '/admin/reset-password') return 'reset-password';
    if (pathname === '/terms-of-service') return 'terms-of-service';
    if (pathname === '/privacy-policy') return 'privacy-policy';

    const pathSegments = pathname.split('/').filter(Boolean);

    if (hash === '#admin') return 'admin';
    if (hash === '#developer-login') return 'developer-login';
    if (hash === '#developer') return 'developer';
    if (hash === '#square-callback') return 'square-callback';
    if (hash === '#signup') return 'signup';

    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1].toLowerCase();
      if (lastSegment === 'admin') {
        return 'admin';
      }
    }

    if (pathSegments.length === 0 && !hash) {
      return 'landing';
    }

    if (pathSegments.length === 1 && !hash) {
      return 'public-business';
    }

    if (pathSegments.length === 2 && pathSegments[0] === 'b' && !hash) {
      return 'public-business';
    }

    return 'home';
  });
  const [businessSlug, setBusinessSlug] = useState<string>(() => {
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 1) {
      return pathSegments[0];
    }
    if (pathSegments.length === 2 && pathSegments[0] === 'b') {
      return pathSegments[1];
    }
    return '';
  });
  const { user, isDeveloper, loading, businessId } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);

      if (hash === '#admin') setView('admin');
      else if (hash === '#developer-login') setView('developer-login');
      else if (hash === '#developer') setView('developer');
      else if (hash === '#signup') setView('signup');
      else if (hash === '' && pathSegments.length === 0) setView('landing');
      else if (hash === '' && pathSegments.length === 1) {
        setBusinessSlug(pathSegments[0]);
        setView('public-business');
      }
      else if (hash === '' && pathSegments.length === 2 && pathSegments[0] === 'b') {
        setBusinessSlug(pathSegments[1]);
        setView('public-business');
      }
      else if (hash === '') setView('home');
    };

    const handlePopState = () => {
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);

      if (pathSegments.length === 1 && !window.location.hash) {
        setBusinessSlug(pathSegments[0]);
        setView('public-business');
      }
      if (pathSegments.length === 2 && pathSegments[0] === 'b' && !window.location.hash) {
        setBusinessSlug(pathSegments[1]);
        setView('public-business');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!loading && user && isDeveloper && view === 'admin') {
      window.location.hash = '#developer';
      setView('developer');
    }
  }, [user, isDeveloper, loading, view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === 'square-callback') {
    return <SquareCallback />;
  }

  if (view === 'reset-password') {
    return <ResetPassword />;
  }

  if (view === 'terms-of-service') {
    return <TermsOfServicePage onBack={() => {
      window.history.back();
    }} />;
  }

  if (view === 'privacy-policy') {
    return <PrivacyPolicyPage onBack={() => {
      window.history.back();
    }} />;
  }

  if (view === 'signup') {
    if (user) {
      window.location.hash = '#admin';
      setView('admin');
      return null;
    }
    return <SignUpPage />;
  }

  if (view === 'developer-login') {
    if (user && isDeveloper) {
      window.location.hash = '#developer';
      setView('developer');
      return null;
    }
    return <DeveloperLogin />;
  }

  if (view === 'developer') {
    if (!user) {
      window.location.hash = '#developer-login';
      setView('developer-login');
      return null;
    }
    if (!isDeveloper) {
      window.location.hash = '#admin';
      setView('admin');
      return null;
    }
    return <DeveloperPortal />;
  }

  if (view === 'admin') {
    if (!user) {
      return <AdminLogin businessId={businessId} />;
    }
    if (isDeveloper) {
      window.location.hash = '#developer';
      setView('developer');
      return null;
    }
    return <AdminPortal />;
  }

  if (view === 'landing') {
    return <LandingPage />;
  }

  if (view === 'success') {
    return <SuccessScreen onComplete={() => setView('home')} />;
  }

  if (view === 'checkout') {
    return (
      <CheckoutPage
        onBack={() => setView('home')}
        onSuccess={() => setView('success')}
      />
    );
  }

  if (view === 'public-business') {
    return <PublicBusinessPage slug={businessSlug} onCheckout={() => setView('checkout')} />;
  }

  return <HomePage onCheckout={() => setView('checkout')} />;
}

function App() {
  return (
    <AuthProvider>
      <UnifiedCartProvider>
        <AppContent />
      </UnifiedCartProvider>
    </AuthProvider>
  );
}

export default App;
