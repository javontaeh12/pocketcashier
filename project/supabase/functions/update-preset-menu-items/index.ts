import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PresetMenuItem {
  id?: string;
  name: string;
  description?: string;
  price: number;
  item_type: string;
  display_order?: number;
  image_url?: string;
}

interface UpdateMenuRequest {
  presetId: string;
  items: PresetMenuItem[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { presetId, items }: UpdateMenuRequest = await req.json();

    if (!presetId || !items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: "presetId and items array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "Prefer": "return=representation",
    };

    for (const item of items) {
      if (item.id) {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/preset_menu_items?id=eq.${item.id}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              name: item.name,
              description: item.description,
              price: item.price,
              item_type: item.item_type,
              display_order: item.display_order || 0,
              image_url: item.image_url,
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Failed to update menu item: ${await updateResponse.text()}`);
        }
      } else {
        const createResponse = await fetch(
          `${supabaseUrl}/rest/v1/preset_menu_items`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              preset_id: presetId,
              name: item.name,
              description: item.description,
              price: item.price,
              item_type: item.item_type,
              display_order: item.display_order || 0,
              image_url: item.image_url,
            }),
          }
        );

        if (!createResponse.ok) {
          throw new Error(`Failed to create menu item: ${await createResponse.text()}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Menu items updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
