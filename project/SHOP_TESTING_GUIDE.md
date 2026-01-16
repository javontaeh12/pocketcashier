# Shop Feature Testing Guide

## Test Environment Setup

### Prerequisites
- Pocket Cashier app running locally or in Supabase
- Admin account already set up
- Supabase database with shop tables created
- Resend API key configured (for email tests)
- Square sandbox credentials configured

### Access Points
- **Admin Portal**: `http://localhost:5173#admin`
- **Public Business Page**: `http://localhost:5173/b/your-business-slug`

---

## 1. Product Management Testing

### Test 1.1: Create Product

**Steps:**
1. Go to Admin Portal → Shop Products tab
2. Click "Add Product"
3. Fill in form:
   - Name: "Test Coffee"
   - Description: "Delicious morning brew"
   - Price: "4.99"
   - Inventory: "100" (or leave blank)
   - Active: ✓ checked

**Expected Results:**
- Form saves successfully
- Product appears in list
- Price displays as "$4.99"
- Product appears on public page immediately

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.2: Upload Product Image

**Steps:**
1. In Shop Products tab, click "Add Product"
2. Complete form with product details
3. Locate image upload area
4. Upload a test image (JPG, PNG)
5. Save product

**Expected Results:**
- Image uploads to Supabase storage
- Image preview appears in product card
- Image loads on public shop display
- Image persists after refresh

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.3: Edit Product

**Steps:**
1. In Shop Products tab, find a product
2. Click "Edit" icon (pencil)
3. Change:
   - Name: Add " (Updated)" suffix
   - Price: Increase by $1.00
   - Description: Add text
4. Save

**Expected Results:**
- Changes save successfully
- Updated product displays in admin
- Changes visible on public page
- Edit form closes after save

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.4: Toggle Active Status

**Steps:**
1. Find a product in Shop Products
2. Click Edit
3. Uncheck "Active" checkbox
4. Save

**Expected Results:**
- Product marked as inactive in DB
- Product disappears from public shop display
- Admin can still see inactive products
- Can toggle back to active

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 1.5: Delete Product

**Steps:**
1. Find a product in Shop Products
2. Click delete icon (trash)
3. Confirm deletion in dialog

**Expected Results:**
- Product deleted from database
- Disappears from admin list
- Disappears from public page
- Cannot be recovered (no archive)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 2. Shop Display Testing

### Test 2.1: Product Grid Display

**Steps:**
1. Create 5 products with different details
2. Go to public business page
3. Scroll to Shop section
4. Observe product grid layout

**Expected Results:**
- Products display in responsive grid
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column
- Products show: image, name, price, add button
- Products ordered by creation date

**Actual Results:**
- [ ] Pass / [ ] Fail

**Device Testing:**
- [ ] Desktop (1920px) - 3 columns
- [ ] Tablet (768px) - 2 columns
- [ ] Mobile (375px) - 1 column

---

### Test 2.2: Product Details Display

**Steps:**
1. Look at product cards on public shop
2. Verify each product shows:
   - Product image (or placeholder)
   - Product name
   - Description (truncated if long)
   - Price in "$XX.XX" format
   - "Add" button

**Expected Results:**
- All fields displayed correctly
- Long descriptions truncated (line-clamp)
- Currency symbol and decimals correct
- Add button clickable

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 2.3: Product Images Load

**Steps:**
1. Upload products with images
2. Navigate to public shop page
3. Verify images load in product cards

**Expected Results:**
- Images display in product cards
- Images have proper aspect ratio
- Product placeholder shows if no image
- Images load within 2 seconds

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 3. Cart & Checkout Testing

### Test 3.1: Add Single Product to Cart

**Steps:**
1. Go to public shop
2. Find a product
3. Click "Add" button
4. Quantity input appears
5. Confirm with "Add" button in modal

**Expected Results:**
- Quantity selector appears
- Default quantity is 1
- Can change quantity up/down
- Confirm button initiates checkout

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.2: Add Multiple Products

**Steps:**
1. Add first product (qty: 2)
2. Return to shop
3. Add second product (qty: 1)
4. Add third product (qty: 3)
5. Checkout modal shows order summary

**Expected Results:**
- Checkout modal displays all items
- Shows correct quantities and prices
- Subtotal calculates correctly
- Tax shows 8% of subtotal
- Total = subtotal + tax

**Expected Totals:**
- If products are $4.99, $9.99, $2.99:
  - Item 1: $4.99 × 2 = $9.98
  - Item 2: $9.99 × 1 = $9.99
  - Item 3: $2.99 × 3 = $8.97
  - Subtotal: $28.94
  - Tax (8%): $2.32
  - Total: $31.26

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.3: Checkout Form Validation

