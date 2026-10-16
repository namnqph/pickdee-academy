/* =========================================================
   PICKDEE - ĐẾM LƯỢT TRUY CẬP (0 đồng, không lưu IP / thông tin cá nhân)
   Nạp từ config.js. Gửi 1 lượt xem → RPC pd_track_visit.
   Trang quản trị / Coach không đếm; ai từng vào trang quản trị
   được đánh dấu "nội bộ" và không tính vào thống kê.
========================================================= */

(function () {
  try {
    if (window.__pdTracked) return;
    window.__pdTracked = true;

    var cfg = window.PICKDEE_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) return;

    var ua = navigator.userAgent || "";
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|zalo.*preview/i.test(ua)) return;
    if (!/^(www\.)?pickdee\.vn$/.test(location.hostname)) return;

    var page = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "").toLowerCase();
    if (page === "") page = "index";

    var isStaffPage =
      /^(admin|shop-admin|support-admin|add-)/.test(page) ||
      (/^coach/.test(page) && page !== "coaches" && page !== "coach-detail") ||
      page === "students" || page === "sessions";

    function store(kind, key, val) {
      try {
        var s = window[kind];
        if (val === undefined) return s.getItem(key);
        s.setItem(key, val);
      } catch (e) { return null; }
    }

    function uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 3) | 8).toString(16);
      });
    }

    if (isStaffPage) {
      store("localStorage", "pd_staff", "1");
      return;
    }

    var isNew = false;
    var vid = store("localStorage", "pd_vid");
    if (!vid) {
      vid = uuid();
      isNew = true;
      store("localStorage", "pd_vid", vid);
    }

    var sid = store("sessionStorage", "pd_sid");
    if (!sid) {
      sid = uuid();
      store("sessionStorage", "pd_sid", sid);
    }

    // Nguồn: tính 1 lần cho mỗi phiên (lần vào đầu tiên)
    var src = store("sessionStorage", "pd_src");
    if (!src) {
      var q = new URLSearchParams(location.search);
      var utm = (q.get("utm_source") || "").toLowerCase();
      var ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch (e) {}

      if (/zalo/.test(utm) || q.has("zarsrc") || /zalo/i.test(ua) || /zalo/.test(ref)) src = "zalo";
      else if (/tiktok/.test(utm) || q.has("ttclid") || /musical_ly|tiktok|bytedancewebview|trill_/i.test(ua) || /tiktok/.test(ref)) src = "tiktok";
      else if (/facebook|fb|messenger/.test(utm) || q.has("fbclid") || /FBAN|FBAV|FB_IAB|FBIOS|Messenger/.test(ua) || /facebook|(^|\.)fb\.|messenger/.test(ref)) src = "facebook";
      else if (/instagram/.test(utm) || /Instagram/.test(ua) || /instagram/.test(ref)) src = "instagram";
      else if (/youtube/.test(utm) || /youtube|youtu\.be/.test(ref)) src = "youtube";
      else if (/google/.test(utm) || q.has("gclid") || /google\./.test(ref)) src = "google";
      else if (utm) src = "other";
      else if (/(^|\.)pickdee\.vn$/.test(ref)) src = "pickdee";
      else if (ref) src = "other";
      else src = "direct";

      store("sessionStorage", "pd_src", src);
    }

    var dev = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? "tablet"
      : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop");

    var pid = null;
    if (page === "shop-product") {
      pid = new URLSearchParams(location.search).get("id");
    }

    var body = JSON.stringify({
      p: {
        v: vid,
        s: sid,
        page: page,
        pid: pid,
        src: src,
        dev: dev,
        new: isNew,
        staff: store("localStorage", "pd_staff") === "1"
      }
    });

    function send() {
      try {
        fetch(cfg.SUPABASE_URL + "/rest/v1/rpc/pd_track_visit", {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
            Authorization: "Bearer " + cfg.SUPABASE_PUBLISHABLE_KEY
          },
          body: body
        }).catch(function () {});
      } catch (e) {}
    }

    // Gửi sau khi trang đã tải xong để không làm chậm trang
    if (document.readyState === "complete") setTimeout(send, 1200);
    else window.addEventListener("load", function () { setTimeout(send, 1200); }, { once: true });
  } catch (e) {}
})();
