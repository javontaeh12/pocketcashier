import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  sender_type: 'admin' | 'developer';
  sender_name: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function SupportTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, businessId } = useAuth();

  useEffect(() => {
    if (businessId) {
      loadMessages();

      const subscription = supabase
        .channel(`support:${businessId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `business_id=eq.${businessId}`
        }, () => {
          loadMessages();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [businessId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!businessId) return;

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
        .eq('sender_type', 'developer');
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !businessId || !user) return;

    setSending(true);
    try {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();

      const { error } = await supabase
        .from('support_messages')
        .insert({
          business_id: businessId,
          sender_type: 'admin',
          sender_id: user.id,
          sender_name: businessData?.name || 'Admin',
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading support chat...</div>;
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Support</h2>

      <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
        <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2 sm:gap-3 text-white">
            <MessageSquare className="h-5 sm:h-6 w-5 sm:w-6" />
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Developer Support</h3>
              <p className="text-xs sm:text-sm text-blue-100">Get help from our technical team</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-12 sm:h-16 w-12 sm:w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base mb-2">No messages yet</p>
              <p className="text-xs sm:text-sm text-gray-400">Send a message to start a conversation with support</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 sm:p-4 shadow-sm ${
                    message.sender_type === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-xs sm:text-sm mb-1">
                    {message.sender_type === 'admin' ? 'You' : message.sender_name}
                  </p>
                  <p className="text-sm sm:text-base break-words">{message.message}</p>
                  <p className={`text-xs mt-2 ${
                    message.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message to support..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Send</span>
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-blue-900">
          <strong>Note:</strong> Our support team typically responds within 24 hours. For urgent issues, please include as much detail as possible.
        </p>
      </div>
    </div>
  );
}
