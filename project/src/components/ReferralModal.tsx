import { useState, useEffect } from 'react';
import { X, Gift, Copy, Check, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
}

interface ReferralBalance {
  success: boolean;
  code?: string;
  code_id?: string;
  balance_cents?: number;
  total_credits_cents?: number;
  total_debits_cents?: number;
  total_credits_count?: number;
  total_debits_count?: number;
  is_active?: boolean;
  saved_confirmed?: boolean;
  error?: string;
}

interface LedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  amount_cents: number;
  reason: string;
  created_at: string;
}

export function ReferralModal({ isOpen, onClose, businessId }: ReferralModalProps) {
  const [step, setStep] = useState<'intro' | 'request' | 'confirm' | 'balance' | 'search'>('intro');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [codeId, setCodeId] = useState('');
  const [balance, setBalance] = useState<ReferralBalance | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkExistingCode();
    }
  }, [isOpen]);

  const checkExistingCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (data) {
        setReferralCode(data.code);
        setCodeId(data.id);
        if (data.saved_confirmed_at) {
          loadBalance(data.code);
        } else {
          setStep('confirm');
        }
      }
    }
  };

  const handleRequestCode = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user && !email) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-referral-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            businessId,
            customerEmail: email || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setReferralCode(result.code);
        setCodeId(result.code_id);
        if (result.saved_confirmed) {
          loadBalance(result.code);
        } else {
          setStep('confirm');
        }
      } else {
        setError(result.error || 'Failed to generate code');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSaved = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.rpc('confirm_referral_code_saved', {
        p_code_id: codeId,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        loadBalance(referralCode);
      }
    } catch (err) {
      setError('Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async (code: string) => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-referral-balance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            code,
            businessId,
            customerEmail: email || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setBalance(result);
        setReferralCode(code);
        loadHistory(result.code_id);
        setStep('balance');
      } else {
        setError(result.error || 'Failed to load balance');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (codeId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_referral_ledger_history', {
        p_code_id: codeId,
        p_limit: 20,
      });

      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchCode || !searchEmail) {
      setError('Both code and email are required');
      return;
    }
    await loadBalance(searchCode.toUpperCase());
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCents = (cents: number) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Referral Rewards</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How Referral Rewards Work</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Get your unique referral code that acts as a discount code</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Share your code with friends and family</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Earn credit every time someone uses your code</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Use your earned credits as a discount on future orders</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setStep('request')}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Get My Referral Code
                </button>

                <button
                  onClick={() => setStep('search')}
                  className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  I Already Have a Code
                </button>
              </div>
            </div>
          )}

          {step === 'request' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Enter your email to receive your unique referral code. You'll be able to track your earnings and use them as discounts.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleRequestCode}
                  disabled={loading || !email}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h3 className="font-semibold text-green-900 mb-3">Your Referral Code</h3>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-3xl font-bold text-gray-900 tracking-wider">{referralCode}</p>
                </div>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Important: Save your code! You'll need it to check your balance and redeem rewards.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleConfirmSaved();
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">I have saved my referral code</span>
              </label>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {loading && (
                <div className="text-center text-gray-600">Loading balance...</div>
              )}
            </div>
          )}

          {step === 'balance' && balance && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Your Referral Code</p>
                    <p className="text-2xl font-bold tracking-wider">{balance.code}</p>
                  </div>
                  <button
                    onClick={copyCode}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Available Balance</p>
                  <p className="text-4xl font-bold">{formatCents(balance.balance_cents || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <p className="text-sm font-medium">Total Earned</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCents(balance.total_credits_cents || 0)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {balance.total_credits_count || 0} transactions
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <TrendingDown className="w-4 h-4" />
                    <p className="text-sm font-medium">Total Used</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCents(balance.total_debits_cents || 0)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {balance.total_debits_count || 0} transactions
                  </p>
                </div>
              </div>

              {history.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Transaction History</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              entry.type === 'credit'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'
                            }`}
                          >
                            {entry.type === 'credit' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {entry.reason === 'referral_use_credit'
                                ? 'Referral Credit Earned'
                                : entry.reason === 'discount_redemption'
                                ? 'Discount Redeemed'
                                : entry.reason}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                          </div>
                        </div>
                        <p
                          className={`font-semibold ${
                            entry.type === 'credit' ? 'text-green-600' : 'text-orange-600'
                          }`}
                        >
                          {entry.type === 'credit' ? '+' : '-'}
                          {formatCents(entry.amount_cents)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setStep('intro');
                  setBalance(null);
                  setHistory([]);
                }}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {step === 'search' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Search className="w-5 h-5" />
                <h3 className="font-semibold text-gray-900">Look Up Your Balance</h3>
              </div>

              <p className="text-sm text-gray-600">
                Enter your referral code and email to view your balance and transaction history.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Code
                </label>
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('intro');
                    setSearchCode('');
                    setSearchEmail('');
                    setError('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchCode || !searchEmail}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'View Balance'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
