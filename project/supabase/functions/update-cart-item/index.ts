import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateItemRequest {
  sessionToken: string;
  itemId: string;
  quantity: number;
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

    const { sessionToken, itemId, quantity }: UpdateItemRequest = await req.json();

    if (!sessionToken || !itemId || quantity === undefined) {
      return new Response(
        JSON.stringify({ error: "sessionToken, itemId, and quantity are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (quantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Quantity must be greater than 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("session_token", sessionToken)
      .eq("status", "active")
      .maybeSingle();

    if (!cart) {
      return new Response(
        JSON.stringify({ error: "Cart not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: item } = await supabase
      .from("cart_items")
      .select("unit_price_cents")
      .eq("cart_id", cart.id)
      .eq("id", itemId)
      .maybeSingle();

    if (!item) {
      return new Response(
        JSON.stringify({ error: "Item not found in cart" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity,
        line_total_cents: quantity * item.unit_price_cents,
      })
      .eq("id", itemId);

    if (updateError) throw updateError;

    await supabase
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cart.id);

    return new Response(
      JSON.stringify({ success: true }),
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
