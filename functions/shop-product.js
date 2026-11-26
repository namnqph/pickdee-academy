// Cloudflare Pages Function cho /shop-product?id=...
// Gắn sẵn tên, giá, ảnh sản phẩm vào <head> (Open Graph) để khi gửi link qua Zalo / Messenger / Facebook
// sẽ hiện thẻ có ảnh giống link Shopee. Trang hiển thị cho khách giữ nguyên.
// Chỉ đọc dữ liệu công khai bằng publishable key (giống config.js); lỗi gì cũng trả trang gốc.

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function vnd(n) {
  return Math.round(Number(n) || 0).toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

// Đọc kích thước thật của ảnh xem trước (JPEG/PNG/WebP) để khai báo og:image:width/height cho đúng.
// Facebook dựng thẻ ảnh lớn ngay từ lần quét đầu khi biết kích thước; khai sai hoặc thiếu dễ ra thẻ ảnh nhỏ.
function readImageSize(buf) {
  const d = new DataView(buf);
  const len = d.byteLength;

  // PNG
  if (len > 24 && d.getUint32(0) === 0x89504e47) {
    return { width: d.getUint32(16), height: d.getUint32(20) };
  }

  // WebP (RIFF....WEBP)
  if (len > 30 && d.getUint32(0) === 0x52494646 && d.getUint32(8) === 0x57454250) {
    const fourcc = d.getUint32(12);
    if (fourcc === 0x56503858) { // VP8X
      return {
        width: 1 + (d.getUint8(24) | (d.getUint8(25) << 8) | (d.getUint8(26) << 16)),
        height: 1 + (d.getUint8(27) | (d.getUint8(28) << 8) | (d.getUint8(29) << 16))
      };
    }
    if (fourcc === 0x56503820) { // VP8
      return { width: d.getUint16(26, true) & 0x3fff, height: d.getUint16(28, true) & 0x3fff };
    }
    if (fourcc === 0x5650384c) { // VP8L
      const b = d.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }

  // JPEG: đi qua các segment tới SOF
  if (len > 4 && d.getUint16(0) === 0xffd8) {
    let i = 2;
    while (i + 9 < len) {
      if (d.getUint8(i) !== 0xff) { i++; continue; }
      const marker = d.getUint8(i + 1);
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const size = d.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: d.getUint16(i + 5), width: d.getUint16(i + 7) };
      }
      i += 2 + size;
    }
  }

  return null;
}

async function imageSize(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      headers: { Range: "bytes=0-65535" },
      cf: { cacheTtl: 604800, cacheEverything: true }
    });

    if (!res.ok) {
      return null;
    }

    return readImageSize(await res.arrayBuffer());
  }
  catch (_) {
    return null;
  }
}

// 24/11: Zalo trên iPhone gửi thẻ KHÔNG ẢNH khi anh dán link rồi bấm Gửi ngay (bóng LT48, id 1): lần đầu
// bot quét, ảnh /og/p/…-s.jpg phải tra lại Supabase (Sydney) rồi mới lấy ảnh → chậm ~1s, Zalo không chờ.
// Nay lúc dựng thẻ, lấy luôn bản nhỏ og-s/ (đã biết storage_path, khỏi tra lại) và nạp vào bộ đệm biên
// đúng khoá mà functions/og/p/[file].js đọc → bot hỏi ảnh là có ngay. Đã có trong bộ đệm thì đọc kích
// thước từ đó (không tốn băng thông Supabase). Thiếu bản nhỏ → trả null, dùng cách cũ imageSize().
async function warmSmallImage(imageUrl, storagePath) {
  try {
    const cache = caches.default;
    const key = new Request(imageUrl, { method: "GET" });
    const hit = await cache.match(key);

    if (hit) {
      return readImageSize(await hit.arrayBuffer());
    }

    // 26/11: ưu tiên bản NGANG og-l/ (Zalo iPhone bỏ ảnh dọc), thiếu thì bản nhỏ og-s/.
    const base = SUPABASE_URL + "/storage/v1/object/public/shop-products/";
    const name = storagePath.replace(/\.[^./]+$/, "") + ".jpg";
    let how = "og land";
    let res = await fetch(base + "og-l/" + name);

    if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/")) {
      how = "og small";
      res = await fetch(base + "og-s/" + name);
    }

    const type = res.headers.get("content-type") || "";

    if (!res.ok || !type.startsWith("image/")) {
      return null;
    }

    const buf = await res.arrayBuffer();
    const size = readImageSize(buf);

    if (!size) {
      return null;
    }

    await cache.put(key, new Response(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800",
        "X-OG": how
      }
    }));

    return size;
  }
  catch (_) {
    return null;
  }
}

