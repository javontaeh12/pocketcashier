import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FIELD_LIMITS = {
  SQUARE_LOCATION_ID: 45,
} as const;

function truncateField(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, FIELD_LIMITS.SQUARE_LOCATION_ID);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { code, squareApplicationId, redirectUri } = await req.json();

    if (!code) {
      throw new Error("Authorization code is required");
    }

    if (!squareApplicationId) {
      throw new Error("Square Application ID is required");
    }

    if (!redirectUri) {
      throw new Error("Redirect URI is required");
    }

    const squareApplicationSecret = Deno.env.get("SQUARE_APPLICATION_SECRET");

    if (!squareApplicationSecret) {
      throw new Error("Square Application Secret not configured in environment");
    }

    console.log("Square OAuth token exchange:", {
      clientId: squareApplicationId,
      redirectUri: redirectUri,
      code: code.substring(0, 10) + "...",
    });

    const tokenResponse = await fetch("https://connect.squareup.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: squareApplicationId,
        client_secret: squareApplicationSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Square token error:", error);
      throw new Error(`Square token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();

    const merchantResponse = await fetch("https://connect.squareup.com/v2/merchants/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!merchantResponse.ok) {
      throw new Error("Failed to fetch merchant information");
    }

    const merchantData = await merchantResponse.json();

    const locationsResponse = await fetch("https://connect.squareup.com/v2/locations", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    let locationId = '';
    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json();
      const rawLocationId = locationsData.locations?.[0]?.id || '';
      locationId = truncateField(rawLocationId);
    }

    return new Response(
      JSON.stringify({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        merchantId: merchantData.merchant.id,
        locationId: locationId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Square OAuth error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
