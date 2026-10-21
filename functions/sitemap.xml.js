// Cloudflare Pages Function: /sitemap.xml
// Sitemap tự cập nhật: trang công khai + mọi sân active (court_directory) + mọi sản phẩm active (shop_products).
// Chỉ đọc dữ liệu công khai bằng publishable key; cache Cloudflare 1 giờ.

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";
const SITE = "https://pickdee.vn";
const PAGE = 1000;

const STATIC_PAGES = [
  ["/", "1.0"],
  ["/academy", "0.9"],
  ["/shop", "0.9"],
  ["/courts", "0.9"],
  ["/find-coach", "0.8"],
  ["/dang-ky", "0.6"],
  ["/student-register", "0.6"],
  ["/apply-coach", "0.5"],
  ["/cong-tac-vien", "0.5"]
];

async function fetchAll(table) {
  const rows = [];

  for (let from = 0; ; from += PAGE) {
    const res = await fetch(
      SUPABASE_URL + "/rest/v1/" + table
        + "?select=id,updated_at&status=eq.active&order=id.asc",
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: "Bearer " + PUBLISHABLE_KEY,
          Range: from + "-" + (from + PAGE - 1)
        }
      }
    );

    if (!res.ok) {
      throw new Error(table + " " + res.status);
    }

    const batch = await res.json();
    rows.push(...batch);

    if (batch.length < PAGE) {
      return rows;
    }
  }
}

function entry(loc, lastmod, priority) {
  return "<url><loc>" + loc + "</loc>"
    + (lastmod ? "<lastmod>" + String(lastmod).slice(0, 10) + "</lastmod>" : "")
    + "<priority>" + priority + "</priority></url>";
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).origin + "/sitemap.xml", { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  const [courts, products] = await Promise.all([
    fetchAll("court_directory").catch(() => []),
    fetchAll("shop_products").catch(() => [])
  ]);

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + STATIC_PAGES.map(([path, p]) => entry(SITE + path, "", p)).join("")
    + products.map(r => entry(SITE + "/shop-product?id=" + r.id, r.updated_at, "0.8")).join("")
    + courts.map(r => entry(SITE + "/court?id=" + r.id, r.updated_at, "0.7")).join("")
    + "</urlset>";

  const response = new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });

  if (courts.length && products.length) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}
