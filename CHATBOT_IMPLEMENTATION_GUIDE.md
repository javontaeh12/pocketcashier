# Business-Aware AI Chatbot Implementation Guide

## Overview

This document provides a comprehensive guide to the business-aware AI chatbot system integrated into the Pocket Cashier platform. The chatbot helps customers with bookings, referrals, and service selection through an intelligent, adaptive conversation interface.

---

## 🎯 Features

### Core Capabilities
- **Business-Type Adaptation**: Automatically adjusts language and recommendations based on business type (barber, catering, fitness, creator, general)
- **Booking Assistance**: Guides customers through the complete booking process
- **Referral Program Integration**: Helps customers join and use the referral program
- **Service Selection**: Recommends and helps customers choose services
- **Action Confirmation**: Requires explicit user confirmation for all state-changing actions
- **Multi-Tenant**: Fully scoped to individual businesses with proper data isolation

### Security Features
- **Constrained Action System**: All actions go through validated server-side endpoints
- **Idempotency**: Prevents duplicate bookings using idempotency keys
- **RLS Enforcement**: Database policies ensure proper data access control
- **Anonymous Support**: Works for both authenticated and anonymous visitors
- **No Arbitrary Code Execution**: All actions are predefined and validated

---

## 🏗️ Architecture

### High-Level Flow

```
User Message → ChatWidget (React)
    ↓
process-chat Edge Function
    ↓
Business Context + Menu Items + Conversation History
    ↓
Generate Response + Optional Action
    ↓
ChatWidget Displays Response
    ↓
If Action Requires Confirmation → Show Confirmation UI
    ↓
User Confirms → confirm-chat-action Edge Function
    ↓
Execute Action (Create Booking / Generate Referral)
    ↓
Return Result → Display in Chat
```

### Components

1. **Frontend (React)**
   - `ChatWidget.tsx` - Main chat UI component
   - `chatUtils.ts` - Utility functions for session management

2. **Backend (Supabase Edge Functions)**
   - `process-chat` - Handles message processing and response generation
   - `confirm-chat-action` - Executes confirmed actions (bookings, referrals)

3. **Database (Supabase Postgres)**
   - `chat_sessions` - Stores chat sessions
   - `chat_messages` - Stores conversation history
   - `businesses` - Extended with chatbot configuration fields

4. **Shared Types**
   - `chatbot-types.ts` - TypeScript interfaces and business type configurations

---

## 📊 Database Schema

### New Tables

#### `chat_sessions`
```sql
id                uuid PRIMARY KEY
business_id       uuid REFERENCES businesses(id)
user_id           uuid REFERENCES auth.users(id) NULL
visitor_id        text NULL
created_at        timestamptz
updated_at        timestamptz
metadata          jsonb
```

**Constraints**:
- Either `user_id` OR `visitor_id` must be set (not both)

**Indexes**:
- `idx_chat_sessions_business_id` on `business_id`
- `idx_chat_sessions_user_id` on `user_id` (where not null)
- `idx_chat_sessions_visitor_id` on `visitor_id` (where not null)

#### `chat_messages`
```sql
id           uuid PRIMARY KEY
session_id   uuid REFERENCES chat_sessions(id)
role         text CHECK (role IN ('user', 'assistant', 'system'))
content      text NOT NULL
metadata     jsonb
created_at   timestamptz
```

**Indexes**:
- `idx_chat_messages_session_id` on `session_id`
- `idx_chat_messages_created_at` on `created_at DESC`

### Extended `businesses` Table

```sql
-- New columns added to businesses table
chatbot_enabled      boolean DEFAULT true
business_type        text DEFAULT 'general'
chatbot_tone         text NULL
chatbot_goals        jsonb DEFAULT '{}'::jsonb
```

**Valid `business_type` values**:
- `general` - General business
- `barber` - Barber / Hair salon
- `catering` - Catering / Food service
- `fitness` - Fitness / Training
- `creator` - Content creator / Influencer

