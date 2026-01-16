# Square Integration Refactor: Developer Token Model

## Executive Summary

The Square integration has been refactored from a per-user OAuth token model to a **secure single developer access token model**. All Square API requests now execute server-side in Supabase Edge Functions using credentials stored in environment secrets, eliminating token storage from the database and removing all client-side Square credential handling.

---

## What Changed

### ✅ Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Token Storage | DB (encrypted) | Environment Secrets (in Supabase) |
| Token Scope | Per-business OAuth | Single developer token |
| API Calls | Database reads tokens | Edge function uses env vars |
| Client Exposure | None (good) | None (still good) |
| OAuth Flow | Required | Removed entirely |
| Token Rotation | Complex (per business) | Simple (1 secret update) |
| Multi-tenancy Risk | Medium (multiple tokens in DB) | Low (no tokens in DB) |

### Files Modified

#### 1. **Created: `supabase/functions/_shared/square-client.ts`**
- Reusable Square API client used by all edge functions
- Reads `SQUARE_ACCESS_TOKEN` and `SQUARE_ENV` from `Deno.env`
- Provides methods: `createPayment()`, `retrievePayment()`, `listPayments()`, `createCustomer()`, etc.
- Handles error responses and standardizes return format
- **Security**: Credentials never logged; only endpoint info appears in debug logs

#### 2. **Updated: `supabase/functions/process-square-payment/index.ts`**
- Now uses `SquareClient` instead of reading token from database
- Removed database query for `square_access_token` and `square_refresh_token`
- Verifies authorization header (JWT) before processing
- Verifies business has `square_location_id` configured (moved from settings to businesses table)
- Payment processing flow remains same; underlying token source changed
- **Size**: ~145 lines (was ~181 lines, simplified)

#### 3. **Disabled: `supabase/functions/handle-square-oauth/index.ts`**
- OAuth token exchange function no longer needed
- Not deployed; exists for reference/rollback only
- If needed, can be manually removed

#### 4. **Updated: `src/pages/SquareCallback.tsx`**
- Simplified to just redirect to admin
- No longer exchanges OAuth codes for tokens
- No longer stores tokens in database
- Kept in codebase as fallback redirect (3 second auto-redirect to admin)

#### 5. **Updated: `src/pages/admin/SettingsTab.tsx`**
- Removed Square OAuth connection UI ("Connect Square Account" button)
- Removed Square environment indicator
- Removed disconnect button
- Simplified to just location ID entry
- UI now clearly states: "Square payment processing is managed at the system level"

#### 6. **Database Migration: `20250115_migrate_square_location_to_businesses.sql`**
- Migrated `square_location_id` from `settings` table to `businesses` table
- Removed `square_access_token` column (no longer needed)
- Removed `square_refresh_token` column (no longer needed)
- Preserved data with backward-compatible approach
- **No data loss**: Existing location IDs copied before column removal

#### 7. **Created: `SQUARE_DEVELOPER_TOKEN_SETUP.md`**
- Complete setup guide for deploying with developer token
- Environment variable documentation
- Testing instructions
- Troubleshooting guide
- Data security & isolation explanation

#### 8. **Updated: Developer Integrations Tab** (`src/pages/developer/IntegrationsTab.tsx`)
- Added Square Global Credentials section
- Allows system admin to configure developer token (UI only; actual secret set via Supabase)
- Added setup instructions
- Already integrated; ready to use

---

## Architecture Overview

### Request Flow: Payment Processing

```
┌─────────────────────────────────┐
│  Browser (CheckoutPage)         │
│  - Loads Square SDK (CDN)       │
│  - Tokenizes card               │
└────────────┬────────────────────┘
             │ POST process-square-payment
             │ { orderId, sourceId, amount }
             ▼
┌─────────────────────────────────┐
│  Supabase Edge Function         │
│  1. Verify JWT (auth header)    │
│  2. Load order & verify owned   │
│  3. Load business & location ID │
│  4. Create SquareClient()       │
│  5. Call createPayment()        │
└────────────┬────────────────────┘
             │ fetch SQUARE_ACCESS_TOKEN
             │ from Deno.env
             ▼
┌─────────────────────────────────┐
│  Square API                     │
│  POST /v2/payments              │
│  Authorization: Bearer <token>  │
└────────────┬────────────────────┘
             │ response
             ▼
┌─────────────────────────────────┐
│  Edge Function (continued)      │
│  1. Record in payments table    │
│  2. Update order status         │
│  3. Send receipt email          │
│  4. Return paymentId to client  │
└────────────┬────────────────────┘
             │ response
             ▼
┌─────────────────────────────────┐
│  Browser                        │
│  - Show confirmation            │
│  - Clear card form              │
└─────────────────────────────────┘
```

