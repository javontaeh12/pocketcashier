# Square Developer Token Setup Guide

## Overview

This application now uses a secure **single developer access token** model instead of per-user OAuth tokens. All Square API requests are processed server-side in Supabase Edge Functions using credentials stored in environment secrets.

### Security Model

- **No per-user tokens**: Each merchant no longer stores their own Square access/refresh tokens in the database
- **Centralized credentials**: The developer access token is stored in Supabase secrets, not in the database
- **Server-side only**: All Square API calls are made from Edge Functions, never from the client
- **Data isolation**: Business-level row security ensures users only access their own resources
- **Token safety**: Frontend never sees or sends any Square credentials

---

## Prerequisites

1. A Supabase project with active Edge Functions support
2. A Square Developer account with API credentials
3. Square Location IDs for each business

---

## Setup Steps

### Step 1: Get Your Square Developer Credentials

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select or create your application
3. Navigate to **Credentials** tab
4. Choose your environment (Sandbox or Production)
5. Copy your **Access Token** (looks like `sq0atp_...`)
6. Copy your **Application ID** (looks like `sq0idb_...`)

### Step 2: Verify Your Square Location ID

1. In your Square Dashboard, go to **Settings → Locations**
2. Select your primary location
3. Copy the **Location ID** (looks like `L...`)
4. Each business in the app will need its own location ID

### Step 3: Deploy Edge Functions

The following edge functions have been updated to use the developer token model:

- `process-square-payment` - Processes card payments
- `_shared/square-client.ts` - Shared Square API client (used by all functions)

These are already deployed. Verify by running:

```bash
supabase functions list
```

### Step 4: Set Environment Secrets

**Important**: Secrets are managed through Supabase dashboard or CLI. Set these in your Supabase project:

```bash
# Via CLI (recommended for automated deployment)
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_your_token_here"
supabase secrets set SQUARE_ENV="production"  # or "sandbox"
```

**Via Supabase Dashboard:**

1. Go to your Supabase project
2. Navigate to **Functions → Manage Secrets**
3. Add:
   - Name: `SQUARE_ACCESS_TOKEN`
   - Value: Your Square access token
   - Name: `SQUARE_ENV`
   - Value: `production` or `sandbox`

### Step 5: Configure Business Location IDs

For each business account in the system:

1. Log in as the business admin
2. Go to **Settings → Square Location Setup**
3. Enter your Square Location ID
4. Click **Save Location ID**

---

## Architecture Details

### Edge Function: `process-square-payment`

**Flow:**
1. Client calls function with: `{ orderId, sourceId, amount }`
2. Function verifies authorization header (Supabase JWT)
3. Function fetches order and business details
4. Function uses `SquareClient` to process payment with developer token
5. Function records payment in database
6. Function sends receipt email on success

**Key Security Checks:**
- Authorization header presence
- Order existence and ownership
- Business location ID configured
- All Square requests use `SQUARE_ACCESS_TOKEN` from secrets

### Shared Square Client: `_shared/square-client.ts`

**Responsibilities:**
- Reads `SQUARE_ACCESS_TOKEN` and `SQUARE_ENV` from `Deno.env`
- Constructs proper Square API requests with:
  - `Authorization: Bearer <token>`
  - `Square-Version: 2024-01-18`
  - `Content-Type: application/json`
- Handles errors gracefully
- Returns standardized response format: `{ data, error }`

**Available Methods:**
- `createPayment()` - Process a card payment
- `retrievePayment()` - Get payment details
- `listPayments()` - List payments (with filtering)
- `createCustomer()` - Create a Square customer
- `retrieveCustomer()` - Get customer details
- `createOrder()` - Create a Square order
- `retrieveOrder()` - Get order details

---

## Frontend Usage Example

```typescript
// No Square tokens exposed to client!
// Frontend only sends app-level data

const { data, error } = await supabase.functions.invoke('process-square-payment', {
  body: {
    orderId: 'order-123',
    sourceId: 'cnp_...',  // Tokenized card from Square Web Payments SDK
    amount: 19.99,
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,  // Supabase JWT
  },
});

if (error) {
  console.error('Payment failed:', error.message);
} else {
  console.log('Payment successful:', data.paymentId);
}
```

---

## Environment Configuration

### Sandbox vs Production

The `SQUARE_ENV` secret determines which Square endpoint is used:

