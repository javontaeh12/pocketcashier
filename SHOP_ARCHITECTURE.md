# Shop Feature Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUBLIC BUSINESS PAGE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ShopDisplay Component (if shop_enabled)                      │   │
│  │ - Fetches products from database                             │   │
│  │ - Displays product grid (responsive)                         │   │
│  │ - Product cards with image, price, add button                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ useShopCart() Hook                                           │   │
│  │ - Stores items in ShopCartContext                            │   │
│  │ - Manages quantity, add/remove operations                    │   │
│  │ - Calculates subtotal                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↓                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ShopCheckout Modal                                           │   │
│  │ - Customer form (name, email, phone)                         │   │
│  │ - Card details input (test: 4532 1488 0343 6467)            │   │
│  │ - Order summary with tax (8%) calculation                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                        CHECKOUT FLOW
                              ↓
         ┌────────────────────────────────────────┐
         │ 1. CREATE ORDER (create-shop-order)    │
         │    - Creates draft shop_orders record  │
         │    - Creates shop_order_items records  │
         │    - Returns orderId + idempotency_key │
         └────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │ 2. PROCESS PAYMENT                      │
         │    (process-shop-payment)              │
         │    - Sends to Square Payments API      │
         │    - Uses idempotency key              │
         │    - Updates order status: "paid"      │
         │    - Stores square_payment_id          │
         │    - Triggers email notification       │
         └────────────────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │ 3. SEND EMAILS (send-shop-order-email) │
         │    - Customer: order confirmation      │
         │    - Admin: new order alert            │
         │    - Uses Resend API                   │
         └────────────────────────────────────────┘


## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   businesses     │  │    products      │                 │
│  ├──────────────────┤  ├──────────────────┤                 │
│  │ id (PK)          │  │ id (PK)          │                 │
│  │ name             │  │ business_id (FK) ├─── ONE TO MANY │
│  │ is_active        │  │ name             │                 │
│  │ slug             │  │ price_cents      │                 │
│  │ user_id (owner)  │  │ image_path       │                 │
│  └──────────────────┘  │ is_active        │                 │
│         ▲              └──────────────────┘                 │
│         │                                                    │
│         └─────────────────┐                                 │
│                           │ ONE TO MANY                     │
│  ┌────────────────────────┴──────┐                          │
│  │      shop_settings            │                          │
│  ├───────────────────────────────┤                          │
│  │ id (PK)                       │                          │
│  │ business_id (FK, unique)      │                          │
│  │ shop_enabled (boolean)        │                          │
│  │ notification_email            │                          │
│  │ order_prefix                  │                          │
│  └───────────────────────────────┘                          │
│                                                               │
│  ┌──────────────────────────────┐                           │
│  │     shop_orders              │                           │
│  ├──────────────────────────────┤                           │
│  │ id (PK)                      │                           │
│  │ business_id (FK)             │ ONE TO MANY              │
│  │ customer_name                │                           │
│  │ customer_email               │                           │
│  │ status (paid|draft|...) ◄──┐ │                          │
│  │ subtotal_cents               │ │                          │
│  │ tax_cents                    │ │                          │
│  │ total_cents                  │ │                          │
│  │ square_payment_id            │ │                          │
│  │ idempotency_key (unique) ◄──┼─┤ IDEMPOTENCY PROTECTION │
│  │ paid_at                      │ │                          │
│  └──────────────────────────────┘ │                          │
│         ▲ ONE TO MANY             │                          │
│         │                          │                          │
│  ┌──────┴──────────────────────┐   │                          │
│  │   shop_order_items           │   │                          │
│  ├──────────────────────────────┤   │                          │
│  │ id (PK)                      │   │                          │
│  │ order_id (FK) ───────────────┼───┘                          │
│  │ product_id (FK)              │                           │
│  │ product_name (snapshot)      │                           │
│  │ unit_price_cents             │                           │
│  │ quantity                     │                           │
│  │ line_total_cents             │                           │
│  └──────────────────────────────┘                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## RLS Security Model

