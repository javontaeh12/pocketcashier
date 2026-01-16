import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const { customerEmail, customerName, businessId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("mailerlite_api_key, mailerlite_enabled, mailerlite_group_id")
      .eq("business_id", businessId)
      .maybeSingle();

    if (!settings?.mailerlite_enabled || !settings?.mailerlite_api_key) {
      console.log("MailerLite not configured or not enabled");
      return new Response(
        JSON.stringify({ success: false, message: "MailerLite not configured" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiKey = settings.mailerlite_api_key;
    const groupId = settings.mailerlite_group_id;

    const payload: any = {
      email: customerEmail,
      fields: {
        name: customerName,
      },
    };

    if (groupId) {
      payload.groups = [groupId];
    }

    console.log("Sending to MailerLite:", JSON.stringify(payload));

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("MailerLite response status:", response.status);
    console.log("MailerLite response:", responseText);

    if (!response.ok) {
      console.error("MailerLite API error:", responseText);
      return new Response(
        JSON.stringify({ success: false, error: responseText, status: response.status }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = JSON.parse(responseText);
    console.log("MailerLite subscriber added successfully");

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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