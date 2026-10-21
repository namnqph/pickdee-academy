// Cloudflare Pages Function: /og/p/<id>-<imageId>.jpg
// Ảnh xem trước (Open Graph) của sản phẩm, phục vụ ngay trên pickdee.vn với đường dẫn .jpg sạch,
// vì Zalo không hiện ảnh khi og:image nằm ở domain ngoài có ?query.
// Ảnh chính là JPG → đưa thẳng ảnh gốc. Ảnh .webp (Zalo không đọc) → bản JPG dựng sẵn
// shop-products/og/<storage_path đổi đuôi .jpg>, trang quản trị tự dựng khi tải ảnh
// (window.pdUploadOgJpg trong shop-image-compress.js; ảnh cũ: pickdee-db/tools/og_jpg.sh). wsrv.nl chặn Cloudflare (403) nên không dùng.
// Lưu cache Cloudflare 7 ngày.
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

    const isJpg = /\.(jpe?g)$/i.test(image.storage_path);
    const source = SUPABASE_URL + "/storage/v1/object/public/shop-products/"
      + (isJpg ? image.storage_path : "og/" + image.storage_path.replace(/\.[^./]+$/, "") + ".jpg");

    const img = await fetch(source);

    if (!img.ok || !(img.headers.get("content-type") || "").startsWith("image/")) {
      return fallback(context, (isJpg ? "original " : "og jpg missing ") + img.status);
    }

    const response = imageResponse(img.body);
    response.headers.set("X-OG", isJpg ? "original" : "og jpg");

    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
  catch (err) {
    return fallback(context, "error " + String(err && err.message || err).slice(0, 80));
  }
}
