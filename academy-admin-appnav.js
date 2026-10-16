/* =========================================================
   PICKDEE ADMIN - MENU ĐÁY DÙNG CHUNG cho các trang con (điện thoại ≤759px)
   Giống #admBottomBar trong admin.html: Trang chủ / Việc / Lịch học / Hỗ trợ / Shop.
   Gắn trực tiếp (thẻ script) vào các trang quản trị Academy.
   Chỉ hiện với tài khoản admin (một số trang học viên/Coach cũng mở được).
========================================================= */

(function () {
  try {
    if (window.__pdAdminNav || document.getElementById("admBottomBar")) return;
    window.__pdAdminNav = true;

    var cfg = window.PICKDEE_CONFIG || {};
    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");

    var active = "home";
    if (page === "admin-tasks") active = "tasks";
    else if (page === "sessions" || page === "session-detail" || page === "admin-session-requests") active = "sessions";
    else if (page === "support-admin") active = "support";

    var ITEMS = [
      ["home", "🏠", "Trang chủ", "/admin"],
      ["tasks", "⚠️", "Việc", "/admin-tasks"],
      ["sessions", "📅", "Lịch học", "/sessions"],
      ["support", "💬", "Hỗ trợ", "/support-admin"],
      ["shop", "🛍️", "Shop", "/shop-admin"]
    ];

    function mount() {
      if (document.getElementById("pdAdminNav")) return;
      var css = document.createElement("style");
      css.textContent =
        "#pdAdminNav{display:none}" +
        "@media (max-width:759px){" +
        "body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}" +
        "#pdAdminNav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:900;" +
        "padding:6px 4px calc(6px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.10);" +
        "background:rgba(7,21,35,.97);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
        "#pdAdminNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;" +
        "color:rgba(255,255,255,.6);text-decoration:none;font-family:inherit;font-size:10.5px;font-weight:800;white-space:nowrap}" +
        "#pdAdminNav .pd-ti{font-size:21px;line-height:1;padding:3px 12px;border-radius:999px}" +
        "#pdAdminNav a.active{color:#d8ff45}" +
        "#pdAdminNav a.active .pd-ti{background:rgba(216,255,69,.16)}" +
        "}";
      document.head.appendChild(css);

      var nav = document.createElement("nav");
      nav.id = "pdAdminNav";
      nav.setAttribute("aria-label", "Menu quản trị");
      nav.innerHTML = ITEMS.map(function (it) {
        return '<a href="' + it[3] + '"' + (it[0] === active ? ' class="active" aria-current="page"' : "") + ">" +
          '<span class="pd-ti">' + it[1] + "</span><span>" + it[2] + "</span></a>";
      }).join("");
      document.body.appendChild(nav);
    }

    function whenReady(fn) {
      if (document.body) fn();
      else document.addEventListener("DOMContentLoaded", fn, { once: true });
    }

    // Kiểm tra admin: đọc phiên đăng nhập đã lưu, hỏi profiles.role (có nhớ trong phiên làm việc)
    var auth = null;
    try { auth = JSON.parse(localStorage.getItem("pickdee-auth") || "null"); } catch (e) {}
    var uid = auth && auth.user && auth.user.id;
    if (!uid || !auth.access_token || !cfg.SUPABASE_URL) return;

    var cacheKey = "pd_is_admin_" + uid;
    var cached = null;
    try { cached = sessionStorage.getItem(cacheKey); } catch (e) {}
    if (cached === "1") { whenReady(mount); return; }
    if (cached === "0") return;

    fetch(cfg.SUPABASE_URL + "/rest/v1/profiles?select=role&id=eq." + encodeURIComponent(uid), {
      headers: { apikey: cfg.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + auth.access_token }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows) return; // token hết hạn / lỗi mạng: không nhớ kết quả, lần sau hỏi lại
        var isAdmin = !!(rows && rows[0] && rows[0].role === "admin");
        try { sessionStorage.setItem(cacheKey, isAdmin ? "1" : "0"); } catch (e) {}
        if (isAdmin) whenReady(mount);
      })
      .catch(function () {});
  } catch (e) {}
})();
