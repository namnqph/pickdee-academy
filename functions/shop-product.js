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

export async function onRequestGet(context) {
  const response = await context.next();

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id") || "";

    if (
      !/^\d+$/.test(id)
      || !(response.headers.get("content-type") || "").includes("text/html")
    ) {
      return response;
    }

    const api =
      SUPABASE_URL
      + "/rest/v1/shop_products"
      + "?select=name,short_description,"
      + "shop_product_variants(price,is_active),"
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
      return response;
    }

    const product = (await res.json())[0];

    if (!product) {
      return response;
    }

    const prices = (product.shop_product_variants || [])
      .filter(v => v.is_active !== false && Number(v.price) > 0)
      .map(v => Number(v.price));

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

    // Ảnh gốc là .webp — Zalo không chắc đọc được, nên đổi sang JPG vuông qua wsrv.nl (miễn phí).
    const imageUrl = image
      ? "https://wsrv.nl/?url="
        + encodeURIComponent(
          SUPABASE_URL.replace(/^https:\/\//, "")
          + "/storage/v1/object/public/shop-products/"
          + image.storage_path
        )
        + "&w=800&h=800&fit=contain&cbg=white&output=jpg&q=85"
      : "https://pickdee.vn/pickdee-shop-icon.png";

    const title =
      product.name
      + (priceText ? " – " + priceText : "");

    const description =
      (product.short_description || "PickDee Shop – Tổng kho phụ kiện Pickleball hàng tuyển")
      + " | Đặt nhanh, giao tận nơi.";

    const pageUrl = "https://pickdee.vn/shop-product?id=" + id;

    const meta =
      `<meta property="og:type" content="product">`
      + `<meta property="og:site_name" content="PickDee Shop">`
      + `<meta property="og:title" content="${esc(title)}">`
      + `<meta property="og:description" content="${esc(description)}">`
      + `<meta property="og:url" content="${esc(pageUrl)}">`
      + `<meta property="og:image" content="${esc(imageUrl)}">`
      + `<meta property="og:image:secure_url" content="${esc(imageUrl)}">`
      + `<meta property="og:image:type" content="image/jpeg">`
      + `<meta property="og:image:width" content="800">`
      + `<meta property="og:image:height" content="800">`
      + `<meta property="og:image:alt" content="${esc(product.name)}">`
      + (minPrice
        ? `<meta property="product:price:amount" content="${minPrice}">`
          + `<meta property="product:price:currency" content="VND">`
        : "")
      + `<meta name="description" content="${esc(description)}">`
      + `<meta name="twitter:card" content="summary_large_image">`
      + `<meta name="twitter:image" content="${esc(imageUrl)}">`
      + `<link rel="canonical" href="${esc(pageUrl)}">`;

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(product.name + " | PickDee Shop");
        }
      })
      .on("head", {
        element(el) {
          el.append(meta, { html: true });
        }
      })
      .transform(response);
  }
  catch (_) {
    return response;
  }
}
