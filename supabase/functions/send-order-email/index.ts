import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { orderId, customerEmail, customerName, businessId, items } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("admin_email")
      .eq("business_id", businessId)
      .maybeSingle();

    const adminEmail = settings?.admin_email;

    const itemsHtml = items.map((item: any) => `<li>${item.name} \u00d7 ${item.quantity}</li>`).join("");

    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1 style="color: #2d3748; margin-bottom: 20px;">Thank you for your order, ${customerName}!</h1>
        <p style="font-size: 16px; margin-bottom: 15px;">Your order #${orderId.slice(0, 8)} has been received and is being prepared.</p>
        <h3 style="color: #2d3748; margin-top: 20px; margin-bottom: 10px;">Order Details:</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${itemsHtml}
        </ul>
        <p style="font-size: 16px; margin-top: 20px; color: #666;">You will receive another email when your order is ready for pickup.</p>
        <p style="font-size: 14px; color: #999; margin-top: 30px;">Thank you for your business!</p>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1 style="color: #2d3748; margin-bottom: 20px;">New Order Received!</h1>
        <p style="font-size: 16px; margin-bottom: 15px;"><strong>Order ID:</strong> ${orderId.slice(0, 8)}</p>
        <p style="font-size: 16px; margin-bottom: 15px;"><strong>Customer:</strong> ${customerName}</p>
        <p style="font-size: 16px; margin-bottom: 15px;"><strong>Email:</strong> ${customerEmail}</p>
        <h3 style="color: #2d3748; margin-top: 20px; margin-bottom: 10px;">Items Ordered:</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${itemsHtml}
        </ul>
      </div>
    `;

    const emails = [
      { to: customerEmail, subject: "Order Confirmation", html: customerEmailHtml },
      ...(adminEmail ? [{ to: adminEmail, subject: "New Order Received", html: adminEmailHtml }] : [])
    ];

    for (const email of emails) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "orders@pocketcashiermobile.com",
          to: [email.to],
          subject: email.subject,
          html: email.html,
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error("Resend API error:", error);
        throw new Error(`Failed to send email: ${error}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});