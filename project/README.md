# Mobile Order Solution for Pop-Up Businesses

A complete mobile ordering system designed for food trucks and pop-up businesses. This application features a customer-facing menu interface and a comprehensive admin portal for managing orders, menu items, and customers.

## Features

### Customer-Facing Features
- Browse menu items organized by category
- Add items to cart with quantity controls
- Checkout with name and email
- Order confirmation and status updates via email

### Admin Portal Features
- **Menu Management**: Add, edit, and remove menu items with images, prices, and categories
- **Order Tracking**: Monitor all orders with status updates (pending, preparing, ready, completed)
- **Customer Management**: View customer details and order history
- **Logo Upload**: Upload and manage business logo that appears on the customer-facing menu
- **Settings**: Configure admin email for order notifications
- **Payments**: Square payment integration placeholder

## Getting Started

### First Time Setup

1. **Access the Admin Portal**
   - Click the "Admin" button in the bottom-right corner
   - Create an admin account by clicking "Sign Up"
   - Sign in with your credentials

2. **Configure Business Settings**
   - Go to the "Logo" tab to upload your business logo and set your business name
   - Go to the "Settings" tab to configure your email for order notifications

3. **Add Menu Items**
   - Go to the "Menu Items" tab
   - Click "Add Item" to create new menu items
   - Fill in name, description, price, category, and upload an image
   - Categories will automatically group items on the customer menu

### Using the Application

#### For Customers
- Browse the menu and add items to cart
- Click the cart icon to review your order
- Proceed to checkout and enter your information
- Receive order confirmation via email
- Get notified when your order is ready

#### For Admins
- Monitor incoming orders in real-time
- Update order status as you prepare them
- Track customer information and order history
- Manage your menu items and availability
- View all orders and customer data

## Email Notifications

The application uses Resend for email notifications. Email notifications are sent:
- When a customer places an order (to both customer and admin)
- When an order is marked as ready (to customer)

To configure email notifications:
1. Set up a Resend account at https://resend.com
2. Configure your RESEND_API_KEY in the Supabase dashboard
3. Update the "from" email address in the edge functions to your verified domain

## Square Payment Integration

The Payments tab includes a placeholder for Square integration. To complete the Square integration:
1. Create a Square account at https://squareup.com
2. Obtain your Square API credentials
3. Implement the Square Web Payments SDK in the checkout flow
4. Configure webhook handlers for payment confirmations

## Database Structure

The application uses the following tables:
- `businesses`: Store business information and logo
- `menu_items`: Store menu items with images and pricing
- `customers`: Track customer information
- `orders`: Store order information
- `order_items`: Store individual items in each order
- `settings`: Store admin configuration

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Email**: Resend
- **Hosting**: Supabase Edge Functions

## Notes

- The admin portal requires authentication
- Customers can browse and order without creating an account
- All images are stored in Supabase Storage
- Row Level Security (RLS) is enabled on all database tables
- Email notifications gracefully fail if Resend is not configured