**Steps:**
1. Add products to cart
2. Checkout modal opens
3. Try to submit without filling fields:
   - Empty name
   - Empty email
   - Empty card number
   - Empty expiry
   - Empty CVC

**Expected Results:**
- Form validation shows error
- Cannot submit incomplete form
- Error messages clear
- Can correct and resubmit

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 3.4: Card Details Input Formatting

**Steps:**
1. Add products, open checkout
2. In "Card Number" field, type: 4532148803436467
3. In "Expiry" field, type: 1225
4. In "CVC" field, type: 123

**Expected Results:**
- Card number formats as: 4532 1488 0343 6467
- Expiry formats as: 12/25
- CVC displays as: 123
- Numbers only allowed in these fields

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 4. Payment Processing Testing

### Test 4.1: Successful Payment (Test Card)

**Steps:**
1. Add products to cart
2. Open checkout
3. Fill in customer details:
   - Name: "Test Customer"
   - Email: "test@example.com"
   - Phone: "(555) 123-4567"
4. Fill in card details:
   - Card: 4532 1488 0343 6467
   - Expiry: 12/25 (or any future date)
   - CVC: 123
5. Click "Pay $XX.XX"

**Expected Results:**
- Payment processes successfully
- Success message displays
- Checkout modal closes
- User sees "Check your email" confirmation
- Order created in database

