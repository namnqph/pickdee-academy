// Cloudflare Pages Function: /og/p/<id>-<imageId>.jpg
// Ảnh xem trước (Open Graph) của sản phẩm, phục vụ ngay trên pickdee.vn với đường dẫn .jpg sạch,
// vì Zalo không hiện ảnh khi og:image nằm ở domain ngoài có ?query (wsrv.nl).
// Ảnh gốc .webp trên Supabase → JPG 800x800 nền trắng qua wsrv.nl (miễn phí), lưu cache Cloudflare 7 ngày.
// imageId chỉ để đổi URL khi đổi ảnh chính (cache mới). Lỗi gì cũng trả ảnh thương hiệu og-shop.jpg.

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";
const CACHE_SECONDS = 604800;

async function fallback(context) {
  const url = new URL(context.request.url);
  return context.env.ASSETS.fetch(new Request(url.origin + "/og-shop.jpg"));
}

export async function onRequestGet(context) {
  const match = /^(\d+)(?:-\d+)?\.jpg$/.exec(String(context.params.file || ""));

  if (!match) {
    return fallback(context);
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
      return fallback(context);
    }

    const img = await fetch(
      "https://wsrv.nl/?url="
        + encodeURIComponent(
          SUPABASE_URL.replace(/^https:\/\//, "")
          + "/storage/v1/object/public/shop-products/"
          + image.storage_path
        )
        + "&w=800&h=800&fit=contain&cbg=white&output=jpg&q=85"
    );

    if (!img.ok || !(img.headers.get("content-type") || "").startsWith("image/")) {
      return fallback(context);
    }

    const response = new Response(img.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=" + CACHE_SECONDS
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
  catch (_) {
    return fallback(context);
  }
}
