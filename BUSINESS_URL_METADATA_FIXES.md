# Business URL Title & Share Metadata Fixes

## Summary
Fixed business page URLs to show correct titles, Open Graph metadata, and share images for social media crawlers.

## Root Causes Fixed

### 1. Wrong Database Field Name
**File**: `netlify/functions/og-handler.ts:27-31`
- **Problem**: Queried `url_slug` instead of `slug`
- **Fix**: Now uses `resolve_business_slug()` RPC with correct field

### 2. Missing Share Fields
**File**: `netlify/functions/og-handler.ts`
- **Problem**: Didn't query `share_title`, `share_description`, `share_image_path`
- **Fix**: Updated RPC to return all share fields

### 3. Default "Pocket Cashier" Branding
**File**: `netlify/functions/og-handler.ts:42`
- **Problem**: Title included "- Pocket Cashier" suffix
- **Fix**: Now uses `share_title` or `business.name` only

### 4. Incomplete URL Pattern Support
**File**: `netlify.toml`
- **Problem**: Only handled `/:slug`, not `/b/:slug`
- **Fix**: Added redirect rule for `/b/:slug` pattern

### 5. Wrong Share Image URL
**File**: `src/pages/PublicBusinessPage.tsx:202`
- **Problem**: Used site URL instead of Supabase URL
- **Fix**: Now uses `VITE_SUPABASE_URL` for storage paths

## Code Changes

### Database Migration
**File**: `supabase/migrations/20260116000000_update_slug_rpcs_with_share_fields.sql`
```sql
-- Updated resolve_business_slug() to return:
-- - share_title
-- - share_description
-- - share_image_path
-- - page_description
```

### Netlify Function
**File**: `netlify/functions/og-handler.ts`
- Now uses `resolve_business_slug()` RPC
- Title: `share_title || name` (no "Pocket Cashier" suffix)
- Description: `share_description || page_description || "Visit {name}"`
- Image: `share_image_path` from Supabase storage, fallback to `logo_url`
- Added canonical link tag
- Checks `is_active` status

### Netlify Configuration
**File**: `netlify.toml`
- Added `/b/:slug` redirect rule for crawlers
- Kept existing `/:slug` rule
- Both redirect to og-handler for crawler user-agents

### Frontend Component
**File**: `src/pages/PublicBusinessPage.tsx`
- Fixed share image URL to use Supabase URL
- Updated TypeScript interface to include share fields

## How It Works

### For Crawlers (Facebook, Twitter, iMessage, etc.)
1. Crawler requests `/b/my-business` or `/my-business`
2. Netlify detects crawler user-agent
3. Routes to `og-handler` Netlify function
4. Function queries business by slug using RPC
5. Returns server-rendered HTML with:
   - Correct `<title>`: Business name or custom share title
   - OG tags: Business-specific metadata
   - Twitter tags: Business-specific metadata
   - Canonical URL: Full business URL path

### For Regular Users
1. User visits `/b/my-business`
2. Netlify serves SPA (index.html)
3. React app loads and routes to PublicBusinessPage
4. Component uses MetaTags to update client-side metadata
5. Business page renders with menu/services

## Testing Instructions

### Test 1: Verify Crawler Response
```bash
# Replace YOUR_SUPABASE_URL and YOUR_BUSINESS_SLUG
curl -A "facebookexternalhit/1.0" \
  "https://YOUR_DOMAIN.netlify.app/b/YOUR_BUSINESS_SLUG" \
  | grep -E '(og:title|og:description|og:image|twitter:title|canonical)'
```

**Expected output should include:**
- `<title>YOUR_BUSINESS_NAME</title>` (NOT "Pocket Cashier")
- `<meta property="og:title" content="YOUR_BUSINESS_NAME"` or custom share title
- `<meta property="og:description"` with business description
- `<meta property="og:image"` with Supabase storage URL if share image set
- `<link rel="canonical" href="https://YOUR_DOMAIN/b/YOUR_SLUG"`

