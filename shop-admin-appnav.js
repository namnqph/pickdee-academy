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
      "shop-admin-affiliate": "ctv",
      "shop-admin-stock-history": "inventory",
      "shop-admin-stock-receipts": "receiving",
      "shop-admin-stock-receipt-detail": "receiving"
    };
    var active = ACTIVE[page];
    setupCtv(page === "shop-admin-affiliate");
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
      "background:rgba(15,15,15,.97);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
      "#pdAppNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;" +
      "color:rgba(255,255,255,.55);text-decoration:none;font-family:inherit;font-size:10.5px;font-weight:800;white-space:nowrap}" +
      "#pdAppNav .pd-ti{font-size:21px;line-height:1;padding:3px 12px;border-radius:999px}" +
      "#pdAppNav a.active{color:#ffc934}" +
      "#pdAppNav a.active .pd-ti{background:rgba(255,255,255,.112)}" +
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

  /* Nút "CTV" (Cộng tác viên vợt) — CHỈ tài khoản owner thấy; shop_admin/shop_staff không thấy.
     Trang /shop-admin-affiliate vẫn tự chặn bằng RPC owner-only, nút này chỉ là lối tắt. */
  function setupCtv(isCtvPage) {
    var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 010 6M18 14c2 .7 3 2.8 3 6"/></svg>';
    var st = document.createElement("style");
    st.textContent =
      ".tabs.pd-has-ctv{grid-template-columns:repeat(7,minmax(0,1fr))!important}" +
      "@media (max-width:760px){#pdAppNav.pd-has-ctv{grid-template-columns:repeat(6,minmax(0,1fr))}" +
      ".tabs.pd-has-ctv .tab{font-size:8.5px!important;padding:0!important;letter-spacing:-.2px!important;overflow:visible}" +
      ".tabs.pd-has-ctv .tab .pd-ti{padding:3px 7px}}" +
      ".pd-ctv-ic svg{width:22px;height:22px;vertical-align:middle}";
    document.head.appendChild(st);

    var tries = 0;
    function isOwner() {
      var sb = window.sb;
      if (!sb || !sb.auth) return Promise.reject("nosb");
      return sb.auth.getUser().then(function (r) {
        var u = r && r.data && r.data.user;
        if (!u) return false;
        return sb.from("shop_user_roles").select("role").eq("user_id", u.id).eq("is_active", true)
          .then(function (q) { return (q.data || []).some(function (x) { return x.role === "owner"; }); });
      });
    }
    function add() {
      if (document.getElementById("pdCtvNav")) return;
      var nav = document.getElementById("pdAppNav");
      var tabs = document.querySelector(".tabs");
      var a = document.createElement("a");
      a.id = "pdCtvNav";
      a.href = "/shop-admin-affiliate";
      if (isCtvPage) { a.className = "active"; a.setAttribute("aria-current", "page"); }
      if (nav) {
        a.innerHTML = '<span class="pd-ti pd-ic pd-ctv-ic">' + ICON + "</span><span>CTV</span>";
        nav.appendChild(a); nav.classList.add("pd-has-ctv");
      } else if (tabs) {
        a.className = "tab";
        a.innerHTML = '<span class="pd-ti pd-ic pd-ctv-ic">' + ICON + '</span><span class="pd-tl">CTV</span>';
        tabs.appendChild(a); tabs.classList.add("pd-has-ctv");
      }
    }
    function run() {
      isOwner().then(function (ok) { if (ok) add(); }, function () {
        if (++tries < 20) setTimeout(run, 300);
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})();
