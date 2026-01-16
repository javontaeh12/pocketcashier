# Google Calendar Integration Setup

This guide explains how to configure Google OAuth credentials for the Google Calendar integration feature.

## Overview

The Google Calendar integration allows all business admins in your application to connect their Google Calendars. You configure a single Google OAuth application once through the Developer Portal, and it becomes available to all businesses.

## Steps to Configure

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Configure the OAuth consent screen if prompted:
   - Choose "External" for user type
   - Fill in the required information
   - Add the scope: `https://www.googleapis.com/auth/calendar.readonly`
4. For Application type, select "Web application"
5. Add the authorized redirect URI:
   ```
   https://[YOUR-SUPABASE-PROJECT-URL]/functions/v1/google-calendar-oauth?action=callback
   ```
   Replace `[YOUR-SUPABASE-PROJECT-URL]` with your actual Supabase project URL
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 3. Configure in Developer Portal

1. Log in to the Developer Portal
2. Navigate to the **Integrations** tab
3. Enter your Google Client ID and Client Secret
4. Click "Save Google OAuth Settings"

That's it! The Google Calendar integration is now available to all business accounts.

### 4. Business Owners Can Now Connect

Once configured, business owners can:
1. Navigate to the "Google Calendar" tab in their admin portal
2. Click "Connect Google Calendar"
3. Authorize access to their Google Calendar
4. View their calendar events within the application

## Security Notes

- The Client Secret is stored securely in the database
- Only developers have access to view/edit system integrations
- Only the `calendar.readonly` scope is used, so the app can only read calendar data
- Each user's calendar access token is stored securely in the database
- Users can disconnect their calendar at any time from the Google Calendar tab

## Troubleshooting

### "Google OAuth not configured" Error

This means the credentials haven't been set in the Developer Portal. Double-check that:
- You've logged into the Developer Portal
- You've added both Client ID and Client Secret in the Integrations tab
- You've clicked "Save Google OAuth Settings"

### Authorization Fails

Check that:
- The redirect URI in Google Cloud Console exactly matches your Supabase function URL
- The Google Calendar API is enabled for your project
- The OAuth consent screen is properly configured
- The credentials in the Integrations tab are correct

### No Calendar Events Showing

Verify that:
- The user has events in their Google Calendar
- The calendar is not empty
- The user granted the necessary permissions during authorization
- The calendar integration is connected (check the Google Calendar tab)
