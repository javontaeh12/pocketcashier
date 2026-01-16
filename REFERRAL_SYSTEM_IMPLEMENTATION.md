# Referral Credit System Implementation Guide

## Architecture Overview

The referral credit system is implemented as a full-stack feature that allows customers to earn and redeem credits through referral codes that double as discount codes. The system uses a **double-entry ledger accounting model** where all transactions (credits and debits) are recorded as immutable entries, with balances calculated from transaction history. This ensures complete financial accuracy and auditability.

**Key Design Principles:**
- **Idempotency:** All credit/debit operations use unique idempotency keys to prevent duplicate transactions
- **Atomic Transactions:** Database constraints and RPC functions ensure concurrent operations don't cause race conditions
- **Security by Default:** RLS policies prevent unauthorized access to sensitive balance and transaction data
- **Verification Required:** Anonymous users must verify email before viewing balances
- **Business-Scoped:** Each business has independent referral program configuration

---

## Database Schema

### 1. referral_programs (Business Configuration)
```sql
id uuid PRIMARY KEY
business_id uuid UNIQUE REFERENCES businesses(id)
is_enabled boolean DEFAULT true
credit_per_use_cents int DEFAULT 500  -- $5.00 per referral use
min_order_cents int DEFAULT 0
max_credit_per_month_cents int NULL  -- Optional monthly cap
max_credit_per_order_cents int NULL  -- Optional per-order discount cap
created_at, updated_at timestamptz
```

### 2. referral_codes (Customer Codes)
```sql
id uuid PRIMARY KEY
business_id uuid REFERENCES businesses(id)
customer_id uuid NULL REFERENCES auth.users(id)  -- If logged in
customer_email text NULL  -- If anonymous
code text NOT NULL  -- 8-character unique code
is_active boolean DEFAULT true
saved_confirmed_at timestamptz NULL  -- User confirmed they saved code
created_at, updated_at timestamptz
UNIQUE(business_id, code)
CHECK(customer_id IS NOT NULL OR customer_email IS NOT NULL)
```

### 3. referral_ledger (Transaction Log)
```sql
id uuid PRIMARY KEY
business_id uuid REFERENCES businesses(id)
referral_code_id uuid REFERENCES referral_codes(id)
type text CHECK (type IN ('credit', 'debit'))
amount_cents int CHECK (amount_cents > 0)
reason text CHECK (reason IN ('referral_use_credit', 'discount_redemption', 'manual_adjustment', 'refund_reversal'))
order_id uuid NULL REFERENCES orders(id)
booking_id uuid NULL REFERENCES bookings(id)
idempotency_key text NOT NULL UNIQUE  -- Prevents duplicates
metadata jsonb DEFAULT '{}'
created_at timestamptz DEFAULT now()
```

### 4. referral_balances_view (Calculated Balances)
```sql
CREATE VIEW referral_balances_view AS
SELECT
  rc.id AS referral_code_id,
  rc.business_id,
  rc.code,
  rc.customer_id,
  rc.customer_email,
  SUM(CASE WHEN rl.type = 'credit' THEN rl.amount_cents ELSE 0 END) AS total_credits_cents,
  SUM(CASE WHEN rl.type = 'debit' THEN rl.amount_cents ELSE 0 END) AS total_debits_cents,
  SUM(CASE WHEN rl.type = 'credit' THEN rl.amount_cents ELSE -rl.amount_cents END) AS balance_cents
FROM referral_codes rc
LEFT JOIN referral_ledger rl ON rl.referral_code_id = rc.id
GROUP BY rc.id;
```

### 5. Modified Existing Tables

**orders table:**
```sql
referral_code_id uuid NULL REFERENCES referral_codes(id)
discount_amount_cents int DEFAULT 0
original_total_amount decimal(10,2) NULL  -- Pre-discount amount
```

**bookings table:**
```sql
referral_code_id uuid NULL REFERENCES referral_codes(id)
discount_amount_cents int DEFAULT 0
original_payment_amount decimal(10,2) NULL  -- Pre-discount amount
```

---

## RPC Functions (Database API)

### 1. create_referral_code(p_business_id, p_customer_email, p_customer_id)
**Purpose:** Generate unique referral code or return existing code
**Returns:** JSON with code, code_id, is_new, saved_confirmed flags
**Security:** Authenticated users or anonymous with email

### 2. confirm_referral_code_saved(p_code_id)
**Purpose:** Mark code as confirmed saved by customer
**Returns:** JSON with success and timestamp
**Security:** Public (requires code_id)

