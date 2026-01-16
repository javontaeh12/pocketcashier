import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ChatMessage,
  ChatResponse,
  ChatAction,
  BusinessContext,
  MenuItem,
  BookingDraft,
  BUSINESS_TYPE_CONFIG,
} from "../_shared/chatbot-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessChatRequest {
  session_id: string;
  business_id: string;
  message: string;
  visitor_id?: string;
  session_token?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const body: ProcessChatRequest = await req.json();
    const { session_id, business_id, message, visitor_id, session_token, metadata = {} } = body;

    if (!session_token) {
      console.error('[process-chat] Missing session_token in request');
      return new Response(
        JSON.stringify({
          error: "Session token required",
          error_code: "MISSING_SESSION_TOKEN",
          error_id: crypto.randomUUID()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing chat request:`, {
      session_id,
      business_id,
      visitor_id,
      message_length: message?.length,
      has_metadata: !!metadata && Object.keys(metadata).length > 0
    });

    // Load business context
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, business_type, chatbot_enabled, chatbot_tone, chatbot_goals")
      .eq("id", business_id)
      .maybeSingle();

    if (businessError) {
      console.error(`[${requestId}] Business query error:`, businessError);
      return new Response(
        JSON.stringify({
          error: "Failed to load business",
          error_code: "BUSINESS_LOAD_ERROR",
          error_id: requestId
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business) {
      console.error(`[${requestId}] Business not found:`, business_id);
      return new Response(
        JSON.stringify({
          error: "Business not found",
          error_code: "BUSINESS_NOT_FOUND",
          error_id: requestId
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business.chatbot_enabled) {
      console.log(`[${requestId}] Chatbot disabled for business:`, business_id);
      return new Response(
        JSON.stringify({
          error: "Chatbot is not enabled",
          error_code: "CHATBOT_DISABLED",
          error_id: requestId
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load menu items/services
    const { data: menuItems = [] } = await supabase
      .from("menu_items")
      .select("id, name, description, price, item_type")
      .eq("business_id", business_id)
      .eq("is_available", true);

    // Verify or create session using token-based verification
    if (!visitor_id) {
      console.error(`[${requestId}] No visitor_id provided for anonymous session`);
      return new Response(
        JSON.stringify({
          error: "Session requires visitor identification",
          error_code: "MISSING_VISITOR_ID",
          error_id: requestId
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: sessionResult, error: sessionError } = await supabase.rpc(
      'get_or_create_session',
      {
        p_session_id: session_id,
        p_business_id: business_id,
        p_visitor_id: visitor_id,
        p_user_id: null,
        p_token: session_token
      }
    );

    if (sessionError) {
      console.error(`[${requestId}] Failed to verify/create session:`, {
        message: sessionError.message,
        code: sessionError.code,
        status: sessionError.status,
        session_id,
        business_id,
        visitor_id
      });
      return new Response(
        JSON.stringify({
          error: "Failed to verify session",
          error_code: "SESSION_CHECK_ERROR",
          error_id: requestId,
          details: sessionError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessionResult || sessionResult.length === 0) {
      console.error(`[${requestId}] Session RPC returned no result`);
      return new Response(
        JSON.stringify({
          error: "Failed to verify session",
          error_code: "SESSION_VERIFY_FAILED",
          error_id: requestId
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = sessionResult[0];
    console.log(`[${requestId}] Session verified:`, {
      session_id: sessionData.session_id,
      is_new: sessionData.is_new_session
    });

    // Load conversation history
    const { data: messages = [] } = await supabase
      .from("chat_messages")
      .select("role, content, metadata")
      .eq("session_id", sessionData.session_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Store user message
    const { error: insertUserError } = await supabase.from("chat_messages").insert({
      session_id: sessionData.session_id,
      role: "user",
      content: message,
      metadata,
    });

    if (insertUserError) {
      console.error(`[${requestId}] Failed to insert user message:`, {
        message: insertUserError.message,
        details: insertUserError.details,
        hint: insertUserError.hint,
        code: insertUserError.code,
        session_id: sessionData.session_id,
        visitor_id
      });

      // Determine specific error type
      let errorCode = "USER_MESSAGE_INSERT_ERROR";
      let errorMessage = "Failed to save your message";

      if (insertUserError.code === '23503') {
        errorCode = "FOREIGN_KEY_VIOLATION";
        errorMessage = "Chat session not found or invalid";
      } else if (insertUserError.code === '23505') {
        errorCode = "DUPLICATE_KEY";
        errorMessage = "Duplicate message detected";
      } else if (insertUserError.message?.includes('policy')) {
        errorCode = "PERMISSION_DENIED";
        errorMessage = "Permission denied - unable to save message";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          error_code: errorCode,
          error_id: requestId,
          details: insertUserError.message,
          db_code: insertUserError.code,
          hint: insertUserError.hint
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate response
    const response = generateResponse(
      message,
      business as BusinessContext,
      menuItems as MenuItem[],
      messages as ChatMessage[],
      metadata
    );

    // Store assistant message
    const { error: insertAssistantError } = await supabase.from("chat_messages").insert({
      session_id: sessionData.session_id,
      role: "assistant",
      content: response.message,
      metadata: response.metadata || {},
    });

    if (insertAssistantError) {
      console.error(`[${requestId}] Failed to insert assistant message:`, insertAssistantError);
      return new Response(
        JSON.stringify({
          error: "Failed to save response",
          error_code: "ASSISTANT_MESSAGE_INSERT_ERROR",
          error_id: requestId,
          details: insertAssistantError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Chat processed successfully`);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error processing chat:`, error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        error_code: "INTERNAL_SERVER_ERROR",
        error_id: errorId
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateResponse(
  userMessage: string,
  business: BusinessContext,
  menuItems: MenuItem[],
  history: ChatMessage[],
  sessionMetadata: Record<string, any>
): ChatResponse {
  const lowerMessage = userMessage.toLowerCase();
  const businessType = business.business_type || "general";
  const config = BUSINESS_TYPE_CONFIG[businessType as keyof typeof BUSINESS_TYPE_CONFIG] || BUSINESS_TYPE_CONFIG.general;

  // Check if this is first message (auto-open with referral focus)
  if (history.length === 0) {
    return {
      message: `${config.welcome}\n\n🎁 Did you know? We have a referral program where you can earn rewards by sharing with friends!\n\nWould you like to learn more about our referral program?`,
      metadata: { intent: "referral_welcome", awaiting_referral_response: true },
    };
  }

  // Check if we're awaiting referral program response
  if (sessionMetadata.awaiting_referral_response) {
    if (
      lowerMessage.includes('yes') ||
      lowerMessage.includes('sure') ||
      lowerMessage.includes('ok') ||
      lowerMessage.includes('tell me') ||
      lowerMessage.includes('learn')
    ) {
      return handleReferralIntent(business);
    } else if (
      lowerMessage.includes('no') ||
      lowerMessage.includes('not now') ||
      lowerMessage.includes('maybe later') ||
      lowerMessage.includes('skip')
    ) {
      return {
        message: `No problem! I can still help you with:\n\n📅 Booking an appointment\n📋 Browsing our ${config.services_label}\n🛒 Placing an order\n\nWhat would you like to do?`,
        metadata: { intent: "help_after_no", awaiting_referral_response: false },
      };
    }
  }

  // Intent detection
  if (
    lowerMessage.includes("book") ||
    lowerMessage.includes("appointment") ||
    lowerMessage.includes("schedule") ||
    lowerMessage.includes("reservation")
  ) {
    return handleBookingIntent(business, menuItems, sessionMetadata, config);
  }

  if (
    lowerMessage.includes("referral") ||
    lowerMessage.includes("refer") ||
    lowerMessage.includes("discount") ||
    lowerMessage.includes("promo")
  ) {
    return handleReferralIntent(business);
  }

  if (
    lowerMessage.includes("service") ||
    lowerMessage.includes("menu") ||
    lowerMessage.includes("offer") ||
    lowerMessage.includes("what do you")
  ) {
    return handleServicesIntent(business, menuItems, config);
  }

  if (lowerMessage.includes("help") || lowerMessage.includes("how")) {
    return {
      message: `I'm here to help! You can:\n\n📅 Book an appointment\n🎁 Join our referral program\n📋 Browse our ${config.services_label}\n\nJust let me know what you need!`,
      metadata: { intent: "help" },
    };
  }

  // Check if we're in a booking flow
  if (sessionMetadata.bookingDraft) {
    return handleBookingFlow(userMessage, sessionMetadata.bookingDraft, menuItems, business);
  }

  // Default response
  return {
    message: `I'd love to help! Would you like to:\n\n1️⃣ Book an appointment\n2️⃣ See our ${config.services_label}\n3️⃣ Learn about our referral program\n\nJust let me know!`,
    metadata: { intent: "general" },
  };
}

