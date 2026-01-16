import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  business_id: string;
  sender_type: 'admin' | 'developer';
  sender_name: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface Business {
  id: string;
  name: string;
}

export function SupportTab() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusinessId) {
      loadMessages(selectedBusinessId);
      const subscription = supabase
        .channel(`support:${selectedBusinessId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `business_id=eq.${selectedBusinessId}`
        }, () => {
          loadMessages(selectedBusinessId);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedBusinessId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBusinesses(data || []);
      if (data && data.length > 0) {
        setSelectedBusinessId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('support_messages')
        .update({ read: true })
        .eq('business_id', businessId)
        .eq('sender_type', 'admin');
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBusinessId || !user) return;

    setSending(true);
    try {
      const { data: devData } = await supabase
        .from('developer_accounts')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('support_messages')
        .insert({
          business_id: selectedBusinessId,
          sender_type: 'developer',
          sender_id: user.id,
          sender_name: devData?.name || 'Developer',
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const getUnreadCount = (businessId: string) => {
    return messages.filter(m => m.business_id === businessId && m.sender_type === 'admin' && !m.read).length;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading support chats...</div>;
  }

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Support Management</h2>
        <p className="text-sm sm:text-base text-gray-600">Manage support conversations with all business admins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-y-auto">
          <div className="p-3 sm:p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Businesses</h3>
          </div>
          <div className="divide-y">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => setSelectedBusinessId(business.id)}
                className={`w-full px-3 sm:px-4 py-3 text-left hover:bg-gray-50 transition ${
                  selectedBusinessId === business.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Building2 className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{business.name}</p>
                    {getUnreadCount(business.id) > 0 && (
                      <span className="inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded-full mt-1">
                        {getUnreadCount(business.id)} new
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg shadow-md flex flex-col">
          <div className="p-3 sm:p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600" />
              <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                {selectedBusiness?.name || 'Select a business'}
              </h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm sm:text-base">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'developer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 sm:p-4 ${
                      message.sender_type === 'developer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="font-semibold text-xs sm:text-sm mb-1">{message.sender_name}</p>
                    <p className="text-sm sm:text-base break-words">{message.message}</p>
                    <p className={`text-xs mt-2 ${
                      message.sender_type === 'developer' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="h-4 sm:h-5 w-4 sm:w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
