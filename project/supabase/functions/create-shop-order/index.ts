import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface CreateOrderRequest {
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  idempotencyKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { businessId, customerName, customerEmail, customerPhone, items, subtotalCents, taxCents, totalCents, idempotencyKey }: CreateOrderRequest = await req.json();

    if (!businessId || !customerEmail || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const response = await fetch(`${supabaseUrl}/rest/v1/shop_orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        business_id: businessId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        status: "draft",
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        shipping_cents: 0,
        total_cents: totalCents,
        idempotency_key: idempotencyKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create order: ${error}`);
    }

    const [orderData] = await response.json();
    const orderId = orderData.id;

    for (const item of items) {
      const itemResponse = await fetch(`${supabaseUrl}/rest/v1/shop_order_items`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          product_id: item.productId,
          product_name: item.productName,
          unit_price_cents: item.unitPrice,
          quantity: item.quantity,
          line_total_cents: item.lineTotal,
        }),
      });

      if (!itemResponse.ok) {
        throw new Error("Failed to create order item");
      }
    }

    return new Response(
      JSON.stringify({ orderId, status: "draft" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
