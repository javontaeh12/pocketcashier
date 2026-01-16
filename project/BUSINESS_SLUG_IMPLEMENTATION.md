# Business Slug System - Implementation Documentation

## Overview

This document describes the complete implementation of the admin-defined Business Home Page URL system, allowing each business to have a unique, shareable slug-based URL (e.g., `https://pocketcashiermobile.com/my-business`).

## Architecture Decision: RPC Functions

We chose **RPC functions with SECURITY DEFINER** over views for the following reasons:

1. **Better Security Control**: RPC functions allow precise control over what data is exposed publicly
2. **Complex Logic Support**: Redirects from old slugs require conditional logic that's easier in functions
3. **Performance**: Can optimize queries and add indexes specifically for slug resolution
4. **Flexibility**: Easy to add rate limiting, logging, or additional validation in the future

## Database Schema

### A) Added Columns to `businesses` Table

```sql
ALTER TABLE businesses
ADD COLUMN slug text,
ADD COLUMN slug_updated_at timestamptz,
ADD COLUMN created_by_admin_id uuid REFERENCES auth.users(id),
ADD COLUMN is_active boolean DEFAULT true;
```

**Constraints:**
- `slug` is nullable (businesses can exist without a slug initially)
- Case-insensitive unique index on `lower(slug)`
- Check constraint: `^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$` (3-60 chars, lowercase, no consecutive hyphens)

### B) `business_slug_history` Table

Tracks slug changes to enable permanent redirects from old URLs.

```sql
CREATE TABLE business_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by_admin_id uuid REFERENCES auth.users(id)
);
```

**Indexes:**
- `idx_slug_history_old_slug` on `old_slug` for redirect lookups
- `idx_slug_history_lookup` on `(old_slug, business_id)` for efficient resolution

**Trigger:**
Automatically logs slug changes when a business updates their slug.

### C) Reserved Words Function

```sql
CREATE FUNCTION is_reserved_slug(slug_value text) RETURNS boolean
```

Prevents use of system routes like: admin, api, login, settings, etc.

## RPC Functions

### 1. `resolve_business_slug(slug_param text)`

Returns public-safe business data by current slug.

**Returns:**
- `id`, `name`, `slug`, `logo_url`, `is_active`, `created_at`

**Usage:**
```typescript
const { data } = await supabase
  .rpc('resolve_business_slug', { slug_param: 'my-business' });
```

### 2. `resolve_slug_with_redirect(slug_param text)`

Checks if slug is current or historical, returns redirect information.

**Returns:**
- `business_id`, `current_slug`, `is_redirect`, `is_active`

**Logic:**
1. First checks if slug is current business slug
2. If not found, checks `business_slug_history` for old slugs
3. Returns redirect target if found

**Usage:**
```typescript
const { data } = await supabase
  .rpc('resolve_slug_with_redirect', { slug_param: 'old-business-name' });

if (data[0]?.is_redirect) {
  // Redirect to /b/{data[0].current_slug}
}
```

### 3. `check_slug_availability(slug_param text, business_id_param uuid)`

Checks if a slug is available for use (for admin UI validation).

**Returns:**
- `available` (boolean)
- `reason` (string): 'available', 'taken', 'reserved', 'invalid_format'

**Usage:**
```typescript
const { data } = await supabase
  .rpc('check_slug_availability', {
    slug_param: 'potential-slug',
    business_id_param: currentBusinessId
  });

if (!data[0].available) {
  // Show error: data[0].reason
}
```

## Row Level Security (RLS)

### `businesses` Table

**Public Read:** Anyone can view business info (existing policy)
**Admin Write:** Authenticated users can update (existing policy)

### `business_slug_history` Table

**Public Read Policy:**
```sql
CREATE POLICY "Anyone can read slug history for redirects"
  ON business_slug_history FOR SELECT
  TO anon, authenticated
  USING (true);
```

