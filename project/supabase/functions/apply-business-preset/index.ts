import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApplyPresetRequest {
  businessId: string;
  presetId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { businessId, presetId } = (await req.json()) as ApplyPresetRequest;

    if (!businessId || !presetId) {
      return new Response(
        JSON.stringify({ error: "Missing businessId or presetId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Fetch preset data
    const presetRes = await fetch(
      `${supabaseUrl}/rest/v1/business_presets?id=eq.${presetId}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
        },
      }
    );

    if (!presetRes.ok) {
      throw new Error("Failed to fetch preset");
    }

    const [preset] = await presetRes.json();

    if (!preset) {
      return new Response(JSON.stringify({ error: "Preset not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update business with preset colors and settings
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({
          primary_color: preset.primary_color,
          secondary_color: preset.secondary_color,
          text_color: preset.text_color,
          page_background_color: preset.page_background_color,
          hero_banner_bg_color: preset.hero_banner_bg_color,
          hero_banner_text_color: preset.hero_banner_text_color,
          hero_message: preset.hero_message,
          show_menu: preset.show_menu,
          show_reviews: preset.show_reviews,
          show_events: preset.show_events,
          show_bookings: preset.show_bookings,
          show_videos: preset.show_videos,
          show_business_info: preset.show_business_info,
          show_hero_message: preset.show_hero_message,
          orders_enabled: preset.orders_enabled,
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error("Failed to update business");
    }

    // Fetch preset menu items
    const itemsRes = await fetch(
      `${supabaseUrl}/rest/v1/preset_menu_items?preset_id=eq.${presetId}&order=display_order`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
        },
      }
    );

    if (!itemsRes.ok) {
      throw new Error("Failed to fetch preset menu items");
    }

    const presetItems = await itemsRes.json();

    // Insert menu items for the business
    if (presetItems && presetItems.length > 0) {
      const menuItems = presetItems.map((item: any) => ({
        business_id: businessId,
        name: item.name,
        description: item.description,
        price: item.price,
        item_type: item.item_type,
        image_url: item.image_url,
        is_available: true,
      }));

      const insertRes = await fetch(
        `${supabaseUrl}/rest/v1/menu_items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            apikey: supabaseServiceKey,
          },
          body: JSON.stringify(menuItems),
        }
      );

      if (!insertRes.ok) {
        console.error("Failed to insert menu items");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Preset applied successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error applying preset:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to apply preset",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});