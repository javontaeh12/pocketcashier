interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  aboutUsText?: string;
  aboutUsImageUrl?: string;
}

export function AboutUsModal({
  isOpen,
  onClose,
  businessName,
  aboutUsText,
  aboutUsImageUrl,
}: AboutUsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">About {businessName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {aboutUsImageUrl && (
            <img
              src={aboutUsImageUrl}
              alt={`${businessName} About`}
              crossOrigin="anonymous"
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}
          {aboutUsText ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {aboutUsText}
            </p>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No about information available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
