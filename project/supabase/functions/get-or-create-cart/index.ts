import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GetCartRequest {
  businessId: string;
  sessionToken?: string;
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

    const { businessId, sessionToken }: GetCartRequest = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "businessId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = sessionToken || crypto.randomUUID();

    let { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("*")
      .eq("session_token", token)
      .eq("business_id", businessId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({
          business_id: businessId,
          session_token: token,
          status: "active",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      cart = newCart;
    }

    const { data: items } = await supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id);

    const { data: booking } = await supabase
      .from("cart_booking_details")
      .select("*")
      .eq("cart_id", cart.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        cart,
        items: items || [],
        booking: booking || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
