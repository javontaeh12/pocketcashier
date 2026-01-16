# Square Developer Token - Code Examples

## Frontend: Process a Payment

### Example 1: Basic Payment (Checkout)

```typescript
// In CheckoutPage or similar component

const processPayment = async (sourceId: string, amount: number) => {
  try {
    // Call edge function with order data
    const { data, error } = await supabase.functions.invoke(
      'process-square-payment',
      {
        body: {
          orderId: currentOrder.id,
          sourceId,  // From Square Web Payments SDK tokenization
          amount,    // In dollars (e.g., 19.99)
        },
      }
    );

    if (error) {
      throw new Error(error.message || 'Payment failed');
    }

    // Success!
    console.log('Payment successful:', data.paymentId);
    showSuccessMessage();

  } catch (err) {
    console.error('Payment error:', err);
    showErrorMessage(err.message);
  }
};
```

### Example 2: Booking Payment

```typescript
// In BookingForm or BookingCalendarModal

const processBookingPayment = async (
  businessId: string,
  amount: number,
  customerEmail: string
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Create order first (or use existing)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      business_id: businessId,
      customer_id: customer.id,
      total_amount: amount,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Tokenize card (from Square Web Payments SDK)
  const { token, error: tokenError } = await payments.card().tokenize();
  if (tokenError) throw tokenError;

  // Process payment via edge function
  const { data: result, error } = await supabase.functions.invoke(
    'process-square-payment',
    {
      body: {
        orderId: order.id,
        sourceId: token.token,
        amount,
      },
    }
  );

  if (error) throw new Error(error.message);

  // Create booking after payment
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      business_id: businessId,
      customer_id: customer.id,
      start_time: selectedDateTime,
      payment_status: 'paid',
      payment_id: result.paymentId,
    })
    .select()
    .single();

  return booking;
};
```

---

## Edge Function: Process Payment

### Full Implementation Example

```typescript
// supabase/functions/process-square-payment/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { SquareClient } from "../_shared/square-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: Missing auth header");
    }

    // 2. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // 3. Parse request
    const { orderId, sourceId, amount } = await req.json();
    if (!orderId || !sourceId || !amount) {
      throw new Error("Missing: orderId, sourceId, or amount");
    }

    // 4. Verify order exists and get details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, business_id, customer_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // 5. Get business location (must be configured)
    const { data: business } = await supabase
      .from("businesses")
      .select("square_location_id")
      .eq("id", order.business_id)
      .maybeSingle();

    if (!business?.square_location_id) {
      throw new Error("Business Square location not configured");
    }

    // 6. Initialize Square client (reads SQUARE_ACCESS_TOKEN from env)
    const squareClient = new SquareClient();

    // 7. Process payment with developer token
    const { data: squarePayment, error: squareError } =
      await squareClient.createPayment({
        source_id: sourceId,
        amount_money: {
          amount: Math.round(amount * 100),  // Convert to cents
          currency: "USD",
        },
        location_id: business.square_location_id,
        idempotency_key: `${orderId}-${Date.now()}`,
        reference_id: orderId,
      });

    if (squareError || !squarePayment) {
      console.error("Square error:", squareError);
      throw new Error(`Square API failed: ${squareError}`);
    }

    // 8. Record payment in database
    const paymentId = (squarePayment as any).payment?.id;
    const { error: dbError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        business_id: order.business_id,
        square_payment_id: paymentId,
        amount,
        status: "completed",
        payment_method: "card",
      });

    if (dbError) throw dbError;

    // 9. Update order status
    await supabase
      .from("orders")
      .update({
        payment_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // 10. Send receipt email (async, don't await)
    supabase.functions.invoke('send-payment-receipt', {
      body: { orderId, paymentId },
    }).catch(err => console.error("Receipt failed:", err));

    // 11. Return success
    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        status: "completed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

## Shared SquareClient: API Reference

### Initialization

```typescript
import { SquareClient } from "../_shared/square-client.ts";

const client = new SquareClient();
// Automatically reads:
// - SQUARE_ACCESS_TOKEN from Deno.env
// - SQUARE_ENV from Deno.env (defaults to "production")
```

### Create Payment

```typescript
const { data, error } = await client.createPayment({
  source_id: "cnp_...",           // Tokenized card from SDK
  amount_money: {
    amount: 2999,                 // Amount in cents
    currency: "USD",
  },
  location_id: "L...",            // Square location
  idempotency_key: "order-123",   // Prevent duplicates
  reference_id: "order-123",      // Optional: custom reference
  customer_id: "CUST_...",        // Optional: Square customer
  note: "Order #123",             // Optional: internal note
});