// Bot đọc thẻ xem trước của Facebook/Messenger/Zalo/Telegram… (không phải người xem trang).
function isCrawler(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  return /facebookexternalhit|facebookcatalog|meta-externalagent|messenger|zalo|twitterbot|telegrambot|whatsapp|linkedinbot|skypeuripreview|discordbot|slackbot|pinterest|viber/.test(ua);
}

// Sản phẩm chưa sẵn sàng (chưa mở bán / chưa có ảnh): KHÔNG trả thẻ logo cho bot, mà báo 404.
// Facebook nhớ thẻ rất lâu — thà để nó "chưa đọc được" rồi quét lại sau, còn hơn nhớ thẻ logo
// rồi link đó hiện logo mãi dù sau này sản phẩm đã có ảnh.
function notReadyForCrawler(request) {
  if (!isCrawler(request)) {
    return null;
  }

  return new Response("San pham chua san sang de chia se.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
  });
}

// Bot đọc thẻ phải nhận trang THẬT NHANH: Messenger chỉ dựng thẻ xem trước nếu Facebook quét xong
// trước khi anh bấm Gửi, mà Facebook quét 2 lần (lần 2 theo og:url có dấu phiên bản). Dựng trang 1 lần
// rồi giữ ở biên Cloudflare → lần quét sau chỉ còn vài chục ms.
const CARD_CACHE_TTL = 600;

function cardCacheKey(id, vParam) {
  return new Request(
    "https://pickdee.vn/__og-card/l/" + id + (vParam ? "?v=" + encodeURIComponent(vParam) : ""),
    { headers: { "accept": "text/html" } }
  );
}