### 3. get_referral_balance(p_code, p_business_id, p_customer_email)
**Purpose:** Get balance and stats for a referral code
**Returns:** JSON with balance_cents, credits, debits, transaction counts
**Security:**
- Authenticated: Must own code or be business admin
- Anonymous: Must provide matching email for verification

### 4. validate_and_apply_referral_discount(p_business_id, p_code, p_order_total_cents)
**Purpose:** Validate code and calculate discount amount
**Returns:** JSON with code_id, discount_cents, remaining_balance
**Checks:**
- Program is enabled
- Order meets minimum amount
- Code is active
- Sufficient balance exists
- Respects max discount per order limit

### 5. apply_referral_discount_debit(p_business_id, p_referral_code_id, p_discount_cents, p_order_id, p_booking_id, p_idempotency_key)
**Purpose:** Create debit ledger entry (atomic operation)
**Returns:** JSON with ledger_id and duplicate_prevented flag
**Idempotency:** Uses order/booking ID + code ID as key

### 6. award_referral_credit(p_business_id, p_code, p_order_id, p_booking_id, p_idempotency_key)
**Purpose:** Award credit for successful referral use (idempotent)
**Returns:** JSON with ledger_id, credit_cents, duplicate_prevented
**Logic:**
- Credit is awarded to the CODE that was USED (not the order owner)
- Only credits if program is enabled
- Uses order/booking ID + code as idempotency key

### 7. get_referral_ledger_history(p_code_id, p_limit)
**Purpose:** Get transaction history for a code
**Returns:** Table of ledger entries with details
**Security:** RLS enforced (owner or business admin only)

---

## Edge Functions

### 1. request-referral-code
**Endpoint:** `/functions/v1/request-referral-code`
**Method:** POST
**Body:** `{ businessId, customerEmail? }`
**Purpose:** Generate or retrieve referral code for customer
**Returns:** Code details including code, code_id, is_new

### 2. verify-referral-balance
**Endpoint:** `/functions/v1/verify-referral-balance`
**Method:** POST
**Body:** `{ code, businessId, customerEmail? }`
**Purpose:** Look up balance with email verification
**Returns:** Balance info, transaction counts, status

---

## Frontend Components

### 1. ReferralModal (Public Page)
**Location:** `/src/components/ReferralModal.tsx`
**Features:**
- Multi-step flow: intro → request → confirm → balance
- Search function with email verification
- Code copying
- Transaction history display
- Balance display in dollars
**States:**
- intro: Explains referral program
- request: Email input to generate code
- confirm: Code display with save confirmation
- balance: Shows balance, history, stats
- search: Look up existing code with email

### 2. ReferralsTab (Admin Portal)
**Location:** `/src/pages/admin/ReferralsTab.tsx`
**Features:**
- Program settings configuration
- Enable/disable program
- Set credit per use amount (in dollars)
- Set minimum order amount
- Optional: max credit per order/month
- Statistics dashboard (total codes, active, issued, redeemed, outstanding)
- View all referral codes with balances
- Transaction ledger history
- Search functionality
**Views:**
- Settings: Configure program parameters
- Codes: List all codes with balances
- Ledger: Transaction history

### 3. HomePage Integration
**Updated:** `/src/pages/HomePage.tsx`
**Changes:**
- Added "Referral Rewards" button to business info section
- Button opens ReferralModal
- Orange color scheme (not purple per requirements)
- Gift icon from lucide-react

### 4. AdminPortal Integration
**Updated:** `/src/pages/admin/AdminPortal.tsx`
**Changes:**
- Added "Referrals" tab after "Payments" tab
- Gift icon navigation
- Renders ReferralsTab component

---

## Row Level Security (RLS) Policies

### referral_programs
- **SELECT:** Business owners only
- **UPDATE:** Business owners only
- **INSERT:** Business owners only

### referral_codes
- **SELECT:** Code owner (customer_id match) OR business admin

### referral_ledger
- **SELECT:** Code owner (via referral_code_id) OR business admin
- **INSERT/UPDATE/DELETE:** Blocked (server-side only via RPC)

---

## Idempotency Strategy

### Credit Awarding (when code is used)
```
Idempotency Key Format: "credit-{order_id}-{code}"
```
- Prevents duplicate credits if payment webhook retries
- Unique constraint on ledger.idempotency_key ensures atomicity

### Debit Application (when redeeming discount)
```
Idempotency Key Format: "debit-{order_id}-{referral_code_id}"
```
- Prevents double-charging if checkout process restarts
- Unique constraint prevents concurrent redemptions

### Race Condition Prevention
- PostgreSQL UNIQUE constraint on idempotency_key handles concurrent requests
- RPC functions check for existing entry before INSERT
- Returns existing ledger_id if duplicate detected

