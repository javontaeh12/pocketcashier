export function getOrCreateVisitorId(): string {
  const STORAGE_KEY = 'visitor_id';

  let visitorId = localStorage.getItem(STORAGE_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }

  return visitorId;
}

export function getOrCreateSessionId(businessId: string): string {
  const STORAGE_KEY = `chat_session_${businessId}`;

  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

export function getOrCreateSessionToken(businessId: string): string {
  const STORAGE_KEY = `chat_session_token_${businessId}`;

  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    token = generateRandomToken(32);
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}

function generateRandomToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function clearSessionId(businessId: string): void {
  const STORAGE_KEY = `chat_session_${businessId}`;
  sessionStorage.removeItem(STORAGE_KEY);
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ChatAction {
  type: 'navigate' | 'modal' | 'recommend_services' | 'create_booking' | 'generate_referral';
  target?: string;
  data?: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

export interface ChatResponse {
  message: string;
  action?: ChatAction;
  metadata?: Record<string, any>;
}
