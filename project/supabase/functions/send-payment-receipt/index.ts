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
    const { orderId, customerEmail, customerName, businessId, items, amount, paymentId } = await req.json();

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

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join("");

    const orderNumber = orderId.slice(0, 8);
    const receiptHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2d3748; margin: 0 0 10px 0; font-size: 24px;">Payment Receipt</h1>
          <p style="color: #666; margin: 0; font-size: 14px;">Order #${orderNumber}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; color: #666;"><strong>Thank you, ${customerName}!</strong></p>
          <p style="margin: 0; color: #666; font-size: 14px;">Your payment has been received successfully.</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: bold;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #2d3748;">
            <span>Total Paid:</span>
            <span>$${amount.toFixed(2)}</span>
          </div>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Transaction ID: ${paymentId}</p>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 20px;">
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Your order is being prepared and will be ready for pickup soon. You will receive another notification when it is ready.</p>
          <p style="color: #999; font-size: 12px; margin: 0;">Thank you for your business!</p>
        </div>
      </div>
    `;

    const adminEmail = settings?.admin_email;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #2d3748; margin: 0 0 10px 0; font-size: 24px;">Payment Received</h1>
          <p style="color: #666; margin: 0; font-size: 14px;">Order #${orderNumber}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0; color: #666;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 0; color: #666;"><strong>Email:</strong> ${customerEmail}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: bold;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #155724;">
            <span>Amount Paid:</span>
            <span>$${amount.toFixed(2)}</span>
          </div>
          <p style="margin: 10px 0 0 0; color: #155724; font-size: 12px;">Transaction ID: ${paymentId}</p>
        </div>
      </div>
    `;

    const emails = [
      { to: customerEmail, subject: `Payment Receipt - Order #${orderNumber}`, html: receiptHtml },
      ...(adminEmail ? [{ to: adminEmail, subject: `Payment Received - Order #${orderNumber}`, html: adminEmailHtml }] : [])
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "An error occurred" }),
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
