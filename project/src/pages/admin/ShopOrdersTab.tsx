import { useEffect, useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

interface ShopOrder {
  id: string;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  square_payment_id: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
}

interface ShopOrdersTabProps {
  businessId: string;
}

export function ShopOrdersTab({ businessId }: ShopOrdersTabProps) {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [businessId, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('shop_orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('shop_order_items')
        .select('*')
        .eq('order_id', orderId);

      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load order items:', err);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('shop_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;
      await loadOrders();

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update order status');
    }
  };

  const handleViewDetails = (order: ShopOrder) => {
    setSelectedOrder(order);
    setExpandedId(order.id);
    loadOrderItems(order.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All Orders' },
          { value: 'pending_payment', label: 'Pending Payment' },
          { value: 'paid', label: 'Paid' },
          { value: 'fulfilled', label: 'Fulfilled' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No orders found</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg"
            >
              <button
                onClick={() => handleViewDetails(order)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedId === order.id ? 'rotate-180' : ''
                    }`}
                  />
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {order.customer_name || 'Guest'}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{order.customer_email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${(order.total_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-gray-400 ml-2" />
              </button>

              {expandedId === order.id && selectedOrder && (
                <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50 space-y-4">
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {selectedOrder.customer_name || 'Guest'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.customer_email}
                      </p>
                      {selectedOrder.customer_phone && (
                        <p className="text-sm text-gray-600">
                          {selectedOrder.customer_phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Payment
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {selectedOrder.square_payment_id || 'N/A'}
                      </p>
                      {selectedOrder.paid_at && (
                        <p className="text-sm text-gray-600">
                          Paid: {formatDate(selectedOrder.paid_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Items
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm bg-white p-2 rounded border border-gray-200"
                        >
                          <span className="text-gray-900">
                            {item.product_name} x{item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${(item.line_total_cents / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">
                        ${(selectedOrder.subtotal_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    {selectedOrder.tax_cents > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="text-gray-900">
                          ${(selectedOrder.tax_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.shipping_cents > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="text-gray-900">
                          ${(selectedOrder.shipping_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                      <span>Total:</span>
                      <span>
                        ${(selectedOrder.total_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Update Status
                    </p>
                    <div className="flex gap-2">
                      {['pending_payment', 'paid', 'fulfilled', 'cancelled'].map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order.id, status)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              selectedOrder.status === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
