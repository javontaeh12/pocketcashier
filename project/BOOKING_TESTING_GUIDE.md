# Booking Flow Testing Guide

## Quick Test (5 minutes)

### Prerequisites
- Business set up with admin email configured
- Google Calendar connected (optional but recommended)
- RESEND_API_KEY configured (should be automatic)

### Test Steps

1. **Open booking form** on your business public page
2. **Fill form**:
   - Name: "Test Customer"
   - Email: Your test email
   - Phone: (555) 123-4567
   - Date: Tomorrow
   - Time: 2:00 PM
   - Service: Any
3. **Submit booking**
4. **Check success screen** - Should show:
   - ✓ Confirmation email sent
   - ✓ Calendar event created (if calendar connected)
   - Reference ID (e.g., "Ref: 123e4567-e89b-12d3-a456-...")
5. **Check email** - You should receive booking confirmation within 30 seconds
6. **Check Google Calendar** - Event should appear within 1 minute

### If Something Goes Wrong
1. **Note the Reference ID** from success screen
2. **Check Supabase logs**:
   - Go to Project → Functions → Logs
   - Search for the Reference ID
   - Look for errors in red
3. **Report with Reference ID** to support - enables exact debugging

---

## Comprehensive Test Suite

### Test 1: Happy Path (Everything Works)
**Goal**: Verify complete flow succeeds

**Setup**:
```
- Admin email: Set in Settings tab
- Google Calendar: Connected
- RESEND_API_KEY: Present in environment
```

**Steps**:
1. Submit complete booking
2. Wait for success modal
3. Note Reference ID
4. Check email received (customer + admin)
5. Check Google Calendar for event

**Expected Results**:
- [ ] Success modal shows both checkmarks (✓ email, ✓ calendar)
- [ ] Customer email arrives within 30 seconds
- [ ] Admin email arrives within 30 seconds
- [ ] Calendar event visible in Google Calendar
- [ ] Booking appears in admin portal

**Logs to Check**:
```
[CREATE_BOOKING_COMPLETE] ... calendar_synced=true emails_sent=true
[SEND_EMAIL_SUCCESS] recipient=customer@example.com
[SEND_EMAIL_SUCCESS] recipient=admin@example.com
```

---

### Test 2: No Admin Email Configured
**Goal**: Verify graceful handling when admin email missing

**Setup**:
1. Go to Admin Portal → Settings
2. Clear the "Admin Email Address" field
3. Click "Save Settings"

**Steps**:
1. Submit booking
2. Check success modal
3. Wait 30 seconds
4. Check admin email

**Expected Results**:
- [ ] Success modal shows: ✓ email, ✓ calendar
- [ ] Customer receives email
- [ ] Admin does NOT receive email (expected)
- [ ] Booking still created successfully

**Logs to Check**:
```
[SEND_BOOKING_CONFIRMATION_ADMIN_SKIPPED] reason='admin_email not configured'
```

---

### Test 3: Google Calendar Not Connected
**Goal**: Verify booking succeeds even without calendar

