import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event) => {
  try {
    const slug = event.queryStringParameters?.slug;
    const userAgent = event.headers["user-agent"] || "";

    if (!slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing slug parameter" }),
      };
    }

    // Comprehensive bot/crawler detection for ALL major platforms
    // Includes: social media, messaging apps, email clients, collaboration tools, and generic patterns
    const isBot = /bot|crawler|spider|scraper|preview|linkexpand|share|unfurl|embed|thumbnail|facebookexternalhit|facebookcatalog|facebot|twitterbot|whatsapp|slack|slackbot|telegram|telegrambot|ogparser|discordbot|linkedinbot|linkedin|googlebot|bingbot|yandexbot|applebot|applecoreMedia|cfnetwork|darwin|iphone.*safari.*version|com\.apple|messageslinkpreview|snapchat|bytespider|tiktok|skype|teams|wechat|line|viber|signal|pinterestbot|redditbot|tumblr|instagrambot|validator|prerender|headless|phantom|puppeteer|selenium|curl|wget|libwww|python|java|okhttp|axios|got|fetch|http|preview\.link/i.test(userAgent);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error: rpcError } = await supabase
      .rpc("resolve_business_slug", { slug_param: slug });

    if (rpcError || !data || data.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        body: `<!DOCTYPE html><html><head><title>Business Not Found</title></head><body><h1>Business Not Found</h1></body></html>`,
      };
    }

    const business = data[0];

    if (!business.is_active) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        body: `<!DOCTYPE html><html><head><title>Business Unavailable</title></head><body><h1>Business Unavailable</h1></body></html>`,
      };
    }

    const baseUrl = process.env.URL || "https://pocketcashiermobile.com";
    const businessUrl = `${baseUrl}/b/${business.slug}`;

    const title = business.share_title || business.name;
    const description = business.share_description || business.page_description || `Visit ${business.name}`;

    let image = `${baseUrl}/default-og-image.png`;
    if (business.share_image_path) {
      image = `${supabaseUrl}/storage/v1/object/public/business-share-images/${business.share_image_path}`;
    } else if (business.logo_url) {
      image = business.logo_url;
    }

    const getImageType = (url: string): string => {
      const ext = url.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
      if (ext === 'png') return 'image/png';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'svg') return 'image/svg+xml';
      return 'image/png';
    };

    const imageType = getImageType(image);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(businessUrl)}" />

  <!-- Open Graph / Facebook / WhatsApp / LinkedIn / Instagram -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(business.name)}" />
  <meta property="og:url" content="${escapeHtml(businessUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:url" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(business.name)}" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${escapeHtml(business.name)}" />
  <meta name="twitter:url" content="${escapeHtml(businessUrl)}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:src" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(business.name)}" />

  <!-- LinkedIn -->
  <meta property="article:author" content="${escapeHtml(business.name)}" />

  <!-- Schema.org / Structured Data (for messaging apps and email clients) -->
  <meta itemprop="name" content="${escapeHtml(title)}" />
  <meta itemprop="description" content="${escapeHtml(description)}" />
  <meta itemprop="image" content="${escapeHtml(image)}" />

  <!-- Apple iOS / iMessage / Safari -->
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(title)}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="apple-touch-icon" href="${escapeHtml(image)}" />

  ${!isBot ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(businessUrl)}" />
  <script>window.location.href = '${escapeHtml(businessUrl)}';</script>` : ""}
</head>
<body>
  ${!isBot ? `<p>Redirecting to ${escapeHtml(business.name)}...</p>` : `<h1>${escapeHtml(business.name)}</h1><p>${escapeHtml(description)}</p>`}
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      body: html,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export { handler };
