import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HomePage } from './HomePage';
import { useAuth } from '../contexts/AuthContext';
import { MetaTags } from '../components/MetaTags';

interface PublicBusinessPageProps {
  slug: string;
  onCheckout: () => void;
}

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  page_description: string | null;
  share_title: string | null;
  share_description: string | null;
  share_image_path: string | null;
  section_display_order: string[] | null;
}

interface RedirectData {
  business_id: string;
  current_slug: string;
  is_redirect: boolean;
  is_active: boolean;
}

export function PublicBusinessPage({ slug, onCheckout }: PublicBusinessPageProps) {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isDeveloper } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function resolveBusiness() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase
          .rpc('resolve_slug_with_redirect', { slug_param: slug });

        if (rpcError) {
          console.error('Error resolving slug:', rpcError);
          setError('Unable to load business');
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError('not_found');
          setLoading(false);
          return;
        }

        const redirectData = data[0] as RedirectData;

        if (redirectData.is_redirect && redirectData.current_slug) {
          if (mounted) {
            window.history.replaceState(null, '', `/${redirectData.current_slug}`);
            window.dispatchEvent(new Event('popstate'));
          }
          return;
        }

        if (!redirectData.is_active) {
          setError('inactive');
          setLoading(false);
          return;
        }

        const { data: businessData, error: businessError } = await supabase
          .rpc('resolve_business_slug', { slug_param: redirectData.current_slug || slug });

        if (businessError || !businessData || businessData.length === 0) {
          setError('not_found');
          setLoading(false);
          return;
        }

        if (mounted) {
          setBusiness(businessData[0] as BusinessData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading business:', err);
        if (mounted) {
          setError('Unable to load business');
          setLoading(false);
        }
      }
    }

    resolveBusiness();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business...</p>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find a business with this page name. Please check the URL and try again.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (error === 'inactive') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Unavailable</h2>
          <p className="text-gray-600 mb-6">
            This business is currently unavailable. Please check back later.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Business</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://pocketcashiermobile.com';
  const businessUrl = `${siteUrl}/b/${business.slug}`;

  const businessName = business.share_title || business.name;
  const shareTitle = `${businessName} - Pocket Cashier`;
  const shareDescription = business.share_description || business.page_description || `Visit ${business.name}`;

  let shareImage = business.logo_url;
  if (business.share_image_path) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const shareImageUrl = `${supabaseUrl}/storage/v1/object/public/business-share-images/${business.share_image_path}`;
    shareImage = shareImageUrl;
  }

  return (
    <div>
      <MetaTags
        title={shareTitle}
        description={shareDescription}
        image={shareImage || undefined}
        url={businessUrl}
        imageAlt={`${business.name} share image`}
      />
      {user && (isDeveloper || user.id) && (
        <div className="bg-blue-50 border-b border-blue-200 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Viewing: <strong>{business.name}</strong></span>
            </div>
            <a
              href="#admin"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Go to Admin Portal
            </a>
          </div>
        </div>
      )}
      <HomePage businessId={business.id} shareUrl={businessUrl} onCheckout={onCheckout} />
    </div>
  );
}
