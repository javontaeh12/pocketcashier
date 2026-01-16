import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { SquareClient } from "../_shared/square-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuthPayload {
  orderId: string;
  sourceId: string;
  amount: number;
  bookingId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AuthPayload = await req.json();
    const { orderId, sourceId, amount } = payload;

    if (!orderId || !sourceId || !amount) {
      throw new Error("orderId, sourceId, and amount are required");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id, customer_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, square_location_id")
      .eq("id", order.business_id)
      .maybeSingle();

    if (businessError || !business?.square_location_id) {
      throw new Error("Business Square configuration incomplete");
    }

    const squareClient = new SquareClient();

    const paymentPayload = {
      source_id: sourceId,
      amount_money: {
        amount: Math.round(amount * 100),
        currency: "USD",
      },
      location_id: business.square_location_id,
      idempotency_key: `${orderId}-${Date.now()}`,
      reference_id: orderId,
    };

    console.log("Processing Square payment for order:", orderId);

    const { data: squarePayment, error: squareError } = await squareClient.createPayment(paymentPayload);

    if (squareError || !squarePayment) {
      console.error("Square payment error:", squareError);
      throw new Error(`Payment processing failed: ${squareError}`);
    }

    const paymentId = (squarePayment as any).payment?.id;
    const paymentStatus = (squarePayment as any).payment?.status === "COMPLETED" ? "completed" : "pending";

    const { error: paymentInsertError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        business_id: order.business_id,
        square_payment_id: paymentId,
        amount: amount,
        status: paymentStatus,
        payment_method: "card",
      });

    if (paymentInsertError) {
      throw paymentInsertError;
    }

    if (paymentStatus === "completed") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_status: "completed", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("name, email")
        .eq("id", order.customer_id)
        .maybeSingle();

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("item_name, quantity, price_at_order")
        .eq("order_id", orderId);

      if (customer && orderItems) {
        const receiptUrl = `${supabaseUrl}/functions/v1/send-payment-receipt`;
        await fetch(receiptUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderId,
            customerEmail: customer.email,
            customerName: customer.name,
            businessId: order.business_id,
            items: orderItems.map((item: any) => ({
              name: item.item_name,
              quantity: item.quantity,
              price: item.price_at_order,
            })),
            amount: amount,
            paymentId: paymentId,
          }),
        }).catch(err => console.error("Failed to send receipt:", err));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentId,
        status: paymentStatus,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
