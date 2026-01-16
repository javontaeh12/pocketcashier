import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase, Order, OrderItem, Customer } from '../../lib/supabase';

type OrderWithDetails = Order & {
  customer: Customer;
  order_items: OrderItem[];
};

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      setOrders(ordersData as any || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      if (status === 'ready') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-ready-email`;
          await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: order.id,
              customerEmail: order.customer.email,
              customerName: order.customer.name,
            }),
          }).catch(() => {});
        }
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'preparing':
        return <Clock className="h-5 w-5" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <XCircle className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Orders</h2>
      <p className="text-sm text-gray-600 mb-6">Customer will get notified when the order is marked as ready.</p>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg mb-1">
                  Order #{order.id.slice(0, 8)}
                </h3>
                <p className="text-gray-600 text-sm truncate">
                  {order.customer.name} • {order.customer.email}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <span className="text-lg sm:text-xl font-bold text-green-600">
                  ${order.total_amount.toFixed(2)}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Items:</p>
              <div className="space-y-1">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.item_name}</span>
                    <span className="font-medium">${(item.price_at_order * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
              {order.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'preparing');
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Mark as Preparing
                </button>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'ready');
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  Mark as Ready
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'completed');
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No orders yet.</p>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
                <p className="text-gray-600">{selectedOrder.customer.name}</p>
                <p className="text-gray-600">{selectedOrder.customer.email}</p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between bg-gray-50 p-3 rounded">
                      <div>
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-gray-500 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-semibold">${(item.price_at_order * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">Status</h3>
                <div className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center space-x-2 ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  <span className="capitalize">{selectedOrder.status}</span>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>Order placed: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <p>Last updated: {new Date(selectedOrder.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
