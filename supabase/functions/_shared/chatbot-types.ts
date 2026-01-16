export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
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

export interface BusinessContext {
  id: string;
  name: string;
  business_type: string;
  chatbot_enabled: boolean;
  chatbot_tone?: string;
  chatbot_goals?: Record<string, any>;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  item_type: string;
}

export interface BookingDraft {
  menu_item_id?: string;
  service_type?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  booking_date?: string;
  booking_time?: string;
  duration_minutes?: number;
  notes?: string;
}

export const BUSINESS_TYPE_CONFIG = {
  barber: {
    welcome: "👋 Welcome! Ready to book a haircut or beard trim?",
    services_label: "haircuts and grooming services",
    booking_questions: ["What service are you looking for?", "What day works best for you?"],
    common_services: ["haircut", "beard", "trim", "style"]
  },
  catering: {
    welcome: "👋 Hi! Looking for catering services for your event?",
    services_label: "catering options",
    booking_questions: ["What type of event?", "How many guests?", "What date?"],
    common_services: ["catering", "event", "party", "buffet"]
  },
  fitness: {
    welcome: "👋 Hey! Ready to schedule a training session?",
    services_label: "fitness programs",
    booking_questions: ["What are your fitness goals?", "What's your schedule like?"],
    common_services: ["training", "session", "workout", "fitness"]
  },
  creator: {
    welcome: "👋 Welcome! Interested in my content or services?",
    services_label: "offerings",
    booking_questions: ["What are you interested in?", "Need help with something specific?"],
    common_services: ["consultation", "content", "service"]
  },
  general: {
    welcome: "👋 Hi! How can I help you today?",
    services_label: "services",
    booking_questions: ["What service interests you?", "When would you like to book?"],
    common_services: ["service", "booking", "appointment"]
  }
};