export async function onRequestGet(context) {
  const reqUrl = new URL(context.request.url);
  const reqId = reqUrl.searchParams.get("id") || "";
  const rawV = reqUrl.searchParams.get("v") || "";
  const safeV = /^[A-Za-z0-9_-]{1,16}$/.test(rawV) ? rawV : "";
  const crawler = isCrawler(context.request) && /^\d+$/.test(reqId);

  let cardCache = null;

  if (crawler) {
    try {
      cardCache = caches.default;
      const hit = await cardCache.match(cardCacheKey(reqId, safeV));

      if (hit) {
        return hit;
      }
    }
    catch (_) {
      cardCache = null;
    }
  }

  const response = await context.next();

  try {
    const url = reqUrl;
    const id = reqId;

    if (
      !/^\d+$/.test(id)
      || !(response.headers.get("content-type") || "").includes("text/html")
    ) {
      return response;
    }

    const api =
      SUPABASE_URL
      + "/rest/v1/shop_products"
      + "?select=name,short_description,brand,"
      + "shop_product_variants(price,is_active,is_sold_out,sku),"
      + "shop_product_images(storage_path,is_primary,sort_order,id)"
      + "&status=eq.active&id=eq." + id;

    const res = await fetch(api, {
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: "Bearer " + PUBLISHABLE_KEY
      },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!res.ok) {
      return notReadyForCrawler(context.request) || response;
    }

    const product = (await res.json())[0];

    if (!product) {
      return notReadyForCrawler(context.request) || response;
    }

    const activeVariants = (product.shop_product_variants || [])
      .filter(v => v.is_active !== false && Number(v.price) > 0);

    const prices = activeVariants.map(v => Number(v.price));

    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const priceText =
      !minPrice
        ? ""
        : minPrice === maxPrice
          ? vnd(minPrice)
          : "Từ " + vnd(minPrice);

    const image = (product.shop_product_images || [])
      .slice()
      .sort((a, b) =>
        (b.is_primary === true) - (a.is_primary === true)
        || (a.sort_order || 0) - (b.sort_order || 0)
        || a.id - b.id
      )[0];

    // Ảnh JPG phục vụ ngay trên pickdee.vn (functions/og/p/[file].js): Zalo không hiện ảnh
    // khi og:image ở domain ngoài có ?query. imageId trong tên file để đổi ảnh là đổi URL.
    const imageUrl = image
      ? "https://pickdee.vn/og/p/" + id + "-" + image.id + "-l.jpg"
      : "https://pickdee.vn/og-shop.jpg";

    if (!image) {
      const blocked = notReadyForCrawler(context.request);
      if (blocked) {
        return blocked;
      }
    }

    const size = (image
      ? (await warmSmallImage(imageUrl, image.storage_path)) || await imageSize(imageUrl)
      : null) || { width: 1200, height: 630 };

    const title =
      product.name
      + (priceText ? " – " + priceText : "");

    const description =
      (product.short_description || "PickDee Shop – Tổng kho phụ kiện Pickleball hàng tuyển")
      + " | Đặt nhanh, giao tận nơi.";

    const pageUrl = "https://pickdee.vn/shop-product?id=" + id;

    // Facebook/Messenger lưu cache thẻ theo og:url: nếu link từng bị lưu lỗi (chưa có ảnh) thì gửi lại kèm &v=2
    // (hoặc &v=3…) để được quét lại. canonical/JSON-LD vẫn giữ pageUrl sạch.
    // Dấu phiên bản theo ảnh chính + giá: đổi ảnh hoặc đổi giá là og:url đổi theo, nên Facebook/Messenger
    // buộc phải dựng thẻ mới thay vì dùng lại thẻ đã nhớ từ lần quét trước (nguồn gốc lỗi "chỉ hiện logo").
    // "s": 23/11 đổi sang ảnh xem trước bản nhỏ → og:url đổi để Facebook dựng thẻ mới.
    const stamp = "i" + (image ? image.id : 0) + "p" + Math.round(minPrice / 1000) + "l";
    const shareUrl = pageUrl + "&v=" + (safeV || stamp);

    // JSON-LD Product để Google hiện giá + còn hàng ngay trên kết quả tìm kiếm.
    const inStock = activeVariants.some(v => v.is_sold_out !== true);

    const ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.short_description || undefined,
      image: imageUrl,
      url: pageUrl,
      sku: activeVariants.length === 1 ? activeVariants[0].sku || undefined : undefined,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      offers: minPrice
        ? {
          "@type": "AggregateOffer",
          priceCurrency: "VND",
          lowPrice: minPrice,
          highPrice: maxPrice,
          offerCount: activeVariants.length,
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: pageUrl,
          seller: { "@type": "Organization", name: "PickDee Shop" }
        }
        : undefined
    };

    const meta =
      `<meta property="og:type" content="product">`
      + `<meta property="og:site_name" content="PickDee Shop">`
      + `<meta property="og:title" content="${esc(title)}">`
      + `<meta property="og:description" content="${esc(description)}">`
      + `<meta property="og:url" content="${esc(shareUrl)}">`
      + `<meta property="og:image" content="${esc(imageUrl)}">`
      + `<meta property="og:image:secure_url" content="${esc(imageUrl)}">`
      + `<meta property="og:image:type" content="image/jpeg">`
      + `<meta property="og:image:width" content="${size.width}">`
      + `<meta property="og:image:height" content="${size.height}">`
      + `<meta property="og:image:alt" content="${esc(product.name)}">`
      + (minPrice
        ? `<meta property="product:price:amount" content="${minPrice}">`
          + `<meta property="product:price:currency" content="VND">`
        : "")
      + `<meta name="description" content="${esc(description)}">`
      + `<meta name="twitter:card" content="summary_large_image">`
      + `<meta name="twitter:image" content="${esc(imageUrl)}">`
      + `<link rel="canonical" href="${esc(pageUrl)}">`
      + `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;

    const out = new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(product.name + " | PickDee Shop");
        }
      })
      // Đặt ngay sau <meta charset> (đầu <head>) để bot đọc trang nào cũng thấy sớm.
      .on("meta[charset]", {
        element(el) {
          el.after(meta, { html: true });
        }
      })
      .transform(response);

    if (!cardCache) {
      return out;
    }

    // Chỉ bot mới đi nhánh này: giữ bản đã dựng ở biên để lần quét kế tiếp (Facebook quét lại theo
    // og:url, Zalo/Telegram/khách khác dán lại cùng link) nhận thẻ gần như tức thì.
    const html = await out.text();

    const cached = new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=" + CARD_CACHE_TTL,
        "x-og-card": "miss"
      }
    });

    const store = cached.clone();
    store.headers.set("x-og-card", "hit");
    context.waitUntil(cardCache.put(cardCacheKey(id, safeV), store));

    // Facebook quét link gốc rồi quét TIẾP og:url (cùng id, thêm &v=<dấu phiên bản>). Hai lần quét đó
    // cho ra đúng một trang như nhau, nên lưu luôn cho khoá kia để lần 2 không phải dựng lại từ đầu —
    // đây mới là lần quyết định Messenger có kịp gắn thẻ ảnh hay không.
    if (!safeV) {
      const twin = cached.clone();
      twin.headers.set("x-og-card", "hit");
      context.waitUntil(cardCache.put(cardCacheKey(id, stamp), twin));
    }

    return cached;
  }
  catch (_) {
    return response;
  }
}
