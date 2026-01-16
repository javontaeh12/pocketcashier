import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase, MenuItem, MenuItemGroup } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getPlaceholderPreview } from '../../lib/placeholderGenerator';

export function MenuItemsTab() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [groupBackgrounds, setGroupBackgrounds] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingGroupBg, setUploadingGroupBg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [minimumOrderItems, setMinimumOrderItems] = useState(0);
  const [defaultGroupShown, setDefaultGroupShown] = useState<string | null>(null);
  const [menuSectionTitle, setMenuSectionTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const { businessId } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    item_type: '',
    is_available: true,
    image_url: ''
  });

  useEffect(() => {
    if (businessId) {
      loadMenuItems();
      loadBusinessSettings();
      loadGroupBackgrounds();
    }
  }, [businessId]);

  const loadBusinessSettings = async () => {
    try {
      const { data } = await supabase
        .from('businesses')
        .select('orders_enabled, minimum_order_items, default_group_shown, menu_section_title')
        .eq('id', businessId)
        .single();

      if (data) {
        setOrdersEnabled(data.orders_enabled ?? true);
        setMinimumOrderItems(data.minimum_order_items ?? 0);
        setDefaultGroupShown(data.default_group_shown ?? null);
        setMenuSectionTitle(data.menu_section_title || '');
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .order('item_type')
        .order('created_at', { ascending: false });
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupBackgrounds = async () => {
    try {
      const { data } = await supabase
        .from('menu_item_groups')
        .select('*')
        .eq('business_id', businessId);

      if (data) {
        const backgrounds: Record<string, string | null> = {};
        data.forEach((group: MenuItemGroup) => {
          backgrounds[group.group_name] = group.background_image_url;
        });
        setGroupBackgrounds(backgrounds);
      }
    } catch (error) {
      console.error('Error loading group backgrounds:', error);
    }
  };

  const handleGroupBackgroundUpload = async (groupName: string, file: File) => {
    setUploadingGroupBg(groupName);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `group-bg-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      const { error: upsertError } = await supabase
        .from('menu_item_groups')
        .upsert({
          business_id: businessId,
          group_name: groupName,
          background_image_url: data.publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id,group_name'
        });

      if (upsertError) throw upsertError;

      await loadGroupBackgrounds();
    } catch (error) {
      console.error('Error uploading group background:', error);
      alert('Failed to upload group background image');
    } finally {
      setUploadingGroupBg(null);
    }
  };

  const handleRemoveGroupBackground = async (groupName: string) => {
    try {
      const { error } = await supabase
        .from('menu_item_groups')
        .delete()
        .eq('business_id', businessId)
        .eq('group_name', groupName);

      if (error) throw error;

      await loadGroupBackgrounds();
    } catch (error) {
      console.error('Error removing group background:', error);
      alert('Failed to remove group background');
    }
  };

  const getCategories = () => {
    const categories = [...new Set(menuItems.map(item => item.item_type))].sort();
    return categories;
  };

  const getFilteredItems = () => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter(item => item.item_type === selectedCategory);
  };

  const getRecentItems = () => {
    return menuItems.slice(0, 5);
  };

  const quickAddItem = (item: MenuItem) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      item_type: item.item_type,
      is_available: true,
      image_url: ''
    });
    setEditingItem(null);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) {
      alert('Business not found. Please log in again.');
      return;
    }

    try {
      const itemData = {
        ...formData,
        business_id: businessId,
        price: parseFloat(formData.price),
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        item_type: '',
        is_available: true,
        image_url: ''
      });
      loadMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      item_type: item.item_type,
      is_available: item.is_available,
      image_url: item.image_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const toggleOrdersEnabled = async () => {
    try {
      const newValue = !ordersEnabled;
      const { error } = await supabase
        .from('businesses')
        .update({ orders_enabled: newValue })
        .eq('id', businessId);

      if (error) throw error;
      setOrdersEnabled(newValue);
    } catch (error) {
      console.error('Error updating orders status:', error);
      alert('Failed to update orders status');
    }
  };

  const handleMinimumOrderItemsChange = async (value: number) => {
    setMinimumOrderItems(value);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ minimum_order_items: value })
        .eq('id', businessId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating minimum order items:', error);
      alert('Failed to update minimum order items');
    }
  };

  const handleMenuSectionTitleChange = async (value: string) => {
    setMenuSectionTitle(value);
    setSavingTitle(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ menu_section_title: value || null })
        .eq('id', businessId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating menu section title:', error);
      alert('Failed to update section title');
    } finally {
      setSavingTitle(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Menu Items</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingItem(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              item_type: '',
              is_available: true,
              image_url: ''
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Item</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <label htmlFor="menuSectionTitle" className="block text-sm font-medium text-gray-700 mb-2">
          Section Title
        </label>
        <input
          type="text"
          id="menuSectionTitle"
          value={menuSectionTitle}
          onChange={(e) => handleMenuSectionTitleChange(e.target.value)}
          placeholder="e.g., Services, Menu, Products"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          {savingTitle ? 'Saving...' : 'This title appears at the top of your services section'}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Order Status</h3>
              <p className="text-sm text-gray-600">
                {ordersEnabled
                  ? 'Customers can currently place orders.'
                  : 'Orders are stopped. Customers cannot place orders.'}
              </p>
            </div>
            <button
              onClick={toggleOrdersEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                ordersEnabled ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  ordersEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Minimum Order Requirement</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set the minimum number of items required for customers to checkout. Leave at 0 for no minimum.
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="minItems" className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Items
              </label>
              <input
                type="number"
                id="minItems"
                min="0"
                max="999"
                value={minimumOrderItems}
                onChange={(e) => handleMinimumOrderItemsChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600 pt-6">
              Current: <span className="font-semibold text-gray-900">{minimumOrderItems} item{minimumOrderItems !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Default Group Display</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which menu group will be expanded when customers first visit your menu.
          </p>
          <div className="flex-1">
            <label htmlFor="defaultGroup" className="block text-sm font-medium text-gray-700 mb-2">
              Group to Show First
            </label>
            <select
              id="defaultGroup"
              value={defaultGroupShown || ''}
              onChange={async (e) => {
                const value = e.target.value || null;
                setDefaultGroupShown(value);
                try {
                  const { error } = await supabase
                    .from('businesses')
                    .update({ default_group_shown: value })
                    .eq('id', businessId);

                  if (error) throw error;
                } catch (error) {
                  console.error('Error updating default group:', error);
                  alert('Failed to update default group');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">None (All Collapsed)</option>
              {getCategories().map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {getCategories().length > 0 && (
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-teal-600" />
              Group Background Images
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add background images to each menu group. Images will fade when the group is expanded for better readability.
            </p>
            <div className="space-y-3">
              {getCategories().map((category) => {
                const hasCustomBackground = groupBackgrounds[category];
                const backgroundPreview = hasCustomBackground
                  ? groupBackgrounds[category]
                  : getPlaceholderPreview(category);

                return (
                <div key={category} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 capitalize whitespace-nowrap">{category}</span>
                      <div
                        className="h-16 w-24 sm:h-12 sm:w-20 rounded border border-gray-300 flex-shrink-0"
                        style={hasCustomBackground ? {} : { backgroundImage: backgroundPreview, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                        {hasCustomBackground && (
                          <img
                            src={groupBackgrounds[category]!}
                            alt={`${category} background`}
                            className="h-16 w-24 sm:h-12 sm:w-20 object-cover rounded"
                          />
                        )}
                      </div>
                      {!hasCustomBackground && (
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Placeholder</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <label className="cursor-pointer bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition flex-shrink-0">
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">{uploadingGroupBg === category ? 'Uploading...' : groupBackgrounds[category] ? 'Change' : 'Upload'}</span>
                        <span className="sm:hidden">{uploadingGroupBg === category ? 'Loading...' : groupBackgrounds[category] ? '↻' : '↑'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleGroupBackgroundUpload(category, file);
                          }}
                          disabled={uploadingGroupBg === category}
                          className="hidden"
                        />
                      </label>
                      {groupBackgrounds[category] && (
                        <button
                          onClick={() => handleRemoveGroupBackground(category)}
                          className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1 transition flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out translate-x-0">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.item_type}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  required
                  placeholder="e.g., Entrees, Drinks, Desserts"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                <div className="space-y-3">
                  {formData.image_url && (
                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer bg-blue-100 border-2 border-blue-300 rounded-lg px-4 py-3 flex items-center justify-center space-x-2 hover:bg-blue-200 transition">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-600">{uploading ? 'Uploading...' : formData.image_url ? 'Change Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Status</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition border-2 ${
                    formData.is_available
                      ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  }`}
                >
                  {formData.is_available ? '✓ Live on Menu' : '✗ Hidden from Menu'}
                </button>
              </div>

              <div className="pt-4 space-y-3 border-t border-gray-200">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                  }}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {getRecentItems().length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add (Recent Items)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {getRecentItems().map((item) => (
              <button
                key={item.id}
                onClick={() => quickAddItem(item)}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition text-left"
              >
                <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{item.item_type}</p>
                <p className="text-sm font-semibold text-blue-600 mt-1">${item.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {getCategories().length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full font-medium transition ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {getCategories().map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
        {getFilteredItems().map((item) => (
          <div key={item.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition h-full flex flex-col">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4 flex flex-col flex-1">
              <div className="mb-2 flex-1">
                <h3 className="font-semibold text-base text-gray-900">{item.name}</h3>
                <span className="text-xs text-gray-500 capitalize">{item.item_type}</span>
              </div>
              <p className="text-gray-600 text-sm mb-3 flex-1">{item.description}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-bold text-lg">${item.price.toFixed(2)}</span>
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('menu_items')
                          .update({ is_available: !item.is_available })
                          .eq('id', item.id);

                        if (error) throw error;
                        loadMenuItems();
                      } catch (error) {
                        console.error('Error updating item availability:', error);
                        alert('Failed to update item availability');
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition border-2 ${
                      item.is_available
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-red-100 text-red-700 border-red-300'
                    }`}
                  >
                    {item.is_available ? '✓ Live' : '✗ Hidden'}
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 bg-blue-100 text-blue-600 hover:bg-blue-200 py-2 rounded transition flex items-center justify-center space-x-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 py-2 rounded transition flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {getFilteredItems().length === 0 && menuItems.length > 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No items in {selectedCategory} category yet.</p>
        </div>
      )}

      {menuItems.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No menu items yet. Add your first item to get started!</p>
        </div>
      )}
    </div>
  );
}
