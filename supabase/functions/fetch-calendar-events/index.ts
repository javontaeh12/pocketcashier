import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CalendarIntegration {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  calendar_id: string;
}

async function refreshAccessToken(
  refreshToken: string,
  supabase: any,
  businessId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(data)}`);
  }

  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);

  await supabase
    .from('google_calendar_integrations')
    .update({
      access_token: data.access_token,
      token_expiry: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', businessId);

  return data.access_token;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');

    if (!businessId) {
      throw new Error('business_id is required');
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (!business) {
      throw new Error('Business not found or unauthorized');
    }

    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('access_token, refresh_token, token_expiry, calendar_id')
      .eq('business_id', businessId)
      .eq('is_connected', true)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Calendar not connected' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: systemIntegration } = await supabase
      .from('system_integrations')
      .select('config')
      .eq('integration_type', 'google_oauth')
      .maybeSingle();

    const clientId = systemIntegration?.config?.client_id;
    const clientSecret = systemIntegration?.config?.client_secret;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured. Please contact support.');
    }

    const calendarIntegration = integration as CalendarIntegration;
    let accessToken = calendarIntegration.access_token;

    const tokenExpiry = new Date(calendarIntegration.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      accessToken = await refreshAccessToken(
        calendarIntegration.refresh_token,
        supabase,
        businessId,
        clientId,
        clientSecret
      );
    }

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarIntegration.calendar_id}/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      throw new Error(`Failed to fetch events: ${JSON.stringify(calendarData)}`);
    }

    return new Response(
      JSON.stringify({ events: calendarData.items || [] }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});