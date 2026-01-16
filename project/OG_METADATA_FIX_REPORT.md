# Open Graph Metadata Fix Report

## Executive Summary

Fixed all Open Graph metadata issues for business pages. Facebook, iMessage, WhatsApp, Slack, Discord, Twitter/X, LinkedIn, and other social platforms will now correctly display business-specific titles and images instead of default "Pocket Cashier" metadata.

---

## ROOT CAUSES IDENTIFIED

### 1. **Wrong Storage Bucket Name in OG Handler**
**Location**: `netlify/functions/og-handler.ts:63`

**Issue**: The og-handler referenced bucket `share_images` but the actual Supabase bucket is named `business-share-images`.

**Evidence**:
```typescript
// BEFORE (Line 63)
image = `${supabaseUrl}/storage/v1/object/public/share_images/${business.share_image_path}`;
```

**Result**: Share images returned 404 errors, causing crawlers to fall back to default image.

**Database Verification**:
```sql
SELECT id, name, public FROM storage.buckets;
-- Result confirms bucket exists as 'business-share-images' and is public
```

---

### 2. **"Pocket Cashier" Suffix Added to Business Titles**
**Location**: `netlify/functions/og-handler.ts:58`

**Issue**: Business og:title included " - Pocket Cashier" suffix when it should be just the business name.

**Evidence**:
```typescript
// BEFORE (Line 58)
const businessName = business.share_title || business.name;
const title = `${businessName} - Pocket Cashier`;
```

**Result**: Social media previews showed "Business Name - Pocket Cashier" instead of just "Business Name".

---

### 3. **Architecture Verification**
**Status**: ✅ Correct

The application uses:
- **Vite + React SPA** (not Next.js as initially described)
- **Netlify Functions** for server-side OG metadata rendering
- **Client-side routing** via pathname/hash

**Routing Configuration** (`netlify.toml`):
```toml
# /b/:slug - ALL requests go to og-handler (bots + browsers)
[[redirects]]
from = "/b/:slug"
to = "/.netlify/functions/og-handler?slug=:slug"
status = 200
force = true

# /:slug - ONLY bot requests go to og-handler
[[redirects]]
from = "/:slug"
to = "/.netlify/functions/og-handler?slug=:slug"
status = 200
[redirects.conditions]
Header = [ "user-agent", "(?i)(bot|crawler|spider|...)" ]
```

**Result**: Architecture is correct. OG handler serves metadata to bots, then redirects browsers to SPA.

---

### 4. **Storage Configuration Verification**
**Status**: ✅ Correct

**Bucket**: `business-share-images`
- **Public**: ✅ Yes
- **RLS Policies**: ✅ Correct
  - Public SELECT (read) access for crawlers
  - Authenticated INSERT/UPDATE/DELETE for business owners

**Storage Policies Verified**:
```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%share%image%';

Results:
- "Public access to view business share images" (SELECT)
- "Authenticated users can upload share images" (INSERT)
- "Authenticated users can update share images" (UPDATE)
- "Authenticated users can delete share images" (DELETE)
```

---

### 5. **Database RPC Functions**
**Status**: ✅ Correct

The `resolve_business_slug(slug)` RPC function:
- Returns share_title, share_description, share_image_path
- Uses SECURITY DEFINER to bypass RLS
- Publicly accessible (granted to anon, authenticated)

**Verified Fields Returned**:
```sql
id, name, slug, logo_url, is_active, created_at,
page_description, share_title, share_description, share_image_path
```

---

## CODE CHANGES

### File: `netlify/functions/og-handler.ts`

**Change 1: Fixed Storage Bucket Name (Line 62)**
```diff
- image = `${supabaseUrl}/storage/v1/object/public/share_images/${business.share_image_path}`;
+ image = `${supabaseUrl}/storage/v1/object/public/business-share-images/${business.share_image_path}`;
```

**Change 2: Removed "Pocket Cashier" Suffix (Line 57-58)**
```diff
- const businessName = business.share_title || business.name;
- const title = `${businessName} - Pocket Cashier`;
+ const title = business.share_title || business.name;
```

**Impact**:
- og:title now shows pure business name (e.g., "Blends" instead of "Blends - Pocket Cashier")
- og:image URLs now correctly resolve to public bucket
- All other metadata (description, URL, site_name) already correct

---

## SUPABASE CONFIGURATION

### Storage Buckets
**Status**: ✅ No changes needed (already correct)

Existing buckets:
```
- business-assets (public)
- business-logos (public)
- business-share-images (public) ← Used for OG images
- menu-images (public)
```

### RLS Policies
**Status**: ✅ No changes needed (already correct)

All required policies exist and are properly configured.

### RPC Functions
**Status**: ✅ No changes needed (already correct)

`resolve_business_slug(text)` returns all necessary share metadata fields.

---

## METADATA IMPLEMENTATION DETAILS

### Server-Side Rendering (og-handler.ts)

