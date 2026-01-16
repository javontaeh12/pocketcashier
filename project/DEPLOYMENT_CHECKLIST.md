# Square Developer Token - Deployment Checklist

## Pre-Deployment Verification

- [x] TypeScript builds successfully (`npm run build`)
- [x] Edge function `process-square-payment` deployed
- [x] Shared client `_shared/square-client.ts` created
- [x] Database migration applied
- [x] UI updated (SettingsTab simplified, SquareCallback simplified)
- [x] Documentation created (4 guides + code examples)

---

## Deployment Steps

### Step 1: Set Environment Secrets (CRITICAL)

**This must be done before testing payments!**

```bash
# Get your Square Access Token from:
# Square Developer Dashboard → Credentials → Copy "Access Token"

# Option A: Via CLI
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_..."
supabase secrets set SQUARE_ENV="production"

# Option B: Via Supabase Dashboard
# Navigate to: Functions → Manage Secrets
# Add two secrets:
#   1. SQUARE_ACCESS_TOKEN = "sq0atp_..."
#   2. SQUARE_ENV = "production" (or "sandbox")
```

**Verify secrets are set:**
```bash
supabase secrets list
# Should show SQUARE_ACCESS_TOKEN and SQUARE_ENV
```

### Step 2: Verify Edge Function Deployment

```bash
# Check that process-square-payment is deployed
supabase functions list

# Watch logs to verify function loads
supabase functions logs process-square-payment
# Should see startup logs (not errors)
```

### Step 3: Configure Each Business

For each business account:

1. **Log in as business admin**
2. **Navigate to:** Settings → "Square Location Setup"
3. **Enter:** Square Location ID (from Square Dashboard → Locations)
4. **Click:** Save Location ID
5. **Verify:** Success message appears

**To find Location ID:**
- Square Dashboard → Settings → Locations
- Click your location
- ID appears at top (looks like `L...`)

### Step 4: Test Payment Flow

1. **Log in to a business account**
2. **Create a test order** (add items to cart)
3. **Go to checkout page**
4. **Fill in payment form:**
   - Card: `4532 0156 4006 6335` (test card)
   - Expiry: Any future date (e.g., 12/28)
   - CVC: Any 3 digits (e.g., 123)
5. **Click "Process Payment"**
6. **Expected result:** Payment succeeds, shows confirmation
7. **Verify in admin:** Payments tab shows the transaction

### Step 5: Verify Error Handling

1. **Try payment with insufficient funds card:**
   - Card: `5105 1051 0510 5100`
   - Should fail with: "Card declined"

2. **Try payment with invalid card:**
   - Card: `5555 5555 5555 4444`
   - Should fail with: "Card error"

3. **Try checkout without location ID set:**
   - Remove location ID from settings
   - Try to checkout
   - Should fail with: "Business Square configuration incomplete"

### Step 6: Check Logs

```bash
# View edge function logs
supabase functions logs process-square-payment

# Expected output should show:
# ✓ "Processing Square payment for order: ..."
# ✓ SUCCESS or appropriate error message
# ✗ NO token values or secrets in logs
```

### Step 7: Audit Database

```bash
# Check that payment was recorded
SELECT * FROM payments
ORDER BY created_at DESC
LIMIT 5;

-- Should show:
-- ✓ square_payment_id (from Square)
-- ✓ business_id (for isolation)
-- ✓ amount, status, payment_method
-- ✓ created_at timestamp
```

---

## Rollback Plan (If Needed)

### Quick Rollback (30 min)

If you need to revert immediately:

1. **Revert SettingsTab UI:**
   ```bash
   git checkout src/pages/admin/SettingsTab.tsx
   ```

2. **Restore old edge function:**
   ```bash
   # Replace process-square-payment with old version
   # Or manually restore from git history
   ```

3. **Remove secrets (optional):**
   ```bash
   supabase secrets unset SQUARE_ACCESS_TOKEN
   supabase secrets unset SQUARE_ENV
   ```

### Full Rollback (60 min)

To completely revert to OAuth model:

1. Reverse database migration
2. Restore OAuth UI components
3. Redeploy old edge functions
4. Update frontend to use OAuth flow

---

## Post-Deployment Monitoring

### Daily Checks

- [ ] No errors in edge function logs
- [ ] All payments processing successfully
- [ ] No unusual transaction patterns
- [ ] Database connections stable

### Weekly Checks

- [ ] Review all transactions in Payments tab
- [ ] Verify receipt emails sent
- [ ] Check Square Dashboard for any alerts
- [ ] Monitor edge function performance

### Monthly Checks

- [ ] Audit total revenue
- [ ] Review payment status distribution
- [ ] Check for any failed transactions
- [ ] Verify RLS policies still effective

---

## Troubleshooting During Deployment

### Problem: "SQUARE_ACCESS_TOKEN is not set"

**Cause:** Secret not configured

