import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { SquareClient } from "../_shared/square-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessPaymentRequest {
  businessId: string;
  orderId: string;
  totalCents: number;
  sourceId: string;
  buyerEmail: string;
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
    const { businessId, orderId, totalCents, sourceId, buyerEmail, idempotencyKey }: ProcessPaymentRequest = await req.json();

    if (!businessId || !orderId || !totalCents || !sourceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, square_location_id")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business?.square_location_id) {
      throw new Error("Business Square configuration incomplete");
    }

    const squareClient = new SquareClient();

    const paymentPayload = {
      source_id: sourceId,
      amount_money: {
        amount: totalCents,
        currency: "USD",
      },
      location_id: business.square_location_id,
      idempotency_key: idempotencyKey,
      reference_id: orderId,
      note: `Shop Order ${orderId}`,
    };

    console.log("Processing Square payment for shop order:", orderId);

    const { data: squarePayment, error: squareError } = await squareClient.createPayment(paymentPayload);

    if (squareError || !squarePayment) {
      console.error("Square payment error:", squareError);
      throw new Error(`Payment processing failed: ${squareError}`);
    }

    const squarePaymentId = (squarePayment as any).payment?.id;
    const paymentStatus = (squarePayment as any).payment?.status === "COMPLETED" ? "completed" : "pending";

    const { error: updateError } = await supabase
      .from("shop_orders")
      .update({
        status: paymentStatus === "completed" ? "paid" : "pending",
        square_payment_id: squarePaymentId,
        paid_at: paymentStatus === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    await fetch(`${supabaseUrl}/functions/v1/send-shop-order-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        businessId,
        squarePaymentId,
      }),
    }).catch((err) => {
      console.error("Failed to send email notification:", err);
    });

    return new Response(
      JSON.stringify({ success: true, squarePaymentId, status: paymentStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Payment processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
