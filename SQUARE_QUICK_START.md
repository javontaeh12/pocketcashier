# Square Developer Token - Quick Start

## 30-Second Overview

✅ **What it does:** All Square payments now use a single developer token stored in Supabase secrets (not the database).

✅ **Security:** Tokens never touch the client. All payments processed server-side in edge functions.

✅ **Setup:** 3 steps → 5 minutes

---

## 3-Step Setup

### Step 1: Get Token from Square (2 min)

```
Square Developer Dashboard
→ Credentials tab
→ Copy "Access Token" (looks like sq0atp_...)
```

### Step 2: Set Secret in Supabase (2 min)

```bash
supabase secrets set SQUARE_ACCESS_TOKEN="sq0atp_..."
supabase secrets set SQUARE_ENV="production"
```

Or use Supabase Dashboard → Functions → Manage Secrets

### Step 3: Configure Business Location ID (1 min)

```
Business Admin Panel
→ Settings → "Square Location Setup"
→ Enter Location ID (from Square Dashboard)
→ Save
```

---

## What Changed

| What | Before | Now |
|------|--------|-----|
| Token Storage | Database | Secrets (not in DB) |
| Where Tokens Used | Database queries | Edge function env vars |
| OAuth Flow | Yes | No |
| Client Sees Token | No | Still no |
| Token Security | Medium | High |

---

## Key Files

| File | Purpose |
|------|---------|
| `_shared/square-client.ts` | Reusable Square API client |
| `process-square-payment/index.ts` | Payment processing (uses client) |
| `SettingsTab.tsx` | UI (now simplified) |
| `SQUARE_DEVELOPER_TOKEN_SETUP.md` | Full setup guide |

---

## Test It

```
1. Log in as business
2. Go to Settings → enter Location ID
3. Create test order
4. Checkout → use test card:
   4532 0156 4006 6335 (any exp, any CVC)
5. Should succeed!
```

---

## Common Issues

| Issue | Fix |
|-------|-----|
| "SQUARE_ACCESS_TOKEN not set" | Run: `supabase secrets set SQUARE_ACCESS_TOKEN="..."` |
| Payment fails with "location not found" | Go to Settings, enter Square Location ID |
| Getting sandbox token mixed up | Verify `SQUARE_ENV="sandbox"` matches token source |

---

## Architecture at a Glance

```
Client → sends order data → Edge Function
                                ↓
                        reads SQUARE_ACCESS_TOKEN
                        from Deno.env
                                ↓
                        calls Square API
                                ↓
                        records in database
                        sends receipt
                                ↓
Client ← returns payment ID ← Edge Function
```

**Key point:** Token never exposed to client.

---

## For More Details

See full docs:
- Setup guide: `SQUARE_DEVELOPER_TOKEN_SETUP.md`
- Refactor details: `SQUARE_REFACTOR_SUMMARY.md`
- API reference: `supabase/functions/_shared/square-client.ts`