function handleBookingIntent(
  business: BusinessContext,
  menuItems: MenuItem[],
  sessionMetadata: Record<string, any>,
  config: any
): ChatResponse {
  if (!business.chatbot_goals?.enable_bookings && menuItems.length === 0) {
    return {
      message: "Bookings aren't available right now. Please contact us directly!",
      metadata: { intent: "booking_unavailable" },
    };
  }

  if (menuItems.length === 0) {
    return {
      message: "Let me help you book! Could you tell me what service you're interested in?",
      metadata: { intent: "booking_start", bookingDraft: {} },
    };
  }

  // Recommend services
  const serviceList = menuItems
    .slice(0, 5)
    .map((item, idx) => `${idx + 1}. ${item.name} - $${item.price}`)
    .join("\n");

  return {
    message: `Great! Here are our available services:\n\n${serviceList}\n\nWhich one interests you? (Type the number or name)`,
    action: {
      type: "recommend_services",
      data: { services: menuItems.slice(0, 5).map(m => m.id) },
      requiresConfirmation: false,
    },
    metadata: { intent: "booking_service_selection", bookingDraft: {} },
  };
}

function handleReferralIntent(business: BusinessContext): ChatResponse {
  return {
    message: `🎁 Join our referral program and earn rewards!\n\nShare your unique code with friends and get discounts when they book.\n\nWould you like to get your referral code now?`,
    action: {
      type: "modal",
      target: "referrals",
      requiresConfirmation: false,
    },
    metadata: { intent: "referral_intro" },
  };
}

