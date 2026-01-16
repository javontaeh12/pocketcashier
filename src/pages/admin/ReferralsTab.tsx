import { useState, useEffect } from 'react';
import { Save, Gift, TrendingUp, Users, DollarSign, Calendar, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReferralsTabProps {
  businessId: string;
}

interface ReferralProgram {
  id: string;
  is_enabled: boolean;
  credit_per_use_cents: number;
  min_order_cents: number;
  max_credit_per_month_cents: number | null;
  max_credit_per_order_cents: number | null;
}

interface ReferralCode {
  code: string;
  referral_code_id: string;
  customer_email: string | null;
  balance_cents: number;
  total_credits_cents: number;
  total_debits_cents: number;
  total_credits_count: number;
  total_debits_count: number;
  is_active: boolean;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  code: string;
  type: 'credit' | 'debit';
  amount_cents: number;
  reason: string;
  created_at: string;
  customer_email: string | null;
}

export function ReferralsTab({ businessId }: ReferralsTabProps) {
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'settings' | 'codes' | 'ledger'>('settings');

  useEffect(() => {
    loadProgram();
    loadReferralCodes();
    loadLedgerEntries();
  }, [businessId]);

  const loadProgram = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_programs')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProgram(data);
      } else {
        setProgram({
          id: '',
          is_enabled: true,
          credit_per_use_cents: 500,
          min_order_cents: 0,
          max_credit_per_month_cents: null,
          max_credit_per_order_cents: null,
        });
      }
    } catch (error) {
      console.error('Error loading referral program:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferralCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_balances_view')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferralCodes(data || []);
    } catch (error) {
      console.error('Error loading referral codes:', error);
    }
  };

  const loadLedgerEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_ledger')
        .select(`
          id,
          type,
          amount_cents,
          reason,
          created_at,
          referral_code:referral_codes (
            code,
            customer_email
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedData = (data || []).map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        amount_cents: entry.amount_cents,
        reason: entry.reason,
        created_at: entry.created_at,
        code: entry.referral_code?.code || 'N/A',
        customer_email: entry.referral_code?.customer_email || null,
      }));

      setLedgerEntries(formattedData);
    } catch (error) {
      console.error('Error loading ledger entries:', error);
    }
  };

  const handleSave = async () => {
    if (!program) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (program.id) {
        const { error } = await supabase
          .from('referral_programs')
          .update({
            is_enabled: program.is_enabled,
            credit_per_use_cents: program.credit_per_use_cents,
            min_order_cents: program.min_order_cents,
            max_credit_per_month_cents: program.max_credit_per_month_cents,
            max_credit_per_order_cents: program.max_credit_per_order_cents,
          })
          .eq('id', program.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('referral_programs')
          .insert({
            business_id: businessId,
            is_enabled: program.is_enabled,
            credit_per_use_cents: program.credit_per_use_cents,
            min_order_cents: program.min_order_cents,
            max_credit_per_month_cents: program.max_credit_per_month_cents,
            max_credit_per_order_cents: program.max_credit_per_order_cents,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProgram({ ...program, id: data.id });
        }
      }

      setMessage({ type: 'success', text: 'Referral program updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving referral program:', error);
      setMessage({ type: 'error', text: 'Failed to save referral program' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredCodes = referralCodes.filter(
    (code) =>
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLedger = ledgerEntries.filter(
    (entry) =>
      entry.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalCodes: referralCodes.length,
    activeCodes: referralCodes.filter((c) => c.is_active).length,
    totalCreditsIssued: referralCodes.reduce((sum, c) => sum + c.total_credits_cents, 0),
    totalCreditsRedeemed: referralCodes.reduce((sum, c) => sum + c.total_debits_cents, 0),
    outstandingBalance: referralCodes.reduce((sum, c) => sum + c.balance_cents, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading referral program...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Failed to load referral program</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Referral Program</h2>
        </div>
        {program.is_enabled && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <p className="text-sm font-medium">Total Codes</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.totalCodes}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.activeCodes}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <p className="text-sm font-medium">Credits Issued</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {formatCurrency(stats.totalCreditsIssued)}
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <p className="text-sm font-medium">Credits Redeemed</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(stats.totalCreditsRedeemed)}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <p className="text-sm font-medium">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.outstandingBalance)}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('settings')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === 'settings'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Program Settings
          </button>
          <button
            onClick={() => setActiveView('codes')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === 'codes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Referral Codes ({referralCodes.length})
          </button>
          <button
            onClick={() => setActiveView('ledger')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === 'ledger'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Transaction History
          </button>
        </div>
      </div>

      {activeView === 'settings' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How Referral Rewards Work</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span>•</span>
                <span>
                  Customers request a unique referral code that doubles as a discount code
                </span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>
                  When someone uses their code at checkout, they earn credits automatically
                </span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Earned credits can be used as discounts on future orders</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>
                  All transactions are tracked in the ledger for complete transparency
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900">Enable Referral Program</h3>
              <p className="text-sm text-gray-600">
                Allow customers to earn and redeem referral credits
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={program.is_enabled}
                onChange={(e) => setProgram({ ...program, is_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Per Referral Use
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(program.credit_per_use_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setProgram({
                      ...program,
                      credit_per_use_cents: Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Amount credited when someone uses a referral code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(program.min_order_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setProgram({
                      ...program,
                      min_order_cents: Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum order total to use referral discount
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Credit Per Order
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    program.max_credit_per_order_cents
                      ? (program.max_credit_per_order_cents / 100).toFixed(2)
                      : ''
                  }
                  onChange={(e) =>
                    setProgram({
                      ...program,
                      max_credit_per_order_cents: e.target.value
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : null,
                    })
                  }
                  placeholder="No limit"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum discount that can be applied per order
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Credit Per Month
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    program.max_credit_per_month_cents
                      ? (program.max_credit_per_month_cents / 100).toFixed(2)
                      : ''
                  }
                  onChange={(e) =>
                    setProgram({
                      ...program,
                      max_credit_per_month_cents: e.target.value
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : null,
                    })
                  }
                  placeholder="No limit"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum credits a code can earn per month
              </p>
            </div>
          </div>

          {message.text && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeView === 'codes' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or email..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Earned
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Redeemed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    Uses
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCodes.map((code) => (
                  <tr key={code.referral_code_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{code.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {code.customer_email || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(code.balance_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      {formatCurrency(code.total_credits_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-orange-600">
                      {formatCurrency(code.total_debits_cents)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {code.total_credits_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          code.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {code.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(code.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCodes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No codes found matching your search' : 'No referral codes yet'}
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'ledger' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or email..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{entry.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.customer_email || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {entry.type === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.reason === 'referral_use_credit'
                        ? 'Referral Use'
                        : entry.reason === 'discount_redemption'
                        ? 'Discount'
                        : entry.reason}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        entry.type === 'credit' ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {entry.type === 'credit' ? '+' : '-'}
                      {formatCurrency(entry.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLedger.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No transactions found matching your search' : 'No transactions yet'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
