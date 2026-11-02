// Cloudflare Pages middleware: mọi trang HTML công khai đều có thẻ xem trước (Open Graph) có ảnh khi gửi link
// qua Zalo / Messenger / Facebook / TikTok / Telegram. Trang nào đã tự khai báo og:image (shop, sản phẩm, trang chủ…)
// thì giữ nguyên; trang chưa có thì thêm thẻ mặc định (ảnh og-pickdee.jpg 1200x630, shop-* dùng og-shop.jpg).
// Lỗi gì cũng trả trang gốc.

const SITE = "https://pickdee.vn";

function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function onRequest(context) {
  const response = await context.next();
  let keep = response;   // bản chưa bị đọc, dùng khi có lỗi

  try {
    if (context.request.method !== "GET") return response;
    if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

    const original = response.clone();
    keep = original;
    const html = await response.text();

    if (/property=["']og:image["']/i.test(html)) return original;

    const url = new URL(context.request.url);
    const path = url.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    const title = ((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "PickDee").trim();
    const desc = (
      (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]
      || "PickDee — học pickleball cùng Coach và mua phụ kiện pickleball chính hãng. Đặt nhanh, giao toàn quốc."
    ).trim();
    const image = SITE + (path.startsWith("/shop") ? "/og-shop.jpg" : "/og-pickdee.jpg");
    const pageUrl = SITE + (path === "/" ? "/" : path) + url.search;

    const meta =
      `<meta property="og:type" content="website">`
      + `<meta property="og:site_name" content="PickDee">`
      + `<meta property="og:title" content="${esc(title)}">`
      + `<meta property="og:description" content="${esc(desc)}">`
      + `<meta property="og:url" content="${esc(pageUrl)}">`
      + `<meta property="og:image" content="${image}">`
      + `<meta property="og:image:secure_url" content="${image}">`
      + `<meta property="og:image:type" content="image/jpeg">`
      + `<meta property="og:image:width" content="1200">`
      + `<meta property="og:image:height" content="630">`
      + `<meta name="twitter:card" content="summary_large_image">`
      + `<meta name="twitter:title" content="${esc(title)}">`
      + `<meta name="twitter:image" content="${image}">`;

    const out = html.includes("<head>")
      ? html.replace("<head>", "<head>" + meta)
      : html.replace(/<head([^>]*)>/i, (m) => m + meta);
    if (out === html) return original;

    const headers = new Headers(original.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(out, { status: original.status, statusText: original.statusText, headers });
  } catch (_) {
    return keep;
  }
}
