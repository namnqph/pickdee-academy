// Cloudflare Pages Function: /og/p/<id>-<imageId>.jpg
// Ảnh xem trước (Open Graph) của sản phẩm, phục vụ ngay trên pickdee.vn với đường dẫn .jpg sạch,
// vì Zalo không hiện ảnh khi og:image nằm ở domain ngoài có ?query.
//
// THỨ TỰ LẤY ẢNH (không bao giờ trả logo khi sản phẩm đã có ảnh — Facebook nhớ thẻ rất lâu,
// lỡ quét trúng lúc trả logo là link đó hiện logo mãi):
//   1. Ảnh chính là JPG  → đưa thẳng ảnh gốc.
//   2. Ảnh .webp/.png    → bản JPG dựng sẵn shop-products/og/<storage_path đổi đuôi .jpg>
//                          (trang quản trị tự dựng khi tải ảnh: window.pdUploadOgJpg trong
//                          shop-image-compress.js; ảnh cũ: pickdee-db/tools/og_jpg.sh).
//   3. Chưa có bản JPG   → nhờ Cloudflare chuyển sang JPEG ngay lúc phục vụ.
//   4. Chuyển không được → đưa thẳng ảnh gốc (Facebook/Messenger đọc được .webp/.png).
//   5. Sản phẩm không có ảnh nào → mới dùng ảnh thương hiệu og-shop.jpg (và KHÔNG cho cache).
//
// imageId chỉ để đổi URL khi đổi ảnh chính (ép cache mới). wsrv.nl chặn Cloudflare (403) nên không dùng.

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";
const CACHE_SECONDS = 604800;
const PUBLIC_BASE = SUPABASE_URL + "/storage/v1/object/public/shop-products/";

// why: lý do rơi về ảnh thương hiệu, trả trong header X-OG để soi lỗi bằng curl -I.
async function fallback(context, why) {
  const url = new URL(context.request.url);
  const res = await context.env.ASSETS.fetch(new Request(url.origin + "/og-shop.jpg"));
  const out = new Response(res.body, res);
  out.headers.set("X-OG", "fallback: " + (why || "?"));
  out.headers.set("Cache-Control", "no-store");
  return out;
}

function ogJpgPath(storagePath) {
  return "og/" + storagePath.replace(/\.[^./]+$/, "") + ".jpg";
}

async function okImage(url, options) {
  try {
    const res = await fetch(url, options);
    const type = res.headers.get("content-type") || "";

    if (res.ok && type.startsWith("image/")) {
      return { res, type };
    }
  }
  catch (_) { /* coi như không lấy được */ }

  return null;
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

    const originalUrl = PUBLIC_BASE + image.storage_path;
    const isJpg = /\.(jpe?g)$/i.test(image.storage_path);

    let got = null;
    let how = "";

    if (isJpg) {
      got = await okImage(originalUrl);
      how = "original";
    }
    else {
      got = await okImage(PUBLIC_BASE + ogJpgPath(image.storage_path));
      how = "og jpg";

      if (!got) {
        // Cloudflare chuyển ảnh sang JPEG ngay lúc phục vụ (zone nào không bật thì bỏ qua bước này).
        got = await okImage(originalUrl, {
          cf: { image: { format: "jpeg", quality: 85, width: 1200, fit: "scale-down", background: "#ffffff" } }
        });
        how = "cf jpeg";

        if (got && !got.type.includes("jpeg")) {
          got = null;
        }
      }

      if (!got) {
        // Thà đưa ảnh gốc .webp/.png còn hơn trả logo: Facebook/Messenger vẫn đọc được.
        got = await okImage(originalUrl);
        how = "original (non-jpg)";
      }
    }

    if (!got) {
      return fallback(context, "image unreachable");
    }

    const response = new Response(got.res.body, {
      headers: {
        "Content-Type": got.type,
        "Cache-Control": "public, max-age=" + CACHE_SECONDS,
        "X-OG": how
      }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
  catch (err) {
    return fallback(context, "error " + String(err && err.message || err).slice(0, 80));
  }
}
