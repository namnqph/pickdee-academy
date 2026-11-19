// Lá chắn Cloudflare cho Supabase (19/11/2026, sau vụ Supabase khoá dự án vì vượt hạn mức).
// - Ảnh công khai (/sb/storage/v1/object/public/...): giữ ở Cloudflare 1 ngày → giảm lưu lượng Supabase.
// - Dữ liệu danh mục shop/sân (/sb/rest/v1/<bảng công khai>): LUÔN lấy trực tiếp Supabase (giá không bao giờ cũ);
//   chỉ khi Supabase lỗi/khoá mới trả bản dự phòng gần nhất (đánh dấu x-pd-stale: 1).
// - Chỉ GET, chỉ khách chưa đăng nhập (không có JWT người dùng) → không bao giờ lẫn dữ liệu riêng giữa người dùng.

const UPSTREAM = "https://snxztjsluhdibrklougo.supabase.co";
const REST_TABLES = /^\/rest\/v1\/(shop_products|shop_product_images|shop_categories|shop_product_variants|shop_promotions|court_directory)$/;
const IMG_PREFIX = "/storage/v1/object/public/";
const FWD_REQ = ["apikey", "authorization", "accept", "accept-profile", "prefer", "range", "x-client-info"];
const FWD_RES = ["content-type", "content-range", "content-profile", "etag", "last-modified"];

function pick(src, names) {
  const h = new Headers();
  for (const n of names) { const v = src.get(n); if (v) h.set(n, v); }
  return h;
}

function cacheKey(path, search, req) {
  const extra = ["accept", "accept-profile", "prefer", "range"].map(n => req.headers.get(n) || "").join("|");
  return new Request("https://pickdee.vn/__sbcache" + path + search + (search ? "&" : "?") + "__h=" + encodeURIComponent(extra));
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/sb/, "");
  const isImg = path.startsWith(IMG_PREFIX);
  const isRest = REST_TABLES.test(path);
  if (!isImg && !isRest) return new Response("Not found", { status: 404 });
  if (isRest && /^Bearer\s+eyJ/i.test(request.headers.get("authorization") || "")) {
    return new Response("Signed-in requests must go to Supabase directly", { status: 400 });
  }

  const cache = caches.default;
  const key = cacheKey(path, url.search, request);
  const target = UPSTREAM + path + url.search;

  if (isImg) {
    const hit = await cache.match(key);
    if (hit) return hit;
    let up;
    try { up = await fetch(target, { headers: pick(request.headers, ["accept"]) }); } catch (_) { up = null; }
    if (up && up.ok) {
      const h = pick(up.headers, FWD_RES);
      h.set("cache-control", "public, max-age=86400");
      const res = new Response(up.body, { status: 200, headers: h });
      context.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    return up || new Response("Image unavailable", { status: 502 });
  }

  // REST: network-first, bản dự phòng khi Supabase lỗi.
  let up = null;
  try { up = await fetch(target, { headers: pick(request.headers, FWD_REQ) }); } catch (_) { up = null; }
  if (up && up.status < 400) {
    const h = pick(up.headers, FWD_RES);
    h.set("cache-control", "no-store");
    const res = new Response(up.body, { status: up.status, headers: h });
    const copy = res.clone();
    const sh = new Headers(copy.headers);
    sh.set("cache-control", "public, max-age=2592000");
    context.waitUntil(copy.arrayBuffer().then(b => cache.put(key, new Response(b, { status: copy.status, headers: sh }))));
    return res;
  }
  if (!up || up.status >= 500 || up.status === 402 || up.status === 429) {
    const stale = await cache.match(key);
    if (stale) {
      const h = new Headers(stale.headers);
      h.set("x-pd-stale", "1");
      h.set("cache-control", "no-store");
      return new Response(stale.body, { status: stale.status, headers: h });
    }
  }
  return up || new Response(JSON.stringify({ message: "Upstream unavailable" }), { status: 503, headers: { "content-type": "application/json" } });
}