function handleServicesIntent(
  business: BusinessContext,
  menuItems: MenuItem[],
  config: any
): ChatResponse {
  if (menuItems.length === 0) {
    return {
      message: "We're updating our services. Please check back soon or contact us directly!",
      metadata: { intent: "services_unavailable" },
    };
  }

  const serviceList = menuItems
    .slice(0, 6)
    .map((item) => `• ${item.name} - $${item.price}\n  ${item.description || ""}`)
    .join("\n\n");

  return {
    message: `Here are our ${config.services_label}:\n\n${serviceList}\n\nWould you like to book one of these?`,
    action: {
      type: "navigate",
      target: "services",
      requiresConfirmation: false,
    },
    metadata: { intent: "show_services" },
  };
}

function handleBookingFlow(
  userMessage: string,
  bookingDraft: BookingDraft,
  menuItems: MenuItem[],
  business: BusinessContext
): ChatResponse {
  // Parse user selection
  const lowerMessage = userMessage.toLowerCase();

  // Service selection
  if (!bookingDraft.menu_item_id) {
    const selectedService = findServiceByInput(userMessage, menuItems);
    if (selectedService) {
      return {
        message: `Perfect! You selected ${selectedService.name}.\n\nWhat date works best for you? (e.g., "Tomorrow" or "Feb 15")`,
        metadata: {
          intent: "booking_date_request",
          bookingDraft: { ...bookingDraft, menu_item_id: selectedService.id, service_type: selectedService.name },
        },
      };
    } else {
      return {
        message: "I couldn't find that service. Could you choose from the list above?",
        metadata: { intent: "booking_service_selection", bookingDraft },
      };
    }
  }

  // Date selection
  if (!bookingDraft.booking_date) {
    const date = parseDate(userMessage);
    if (date) {
      return {
        message: `Great! What time on ${date}? (e.g., "2pm" or "14:00")`,
        metadata: {
          intent: "booking_time_request",
          bookingDraft: { ...bookingDraft, booking_date: date },
        },
      };
    } else {
      return {
        message: "I didn't catch that date. Could you try again? (e.g., \"Tomorrow\" or \"Feb 15\")",
        metadata: { intent: "booking_date_request", bookingDraft },
      };
    }
  }

  // Time selection
  if (!bookingDraft.booking_time) {
    const time = parseTime(userMessage);
    if (time) {
      return {
        message: `Perfect! Last step - what's your name?`,
        metadata: {
          intent: "booking_name_request",
          bookingDraft: { ...bookingDraft, booking_time: time },
        },
      };
    } else {
      return {
        message: "I didn't understand that time. Could you try again? (e.g., \"2pm\" or \"14:00\")",
        metadata: { intent: "booking_time_request", bookingDraft },
      };
    }
  }

  // Name collection
  if (!bookingDraft.customer_name) {
    return {
      message: `Thanks! And what's your email address?`,
      metadata: {
        intent: "booking_email_request",
        bookingDraft: { ...bookingDraft, customer_name: userMessage.trim() },
      },
    };
  }

  // Email collection
  if (!bookingDraft.customer_email) {
    if (isValidEmail(userMessage)) {
      return {
        message: `Great! And your phone number?`,
        metadata: {
          intent: "booking_phone_request",
          bookingDraft: { ...bookingDraft, customer_email: userMessage.trim() },
        },
      };
    } else {
      return {
        message: "That doesn't look like a valid email. Could you try again?",
        metadata: { intent: "booking_email_request", bookingDraft },
      };
    }
  }

  // Phone collection - final step
  if (!bookingDraft.customer_phone) {
    const service = menuItems.find(m => m.id === bookingDraft.menu_item_id);
    return {
      message: `Perfect! Here's your booking summary:\n\n📅 Service: ${service?.name || bookingDraft.service_type}\n📆 Date: ${bookingDraft.booking_date}\n🕐 Time: ${bookingDraft.booking_time}\n👤 Name: ${bookingDraft.customer_name}\n📧 Email: ${bookingDraft.customer_email}\n📱 Phone: ${userMessage.trim()}\n\nShall I confirm this booking?`,
      action: {
        type: "create_booking",
        data: { ...bookingDraft, customer_phone: userMessage.trim(), duration_minutes: 60 },
        requiresConfirmation: true,
        confirmationMessage: "Click 'Confirm Booking' to finalize your appointment.",
      },
      metadata: {
        intent: "booking_confirmation",
        bookingDraft: { ...bookingDraft, customer_phone: userMessage.trim() },
      },
    };
  }

  return {
    message: "Something went wrong. Let's start over. Would you like to book an appointment?",
    metadata: { intent: "booking_reset" },
  };
}

