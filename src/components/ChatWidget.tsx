import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getOrCreateVisitorId,
  getOrCreateSessionId,
  getOrCreateSessionToken,
  clearSessionId,
  ChatMessage,
  ChatAction,
  ChatResponse,
} from '../lib/chatUtils';

interface ChatWidgetProps {
  businessId: string;
  businessName: string;
  onNavigate?: (target: string) => void;
  onOpenModal?: (modal: 'booking' | 'referrals') => void;
  onSelectService?: (serviceId: string) => void;
}

export function ChatWidget({
  businessId,
  businessName,
  onNavigate,
  onOpenModal,
  onSelectService,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [sessionMetadata, setSessionMetadata] = useState<Record<string, any>>({});
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const vid = getOrCreateVisitorId();
    setVisitorId(vid);
  }, []);

  useEffect(() => {
    const autoOpenKey = `chat_auto_opened_${businessId}`;
    const hasOpened = sessionStorage.getItem(autoOpenKey);

    if (!hasOpened && !hasAutoOpened) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
        sessionStorage.setItem(autoOpenKey, 'true');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [businessId, hasAutoOpened]);

  useEffect(() => {
    if (isOpen && !sessionId && visitorId) {
      initializeSession();
    }
  }, [isOpen, businessId, visitorId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      const sid = getOrCreateSessionId(businessId);
      const token = getOrCreateSessionToken(businessId);
      setSessionId(sid);
      setSessionToken(token);

      console.log('[ChatWidget] Initializing session:', {
        sessionId: sid,
        businessId,
        visitorId,
        userId: user?.id
      });

      // Check if session exists in DB
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id, session_context')
        .eq('id', sid)
        .maybeSingle();

      if (sessionError) {
        console.error('[ChatWidget] Error checking session:', sessionError);
        // Continue anyway - edge function will create it if needed
      }

      if (existingSession) {
        console.log('[ChatWidget] Found existing session, loading messages');
        // Load existing messages
        const { data: existingMessages } = await supabase
          .from('chat_messages')
          .select('id, role, content, metadata, created_at')
          .eq('session_id', sid)
          .order('created_at', { ascending: true });

        if (existingMessages) {
          setMessages(
            existingMessages.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              metadata: msg.metadata,
              timestamp: new Date(msg.created_at),
            }))
          );
        }

        setSessionMetadata(existingSession.session_context || {});
      } else {
        console.log('[ChatWidget] No existing session, edge function will create on first message');
        // Don't create session here - let edge function handle it
        // This avoids race conditions and ensures proper server-side validation

        // Send initial message (edge function will create session)
        await sendMessage('', true);
      }
    } catch (error) {
      console.error('[ChatWidget] Error initializing session:', error);
      // Session creation will be handled by edge function on first message
    }
  };

  const sendMessage = async (content: string, isInitial = false) => {
    if (!content.trim() && !isInitial) return;
    if (loading) return;

    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Get fresh values directly (state may be stale during initialization)
      const currentSessionId = sessionId || getOrCreateSessionId(businessId);
      const currentToken = getOrCreateSessionToken(businessId);
      const currentVisitorId = visitorId || getOrCreateVisitorId();

      // Add user message to UI immediately (unless initial)
      if (!isInitial) {
        const userMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
      }

      // Call Edge Function
      const requestPayload = {
        session_id: currentSessionId,
        business_id: businessId,
        message: content || 'hello',
        visitor_id: currentVisitorId,
        session_token: currentToken,
        metadata: sessionMetadata,
      };

      console.log('[ChatWidget] Sending message:', {
        endpoint: `${supabaseUrl}/functions/v1/process-chat`,
        payload: requestPayload,
      });

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(requestPayload),
        }
      );

      console.log('[ChatWidget] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ChatWidget] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        const errorMessage = errorData.error || 'Failed to send message';
        const errorId = errorData.error_id || 'unknown';
        const errorCode = errorData.error_code || 'UNKNOWN_ERROR';

        throw new Error(
          `${errorMessage} (Status: ${response.status}, Code: ${errorCode}, ID: ${errorId})`
        );
      }

      const result: ChatResponse = await response.json();
      console.log('[ChatWidget] Response received:', {
        messageLength: result.message?.length,
        hasMetadata: !!result.metadata,
        hasAction: !!result.action,
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.message,
        metadata: result.metadata,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update session metadata
      if (result.metadata) {
        setSessionMetadata((prev) => ({ ...prev, ...result.metadata }));

        // Update session context in database
        await supabase
          .from('chat_sessions')
          .update({ session_context: { ...sessionMetadata, ...result.metadata } })
          .eq('id', currentSessionId);
      }

      // Handle action
      if (result.action) {
        if (result.action.requiresConfirmation) {
          setPendingAction(result.action);
        } else {
          executeAction(result.action);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Sorry, I encountered an error. Please try again.';

      const userFriendlyMessage = errorMessage.includes('Status: ')
        ? `${errorMessage}\n\nPlease try again or contact support if the issue persists.`
        : 'Sorry, I encountered an error. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: userFriendlyMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (action: ChatAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.target && onNavigate) {
          onNavigate(action.target);
        }
        break;

      case 'modal':
        if (action.target === 'booking' || action.target === 'referrals') {
          onOpenModal?.(action.target);
        }
        break;

      case 'recommend_services':
        if (action.data?.services && onSelectService && action.data.services[0]) {
          // Could implement service highlighting or navigation
        }
        break;

      default:
        break;
    }

    setPendingAction(null);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    setConfirmingAction(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/confirm-chat-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action_type: pendingAction.type,
            business_id: businessId,
            session_id: sessionId,
            data: {
              ...pendingAction.data,
              user_id: user?.id,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to confirm action');
      }

      const result = await response.json();

      // Add success message
      if (result.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: `success-${Date.now()}`,
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
          },
        ]);
      }

      // Clear pending action and reset booking draft
      setPendingAction(null);
      setSessionMetadata((prev) => {
        const newMetadata = { ...prev };
        delete newMetadata.bookingDraft;
        return newMetadata;
      });

      // Update session context in database
      const updatedMetadata = { ...sessionMetadata };
      delete updatedMetadata.bookingDraft;
      await supabase
        .from('chat_sessions')
        .update({ session_context: updatedMetadata })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error confirming action:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setConfirmingAction(false);
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        role: 'assistant',
        content: "No problem! Let me know if you'd like to try something else.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const resetChat = () => {
    clearSessionId(businessId);
    setMessages([]);
    setSessionId('');
    setPendingAction(null);
    setSessionMetadata({});
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
        aria-label="Open chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{businessName}</h3>
            <p className="text-xs text-blue-100">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetChat}
            className="text-white/80 hover:text-white transition text-xs px-2 py-1 rounded hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Starting conversation...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-gray-100 text-gray-600 text-sm italic'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          </div>
        )}

        {/* Confirmation UI */}
        {pendingAction && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-3">
                  {pendingAction.confirmationMessage || 'Please confirm this action:'}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={confirmAction}
                    disabled={confirmingAction}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {confirmingAction ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelAction}
                    disabled={confirmingAction}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={loading || confirmingAction}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={loading || !inputValue.trim() || confirmingAction}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Powered by AI - responses may vary
        </p>
      </div>
    </div>
  );
}
