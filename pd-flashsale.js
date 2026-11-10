// pd-flashsale.js — badge/banner Flash Sale dùng chung cho trang công khai (shop.html, shop-product.html, index.html).
// Đọc dữ liệu từ shop_promotions + shop_promotion_targets (promotion_type='product_discount', is_active + trong khoảng start_at..end_at).
// Giá hiển thị không cần tính lại ở đây: cron shop_flash_sale_tick đã ghi đè shop_product_variants.price/compare_at_price.

(function (global) {
  "use strict";

  var PD_FLASH_BADGES = [
    { slug: "flash-sale", label: "FLASH SALE", icon: "⚡", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "giam-soc", label: "GIẢM SỐC", icon: "💥", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "sieu-sale", label: "SIÊU SALE", icon: "🔥", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "hot", label: "HOT", icon: "🌶️", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "gia-soc", label: "GIÁ SỐC", icon: "📉", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "xa-kho", label: "XẢ KHO", icon: "📦", bg: "#0b0b0b", fg: "#ffc934" },
    { slug: "chi-hom-nay", label: "CHỈ HÔM NAY", icon: "⏰", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "duy-nhat-hom-nay", label: "DUY NHẤT HÔM NAY", icon: "✨", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "uu-dai-dac-biet", label: "ƯU ĐÃI ĐẶC BIỆT", icon: "🎁", bg: "#0b0b0b", fg: "#ffc934" },
    { slug: "bung-no-gia", label: "BÙNG NỔ GIÁ", icon: "💣", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "san-sale", label: "SĂN SALE", icon: "🎯", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "tiet-kiem-ngay", label: "TIẾT KIỆM NGAY", icon: "💰", bg: "#0b0b0b", fg: "#ffc934" },
    { slug: "gia-tot-nhat", label: "GIÁ TỐT NHẤT", icon: "🏆", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "mua-ngay-keo-lo", label: "MUA NGAY KẺO LỠ", icon: "🏃", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "giam-dam", label: "GIẢM ĐẬM", icon: "⬇️", bg: "#ffc934", fg: "#0b0b0b" },
    { slug: "khuyen-mai-soc", label: "KHUYẾN MÃI SỐC", icon: "🎊", bg: "linear-gradient(90deg,#d6102c,#ff2d47)", fg: "#fff" },
    { slug: "dang-hot", label: "ĐANG HOT", icon: "📣", bg: "#0b0b0b", fg: "#ffc934" },
    { slug: "sale-cuoi-tuan", label: "SALE CUỐI TUẦN", icon: "🗓️", bg: "#ffc934", fg: "#0b0b0b" },
  ];
  var PD_FLASH_BADGES_BY_SLUG = {};
  PD_FLASH_BADGES.forEach(function (b) { PD_FLASH_BADGES_BY_SLUG[b.slug] = b; });

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    n = Number(n || 0);
    return n.toLocaleString("vi-VN") + "đ";
  }

  function injectStyleOnce() {
    if (document.getElementById("pdFlashSaleStyle")) return;
    var style = document.createElement("style");
    style.id = "pdFlashSaleStyle";
    style.textContent =
      'html body .pd-flash-badge{position:absolute;z-index:3;left:8px;top:8px;display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;line-height:1;letter-spacing:.01em;box-shadow:0 4px 10px rgba(0,0,0,.14);pointer-events:none;white-space:nowrap}' +
      '@media(min-width:701px){html body .pd-flash-badge{left:10px;top:10px;font-size:12px}}' +
      '.pd-flash-badge.pd-flash-badge-inline{position:static;display:inline-flex;margin-bottom:6px}' +
      ".flash-sale-banner{width:min(1100px,calc(100% - 28px));margin:16px auto 0;border-radius:18px;background:linear-gradient(135deg,#1a1308 0%,#120f0a 55%,#1a1308 100%);border:1px solid rgba(255,201,52,.35);box-shadow:0 10px 30px rgba(255,201,52,.08);overflow:hidden}" +
      ".flash-sale-link{display:flex;align-items:stretch;gap:0;text-decoration:none;color:#fff}" +
      ".flash-sale-img-wrap{flex:0 0 132px;position:relative;background:#0b0b0b}" +
      ".flash-sale-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;min-height:132px}" +
      ".flash-sale-info{flex:1;padding:14px 16px;display:flex;flex-direction:column;gap:6px;justify-content:center;min-width:0}" +
      ".flash-sale-tag{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;font-size:11px;font-weight:900;letter-spacing:.03em;padding:4px 9px;border-radius:999px;animation:flashSalePulse 1.6s ease-in-out infinite}" +
      ".flash-sale-info h3{margin:0;font-size:16px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".flash-sale-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}" +
      ".flash-sale-new{font-size:20px;font-weight:900;color:#ffc934}" +
      ".flash-sale-old{font-size:13px;color:rgba(255,255,255,.45);text-decoration:line-through}" +
      ".flash-sale-percent{font-size:11px;font-weight:800;color:#ff5a5a;background:rgba(255,90,90,.12);padding:2px 7px;border-radius:999px}" +
      ".flash-sale-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}" +
      ".flash-sale-countdown{font-size:12px;color:rgba(255,255,255,.75);font-weight:600;letter-spacing:.01em}" +
      ".flash-sale-countdown b{color:#ffc934;font-weight:900;font-variant-numeric:tabular-nums}" +
      ".flash-sale-cta{flex:none;font-size:12px;font-weight:900;color:#0b0b0b;background:#ffc934;padding:7px 12px;border-radius:999px;white-space:nowrap}" +
      "@keyframes flashSalePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,45,71,.45)}50%{box-shadow:0 0 0 5px rgba(255,45,71,0)}}" +
      "@media (max-width:640px){.flash-sale-img-wrap{flex-basis:96px}.flash-sale-img-wrap img{min-height:96px}.flash-sale-info{padding:10px 12px;gap:4px}.flash-sale-info h3{font-size:14px}.flash-sale-new{font-size:17px}.flash-sale-cta{padding:6px 10px}}" +
      ".pd-flash-topbar{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:#fff;font-size:12.5px;font-weight:800;text-align:center;padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top));text-decoration:none}" +
      ".pd-flash-topbar b{font-weight:900;color:#ffe066}" +
      ".pd-flash-topbar .pd-flash-topbar-old{font-weight:700;text-decoration:line-through;opacity:.75}" +
      ".pd-flash-topbar .pd-flash-topbar-cta{background:#fff;color:#d6102c;padding:3px 10px;border-radius:999px;font-weight:900;white-space:nowrap}" +
      "@media (max-width:480px){.pd-flash-topbar{font-size:11.5px;padding:7px 10px}}";
    document.head.appendChild(style);
  }

  function pdFlashBadgeHtml(slug, opts) {
    var b = PD_FLASH_BADGES_BY_SLUG[slug];
    if (!b) return "";
    injectStyleOnce();
    var inline = opts && opts.inline;
    return (
      '<span class="pd-flash-badge' + (inline ? " pd-flash-badge-inline" : "") + '" style="background:' +
      b.bg + ";color:" + b.fg + '">' + b.icon + " " + escapeHtml(b.label) + "</span>"
    );
  }

  // Trả về danh sách promotion đang hoạt động (is_active + trong khoảng start_at..end_at),
  // kèm map product_id -> {promotion, badge_slug} để gắn badge lên thẻ sản phẩm.
  async function pdFlashSaleFetchActive(sb) {
    var nowIso = new Date().toISOString();
    var { data: promos, error: e1 } = await sb
      .from("shop_promotions")
      .select("id,name,discount_type,discount_value,badge_slug,show_banner,start_at,end_at")
      .eq("is_active", true)
      .eq("promotion_type", "product_discount")
      .lte("start_at", nowIso)
      .gte("end_at", nowIso);
    if (e1 || !promos || !promos.length) return { badgeMap: {}, bannerPromos: [] };

    var ids = promos.map(function (p) { return p.id; });
    var { data: targets, error: e2 } = await sb
      .from("shop_promotion_targets")
      .select("promotion_id,target_type,target_id")
      .in("promotion_id", ids)
      .eq("target_type", "product");
    if (e2) return { badgeMap: {}, bannerPromos: [] };

    var promoById = {};
    promos.forEach(function (p) { promoById[p.id] = p; });

    var badgeMap = {};
    (targets || []).forEach(function (t) {
      var p = promoById[t.promotion_id];
      if (!p) return;
      badgeMap[t.target_id] = { promotion: p, badge_slug: p.badge_slug, productIds: [] };
    });
    // gom product_id theo từng promotion để render banner (lấy sản phẩm đầu tiên)
    var productIdsByPromo = {};
    (targets || []).forEach(function (t) {
      (productIdsByPromo[t.promotion_id] = productIdsByPromo[t.promotion_id] || []).push(t.target_id);
    });

    var bannerPromos = promos
      .filter(function (p) { return p.show_banner && productIdsByPromo[p.id] && productIdsByPromo[p.id].length; })
      .map(function (p) { return Object.assign({}, p, { productIds: productIdsByPromo[p.id] }); })
      .sort(function (a, b) { return new Date(a.end_at) - new Date(b.end_at); });

    return { badgeMap: badgeMap, bannerPromos: bannerPromos };
  }

  function startCountdown(el, bannerEl, endAtIso) {
    var endsAt = new Date(endAtIso).getTime();
    function tick() {
      var diff = endsAt - Date.now();
      if (diff <= 0) {
        if (bannerEl) bannerEl.remove();
        return;
      }
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      el.innerHTML = "Còn <b>" + h + "g " + String(m).padStart(2, "0") + "p " + String(s).padStart(2, "0") + "s</b>";
      requestAnimationFrame(function () { setTimeout(tick, 1000); });
    }
    tick();
  }

  // Dựng + chèn banner Flash Sale vào slotEl (thường là 1 div rỗng đầu trang). Không có chương trình nào thì để trống.
  async function pdFlashSaleRenderBanner(sb, slotEl) {
    if (!slotEl) return;
    try {
      var active = await pdFlashSaleFetchActive(sb);
      var promo = active.bannerPromos[0];
      if (!promo) return;
      var productId = promo.productIds[0];

      var [{ data: product }, { data: variants }, { data: images }] = await Promise.all([
        sb.from("shop_products").select("id,name,slug").eq("id", productId).maybeSingle(),
        sb.from("shop_product_variants").select("price,compare_at_price").eq("product_id", productId).eq("is_active", true).order("price", { ascending: true }).limit(1),
        sb.from("shop_product_images").select("storage_path").eq("product_id", productId).order("is_primary", { ascending: false }).limit(1),
      ]);
      if (!product || !variants || !variants.length) return;

      var v = variants[0];
      var imgPath = images && images[0] ? images[0].storage_path : "";
      var img = imgPath ? sb.storage.from("shop-products").getPublicUrl(imgPath).data.publicUrl : "";
      var badge = PD_FLASH_BADGES_BY_SLUG[promo.badge_slug] || PD_FLASH_BADGES[0];
      injectStyleOnce();

      var savedHtml = v.compare_at_price && Number(v.compare_at_price) > Number(v.price)
        ? '<span class="flash-sale-old">' + money(v.compare_at_price) + '</span><span class="flash-sale-percent">-' + money(v.compare_at_price - v.price) + "</span>"
        : "";

      slotEl.innerHTML =
        '<section class="flash-sale-banner" id="pdFlashBanner">' +
        '<a class="flash-sale-link" href="./shop-product?id=' + productId + '">' +
        '<div class="flash-sale-img-wrap">' + (img ? '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' : "") + "</div>" +
        '<div class="flash-sale-info">' +
        '<span class="flash-sale-tag" style="background:' + badge.bg + ";color:" + badge.fg + '">' + badge.icon + " " + escapeHtml(promo.name || badge.label) + "</span>" +
        "<h3>" + escapeHtml(product.name) + "</h3>" +
        '<div class="flash-sale-price"><span class="flash-sale-new">' + money(v.price) + "</span>" + savedHtml + "</div>" +
        '<div class="flash-sale-bottom"><span class="flash-sale-countdown" id="pdFlashBannerCountdown">Còn <b>…</b></span><span class="flash-sale-cta">MUA NGAY →</span></div>' +
        "</div></a></section>";

      startCountdown(document.getElementById("pdFlashBannerCountdown"), document.getElementById("pdFlashBanner"), promo.end_at);
    } catch (e) {
      // im lặng: không có flash sale thì không hiện gì, không chặn trang
    }
  }

  // Thanh mỏng đầu trang (dùng cho trang chủ) — chỉ cần tên + giá, không ảnh.
  async function pdFlashSaleRenderTopbar(sb, slotEl) {
    if (!slotEl) return;
    try {
      var active = await pdFlashSaleFetchActive(sb);
      var promo = active.bannerPromos[0];
      if (!promo) return;
      var productId = promo.productIds[0];

      var [{ data: product }, { data: variants }] = await Promise.all([
        sb.from("shop_products").select("id,name").eq("id", productId).maybeSingle(),
        sb.from("shop_product_variants").select("price,compare_at_price").eq("product_id", productId).eq("is_active", true).order("price", { ascending: true }).limit(1),
      ]);
      if (!product || !variants || !variants.length) return;
      var v = variants[0];
      injectStyleOnce();

      var oldHtml = v.compare_at_price && Number(v.compare_at_price) > Number(v.price)
        ? '<span class="pd-flash-topbar-old">' + money(v.compare_at_price) + "</span>"
        : "";

      slotEl.innerHTML =
        '<a href="./shop-product?id=' + productId + '" class="pd-flash-topbar" id="pdFlashTopbar" style="background:linear-gradient(90deg,#d6102c,#ff2d47,#d6102c)">' +
        "⚡ " + escapeHtml(promo.name || "FLASH SALE") + ": " + escapeHtml(product.name) + " chỉ <b>" + money(v.price) + "</b>" +
        oldHtml +
        '<span class="pd-flash-topbar-cta">MUA NGAY →</span>' +
        "</a>";

      var endsAt = new Date(promo.end_at).getTime();
      if (Date.now() > endsAt) { var bar = document.getElementById("pdFlashTopbar"); if (bar) bar.remove(); }
    } catch (e) {
      // im lặng
    }
  }

  global.PD_FLASH_BADGES = PD_FLASH_BADGES;
  global.pdFlashBadgeHtml = pdFlashBadgeHtml;
  global.pdFlashSaleFetchActive = pdFlashSaleFetchActive;
  global.pdFlashSaleRenderBanner = pdFlashSaleRenderBanner;
  global.pdFlashSaleRenderTopbar = pdFlashSaleRenderTopbar;
})(window);
