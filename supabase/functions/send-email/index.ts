import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  trace_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const traceId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const emailRequest: EmailRequest = await req.json();
    const { to, subject, html, trace_id = traceId } = emailRequest;

    if (!to || !subject || !html) {
      console.error("[SEND_EMAIL]", {
        trace_id: trace_id,
        error: "Missing required fields",
        fields_provided: { to: !!to, subject: !!subject, html: !!html },
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject, html",
          trace_id: trace_id,
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("[SEND_EMAIL]", {
        trace_id: trace_id,
        error: "RESEND_API_KEY not configured",
        recipient: to,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured. Please contact support.",
          trace_id: trace_id,
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("[SEND_EMAIL_START]", {
      trace_id: trace_id,
      recipient: to,
      subject_preview: subject.substring(0, 50),
      timestamp: new Date().toISOString(),
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "bookings@pocketcashiermobile.com",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const responseBody = await emailResponse.text();

    if (!emailResponse.ok) {
      console.error("[SEND_EMAIL_FAILED]", {
        trace_id: trace_id,
        recipient: to,
        status: emailResponse.status,
        error_response: responseBody,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email service error: ${emailResponse.status}`,
          trace_id: trace_id,
        }),
        {
          status: emailResponse.status >= 400 && emailResponse.status < 500 ? 400 : 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let result;
    try {
      result = JSON.parse(responseBody);
    } catch {
      console.error("[SEND_EMAIL_PARSE_ERROR]", {
        trace_id: trace_id,
        recipient: to,
        response_body: responseBody,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from email service",
          trace_id: trace_id,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("[SEND_EMAIL_SUCCESS]", {
      trace_id: trace_id,
      recipient: to,
      email_id: result.id,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, id: result.id, trace_id: trace_id }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND_EMAIL_EXCEPTION]", {
      trace_id: traceId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : "No stack trace",
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email",
        trace_id: traceId,
      }),
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