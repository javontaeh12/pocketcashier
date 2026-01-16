import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfirmActionRequest {
  action_type: 'create_booking' | 'generate_referral';
  business_id: string;
  session_id: string;
  data: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ConfirmActionRequest = await req.json();
    const { action_type, business_id, session_id, data } = body;

    // Verify session exists and belongs to business
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, business_id")
      .eq("id", session_id)
      .eq("business_id", business_id)
      .maybeSingle();

    if (sessionError || !session) {
      throw new Error("Invalid session");
    }

    let result: any = {};

    if (action_type === "create_booking") {
      result = await createBooking(supabase, business_id, data);
    } else if (action_type === "generate_referral") {
      result = await generateReferral(supabase, business_id, data);
    } else {
      throw new Error("Invalid action type");
    }

    // Log action in chat messages
    await supabase.from("chat_messages").insert({
      session_id,
      role: "system",
      content: `Action completed: ${action_type}`,
      metadata: { action_type, result },
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error confirming action:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createBooking(supabase: any, business_id: string, data: any) {
  const {
    menu_item_id,
    service_type,
    customer_name,
    customer_email,
    customer_phone,
    booking_date,
    booking_time,
    duration_minutes = 60,
    notes = "",
  } = data;

  // Combine date and time
  const bookingDateTime = `${booking_date}T${booking_time}:00`;

  // Generate idempotency key
  const idempotencyKey = `chat_${business_id}_${customer_email}_${bookingDateTime}`;

  // Check for duplicate
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingBooking) {
    return {
      booking_id: existingBooking.id,
      message: "Booking already exists",
    };
  }

  // Get menu item details
  let price = 0;
  if (menu_item_id) {
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("price")
      .eq("id", menu_item_id)
      .maybeSingle();

    if (menuItem) {
      price = menuItem.price;
    }
  }

  // Create booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      business_id,
      menu_item_id,
      service_type,
      customer_name,
      customer_email,
      customer_phone,
      booking_date: bookingDateTime,
      duration_minutes,
      notes,
      status: "pending",
      payment_amount: price,
      payment_status: "unpaid",
      idempotency_key: idempotencyKey,
      email_sent_to_customer: false,
      email_sent_to_admin: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  // Send confirmation emails (async, don't wait)
  supabase.functions.invoke("send-booking-confirmation", {
    body: { booking_id: booking.id },
  }).catch(console.error);

  return {
    booking_id: booking.id,
    message: `✅ Booking confirmed for ${booking_date} at ${booking_time}!\n\nYou'll receive a confirmation email at ${customer_email}.`,
    booking_details: {
      date: booking_date,
      time: booking_time,
      service: service_type,
    },
  };
}

async function generateReferral(supabase: any, business_id: string, data: any) {
  const { customer_email, user_id } = data;

  if (!customer_email && !user_id) {
    throw new Error("Email or user ID required");
  }

  // Call existing referral code function
  const { data: result, error } = await supabase.functions.invoke(
    "request-referral-code",
    {
      body: {
        businessId: business_id,
        customerEmail: customer_email,
        userId: user_id,
      },
    }
  );

  if (error) {
    throw new Error(`Failed to generate referral: ${error.message}`);
  }

  return {
    referral_code: result.code,
    message: `🎁 Your referral code: ${result.code}\n\nShare this with friends to earn rewards!`,
  };
}