**Database Verification:**
```sql
SELECT * FROM shop_orders
WHERE status = 'paid'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Order exists with status: paid
- [ ] square_payment_id populated
- [ ] paid_at timestamp set
- [ ] total_cents matches checkout total

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 4.2: Payment Error Handling

**Steps:**
1. Add products, open checkout
2. Try payment with invalid card:
   - Card: 4000 0000 0000 0002 (decline)
   - Expiry: 12/25
   - CVC: 123
3. Submit

**Expected Results:**
- Payment fails with clear error message
- Order remains in draft status
- User can retry payment
- Error message explains issue
- Modal stays open for retry

**Database Verification:**
- Order status should still be "draft"
- square_payment_id should be null

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 4.3: Idempotency (Retry Safety)

**Steps:**
1. Add products, start checkout
2. Fill all details correctly
3. Click "Pay" button
4. Immediately close browser tab or refresh page
5. Go back to shop, clear history to ensure fresh session
6. Retry the same order with same email/phone

**Expected Results:**
- Should not create duplicate order
- Should not charge customer twice
- System handles retry gracefully
- Clear message to user about previous order

**Database Verification:**
```sql
SELECT COUNT(*) as order_count
FROM shop_orders
WHERE customer_email = 'test@example.com'
AND status = 'paid';
```
- Should be exactly 1 order (not 2)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 5. Order Management Testing

### Test 5.1: View Orders in Admin

**Steps:**
1. Complete at least 2 orders (different statuses)
2. Go to Admin Portal → Shop Orders tab
3. Observe order list

**Expected Results:**
- Orders display in list
- Ordered by creation date (newest first)
- Shows customer name, email, status, total
- Status badges color-coded (paid=green, pending=yellow, etc.)

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.2: Filter Orders by Status

**Steps:**
1. Have multiple orders with different statuses
2. In Shop Orders tab, click status filter buttons:
   - "All Orders"
   - "Pending Payment"
   - "Paid"
   - "Fulfilled"
   - "Cancelled"

**Expected Results:**
- List filters to show only orders of selected status
- Filter button highlights when active
- Correct orders display for each filter
- Count updates appropriately

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.3: View Order Details

**Steps:**
1. In Shop Orders tab, find a paid order
2. Click on the order (or expand icon)
3. Details panel opens

**Expected Results:**
- Customer information displayed:
  - Name
  - Email
  - Phone (if provided)
- Payment information:
  - Square Payment ID
  - Paid timestamp
- Items breakdown:
  - Each item shows: name, qty, price
  - Line total for each item
- Order totals:
  - Subtotal
  - Tax
  - Shipping (if applicable)
  - Total

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 5.4: Update Order Status

**Steps:**
1. In Shop Orders tab, expand a paid order
2. In "Update Status" section, click buttons:
   - "pending_payment" → "paid"
   - "paid" → "fulfilled"
   - "fulfilled" → "cancelled"

**Expected Results:**
- Status updates immediately
- Database reflects new status
- Status badge changes color
- Button highlighting updates
- Order history preserved

**Database Verification:**
```sql
SELECT status, updated_at FROM shop_orders
WHERE id = 'order-id-here';
```

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 6. Email Notifications Testing

### Test 6.1: Customer Order Confirmation Email

**Prerequisites:**
- RESEND_API_KEY configured
- Resend account set up

**Steps:**
1. Complete a full order with email: test@example.com
2. Check email inbox (might be in spam)

**Expected Results:**
- Email received within 2 minutes
- From: orders@pocketcashiermobile.com
- Subject: "Order Confirmation - ORD-XXXXXXXX"
- Email body contains:
  - Order ID
  - Customer name
  - Order items table
  - Subtotal, tax, total
  - Payment ID

**Email Content Verification:**
- [ ] Order ID present
- [ ] Customer name present
- [ ] Items listed with qty and price
- [ ] Totals calculated correctly
- [ ] Professional HTML formatting

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 6.2: Admin Order Notification Email

**Prerequisites:**
- Admin email configured in Shop Settings
- RESEND_API_KEY configured

**Steps:**
1. Go to Shop Settings tab
2. Set "Order Notification Email" to: admin@test.com
3. Save settings
4. Complete a full order
5. Check admin email inbox

**Expected Results:**
- Email sent to configured admin email
- From: orders@pocketcashiermobile.com
- Subject: "New Shop Order - ORD-XXXXXXXX"
- Email contains:
  - Order details
  - Customer information
  - Order items
  - Totals
  - Link to admin portal

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 6.3: Email Delivery Speed

**Steps:**
1. Note current time
2. Complete order
3. Check email timestamp
4. Calculate delivery time

**Expected Results:**
- Email delivered within 30 seconds
- Less than 1 minute is acceptable
- Email not marked as spam

**Actual Results:**
- Delivery time: _____ seconds
- In spam folder? Yes / No
- [ ] Pass / [ ] Fail

---

## 7. Shop Settings Testing

### Test 7.1: Enable/Disable Shop

**Steps:**
1. Go to Admin → Shop Settings
2. Uncheck "Enable Shop" → Save
3. Go to public page (refresh)
4. Look for Shop section

**Expected Results:**
- When disabled: Shop section not visible
- Product grid disappears
- No checkout option available
- When enabled: Shop section appears
- Products display normally

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 7.2: Configure Notification Email

**Steps:**
1. Go to Shop Settings
2. Enter email: "orders@mycompany.com"
3. Save
4. Complete an order
5. Verify email received at that address

**Expected Results:**
- Setting saves successfully
- Email delivery to configured address
- Previous email address no longer receives emails
- Can change email multiple times

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 7.3: Customize Order Prefix

**Steps:**
1. Go to Shop Settings
2. Change "Order ID Prefix" from "ORD-" to "SALE-"
3. Save
4. Complete an order
5. Check admin order list and email

**Expected Results:**
- Order ID displays with new prefix: "SALE-"
- Email subject uses new prefix
- Order ID in database has new prefix
- Numeric portion still auto-increments

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 8. Business Isolation Testing

### Test 8.1: Cannot See Other Business Products

**Prerequisites:**
- Two different business admins

**Steps:**
1. Log in as Business A admin
2. Create products in Shop Products
3. Log out
4. Log in as Business B admin
5. Go to Shop Products

**Expected Results:**
- Business B admin sees only their own products
- Cannot see Business A products
- Cannot delete Business A products
- Cannot access Business A orders

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 8.2: Public Cannot See Admin Data

**Steps:**
1. Create products in Business A
2. View public Business A page
3. View products
4. Use browser console to check API responses

**Expected Results:**
- Public users see only active products
- Cannot access orders via API
- Cannot access shop_settings
- Cannot see other businesses' products
- RLS policies enforced

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 9. Responsive Design Testing

### Test 9.1: Mobile Shop Display (iPhone SE - 375px)

**Steps:**
1. Open public page on mobile (or 375px viewport)
2. Scroll to shop section
3. Test interactions:
   - Add product to cart
   - Open checkout
   - Enter details
   - Submit payment

**Expected Results:**
- Products display in 1 column
- Text readable (16px minimum)
- Buttons easily tappable (44px minimum)
- Modals full-screen or properly sized
- No horizontal scrolling
- Form inputs work properly

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 9.2: Tablet Display (iPad - 768px)

**Steps:**
1. Open public page on tablet or 768px viewport
2. Scroll to shop
3. Verify product grid

**Expected Results:**
- Products display in 2 columns
- Spacing appropriate
- Modals sized appropriately
- Form readable and usable
- No crowding

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 9.3: Desktop Display (1920px)

**Steps:**
1. Open on desktop or 1920px viewport
2. Check shop section

**Expected Results:**
- Products in 3 columns
- Proper spacing and alignment
- Professional appearance
- All details visible

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 10. Performance Testing

### Test 10.1: Page Load Time

**Steps:**
1. Open public page with Network tab in DevTools
2. Monitor load time
3. Check for slow resources

**Expected Results:**
- Page loads in less than 3 seconds
- Shop products load within 5 seconds
- Images load within 2 seconds
- No 404 errors

**Metrics:**
- DOMContentLoaded: _____ ms
- Full page load: _____ ms
- Largest Contentful Paint: _____ ms

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 10.2: Product List Performance

**Steps:**
1. Create 100 products
2. Go to Admin Shop Products
3. Observe load time
4. Scroll through list

**Expected Results:**
- Admin list loads quickly
- Scrolling smooth (60 fps)
- No lag when expanding products
- No memory issues

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 11. Error Handling Testing

### Test 11.1: Network Error During Checkout

**Steps:**
1. Start checkout
2. Disconnect internet / simulate network error
3. Try to complete payment

**Expected Results:**
- Clear error message displayed
- User can retry payment
- No data loss (cart preserved)
- Helpful troubleshooting message

**Actual Results:**
- [ ] Pass / [ ] Fail

---

### Test 11.2: Database Connection Error

**Steps:**
1. (Simulate by temporarily stopping Supabase)
2. Try to view shop products
3. Try to submit order

**Expected Results:**
- Graceful error message
- "Unable to load products" message
- User not confused by technical error
- Can retry after connection restored

**Actual Results:**
- [ ] Pass / [ ] Fail

---

## 12. Browser Compatibility Testing

### Test 12.1: Chrome Latest

**Steps:**
1. Test full flow in Chrome (latest)
2. Verify all features work

**Results:**
- [ ] Pass / [ ] Fail

---

### Test 12.2: Firefox Latest

**Steps:**
1. Test full flow in Firefox (latest)
2. Verify all features work

**Results:**
- [ ] Pass / [ ] Fail

---

### Test 12.3: Safari Latest

**Steps:**
1. Test full flow in Safari (latest)
2. Verify all features work
3. Check for iOS-specific issues

**Results:**
- [ ] Pass / [ ] Fail

---

### Test 12.4: Mobile Safari (iOS)

**Steps:**
1. Test on iPhone or Safari on iPad
2. Complete full checkout flow
3. Check touch interactions

**Results:**
- [ ] Pass / [ ] Fail

---

## Test Summary

### Completion Checklist

**Product Management**
- [ ] 1.1: Create Product
- [ ] 1.2: Upload Product Image
- [ ] 1.3: Edit Product
- [ ] 1.4: Toggle Active Status
- [ ] 1.5: Delete Product

**Shop Display**
- [ ] 2.1: Product Grid Display
- [ ] 2.2: Product Details
- [ ] 2.3: Product Images Load

**Cart & Checkout**
- [ ] 3.1: Add Single Product
- [ ] 3.2: Add Multiple Products
- [ ] 3.3: Form Validation
- [ ] 3.4: Card Input Formatting

**Payment Processing**
- [ ] 4.1: Successful Payment
- [ ] 4.2: Payment Error Handling
- [ ] 4.3: Idempotency/Retry Safety

**Order Management**
- [ ] 5.1: View Orders
- [ ] 5.2: Filter Orders
- [ ] 5.3: View Details
- [ ] 5.4: Update Status

**Email Notifications**
- [ ] 6.1: Customer Email
- [ ] 6.2: Admin Email
- [ ] 6.3: Delivery Speed

**Shop Settings**
- [ ] 7.1: Enable/Disable Shop
- [ ] 7.2: Notification Email
- [ ] 7.3: Order Prefix

**Security**
- [ ] 8.1: Business Isolation
- [ ] 8.2: Public Access Limits

**Responsive Design**
- [ ] 9.1: Mobile (375px)
- [ ] 9.2: Tablet (768px)
- [ ] 9.3: Desktop (1920px)

**Performance**
- [ ] 10.1: Page Load Time
- [ ] 10.2: Product List Performance

**Error Handling**
- [ ] 11.1: Network Errors
- [ ] 11.2: Database Errors

**Browser Compatibility**
- [ ] 12.1: Chrome
- [ ] 12.2: Firefox
- [ ] 12.3: Safari
- [ ] 12.4: Mobile Safari

**Total Passing Tests:** ____ / 47

**Overall Status:**
- [ ] All Pass (Ready for Production)
- [ ] Some Failures (Needs Fixes)
- [ ] Major Issues (Needs Rework)

---

## Known Issues & Workarounds

(None identified at this time)

---

## Next Steps for Production

1. [ ] Fix all failing tests
2. [ ] Configure real Square credentials (not sandbox)
3. [ ] Verify Resend email delivery to real domains
4. [ ] Set up monitoring and error logging
5. [ ] Load test with 1000+ products
6. [ ] Security audit of RLS policies
7. [ ] Backup strategy verification
8. [ ] Disaster recovery procedures
9. [ ] User documentation

