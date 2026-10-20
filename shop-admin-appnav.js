/* =========================================================
   PICKDEE SHOP ADMIN - MENU ĐÁY DÙNG CHUNG (điện thoại ≤760px)
   Gắn trực tiếp (thẻ script) vào các trang danh sách của Shop admin.
   Trang shop-admin (Đơn hàng) có menu riêng trong trang.
   Trang con (tạo/sửa/chi tiết) có thanh nút thao tác ở đáy → không gắn menu.
========================================================= */

(function () {
  try {
    if (window.__pdAppNav || document.getElementById("pdAppNav")) return;
    window.__pdAppNav = true;

    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");

    var ACTIVE = {
      "shop-admin-products": "products",
      "shop-admin-suppliers": "products",
      "shop-admin-promotions": "promotions",
      "shop-admin-affiliate": "promotions",
      "shop-admin-stock-history": "inventory",
      "shop-admin-stock-receipts": "receiving",
      "shop-admin-stock-receipt-detail": "receiving"
    };
    var active = ACTIVE[page];
    if (!active) return;

    var ITEMS = [
      ["orders", "📦", "Đơn hàng", "/shop-admin"],
      ["inventory", "🧮", "Kho", "/shop-admin#warehouse"],
      ["receiving", "🚚", "Nhập hàng", "/shop-admin#receiving"],
      ["products", "🛍️", "Sản phẩm", "/shop-admin-products"],
      ["promotions", "🎁", "Khuyến mãi", "/shop-admin-promotions"]
    ];

    var css = document.createElement("style");
    css.textContent =
      "#pdAppNav{display:none}" +
      "@media (max-width:760px){" +
      "body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}" +
      "#pdAppNav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:70;" +
      "padding:6px 4px calc(6px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.10);" +
      "background:rgba(7,21,35,.97);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
      "#pdAppNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;" +
      "color:rgba(255,255,255,.55);text-decoration:none;font-family:inherit;font-size:10.5px;font-weight:800;white-space:nowrap}" +
      "#pdAppNav .pd-ti{font-size:21px;line-height:1;padding:3px 12px;border-radius:999px}" +
      "#pdAppNav a.active{color:#d8ff45}" +
      "#pdAppNav a.active .pd-ti{background:rgba(216,255,69,.16)}" +
      /* đầu trang gọn hơn trên điện thoại */
      "main .intro,.page .intro{display:none!important}" +
      "main h1,.page h1{font-size:26px!important;margin-bottom:12px!important}" +
      "}";
    document.head.appendChild(css);

    function mount() {
      if (document.getElementById("pdAppNav")) return;
      var nav = document.createElement("nav");
      nav.id = "pdAppNav";
      nav.setAttribute("aria-label", "Menu Shop");
      nav.innerHTML = ITEMS.map(function (it) {
        return '<a href="' + it[3] + '"' + (it[0] === active ? ' class="active" aria-current="page"' : "") + '>' +
          '<span class="pd-ti">' + it[1] + '</span><span>' + it[2] + "</span></a>";
      }).join("");
      document.body.appendChild(nav);
    }

    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
  } catch (e) {}
})();
