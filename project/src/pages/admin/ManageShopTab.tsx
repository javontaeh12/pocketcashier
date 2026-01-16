import { useState } from 'react';
import { Package, Settings, ShoppingBag } from 'lucide-react';
import { ShopProductsTab } from './ShopProductsTab';
import { ShopOrdersTab } from './ShopOrdersTab';
import { ShopSettingsTab } from './ShopSettingsTab';

type ShopSubTab = 'products' | 'orders' | 'settings';

interface ManageShopTabProps {
  businessId: string;
}

export function ManageShopTab({ businessId }: ManageShopTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<ShopSubTab>('products');

  const subTabs = [
    { id: 'products' as ShopSubTab, label: 'Products', icon: Package },
    { id: 'orders' as ShopSubTab, label: 'Orders', icon: ShoppingBag },
    { id: 'settings' as ShopSubTab, label: 'Settings', icon: Settings },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Shop</h2>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                  activeSubTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {activeSubTab === 'products' && <ShopProductsTab businessId={businessId} />}
        {activeSubTab === 'orders' && <ShopOrdersTab businessId={businessId} />}
        {activeSubTab === 'settings' && <ShopSettingsTab businessId={businessId} />}
      </div>
    </div>
  );
}