**Setup**:
1. Disconnect Google Calendar (don't re-authenticate)
2. Or simply don't connect it

**Steps**:
1. Submit booking
2. Check success modal

**Expected Results**:
- [ ] Success modal shows: ✓ email, ○ calendar not synced (amber)
- [ ] Customer receives email
- [ ] Booking created successfully
- [ ] No calendar event created (expected)

**Logs to Check**:
```
[CREATE_BOOKING_CALENDAR_SKIPPED] reason='calendar not connected or creation failed'
```

---

### Test 4: Duplicate Submission Prevention
**Goal**: Verify second submission doesn't create duplicate booking

**Setup**:
- Browser with slow network simulation (or bad connection)

**Steps**:
1. Open booking form
2. Fill completely
3. **Quickly click Submit TWICE** before first completes
4. Wait for response
5. Check admin portal for bookings

**Expected Results**:
- [ ] Only ONE booking created (not two)
- [ ] Both submissions get success response
- [ ] Logs show both with different request IDs but same business+customer+date

**Why it works**:
- Idempotency key prevents second insert with identical data
- Both get success because same result = idempotent

---

### Test 5: Error Recovery - Missing Email Config
**Goal**: Verify clear error when email service down

**Setup**:
1. Temporarily unset RESEND_API_KEY (remove from environment or ask Supabase team)

**Steps**:
1. Submit booking
2. Observe error message
3. Re-enable RESEND_API_KEY
4. Try again

**Expected Results**:
- [ ] Error message: "Email service not configured. Please contact support."
- [ ] Booking NOT created (correct failure state)
- [ ] After re-enabling, booking succeeds

**Logs to Check**:
```
[SEND_EMAIL] trace_id=... error='RESEND_API_KEY not configured' status=503
```

---

### Test 6: Timezone Consistency
**Goal**: Verify times consistent across email and calendar

**Setup**:
1. Set environment variable `TIMEZONE=America/Los_Angeles`
2. (Or change to your local timezone)

**Steps**:
1. Create booking for 2:00 PM
2. Receive confirmation email
3. Check Google Calendar
4. Verify all show 2:00 PM (not adjusted)

**Expected Results**:
- [ ] Email shows: "2:00 PM" (or local time entered)
- [ ] Calendar event shows: "2:00 PM"
- [ ] Times match what customer entered

---

### Test 7: Payment Integration (If Enabled)
**Goal**: Verify booking works with payment enabled

**Setup**:
1. Enable booking payments in Settings
2. Set deposit or full payment
3. Configure Square

**Steps**:
1. Open booking form
2. Select service with price
3. Complete Square payment in modal
4. Submit booking
5. Verify booking has payment_status=paid

**Expected Results**:
- [ ] Payment processes successfully
- [ ] Booking created with payment_id
- [ ] All emails sent successfully
- [ ] Success modal shows payment amount

---

### Test 8: Observe Complete Trace
**Goal**: Verify distributed tracing works end-to-end

**Steps**:
1. Submit booking, note Reference ID
2. Open Supabase Dashboard
3. Go to Functions → Logs
4. Search for the Reference ID
5. Trace through all operations

**Expected Results**:
- [ ] Can see CREATE_BOOKING_START
- [ ] Can see SEND_BOOKING_CONFIRMATION_START
- [ ] Can see SEND_EMAIL_SUCCESS (2x - customer + admin)
- [ ] Can see CREATE_BOOKING_COMPLETE
- [ ] All logs show same trace_id
- [ ] Can reconstruct complete timeline

**Sample Log Output**:
```
12:34:56 [CREATE_BOOKING_START] trace_id=abc123 business_id=xyz
12:34:57 [CREATE_BOOKING_INSERTED] trace_id=abc123 booking_id=def456
12:34:58 [SEND_BOOKING_CONFIRMATION_CUSTOMER] trace_id=abc123 status=sending
12:34:59 [SEND_EMAIL_SUCCESS] trace_id=abc123 recipient=test@example.com
12:35:00 [SEND_BOOKING_CONFIRMATION_ADMIN] trace_id=abc123 status=sending
12:35:01 [SEND_EMAIL_SUCCESS] trace_id=abc123 recipient=admin@example.com
12:35:02 [CREATE_BOOKING_COMPLETE] trace_id=abc123 duration_ms=6000
```

---

## Monitoring Dashboard

### Key Metrics to Track

1. **Booking Success Rate**
   - Query: `[CREATE_BOOKING_COMPLETE]` with success=true
   - Target: > 99%

2. **Email Delivery Rate**
   - Query: `[SEND_EMAIL_SUCCESS]`
   - Target: 100% of customer + admin emails

3. **Calendar Sync Rate**
   - Query: `[CREATE_BOOKING_COMPLETE]` with calendar_synced=true
   - Target: 100% (when calendar connected)

4. **Error Categories**
   - Query: `[CREATE_BOOKING_FAILED]` - Booking creation errors
   - Query: `[CREATE_BOOKING_CALENDAR_ERROR]` - Calendar sync errors
   - Query: `[SEND_EMAIL_FAILED]` - Email delivery errors

5. **Response Time**
   - Look for `duration_ms` in `[CREATE_BOOKING_COMPLETE]`
   - Target: < 5000ms (5 seconds)

### Sample Monitoring Queries

**Resend Email Health**:
```
Filter: [SEND_EMAIL]
Status: Check for SUCCESS vs FAILED
Over time: Should be 100% SUCCESS
```

**Google Calendar Health**:
```
Filter: [CREATE_BOOKING_CALENDAR_SUCCESS]
Count: Should match number of bookings created
If < 100%: Check OAuth token validity
```

**Error Tracking**:
```
Filter: [CREATE_BOOKING_FAILED] OR [SEND_EMAIL_FAILED] OR [SEND_BOOKING_CONFIRMATION_ADMIN_SKIPPED]
Alert: Any instance should trigger investigation
```

---

## Troubleshooting Guide

### Symptom: Emails Not Received

**Check List**:
1. [ ] Admin email configured in Settings?
2. [ ] Check spam folder for test emails
3. [ ] Search logs for trace_id: Look for `[SEND_EMAIL_SUCCESS]` or `[SEND_EMAIL_FAILED]`
4. [ ] If FAILED: Check error message in logs
5. [ ] If SKIPPED: Admin email probably blank

**Log Search**:
```
# Search for your trace_id
Filter: [SEND_EMAIL]
Result: Should see SUCCESS for both customer and admin
```

---

### Symptom: Calendar Event Not Created

**Check List**:
1. [ ] Google Calendar connected? (Check GoogleCalendarTab)
2. [ ] OAuth tokens valid? (Try refreshing Google Calendar connection)
3. [ ] Calendar ID correct? (Usually "primary" is fine)
4. [ ] Timezone set correctly?

**Log Search**:
```
Filter: [CREATE_BOOKING_CALENDAR_SUCCESS]
# Should see this if working

Filter: [CREATE_BOOKING_CALENDAR_ERROR]
# If event not created, check error here
```

---

### Symptom: "Email Service Not Configured" Error

**Fix**:
1. [ ] Contact Supabase support to verify RESEND_API_KEY is set
2. [ ] Environment variable should be: `RESEND_API_KEY=re_xxxxx...`
3. [ ] Ask support team to restart functions after setting key
4. [ ] Retry booking

---

### Symptom: Duplicate Bookings Created

**Investigate**:
1. [ ] Check timestamps - are both within seconds of each other?
2. [ ] Same customer_name + email + date?
3. [ ] Likely cause: Network retry or accidental double-click
4. [ ] This should be prevented now; if still happening, report with trace_ids

---

## Performance Benchmarks

### Expected Response Times

| Operation | Expected Time | Max Acceptable |
|-----------|---------------|-----------------|
| Booking creation + emails | 3-5 seconds | 10 seconds |
| Email delivery to Resend | 200-500ms | 2 seconds |
| Google Calendar event creation | 500-1000ms | 3 seconds |
| Database insert | 50-200ms | 500ms |
| **Total flow** | **3-5 seconds** | **10 seconds** |

### If Slow

1. Check Supabase function logs for duration_ms
2. If calendar sync slow: Check Google API status
3. If email slow: Check Resend status page
4. If database slow: Check Supabase database logs

---

## Automated Testing (Future)

Would benefit from:
- Unit tests for email formatting
- Integration tests for create-booking → send-booking-confirmation → send-email flow
- Load tests to verify performance under high volume
- Replay tests using trace_ids to validate fixes

---

## Support Ticket Template

If customer reports issue, gather:

```
BOOKING ISSUE REPORT
====================

Reference ID: [from success screen]
Booking Date: [YYYY-MM-DD]
Customer Email: [email@example.com]
Business: [business name]

Issue: [Describe problem]
- [ ] Didn't receive email
- [ ] Calendar event missing
- [ ] Booking not created
- [ ] Other: ___________

Logs to check: Search Supabase for above Reference ID
Expected flow: See BOOKING_FLOW_FIXES_SUMMARY.md
```

With Reference ID, support can:
1. Search logs for complete trace
2. See exactly which step failed
3. Provide targeted fix
4. Reduce resolution time from hours to minutes

---

## Sign-Off Checklist

Before considering complete:

- [ ] Run Test 1 (Happy Path) - PASS
- [ ] Run Test 2 (No Admin Email) - PASS
- [ ] Run Test 3 (No Calendar) - PASS
- [ ] Run Test 4 (Duplicate Prevention) - PASS
- [ ] Confirm emails arrive within 30 seconds
- [ ] Confirm Google Calendar event appears within 1 minute
- [ ] Confirm admin notified of all bookings
- [ ] Confirm Reference ID visible on success screen
- [ ] Confirm logs show complete trace
- [ ] Confirm no silent failures

Once all checks pass, booking flow is production-ready.
