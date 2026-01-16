import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingData {
  business_id: string;
  booking_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  service_name: string;
  service_duration: number;
  service_price?: number;
  booking_date: string;
  booking_time: string;
  notes?: string;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    console.error("Token refresh error:", errorData);
    throw new Error("Failed to refresh access token");
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const bookingData: BookingData = await req.json();

    if (!bookingData.business_id) {
      throw new Error('business_id is required');
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', bookingData.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (businessError || !business) {
      throw new Error('Business not found or unauthorized');
    }

    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('access_token, refresh_token, token_expiry, calendar_id, is_connected')
      .eq('business_id', bookingData.business_id)
      .maybeSingle();

    if (integrationError || !integration || !integration.is_connected) {
      throw new Error('Google Calendar not connected for this business');
    }

    const { data: systemIntegration } = await supabase
      .from('system_integrations')
      .select('config')
      .eq('integration_type', 'google_oauth')
      .maybeSingle();

    const clientId = systemIntegration?.config?.client_id;
    const clientSecret = systemIntegration?.config?.client_secret;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    let accessToken = integration.access_token;
    const tokenExpiry = new Date(integration.token_expiry);
    const now = new Date();

    if (now >= tokenExpiry) {
      accessToken = await refreshAccessToken(integration.refresh_token, clientId, clientSecret);

      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + 1);

      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', bookingData.business_id);
    }

    const startDateTime = new Date(`${bookingData.booking_date}T${bookingData.booking_time}`);
    const endDateTime = new Date(startDateTime.getTime() + bookingData.service_duration * 60000);

    let description = `Customer: ${bookingData.customer_name}\nEmail: ${bookingData.customer_email}`;
    if (bookingData.customer_phone) {
      description += `\nPhone: ${bookingData.customer_phone}`;
    }
    description += `\nService: ${bookingData.service_name}`;
    if (bookingData.service_price) {
      description += `\nPrice: $${bookingData.service_price}`;
    }
    if (bookingData.notes) {
      description += `\n\nNotes: ${bookingData.notes}`;
    }

    const event = {
      summary: `${bookingData.service_name} - ${bookingData.customer_name}`,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Deno.env.get('TIMEZONE') || 'America/New_York',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Deno.env.get('TIMEZONE') || 'America/New_York',
      },
      attendees: [
        {
          email: bookingData.customer_email,
          displayName: bookingData.customer_name,
        },
      ],
    };

    const calendarId = integration.calendar_id || 'primary';
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Calendar API error:", errorData);
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const createdEvent = await response.json();

    if (bookingData.booking_id) {
      try {
        await supabase
          .from('bookings')
          .update({ calendar_event_id: createdEvent.id })
          .eq('id', bookingData.booking_id);
      } catch (error) {
        console.error("Error saving event ID to booking:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId: createdEvent.id,
        eventLink: createdEvent.htmlLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar event creation failed:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});