# iMessage & Copy/Paste URL Preview Fix

## Problem Identified

**Symptom**:
- ✅ **Direct share from Safari** → Shows correct business name and image
- ❌ **Copy/paste URL into iMessage** → Shows "Pocket Cashier" default title/image

## Root Cause

When you **copy/paste a URL** into iMessage (or other messaging apps), the app's **link preview crawler** makes a fresh HTTP request to fetch the page metadata.

The issue was:

1. **Missing User-Agent Patterns**: The Netlify redirect rules only triggered for specific crawler user-agents. We were missing:
   - `AppleCoreMedia` - iOS link preview service
   - `com.apple.messages.URLPreviewService` - iMessage's specific crawler
   - `MessagesLinkPreview` - Various iOS versions
   - Generic `Preview` and `LinkPreview` patterns

2. **Conditional Routing**: The `/b/:slug` route only went to og-handler for **known crawlers**. If iMessage used an unrecognized user-agent, it got the default `index.html` with "Pocket Cashier" branding.

## Solution Implemented

### 1. Added Comprehensive Crawler Detection

**File**: `netlify.toml` and `netlify/functions/og-handler.ts`

Added missing user-agents:
- `AppleCoreMedia` - iOS media preview
- `com\.apple` - Apple services (escaped dot)
- `iPhone.*MessagesLinkPreview` - iMessage on iPhone
- `MessagesLinkPreview` - iMessage crawler
- `Preview` - Generic preview services
- `LinkPreview` - Generic link preview crawlers
- `WhatsApp-Preview` - WhatsApp preview service

### 2. Force All `/b/:slug` Through og-handler

**File**: `netlify.toml:8-12`

Changed from conditional redirect to **forced redirect**:
```toml
[[redirects]]
from = "/b/:slug"
to = "/.netlify/functions/og-handler?slug=:slug"
status = 200
force = true  # ← KEY CHANGE: Always use og-handler, not just for crawlers
```

This ensures:
- **Crawlers** → Get HTML with metadata (no redirect)
- **Regular browsers** → Get HTML with metadata + instant redirect script → SPA loads
- **All unknown user-agents** → Guaranteed to see business metadata

## How It Works Now

### When You Paste URL in iMessage:

1. You paste: `https://yourdomain.com/b/my-business`
2. iMessage's crawler requests the URL
3. Netlify **forces** the request to og-handler (regardless of user-agent)
4. og-handler:
   - Queries business by slug using `resolve_business_slug()` RPC
   - Returns HTML with:
     - `<title>Business Name</title>` ✅
     - `<meta property="og:title" content="Business Name">` ✅
     - `<meta property="og:image" content="business-image-url">` ✅
5. iMessage reads the metadata and displays correct preview ✅

### When Regular User Visits:

1. User navigates to: `https://yourdomain.com/b/my-business`
2. Netlify routes to og-handler
3. og-handler detects NOT a bot → includes redirect script
4. Browser immediately redirects to same URL, but now SPA handles routing
5. User sees business page with menu/services

## Testing Instructions

### Test 1: Copy/Paste in iMessage (Primary Fix)

**Before Fix**: Would show "Pocket Cashier"
**After Fix**: Should show business name and image

1. Open Notes app on iPhone
2. Type your business URL: `https://yourdomain.com/b/your-slug`
3. Copy the URL
4. Open Messages app
5. Paste URL into a conversation
6. **Wait 2-5 seconds** for preview to load
7. ✅ Should show: Business name, description, and custom image

### Test 2: Force Refresh iMessage Cache

If you've already pasted the URL before and it's cached:

1. Delete the message with the old preview
2. Wait 30 seconds
3. Paste URL again as new message
4. Should now show correct preview

### Test 3: Test with curl (Simulates Crawler)

```bash
# Simulate iMessage crawler
curl -A "AppleCoreMedia/1.0" \
  "https://yourdomain.com/b/your-slug" \
  | grep -E '<title>|og:title|og:image'
```

Should return:
```html
<title>Your Business Name</title>
<meta property="og:title" content="Your Business Name" />
<meta property="og:image" content="https://...supabase.co/storage/v1/object/public/business-share-images/..." />
```

