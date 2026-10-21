// Cloudflare Pages Function: /m/shop-track?token=...
// Manifest riêng cho trang theo dõi đơn: iPhone "Thêm vào MH chính" sẽ mở thẳng đơn này,
// để khách bật thông báo (Web Push trên iPhone chỉ chạy khi mở từ màn hình chính).

export async function onRequestGet(context) {
  const token = new URL(context.request.url).searchParams.get("token") || "";
  const startUrl = /^[A-Za-z0-9_-]{32,128}$/.test(token)
    ? "/shop-track?token=" + token
    : "/shop";

  return new Response(JSON.stringify({
    name: "PickDee Shop",
    short_name: "PickDee Shop",
    description: "PickDee Shop - Tổng kho phụ kiện Pickleball hàng tuyển",
    id: "/shop",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    icons: [{ src: "/pickdee-shop-icon.png", sizes: "1536x1536", type: "image/png", purpose: "any" }]
  }), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "private, max-age=300"
    }
  });
}
