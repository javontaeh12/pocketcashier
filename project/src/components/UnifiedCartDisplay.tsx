import { ShoppingCart, Trash2, Plus, Minus, Calendar, X } from 'lucide-react';
import { useUnifiedCart } from '../contexts/UnifiedCartContext';

interface UnifiedCartDisplayProps {
  onCheckout: () => void;
}

export function UnifiedCartDisplay({ onCheckout }: UnifiedCartDisplayProps) {
  const { items, booking, subtotalCents, taxCents, totalCents, removeItem, updateQuantity, loading } = useUnifiedCart();

  const productItems = items.filter(item => item.itemType === 'product');
  const hasProducts = productItems.length > 0;
  const hasBooking = booking !== null;
  const hasItems = hasProducts || hasBooking;

  if (!hasItems) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
          </h3>
          <span className="text-sm text-gray-600">
            {productItems.length} {productItems.length === 1 ? 'item' : 'items'}
            {hasBooking && ' + 1 booking'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {hasProducts && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Products</h4>
            <div className="space-y-3">
              {productItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">
                      ${(item.unitPriceCents / 100).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={loading || item.quantity <= 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={loading}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(item.lineTotalCents / 100).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={loading}
                    className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBooking && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Booking
            </h4>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-green-900">{booking.serviceName}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {new Date(booking.startTime).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Duration: {Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)} minutes
                  </p>
                  {booking.notes && (
                    <p className="text-sm text-green-600 mt-2 italic">{booking.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (8%):</span>
            <span className="text-gray-900">${(taxCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