// Helper functions
function findServiceByInput(input: string, menuItems: MenuItem[]): MenuItem | null {
  const lowerInput = input.toLowerCase().trim();

  // Try number selection
  const num = parseInt(lowerInput);
  if (!isNaN(num) && num > 0 && num <= menuItems.length) {
    return menuItems[num - 1];
  }

  // Try name match
  return menuItems.find(item =>
    item.name.toLowerCase().includes(lowerInput) ||
    lowerInput.includes(item.name.toLowerCase())
  ) || null;
}

function parseDate(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const today = new Date();

  if (lower.includes("today")) {
    return today.toISOString().split("T")[0];
  }

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  // Try to parse date formats
  const dateMatch = input.match(/(\d{1,2})[-\/](\d{1,2})[-\/]?(\d{2,4})?/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const fullYear = year ? (year.length === 2 ? `20${year}` : year) : today.getFullYear();
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseTime(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // Match formats like "2pm", "14:00", "2:30 PM"
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let [, hour, minute = "00", meridiem] = timeMatch;
    let hourNum = parseInt(hour);

    if (meridiem?.toLowerCase() === "pm" && hourNum < 12) {
      hourNum += 12;
    } else if (meridiem?.toLowerCase() === "am" && hourNum === 12) {
      hourNum = 0;
    }

    return `${hourNum.toString().padStart(2, "0")}:${minute}`;
  }

  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