if (error) {
  console.error("Payment failed:", error);
} else {
  const paymentId = data.payment.id;
  console.log("Payment successful:", paymentId);
}
```

### List Payments

```typescript
const { data, error } = await client.listPayments(
  "2025-01-01T00:00:00Z",  // Begin time (optional)
  "2025-01-31T23:59:59Z",  // End time (optional)
  "DESC",                   // Sort order: ASC or DESC
  cursor                    // Pagination cursor (optional)
);

if (data) {
  console.log("Payments:", data.result);
  console.log("Cursor:", data.cursor); // For pagination
}
```

### Create Customer

```typescript
const { data, error } = await client.createCustomer({
  given_name: "John",
  family_name: "Doe",
  email_address: "john@example.com",
  phone_number: "+1-555-0100",
  address: {
    address_line_1: "123 Main St",
    locality: "San Francisco",
    administrative_district_level_1: "CA",
    postal_code: "94102",
    country: "US",
  },
  note: "VIP customer",
});

if (data) {
  const customerId = data.customer.id;
  console.log("Customer created:", customerId);
}
```

### Retrieve Payment

```typescript
const { data, error } = await client.retrievePayment("payment-id");

if (data) {
  console.log("Payment amount:", data.payment.amount_money);
  console.log("Payment status:", data.payment.status);
}
```

---

## Database: Recording Payments

### Insert Payment Record

```typescript
const { data, error } = await supabase
  .from("payments")
  .insert({
    order_id: "order-123",
    business_id: "business-456",
    square_payment_id: "payment-789",  // From Square API
    amount: 19.99,
    status: "completed",  // completed, pending, failed
    payment_method: "card",  // card, apple_pay, cash_app, etc.
  })
  .select()
  .single();
```

### Query Payments for Business

```typescript
const { data: payments } = await supabase
  .from("payments")
  .select("*")
  .eq("business_id", businessId)
  .eq("status", "completed")
  .order("created_at", { ascending: false })
  .limit(10);

// Calculate revenue
const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
```

---

## Error Handling Patterns

### Catch and Retry

```typescript
async function processPaymentWithRetry(
  orderId: string,
  sourceId: string,
  amount: number,
  retries = 3
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'process-square-payment',
        {
          body: { orderId, sourceId, amount },
        }
      );

      if (error) throw new Error(error.message);
      return data;

    } catch (err) {
      console.error(`Attempt ${attempt + 1} failed:`, err);

      if (attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      } else {
        throw err;
      }
    }
  }
}
```

### User-Friendly Error Messages

```typescript
function getErrorMessage(error: Error): string {
  const msg = error.message;

  if (msg.includes("location")) {
    return "Please configure your Square Location ID in settings";
  }
  if (msg.includes("token")) {
    return "Payment system temporarily unavailable";
  }
  if (msg.includes("insufficient")) {
    return "Card declined - insufficient funds";
  }
  if (msg.includes("invalid")) {
    return "Card information invalid";
  }

  return "Payment processing failed. Please try again.";
}
```

---

## Testing Scenarios

### Test Card Numbers

```
Successful: 4532 0156 4006 6335
Declined:   5105 1051 0510 5100
Card error: 5555 5555 5555 4444
```

Use with any future expiration and any 3-digit CVC.

### Test Function Locally

```bash
# Watch logs
supabase functions logs process-square-payment

# Call manually
curl -X POST http://localhost:54321/functions/v1/process-square-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "sourceId": "cnp_test",
    "amount": 19.99
  }'
```

---

## Security Checklist

### Code Review Points

- [ ] SquareClient never logs token values
- [ ] Authorization header checked before processing
- [ ] Order ownership verified (business_id match)
- [ ] Amount validated (positive, reasonable range)
- [ ] Location ID exists before API call
- [ ] Errors sanitized (no token in error messages)
- [ ] CORS headers set correctly
- [ ] Idempotency key prevents duplicate charges

### Deployment Checklist

- [ ] `SQUARE_ACCESS_TOKEN` secret set in Supabase
- [ ] `SQUARE_ENV` matches token environment
- [ ] Edge function deployed successfully
- [ ] Database migration applied
- [ ] Test payment succeeds
- [ ] Error handling works (test with bad card)
- [ ] Logs clean (no secrets visible)

