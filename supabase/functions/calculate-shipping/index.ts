import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Coordinates {
  lat: number;
  lon: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeAddress(address: AddressInput): Promise<Coordinates> {
  const queries = [
    `${address.address}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`,
    `${address.city}, ${address.state} ${address.zip}, ${address.country}`,
    `${address.zip}, ${address.country}`
  ];

  let lastError = null;

  for (const query of queries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PocketCashier/1.0'
        }
      });

      if (!response.ok) {
        lastError = new Error(`Geocoding API error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      lastError = new Error(`No results for: ${query}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not geocode address. Please check your address and try again.');
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

    const { businessId, customerAddress } = await req.json();

    if (!businessId || !customerAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing businessId or customerAddress' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!customerAddress.address || !customerAddress.city || !customerAddress.state || !customerAddress.zip) {
      return new Response(
        JSON.stringify({ error: 'Address is incomplete. Please fill in all fields.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country, shipping_price_per_mile, shipping_latitude, shipping_longitude')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError || !businessData) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!businessData.shipping_address) {
      return new Response(
        JSON.stringify({ error: 'Business shipping address not configured' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let businessCoords: Coordinates;
    
    if (businessData.shipping_latitude && businessData.shipping_longitude) {
      businessCoords = {
        lat: businessData.shipping_latitude,
        lon: businessData.shipping_longitude
      };
    } else {
      businessCoords = await geocodeAddress({
        address: businessData.shipping_address,
        city: businessData.shipping_city,
        state: businessData.shipping_state,
        zip: businessData.shipping_zip,
        country: businessData.shipping_country || 'US'
      });

      await supabase
        .from('businesses')
        .update({
          shipping_latitude: businessCoords.lat,
          shipping_longitude: businessCoords.lon
        })
        .eq('id', businessId);
    }

    const customerCoords = await geocodeAddress(customerAddress);

    const distance = haversineDistance(
      businessCoords.lat,
      businessCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    const pricePerMile = businessData.shipping_price_per_mile || 0;
    const cost = distance * pricePerMile;

    return new Response(
      JSON.stringify({
        distance: Math.round(distance * 10) / 10,
        cost: Math.round(cost * 100) / 100
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating shipping:', error);
    const errorMessage = error?.message || 'Failed to calculate shipping cost';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});