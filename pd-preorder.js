// pd-preorder.js — ĐẶT TRƯỚC (pre-order) dùng chung cho Shop:
//   • shop.html         → banner nổi bật đầu trang
//   • shop-product.html → thẻ "Đặt trước" dưới giá bán
//   • shop-checkout.html→ chọn cọc 70% / thanh toán 100%, QR tính theo mức cọc
// Thêm/bớt sản phẩm đặt trước: sửa mảng PD_PREORDERS bên dưới (1 chỗ duy nhất).

(function (global) {
  "use strict";

  var PD_PREORDERS = [
    {
      product_id: 39,
      slug: "vot-ess-on-mvp-pro",
      title: "VỢT ESS/ON MVP PRO",
      tagline: "MẶT VỢT SIÊU NHÁM THẾ HỆ MỚI",
      price: 2499000,
      list_price: 3199000,
      eta_text: "Dự kiến giao từ 28/11/2026",
      eta_short: "Giao từ 28/11",
      deposit_percents: [70, 100],
      gifts: [
        "01 áo chính hãng ESS/ON",
        "01 đôi tất ESS/ON",
        "01 quấn cán",
        "01 dán viền"
      ],
      banner_image: "/img/shop/mvp-pro-banner.webp",
      banner_image_wide: "/img/shop/mvp-pro-banner-wide.webp"
    }
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "đ";
  }

  function findPreorder(key) {
    if (key == null) return null;
    var idNum = Number(key);
    var slug = String(key);
    for (var i = 0; i < PD_PREORDERS.length; i++) {
      var p = PD_PREORDERS[i];
      if ((!isNaN(idNum) && p.product_id === idNum) || p.slug === slug) return p;
    }
    return null;
  }

  /* Dòng giỏ hàng nào là hàng đặt trước (khớp theo product_id) */
  function preorderItems(cart) {
    return (Array.isArray(cart) ? cart : []).filter(function (item) {
      return !!findPreorder(item && item.product_id);
    });
  }

  function cartHasPreorder(cart) {
    return preorderItems(cart).length > 0;
  }

  /* Mức cọc tính trên TỔNG TIỀN KHÁCH TRẢ của đơn (đơn vợt được miễn ship),
     làm tròn lên 1.000đ cho dễ chuyển khoản. */
  function depositAmount(total, percent) {
    var pct = Number(percent || 100);
    var amount = Number(total || 0) * pct / 100;
    if (pct >= 100) return Math.round(Number(total || 0));
    return Math.ceil(amount / 1000) * 1000;
  }

  var styleInjected = false;

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var css =
      ".pd-pre-banner{width:min(1100px,calc(100% - 28px));margin:14px auto 0;border-radius:20px;overflow:hidden;background:linear-gradient(135deg,#131313 0%,#0b0b0b 55%,#1b1608 100%);border:1px solid rgba(255,201,52,.45);box-shadow:0 14px 34px rgba(0,0,0,.35)}" +
      ".pd-pre-link{display:flex;align-items:stretch;text-decoration:none;color:#fff}" +
      ".pd-pre-photo{flex:0 0 124px;background:#000;position:relative;min-height:177px}" +
      ".pd-pre-photo{background-size:cover;background-position:center;overflow:hidden}.pd-pre-photo::before{content:\"\";position:absolute;inset:-14px;background:inherit;background-size:cover;background-position:center;filter:blur(16px) brightness(.45) saturate(.8)}.pd-pre-photo::after{content:\"\";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(11,11,11,0) 58%,rgba(11,11,11,.9) 100%)}.pd-pre-photo picture{display:block}.pd-pre-photo img{position:absolute;z-index:1;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;display:block}" +
      ".pd-pre-body{flex:1;min-width:0;padding:14px 16px;display:flex;flex-direction:column;gap:7px;justify-content:center}" +
      ".pd-pre-tag{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:.06em;color:#0b0b0b;background:#ffc934;padding:4px 10px;border-radius:999px;animation:pdPrePulse 1.8s ease-in-out infinite}" +
      ".pd-pre-title{margin:0;font-size:19px;font-weight:900;color:#fff;line-height:1.15;letter-spacing:.01em}" +
      ".pd-pre-sub{margin:0;font-size:12.5px;font-weight:800;color:#ffc934;letter-spacing:.02em}" +
      ".pd-pre-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}" +
      ".pd-pre-now{font-size:22px;font-weight:900;color:#ffc934;line-height:1}" +
      ".pd-pre-old{font-size:13px;color:rgba(255,255,255,.45);text-decoration:line-through}" +
      ".pd-pre-save{font-size:11px;font-weight:900;color:#0b0b0b;background:#fff;padding:2px 7px;border-radius:999px}" +
      ".pd-pre-meta{font-size:12px;color:rgba(255,255,255,.8);font-weight:600;line-height:1.5}" +
      ".pd-pre-meta b{color:#fff;font-weight:800}" +
      ".pd-pre-cta{align-self:flex-start;margin-top:2px;font-size:13px;font-weight:900;color:#0b0b0b;background:#ffc934;padding:9px 16px;border-radius:999px;transition:transform .2s ease-out,box-shadow .2s ease-out;box-shadow:0 6px 16px rgba(255,201,52,.25)}" +
      ".pd-pre-link:hover .pd-pre-cta{transform:translateY(-1px);box-shadow:0 10px 22px rgba(255,201,52,.35)}" +
      "@keyframes pdPrePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,201,52,.5)}50%{box-shadow:0 0 0 6px rgba(255,201,52,0)}}" +
      "@media (min-width:701px){.pd-pre-photo{flex-basis:234px;min-height:334px}.pd-pre-body{padding:20px 24px;gap:9px}.pd-pre-title{font-size:26px}.pd-pre-sub{font-size:14px}.pd-pre-now{font-size:30px}.pd-pre-meta{font-size:13px}}" +
      "@media (max-width:420px){.pd-pre-photo{flex-basis:96px}.pd-pre-body{padding:12px 13px;gap:6px}.pd-pre-title{font-size:17px}.pd-pre-now{font-size:20px}}" +
      /* Thẻ trên trang sản phẩm */
      ".pd-pre-card{margin:14px 0 4px;border-radius:16px;background:linear-gradient(135deg,#141414,#0b0b0b);border:1px solid rgba(255,201,52,.4);padding:14px 15px;color:#fff}" +
      ".pd-pre-card h3{margin:8px 0 4px;font-size:16px;font-weight:900;color:#ffc934}" +
      ".pd-pre-card ul{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7;color:rgba(255,255,255,.9)}" +
      ".pd-pre-card .pd-pre-row{font-size:13px;line-height:1.7;color:rgba(255,255,255,.9)}" +
      ".pd-pre-card .pd-pre-row b{color:#fff}" +
      ".pd-pre-card .pd-pre-eta{display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:12.5px;font-weight:800;color:#0b0b0b;background:#ffc934;padding:6px 11px;border-radius:999px}" +
      /* Chọn mức cọc ở checkout */
      ".pd-pre-deposit{margin:10px 0 12px;border-radius:14px;border:1px solid rgba(255,201,52,.45);background:rgba(255,201,52,.06);padding:12px 13px}" +
      ".pd-pre-deposit-title{font-size:12.5px;font-weight:900;letter-spacing:.03em;color:#ffc934;margin-bottom:8px}" +
      ".pd-pre-deposit-opts{display:flex;flex-direction:column;gap:8px}" +
      ".pd-pre-deposit-opt{display:flex;align-items:flex-start;gap:9px;padding:10px 11px;border-radius:12px;border:1.5px solid #e6e6e6;background:#fff;cursor:pointer;transition:border-color .2s ease-out,box-shadow .2s ease-out}" +
      ".pd-pre-deposit-opt.is-on{border-color:#ffc934;box-shadow:0 0 0 3px rgba(255,201,52,.18)}" +
      ".pd-pre-deposit-opt input{margin-top:2px;accent-color:#ffc934}" +
      ".pd-pre-deposit-opt .pd-pre-opt-main{font-size:13.5px;font-weight:800;color:#0b0b0b}" +
      ".pd-pre-deposit-opt .pd-pre-opt-sub{display:block;margin-top:2px;font-size:12px;font-weight:600;color:#6b6b6b;line-height:1.5}" +
      ".pd-pre-deposit-note{margin-top:9px;font-size:12px;font-weight:600;color:rgba(255,255,255,.72);line-height:1.55}";

    var tag = document.createElement("style");
    tag.id = "pdPreorderStyle";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ---------- Banner đầu trang Shop ---------- */
  function renderBanner(slot, key) {
    if (!slot) return;
    var p = key ? findPreorder(key) : PD_PREORDERS[0];
    if (!p) return;
    injectStyle();

    var save = Number(p.list_price || 0) - Number(p.price || 0);

    slot.innerHTML =
      '<div class="pd-pre-banner">' +
        '<a class="pd-pre-link" href="./shop-product?id=' + encodeURIComponent(p.product_id) + '">' +
          '<div class="pd-pre-photo" style="background-image:url(' + escapeHtml(p.banner_image) + ')">' +
            "<picture>" +
              '<source media="(min-width:701px)" srcset="' + escapeHtml(p.banner_image_wide || p.banner_image) + '">' +
              '<img src="' + escapeHtml(p.banner_image) + '" alt="' + escapeHtml(p.title) + '" loading="eager" decoding="async">' +
            "</picture>" +
          "</div>" +
          '<div class="pd-pre-body">' +
            '<span class="pd-pre-tag">⚡ MỞ ĐẶT TRƯỚC</span>' +
            '<h2 class="pd-pre-title">' + escapeHtml(p.title) + "</h2>" +
            '<p class="pd-pre-sub">' + escapeHtml(p.tagline) + "</p>" +
            '<div class="pd-pre-price">' +
              '<span class="pd-pre-now">' + money(p.price) + "</span>" +
              (save > 0
                ? '<span class="pd-pre-old">' + money(p.list_price) + "</span>" +
                  '<span class="pd-pre-save">-' + money(save) + "</span>"
                : "") +
            "</div>" +
            '<div class="pd-pre-meta">' +
              "🎁 <b>Tặng " + p.gifts.length + " món</b>: áo + tất + quấn cán + dán viền<br>" +
              "📦 <b>" + escapeHtml(p.eta_text) + "</b> • cọc 70% hoặc 100%" +
            "</div>" +
            '<span class="pd-pre-cta">ĐẶT TRƯỚC NGAY →</span>' +
          "</div>" +
        "</a>" +
      "</div>";
  }

  /* ---------- Thẻ trên trang sản phẩm ---------- */
  function renderProductCard(slot, key) {
    if (!slot) return;
    var p = findPreorder(key);
    if (!p) {
      slot.innerHTML = "";
      return;
    }
    injectStyle();

    var deposit = depositAmount(p.price, 70);
    var rest = Number(p.price) - deposit;

    slot.innerHTML =
      '<div class="pd-pre-card">' +
        '<span class="pd-pre-tag">⚡ HÀNG ĐẶT TRƯỚC</span>' +
        "<h3>Tặng kèm " + p.gifts.length + " món khi đặt trước</h3>" +
        "<ul>" +
          p.gifts.map(function (g) { return "<li>" + escapeHtml(g) + "</li>"; }).join("") +
        "</ul>" +
        '<div class="pd-pre-row" style="margin-top:10px">' +
          "💳 <b>Cọc 70%</b> = " + money(deposit) + "/cây (còn " + money(rest) +
          " thanh toán khi PickDee báo hàng về), hoặc <b>thanh toán 100%</b> ngay." +
        "</div>" +
        '<div class="pd-pre-row">🛡️ Bảo hành 3 tháng lỗi nhà sản xuất • đồng kiểm khi nhận hàng</div>' +
        '<span class="pd-pre-eta">📦 ' + escapeHtml(p.eta_text) + "</span>" +
      "</div>";
  }

  global.pdPreorder = {
    list: PD_PREORDERS,
    find: findPreorder,
    items: preorderItems,
    cartHas: cartHasPreorder,
    deposit: depositAmount,
    money: money,
    injectStyle: injectStyle,
    renderBanner: renderBanner,
    renderProductCard: renderProductCard
  };
})(window);
