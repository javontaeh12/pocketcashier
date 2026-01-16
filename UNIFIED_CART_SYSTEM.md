# Unified Cart & Checkout System

## Overview

This document describes the complete unified cart and checkout system that allows customers to purchase shop products and book appointments together in a single Square payment transaction.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Backend Edge Functions](#backend-edge-functions)
4. [Frontend Components](#frontend-components)
5. [Payment Flow](#payment-flow)
6. [Integration Guide](#integration-guide)
7. [Testing Checklist](#testing-checklist)
8. [Security Features](#security-features)

---

## System Architecture

### High-Level Flow

```
Customer → Add Products/Services → Select Booking Time → Unified Cart →
Single Checkout → Square Payment → Confirm Order + Booking → Send Emails
```

### Key Features

- **Single Business Constraint**: Cart can only contain items from one business
- **Multi-Item Support**: Multiple products + one optional booking
- **Idempotent Payments**: Prevents duplicate charges on retry
- **Session-Based Carts**: Anonymous cart persistence via session tokens
- **Automatic Cleanup**: Cart expiration after 24 hours
- **Calendar Integration**: Auto-sync bookings to Google Calendar
- **Email Notifications**: Customer and business receipts

---

## Database Schema

### Tables Created

#### 1. `carts`
Master cart table tracking customer shopping sessions.

```sql
CREATE TABLE carts (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL,           -- Enforces single-business cart
  customer_id uuid,                    -- Links to auth.users if logged in
  customer_email text,                 -- Collected at checkout
  customer_name text,                  -- Collected at checkout
  customer_phone text,                 -- Optional
  session_token text UNIQUE,           -- For anonymous persistence
  status text,                         -- 'active', 'checked_out', 'abandoned'
  expires_at timestamptz,              -- Auto-abandon after 24h
  created_at timestamptz,
  updated_at timestamptz
);
```

**Key Constraints**:
- Session token is unique and auto-generated
- Status must be one of: active, checked_out, abandoned
- Expires after 24 hours

#### 2. `cart_items`
Products and services in the cart.

```sql
CREATE TABLE cart_items (
  id uuid PRIMARY KEY,
  cart_id uuid NOT NULL,
  item_type text NOT NULL,             -- 'product' or 'service'
  product_id uuid,                     -- If item_type='product'
  service_id uuid,                     -- If item_type='service'
  quantity integer NOT NULL,           -- For products (always 1 for services)
  unit_price_cents integer NOT NULL,   -- Snapshot at add time
  line_total_cents integer NOT NULL,   -- quantity * unit_price_cents
  title_snapshot text NOT NULL,        -- Product/service name
  metadata jsonb,                      -- Extra data like options
  created_at timestamptz
);
```

**Key Constraints**:
- Enforces product_id OR service_id based on item_type
- Prices stored in cents for precision
- Title snapshot prevents issues if product is renamed/deleted

#### 3. `cart_booking_details`
Optional booking slot (one per cart).

```sql
CREATE TABLE cart_booking_details (
  cart_id uuid PRIMARY KEY,            -- One-to-one with carts
  service_id uuid NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text NOT NULL,
  customer_name text,
  customer_phone text,
  notes text,
  status text NOT NULL,                -- 'draft', 'pending_payment', 'confirmed', 'cancelled'
  calendar_event_id text,              -- Google Calendar ID
  created_at timestamptz,
  updated_at timestamptz
);
```

**Key Constraints**:
- Primary key = cart_id (one booking per cart)
- Status transitions: draft → pending_payment → confirmed
- Calendar sync only after payment confirmation

#### 4. `checkout_sessions`
Payment session tracking for idempotency.

```sql
CREATE TABLE checkout_sessions (
  id uuid PRIMARY KEY,
  cart_id uuid NOT NULL UNIQUE,
  business_id uuid NOT NULL,
  square_location_id text NOT NULL,
  idempotency_key text UNIQUE,         -- Prevents duplicate charges
  amount_total_cents integer NOT NULL,
  currency text DEFAULT 'USD',
  square_payment_id text,              -- After payment success
  square_order_id text,
  status text NOT NULL,                -- 'pending', 'processing', 'paid', 'failed'
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  paid_at timestamptz
);
```

**Key Constraints**:
- One checkout session per cart
- Unique idempotency key per transaction
- Status tracks payment lifecycle

---

## Backend Edge Functions

### 1. `get-or-create-cart`

Creates or retrieves an active cart for a session.

**Request**:
```json
{
  "businessId": "uuid",
  "sessionToken": "optional-uuid"
}
```

**Response**:
```json
{
  "cart": { "id": "...", "business_id": "...", ... },
  "items": [ { "id": "...", "item_type": "product", ... } ],
  "booking": { "service_id": "...", "start_time": "...", ... } | null
}
```

### 2. `add-cart-item`

Adds a product or service to the cart.

**Request**:
```json
{
  "sessionToken": "uuid",
  "businessId": "uuid",
  "itemType": "product" | "service",
  "itemId": "product/service-uuid",
  "quantity": 1
}
```

**Business Rules**:
- Prevents mixing items from different businesses
- Updates quantity if item already in cart
- Snapshots price at time of add

### 3. `add-cart-booking`

Adds a booking time slot to the cart.

**Request**:
```json
{
  "sessionToken": "uuid",
  "businessId": "uuid",
  "serviceId": "uuid",
  "startTime": "2026-01-20T10:00:00Z",
  "endTime": "2026-01-20T11:00:00Z",
  "timezone": "America/New_York",
  "customerName": "optional",
  "customerPhone": "optional",
  "notes": "optional"
}
```

**Business Rules**:
- Only one booking per cart
- Updates existing booking if already present
- Validates service belongs to business

### 4. `remove-cart-item`

Removes an item from the cart.

**Request**:
```json
{
  "sessionToken": "uuid",
  "itemId": "uuid"
}
```

### 5. `update-cart-item`

Updates quantity of a cart item.

**Request**:
```json
{
  "sessionToken": "uuid",
  "itemId": "uuid",
  "quantity": 2
}
```

### 6. `clear-cart`

Clears all items and booking from cart.

**Request**:
```json
{
  "sessionToken": "uuid"
}
```

**Actions**:
- Deletes all cart items
- Deletes booking details
- Marks cart as abandoned
- Generates new session token

### 7. `create-unified-checkout`

Processes payment and creates order/booking records.

**Request**:
```json
{
  "sessionToken": "uuid",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "optional",
  "sourceId": "square-card-token"
}
```

**Process Flow**:
1. Validates cart exists and is active
2. Loads cart items and booking
3. Calculates total (items + booking + tax)
4. Creates checkout session with idempotency key
5. Calls Square Payments API
6. On success:
   - Creates shop_order record
   - Creates booking record with status=confirmed
   - Creates Google Calendar event
   - Marks cart as checked_out
   - Sends confirmation emails
7. On failure:
   - Marks checkout session as failed
   - Keeps cart active for retry

**Response**:
```json
{
  "success": true,
  "traceId": "uuid",
  "checkoutSessionId": "uuid",
  "squarePaymentId": "sq_...",
  "shopOrderId": "uuid",
  "bookingId": "uuid"
}
```

---

## Frontend Components

### 1. UnifiedCartContext

React context managing cart state.

**API**:
```typescript
const {
  businessId,              // Current business ID
  items,                   // Array of CartItem
  booking,                 // CartBooking | null
  subtotalCents,           // Number
  taxCents,                // Number
  totalCents,              // Number
  loading,                 // Boolean
  sessionToken,            // String
  setBusinessId,           // (id: string) => void
  addProduct,              // (id, name, price, qty) => Promise<void>
  addService,              // (id, name, price) => Promise<void>
  addBooking,              // (booking) => Promise<void>
  removeItem,              // (itemId) => Promise<void>
  updateQuantity,          // (itemId, qty) => Promise<void>
  clearCart,               // () => Promise<void>
  refreshCart,             // () => Promise<void>
} = useUnifiedCart();
```

**Features**:
- Session token stored in localStorage
- Cross-business protection with confirmation dialog
- Auto-refresh on business ID change
- Tax calculation at 8%

### 2. UnifiedCheckout Component

Checkout form with Square Web Payments SDK integration.

**Props**:
```typescript
interface UnifiedCheckoutProps {
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Features**:
- Displays products and booking summary
- Collects customer contact info
- Integrates Square card form
- Handles tokenization and payment
- Shows loading states and errors

### 3. UnifiedCartDisplay Component

Cart UI showing products and booking.

**Props**:
```typescript
interface UnifiedCartDisplayProps {
  onCheckout: () => void;
}
```

**Features**:
- Lists products with quantity controls
- Shows booking time and details
- Displays subtotal, tax, and total
- Remove item functionality
- Checkout button

---

## Payment Flow

### Complete Transaction Flow

```
1. Customer adds items to cart
   ↓
2. Customer clicks "Checkout"
   ↓
3. Customer enters contact info
   ↓
4. Square SDK tokenizes card
   ↓
5. Frontend calls create-unified-checkout with token
   ↓
6. Backend creates checkout_session (idempotency key)
   ↓
7. Backend calls Square Payments API
   ↓
8. On Square success:
   - Create shop_order (if products)
   - Create booking (if booking) with status=confirmed
   - Create calendar event
   - Send emails
   ↓
9. Frontend shows success, clears cart
```

### Idempotency Guarantees

**Idempotency Key Format**: `unified-{cart_id}-{timestamp}-{random}`

**Protection Against**:
- Duplicate payment if user refreshes page
- Concurrent checkout attempts
- Network retry scenarios
- Browser back button after payment

**How It Works**:
1. Each checkout attempt generates unique idempotency key
2. Square prevents duplicate charges with same key
3. Database unique constraint on idempotency_key
4. Checkout session tracks payment status
5. Booking/order creation checks for existing records

---

## Integration Guide

### Step 1: Add Items to Cart

```typescript
import { useUnifiedCart } from './contexts/UnifiedCartContext';

function ProductCard({ product }) {
  const { addProduct, setBusinessId } = useUnifiedCart();

  const handleAddToCart = async () => {
    setBusinessId(product.business_id);
    await addProduct(
      product.id,
      product.name,
      product.price_cents,
      1
    );
  };

  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  );
}
```

### Step 2: Add Booking

```typescript
function BookingForm() {
  const { addBooking, setBusinessId } = useUnifiedCart();

  const handleBooking = async (data) => {
    setBusinessId(businessId);
    await addBooking({
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: 'America/New_York',
      notes: data.notes,
    });
  };
}
```

### Step 3: Display Cart

```typescript
import { UnifiedCartDisplay } from './components/UnifiedCartDisplay';

function Page() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <UnifiedCartDisplay onCheckout={() => setShowCheckout(true)} />
      {showCheckout && (
        <UnifiedCheckout
          onSuccess={() => alert('Success!')}
          onCancel={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
```

---

## Testing Checklist

### Manual Testing

- [ ] **Add Products to Cart**
  - Product appears in cart
  - Quantity updates correctly
  - Price snapshot is correct

- [ ] **Add Booking to Cart**
  - Booking appears in cart
  - Time displays correctly
  - Only one booking allowed

- [ ] **Cross-Business Protection**
  - Adding item from different business shows warning
  - User can clear cart and continue
  - Business ID changes correctly

- [ ] **Checkout Flow**
  - All items display correctly
  - Tax calculated at 8%
  - Total is correct
  - Square form loads
  - Payment processes successfully

- [ ] **Post-Payment Confirmation**
  - Shop order created in database
  - Booking created with status=confirmed
  - Google Calendar event created
  - Customer email sent
  - Business email sent
  - Cart cleared after success

- [ ] **Idempotency**
  - Refresh page during payment doesn't duplicate charge
  - Retry after failure doesn't create duplicate orders
  - Same idempotency key rejected by Square

- [ ] **Error Handling**
  - Card declined shows error
  - Network error shows retry option
  - Invalid cart shows appropriate message

### Database Validation

```sql
-- Check cart was marked as checked_out
SELECT status FROM carts WHERE id = 'cart-id';

-- Verify checkout session shows payment
SELECT status, square_payment_id FROM checkout_sessions WHERE cart_id = 'cart-id';

-- Confirm shop order created
SELECT * FROM shop_orders WHERE square_payment_id = 'sq_...';

-- Confirm booking created
SELECT status, payment_status FROM bookings WHERE payment_id = 'sq_...';
```

---

## Security Features

### 1. Server-Side Only Operations

All cart and payment operations use edge functions with service role, preventing client-side manipulation.

### 2. RLS Policies

All cart tables use Row Level Security with service_role-only access:
- Clients cannot directly read/write carts
- Clients cannot modify checkout sessions
- All operations via authenticated edge functions

### 3. Price Snapshotting

Prices are captured at time of add-to-cart, preventing price manipulation by:
- Modifying product price before checkout
- Changing service pricing
- Race conditions during checkout

### 4. Business Isolation

Cart enforces single-business constraint:
- Database foreign key on business_id
- Frontend prevents cross-business mixing
- Backend validates all items belong to same business

### 5. Idempotency

Prevents duplicate charges via:
- Unique idempotency keys
- Square payment deduplication
- Database unique constraints
- Status tracking in checkout sessions

### 6. Session Tokens

Anonymous carts use secure session tokens:
- Generated server-side
- Stored in localStorage
- No PII in token
- Auto-expiration after 24h

---

## Troubleshooting

### Cart Not Loading

**Check**:
1. Session token exists in localStorage
2. Business ID is set correctly
3. Edge function logs for errors

### Payment Fails

**Check**:
1. Square application ID configured
2. Square location ID set on business
3. Square tokens are valid (production vs sandbox)
4. Network requests in browser DevTools

### Booking Not Confirmed

**Check**:
1. Booking status in database
2. Calendar integration enabled
3. Google OAuth tokens valid
4. Edge function logs for calendar API errors

### Emails Not Sending

**Check**:
1. Resend API key configured
2. Email templates exist
3. Customer email valid
4. Edge function logs for email errors

---

## Migration from Old System

### Old System

- **ShopCartContext**: Client-side cart for products only
- **Separate booking flow**: BookingForm with independent payment
- **Two checkout processes**: ShopCheckout + BookingForm payment
- **No unified receipts**: Separate emails for orders and bookings

### New System

- **UnifiedCartContext**: Server-backed cart for products + bookings
- **Unified checkout**: Single Square payment for all items
- **One checkout process**: UnifiedCheckout handles everything
- **Combined receipts**: Single email with all details

### Migration Steps

1. Replace `ShopCartProvider` with `UnifiedCartProvider` in App.tsx ✅
2. Update product add-to-cart buttons to use `useUnifiedCart().addProduct()`
3. Update booking form to use `useUnifiedCart().addBooking()`
4. Replace `ShopCheckout` with `UnifiedCheckout` component
5. Test complete flow end-to-end

---

## Performance Considerations

### Cart Operations

- Cart loads on demand (not on every page load)
- Session token cached in localStorage
- Edge functions use connection pooling

### Database Indexes

All critical queries are indexed:
- `carts(session_token)` for cart lookup
- `cart_items(cart_id)` for item listing
- `checkout_sessions(idempotency_key)` for deduplication
- `checkout_sessions(square_payment_id)` for webhook lookup

### Cleanup

Carts auto-expire after 24 hours:
- `expires_at` timestamp enforced in queries
- Consider running cleanup job to archive old carts
- Checkout sessions remain for audit trail

---

## API Reference

See individual edge function documentation in `supabase/functions/` for complete API details.

---

## Support

For issues or questions:
1. Check edge function logs in Supabase Dashboard
2. Verify database schema matches migration
3. Test Square integration in sandbox mode first
4. Review browser console for client-side errors

---

**Document Version**: 1.0
**Last Updated**: 2026-01-16
**Compatibility**: Supabase, Square Web Payments SDK v1, React 18+