### Test 4: Test Regular Browser (Should Still Work)

1. Open browser in incognito mode
2. Visit: `https://yourdomain.com/b/your-slug`
3. Should redirect instantly and show business page
4. Check tab title - should show business name

### Test 5: Test Other Messaging Apps

**WhatsApp**:
1. Open WhatsApp
2. Paste business URL in chat
3. Should show business preview

**Facebook Messenger**:
1. Open Messenger
2. Paste business URL
3. Should show business preview

**Slack**:
1. Paste URL in Slack channel
2. Should unfurl with business info

## Changes Made

### File: `netlify.toml`

**Lines 6-12**: Added `force = true` to `/b/:slug` redirect
**Lines 20**: Updated user-agent regex to include:
- `AppleCoreMedia`
- `com\.apple`
- `iPhone.*MessagesLinkPreview`
- `MessagesLinkPreview`
- `Preview`
- `LinkPreview`

### File: `netlify/functions/og-handler.ts`

**Line 16**: Updated bot detection regex to match expanded user-agent list

## Why Direct Share from Safari Works

**Direct Share** (works before fix):
- Safari already has the page loaded in memory
- When you tap Share → iMessage, Safari may pass metadata directly
- OR Safari's preview service fetches with a recognized user-agent
- The client-side `MetaTags` component has already updated the metadata

**Copy/Paste** (broken before fix):
- Fresh HTTP request from iMessage's crawler
- Must fetch URL from scratch
- No client-side JavaScript has run yet
- Relies 100% on server-rendered HTML response
- If user-agent not detected → gets default `index.html`

## Verification After Deploy

After deploying to Netlify:

1. **Clear iMessage cache**: Delete old messages with the URL
2. **Wait**: Give iMessage 30-60 seconds to clear internal cache
3. **Test paste**: Copy URL from Notes, paste into iMessage
4. **Check tab title**: Visit URL in browser, verify tab shows business name

## Common Issues

### Issue: Still showing "Pocket Cashier" after fix

**Causes**:
1. **Cache not cleared**: iMessage aggressively caches previews
2. **Old deployment**: Netlify hasn't deployed the new rules yet
3. **Wrong URL**: Using `/:slug` instead of `/b/:slug`

**Solutions**:
1. Delete old messages and wait 60 seconds
2. Check Netlify deploy log - ensure latest deploy succeeded
3. Use the canonical `/b/:slug` URL format
4. Test with curl to verify server response

### Issue: Browser gets stuck on og-handler HTML

**Cause**: Redirect script not executing

**Solution**:
- Clear browser cache
- Check JavaScript console for errors
- Verify og-handler includes redirect script for non-bots

### Issue: 404 error when pasting URL

**Cause**: Business slug doesn't exist or is inactive

**Solution**:
- Verify slug exists in database: `SELECT slug FROM businesses WHERE slug = 'your-slug'`
- Check `is_active = true`
- Test with curl to see exact error

## Performance Impact

**Before**:
- Crawlers → 1 request (if user-agent detected) or 1 request + fallback (if not)
- Browsers → 1 request (direct to index.html)

**After**:
- Crawlers → 1 request (always og-handler)
- Browsers → 1 request (og-handler) + instant client-side redirect (no extra server request)

The redirect happens in JavaScript (`<script>window.location.href = '...'</script>`) so it's instant and doesn't require a round-trip to the server.

## Additional Notes

- The `force = true` parameter ensures `/b/:slug` **always** uses og-handler, regardless of any other rules
- The `/:slug` pattern (without `/b/` prefix) still uses conditional crawler detection
- Both patterns now support the expanded user-agent list
- The og-handler serves different HTML based on whether the request is from a bot:
  - **Bot**: Metadata only (no redirect script)
  - **Browser**: Metadata + redirect script

## Rollback Plan

If issues occur, you can rollback by removing `force = true`:

```toml
[[redirects]]
from = "/b/:slug"
to = "/.netlify/functions/og-handler?slug=:slug"
status = 200
# Remove: force = true

[redirects.conditions]
Header = [ "user-agent", "..." ]  # Restore conditional routing
```

This reverts to the previous behavior where only detected crawlers use og-handler.
