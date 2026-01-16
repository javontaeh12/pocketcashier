import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';

interface DirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
  businessName: string;
}

export function DirectionsModal({ isOpen, onClose, address, businessName }: DirectionsModalProps) {
  const [mapUrl, setMapUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      setMapUrl(`https://www.google.com/maps/embed/v1/place?key=AIzaSyAjPRa0l8U8V2mwXpZkQb6xU6KXFCR_Gak&q=${encodedAddress}`);
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, [address]);

  if (!isOpen || !address) return null;

  const handleMapClick = () => {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Directions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Address</h3>
            <p className="text-gray-900 font-medium">{businessName}</p>
            <p className="text-gray-600">{address}</p>
          </div>

          <div
            onClick={handleMapClick}
            className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer group relative"
          >
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
              title="Business Location Map"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition rounded-lg" />
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isMobile ? 'Tap map to open in Google Maps' : 'Click map to open in Google Maps'}
          </p>

          <button
            onClick={handleMapClick}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Open in Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}