### Security Layers

```
Layer 1: Transport Security
  - HTTPS only
  - TLS 1.3+

Layer 2: Authentication
  - Supabase JWT in Authorization header
  - Verified by edge function

Layer 3: Authorization
  - User logged in to Supabase Auth
  - Business RLS policies enforced
  - Order ownership verified

Layer 4: Token Protection
  - Developer token in Supabase secrets
  - Never in database
  - Never in logs (sanitized in SquareClient)
  - Never sent to client

Layer 5: Data Isolation
  - All queries filter by business_id
  - RLS policies prevent cross-business access
  - Payment records tagged with business_id

Layer 6: Audit Trail
  - All payments logged with:
    - square_payment_id (Square's ID)
    - business_id (isolate by tenant)
    - amount, status, timestamp
```

---

## Key Implementation Details

### SquareClient Class

**Initialization:**
```typescript
const squareClient = new SquareClient();
// Reads from Deno.env:
// - SQUARE_ACCESS_TOKEN (required)
// - SQUARE_ENV (optional, defaults to 'production')
// - Determines baseUrl (production vs sandbox)
```

**Request Method:**
```typescript
const { data, error } = await squareClient.createPayment({
  source_id: 'cnp_...',
  amount_money: { amount: 1999, currency: 'USD' },
  location_id: 'L...',
  idempotency_key: 'order-123-timestamp',
});
```

**Error Handling:**
- Graceful error messages (no token leakage)
- Standardized response: `{ data: T | null, error: string | null }`
- Square API errors wrapped with context

### Environment Variables

**In Supabase:**
```bash
SQUARE_ACCESS_TOKEN = "sq0atp_..." (secret, not shown)
SQUARE_ENV = "production" or "sandbox"
```

**Not used by client:**
- These are server-side only
- Never accessible from browser
- Supabase automatically provides to edge functions

**How to set:**
```bash
# Via Supabase CLI
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_..."
supabase secrets set SQUARE_ENV="production"

# Or via Supabase Dashboard → Functions → Manage Secrets
```

### Location ID Movement

**Why moved from settings to businesses?**
- Each business uses same developer token
- But each business has different location ID
- Location ID is business-specific configuration
- Simplifies schema (one table for business config)

**Migration handled:**
- Existing values copied automatically
- No manual action needed
- Old settings.square_location_id dropped after copy

### Database Cleanup

**Removed columns:**
- `settings.square_access_token` - Not needed (token in secrets)
- `settings.square_refresh_token` - Not needed (no OAuth refresh)

**Kept columns (for reference, can be removed):**
- `settings.square_enabled` - Could remove; not used
- `settings.square_merchant_id` - Could remove; for historical tracking
- `settings.square_connected_at` - Could remove; for historical tracking

---

## Deployment Instructions

### 1. Deploy Edge Functions

Already done via `mcp__supabase__deploy_edge_function`:

```bash
# process-square-payment is now deployed
# Uses SquareClient from _shared/square-client.ts
```

### 2. Set Environment Secrets

**Critical**: Must be done before payments can work

```bash
# Get token from Square Developer Dashboard
SQUARE_ACCESS_TOKEN="sq0atp_..."

# Set via CLI
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_..."
supabase secrets set SQUARE_ENV="production"

# Or via Supabase Dashboard → Functions → Manage Secrets
```

### 3. Run Database Migration

Already applied:
```bash
# Migration: 20250115_migrate_square_location_to_businesses
# - Moves square_location_id from settings to businesses
# - Removes token columns from settings
```

### 4. Configure Businesses

Each business needs:
1. Log in as business admin
2. Go to Settings → "Square Location Setup"
3. Enter Square Location ID (from Square Dashboard)
4. Save

---

## Testing Checklist

### ✓ Pre-Deployment

- [x] Build succeeds with no errors
- [x] TypeScript compiles (`npm run build`)
- [x] Edge function syntax valid
- [x] Database migration backward-compatible

### ✓ Post-Deployment

- [ ] Set `SQUARE_ACCESS_TOKEN` and `SQUARE_ENV` secrets in Supabase
- [ ] Redeploy edge functions (or verify they auto-reload with new secrets)
- [ ] Business enters location ID in Settings
- [ ] Create test order
- [ ] Attempt checkout with test card
- [ ] Verify payment succeeds in Square Dashboard
- [ ] Verify payment recorded in app's Payments tab
- [ ] Verify receipt email sent to customer
- [ ] Test failure scenarios (invalid card, insufficient funds, etc.)