```
┌──────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY (RLS)                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  PUBLIC (Unauthenticated)                                    │
│  ├─ products: SELECT active products from active businesses │
│  └─ Cannot read orders or settings                           │
│                                                                │
│  AUTHENTICATED (Logged-in user = business admin)             │
│  ├─ products: INSERT, UPDATE, DELETE their business         │
│  ├─ products: SELECT their business products                │
│  ├─ shop_orders: SELECT their business orders               │
│  ├─ shop_orders: UPDATE their business orders (status)      │
│  ├─ shop_settings: FULL CRUD for their business             │
│  └─ Cannot access other businesses' data                     │
│                                                                │
│  SERVICE_ROLE (Edge Functions only)                          │
│  ├─ shop_orders: INSERT (create draft orders)               │
│  ├─ shop_order_items: INSERT (create order items)           │
│  └─ Used for: payment processing, email notifications       │
│                                                                │
│  BUSINESS ISOLATION:                                         │
│  All policies check:                                         │
│  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Payment Processing Flow (Detailed)

```
FRONTEND                          BACKEND                    THIRD PARTY
────────────────────────────────────────────────────────────────────────

Customer adds
products to cart
       │
       ├─► ShopCheckout modal
       │   opens
       │
       ├─► Customer enters:
       │   - Name, email, phone
       │   - Card details
       │   - Submits form
       │
       ├─► Generate idempotency_key
       │   (unique per transaction)
       │
       └─────┐
             │ POST create-shop-order
             │────────────────────────────────────► create-shop-order
             │                                       function
             │                                        │
             │                                        ├─► Validate fields
             │                                        │
             │                                        ├─► INSERT shop_orders
             │                                        │   status: "draft"
             │                                        │
             │                                        ├─► INSERT shop_order_items
             │                                        │   (for each product)
             │                                        │
             │                                        └─ Return orderId ◄──┐
             │◄───────────────────────────────────────────────────────────┘
             │
             ├─► POST process-shop-payment
             │────────────────────────────────────────► process-shop-payment
             │                                          function
             │                                           │
             │                                           ├─► Prepare Square request
             │                                           │   - cardNumber
             │                                           │   - amount_money
             │                                           │   - idempotency_key
             │                                           │
             │                                           └───────┐
             │                                                   │ HTTPS
             │                                                   ↓
             │                                        Square Payments API
             │                                        (https://connect.squareup.com)
             │                                                   │
             │                                        ◄──────────┤
             │                                        Returns:
             │                                        - payment.id
             │                                        - payment.status
             │                                        - receipt_url
             │
             │                                           │
             │                                           ├─► UPDATE shop_orders
             │                                           │   status: "paid"
             │                                           │   square_payment_id: X
             │                                           │   paid_at: NOW()
             │                                           │
             │                                           ├─► Queue email notification
             │                                           │   (async, non-blocking)
             │                                           │
             │◄─── Return { success: true }───────────────┘
             │
             ├─► Clear cart
             │
             ├─► Show success message
             │
             └─► User sees order confirmation


ASYNC EMAIL NOTIFICATION (runs in background)

send-shop-order-email function:
  │
  ├─► Fetch order details from DB
  │
  ├─► Fetch order items from DB
  │
  ├─► Fetch shop_settings
  │
  ├─► Generate customer email HTML
  │   - Order ID, date, items
  │   - Subtotal, tax, total
  │   - Payment confirmation
  │
  ├─► Generate admin email HTML
  │   - Customer info
  │   - Order items
  │   - Link to admin portal
  │
  ├─► Send customer email
  │   ──────────────────────────────────────► Resend API
  │                                          (orders@pocketcashiermobile.com)
  │
  └─► Send admin email
      ──────────────────────────────────────► Resend API
                                            (to notification_email)
```

## Admin Portal Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PORTAL (Private)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Shop Products Tab                                          │
│  ├─ Load: SELECT products WHERE business_id = ?            │
│  ├─ Create: INSERT product                                 │
│  ├─ Upload: Store image in business-assets bucket          │
│  ├─ Update: UPDATE product                                 │
│  └─ Delete: DELETE product                                 │
│         │                                                   │
│         └─────────────────┬──────────────────┐             │
│                           │                  ▼             │
│  Shop Orders Tab          │           Shop Settings Tab   │
│  ├─ Load: SELECT orders   │           ├─ Load: SELECT     │
│  │   WHERE business_id    │           │   shop_settings   │
│  ├─ Filter: By status     │           ├─ Enable shop      │
│  ├─ Expand: GET items     │           ├─ Set email        │
│  ├─ View: Customer info   │           └─ Set order_prefix │
│  │         Items breakdown │                               │
│  │         Totals          │                               │
│  │         Payment ID      │                               │
│  └─ Update: PATCH status   │                               │
│                            │                               │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
                      Supabase Database
                      (with RLS policies)
```

## Idempotency & Retry Safety

```
RETRY SCENARIO: Network fails, user refreshes, tries again

Attempt 1:
  idempotency_key = "shop-1705321234-abc123def456"
  ├─► create-shop-order
  │   └─ INSERT (shop_order_id: 111)
  ├─► process-shop-payment
  │   ├─ Square API (returns payment_id: 222)
  │   └─ UPDATE shop_orders (status: paid, square_payment_id: 222)
  └─ Network fails before response reaches client

User refreshes/retries with SAME idempotency_key

Attempt 2 (Retry):
  idempotency_key = "shop-1705321234-abc123def456"
  ├─► create-shop-order
  │   └─ UNIQUE constraint (business_id, idempotency_key)
  │      → Prevents duplicate INSERT
  │      → Returns existing order_id: 111
  ├─► process-shop-payment
  │   ├─ Square API (sees idempotency_key already used)
  │   │  → Returns existing payment_id: 222
  │   │  → Does NOT create duplicate charge
  │   └─ UPDATE uses same payment data
  └─ Success! Order shown to user

Result:
  ✓ One order created (not two)
  ✓ One charge to customer (not two)
  ✓ Idempotency working correctly
```

## Multi-Tenancy Isolation

```
Business A                          Business B
┌──────────────┐                   ┌──────────────┐
│ admin@a.com  │                   │ admin@b.com  │
│ user_id: AAA │                   │ user_id: BBB │
└──────────────┘                   └──────────────┘
       │                                  │
       ├─ Can manage                      └─ Can manage
       │  - Products (business_a)            - Products (business_b)
       │  - Orders (business_a)              - Orders (business_b)
       │  - Settings (business_a)            - Settings (business_b)
       │
       ├─ Cannot access                 Cannot access
       │  - Business B's products           - Business A's products
       │  - Business B's orders             - Business A's orders
       │  - Business B's settings           - Business A's settings
       │
       └─ RLS Policies Enforce:
          business_id IN (
            SELECT id FROM businesses
            WHERE user_id = auth.uid()
          )
```

---

## Key Design Decisions

### 1. Amounts in Cents (Integers)
- **Why**: Avoid floating-point precision errors
- **Example**: $19.99 stored as `1999` (cents)
- **Calculation**: display_price = amount_cents / 100

### 2. Service Role Only for Payments
- **Why**: Prevents client-side order manipulation
- **How**: Edge functions handle all payment logic
- **Benefit**: Security, single source of truth

### 3. Idempotency Key Uniqueness
- **Why**: Prevent duplicate charges and orders on retries
- **Database**: UNIQUE(business_id, idempotency_key) constraint
- **Square**: Also uses idempotency key for payment deduplication

### 4. Draft Status Before Payment
- **Why**: Can track checkout flow, recover abandoned orders
- **Flow**: draft → pending_payment → paid → fulfilled
- **Benefit**: Clear order lifecycle

### 5. Snapshot of Product Data
- **Why**: Historical accuracy of order items
- **How**: Store product_name, unit_price at purchase time
- **Benefit**: Orders accurate even if product is later deleted

### 6. Non-blocking Email Notification
- **Why**: Payment response shouldn't wait for email
- **How**: Edge function triggers async, returns before completion
- **Benefit**: Fast checkout experience, reliable emails

