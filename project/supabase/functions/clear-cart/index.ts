import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClearCartRequest {
  sessionToken: string;
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

    const { sessionToken }: ClearCartRequest = await req.json();

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: "sessionToken is required" }),
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
        JSON.stringify({ success: true, message: "No active cart found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    await supabase
      .from("cart_booking_details")
      .delete()
      .eq("cart_id", cart.id);

    await supabase
      .from("carts")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
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