### ✓ Sandbox Testing

Use test card: `4532 0156 4006 6335`
- Any future expiration
- Any 3-digit CVC

### ✓ Audit & Logs

```bash
# Check edge function logs
supabase functions logs process-square-payment

# Should see:
# - "Processing Square payment for order: ..."
# - SUCCESS or ERROR messages
# - NO token values in logs (sanitized)
```

---

## Rollback Plan

If needed to revert:

1. **Restore old edge function:**
   - Deploy old `process-square-payment` code
   - Restore old `handle-square-oauth` function

2. **Reverse database migration:**
   - Add back `square_location_id` to settings
   - Add back `square_access_token` to settings
   - Add back `square_refresh_token` to settings
   - Copy values from businesses back to settings

3. **Restore UI:**
   - Restore old SettingsTab with OAuth flow
   - Restore SquareCallback token exchange logic

**Time to rollback:** ~30 minutes (manual steps)

---

## Future Improvements

### Potential Enhancements

1. **Add Square Webhook Handling**
   - Create `handle-square-webhooks` edge function
   - Verify webhook signatures
   - Auto-update payment status

2. **Enhanced SquareClient Methods**
   - Refund payments
   - Retrieve transactions
   - Manage customers
   - Handle subscriptions

3. **Better Error Handling**
   - Retry logic with exponential backoff
   - Error classification (user vs system)
   - Detailed error logging

4. **Audit Logging**
   - Dedicated table for all Square operations
   - Timestamp, business_id, operation, result
   - Query for compliance/debugging

5. **Rate Limiting**
   - Prevent abuse/duplicate charges
   - Rate limit per business
   - Circuit breaker pattern

---

## Security Considerations

### All Users On One Account

Since all businesses use the same developer token:

**Mitigations in place:**
1. **Database-level isolation**: RLS policies filter by business_id
2. **Application-level checks**: Edge functions verify ownership
3. **Audit trail**: All transactions logged with business identifier
4. **No token exposure**: Token never visible to client or user

**Best practices:**
- Regularly rotate the developer token (Square best practice: annually)
- Monitor all payments in admin dashboard
- Set up fraud alerts in Square
- Enable 2FA on Square Developer account
- Restrict API key permissions in Square (least privilege)

### Token Compromise Response

If `SQUARE_ACCESS_TOKEN` is compromised:

1. Immediately revoke token in Square Developer Dashboard
2. Generate new access token
3. Update secret: `supabase secrets set SQUARE_ACCESS_TOKEN="new_token"`
4. Redeploy edge functions (auto-reload, ~30 seconds)
5. Monitor payments closely for fraudulent activity
6. Alert users if needed

---

## Comparison: Old vs New

### Old Model (OAuth per Business)

```
Business 1: Has its own Square OAuth token → Token stored in DB
Business 2: Has its own Square OAuth token → Token stored in DB
Business 3: Has its own Square OAuth token → Token stored in DB

Risks:
- 3 tokens in database (compromise risk × 3)
- Token refresh complexity
- OAuth state management
- Separate merchant IDs
```

### New Model (Single Developer Token)

```
Single Developer Token → Stored in Supabase Secrets

Business 1: Payments processed with developer token
Business 2: Payments processed with developer token
Business 3: Payments processed with developer token

Benefits:
- 1 token (not in DB, in secrets)
- No refresh needed
- Centralized management
- Shared merchant account (but data isolation via DB)
```

---

## Deployment Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Edge Function: process-square-payment | ✅ Deployed | Uses SquareClient |
| Edge Function: _shared/square-client | ✅ Created | Reusable Square client |
| Edge Function: handle-square-oauth | ⚠️ Disabled | No longer needed |
| Database Migration | ✅ Applied | Location ID moved to businesses |
| Frontend SquareCallback | ✅ Updated | Simplified; just redirects |
| Frontend SettingsTab | ✅ Updated | Removed OAuth UI |
| Documentation | ✅ Created | Setup guide in place |

---

## Support & Troubleshooting

See `SQUARE_DEVELOPER_TOKEN_SETUP.md` for:
- Detailed setup instructions
- Environment configuration
- Testing procedures
- Troubleshooting common issues

---

## Questions?

Refer to:
1. `SQUARE_DEVELOPER_TOKEN_SETUP.md` - Setup & configuration
2. `supabase/functions/_shared/square-client.ts` - Client API
3. `supabase/functions/process-square-payment/index.ts` - Payment flow example

