import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  email: string;
  businessName: string;
  contactName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, businessName, contactName }: NotificationRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Business Account Created</h1>
            </div>
            <div class="content">
              <p>A new admin has signed up for Pocket Cashier!</p>

              <div class="info-box">
                <div class="info-row">
                  <span class="label">Business Name:</span>
                  <span class="value">${businessName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Contact Name:</span>
                  <span class="value">${contactName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">${email}</span>
                </div>
                <div class="info-row">
                  <span class="label">Sign Up Date:</span>
                  <span class="value">${new Date().toLocaleString()}</span>
                </div>
              </div>

              <p>Please reach out to welcome them to the platform!</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Pocket Cashier</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pocket Cashier <notifications@pocketcashier.com>',
        to: ['contact@budgetbrandingonline.com'],
        subject: `New Admin Sign Up: ${businessName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});