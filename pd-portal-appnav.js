/* =========================================================
   PICKDEE - MENU ĐÁY cho trang con cổng Coach / Học viên (điện thoại ≤759px)
   Giống thanh #pdlBottom của coach.html / student.html (pd-launcher.js).
   Gắn trực tiếp (thẻ script) vào các trang coach-* / student-* của người dùng.
========================================================= */

(function () {
  try {
    if (window.__pdPortalNav || document.getElementById("pdlBottom")) return;
    window.__pdPortalNav = true;

    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    var isCoach = /^coach-/.test(page);

    var MENUS = {
      coach: [
        ["home", "🏠", "Trang chủ", "/coach"],
        ["sessions", "📅", "Lịch dạy", "/coach-sessions"],
        ["students", "👥", "Học viên", "/coach-students"],
        ["work", "💼", "Công", "/coach-my-work"],
        ["me", "🪪", "Hồ sơ", "/coach#ho-so"]
      ],
      student: [
        ["home", "🏠", "Trang chủ", "/student"],
        ["sessions", "📅", "Lịch học", "/student-sessions"],
        ["book", "➕", "Đặt buổi", "/student-book-session"],
        ["pay", "💳", "Thanh toán", "/student-payments"],
        ["me", "👤", "Hồ sơ", "/student#ho-so"]
      ]
    };

    var ACTIVE = {
      "coach-sessions": "sessions", "coach-session-detail": "sessions", "coach-student-session-detail": "sessions",
      "coach-session-requests": "sessions", "coach-cover-requests": "sessions",
      "coach-students": "students", "coach-student-detail": "students", "coach-student-notes": "students",
      "coach-my-work": "work",
      "coach-profile": "me", "coach-change-password": "me", "coach-teach-courts": "me",
      "student-sessions": "sessions",
      "student-book-session": "book", "student-session-requests": "book",
      "student-payments": "pay", "student-registrations": "pay", "student-payment-checkout": "pay"
    };

    var items = MENUS[isCoach ? "coach" : "student"];
    var active = ACTIVE[page] || "";

    function mount() {
      if (document.getElementById("pdPortalNav")) return;
      var css = document.createElement("style");
      css.textContent =
        "#pdPortalNav{display:none}" +
        "@media (max-width:759px){" +
        "body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}" +
        "#pickdeeSupportRoot{bottom:calc(84px + env(safe-area-inset-bottom))!important}" +
        "#pdPortalNav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:900;" +
        "padding:6px 4px calc(6px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.10);" +
        "background:rgba(15,15,15,.97);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
        "#pdPortalNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;" +
        "color:rgba(255,255,255,.6);text-decoration:none;font-family:inherit;font-size:10.5px;font-weight:800;white-space:nowrap}" +
        "#pdPortalNav .pd-ti{font-size:21px;line-height:1;padding:3px 12px;border-radius:999px}" +
        "#pdPortalNav a.active{color:#ffc934}" +
        "#pdPortalNav a.active .pd-ti{background:rgba(255,255,255,.112)}" +
        "}";
      document.head.appendChild(css);

      var nav = document.createElement("nav");
      nav.id = "pdPortalNav";
      nav.setAttribute("aria-label", isCoach ? "Menu Coach" : "Menu học viên");
      nav.innerHTML = items.map(function (it) {
        return '<a href="' + it[3] + '"' + (it[0] === active ? ' class="active" aria-current="page"' : "") + ">" +
          '<span class="pd-ti">' + it[1] + "</span><span>" + it[2] + "</span></a>";
      }).join("");
      document.body.appendChild(nav);
    }

    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
  } catch (e) {}
})();
