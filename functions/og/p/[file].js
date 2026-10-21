// Cloudflare Pages Function: /og/p/<id>-<imageId>.jpg
// Ảnh xem trước (Open Graph) của sản phẩm, phục vụ ngay trên pickdee.vn với đường dẫn .jpg sạch,
// vì Zalo không hiện ảnh khi og:image nằm ở domain ngoài có ?query (wsrv.nl).
// Ảnh gốc .webp trên Supabase → JPG 800x800 nền trắng qua wsrv.nl (miễn phí), lưu cache Cloudflare 7 ngày.
// imageId chỉ để đổi URL khi đổi ảnh chính (cache mới). Lỗi gì cũng trả ảnh thương hiệu og-shop.jpg.

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";
const CACHE_SECONDS = 604800;

// why: lý do rơi về ảnh thương hiệu, trả trong header X-OG để soi lỗi bằng curl -I.
async function fallback(context, why) {
  const url = new URL(context.request.url);
  const res = await context.env.ASSETS.fetch(new Request(url.origin + "/og-shop.jpg"));
  const out = new Response(res.body, res);
  out.headers.set("X-OG", "fallback: " + (why || "?"));
  out.headers.set("Cache-Control", "no-store");
  return out;
}

function imageResponse(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=" + CACHE_SECONDS
    }
  });
}

export async function onRequestGet(context) {
  const match = /^(\d+)(?:-\d+)?\.jpg$/.exec(String(context.params.file || ""));

  if (!match) {
    return fallback(context, "bad name");
  }

  const cache = caches.default;
  const cacheKey = new Request(context.request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const res = await fetch(
      SUPABASE_URL
        + "/rest/v1/shop_products"
        + "?select=shop_product_images(storage_path,is_primary,sort_order,id)"
        + "&status=eq.active&id=eq." + match[1],
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: "Bearer " + PUBLISHABLE_KEY
        }
      }
    );

    const product = res.ok ? (await res.json())[0] : null;

    const image = (product?.shop_product_images || [])
      .slice()
      .sort((a, b) =>
        (b.is_primary === true) - (a.is_primary === true)
        || (a.sort_order || 0) - (b.sort_order || 0)
        || a.id - b.id
      )[0];

    if (!image) {
      return fallback(context, "no image (product " + res.status + ")");
    }

    const original = SUPABASE_URL + "/storage/v1/object/public/shop-products/" + image.storage_path;

    const img = await fetch(
      "https://wsrv.nl/?url="
        + encodeURIComponent(original.replace(/^https:\/\//, ""))
        + "&w=800&h=800&fit=contain&cbg=white&output=jpg&q=85",
      { headers: { "User-Agent": "PickDee-OG/1.0 (+https://pickdee.vn)", Accept: "image/jpeg,image/*" } }
    );

    let response;

    if (img.ok && (img.headers.get("content-type") || "").startsWith("image/")) {
      response = imageResponse(img.body);
      response.headers.set("X-OG", "wsrv");
    }
    else if (/\.(jpe?g)$/i.test(image.storage_path)) {
      // wsrv lỗi: ảnh gốc đã là JPG thì đưa thẳng ảnh gốc, Zalo vẫn hiện được.
      const raw = await fetch(original);

      if (!raw.ok) {
        return fallback(context, "wsrv " + img.status + ", original " + raw.status);
      }

      response = imageResponse(raw.body);
      response.headers.set("X-OG", "original (wsrv " + img.status + ")");
    }
    else {
      return fallback(context, "wsrv " + img.status);
    }

    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
  catch (err) {
    return fallback(context, "error " + String(err && err.message || err).slice(0, 80));
  }
}