**Fix:**
```bash
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_..."
```

Then retry payment.

### Problem: Payment fails with "Business Square configuration incomplete"

**Cause:** Location ID not set

**Fix:**
1. Go to business Settings
2. Enter Square Location ID
3. Click Save
4. Retry payment

### Problem: "Invalid access token"

**Cause:** Token is invalid, expired, or from wrong environment

**Fix:**
1. Check token in Square Developer Dashboard
2. Verify it matches `SQUARE_ENV` (sandbox vs production)
3. Update secret: `supabase secrets set SQUARE_ACCESS_TOKEN="new_token"`
4. Retry payment

### Problem: Payment shows in admin but not in Square Dashboard

**Cause:** Environment mismatch (sandbox vs production)

**Fix:**
1. Check current environment: `supabase secrets list`
2. Look at test payments in Square Dashboard (Sandbox tab)
3. Ensure `SQUARE_ENV` matches where you're looking

### Problem: Location ID saved but checkout still fails

**Cause:** Cache not refreshed

**Fix:**
1. Business admin refreshes browser (Ctrl+F5)
2. Retry checkout
3. If still fails, check logs: `supabase functions logs process-square-payment`

---

## Performance Metrics

### Expected Response Times

- Payment processing: **2-5 seconds** (includes Square API call)
- Database query: **<100ms**
- Square API call: **1-3 seconds**
- Receipt email send: **<1 second**

### Load Testing Recommendations

- Test with 10 simultaneous payments: Should all succeed
- Test with 100 payments/hour: Edge function should handle
- Monitor function memory: Should stay under 500MB

### Monitoring Commands

```bash
# View function metrics
supabase functions describe process-square-payment

# Check recent invocations
supabase functions logs process-square-payment --limit 100

# Monitor edge function performance
# (In Supabase Dashboard: Functions → process-square-payment → Metrics)
```

---

## Security Verification

### Before Going Live

- [ ] **Token Security**
  - [ ] `SQUARE_ACCESS_TOKEN` only in Supabase secrets
  - [ ] Not in code, config files, or version control
  - [ ] Not visible in browser dev tools or logs

- [ ] **Authorization**
  - [ ] JWT verified before processing payments
  - [ ] Order ownership verified
  - [ ] Business location verified

- [ ] **Data Isolation**
  - [ ] RLS policies active on payments table
  - [ ] Businesses can't see other businesses' payments
  - [ ] Customers can't see payment amounts

- [ ] **Error Handling**
  - [ ] No token values in error messages
  - [ ] No sensitive data in logs
  - [ ] Errors don't leak internal structure

- [ ] **Audit Trail**
  - [ ] All payments logged with business_id
  - [ ] All failures recorded with reason
  - [ ] Timestamps accurate

### Compliance Checklist

- [ ] PCI DSS compliant (no card data in DB)
- [ ] GDPR compliant (customer data protection)
- [ ] SOC 2 compliant (security controls in place)
- [ ] Supabase terms met (proper secret management)

---

## Documentation

### For Developers

- **Quick Start:** `SQUARE_QUICK_START.md` (5 min read)
- **Setup Guide:** `SQUARE_DEVELOPER_TOKEN_SETUP.md` (detailed)
- **Code Examples:** `SQUARE_CODE_EXAMPLES.md` (implementation)
- **Refactor Summary:** `SQUARE_REFACTOR_SUMMARY.md` (architecture)

### For Admins

- **Quick Start:** `SQUARE_QUICK_START.md`
- **Troubleshooting:** See section above
- **Monitoring:** Monitor edge function logs

---

## Sign-Off

- [ ] **Developer:** Reviewed code, verified builds, tested payment flow
- [ ] **QA:** Tested error scenarios, verified logging, checked security
- [ ] **Admin:** Configured secrets, verified business setup, tested payment
- [ ] **Ready for Production:** All checks passed

---

## Emergency Contacts

If deployment fails:

1. **Check logs first:** `supabase functions logs process-square-payment`
2. **Verify secrets:** `supabase secrets list`
3. **Test endpoint:** Manual curl call to function
4. **Rollback if needed:** See rollback plan above

---

## Go-Live Criteria

✅ **OK to Deploy When:**
- Secrets are set correctly
- Edge function logs show no errors
- Test payment succeeds
- Error scenarios handled gracefully
- All business admins configured location IDs
- Documentation reviewed

❌ **NOT OK to Deploy When:**
- Secrets not set
- Edge function has runtime errors
- Test payment fails
- No error handling
- Businesses not configured
- Documentation incomplete

---

## Post-Launch Tasks (24-48 hours)

- [ ] Monitor all payments for first 100 transactions
- [ ] Respond to any customer payment issues
- [ ] Review edge function performance metrics
- [ ] Check for any security alerts
- [ ] Verify all receipt emails sent
- [ ] Monitor database performance
- [ ] Check Square Dashboard for any flagged transactions

