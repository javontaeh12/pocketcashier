import { useEffect, useState } from 'react';
import { ShoppingCart, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  inventory_count: number | null;
}

interface ShopDisplayProps {
  businessId: string;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ShopDisplay({ businessId, onAddToCart }: ShopDisplayProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [businessId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    if (quantity < 1) return;

    onAddToCart(product, quantity);
    setQuantities({ ...quantities, [product.id]: 1 });
    setSelectedProduct(null);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Shop</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
            >
              {product.image_path ? (
                <img
                  src={supabase.storage
                    .from('business-assets')
                    .getPublicUrl(product.image_path).data.publicUrl}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-lg text-gray-900">
                  {product.name}
                </h3>

                {product.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="mt-auto pt-4 flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    ${(product.price_cents / 100).toFixed(2)}
                  </p>

                  {selectedProduct === product.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={
                          product.inventory_count || 999
                        }
                        value={quantities[product.id] || 1}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [product.id]: Math.max(
                              1,
                              parseInt(e.target.value) || 1
                            ),
                          })
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : justAdded === product.id ? (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Cart</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedProduct(product.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