- **Sandbox** (`sandbox`): Uses `https://connect.squareup.dev` for testing
- **Production** (`production`): Uses `https://connect.squareup.com` for live payments

Ensure your access token matches the environment:
- Sandbox access tokens start with `sq0atp_...` (from Sandbox credentials)
- Production access tokens must be from Production credentials

### Changing Environments

To switch from Sandbox to Production:

1. Get a Production access token from Square Developer Dashboard
2. Update the secret:
   ```bash
   supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_production_token"
   supabase secrets set SQUARE_ENV="production"
   ```
3. Redeploy edge functions (they automatically pick up new secrets)

---

## Data Security & Isolation

### Row Level Security (RLS)

The `businesses` table has RLS policies ensuring:
- Users can only access their own business
- Business admins can only modify their business settings
- Payment records are tied to business_id for audit trails

### Verification Checklist

- [ ] User authentication verified before any Square operation
- [ ] Order ownership verified (order.business_id matches)
- [ ] Business location ID exists and is valid
- [ ] Square location ID is properly constrained (45 chars max)
- [ ] All payment records include business_id for audit
- [ ] Database backups include payment history

---

## Testing the Integration

### Test Payment Flow

1. Log in to a business account
2. Create a test order
3. Go to checkout
4. Use Square test card: `4532 0156 4006 6335`
5. Enter any future expiration and any CVC
6. Submit payment
7. Verify payment appears in admin **Payments** tab

### Test in Sandbox

For development/testing, use:
- Sandbox access token
- Square sandbox test cards
- Sandbox location ID

### Verify Edge Function Logs

```bash
supabase functions logs process-square-payment
```

---

## Troubleshooting

### "SQUARE_ACCESS_TOKEN environment variable is not set"

**Solution:** Set the secret in Supabase:
```bash
supabase secrets set SQUARE_ACCESS_TOKEN="your_token"
```

### Payment fails with "Square integration not configured"

**Solution:** Ensure business has a location ID set in settings:
1. Log in as business admin
2. Go to Settings → Square Location Setup
3. Enter your Square Location ID
4. Save

### "Invalid square_location_id"

**Solution:** Verify the location ID:
- Must match exactly with Square Dashboard
- Must be under 45 characters
- Should start with "L"

### Sandbox vs Production Mismatch

**Problem:** Using sandbox token with production endpoint or vice versa

**Solution:** Verify:
1. `SQUARE_ENV` matches token environment
2. Access token is from correct Square credentials
3. Redeploy functions after secret change

---

## Maintenance & Best Practices

### Regular Tasks

- [ ] Monitor Edge Function logs for errors
- [ ] Audit payment records monthly
- [ ] Test payment flow quarterly
- [ ] Rotate access token annually (Square best practice)

### Token Rotation

To rotate your Square access token:

1. In Square Developer Dashboard, regenerate the access token
2. Update the Supabase secret:
   ```bash
   supabase secrets set SQUARE_ACCESS_TOKEN="new_token"
   ```
3. No code changes needed; functions auto-reload
4. Test payment flow to confirm

### Audit Logging

All payments are recorded in the `payments` table with:
- `square_payment_id` - Square's transaction ID
- `business_id` - Which business processed it
- `amount` - Payment amount
- `status` - Payment status (completed/pending/failed)
- `created_at` - Timestamp

---

## Migration from Per-User Tokens

If upgrading from the old OAuth model:

1. **Database Migration**: Existing tokens in `settings` table have been removed (see migration: `20250115_migrate_square_location_to_businesses`)
2. **No User Action Needed**: Businesses must re-enter their Square Location ID in settings
3. **OAuth Disabled**: The `handle-square-oauth` function and `/square-callback` route are no longer used

---

## Support & Resources

- [Square API Documentation](https://developer.squareup.com/reference/square)
- [Square Developer Dashboard](https://developer.squareup.com/apps)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

---

## Security Notes

### All-Users-On-One-Account Model

Since all businesses use the same developer access token:

1. **Payment Processing**: Each payment is tied to a specific business via `business_id`
2. **Data Isolation**: Database queries filter by `business_id` to prevent cross-business access
3. **Audit Trail**: All transactions are logged with business/user info
4. **No Token Leakage**: Tokens never reach frontend or are exposed in logs

### Defense-in-Depth

- RLS policies prevent unauthorized database access
- JWT verification ensures authenticated requests
- Authorization checks confirm business ownership
- Idempotency keys prevent duplicate charges
- All Square calls logged for audit