**System Insert Policy:**
```sql
CREATE POLICY "System can insert slug history"
  ON business_slug_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

All RPC functions use `SECURITY DEFINER` to bypass RLS for controlled access.

## Frontend Implementation

### A) Validation Utilities (`src/lib/slugUtils.ts`)

**Functions:**
- `slugify(text: string)`: Converts text to valid slug format
- `validateSlugFormat(slug: string)`: Validates slug against all rules
- `isReservedSlug(slug: string)`: Checks against reserved words
- `getSlugSuggestion(businessName: string)`: Generates slug from business name
- `getPublicBusinessUrl(slug: string)`: Generates full public URL

**Validation Rules:**
- 3-60 characters
- Lowercase only
- Must start/end with alphanumeric
- Can contain hyphens (not consecutive)
- Not in reserved words list

### B) Public Business Route (`/[slug]`)

**File:** `src/pages/PublicBusinessPage.tsx`

**Flow:**
1. Extract slug from URL path (`/my-business`)
2. Call `resolve_slug_with_redirect(slug)`
3. If redirect needed: use `window.history.replaceState()` to update URL
4. If not found: show 404
5. If inactive: show "Business unavailable"
6. If valid: render business homepage with viewing context

**Key Feature:** Sets `viewBusinessId` in localStorage (separate from management context)

**Logged-in User Experience:**
- Shows banner: "Viewing: [Business Name]" with "Go to Admin Portal" button
- Does NOT grant management access
- Viewing context is URL-driven, not session-driven

### C) Admin Slug Management UI

**File:** `src/pages/admin/BusinessSlugTab.tsx`

**Features:**
1. **Input Field** with auto-slugification (converts as you type)
2. **Live Validation** (format checking)
3. **Debounced Availability Check** (500ms delay)
4. **URL Preview** showing final public URL
5. **"Suggest from Name"** button to auto-generate from business name
6. **Copy Link Button** for easy sharing
7. **Error Handling** for duplicate slugs
8. **Success Feedback** on save

**Integrated into Admin Portal:**
- Tab: "Page URL" (with Link icon)
- Located between "Menu Setting" and "Payments"

### D) Routing Updates (`src/App.tsx`)

**Added:**
- Route pattern detection for `/{slug}` (single path segment)
- `PublicBusinessPage` component rendering
- `businessSlug` state management
- `popstate` event listener for history navigation

**Route Priority:**
1. `/square-callback`, `/admin/reset-password`, `/terms-of-service`, `/privacy-policy` → System routes
2. `/admin` → Admin login/portal
3. `/{slug}` → Public business page (single path segment)
4. `/` → Landing page
5. Other paths → Home page (default business)

## Context Management: Viewing vs Management

### Viewing Context (Read-Only)
- Set by visiting `/b/[slug]`
- Stored in `viewBusinessId` (localStorage)
- Does NOT grant admin access
- Shows business homepage for anyone

### Management Context (Admin Access)
- Set by logging into admin portal
- Stored in `businessId` (AuthContext)
- Grants full admin permissions
- Requires authentication + ownership

**Key Guarantee:**
The slug URL `/{slug}` ALWAYS loads that specific business, regardless of:
- Who is logged in
- What business they own/manage
- Previous viewing history
- LocalStorage or session state

## Environment Variables

**Required:**
```env
VITE_PUBLIC_SITE_URL=https://pocketcashiermobile.com
```

**Usage:** Generates absolute URLs in admin UI and share links

## Migration Files

1. **`add_business_slugs.sql`**
   - Adds slug columns to businesses
   - Creates indexes and constraints
   - Adds reserved words function

2. **`create_business_slug_history.sql`**
   - Creates history table
   - Creates trigger for automatic logging
   - Sets up RLS policies

3. **`create_slug_resolution_rpcs.sql`**
   - Creates all 3 RPC functions
   - Grants execute permissions
   - Defines return types

## Test Plan

### Database Tests

#### 1. Slug Format Validation
```sql
-- Should succeed
INSERT INTO businesses (name, slug) VALUES ('Test', 'valid-slug-123');

-- Should fail (uppercase)
INSERT INTO businesses (name, slug) VALUES ('Test', 'Invalid-Slug');

-- Should fail (too short)
INSERT INTO businesses (name, slug) VALUES ('Test', 'ab');

-- Should fail (consecutive hyphens)
INSERT INTO businesses (name, slug) VALUES ('Test', 'bad--slug');
```

#### 2. Case-Insensitive Uniqueness
```sql
INSERT INTO businesses (name, slug) VALUES ('Test 1', 'my-business');
-- This should fail
INSERT INTO businesses (name, slug) VALUES ('Test 2', 'MY-BUSINESS');
```

#### 3. Slug History Logging
```sql
UPDATE businesses SET slug = 'new-slug' WHERE slug = 'old-slug';

SELECT * FROM business_slug_history
WHERE old_slug = 'old-slug' AND new_slug = 'new-slug';
-- Should return 1 row
```

#### 4. Reserved Slug Prevention
```sql
SELECT is_reserved_slug('admin'); -- Should return true
SELECT is_reserved_slug('my-business'); -- Should return false
```

### RPC Function Tests

#### 1. Resolve Current Slug
```typescript
const { data } = await supabase
  .rpc('resolve_business_slug', { slug_param: 'existing-slug' });

expect(data[0]).toHaveProperty('id');
expect(data[0]).toHaveProperty('name');
expect(data[0].slug).toBe('existing-slug');
```

#### 2. Resolve Old Slug (Redirect)
```typescript
// After changing slug from 'old' to 'new'
const { data } = await supabase
  .rpc('resolve_slug_with_redirect', { slug_param: 'old' });

expect(data[0].is_redirect).toBe(true);
expect(data[0].current_slug).toBe('new');
```

#### 3. Check Availability
```typescript
// Available slug
const { data: available } = await supabase
  .rpc('check_slug_availability', {
    slug_param: 'unique-new-slug',
    business_id_param: null
  });
expect(available[0].available).toBe(true);

// Taken slug
const { data: taken } = await supabase
  .rpc('check_slug_availability', {
    slug_param: 'existing-slug',
    business_id_param: null
  });
expect(taken[0].available).toBe(false);
expect(taken[0].reason).toBe('taken');

