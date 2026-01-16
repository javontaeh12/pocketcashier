import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfirmationEmailRequest {
  bookingId: string;
  sendToCustomer?: boolean;
  sendToAdmin?: boolean;
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

function formatBookingDateTime(dateString: string, durationMinutes: number): string {
  const start = new Date(dateString);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  return `${start.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} from ${start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })} to ${end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}

async function sendCustomerConfirmationEmail(
  emailData: any,
  traceId: string
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const formattedDateTime = formatBookingDateTime(
      emailData.booking_date,
      emailData.duration_minutes
    );

    const confirmationEmail = {
      to: emailData.customer_email,
      subject: `Booking Confirmation - ${emailData.business_name}`,
      trace_id: traceId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Booking Confirmation</h2>

          <p style="font-size: 16px; color: #666; margin-bottom: 10px;">Hi ${emailData.customer_name},</p>

          <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Thank you for booking with <strong>${emailData.business_name}</strong>! Your booking has been confirmed.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.service_type || 'Appointment'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${formattedDateTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Duration:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.duration_minutes} minutes</td>
              </tr>
              ${emailData.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Notes:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            If you need to reschedule or cancel, please contact the business directly.
          </p>
        </div>
      `,
    };

    console.log('[SEND_BOOKING_CONFIRMATION_CUSTOMER]', {
      trace_id: traceId,
      booking_id: emailData.id,
      customer_email: emailData.customer_email,
      status: 'sending',
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(confirmationEmail),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SEND_BOOKING_CONFIRMATION_CUSTOMER_FAILED]', {
        trace_id: traceId,
        booking_id: emailData.id,
        customer_email: emailData.customer_email,
        status: response.status,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: result.error || 'Failed to send customer email',
      };
    }

    console.log('[SEND_BOOKING_CONFIRMATION_CUSTOMER_SUCCESS]', {
      trace_id: traceId,
      booking_id: emailData.id,
      customer_email: emailData.customer_email,
      email_id: result.id,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      emailId: result.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEND_BOOKING_CONFIRMATION_CUSTOMER_EXCEPTION]', {
      trace_id: traceId,
      customer_email: emailData.customer_email,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function sendAdminConfirmationEmail(
  emailData: any,
  traceId: string
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!emailData.admin_email) {
      console.warn('[SEND_BOOKING_CONFIRMATION_ADMIN_SKIPPED]', {
        trace_id: traceId,
        booking_id: emailData.id,
        reason: 'admin_email not configured',
        timestamp: new Date().toISOString(),
      });
      return {
        success: true,
        error: 'Admin email not configured (skipped)',
      };
    }

    const formattedDateTime = formatBookingDateTime(
      emailData.booking_date,
      emailData.duration_minutes
    );

    const adminEmail = {
      to: emailData.admin_email,
      subject: `New Booking Request - ${emailData.customer_name}`,
      trace_id: traceId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">New Booking Request</h2>

          <p style="font-size: 16px; color: #666; margin-bottom: 20px;">You have received a new booking request at <strong>${emailData.business_name}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Customer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; color: #333;"><a href="mailto:${emailData.customer_email}" style="color: #0066cc;">${emailData.customer_email}</a></td>
              </tr>
              ${emailData.customer_phone ? `
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0; color: #333;"><a href="tel:${emailData.customer_phone}" style="color: #0066cc;">${emailData.customer_phone}</a></td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.service_type || 'Appointment'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${formattedDateTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Duration:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.duration_minutes} minutes</td>
              </tr>
              ${emailData.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Customer Notes:</strong></td>
                <td style="padding: 8px 0; color: #333;">${emailData.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            Log in to your admin portal to confirm or adjust this booking.
          </p>
        </div>
      `,
    };

    console.log('[SEND_BOOKING_CONFIRMATION_ADMIN]', {
      trace_id: traceId,
      booking_id: emailData.id,
      admin_email: emailData.admin_email,
      status: 'sending',
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(adminEmail),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SEND_BOOKING_CONFIRMATION_ADMIN_FAILED]', {
        trace_id: traceId,
        booking_id: emailData.id,
        admin_email: emailData.admin_email,
        status: response.status,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: result.error || 'Failed to send admin email',
      };
    }

    console.log('[SEND_BOOKING_CONFIRMATION_ADMIN_SUCCESS]', {
      trace_id: traceId,
      booking_id: emailData.id,
      admin_email: emailData.admin_email,
      email_id: result.id,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      emailId: result.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEND_BOOKING_CONFIRMATION_ADMIN_EXCEPTION]', {
      trace_id: traceId,
      admin_email: emailData.admin_email,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function createCalendarEvent(
  supabase: any,
  businessId: string,
  bookingDetails: any
): Promise<string | null> {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('google_calendar_integrations')
      .select('access_token, refresh_token, token_expiry, calendar_id, is_connected')
      .eq('business_id', businessId)
      .maybeSingle();

    if (integrationError) {
      console.error('Error fetching calendar integration:', integrationError);
      return null;
    }

    if (!integration || !integration.is_connected) {
      console.log('Google Calendar not connected, skipping calendar event creation');
      return null;
    }

    console.log('Calendar integration found, attempting to create event...');

    const { data: systemIntegration, error: systemError } = await supabase
      .from('system_integrations')
      .select('config')
      .eq('integration_type', 'google_oauth')
      .maybeSingle();

    if (systemError) {
      console.error('Error fetching system integration:', systemError);
      return null;
    }

    const clientId = systemIntegration?.config?.client_id;
    const clientSecret = systemIntegration?.config?.client_secret;

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured in system_integrations table');
      return null;
    }

    console.log('OAuth credentials found, proceeding with calendar event creation...');

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
        .eq('business_id', businessId);
    }

    const startDateTime = new Date(bookingDetails.booking_date);
    const endDateTime = new Date(startDateTime.getTime() + bookingDetails.duration_minutes * 60000);

    let description = `Customer: ${bookingDetails.customer_name}\nEmail: ${bookingDetails.customer_email}`;
    if (bookingDetails.customer_phone) {
      description += `\nPhone: ${bookingDetails.customer_phone}`;
    }
    if (bookingDetails.service_type) {
      description += `\nService: ${bookingDetails.service_type}`;
    }
    if (bookingDetails.notes) {
      description += `\n\nNotes: ${bookingDetails.notes}`;
    }

    const event = {
      summary: `${bookingDetails.service_type || 'Appointment'} - ${bookingDetails.customer_name}`,
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
          email: bookingDetails.customer_email,
          displayName: bookingDetails.customer_name,
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
      console.error("Google Calendar API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return null;
    }

    const createdEvent = await response.json();
    console.log('Calendar event created successfully:', createdEvent.id);
    return createdEvent.id;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody: ConfirmationEmailRequest = await req.json();

    if (!requestBody.bookingId) {
      console.error('[SEND_BOOKING_CONFIRMATION]', {
        trace_id: traceId,
        error: 'Missing bookingId',
        timestamp: new Date().toISOString(),
      });
      throw new Error('Missing bookingId');
    }

    console.log('[SEND_BOOKING_CONFIRMATION_START]', {
      trace_id: traceId,
      booking_id: requestBody.bookingId,
      send_to_customer: requestBody.sendToCustomer !== false,
      send_to_admin: requestBody.sendToAdmin !== false,
      timestamp: new Date().toISOString(),
    });

    const sendToCustomer = requestBody.sendToCustomer !== false;
    const sendToAdmin = requestBody.sendToAdmin !== false;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', requestBody.bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      console.error('[SEND_BOOKING_CONFIRMATION]', {
        trace_id: traceId,
        error: 'Booking not found',
        booking_id: requestBody.bookingId,
        db_error: bookingError,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Booking not found');
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', booking.business_id)
      .maybeSingle();

    if (businessError || !business) {
      console.error('[SEND_BOOKING_CONFIRMATION]', {
        trace_id: traceId,
        error: 'Business not found',
        business_id: booking.business_id,
        db_error: businessError,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Business not found');
    }

    let adminEmail = null;
    if (sendToAdmin) {
      const { data: settings } = await supabase
        .from('settings')
        .select('admin_email')
        .eq('business_id', booking.business_id)
        .maybeSingle();

      adminEmail = settings?.admin_email;
    }

    const emailData = {
      ...booking,
      business_name: business.name,
      admin_email: adminEmail,
    };

    const results: { customer: { success: boolean; error?: string }; admin: { success: boolean; error?: string } } = {
      customer: { success: true },
      admin: { success: true },
    };

    if (sendToCustomer) {
      results.customer = await sendCustomerConfirmationEmail(emailData, traceId);
    }

    if (sendToAdmin) {
      results.admin = await sendAdminConfirmationEmail(emailData, traceId);
    }

    if (!booking.calendar_event_id && booking.calendar_sync_status !== 'synced') {
      console.log('[SEND_BOOKING_CONFIRMATION_CALENDAR]', {
        trace_id: traceId,
        booking_id: booking.id,
        status: 'attempting_create',
        current_sync_status: booking.calendar_sync_status,
        timestamp: new Date().toISOString(),
      });
      const calendarEventId = await createCalendarEvent(supabase, booking.business_id, booking);

      if (calendarEventId) {
        console.log('[SEND_BOOKING_CONFIRMATION_CALENDAR_SUCCESS]', {
          trace_id: traceId,
          booking_id: booking.id,
          calendar_event_id: calendarEventId,
          timestamp: new Date().toISOString(),
        });
        await supabase
          .from('bookings')
          .update({
            calendar_event_id: calendarEventId,
            calendar_sync_status: 'synced',
          })
          .eq('id', booking.id);
      } else {
        console.log('[SEND_BOOKING_CONFIRMATION_CALENDAR_SKIPPED]', {
          trace_id: traceId,
          booking_id: booking.id,
          reason: 'calendar not connected or creation failed',
          timestamp: new Date().toISOString(),
        });
        await supabase
          .from('bookings')
          .update({ calendar_sync_status: 'skipped' })
          .eq('id', booking.id);
      }
    } else if (booking.calendar_event_id) {
      console.log('[SEND_BOOKING_CONFIRMATION_CALENDAR_EXISTS]', {
        trace_id: traceId,
        booking_id: booking.id,
        calendar_event_id: booking.calendar_event_id,
        sync_status: booking.calendar_sync_status,
        timestamp: new Date().toISOString(),
      });
    }

    const hasErrors = !results.customer.success || !results.admin.success;

    console.log('[SEND_BOOKING_CONFIRMATION_COMPLETE]', {
      trace_id: traceId,
      booking_id: booking.id,
      customer_email_success: results.customer.success,
      admin_email_success: results.admin.success,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        trace_id: traceId,
        results,
        message: hasErrors ? 'Some notifications failed' : 'Confirmation emails sent successfully',
      }),
      {
        status: hasErrors ? 207 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND_BOOKING_CONFIRMATION_FAILED]", {
      trace_id: traceId,
      error: errorMessage,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        trace_id: traceId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});