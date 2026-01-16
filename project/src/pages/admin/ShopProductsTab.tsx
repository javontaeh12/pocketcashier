import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  inventory_count: number | null;
  is_active: boolean;
}

interface ShopProductsTabProps {
  businessId: string;
}

export function ShopProductsTab({ businessId }: ShopProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_cents: 0,
    inventory_count: '',
    is_active: true,
    image_path: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [businessId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    productId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const timestamp = Date.now();
      const filename = `${businessId}/${productId || 'new'}-${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (productId) {
        await supabase
          .from('products')
          .update({ image_path: filename })
          .eq('id', productId);
      }

      setFormData({ ...formData, ...{ image_path: filename } });
      setSuccess('Image uploaded successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price_cents <= 0) {
      setError('Name and valid price are required');
      return;
    }

    try {
      setError(null);

      if (editingId) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description || null,
            price_cents: formData.price_cents,
            inventory_count: formData.inventory_count
              ? parseInt(formData.inventory_count)
              : null,
            is_active: formData.is_active,
            image_path: formData.image_path || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Product updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            business_id: businessId,
            name: formData.name,
            description: formData.description || null,
            price_cents: formData.price_cents,
            inventory_count: formData.inventory_count
              ? parseInt(formData.inventory_count)
              : null,
            is_active: formData.is_active,
            image_path: formData.image_path || null,
          });

        if (insertError) throw insertError;
        setSuccess('Product created successfully');
      }

      resetForm();
      await loadProducts();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(
        editingId
          ? 'Failed to update product'
          : 'Failed to create product'
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setSuccess('Product deleted');
      await loadProducts();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete product');
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price_cents: product.price_cents,
      inventory_count: product.inventory_count?.toString() || '',
      is_active: product.is_active,
      image_path: product.image_path || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_cents: 0,
      inventory_count: '',
      is_active: true,
      image_path: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading products...</div>
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

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold">
            {editingId ? 'Edit Product' : 'New Product'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Espresso"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Product description (optional)"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">$</span>
                <input
                  type="number"
                  value={(formData.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_cents: Math.round(
                        parseFloat(e.target.value) * 100
                      ),
                    })
                  }
                  step="0.01"
                  min="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventory (optional)
              </label>
              <input
                type="number"
                value={formData.inventory_count}
                onChange={(e) =>
                  setFormData({ ...formData, inventory_count: e.target.value })
                }
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image
            </label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                {formData.image_path ? (
                  <div className="space-y-2">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={supabase.storage
                          .from('business-assets')
                          .getPublicUrl(formData.image_path).data.publicUrl}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm text-gray-600 hover:text-gray-700 cursor-pointer">
                        Change image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, editingId || undefined)}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-600">Click to upload</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, editingId || undefined)}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {uploading && (
                <span className="text-sm text-gray-500">Uploading...</span>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Active
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId ? 'Update' : 'Create'} Product
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No products yet</p>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.image_path ? (
                    <img
                      src={supabase.storage
                        .from('business-assets')
                        .getPublicUrl(product.image_path).data.publicUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1 text-sm">
                    <span className="font-semibold text-gray-900">
                      ${(product.price_cents / 100).toFixed(2)}
                    </span>
                    {product.inventory_count !== null && (
                      <span className="text-gray-500">
                        Stock: {product.inventory_count}
                      </span>
                    )}
                    {!product.is_active && (
                      <span className="text-yellow-600 font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
