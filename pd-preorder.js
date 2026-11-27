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
      eta_text: "Dự kiến giao từ 28/11 đến khoảng 05/12/2026",
      eta_short: "Giao 28/11 – 5/12",
      deposit_percents: [70, 100],
      gifts: [
        "01 áo chính hãng ESS/ON",
        "01 khăn ESS/ON",
        "01 quấn cán",
        "01 dán viền"
      ],
      short_title: "Vợt ESS/ON MVP Pro",
      thumb_image: "/img/shop/mvp-pro-thumb.webp?v=1",
      banner_image: "/img/shop/mvp-pro-banner.webp?v=3",
      banner_image_wide: "/img/shop/mvp-pro-banner-wide.webp?v=3"
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
      ".pd-pre-tag{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:.06em;color:#0b0b0b;background:#ffc934;padding:4px 10px;border-radius:999px;animation:pdPrePulse 1.8s ease-in-out infinite}" +
      "@keyframes pdPrePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,201,52,.5)}50%{box-shadow:0 0 0 6px rgba(255,201,52,0)}}" +
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

    /* Thẻ gọn: CSS .pd-promo nằm ở shop.html (khối KHUYẾN MÃI ĐẦU TRANG) */
    slot.innerHTML =
      '<a class="pd-promo pd-promo--gold" href="./shop-product?id=' + encodeURIComponent(p.product_id) + '" aria-label="' + escapeHtml(p.title + " " + money(p.price)) + '">' +
        '<span class="pd-promo-img"><img src="' + escapeHtml(p.thumb_image || p.banner_image) + '" width="72" height="90" alt="' + escapeHtml(p.title) + '" loading="eager" decoding="async"></span>' +
        '<span class="pd-promo-body">' +
          '<span class="pd-promo-tag"><i></i>Mở đặt trước</span>' +
          '<span class="pd-promo-title">' + escapeHtml(p.short_title || p.title) + "</span>" +
          '<span class="pd-promo-price">' +
            '<span class="pd-promo-now">' + money(p.price) + "</span>" +
            (save > 0
              ? '<span class="pd-promo-old">' + money(p.list_price) + "</span>" +
                '<span class="pd-promo-save">-' + money(save) + "</span>"
              : "") +
          "</span>" +
          '<span class="pd-promo-meta">Tặng ' + p.gifts.length + " món · " + escapeHtml(p.eta_short) + "</span>" +
        "</span>" +
        '<svg class="pd-promo-go" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
      "</a>";
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

  /* Đọc ghi chú "[ĐẶT TRƯỚC] ..." của đơn để Admin hiện ĐÚNG số tiền khách
     đã cọc và số còn phải thu. Không phải đơn đặt trước → null. */
  function parseOrderNote(note) {
    var s = String(note == null ? "" : note);
    if (s.indexOf("[ĐẶT TRƯỚC]") < 0) return null;
    function num(x) {
      return Number(String(x).replace(/[^0-9]/g, "")) || 0;
    }
    var full = s.match(/Khách thanh toán\s*100\s*%\s*:\s*([0-9.,]+)\s*đ/);
    if (full) {
      return { percent: 100, paid: num(full[1]), rest: 0 };
    }
    var m = s.match(
      /Khách cọc\s*([0-9]+)\s*%\s*:\s*([0-9.,]+)\s*đ[^0-9]*còn lại\s*([0-9.,]+)\s*đ/
    );
    if (!m) return null;
    return { percent: Number(m[1]) || 0, paid: num(m[2]), rest: num(m[3]) };
  }

  global.pdPreorder = {
    list: PD_PREORDERS,
    find: findPreorder,
    items: preorderItems,
    cartHas: cartHasPreorder,
    deposit: depositAmount,
    parseOrderNote: parseOrderNote,
    money: money,
    injectStyle: injectStyle,
    renderBanner: renderBanner,
    renderProductCard: renderProductCard
  };
})(window);
