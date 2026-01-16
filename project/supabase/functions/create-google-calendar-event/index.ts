import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CalendarEventRequest {
  business_id: string;
  booking_id: string;
  customer_name: string;
  customer_email: string;
  service_type: string;
  booking_datetime: string;
  duration_minutes: number;
  customer_phone?: string;
  notes?: string;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    console.error('Token refresh error:', errorData);
    throw new Error('Failed to refresh access token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const eventRequest: CalendarEventRequest = await req.json();

    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('access_token, refresh_token, token_expiry, calendar_id, is_connected')
      .eq('business_id', eventRequest.business_id)
      .maybeSingle();

    if (integrationError) {
      console.error('Error fetching calendar integration:', integrationError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch calendar integration',
          calendar_event_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration || !integration.is_connected) {
      console.log('Google Calendar not connected, skipping event creation');
      return new Response(
        JSON.stringify({
          success: true,
          error: 'Calendar not connected',
          calendar_event_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: systemIntegration, error: systemError } = await supabase
      .from('system_integrations')
      .select('config')
      .eq('integration_type', 'google_oauth')
      .maybeSingle();

    if (systemError) {
      console.error('Error fetching system integration:', systemError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch OAuth config',
          calendar_event_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const clientId = systemIntegration?.config?.client_id;
    const clientSecret = systemIntegration?.config?.client_secret;

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OAuth credentials not configured',
          calendar_event_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
        .eq('business_id', eventRequest.business_id);
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('business_timezone')
      .eq('id', eventRequest.booking_id)
      .maybeSingle();

    const timezone = booking?.business_timezone || Deno.env.get('TIMEZONE') || 'America/New_York';

    const startDateTime = new Date(eventRequest.booking_datetime);
    const endDateTime = new Date(startDateTime.getTime() + eventRequest.duration_minutes * 60000);

    let description = `Customer: ${eventRequest.customer_name}\nEmail: ${eventRequest.customer_email}`;
    if (eventRequest.customer_phone) {
      description += `\nPhone: ${eventRequest.customer_phone}`;
    }
    if (eventRequest.service_type) {
      description += `\nService: ${eventRequest.service_type}`;
    }
    if (eventRequest.notes) {
      description += `\n\nNotes: ${eventRequest.notes}`;
    }

    const event = {
      summary: `${eventRequest.service_type} - ${eventRequest.customer_name}`,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timezone,
      },
      attendees: [
        {
          email: eventRequest.customer_email,
          displayName: eventRequest.customer_name,
        },
      ],
    };

    console.log('Creating calendar event with data:', {
      booking_id: eventRequest.booking_id,
      summary: event.summary,
      timezone: timezone,
      start: event.start.dateTime,
      end: event.end.dateTime,
      calendar_id: integration.calendar_id || 'primary',
      duration_minutes: eventRequest.duration_minutes,
    });

    const calendarId = integration.calendar_id || 'primary';
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('Google Calendar API error:', {
        booking_id: eventRequest.booking_id,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        calendar_id: calendarId,
      });

      const errorMessage = errorData.error?.message || errorData.message || 'Failed to create calendar event';

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          calendar_event_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const createdEvent = await response.json();
    console.log('Calendar event created successfully:', {
      booking_id: eventRequest.booking_id,
      calendar_event_id: createdEvent.id,
      calendar_id: calendarId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        calendar_event_id: createdEvent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Calendar event creation failed:', {
      booking_id: eventRequest.booking_id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        calendar_event_id: null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
