/* =========================================================
   PICKDEE ADMIN - MENU ĐÁY DÙNG CHUNG cho các trang con (điện thoại ≤759px)
   Giống #admBottomBar trong admin.html: Trang chủ / Việc / Lịch học / Hỗ trợ / Thêm.
   "Thêm" mở tờ kính mờ kéo từ đáy chứa mọi mục quản trị (như app), ngay tại trang đang xem.
   Gắn trực tiếp (thẻ script) vào các trang quản trị Academy.
   Chỉ hiện với tài khoản admin (một số trang học viên/Coach cũng mở được).
========================================================= */

(function () {
  try {
    if (window.__pdAdminNav || document.getElementById("admBottomBar")) return;
    window.__pdAdminNav = true;

    var cfg = window.PICKDEE_CONFIG || {};
    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");

    var ITEMS = [
      ["home", "🏠", "Trang chủ", "/admin"],
      ["tasks", "⚠️", "Việc", "/admin-tasks"],
      ["sessions", "📅", "Lịch học", "/sessions"],
      ["support", "💬", "Hỗ trợ", "/support-admin"],
      ["more", "☰", "Thêm", "#more"]
    ];

    /* Cùng thứ tự, cùng link với lưới trang chủ admin.html (#adminAppGrid) */
    var GROUPS = [
      ["👥", "Học viên", [["🧑‍🎓", "Học viên", "/students"], ["📅", "Lịch học", "/sessions"], ["💰", "Học phí", "/admin-tuition-payment"], ["🤝", "Nhóm học", "/admin-training-groups"]]],
      ["🏓", "Coach", [["🏓", "Danh sách Coach", "/coaches"], ["🪪", "Hồ sơ đăng ký", "/admin-coach-applications"], ["💼", "Công Coach", "/admin-coach-work"], ["⏳", "Việc tồn Coach", "/admin-coach-backlog"]]],
      ["🏟️", "Sân", [["📅", "Đặt sân", "/admin-court-bookings"], ["🏟️", "Sân & khu vực", "/admin-courts"], ["🧾", "Đối soát sân", "/admin-court-reconciliation"], ["🌏", "Danh bạ sân", "/admin-court-directory"], ["📨", "Sân chờ duyệt", "/admin-court-submissions"], ["📍", "Sân Coach đề xuất", "/admin-coach-court-approvals"], ["✅", "Xác minh sân", "/admin-court-claims"]]],
      ["💼", "Kinh doanh", [["📊", "Tài chính", "/admin-finance"], ["📈", "Người vào web", "/admin-traffic"], ["🛍️", "PickDee Shop", "/shop-admin"]]],
      ["⚡", "Cần xử lý", [["🗓️", "Yêu cầu lịch", "/admin-session-requests"], ["🔄", "Đổi Coach", "/admin-coach-change-requests"]]]
    ];

    var active = "more";
    if (page === "admin" || page === "") active = "home";
    else if (page === "admin-tasks") active = "tasks";
    else if (page === "sessions" || page === "session-detail" || page === "admin-session-requests") active = "sessions";
    else if (page === "support-admin") active = "support";

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

    function mount() {
      if (document.getElementById("pdAdminNav")) return;
      var E = "cubic-bezier(.23,1,.32,1)";
      var css = document.createElement("style");
      css.textContent =
        "#pdAdminNav,#pdAdminSheet{display:none}" +
        "@media (max-width:759px){" +
        "body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}" +
        "#pdAdminNav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:900;" +
        "padding:6px 4px calc(6px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.10);" +
        "background:rgba(15,15,15,.97);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
        "#pdAdminNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;" +
        "color:rgba(255,255,255,.6);text-decoration:none;font-family:inherit;font-size:10.5px;font-weight:800;white-space:nowrap}" +
        "#pdAdminNav .pd-ti{font-size:21px;line-height:1;padding:3px 12px;border-radius:999px}" +
        "#pdAdminNav a.active{color:#ffc934}" +
        "#pdAdminNav a.active .pd-ti{background:rgba(255,255,255,.112)}" +
        "html.pd-sheet-lock,html.pd-sheet-lock body{overflow:hidden}" +
        "#pdAdminSheet{display:block;position:fixed;inset:0;z-index:950}" +
        "#pdAdminSheet[hidden]{display:none}" +
        "#pdAdminSheet .s-scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .28s " + E + "}" +
        "#pdAdminSheet.is-open .s-scrim{opacity:1}" +
        "#pdAdminSheet .s-panel{position:absolute;left:0;right:0;bottom:0;max-height:86dvh;display:flex;flex-direction:column;" +
        "border-radius:26px 26px 0 0;border:1px solid rgba(255,255,255,.1);border-bottom:0;background:rgba(24,24,24,.86);" +
        "-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);" +
        "box-shadow:0 -18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.14);padding-bottom:env(safe-area-inset-bottom);will-change:transform}" +
        "#pdAdminSheet .s-grab{flex:none;display:flex;justify-content:center;padding:10px 0 8px;touch-action:none;cursor:grab}" +
        "#pdAdminSheet .s-grab i{width:38px;height:5px;border-radius:3px;background:rgba(255,255,255,.28)}" +
        "#pdAdminSheet .s-body{overflow-y:auto;overscroll-behavior:contain;padding:2px 14px 18px;display:grid;gap:18px}" +
        "#pdAdminSheet h3{display:flex;align-items:center;gap:8px;margin:0 2px 10px;font-size:13px;font-weight:800;color:rgba(255,255,255,.62)}" +
        "#pdAdminSheet .s-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}" +
        "#pdAdminSheet .s-tile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 2px 9px;border-radius:18px;min-width:0;" +
        "color:#fff;text-decoration:none;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06);transition:scale .32s " + E + "}" +
        "#pdAdminSheet .s-tile:active{scale:.96;transition-duration:.08s}" +
        "#pdAdminSheet .s-tile.is-here{border-color:rgba(255,201,52,.6);background:rgba(255,201,52,.1)}" +
        "#pdAdminSheet .s-ic{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:20px;background:rgba(255,255,255,.07)}" +
        "#pdAdminSheet .s-lb{font-size:11.5px;font-weight:700;line-height:1.25;text-align:center;color:rgba(255,255,255,.9);overflow-wrap:anywhere}" +
        "}" +
        "@media (max-width:759px) and (prefers-reduced-transparency:reduce){#pdAdminSheet .s-panel{-webkit-backdrop-filter:none;backdrop-filter:none;background:#181818}}" +
        "@media (max-width:759px) and (prefers-contrast:more){#pdAdminSheet .s-panel{background:#000;border-color:rgba(255,255,255,.5)}}";
      document.head.appendChild(css);

      var nav = document.createElement("nav");
      nav.id = "pdAdminNav";
      nav.setAttribute("aria-label", "Menu quản trị");
      nav.innerHTML = ITEMS.map(function (it) {
        var extra = it[0] === "more" ? ' id="pdAdminMoreBtn" aria-haspopup="dialog" aria-controls="pdAdminSheet"' : "";
        return '<a href="' + it[3] + '"' + extra + (it[0] === active ? ' class="active" aria-current="page"' : "") + ">" +
          '<span class="pd-ti">' + it[1] + "</span><span>" + it[2] + "</span></a>";
      }).join("");
      document.body.appendChild(nav);

      /* ---- Tờ "Thêm" ---- */
      var here = "/" + page;
      var sheet = document.createElement("div");
      sheet.id = "pdAdminSheet";
      sheet.hidden = true;
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-label", "Tất cả mục quản trị");
      sheet.innerHTML = '<div class="s-scrim" data-close="1"></div><div class="s-panel"><div class="s-grab" aria-hidden="true"><i></i></div><div class="s-body">' +
        GROUPS.map(function (g) {
          return "<section><h3><span>" + g[0] + "</span>" + esc(g[1]) + '</h3><div class="s-tiles">' +
            g[2].map(function (t) {
              var isHere = t[2] === here;
              return '<a class="s-tile' + (isHere ? ' is-here" aria-current="page' : "") + '" href="' + t[2] + '"><span class="s-ic">' + t[0] + '</span><span class="s-lb">' + esc(t[1]) + "</span></a>";
            }).join("") + "</div></section>";
        }).join("") + "</div></div>";
      document.body.appendChild(sheet);

      var panel = sheet.querySelector(".s-panel");
      var open = false, anim = null, lastFocus = null;
      function reduce() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
      function curY() { var m = new DOMMatrixReadOnly(getComputedStyle(panel).transform); return m.m42 || 0; }
      function slideTo(y, ms) {
        var from = curY();
        if (anim) { anim.cancel(); anim = null; }
        panel.style.transform = "translateY(" + y + "px)";
        if (reduce() || !panel.animate) return Promise.resolve();
        var a = anim = panel.animate([{ transform: "translateY(" + from + "px)" }, { transform: "translateY(" + y + "px)" }], { duration: ms || 320, easing: E });
        return a.finished.catch(function () {}).then(function () { if (anim === a) anim = null; });
      }
      function openSheet() {
        if (open) return;
        open = true;
        lastFocus = document.activeElement;
        sheet.hidden = false;
        document.documentElement.classList.add("pd-sheet-lock");
        panel.style.transform = "translateY(" + panel.offsetHeight + "px)";
        requestAnimationFrame(function () {
          sheet.classList.add("is-open");
          slideTo(0);
          var f = panel.querySelector("a"); if (f) f.focus({ preventScroll: true });
        });
      }
      function closeSheet(fast) {
        if (!open) return;
        open = false;
        sheet.classList.remove("is-open");
        document.documentElement.classList.remove("pd-sheet-lock");
        slideTo(panel.offsetHeight, fast ? 200 : 280).then(function () { if (!open) sheet.hidden = true; });
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }
      document.getElementById("pdAdminMoreBtn").addEventListener("click", function (e) {
        e.preventDefault();
        open ? closeSheet() : openSheet();
      });
      sheet.addEventListener("click", function (e) {
        if (e.target.closest("[data-close]")) closeSheet();
        else if (e.target.closest("a.s-tile")) closeSheet(true);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
      /* Quay lại trang bằng nút Back của máy (bfcache) thì tờ phải đóng sẵn */
      window.addEventListener("pageshow", function () { if (open) { open = false; sheet.classList.remove("is-open"); sheet.hidden = true; document.documentElement.classList.remove("pd-sheet-lock"); } });

      /* Kéo xuống để đóng: bám ngón 1:1, thả ra chiếu quán tính rồi chọn đóng/giữ */
      var grab = sheet.querySelector(".s-grab"), dragging = false, startY = 0, baseY = 0, hist = [];
      grab.addEventListener("pointerdown", function (e) {
        dragging = true; grab.setPointerCapture(e.pointerId);
        if (anim) { anim.cancel(); anim = null; }
        baseY = curY(); startY = e.clientY; hist = [{ y: e.clientY, t: e.timeStamp }];
      });
      grab.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var y = baseY + (e.clientY - startY);
        if (y < 0) y = -(Math.sqrt(-y) * 2);
        panel.style.transform = "translateY(" + y + "px)";
        hist.push({ y: e.clientY, t: e.timeStamp }); if (hist.length > 6) hist.shift();
      });
      function end() {
        if (!dragging) return;
        dragging = false;
        var a = hist[0], b = hist[hist.length - 1];
        var v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
        var projected = curY() + (v / 1000) * 0.998 / (1 - 0.998);
        if (projected > panel.offsetHeight * 0.4) closeSheet(true); else slideTo(0);
      }
      grab.addEventListener("pointerup", end);
      grab.addEventListener("pointercancel", end);
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
