import { useEffect, useState } from 'react';
import { supabase, Customer, Order } from '../../lib/supabase';

type CustomerWithOrders = Customer & {
  orders: Order[];
};

export function CustomersTab() {
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select(`
          *,
          orders(*)
        `)
        .order('created_at', { ascending: false });

      setCustomers(data as any || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Customers</h2>
      <p className="text-sm text-gray-600 mb-6">Click to view full details</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-2xl font-bold text-gray-900">{customer.total_orders}</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">{customer.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{customer.email}</p>
            <p className="text-gray-500 text-xs">
              Customer since {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No customers yet.</p>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Customer Details</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedCustomer.total_orders}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-gray-500 text-xs sm:text-sm mb-1">Customer Since</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Order History</h3>
                <div className="space-y-3">
                  {selectedCustomer.orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No orders yet</p>
                  ) : (
                    selectedCustomer.orders.map((order) => (
                      <div key={order.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Order #{order.id.slice(0, 8)}
                          </span>
                          <span className="font-bold text-green-600">
                            ${order.total_amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
