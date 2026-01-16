import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('OAuth request received:', { action, method: req.method });

    if (action === 'get-auth-url') {
      console.log('Processing get-auth-url action');
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('User auth error:', userError);
        throw new Error('Invalid user token');
      }

      console.log('User authenticated:', user.id);

      const businessId = url.searchParams.get('business_id');
      console.log('Business ID:', businessId);
      if (!businessId) {
        throw new Error('business_id is required');
      }

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessError) {
        console.error('Business query error:', businessError);
        throw new Error('Failed to query business');
      }

      if (!business) {
        console.error('Business not found for user:', user.id, 'business:', businessId);
        throw new Error('Business not found or unauthorized');
      }

      console.log('Business found:', business.id);

      const { data: integration, error: integrationError } = await supabase
        .from('system_integrations')
        .select('config')
        .eq('integration_type', 'google_oauth')
        .maybeSingle();

      if (integrationError) {
        console.error('Integration query error:', integrationError);
        throw new Error(`Failed to query integrations: ${integrationError.message}`);
      }

      console.log('Integration config retrieved:', integration ? 'Yes' : 'No');

      const clientId = integration?.config?.client_id;
      if (!clientId) {
        console.error('No client ID found. Integration data:', integration);
        throw new Error('Google OAuth not configured. Please contact support.');
      }

      console.log('Client ID found, generating auth URL');

      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth?action=callback`;
      const scope = 'https://www.googleapis.com/auth/calendar.events';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${businessId}&` +
        `login_hint=&` +
        `include_granted_scopes=true`;

      console.log('Auth URL generated successfully');

      return new Response(
        JSON.stringify({ authUrl }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const businessId = url.searchParams.get('state');

      if (!code || !businessId) {
        throw new Error('Missing code or business_id');
      }

      const { data: integration } = await supabase
        .from('system_integrations')
        .select('config')
        .eq('integration_type', 'google_oauth')
        .maybeSingle();

      const clientId = integration?.config?.client_id;
      const clientSecret = integration?.config?.client_secret;

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth not configured. Please contact support.');
      }

      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth?action=callback`;

      const tokenController = new AbortController();
      const tokenTimeout = setTimeout(() => tokenController.abort(), 10000);

      let tokenResponse;
      try {
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
          signal: tokenController.signal,
        });
      } catch (err) {
        clearTimeout(tokenTimeout);
        throw new Error(`Token exchange network error: ${err.message}`);
      }

      clearTimeout(tokenTimeout);

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        throw new Error(`Failed to exchange code: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
      }

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

      const { error: upsertError } = await supabase
        .from('google_calendar_integrations')
        .upsert({
          business_id: businessId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expiry: expiryDate.toISOString(),
          is_connected: true,
          calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'business_id',
        });

      if (upsertError) {
        throw upsertError;
      }

      const isMobileUserAgent = req.headers.get('user-agent')?.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);

      if (isMobileUserAgent) {
        let redirectUrl = '/admin?tab=google-calendar';

        try {
          const referer = req.headers.get('referer');
          if (referer) {
            const refererUrl = new URL(referer);
            redirectUrl = `${refererUrl.origin}/admin?tab=google-calendar&success=true`;
          }
        } catch {
          redirectUrl = supabaseUrl.replace('supabase.co', 'netlify.app').split('/functions')[0] + '/admin?tab=google-calendar&success=true';
        }

        return new Response(
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Successful</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6;">
  <div style="text-align: center; padding: 2rem;">
    <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
    <h1 style="color: #10b981; margin-bottom: 0.5rem;">Connected!</h1>
    <p style="color: #6b7280; margin-bottom: 1.5rem;">Redirecting to admin portal...</p>
    <a href="${redirectUrl}" style="color: #3b82f6; text-decoration: none;">Click here if not redirected automatically</a>
  </div>
  <script>
    localStorage.setItem('google_calendar_connected', 'true');
    setTimeout(function() {
      window.location.href = "${redirectUrl}";
    }, 500);
  </script>
</body>
</html>`,
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/html',
            },
          }
        );
      }

      return new Response(
        `<html><body><script>window.close();</script><p>Authorization successful! You can close this window.</p></body></html>`,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      );
    }

    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        throw new Error('Invalid user token');
      }

      const { business_id } = await req.json();

      if (!business_id) {
        throw new Error('business_id is required');
      }

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', business_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessError || !business) {
        throw new Error('Business not found or unauthorized');
      }

      const { error: deleteError } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('business_id', business_id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Google Calendar OAuth error:', error);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'callback') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUrl = supabaseUrl.replace('supabase.co', 'netlify.app').split('/functions')[0] + '/admin';

      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6;">
  <div style="text-align: center; padding: 2rem; max-width: 400px;">
    <div style="font-size: 3rem; margin-bottom: 1rem;">✗</div>
    <h1 style="color: #ef4444; margin-bottom: 0.5rem;">Connection Failed</h1>
    <p style="color: #6b7280; margin-bottom: 1.5rem;">${error.message || 'An error occurred during authorization'}</p>
    <a href="${redirectUrl}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 0.5rem;">Return to Admin Portal</a>
  </div>
</body>
</html>`,
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      );
    }

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