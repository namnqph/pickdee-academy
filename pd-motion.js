/* PickDee — chuyển động chung cho trang công khai (trang bên trong dùng pd-app.js).
   Chuyển trang mờ chéo như app, thẻ hiện ra khi cuộn tới, số đỏ nảy, máy tính rê chuột thẻ nhích lên. */
(function () {
  if (window.__pdMotion || window.__pdApp) return;
  window.__pdMotion = true;

  var CARDS = ".ecosystem-card,.smart-card,.product-card,.promo-card,.ecosystem-item,.trust-item,.pda-card,.pda-tile,.pp-card,.pickdee-ecosystem-item,.court-card,.coach-card";
  var css = [
    "@view-transition{navigation:auto}",
    "::view-transition-old(root),::view-transition-new(root){animation-duration:.16s;animation-timing-function:cubic-bezier(.23,1,.32,1)}",
    "html.pd-js :is(" + CARDS + "):not(.pd-in){opacity:0;translate:0 14px;scale:.985}",
    ":is(" + CARDS + "){transition:opacity .45s cubic-bezier(.23,1,.32,1),translate .45s cubic-bezier(.23,1,.32,1),scale .45s cubic-bezier(.23,1,.32,1),border-color .2s}",
    "@media(hover:hover){:is(" + CARDS + "):hover{translate:0 -3px}}",
    ":is(" + CARDS + "):active{scale:.985;transition-duration:.12s}",
    "@keyframes pdPop{0%{scale:.4;opacity:0}60%{scale:1.15;opacity:1}100%{scale:1}}",
    ":is(.app-cart-badge,.app-favorite-badge,[class*=badge][class*=count]){animation:pdPop .34s cubic-bezier(.34,1.56,.64,1) backwards}",
    "@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;transition-duration:.01ms !important}html.pd-js :is(" + CARDS + "):not(.pd-in){opacity:1;translate:none;scale:none}}"
  ].join("\n");
  var st = document.createElement("style");
  st.id = "pdMotionCss";
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  /* chuyển trang bị huỷ (bấm quá nhanh) là bình thường — không báo lỗi */
  ["pageswap", "pagereveal"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      var t = e.viewTransition;
      if (t) [t.ready, t.finished, t.updateCallbackDone].forEach(function (p) { if (p) p.catch(function () {}); });
    });
  });

  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("pd-js");

  /* thẻ cùng hàng hiện so le 50ms; thẻ trong màn hình chắc chắn hiện sau 2s */
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      el.style.transitionDelay = Math.min(n++, 5) * 50 + "ms";
      el.classList.add("pd-in");
      setTimeout(function () { el.style.transitionDelay = ""; }, 700);
    });
  }, { rootMargin: "0px 0px -6% 0px" });

  function watch(el) {
    if (el.__pdSeen) return;
    el.__pdSeen = true;
    io.observe(el);
    setTimeout(function () { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("pd-in"); }, 2000);
  }
  function scan(root) {
    if (root.matches && root.matches(CARDS)) watch(root);
    root.querySelectorAll(CARDS).forEach(watch);
  }
  function start() {
    scan(document);
    /* thẻ do JS vẽ sau (sản phẩm, sân) */
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
