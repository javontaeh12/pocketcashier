import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AddBookingRequest {
  sessionToken: string;
  businessId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      sessionToken,
      businessId,
      serviceId,
      startTime,
      endTime,
      timezone,
      customerName,
      customerPhone,
      notes,
    }: AddBookingRequest = await req.json();

    if (!sessionToken || !businessId || !serviceId || !startTime || !endTime || !timezone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let { data: cart } = await supabase
      .from("carts")
      .select("id, business_id")
      .eq("session_token", sessionToken)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({
          business_id: businessId,
          session_token: sessionToken,
          status: "active",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      cart = newCart;
    }

    if (cart.business_id !== businessId) {
      return new Response(
        JSON.stringify({ error: "Cannot mix bookings from different businesses. Please clear your cart first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: service } = await supabase
      .from("menu_items")
      .select("id, name")
      .eq("id", serviceId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (!service) {
      return new Response(
        JSON.stringify({ error: "Service not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingBooking } = await supabase
      .from("cart_booking_details")
      .select("cart_id")
      .eq("cart_id", cart.id)
      .maybeSingle();

    if (existingBooking) {
      const { error: updateError } = await supabase
        .from("cart_booking_details")
        .update({
          service_id: serviceId,
          start_time: startTime,
          end_time: endTime,
          timezone,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          notes: notes || null,
          status: "draft",
        })
        .eq("cart_id", cart.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("cart_booking_details")
        .insert({
          cart_id: cart.id,
          service_id: serviceId,
          start_time: startTime,
          end_time: endTime,
          timezone,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          notes: notes || null,
          status: "draft",
        });

      if (insertError) throw insertError;
    }

    await supabase
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    return new Response(
      JSON.stringify({ success: true, cartId: cart.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
