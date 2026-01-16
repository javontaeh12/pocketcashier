# Production Booking Flow Diagnostics & Fixes

## What I Found

### Root Causes Identified

1. **Silent Failures in send-email Function**
   - Line 26-37 in `send-email/index.ts`: Returns HTTP 200 with `success: false` when `RESEND_API_KEY` is not configured
   - Calling functions (`send-booking-confirmation`) cannot distinguish between success and failure
   - No retry mechanism; booking appears successful to client even if emails never sent

2. **Missing Admin Email Validation**
   - `send-booking-confirmation/index.ts` line 386-394: Gracefully handles null `admin_email` but does NOT warn admin
   - If admin email is blank in settings, admin notification silently skips
   - No logging to indicate admin email was not found

3. **Duplicate Calendar Event Failures**
   - Two different code paths attempt to create calendar events:
     - Path A: `create-booking` → `createCalendarEvent()` (embedded function)
     - Path B: `create-booking` → `create-google-calendar-event` (separate function call)
   - Path B is called but Path A code exists (dead code or legacy?)
   - If both execute, could create duplicate calendar events

4. **No Idempotency Keys**
   - Booking table has NO unique constraint on (business_id, customer_email, booking_date)
   - Retry or double-submit creates duplicate bookings
   - Duplicate calendar events and duplicate emails sent

5. **Error Swallowing in create-booking**
   - Line 156-178 in `create-booking/index.ts`: Email send failures do NOT block booking response
   - Client receives `success: true` even if both emails failed
   - No indication to client that notifications failed

6. **Timezone Inconsistency**
   - `create-google-calendar-event/index.ts` line 178: Falls back to 'UTC' (should be 'America/New_York')
   - `send-booking-confirmation/index.ts` line 39-57: Uses browser locale (client-side timezone)
   - If admin and customer are in different timezones, booking shows wrong times in calendar

7. **No Correlation IDs for Tracing**
   - No booking reference ID visible in logs across functions
   - Cannot trace a single booking creation through all steps (create → calendar → email)
   - Makes production debugging nearly impossible

8. **Weak HTTP Response Handling**
   - All edge functions return HTTP 200 even on failure
   - Client cannot distinguish success from failure using HTTP status code
   - Calling functions must inspect JSON response body

### Contributing Issues

- **Missing environment variable validation**: No startup check that RESEND_API_KEY exists
- **No audit logging**: No record of which emails succeeded/failed
- **Calendar event not deleted on booking cancellation**: `delete-calendar-event` function exists but never called
- **Payment flow loose coupling**: `processSquarePayment` result not validated before booking creation
- **Timezone hardcoding**: Business timezone not customizable

---

## Fixes to Implement

1. ✓ Add structured logging with correlation IDs to all functions
2. ✓ Refactor send-email to fail hard and return proper HTTP status
3. ✓ Add admin email validation with fallback notification method
4. ✓ Remove duplicate calendar event creation code
5. ✓ Add idempotency key migration
6. ✓ Add transaction-like consistency to booking creation
7. ✓ Enhance error responses sent to client
8. ✓ Add booking tracking/audit table for observability

---

## Testing Strategy

- Manual: Submit booking, check email received, verify calendar event
- Manual: Submit duplicate request within 5 seconds, verify no duplicate booking
- Manual: Disable admin email, verify graceful handling
- Logs: Search Supabase function logs for correlation ID across all functions
- Database: Verify no duplicate bookings for same customer/date

