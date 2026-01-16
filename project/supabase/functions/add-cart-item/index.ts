import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AddItemRequest {
  sessionToken: string;
  businessId: string;
  itemType: "product" | "service";
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

    const { sessionToken, businessId, itemType, itemId, quantity }: AddItemRequest = await req.json();

    if (!sessionToken || !businessId || !itemType || !itemId || !quantity) {
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
        JSON.stringify({ error: "Cannot mix items from different businesses. Please clear your cart first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let itemData;
    let unitPriceCents;
    let title;

    if (itemType === "product") {
      const { data: product } = await supabase
        .from("products")
        .select("name, price_cents")
        .eq("id", itemId)
        .eq("business_id", businessId)
        .eq("is_active", true)
        .maybeSingle();

      if (!product) {
        return new Response(
          JSON.stringify({ error: "Product not found or inactive" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      unitPriceCents = product.price_cents;
      title = product.name;
    } else {
      const { data: service } = await supabase
        .from("menu_items")
        .select("name, price")
        .eq("id", itemId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!service) {
        return new Response(
          JSON.stringify({ error: "Service not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      unitPriceCents = Math.round(service.price * 100);
      title = service.name;
    }

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("item_type", itemType)
      .eq(itemType === "product" ? "product_id" : "service_id", itemId)
      .maybeSingle();

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity: newQuantity,
          line_total_cents: newQuantity * unitPriceCents,
        })
        .eq("id", existingItem.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          cart_id: cart.id,
          item_type: itemType,
          product_id: itemType === "product" ? itemId : null,
          service_id: itemType === "service" ? itemId : null,
          quantity,
          unit_price_cents: unitPriceCents,
          line_total_cents: quantity * unitPriceCents,
          title_snapshot: title,
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