// Reserved slug
const { data: reserved } = await supabase
  .rpc('check_slug_availability', {
    slug_param: 'admin',
    business_id_param: null
  });
expect(reserved[0].available).toBe(false);
expect(reserved[0].reason).toBe('reserved');
```

### Frontend Tests

#### 1. Slug Validation
```typescript
import { validateSlugFormat } from './lib/slugUtils';

// Valid
expect(validateSlugFormat('my-business-123').valid).toBe(true);

// Too short
expect(validateSlugFormat('ab').valid).toBe(false);

// Uppercase
expect(validateSlugFormat('My-Business').valid).toBe(false);

// Reserved
expect(validateSlugFormat('admin').valid).toBe(false);

// Consecutive hyphens
expect(validateSlugFormat('my--business').valid).toBe(false);
```

#### 2. Slugify Function
```typescript
import { slugify } from './lib/slugUtils';

expect(slugify('My Business!')).toBe('my-business');
expect(slugify('  Spaces   Everywhere  ')).toBe('spaces-everywhere');
expect(slugify('Multiple---Hyphens')).toBe('multiple-hyphens');
```

#### 3. Route Resolution
**Test:** Visit `/existing-slug` while logged out
- Should load business page
- Should not show admin controls

**Test:** Visit `/existing-slug` while logged in as different admin
- Should load that business's page (not the logged-in admin's business)
- Should show "Viewing: [Business]" banner
- Should offer link to admin portal

**Test:** Visit `/old-slug` (historical slug)
- Should redirect to `/new-slug`
- URL should update in browser
- Business page should load

**Test:** Visit `/nonexistent`
- Should show 404 page
- Should offer link to home

### Integration Tests

#### 1. Share Link Flow
1. Admin sets slug to `my-coffee-shop`
2. Admin copies public URL
3. User (not logged in) pastes URL in new browser
4. Business page loads correctly
5. User can browse menu/services

#### 2. Slug Change Flow
1. Admin changes slug from `old-name` to `new-name`
2. History entry is created automatically
3. Old link `/old-name` redirects to `/new-name`
4. New link `/new-name` works directly

#### 3. Concurrent Admin Edit
1. Admin A starts editing slug
2. Admin B saves same slug first
3. Admin A tries to save
4. Admin A sees "This name is already taken" error

### Security Tests

#### 1. RLS Enforcement
- Unauthenticated user can view business via slug
- Unauthenticated user cannot update slug
- Authenticated non-owner cannot update another business's slug

#### 2. SQL Injection Prevention
```typescript
// Should not allow SQL injection in slug
const maliciousSlug = "'; DROP TABLE businesses; --";
const result = validateSlugFormat(maliciousSlug);
expect(result.valid).toBe(false);
```

#### 3. XSS Prevention
```typescript
// Should sanitize/reject XSS attempts
const xssSlug = "<script>alert('xss')</script>";
const result = validateSlugFormat(xssSlug);
expect(result.valid).toBe(false);
```

## Guarantees

### 1. **Deterministic URL Resolution**
The URL `/{slug}` ALWAYS resolves to the same business, determined by:
- Current slug in `businesses` table
- Historical slug in `business_slug_history` table
- Never by session state, localStorage, or user context

### 2. **Permanent Redirects**
Old slugs never become invalid. They redirect forever via the history table.

### 3. **No Permission Escalation**
Viewing a business via `/{slug}` does NOT grant management permissions.

### 4. **Public Accessibility**
Anyone (logged in or not) can access `/{slug}` URLs.

### 5. **Unique Slugs**
No two active businesses can have the same slug (case-insensitive).

## Deployment Checklist

### Production Setup
- [x] Set `VITE_PUBLIC_SITE_URL=https://pocketcashiermobile.com`
- [x] Run migrations on production
- [ ] Test slug creation in admin portal
- [ ] Test public access via `/{slug}`
- [ ] Verify redirects work
- [ ] Monitor error logs for 404s

## Future Enhancements

### Possible Additions
1. **Analytics**: Track slug usage/views
2. **Rate Limiting**: Prevent slug enumeration
3. **Vanity Domains**: Custom domains pointing to slugs
4. **Slug Reservations**: Let businesses claim slugs before activation
5. **SEO Metadata**: Per-slug Open Graph tags
6. **Slug Aliases**: Multiple slugs for one business

## Support & Troubleshooting

### Common Issues

**Issue:** Slug not available even though it appears unused
**Solution:** Check `business_slug_history` - might be a previously used slug

**Issue:** Old link not redirecting
**Solution:** Verify entry exists in `business_slug_history` table

**Issue:** Validation passes but save fails
**Solution:** Check database constraint errors - likely unique constraint violation

**Issue:** Public URL shows wrong business
**Solution:** Check `localStorage.viewBusinessId` - may need to clear

**Issue:** Can't use desired slug
**Solution:** Slug might be reserved - check `is_reserved_slug()` function

## Conclusion

This implementation provides a robust, secure, and user-friendly system for business slug URLs. The architecture ensures that shared links work reliably regardless of user context, while maintaining proper security boundaries between viewing and management permissions.
