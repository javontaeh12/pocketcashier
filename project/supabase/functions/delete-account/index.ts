import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteAccountRequest {
  businessId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { businessId }: DeleteAccountRequest = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "Business ID is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      throw new Error("Server configuration error");
    }

    console.log("Attempting to delete business account:", businessId);

    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_business_account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ p_business_id: businessId }),
    });

    const responseText = await deleteResponse.text();
    console.log("Delete response status:", deleteResponse.status);
    console.log("Delete response body:", responseText);

    if (!deleteResponse.ok) {
      console.error("Delete function error:", responseText);
      throw new Error(responseText || `Failed to delete account: ${deleteResponse.status}`);
    }

    const deleteDir = await fetch(
      `${supabaseUrl}/storage/v1/b/business-assets/list`,
      {
        method: "GET",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (deleteDir.ok) {
      const files = await deleteDir.json();
      for (const file of files) {
        if (file.name.startsWith(`${businessId}/`)) {
          await fetch(
            `${supabaseUrl}/storage/v1/b/business-assets/o/${encodeURIComponent(file.name)}`,
            {
              method: "DELETE",
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});