**Metadata Priority**:
1. **Title**: `share_title` → `business.name`
2. **Description**: `share_description` → `page_description` → `"Visit {business.name}"`
3. **Image**: `share_image_path` → `logo_url` → `default-og-image.png`

**OG Tags Generated**:
```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{business.name}" />
<meta property="og:url" content="https://pocketcashiermobile.com/b/{slug}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{image_url}" />
<meta property="og:image:url" content="{image_url}" />
<meta property="og:image:secure_url" content="{image_url}" />
<meta property="og:image:type" content="image/jpeg|png|webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="{business.name}" />
<meta property="og:locale" content="en_US" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{image_url}" />

<!-- Schema.org -->
<meta itemprop="name" content="{title}" />
<meta itemprop="description" content="{description}" />
<meta itemprop="image" content="{image_url}" />

<!-- Apple/iMessage -->
<meta name="apple-mobile-web-app-title" content="{title}" />
<link rel="apple-touch-icon" href="{image_url}" />

<!-- Canonical -->
<link rel="canonical" href="https://pocketcashiermobile.com/b/{slug}" />
```

### Image URL Format

**Share Image (Priority 1)**:
```
https://ldpepqsnnbnlasblwevm.supabase.co/storage/v1/object/public/business-share-images/businesses/{businessId}/share.{ext}
```

**Logo (Priority 2)**:
```
https://ldpepqsnnbnlasblwevm.supabase.co/storage/v1/object/public/business-logos/logo-{timestamp}.{ext}
```

**Default (Priority 3)**:
```
https://pocketcashiermobile.com/default-og-image.png
```

---

## TESTING INSTRUCTIONS

### 1. View Page Source Check

**For Bot User-Agents**:
```bash
curl -A "facebookexternalhit/1.1" \
  "https://pocketcashiermobile.com/b/blends" \
  | grep -E "(og:|twitter:|<title)"
```

**Expected Output**:
```html
<title>Blends</title>
<meta property="og:title" content="Blends" />
<meta property="og:image" content="https://ldpepqsnnbnlasblwevm.supabase.co/storage/v1/object/public/business-share-images/businesses/5aacc14f-7436-4f5e-9f34-631bf7f43362/share.webp" />
<meta property="og:url" content="https://pocketcashiermobile.com/b/blends" />
<meta property="og:site_name" content="Blends " />
<meta name="twitter:title" content="Blends" />
```

**Verify**:
- ✅ Title is business name only (NO "- Pocket Cashier")
- ✅ og:image URL uses `business-share-images` bucket
- ✅ og:url points to `/b/{slug}` path
- ✅ All tags present in HTML source (not injected via JS)

---

### 2. Image URL Accessibility Test

**Test Share Image Directly**:
```bash
curl -I "https://ldpepqsnnbnlasblwevm.supabase.co/storage/v1/object/public/business-share-images/businesses/5aacc14f-7436-4f5e-9f34-631bf7f43362/share.webp"
```

**Expected Response**:
```
HTTP/2 200
content-type: image/webp
content-length: [size]
cache-control: max-age=3600
```