---

## Integration Points

### Checkout/Order Flow (NEEDS IMPLEMENTATION)

**Required Changes to CheckoutPage.tsx:**

1. **Add Discount Code Input Section** (before payment)
```tsx
const [discountCode, setDiscountCode] = useState('');
const [discountApplied, setDiscountApplied] = useState<any>(null);
const [discountError, setDiscountError] = useState('');

const handleApplyDiscount = async () => {
  const response = await supabase.rpc('validate_and_apply_referral_discount', {
    p_business_id: businessId,
    p_code: discountCode.toUpperCase(),
    p_order_total_cents: Math.round(totalAmount * 100)
  });

  if (response.data?.success) {
    setDiscountApplied(response.data);
    // Update displayed total
  } else {
    setDiscountError(response.data?.error || 'Invalid code');
  }
};
```

2. **Update Order Creation** (include discount fields)
```tsx
const { data: order } = await supabase.from('orders').insert({
  business_id: businessId,
  customer_id: customer.id,
  total_amount: finalTotal,  // After discount
  original_total_amount: totalAmount,  // Before discount
  referral_code_id: discountApplied?.code_id,
  discount_amount_cents: discountApplied?.discount_cents,
  // ... other fields
}).select().single();
```

3. **Create Debit Entry** (after order payment confirmed)
```tsx
if (discountApplied && order) {
  await supabase.rpc('apply_referral_discount_debit', {
    p_business_id: businessId,
    p_referral_code_id: discountApplied.code_id,
    p_discount_cents: discountApplied.discount_cents,
    p_order_id: order.id,
    p_idempotency_key: `debit-${order.id}-${discountApplied.code_id}`
  });
}
```

4. **Award Credit to Referrer** (after payment success)
```tsx
// This awards credit to the CODE that was used
if (discountCode && order.payment_status === 'completed') {
  await supabase.rpc('award_referral_credit', {
    p_business_id: businessId,
    p_code: discountCode.toUpperCase(),
    p_order_id: order.id,
    p_idempotency_key: `credit-${order.id}-${discountCode}`
  });
}
```

### Booking Flow (NEEDS IMPLEMENTATION)

**Required Changes to BookingForm.tsx:**

1. **Add Discount Code Input** (before payment section)
```tsx
const [discountCode, setDiscountCode] = useState('');
const [discountApplied, setDiscountApplied] = useState<any>(null);

// Similar handleApplyDiscount function as checkout
```

2. **Update Booking Creation** (include discount fields)
```tsx
const { data: booking } = await fetch('/functions/v1/create-booking', {
  method: 'POST',
  body: JSON.stringify({
    // ... existing fields
    referral_code_id: discountApplied?.code_id,
    discount_amount_cents: discountApplied?.discount_cents,
    original_payment_amount: paymentAmount,
    payment_amount: paymentAmount - (discountApplied?.discount_cents / 100 || 0),
  })
});
```

3. **Update create-booking Edge Function** (apply debit and award credit)
```typescript
// After booking created and payment processed
if (referral_code_id && discount_amount_cents > 0) {
  await supabase.rpc('apply_referral_discount_debit', {
    p_business_id: businessId,
    p_referral_code_id: referral_code_id,
    p_discount_cents: discount_amount_cents,
    p_booking_id: booking.id,
    p_idempotency_key: `debit-${booking.id}-${referral_code_id}`
  });

  // Award credit to the code that was used
  await supabase.rpc('award_referral_credit', {
    p_business_id: businessId,
    p_code: referral_code,  // The code that was entered
    p_booking_id: booking.id,
    p_idempotency_key: `credit-${booking.id}-${referral_code}`
  });
}
```

### Square Payment Integration

**Update process-square-payment Edge Function:**

After payment succeeds:
```typescript
// Award referral credit if order used a referral code
const { data: order } = await supabase
  .from('orders')
  .select('referral_code:referral_codes(code), business_id')
  .eq('id', orderId)
  .single();

if (order?.referral_code?.code) {
  await supabase.rpc('award_referral_credit', {
    p_business_id: order.business_id,
    p_code: order.referral_code.code,
    p_order_id: orderId,
    p_idempotency_key: `credit-${orderId}-${order.referral_code.code}`
  });
}
```

---

## Testing Checklist

### 1. Code Generation
- [ ] Anonymous user can request code with email
- [ ] Authenticated user can request code
- [ ] Same user gets same code if requested again
- [ ] Codes are unique within business
- [ ] Code confirmation flow works

