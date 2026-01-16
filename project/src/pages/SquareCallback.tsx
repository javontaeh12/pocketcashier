import { useEffect } from 'react';
import { MetaTags } from '../components/MetaTags';

export function SquareCallback() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = '/#admin';
    }, 3000);
  }, []);

  return (
    <>
      <MetaTags
        title="Square Setup - Pocket Cashier"
        description="Square payment account setup"
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to admin panel...</p>
        </div>
      </div>
    </>
  );
}