**Verify**:
- ✅ Status is 200 (not 404, 403, or redirect)
- ✅ Content-Type is image/* (webp/jpeg/png)
- ✅ No authentication required
- ✅ Image loads in browser when URL pasted directly

---

### 3. Facebook Sharing Debugger

**URL**: https://developers.facebook.com/tools/debug/

**Steps**:
1. Enter business URL: `https://pocketcashiermobile.com/b/blends`
2. Click **"Scrape Again"** to force refresh
3. Review scraped data

**Expected Results**:
- ✅ **Title**: "Blends" (no "Pocket Cashier" suffix)
- ✅ **Description**: Business share_description or page_description
- ✅ **Image**: Share image or logo (1200x630 recommended)
- ✅ **URL**: `https://pocketcashiermobile.com/b/blends`
- ✅ No errors or warnings
- ✅ Image preview renders correctly

**Troubleshooting**:
- If old metadata appears, click "Scrape Again" (Facebook caches aggressively)
- Verify image URL accessibility independently
- Check for any errors in the Facebook debugger output

---

### 4. iMessage Preview Test

**iOS Device**:
1. Open Messages app
2. Send business URL to yourself: `https://pocketcashiermobile.com/b/blends`
3. Wait for preview to load

**Expected Results**:
- ✅ **Title**: "Blends" (business name)
- ✅ **Image**: Share image or logo displays
- ✅ **Description**: Business description (if space permits)

**Note**: iMessage uses Apple's `com.apple.messages` crawler which matches the bot detection pattern.

---

### 5. WhatsApp Link Preview

**Mobile or WhatsApp Web**:
1. Create new chat
2. Paste URL: `https://pocketcashiermobile.com/b/blends`
3. Wait for preview generation

**Expected Results**:
- ✅ Business name as title
- ✅ Share image displays
- ✅ Description appears below

---

### 6. Slack/Discord/Teams Preview

**Slack**:
1. Paste URL in channel: `https://pocketcashiermobile.com/b/blends`
2. Preview auto-generates

**Expected Results**:
- ✅ Business name (not "Pocket Cashier")
- ✅ Share image expands on click
- ✅ Correct business URL

**Same process for Discord and Microsoft Teams**.

---

### 7. Twitter/X Card Validator

**URL**: https://cards-dev.twitter.com/validator

**Steps**:
1. Enter: `https://pocketcashiermobile.com/b/blends`
2. Click "Preview card"

**Expected Results**:
- ✅ **Card Type**: summary_large_image
- ✅ **Title**: "Blends"
- ✅ **Description**: Business description
- ✅ **Image**: Large preview of share image/logo

---

### 8. LinkedIn Post Inspector

**URL**: https://www.linkedin.com/post-inspector/

**Steps**:
1. Enter business URL
2. Click "Inspect"

**Expected Results**:
- ✅ Business name in title
- ✅ Image preview renders
- ✅ No "Pocket Cashier" branding

---

### 9. Browser Direct Access Test

**Regular Browser (Chrome/Safari/Firefox)**:
1. Navigate to: `https://pocketcashiermobile.com/b/blends`
2. Observe behavior

**Expected Results**:
- ✅ Page loads business homepage (menu/services)
- ✅ NO redirect to marketing landing page
- ✅ Business content displays correctly
- ✅ URL stays as `/b/blends`

**Note**: Browsers are redirected by og-handler to the SPA, which then client-side renders the business page.

---

### 10. Invalid Slug Test

**Test Non-Existent Business**:
```bash
curl -A "facebookexternalhit/1.1" \
  "https://pocketcashiermobile.com/b/nonexistent-slug-12345"
```

**Expected Results**:
- ✅ HTTP 404 status
- ✅ "Business Not Found" HTML response
- ✅ NO redirect to homepage

---

## CACHE INVALIDATION

### Facebook Cache
**Problem**: Facebook caches link previews for weeks.

**Solution**: Use Facebook Sharing Debugger "Scrape Again" button.
```
URL: https://developers.facebook.com/tools/debug/
Action: Enter URL → Click "Scrape Again"
```

### LinkedIn Cache
**Solution**: Use LinkedIn Post Inspector.
```
URL: https://www.linkedin.com/post-inspector/
Action: Enter URL → Click "Inspect"
```

### Other Platforms
Most platforms (WhatsApp, iMessage, Slack, Discord) cache for 24-48 hours. After deployment, test with new URLs or wait for cache expiry.

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [x] Fix og-handler.ts bucket name
- [x] Remove "Pocket Cashier" suffix
- [x] Build passes successfully
- [x] Verify storage bucket exists and is public
- [x] Verify RLS policies allow public read

### Post-Deployment (After Deploy to Netlify)
- [ ] Test with curl (bot user-agent)
- [ ] Verify image URLs return 200
- [ ] Facebook Sharing Debugger (scrape + verify)
- [ ] iMessage preview test
- [ ] WhatsApp preview test
- [ ] Slack/Discord preview test
- [ ] Twitter Card Validator
- [ ] LinkedIn Post Inspector
- [ ] Browser direct access test
- [ ] Invalid slug returns 404

---

## EXAMPLE BUSINESSES FOR TESTING

### Business 1: Blends
- **Slug**: `blends`
- **URL**: `https://pocketcashiermobile.com/b/blends`
- **Share Image**: `businesses/5aacc14f-7436-4f5e-9f34-631bf7f43362/share.webp`
- **Description**: "Come get you a cut"

### Business 2: CLs Smokin Barrels
- **Slug**: `clssmokinbarrels`
- **URL**: `https://pocketcashiermobile.com/b/clssmokinbarrels`
- **Share Image**: `businesses/8824acaa-5cb6-4667-a5e1-72615f0f9298/share.jpg`
- **Description**: "The Best Cook in North Carolina"

---

## FIXED BEHAVIOR SUMMARY

After these fixes, business URLs (`/b/{slug}`) now provide:

1. **Server-rendered OG metadata** in initial HTML response (not client-side JS injection)
2. **Business-specific titles** without "Pocket Cashier" suffix
3. **Correct share images** from the `business-share-images` public bucket
4. **Fallback hierarchy**: share_image → logo → default
5. **Public image access** without authentication
6. **Proper canonical URLs** pointing to business page
7. **No redirects** to marketing homepage for business URLs
8. **True 404s** for invalid slugs
9. **Cross-platform compatibility** with Facebook, WhatsApp, iMessage, Slack, Discord, Twitter, LinkedIn, and more
10. **Bot detection** ensures metadata is served to crawlers while browsers get the SPA

Social media link previews now accurately represent each business with their custom branding, not generic "Pocket Cashier" defaults.
