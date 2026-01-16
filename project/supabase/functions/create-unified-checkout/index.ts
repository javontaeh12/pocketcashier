import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { SquareClient } from "../_shared/square-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateCheckoutRequest {
  sessionToken: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sourceId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const traceId = crypto.randomUUID();
  console.log('[UNIFIED_CHECKOUT_START]', { trace_id: traceId, timestamp: new Date().toISOString() });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionToken, customerName, customerEmail, customerPhone, sourceId }: CreateCheckoutRequest = await req.json();

    if (!sessionToken || !customerName || !customerEmail || !sourceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id, business_id, status")
      .eq("session_token", sessionToken)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cartError || !cart) {
      return new Response(
        JSON.stringify({ error: "Cart not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    if (!items || items.length === 0) {
      if (!booking) {
        return new Response(
          JSON.stringify({ error: "Cart is empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, square_location_id")
      .eq("id", cart.business_id)
      .maybeSingle();

    if (!business || !business.square_location_id) {
      return new Response(
        JSON.stringify({ error: "Business payment configuration incomplete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCents = 0;
    if (items && items.length > 0) {
      totalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
    }

    if (booking) {
      const { data: service } = await supabase
        .from("menu_items")
        .select("price")
        .eq("id", booking.service_id)
        .maybeSingle();

      if (service) {
        totalCents += Math.round(service.price * 100);
      }
    }

    const taxCents = Math.round(totalCents * 0.08);
    const grandTotalCents = totalCents + taxCents;

    const idempotencyKey = `unified-${cart.id}-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

    const { data: existingSession } = await supabase
      .from("checkout_sessions")
      .select("id, status, square_payment_id")
      .eq("cart_id", cart.id)
      .eq("status", "paid")
      .maybeSingle();

    if (existingSession) {
      return new Response(
        JSON.stringify({
          error: "This cart has already been checked out",
          paymentId: existingSession.square_payment_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: checkoutSession, error: sessionError } = await supabase
      .from("checkout_sessions")
      .insert({
        cart_id: cart.id,
        business_id: cart.business_id,
        square_location_id: business.square_location_id,
        idempotency_key: idempotencyKey,
        amount_total_cents: grandTotalCents,
        currency: "USD",
        status: "processing",
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[UNIFIED_CHECKOUT_SESSION_ERROR]', { trace_id: traceId, error: sessionError });
      throw new Error("Failed to create checkout session");
    }

    console.log('[UNIFIED_CHECKOUT_PROCESSING_PAYMENT]', {
      trace_id: traceId,
      session_id: checkoutSession.id,
      amount_cents: grandTotalCents,
    });

    const squareClient = new SquareClient();

    const paymentPayload = {
      source_id: sourceId,
      amount_money: {
        amount: grandTotalCents,
        currency: "USD",
      },
      location_id: business.square_location_id,
      idempotency_key: idempotencyKey,
      reference_id: checkoutSession.id,
      note: `Unified checkout - Cart ${cart.id}`,
      buyer_email_address: customerEmail,
    };

    const { data: squarePayment, error: squareError } = await squareClient.createPayment(paymentPayload);

    if (squareError || !squarePayment) {
      console.error('[UNIFIED_CHECKOUT_SQUARE_ERROR]', { trace_id: traceId, error: squareError });

      await supabase
        .from("checkout_sessions")
        .update({
          status: "failed",
          error_message: squareError || "Payment processing failed",
        })
        .eq("id", checkoutSession.id);

      return new Response(
        JSON.stringify({ error: `Payment failed: ${squareError}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const squarePaymentId = (squarePayment as any).payment?.id;
    const paymentStatus = (squarePayment as any).payment?.status;

    console.log('[UNIFIED_CHECKOUT_SQUARE_SUCCESS]', {
      trace_id: traceId,
      square_payment_id: squarePaymentId,
      status: paymentStatus,
    });

    await supabase
      .from("checkout_sessions")
      .update({
        square_payment_id: squarePaymentId,
        status: paymentStatus === "COMPLETED" ? "paid" : "pending",
        paid_at: paymentStatus === "COMPLETED" ? new Date().toISOString() : null,
      })
      .eq("id", checkoutSession.id);

    await supabase
      .from("carts")
      .update({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        status: "checked_out",
      })
      .eq("id", cart.id);

    let shopOrderId = null;
    if (items && items.length > 0) {
      console.log('[UNIFIED_CHECKOUT_CREATING_SHOP_ORDER]', { trace_id: traceId });

      const { data: shopOrder, error: shopOrderError } = await supabase
        .from("shop_orders")
        .insert({
          business_id: cart.business_id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          status: "paid",
          subtotal_cents: totalCents - (booking ? Math.round((await supabase.from("menu_items").select("price").eq("id", booking.service_id).maybeSingle()).data?.price * 100 || 0) : 0),
          tax_cents: taxCents,
          total_cents: grandTotalCents,
          square_payment_id: squarePaymentId,
          idempotency_key: idempotencyKey,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!shopOrderError && shopOrder) {
        shopOrderId = shopOrder.id;

        for (const item of items.filter(i => i.item_type === 'product')) {
          await supabase
            .from("shop_order_items")
            .insert({
              order_id: shopOrder.id,
              product_id: item.product_id,
              product_name: item.title_snapshot,
              unit_price_cents: item.unit_price_cents,
              quantity: item.quantity,
              line_total_cents: item.line_total_cents,
            });
        }

        console.log('[UNIFIED_CHECKOUT_SHOP_ORDER_CREATED]', {
          trace_id: traceId,
          shop_order_id: shopOrder.id,
        });
      }
    }

    let bookingId = null;
    if (booking) {
      console.log('[UNIFIED_CHECKOUT_CREATING_BOOKING]', { trace_id: traceId });

      const { data: service } = await supabase
        .from("menu_items")
        .select("name, price")
        .eq("id", booking.service_id)
        .maybeSingle();

      const { data: bookingRecord, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          business_id: cart.business_id,
          customer_name: booking.customer_name || customerName,
          customer_email: customerEmail,
          customer_phone: booking.customer_phone || customerPhone || null,
          booking_date: booking.start_time,
          duration_minutes: Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000),
          status: "confirmed",
          service_type: service?.name || "Service",
          notes: booking.notes || null,
          menu_item_id: booking.service_id,
          payment_amount: service?.price || 0,
          payment_status: "paid",
          payment_id: squarePaymentId,
          business_timezone: booking.timezone,
          trace_id: traceId,
          idempotency_key: `${idempotencyKey}-booking`,
          calendar_sync_status: "pending",
        })
        .select()
        .single();

      if (!bookingError && bookingRecord) {
        bookingId = bookingRecord.id;

        await supabase
          .from("cart_booking_details")
          .update({ status: "confirmed" })
          .eq("cart_id", cart.id);

        console.log('[UNIFIED_CHECKOUT_BOOKING_CREATED]', {
          trace_id: traceId,
          booking_id: bookingRecord.id,
        });

        try {
          const calendarResponse = await fetch(`${supabaseUrl}/functions/v1/create-google-calendar-event`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              business_id: cart.business_id,
              booking_id: bookingRecord.id,
              customer_name: booking.customer_name || customerName,
              customer_email: customerEmail,
              customer_phone: booking.customer_phone || customerPhone,
              service_type: service?.name || "Service",
              booking_datetime: booking.start_time,
              duration_minutes: Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000),
              notes: booking.notes,
            }),
          });

          const calendarResult = await calendarResponse.json();
          if (calendarResult.calendar_event_id) {
            await supabase
              .from("bookings")
              .update({
                calendar_event_id: calendarResult.calendar_event_id,
                calendar_sync_status: "synced",
              })
              .eq("id", bookingRecord.id);
          }
        } catch (calError) {
          console.error('[UNIFIED_CHECKOUT_CALENDAR_ERROR]', { trace_id: traceId, error: calError });
        }
      }
    }

    console.log('[UNIFIED_CHECKOUT_SENDING_NOTIFICATIONS]', { trace_id: traceId });

    if (shopOrderId) {
      fetch(`${supabaseUrl}/functions/v1/send-shop-order-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: shopOrderId,
          businessId: cart.business_id,
          squarePaymentId,
        }),
      }).catch(err => console.error("Failed to send shop order email:", err));
    }

    if (bookingId) {
      fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          sendToCustomer: true,
          sendToAdmin: true,
        }),
      }).catch(err => console.error("Failed to send booking confirmation:", err));
    }

    console.log('[UNIFIED_CHECKOUT_COMPLETE]', {
      trace_id: traceId,
      session_id: checkoutSession.id,
      shop_order_id: shopOrderId,
      booking_id: bookingId,
      square_payment_id: squarePaymentId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        traceId,
        checkoutSessionId: checkoutSession.id,
        squarePaymentId,
        shopOrderId,
        bookingId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('[UNIFIED_CHECKOUT_ERROR]', { trace_id: traceId, error: err });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Checkout failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