**`chatbot_goals` structure**:
```json
{
  "enable_bookings": true,
  "enable_referrals": true,
  "enable_service_help": true
}
```

---

## 🔒 Security & RLS Policies

### `chat_sessions` Policies

1. **Anonymous users can create sessions**
   ```sql
   CREATE POLICY "Anonymous users can create chat sessions"
     ON chat_sessions FOR INSERT
     TO anon
     WITH CHECK (true);
   ```

2. **Anonymous users can read their own sessions**
   ```sql
   CREATE POLICY "Anonymous users can read own sessions"
     ON chat_sessions FOR SELECT
     TO anon
     USING (visitor_id IS NOT NULL);
   ```

3. **Authenticated users can create sessions**
   ```sql
   CREATE POLICY "Authenticated users can create chat sessions"
     ON chat_sessions FOR INSERT
     TO authenticated
     WITH CHECK (user_id = auth.uid());
   ```

4. **Authenticated users can read their own sessions**
   ```sql
   CREATE POLICY "Authenticated users can read own sessions"
     ON chat_sessions FOR SELECT
     TO authenticated
     USING (user_id = auth.uid());
   ```

5. **Business admins can read all sessions for their business**
   ```sql
   CREATE POLICY "Business admins can read business sessions"
     ON chat_sessions FOR SELECT
     TO authenticated
     USING (
       business_id IN (
         SELECT id FROM businesses WHERE user_id = auth.uid()
       )
     );
   ```

### `chat_messages` Policies

Similar pattern for `chat_messages` with proper scoping to sessions.

---

## 🤖 Business Type Configurations

### Welcome Messages & Behavior

Each business type has a customized welcome message and set of common service terms:

```typescript
const BUSINESS_TYPE_CONFIG = {
  barber: {
    welcome: "👋 Welcome! Ready to book a haircut or beard trim?",
    services_label: "haircuts and grooming services",
    booking_questions: ["What service are you looking for?", "What day works best for you?"],
    common_services: ["haircut", "beard", "trim", "style"]
  },
  catering: {
    welcome: "👋 Hi! Looking for catering services for your event?",
    services_label: "catering options",
    booking_questions: ["What type of event?", "How many guests?", "What date?"],
    common_services: ["catering", "event", "party", "buffet"]
  },
  // ... etc
}
```

---

## 🎬 Action System

### Action Types

1. **`navigate`** (No confirmation required)
   - Scrolls to page sections
   - Example: Scroll to services section

2. **`modal`** (No confirmation required)
   - Opens modals (booking, referrals)
   - Example: Open referral modal

3. **`recommend_services`** (No confirmation required)
   - Highlights specific services
   - Example: Show top 3 services

4. **`create_booking`** (Confirmation REQUIRED)
   - Creates a new booking
   - Requires: customer info, date, time, service
   - Idempotency key prevents duplicates

5. **`generate_referral`** (Confirmation REQUIRED)
   - Generates a referral code
   - Requires: customer email or user ID

### Action Schema

```typescript
interface ChatAction {
  type: 'navigate' | 'modal' | 'recommend_services' | 'create_booking' | 'generate_referral';
  target?: string;
  data?: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}
```

### Confirmation Flow

```typescript
// 1. Action generated by process-chat
{
  type: 'create_booking',
  data: { customer_name, customer_email, booking_date, ... },
  requiresConfirmation: true,
  confirmationMessage: 'Click "Confirm Booking" to finalize your appointment.'
}

// 2. ChatWidget displays confirmation UI

// 3. User clicks "Confirm"

// 4. Call confirm-chat-action endpoint
POST /functions/v1/confirm-chat-action
{
  action_type: 'create_booking',
  business_id: '...',
  session_id: '...',
  data: { ... }
}

// 5. Server creates booking and returns result
```

---

## 💬 Conversation Flow

### Booking Flow Example

```
Assistant: "Great! Here are our available services:
            1. Haircut - $30
            2. Beard Trim - $15
            Which one interests you?"

User: "1"