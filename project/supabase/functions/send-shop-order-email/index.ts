import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  orderId: string;
  businessId: string;
  squarePaymentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { orderId, businessId, squarePaymentId }: SendEmailRequest = await req.json();

    if (!orderId || !businessId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/shop_orders?id=eq.${orderId}`,
      {
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const [order] = await orderResponse.json() as Array<Record<string, unknown>>;

    if (!order) {
      throw new Error("Order not found");
    }

    const itemsResponse = await fetch(
      `${supabaseUrl}/rest/v1/shop_order_items?order_id=eq.${orderId}`,
      {
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const items = await itemsResponse.json() as Array<Record<string, unknown>>;

    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/shop_settings?business_id=eq.${businessId}`,
      {
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const [settings] = await settingsResponse.json() as Array<Record<string, unknown>>;

    const itemsHtml = items
      .map(
        (item) =>
          `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${item.product_name}</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">x${item.quantity}</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${((item.unit_price_cents as number) / 100).toFixed(2)}</td></tr>`
      )
      .join("");

    const subtotalDollars = ((order.subtotal_cents as number) / 100).toFixed(2);
    const taxDollars = ((order.tax_cents as number) / 100).toFixed(2);
    const totalDollars = ((order.total_cents as number) / 100).toFixed(2);

    const orderPrefix = (settings?.order_prefix as string) || "ORD-";
    const displayOrderId = `${orderPrefix}${orderId.substring(0, 8).toUpperCase()}`;

    const customerEmail = order.customer_email as string;
    const customerName = (order.customer_name as string) || "Valued Customer";

    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Order Confirmation</h1>
        <p>Thank you for your order, ${customerName}!</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${displayOrderId}</p>
          <p><strong>Order Date:</strong> ${new Date(order.created_at as string).toLocaleDateString()}</p>
        </div>

        <h2 style="color: #333; margin-top: 20px;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          </tr>
          ${itemsHtml}
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: right;">
          <p style="margin: 5px 0;"><strong>Subtotal:</strong> $${subtotalDollars}</p>
          <p style="margin: 5px 0;"><strong>Tax:</strong> $${taxDollars}</p>
          <p style="margin: 10px 0; font-size: 18px; color: #007bff;"><strong>Total:</strong> $${totalDollars}</p>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 12px;">Payment ID: ${squarePaymentId}</p>
        <p style="color: #999; font-size: 11px; margin-top: 20px;">Thank you for your business!</p>
      </div>
    `;

    const resendKey = Deno.env.get("RESEND_API_KEY");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "orders@pocketcashiermobile.com",
        to: customerEmail,
        subject: `Order Confirmation - ${displayOrderId}`,
        html: customerEmailHtml,
      }),
    }).catch((err) => {
      console.error("Failed to send customer email:", err);
    });

    const adminEmail = settings?.notification_email as string;
    if (adminEmail) {
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Shop Order</h1>
          <p>You have received a new order!</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${displayOrderId}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at as string).toLocaleDateString()}</p>
          </div>

          <h2 style="color: #333; margin-top: 20px;">Order Items</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background-color: #f0f0f0;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
            ${itemsHtml}
          </table>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: right;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> $${subtotalDollars}</p>
            <p style="margin: 5px 0;"><strong>Tax:</strong> $${taxDollars}</p>
            <p style="margin: 10px 0; font-size: 18px; color: #007bff;"><strong>Total:</strong> $${totalDollars}</p>
          </div>

          <p style="margin-top: 20px;"><a href="https://pocketcashiermobile.com" style="color: #007bff;">View in Admin Portal</a></p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "orders@pocketcashiermobile.com",
          to: adminEmail,
          subject: `New Shop Order - ${displayOrderId}`,
          html: adminEmailHtml,
        }),
      }).catch((err) => {
        console.error("Failed to send admin email:", err);
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
