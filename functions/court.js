// Cloudflare Pages Function cho /court?id=...
// Gắn sẵn tên sân, khu vực, giá, giờ vào <title>, meta description, canonical, Open Graph và JSON-LD
// để Google/Zalo/Facebook đọc được ngay mà không cần chạy JS. Trang hiển thị giữ nguyên.
// Chỉ đọc sân active bằng publishable key; lỗi gì cũng trả trang gốc.

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

    const res = await fetch(
      SUPABASE_URL
        + "/rest/v1/court_directory"
        + "?select=court_name,province,ward,address,phone,number_of_courts,court_type,"
        + "opening_hours,price_min,price_max,latitude,longitude,photo_path"
        + "&status=eq.active&id=eq." + id,
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: "Bearer " + PUBLISHABLE_KEY
        },
        cf: { cacheTtl: 300, cacheEverything: true }
      }
    );

    if (!res.ok) {
      return response;
    }

    const court = (await res.json())[0];

    if (!court) {
      return response;
    }

    const area = [court.ward, court.province].filter(Boolean).join(", ");
    const min = Number(court.price_min) || 0;
    const max = Number(court.price_max) || 0;

    const priceText =
      !min && !max
        ? "Giá: liên hệ sân"
        : min && max && min !== max
          ? "Giá " + vnd(min) + " – " + vnd(max)
          : "Giá " + vnd(min || max);

    const title =
      court.court_name + (area ? " – " + area : "") + " | PickDee";

    const description = [
      court.court_name + (court.address ? ", " + court.address : area ? ", " + area : "") + ".",
      court.number_of_courts ? court.number_of_courts + " sân" + (court.court_type ? " " + String(court.court_type).toLowerCase() : "") + "." : "",
      priceText + ".",
      court.opening_hours ? "Giờ mở cửa " + court.opening_hours + "." : "",
      "Xem bản đồ, gọi đặt sân, tìm Coach gần sân trên PickDee."
    ].filter(Boolean).join(" ");

    const pageUrl = "https://pickdee.vn/court?id=" + id;

    const imageUrl = court.photo_path
      ? SUPABASE_URL + "/storage/v1/object/public/court-photos/" + court.photo_path
      : "https://pickdee.vn/og-pickdee.jpg";

    const ld = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      name: court.court_name,
      url: pageUrl,
      image: imageUrl,
      address: {
        "@type": "PostalAddress",
        streetAddress: court.address || undefined,
        addressLocality: court.ward || undefined,
        addressRegion: court.province || undefined,
        addressCountry: "VN"
      },
      telephone: court.phone || undefined,
      geo: court.latitude && court.longitude
        ? { "@type": "GeoCoordinates", latitude: court.latitude, longitude: court.longitude }
        : undefined,
      priceRange: min || max ? priceText.replace(/^Giá /, "") : undefined
    };

    const meta =
      `<meta name="description" content="${esc(description)}">`
      + `<link rel="canonical" href="${esc(pageUrl)}">`
      + `<meta property="og:type" content="place">`
      + `<meta property="og:site_name" content="PickDee">`
      + `<meta property="og:title" content="${esc(title)}">`
      + `<meta property="og:description" content="${esc(description)}">`
      + `<meta property="og:url" content="${esc(pageUrl)}">`
      + `<meta property="og:image" content="${esc(imageUrl)}">`
      + `<meta name="twitter:card" content="summary_large_image">`
      + `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;

    return new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(title);
        }
      })
      .on("meta[charset]", {
        element(el) {
          el.after(meta, { html: true });
        }
      })
      .transform(response);
  }
  catch (_) {
    return response;
  }
}