### Test 2: Test with Different URL Patterns
```bash
# Test /b/:slug pattern
curl -A "Twitterbot/1.0" "https://YOUR_DOMAIN/b/YOUR_SLUG"

# Test legacy /:slug pattern
curl -A "Twitterbot/1.0" "https://YOUR_DOMAIN/YOUR_SLUG"
```

Both should return business-specific metadata.

### Test 3: View Page Source in Browser
1. Open incognito window
2. Visit `https://YOUR_DOMAIN/b/YOUR_SLUG`
3. Wait for page to load
4. View page source (Ctrl+U / Cmd+U)
5. Search for `<meta property="og:title"`

**Note**: Client-rendered metadata won't be seen by crawlers but will update for SEO.

### Test 4: Share Link Previews

#### iMessage (iOS)
1. Open Messages app
2. Send message: `https://YOUR_DOMAIN/b/YOUR_SLUG`
3. Wait for preview to load
4. Should show: Business name, description, and image

#### Facebook Debugger
1. Go to https://developers.facebook.com/tools/debug/
2. Enter: `https://YOUR_DOMAIN/b/YOUR_SLUG`
3. Click "Scrape Again"
4. Verify shows business-specific data

#### Twitter Card Validator
1. Go to https://cards-dev.twitter.com/validator
2. Enter: `https://YOUR_DOMAIN/b/YOUR_SLUG`
3. Should show business card preview

### Test 5: Invalid Slug (404)
```bash
curl -A "facebookexternalhit/1.0" \
  "https://YOUR_DOMAIN/b/nonexistent-slug"
```

Should return 404 with "Business Not Found" message.

### Test 6: Inactive Business
Business with `is_active = false` should return 404 to public.

## Validation Checklist

- [ ] Business page URL shows correct business name in browser tab
- [ ] Sharing URL in iMessage shows business preview (not "Pocket Cashier")
- [ ] Facebook/Messenger preview shows business info
- [ ] Twitter preview shows business info
- [ ] Page source contains business-specific OG tags
- [ ] Canonical URL points to correct business path
- [ ] Custom share image displays if configured
- [ ] Logo displays if no share image set
- [ ] Invalid slugs return 404 (not redirect to homepage)
- [ ] Both `/slug` and `/b/slug` patterns work

## Environment Variables Required

Ensure these are set in Netlify:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `URL` - Your production domain (e.g., https://pocketcashiermobile.com)

## RLS Policies Verification

The following must allow anonymous access:
```sql
-- Verify these RPC functions are accessible
SELECT * FROM pg_proc
WHERE proname IN ('resolve_business_slug', 'resolve_slug_with_redirect');

-- Should show grants to 'anon' role
SELECT * FROM information_schema.routine_privileges
WHERE routine_name = 'resolve_business_slug';
```

## Troubleshooting

### Issue: Still seeing "Pocket Cashier" in previews
- **Cause**: Social platforms cache metadata aggressively
- **Fix**: Use platform's debug/scrape tool to force refresh
  - Facebook: https://developers.facebook.com/tools/debug/
  - Twitter: https://cards-dev.twitter.com/validator
  - LinkedIn: https://www.linkedin.com/post-inspector/

### Issue: Share image not loading
- **Check**: Image URL in page source
- **Verify**: Supabase storage bucket is public
- **Test**: Try accessing image URL directly in browser

### Issue: 404 for all business URLs
- **Check**: Netlify functions are deployed
- **Verify**: Environment variables are set in Netlify
- **Test**: Check function logs in Netlify dashboard

### Issue: Metadata works for crawlers but not visible in browser
- **Expected**: This is normal for SPAs
- **Note**: Crawlers see server-rendered HTML, users see React-rendered
- **Verify**: Use curl with crawler user-agent to test

## Additional Notes

- This is a **Vite + React SPA**, not Next.js SSR
- Metadata for crawlers is server-rendered via Netlify Functions
- Metadata for users is client-rendered via React (MetaTags component)
- Both URL patterns (`/slug` and `/b/slug`) are supported
- Old slugs redirect via `business_slug_history` table (handled by RPC)
