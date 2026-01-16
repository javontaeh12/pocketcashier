import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CleanupResult {
  business_id: string;
  customers_deleted: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: CleanupResult[] = [];

    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, customer_data_retention_days')
      .eq('is_active', true);

    if (businessesError) {
      throw businessesError;
    }

    for (const business of businesses || []) {
      try {
        const retentionDays = business.customer_data_retention_days || 14;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const { data: customersToDelete, error: fetchError } = await supabase
          .from('customers')
          .select('id')
          .eq('business_id', business.id)
          .lt('last_activity_at', cutoffDate.toISOString())
          .limit(1000);

        if (fetchError) {
          results.push({
            business_id: business.id,
            customers_deleted: 0,
            error: fetchError.message,
          });
          continue;
        }

        if (!customersToDelete || customersToDelete.length === 0) {
          results.push({
            business_id: business.id,
            customers_deleted: 0,
          });
          continue;
        }

        const customerIds = customersToDelete.map(c => c.id);

        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .in('id', customerIds);

        if (deleteError) {
          results.push({
            business_id: business.id,
            customers_deleted: 0,
            error: deleteError.message,
          });
        } else {
          results.push({
            business_id: business.id,
            customers_deleted: customersToDelete.length,
          });
        }
      } catch (error) {
        results.push({
          business_id: business.id,
          customers_deleted: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
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
