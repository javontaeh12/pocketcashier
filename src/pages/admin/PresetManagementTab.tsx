import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Preset {
  id: string;
  name: string;
  description: string;
  category: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  page_background_color: string;
  hero_banner_bg_color: string;
  hero_banner_text_color: string;
  hero_message: string;
  show_menu: boolean;
  show_reviews: boolean;
  show_events: boolean;
  show_business_info: boolean;
  show_hero_message: boolean;
  orders_enabled: boolean;
  show_bookings: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  item_type: string;
  display_order: number;
  image_url: string;
}

export function PresetManagementTab() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_presets')
        .select('*')
        .order('name');

      if (error) throw error;
      setPresets(data || []);
      if (data && data.length > 0) {
        setSelectedPreset(data[0]);
        loadMenuItems(data[0].id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load presets' });
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (presetId: string) => {
    try {
      const { data, error } = await supabase
        .from('preset_menu_items')
        .select('*')
        .eq('preset_id', presetId)
        .order('display_order');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load menu items' });
    }
  };

  const handlePresetChange = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      loadMenuItems(preset.id);
    }
  };

  const handlePresetUpdate = async (field: string, value: any) => {
    if (!selectedPreset) return;

    try {
      setSaving(true);
      const updateData = { [field]: value };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-business-preset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            presetId: selectedPreset.id,
            ...updateData,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update preset');

      setSelectedPreset({
        ...selectedPreset,
        ...updateData,
      });
      setMessage({ type: 'success', text: 'Preset updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preset' });
    } finally {
      setSaving(false);
    }
  };

  const handleMenuItemChange = (index: number, field: string, value: any) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Delete this menu item?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('preset_menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== itemId));
      setMessage({ type: 'success', text: 'Menu item deleted!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete menu item' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMenuItem = () => {
    if (!selectedPreset) return;
    const newItem: MenuItem = {
      id: `new-${Date.now()}`,
      name: 'New Item',
      description: '',
      price: 0,
      item_type: 'Service',
      display_order: menuItems.length,
      image_url: '',
    };
    setMenuItems([...menuItems, newItem]);
  };

  const handleSaveMenuItems = async () => {
    if (!selectedPreset) return;

    try {
      setSaving(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-preset-menu-items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            presetId: selectedPreset.id,
            items: menuItems.map(item => ({
              id: item.id.startsWith('new-') ? undefined : item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              item_type: item.item_type,
              display_order: item.display_order,
              image_url: item.image_url,
            })),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save menu items');

      loadMenuItems(selectedPreset.id);
      setMessage({ type: 'success', text: 'Menu items saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save menu items' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading presets...</div>;
  }

  if (!selectedPreset) {
    return <div className="text-center py-8">No presets found</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Select Preset</h3>
        <select
          value={selectedPreset.id}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Colors & Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.primary_color}
                onChange={(e) => handlePresetUpdate('primary_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.primary_color}
                onChange={(e) => handlePresetUpdate('primary_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.secondary_color}
                onChange={(e) => handlePresetUpdate('secondary_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.secondary_color}
                onChange={(e) => handlePresetUpdate('secondary_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.text_color}
                onChange={(e) => handlePresetUpdate('text_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.text_color}
                onChange={(e) => handlePresetUpdate('text_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Background
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.page_background_color}
                onChange={(e) => handlePresetUpdate('page_background_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.page_background_color}
                onChange={(e) => handlePresetUpdate('page_background_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hero Banner Background
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.hero_banner_bg_color}
                onChange={(e) => handlePresetUpdate('hero_banner_bg_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.hero_banner_bg_color}
                onChange={(e) => handlePresetUpdate('hero_banner_bg_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hero Banner Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedPreset.hero_banner_text_color}
                onChange={(e) => handlePresetUpdate('hero_banner_text_color', e.target.value)}
                disabled={saving}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={selectedPreset.hero_banner_text_color}
                onChange={(e) => handlePresetUpdate('hero_banner_text_color', e.target.value)}
                disabled={saving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hero Message
          </label>
          <textarea
            value={selectedPreset.hero_message}
            onChange={(e) => handlePresetUpdate('hero_message', e.target.value)}
            disabled={saving}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_menu}
              onChange={(e) => handlePresetUpdate('show_menu', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Show Menu</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_reviews}
              onChange={(e) => handlePresetUpdate('show_reviews', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Show Reviews</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_events}
              onChange={(e) => handlePresetUpdate('show_events', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Show Events</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_business_info}
              onChange={(e) => handlePresetUpdate('show_business_info', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Show Business Info</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_hero_message}
              onChange={(e) => handlePresetUpdate('show_hero_message', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Show Hero Message</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.orders_enabled}
              onChange={(e) => handlePresetUpdate('orders_enabled', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Orders Enabled</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPreset.show_bookings}
              onChange={(e) => handlePresetUpdate('show_bookings', e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Enable Booking Mode (No Cart/Checkout)</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Menu Items</h3>
          <button
            onClick={handleAddMenuItem}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <div key={item.id} className="p-4 border border-gray-300 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={item.name}
                  onChange={(e) => handleMenuItemChange(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Item Type"
                  value={item.item_type}
                  onChange={(e) => handleMenuItemChange(index, 'item_type', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <textarea
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleMenuItemChange(index, 'description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleMenuItemChange(index, 'price', parseFloat(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Display Order"
                  value={item.display_order}
                  onChange={(e) => handleMenuItemChange(index, 'display_order', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={item.image_url}
                  onChange={(e) => handleMenuItemChange(index, 'image_url', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {!item.id.startsWith('new-') && (
                <button
                  onClick={() => handleDeleteMenuItem(item.id)}
                  disabled={saving}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Delete Item
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveMenuItems}
          disabled={saving}
          className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : 'Save Menu Items'}
        </button>
      </div>
    </div>
  );
}
