import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingRequest {
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  booking_time: string;
  menu_item_id?: string;
  payment_amount?: number;
  payment_status?: string;
  payment_id?: string;
  duration_minutes?: number;
  service_type?: string;
  notes?: string;
  idempotency_key?: string;
}

async function createCalendarEvent(
  supabaseUrl: string,
  supabaseServiceKey: string,
  businessId: string,
  bookingId: string,
  bookingData: any,
  bookingDatetime: Date
): Promise<string | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-google-calendar-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        business_id: businessId,
        booking_id: bookingId,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        service_type: bookingData.service_type,
        booking_datetime: bookingDatetime.toISOString(),
        duration_minutes: bookingData.duration_minutes,
        notes: bookingData.notes,
      }),
    });

    const result = await response.json();

    if (result.calendar_event_id) {
      console.log('Calendar event created successfully:', result.calendar_event_id);
      return result.calendar_event_id;
    } else {
      console.log('No calendar event created:', result.error || 'Unknown reason');
      return null;
    }
  } catch (error) {
    console.error('Failed to call calendar event creation:', error);
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

    const bookingRequest: BookingRequest = await req.json();
    const idempotencyKey = bookingRequest.idempotency_key || crypto.randomUUID();

    console.log('[CREATE_BOOKING_START]', {
      trace_id: traceId,
      idempotency_key: idempotencyKey,
      business_id: bookingRequest.business_id,
      customer_email: bookingRequest.customer_email,
      booking_date: bookingRequest.booking_date,
      timestamp: new Date().toISOString(),
    });

    if (!bookingRequest.business_id || !bookingRequest.customer_name ||
        !bookingRequest.customer_email || !bookingRequest.booking_date || !bookingRequest.booking_time) {
      console.error('[CREATE_BOOKING_VALIDATION_ERROR]', {
        trace_id: traceId,
        fields_provided: {
          business_id: !!bookingRequest.business_id,
          customer_name: !!bookingRequest.customer_name,
          customer_email: !!bookingRequest.customer_email,
          booking_date: !!bookingRequest.booking_date,
          booking_time: !!bookingRequest.booking_time,
        },
        timestamp: new Date().toISOString(),
      });
      throw new Error('Missing required fields: business_id, customer_name, customer_email, booking_date, booking_time');
    }

    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, calendar_sync_status, email_sent_to_customer, email_sent_to_admin')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingBooking) {
      console.log('[CREATE_BOOKING_IDEMPOTENCY_HIT]', {
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        existing_booking_id: existingBooking.id,
        calendar_synced: existingBooking.calendar_sync_status === 'synced',
        emails_sent: existingBooking.email_sent_to_customer && existingBooking.email_sent_to_admin,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: true,
          trace_id: traceId,
          message: 'Booking already exists (idempotent)',
          booking: existingBooking,
          notifications: {
            calendar_synced: existingBooking.calendar_sync_status === 'synced',
            emails_sent: existingBooking.email_sent_to_customer && existingBooking.email_sent_to_admin,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', bookingRequest.business_id)
      .maybeSingle();

    if (!business) {
      console.error('[CREATE_BOOKING_BUSINESS_NOT_FOUND]', {
        trace_id: traceId,
        business_id: bookingRequest.business_id,
        timestamp: new Date().toISOString(),
      });
      throw new Error('Business not found');
    }

    let serviceName = bookingRequest.service_type || 'Appointment';
    if (bookingRequest.menu_item_id) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('name')
        .eq('id', bookingRequest.menu_item_id)
        .maybeSingle();

      if (menuItem) {
        serviceName = menuItem.name;
      }
    }

    const bookingDatetime = new Date(`${bookingRequest.booking_date}T${bookingRequest.booking_time}`);

    const { data: businessSettings } = await supabase
      .from('settings')
      .select('timezone')
      .eq('business_id', bookingRequest.business_id)
      .maybeSingle();

    const timezone = businessSettings?.timezone || 'America/New_York';

    const bookingData = {
      business_id: bookingRequest.business_id,
      customer_name: bookingRequest.customer_name,
      customer_email: bookingRequest.customer_email,
      customer_phone: bookingRequest.customer_phone || null,
      booking_date: bookingDatetime.toISOString(),
      duration_minutes: bookingRequest.duration_minutes || 60,
      status: 'pending',
      service_type: serviceName,
      notes: bookingRequest.notes || null,
      menu_item_id: bookingRequest.menu_item_id || null,
      payment_amount: bookingRequest.payment_amount || null,
      payment_status: bookingRequest.payment_status || 'pending',
      payment_id: bookingRequest.payment_id || null,
      trace_id: traceId,
      idempotency_key: idempotencyKey,
      business_timezone: timezone,
      calendar_sync_status: 'pending',
      email_sent_to_customer: false,
      email_sent_to_admin: false,
    };

    console.log('[CREATE_BOOKING_INSERTING]', {
      trace_id: traceId,
      service_name: serviceName,
      customer_email: bookingRequest.customer_email,
      timestamp: new Date().toISOString(),
    });

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (bookingError) {
      console.error('[CREATE_BOOKING_INSERT_FAILED]', {
        trace_id: traceId,
        error: bookingError.message,
        error_code: bookingError.code,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log('[CREATE_BOOKING_INSERTED]', {
      trace_id: traceId,
      booking_id: booking.id,
      timestamp: new Date().toISOString(),
    });

    let calendarEventId = null;
    try {
      console.log('[CREATE_BOOKING_CALENDAR_START]', {
        trace_id: traceId,
        booking_id: booking.id,
        timestamp: new Date().toISOString(),
      });

      calendarEventId = await createCalendarEvent(
        supabaseUrl,
        supabaseServiceKey,
        bookingRequest.business_id,
        booking.id,
        bookingData,
        bookingDatetime
      );

      if (calendarEventId) {
        console.log('[CREATE_BOOKING_CALENDAR_SUCCESS]', {
          trace_id: traceId,
          booking_id: booking.id,
          calendar_event_id: calendarEventId,
          timestamp: new Date().toISOString(),
        });
        await supabase
          .from('bookings')
          .update({ calendar_event_id: calendarEventId, calendar_sync_status: 'synced' })
          .eq('id', booking.id);
      } else {
        console.log('[CREATE_BOOKING_CALENDAR_SKIPPED]', {
          trace_id: traceId,
          booking_id: booking.id,
          reason: 'calendar not connected',
          timestamp: new Date().toISOString(),
        });
        await supabase
          .from('bookings')
          .update({ calendar_sync_status: 'skipped' })
          .eq('id', booking.id);
      }
    } catch (calendarError) {
      const errorMsg = calendarError instanceof Error ? calendarError.message : 'Unknown error';
      console.error('[CREATE_BOOKING_CALENDAR_ERROR]', {
        trace_id: traceId,
        booking_id: booking.id,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      await supabase
        .from('bookings')
        .update({ calendar_sync_status: 'failed', last_sync_error: errorMsg })
        .eq('id', booking.id);
    }

    let emailResult = { success: false };
    try {
      console.log('[CREATE_BOOKING_EMAIL_START]', {
        trace_id: traceId,
        booking_id: booking.id,
        timestamp: new Date().toISOString(),
      });

      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          sendToCustomer: true,
          sendToAdmin: true,
        }),
      });

      emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        console.error('[CREATE_BOOKING_EMAIL_FAILED]', {
          trace_id: traceId,
          booking_id: booking.id,
          status: emailResponse.status,
          error: emailResult.error,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log('[CREATE_BOOKING_EMAIL_SUCCESS]', {
          trace_id: traceId,
          booking_id: booking.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (emailError) {
      const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
      console.error('[CREATE_BOOKING_EMAIL_ERROR]', {
        trace_id: traceId,
        booking_id: booking.id,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    }

    await supabase
      .from('bookings')
      .update({
        email_sent_to_customer: emailResult.success,
        email_sent_to_admin: emailResult.success,
      })
      .eq('id', booking.id);

    console.log('[CREATE_BOOKING_COMPLETE]', {
      trace_id: traceId,
      booking_id: booking.id,
      idempotency_key: idempotencyKey,
      calendar_synced: !!calendarEventId,
      email_success: emailResult.success,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        booking: {
          id: booking.id,
          calendar_event_id: calendarEventId,
          calendar_sync_status: calendarEventId ? 'synced' : 'skipped',
          email_sent_to_customer: emailResult.success,
          email_sent_to_admin: emailResult.success,
        },
        notifications: {
          calendar_synced: !!calendarEventId,
          emails_sent: emailResult.success,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CREATE_BOOKING_FAILED]", {
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