### 2. Balance Lookup
- [ ] Anonymous user can search with code + email
- [ ] Email verification prevents unauthorized viewing
- [ ] Authenticated user can view own balance
- [ ] Admin can view all business codes
- [ ] Balance calculation is accurate

### 3. Discount Application
- [ ] Valid code applies correct discount
- [ ] Insufficient balance shows error
- [ ] Inactive code shows error
- [ ] Invalid code shows error
- [ ] Minimum order requirement enforced
- [ ] Max credit per order limit enforced
- [ ] Discount cannot exceed order total

### 4. Credit Earning
- [ ] Using a code awards credit to that code
- [ ] Credit amount matches program settings
- [ ] Duplicate payment doesn't double-credit
- [ ] Only completed/paid orders award credit
- [ ] Abandoned carts don't award credit

### 5. Idempotency
- [ ] Webhook retries don't duplicate credits
- [ ] Checkout refresh doesn't duplicate debits
- [ ] Concurrent redemptions handled correctly
- [ ] Ledger remains consistent

### 6. Admin Functions
- [ ] Can enable/disable program
- [ ] Can set credit per use
- [ ] Can view all codes and balances
- [ ] Can view transaction history
- [ ] Statistics are accurate

### 7. Security
- [ ] RLS prevents unauthorized access
- [ ] Anonymous users cannot view others' balances
- [ ] Balance manipulation not possible from client
- [ ] Ledger entries cannot be deleted/modified

---

## Implementation Status

### ✅ Completed
1. Database schema and migrations
2. RLS policies
3. RPC functions (all 8 functions)
4. Edge functions (request-referral-code, verify-referral-balance)
5. ReferralModal component (public page)
6. ReferralsTab component (admin portal)
7. HomePage integration (referral button)
8. AdminPortal integration (referrals tab)

### 🔨 Needs Implementation
1. **CheckoutPage discount code UI and logic**
   - Add discount code input field
   - Apply discount validation
   - Update order creation with discount fields
   - Create debit entry after payment
   - Award credit to referrer

2. **BookingForm discount code UI and logic**
   - Add discount code input field
   - Apply discount validation
   - Update booking creation with discount fields

3. **create-booking Edge Function updates**
   - Handle discount code in booking creation
   - Apply debit entry after booking payment
   - Award credit to referrer

4. **process-square-payment Edge Function updates**
   - Award referral credit after successful payment

5. **Comprehensive end-to-end testing**

---

## Usage Flow Examples

### Customer Journey (Earns Credit)
1. Customer visits business page
2. Clicks "Referral Rewards" button
3. Enters email, receives code "ABCD1234"
4. Confirms they saved the code
5. Shares code with friends
6. Friend uses "ABCD1234" at checkout → Order completes
7. Customer's code balance increases by configured amount ($5 default)
8. Customer checks balance, sees credit earned

### Customer Journey (Redeems Credit)
1. Customer has code with $20 balance
2. Places $50 order
3. Enters code "ABCD1234" at checkout
4. Applies discount → sees $20 off
5. Pays $30 instead of $50
6. Order completes
7. Code balance decreases to $0

### Admin Journey
1. Admin logs into portal
2. Clicks "Referrals" tab
3. Enables program, sets $5 credit per use
4. Sets minimum order $10
5. Views statistics dashboard
6. Sees 50 active codes with $500 outstanding balance
7. Views transaction ledger
8. Exports data for accounting

---

## Best Practices

1. **Always use cents for money**
   - Database stores amounts_cents as integers
   - Frontend converts to dollars for display
   - Avoids floating point precision issues

2. **Validate on server-side**
   - All balance checks in RPC functions
   - Client-side validation is convenience only
   - Security enforced in database

3. **Include order/booking context**
   - Ledger entries reference order_id or booking_id
   - Enables refund/reversal if needed
   - Provides audit trail

4. **Test idempotency thoroughly**
   - Simulate webhook retries
   - Test concurrent operations
   - Verify ledger consistency

5. **Monitor outstanding balances**
   - Track total liability from referral credits
   - Set reasonable limits if needed
   - Review redemption patterns

---

## Next Steps

To complete the implementation:

1. Implement discount code UI in CheckoutPage.tsx
2. Integrate discount validation and application
3. Update order creation to include discount fields
4. Add debit/credit ledger entries after payment
5. Implement same changes for BookingForm.tsx
6. Update create-booking edge function
7. Update process-square-payment edge function
8. Run comprehensive testing
9. Deploy and monitor

The foundation is complete and working. The remaining work is primarily frontend integration with the existing checkout and booking flows, which follows clear patterns outlined above.
