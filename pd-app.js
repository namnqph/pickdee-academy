/* =========================================================
   PICKDEE – LỚP GIAO DIỆN APP DÙNG CHUNG cho trang bên trong
   (Học viên / Coach / Admin / Shop Admin). Chỉ thêm giao diện, không đổi dữ liệu/luồng.
   1) Cảm giác app: chạm, ấn lún, ô nhập, đầu trang dính mờ, trang hiện mượt
   2) Bảng → thẻ trên điện thoại (≤759px), tự gắn nhãn cột, theo dõi bảng vẽ lại
   3) Menu đáy (Coach/HV/Admin/Shop Admin): biểu tượng nét (SVG) thay emoji, nền kính
========================================================= */
(function () {
  if (window.__pdApp) return;
  window.__pdApp = true;

  var css = [
    "html{-webkit-text-size-adjust:100%;overscroll-behavior:none}",
    "body{-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}",
    "button,a,summary,[role=button],.btn,label{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}",
    "button,summary,[role=button]{-webkit-user-select:none;user-select:none}",
    "button,a.btn,a[class*=btn],a[class*=button],.action-btn,summary{transition:transform .12s ease,filter .12s ease,background-color .15s,border-color .15s,box-shadow .15s}",
    "button:not(:disabled):active,a.btn:active,a[class*=btn]:active,a[class*=button]:active,.action-btn:active,summary:active{transform:scale(.97);filter:brightness(.94)}",
    "input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea{transition:border-color .15s,box-shadow .15s}",
    "input:not([type=checkbox]):not([type=radio]):not([type=file]):focus,select:focus,textarea:focus{outline:none;border-color:#ffc934 !important;box-shadow:0 0 0 3px rgba(255,201,52,.16) !important}",
    "::-webkit-scrollbar{width:0;height:0}",
    /* nhận diện PickDee: phông Be Vietnam Pro, số thẳng cột, nút chữ thường như app */
    "body,button,input,select{font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,-apple-system,sans-serif !important}",
    ":where(textarea){font-family:inherit}",
    "body{font-variant-numeric:tabular-nums}",
    "h1,h2,h3{letter-spacing:-.02em;text-wrap:balance}",
    "button,a.btn,a[class*=btn],a[class*=button],.btn,.chip,.filter-chip,.tab,.tabs button{text-transform:none !important;letter-spacing:0 !important}",
    /* ô số liệu: điện thoại xếp ngang gọn, không mỗi số 1 hàng */
    "@media(max-width:759px){:is(section,div):has(>.summary-card+.summary-card),:is(section,div):has(>.card-stat+.card-stat){display:grid !important;grid-template-columns:repeat(auto-fit,minmax(104px,1fr)) !important;gap:8px !important}",
    ".summary-card,.card-stat{padding:12px 14px !important;min-height:0 !important;box-shadow:none !important}",
    ".summary-label,.card-stat-label{font-size:12px !important;line-height:1.3}",
    ".summary-value,.card-stat-value{font-size:20px !important;margin-top:4px !important}}",
    /* chuyển động PickDee (Emil): chuyển trang mờ chéo như app, thẻ hiện so le lúc mở trang, số đỏ nảy */
    "@keyframes pdRise{from{opacity:0;translate:0 10px;scale:.985}}",
    "html.pd-enter :is(.summary-card,.card-stat,.card,.module-card,.session-card,.course-card,table.pd-cards tr,.list-item){animation:pdRise .32s cubic-bezier(.23,1,.32,1) backwards}",
    "html.pd-enter :is(.summary-card,.card-stat,.card,.module-card,.session-card,.course-card,table.pd-cards tr,.list-item):nth-child(2){animation-delay:35ms}",
    "html.pd-enter :is(.summary-card,.card-stat,.card,.module-card,.session-card,.course-card,table.pd-cards tr,.list-item):nth-child(3){animation-delay:70ms}",
    "html.pd-enter :is(.summary-card,.card-stat,.card,.module-card,.session-card,.course-card,table.pd-cards tr,.list-item):nth-child(4){animation-delay:105ms}",
    "html.pd-enter :is(.summary-card,.card-stat,.card,.module-card,.session-card,.course-card,table.pd-cards tr,.list-item):nth-child(n+5){animation-delay:140ms}",
    "@keyframes pdPop{0%{scale:.4;opacity:0}60%{scale:1.15;opacity:1}100%{scale:1}}",
    ":is(.badge,.notif-badge,.bell-badge,[class*=badge][class*=count],[class*=-count]:not(input)){animation:pdPop .34s cubic-bezier(.34,1.56,.64,1) backwards}",
    ":is(#pdlBottom,#pdPortalNav,#pdAdminNav,#pdAppNav,#admBottomBar) a:active .pd-ic{scale:.88;transition:scale .1s}",
    ":is(#pdlBottom,#pdPortalNav,#pdAdminNav,#pdAppNav,#admBottomBar) .pd-ic{transition:scale .32s cubic-bezier(.34,1.56,.64,1),background-color .2s}",
    "@media(hover:hover){:is(.card,.summary-card,.module-card,.session-card,.course-card){transition:translate .2s cubic-bezier(.23,1,.32,1),border-color .2s}a:is(.card,.module-card,.session-card,.course-card):hover{translate:0 -2px}}",
    "@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;transition-duration:.01ms !important}}",
    /* đầu trang dính, mờ kính khi cuộn */
    "header.pd-app-sticky{position:sticky;top:0;z-index:800;transition:background .2s,box-shadow .2s}",
    "header.pd-app-scrolled{background:rgba(12,12,12,.84) !important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 1px 0 rgba(255,255,255,.07)}",
    "body>header .brand,header.topbar .brand,body>header>a,header.topbar>a{white-space:nowrap}",
    /* nút "Cài app" nổi: ẩn khi cuộn xuống, hiện khi cuộn lên; chừa chỗ cuối trang */
    "#pdpInstall{transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1) !important}",
    "#pickdeeSupportRoot{transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1)}",
    "@media(max-width:760px){#pickdeeSupportRoot.pd-hide{opacity:0;pointer-events:none;transform:translateY(24px)}}",
    "#pdpInstall.pd-hide{opacity:0;pointer-events:none;transform:translateX(-50%) translateY(24px) !important}",
    "@media(max-width:759px){body.pd-has-install{padding-bottom:calc(136px + env(safe-area-inset-bottom)) !important}}",
    /* nút quay lại trong đầu trang → nút tròn kiểu app (điện thoại) */
    "@media(max-width:759px){a.pd-back{order:-1;flex:none;display:grid !important;place-items:center;width:38px;height:38px;padding:0 !important;margin:0 !important;border-radius:50% !important;background:rgba(255,255,255,.07) !important;border:1px solid rgba(255,255,255,.12) !important;color:#fff !important;font-size:0 !important;text-decoration:none}",
    "a.pd-back svg{width:20px;height:20px}}",
    "@media(min-width:760px){a.pd-back svg{display:none}}",
    /* menu đáy (launcher, cổng Coach/HV, Admin, trang chủ Admin, Shop Admin) */
    "#pdlBottom .pd-ic,#pdPortalNav .pd-ic,#pdAdminNav .pd-ic,#pdAppNav .pd-ic,#admBottomBar .pd-ic{display:grid;place-items:center;width:44px;height:28px;padding:0 !important;border-radius:999px;font-size:0 !important;transition:background .2s}",
    "#pdlBottom .pd-ic svg,#pdPortalNav .pd-ic svg,#pdAdminNav .pd-ic svg,#pdAppNav .pd-ic svg,#admBottomBar .pd-ic svg{width:22px;height:22px}",
    "#pdlBottom a,#pdlBottom .pdl-bt,#pdPortalNav a,#pdPortalNav .pdl-bt,#pdAdminNav a,#pdAdminNav .pdl-bt,#pdAppNav a,#pdAppNav .pdl-bt,#admBottomBar a,#admBottomBar .pdl-bt{color:rgba(255,255,255,.58) !important;transition:color .15s,transform .12s}",
    "#pdlBottom .active,#pdlBottom .is-active,#pdlBottom [aria-current],#pdPortalNav .active,#pdPortalNav .is-active,#pdPortalNav [aria-current],#pdAdminNav .active,#pdAdminNav .is-active,#pdAdminNav [aria-current],#pdAppNav .active,#pdAppNav .is-active,#pdAppNav [aria-current],#admBottomBar .active,#admBottomBar .is-active,#admBottomBar [aria-current]{color:#ffc934 !important}",
    "#pdlBottom .active .pd-ic,#pdlBottom .is-active .pd-ic,#pdlBottom [aria-current] .pd-ic,#pdPortalNav .active .pd-ic,#pdPortalNav .is-active .pd-ic,#pdPortalNav [aria-current] .pd-ic,#pdAdminNav .active .pd-ic,#pdAdminNav .is-active .pd-ic,#pdAdminNav [aria-current] .pd-ic,#pdAppNav .active .pd-ic,#pdAppNav .is-active .pd-ic,#pdAppNav [aria-current] .pd-ic,#admBottomBar .active .pd-ic,#admBottomBar .is-active .pd-ic,#admBottomBar [aria-current] .pd-ic{background:rgba(255,255,255,.112)}",
    "#pdlBottom .active svg,#pdlBottom [aria-current] svg,#pdPortalNav .active svg,#pdPortalNav [aria-current] svg,#pdAdminNav .active svg,#pdAdminNav [aria-current] svg,#pdAppNav .active svg,#pdAppNav [aria-current] svg,#admBottomBar .active svg,#admBottomBar [aria-current] svg{filter:none}",
    "#pdlBottom,#pdPortalNav,#pdAdminNav,#pdAppNav,#admBottomBar{background:rgba(12,12,12,.88) !important;backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border-top:1px solid rgba(255,255,255,.08) !important}",
    "@media(max-width:760px){.tabs .tab:has(.pd-ic){display:flex !important;flex-direction:column;align-items:center !important;justify-content:center !important;text-align:center !important;min-width:0}",
    ".tabs .tab .pd-tl{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;text-align:center}}",
    ".tabs .tab .pd-ic{display:grid;place-items:center;width:44px;height:28px;margin:0 !important;padding:0 !important;border-radius:999px;font-size:0 !important;background:none}",
    ".tabs .tab .pd-ic svg{width:22px;height:22px}",
    ".tabs .tab.active .pd-ic{background:rgba(255,255,255,.112)}",
    /* bảng → thẻ */
    "@media(max-width:759px){",
    "table.pd-cards{border-collapse:separate !important;border-spacing:0 !important;width:100% !important;min-width:0 !important;background:transparent !important}",
    "table.pd-cards thead{display:none !important}",
    "table.pd-cards,table.pd-cards tbody{display:block !important}",
    "table.pd-cards tr{display:block !important;margin:0 0 10px !important;padding:12px 14px !important;border-radius:18px !important;background:rgba(255,255,255,.045) !important;border:1px solid rgba(255,255,255,.09) !important;box-shadow:0 8px 20px rgba(0,0,0,.22)}",
    "table.pd-cards td{display:flex !important;justify-content:space-between;align-items:baseline;gap:12px;padding:6px 0 !important;border:0 !important;border-bottom:1px solid rgba(255,255,255,.06) !important;text-align:right !important;white-space:normal !important;min-width:0 !important;width:auto !important;font-size:14px}",
    "table.pd-cards td:last-child{border-bottom:0 !important}",
    "table.pd-cards td{flex-wrap:wrap;overflow-wrap:anywhere}",
    "table.pd-cards td>*{max-width:100%;min-width:0}",
    "table.pd-cards td::before{content:attr(data-label);flex:none;max-width:45%;text-align:left;color:#a3a3a3;font-size:12px;font-weight:800}",
    "table.pd-cards td[data-label=''],table.pd-cards td:not([data-label]){justify-content:center;text-align:center !important}",
    "table.pd-cards td[data-label='']::before,table.pd-cards td:not([data-label])::before{display:none}",
    "table.pd-cards td:first-child{font-weight:900;color:#fff;font-size:15px}",
    "table.pd-cards td[colspan]{display:block !important;text-align:center !important;color:#a3a3a3;padding:14px 4px !important}",
    "table.pd-cards td[colspan]::before{display:none}",
    "table.pd-cards tr:has(td[colspan]){background:transparent !important;border-style:dashed !important;box-shadow:none}",
    ".table-wrap:has(table.pd-cards),div:has(>table.pd-cards){overflow:visible !important;background:transparent !important;border:0 !important;box-shadow:none !important;padding:0 !important}",
    "}",
    /* cổng Coach/HV trên điện thoại: menu đáy đã có → ẩn hàng nút trùng ở đầu trang */
    "@media(max-width:759px){body:has(#pdPortalNav) .coach-nav{display:none !important}}"
  ].join("\n");
  var st = document.createElement("style");
  st.id = "pdAppCss";
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  /* chuyển trang bị huỷ (bấm quá nhanh) là bình thường — không báo lỗi */
  ["pageswap", "pagereveal"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      var t = e.viewTransition;
      if (t) [t.ready, t.finished, t.updateCallbackDone].forEach(function (p) { if (p) p.catch(function () {}); });
    });
  });
  /* thẻ chỉ hiện so le trong 1,5s đầu — lọc/bấm sau đó không lặp hiệu ứng */
  document.documentElement.classList.add("pd-enter");
  setTimeout(function () { document.documentElement.classList.remove("pd-enter"); }, 1500);
  /* phông Be Vietnam Pro (Google Fonts, miễn phí) + màu thanh trạng thái điện thoại */
  if (!document.getElementById("pdFont")) {
    var fl = document.createElement("link");
    fl.id = "pdFont"; fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap";
    (document.head || document.documentElement).appendChild(fl);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    var tc = document.createElement("meta");
    tc.name = "theme-color"; tc.content = "#0c0c0c";
    (document.head || document.documentElement).appendChild(tc);
  }

  /* ---------- bảng → thẻ ---------- */
  function label(table) {
    if (table.classList.contains("pd-no-cards")) return;
    var ths = table.querySelectorAll("thead th");
    if (!ths.length) return;
    var names = Array.prototype.map.call(ths, function (th) { return (th.textContent || "").replace(/\s+/g, " ").trim(); });
    table.classList.add("pd-cards");
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      var i = 0;
      Array.prototype.forEach.call(tr.children, function (td) {
        if (td.tagName !== "TD") return;
        if (!td.hasAttribute("colspan") && !td.hasAttribute("data-label")) td.setAttribute("data-label", names[i] || "");
        i += Number(td.getAttribute("colspan") || 1);
      });
    });
  }
  var pending = false;
  function scan() {
    pending = false;
    document.querySelectorAll("table").forEach(label);
    upgradeNav(); backBtn(); dockBell();
    document.body.classList.toggle("pd-has-install", !!document.getElementById("pdpInstall"));
  }
  function later() { if (!pending) { pending = true; requestAnimationFrame(scan); } }

  /* ---------- menu đáy: SVG thay emoji ---------- */
  var P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    home: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.3" fill="currentColor"/></svg>',
    users: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 010 6M18 14c2 .7 3 2.8 3 6"/></svg>',
    work: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18"/></svg>',
    me: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    pay: '<svg viewBox="0 0 24 24" ' + P + '><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M7 15h4"/></svg>',
    money: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.2c0 4.6 9 2.4 9 7.1 0 2-2 3.2-4.5 3.2s-4.5-1.1-4.5-3"/></svg>',
    bell: '<svg viewBox="0 0 24 24" ' + P + '><path d="M6 9a6 6 0 1112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 004 0"/></svg>',
    shop: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 8h16l-1.2 11a2 2 0 01-2 1.8H7.2a2 2 0 01-2-1.8z"/><path d="M8.5 8V6.5a3.5 3.5 0 017 0V8"/></svg>',
    box: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/></svg>',
    chart: '<svg viewBox="0 0 24 24" ' + P + '><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    store: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 9.5L12 4l9 5.5V20H3z"/><path d="M7 20v-7h10v7M7 16.5h10"/></svg>',
    task: '<svg viewBox="0 0 24 24" ' + P + '><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8.5 12l2.2 2.2L15.5 9.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" ' + P + '><path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4A8 8 0 1120 12z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" ' + P + '><path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
    gift: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z"/></svg>',
    more: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>'
  };
  var BY_LABEL = [
    [/trang chủ|tổng quan/i, "home"], [/^việc/i, "task"], [/hỗ trợ/i, "chat"], [/nhập hàng/i, "truck"], [/khuyến mãi/i, "gift"],
    [/lịch|buổi/i, "cal"], [/học viên|coach/i, "users"], [/công/i, "work"],
    [/hồ sơ|tài khoản|cá nhân/i, "me"], [/đặt|thêm|tạo/i, "plus"], [/thanh toán|học phí/i, "pay"],
    [/thu nhập|doanh thu|tiền/i, "money"], [/thông báo/i, "bell"], [/^kho/i, "store"], [/sản phẩm/i, "box"], [/đơn|bán|shop/i, "shop"],
    [/báo cáo|thống kê/i, "chart"], [/khác|thêm nữa|menu/i, "more"]
  ];
  function iconFor(text) {
    for (var i = 0; i < BY_LABEL.length; i++) if (BY_LABEL[i][0].test(text)) return ICON[BY_LABEL[i][1]];
    return "";
  }
  function upgradeNav() {
    var top = document.querySelector("#admBottomBar a[data-top]");
    if (top && /^\/admin(\.html)?\/?$/.test(location.pathname)) top.classList.add("active");
    document.querySelectorAll("#pdlBottom .pdl-bt,#pdPortalNav a,#pdAdminNav a,#pdAppNav a,#admBottomBar a,.tabs .tab").forEach(function (bt) {
      if (bt.querySelector(".pd-ic")) return;
      if (bt.classList.contains("tab") && !bt.querySelector(".pd-ti")) return;
      var spans = bt.querySelectorAll(":scope > span");
      if (spans.length < 2) return;
      var svg = iconFor((spans[1].textContent || "").trim());
      if (!svg) return;
      spans[0].className = (spans[0].className ? spans[0].className + " " : "") + "pd-ic";
      spans[0].innerHTML = svg;
    });
  }

  /* ---------- đầu trang mờ kính khi cuộn ---------- */
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var inst = document.getElementById("pdpInstall");
    document.body.classList.toggle("pd-has-install", !!inst);
    [inst, document.getElementById("pickdeeSupportRoot")].forEach(function (el) {
      if (el && !el.querySelector("[open],.open,.is-open")) el.classList.toggle("pd-hide", y > 80 && y > lastY + 2 ? true : y < lastY - 2 ? false : el.classList.contains("pd-hide"));
    });
    lastY = y;
    var h = document.querySelector("header.topbar") || document.querySelector("body>header");
    if (h) h.classList.toggle("pd-app-scrolled", (window.scrollY || document.documentElement.scrollTop) > 6);
  }

  /* ---------- chuông nổi → nằm trong đầu trang (không đè chữ) ---------- */
  function dockBell() {
    var root = document.getElementById("pickdeeNotificationRoot");
    if (!root || root.dataset.pdDocked || root.parentNode !== document.body) return;
    var h = document.querySelector("header.topbar") || document.querySelector("body>header");
    if (!h || h.children.length > 4 || h.getBoundingClientRect().height > 120) return;
    root.dataset.pdDocked = "1";
    var last = h.lastElementChild;
    var group = last && /^(DIV|NAV)$/.test(last.tagName) && last.children.length && !last.classList.contains("brand") ? last : null;
    if (group) {
      group.insertBefore(root, group.firstChild);
      group.style.display = "flex"; group.style.alignItems = "center"; group.style.gap = "8px";
    } else {
      h.appendChild(root);
      h.style.display = "flex"; h.style.alignItems = "center"; h.style.gap = "10px";
      if (h.firstElementChild && h.firstElementChild !== last) h.firstElementChild.style.marginRight = "auto";
      // Chữ dài (email người dùng…) co lại thành "…" thay vì đẩy chuông ra ngoài màn hình
      Array.prototype.forEach.call(h.children, function (c) {
        if (c === root || c === h.firstElementChild || c.children.length) return;
        c.style.minWidth = "0"; c.style.flexShrink = "1"; c.style.overflow = "hidden"; c.style.textOverflow = "ellipsis"; c.style.whiteSpace = "nowrap";
      });
    }
    root.style.cssText += ";position:relative !important;top:auto !important;right:auto !important;left:auto !important;bottom:auto !important;margin:0 !important;flex:none";
  }

  /* ---------- "← Khu vực …" / "Quay lại" trong đầu trang → nút tròn ‹ ---------- */
  function backBtn() {
    var h = document.querySelector("header.topbar") || document.querySelector("body>header");
    if (!h) return;
    h.querySelectorAll("a").forEach(function (a) {
      if (a.classList.contains("pd-back")) return;
      var t = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (!/^(←|‹)|^quay lại/i.test(t)) return;
      a.classList.add("pd-back");
      a.setAttribute("aria-label", t.replace(/^[←‹]\s*/, "") || "Quay lại");
      a.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 24 24" ' + P + '><path d="M15 5l-7 7 7 7"/></svg>');
      // Đặt nút ‹ đầu HÀNG chứa logo (vd .header-inner có lề 10px), không ra ngoài header → không mất lề, chuông bên phải không bị lẹm
      var brand = h.querySelector(".brand");
      var row = brand && brand.parentNode && h.contains(brand.parentNode) ? brand.parentNode : h;
      if (getComputedStyle(row).display !== "flex") { row.style.display = "flex"; row.style.alignItems = "center"; row.style.gap = "10px"; }
      if (a.parentNode !== row || row.firstElementChild !== a) row.insertBefore(a, row.firstChild);
      if (brand) brand.style.marginRight = "auto";
      row.style.justifyContent = "flex-start";
    });
  }

  /* ---------- iPhone: bật vùng an toàn để menu đáy không bị thanh Home đè ---------- */
  (function () {
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/viewport-fit/.test(vp.content)) vp.content += ", viewport-fit=cover";
  })();

  /* ---------- trang Coach/HV thiếu menu đáy → tự gắn pd-portal-appnav.js ---------- */
  function portalNav() {
    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    if (!/^(coach|student)-/.test(page) || /^(coach-(activate|detail|work)|student-(register|detail))$/.test(page)) return;
    if (window.__pdPortalNav || document.getElementById("pdlBottom") || document.querySelector('script[src*="pd-portal-appnav"]')) return;
    var s = document.createElement("script");
    s.src = "/pd-portal-appnav.js?v=20261020-gold2";
    s.onload = function () { setTimeout(upgradeNav, 0); };
    document.head.appendChild(s);
  }

  function boot() {
    portalNav();
    var h = document.querySelector("header.topbar") || document.querySelector("body>header");
    if (h && getComputedStyle(h).position === "static") h.classList.add("pd-app-sticky");
    scan(); onScroll();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
