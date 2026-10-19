window.PICKDEE_CONFIG = {
  REGISTER_URL:
    "https://pickdee.vn/student-register",

  SUPABASE_URL:
    "https://snxztjsluhdibrklougo.supabase.co",

  SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0",

  VAPID_PUBLIC_KEY:
    "BBTX2lpI1qdfCnsbAgEARxkgYeAPqmME7OnaGmx4rFzLMrhiAzK2xDS9fsswouwp4YPtEtX8TIQF68IEn6zSbgI"
};


/* =========================================================
   PICKDEE - LOAD HOME NAV
========================================================= */

(function () {

  function loadPickDeeHomeNav() {

    if (
      document.querySelector(
        'script[data-pickdee-home-nav="1"]'
      )
    ) {
      return;
    }

    const script =
      document.createElement(
        "script"
      );

    script.src =
      "./home-nav.js?v=20260916-1";

    script.dataset.pickdeeHomeNav =
      "1";

    script.async =
      true;

    document.body.appendChild(
      script
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      loadPickDeeHomeNav,
      {
        once: true
      }
    );

  }
  else {

    loadPickDeeHomeNav();

  }

})();


/* =========================================================
   PICKDEE GLOBAL SUPABASE SINGLETON
   TOÀN WEBSITE DÙNG DUY NHẤT 1 AUTH CLIENT
========================================================= */

(function () {

  const cfg =
    window.PICKDEE_CONFIG || {};


  if (
    !window.supabase
    ||
    !cfg.SUPABASE_URL
    ||
    !cfg.SUPABASE_PUBLISHABLE_KEY
  ) {

    console.error(
      "PickDee Global: thiếu cấu hình Supabase."
    );

    return;
  }


  /*
    Nếu shared client đã tồn tại
    thì không tạo thêm.
  */

  if (
    window.PICKDEE_SUPABASE
    &&
    window.PICKDEE_SUPABASE.__pickdeeSharedClient
  ) {

    window.PICKDEE_NOTIFICATION_SB =
      window.PICKDEE_SUPABASE;

    window.supabaseClient =
      window.PICKDEE_SUPABASE;

    window.sb =
      window.PICKDEE_SUPABASE;

    return;
  }


  /*
    Giữ lại createClient gốc.
  */

  const originalCreateClient =
    window.supabase.createClient.bind(
      window.supabase
    );


  /*
    Chỉ tạo DUY NHẤT 1 client
    cho project Supabase PickDee.
  */

  const sharedClient =
    originalCreateClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {

          persistSession:
            true,

          autoRefreshToken:
            true,

          detectSessionInUrl:
            true,

          storageKey:
            "pickdee-auth"
        }
      }
    );


  /*
    Đánh dấu client dùng chung.
  */

  Object.defineProperty(
    sharedClient,
    "__pickdeeSharedClient",
    {
      value: true,
      enumerable: false
    }
  );


  /*
    GIỮ ĐĂNG NHẬP ÍT NHẤT 30 NGÀY (functions/api/auth-keep.js).
    Safari iPhone / Zalo / Telegram có thể xoá localStorage sau vài ngày → mất phiên.
    - Có phiên: lưu refresh token mới nhất vào cookie HttpOnly 30 ngày (gia hạn mỗi lần làm mới token).
    - Mất phiên mà còn cookie: lấy lại phiên TRƯỚC khi trang đọc getSession/getUser (chờ tối đa 5 giây).
    - Đăng xuất: xoá cookie, không tự lấy lại.
  */

  const KEEP_URL =
    "/api/auth-keep";

  function keepStore(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    catch (_) {}
  }

  function keepRead(key) {
    try { return localStorage.getItem(key); }
    catch (_) { return null; }
  }

  function keepPost(body) {
    return fetch(KEEP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      keepalive: true
    });
  }

  let restoring = false;

  const restorePromise =
    !keepRead("pickdee-auth")
    && !keepRead("pd_signed_out")
    && /(?:^|;\s*)pd_rt_hint=1/.test(document.cookie)
      ? keepPost({ action: "restore" })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(async function (s) {
            if (!s || !s.access_token) return;
            restoring = true;
            try {
              await sharedClient.auth.setSession({
                access_token: s.access_token,
                refresh_token: s.refresh_token
              });
            }
            finally {
              restoring = false;
            }
          })
          .catch(function (error) {
            console.warn("PickDee auth restore:", error);
          })
      : null;

  function waitRestore() {
    return restorePromise && !restoring
      ? Promise.race([
          restorePromise,
          new Promise(function (resolve) { setTimeout(resolve, 5000); })
        ])
      : Promise.resolve();
  }

  ["getSession", "getUser"].forEach(function (name) {
    const original =
      sharedClient.auth[name].bind(sharedClient.auth);
    sharedClient.auth[name] =
      async function () {
        await waitRestore();
        return original.apply(null, arguments);
      };
  });

  sharedClient.auth.onAuthStateChange(function (event, session) {
    const token =
      session && session.refresh_token;
    if (event === "SIGNED_OUT") {
      keepStore("pd_rt_kept", null);
      return;
    }
    if (event === "SIGNED_IN") {
      keepStore("pd_signed_out", null);
    }
    if (token && token !== keepRead("pd_rt_kept")) {
      keepStore("pd_rt_kept", token);
      keepPost({ action: "save", refresh_token: token })
        .then(function (res) { if (!res.ok) keepStore("pd_rt_kept", null); })
        .catch(function () { keepStore("pd_rt_kept", null); });
    }
  });


  /*
    ĐĂNG XUẤT KHÔNG BAO GIỜ TREO.
    Safari iPhone: khoá phiên có thể kẹt khi app mở lại từ nền
    → signOut() chờ mãi, trang không chuyển, phiên không xoá.
    Hoặc server báo lỗi mạng → thư viện giữ nguyên phiên trên máy.
    Sửa: chờ server tối đa 3 giây, sau đó LUÔN xoá phiên trên máy.
  */

  const originalSignOut =
    sharedClient.auth.signOut.bind(
      sharedClient.auth
    );

  sharedClient.auth.signOut =
    async function (options) {

      try {

        await Promise.race([
          originalSignOut(options),
          new Promise(function (resolve) {
            setTimeout(resolve, 3000);
          })
        ]);

      }
      catch (error) {

        console.warn(
          "PickDee signOut:",
          error
        );

      }

      /* Xoá cookie giữ đăng nhập (chờ tối đa 1,5 giây) */
      try {

        await Promise.race([
          fetch(KEEP_URL, {
            method: "DELETE",
            credentials: "same-origin",
            keepalive: true
          }),
          new Promise(function (resolve) {
            setTimeout(resolve, 1500);
          })
        ]);

      }
      catch (_) {}

      keepStore("pd_signed_out", "1");

      keepStore("pd_rt_kept", null);

      try {

        Object.keys(localStorage).forEach(
          function (key) {
            if (
              key === "pickdee-auth"
              ||
              key.indexOf("pickdee-auth-") === 0
              ||
              /^sb-.*-auth-token/.test(key)
            ) {
              localStorage.removeItem(key);
            }
          }
        );

      }
      catch (_) {}

      return { error: null };

    };


  /*
    Toàn bộ tên client cũ
    đều trỏ về cùng một client.
  */

  window.PICKDEE_SUPABASE =
    sharedClient;

  window.PICKDEE_NOTIFICATION_SB =
    sharedClient;

  window.supabaseClient =
    sharedClient;

  window.sb =
    sharedClient;


  /*
    Các đoạn code cũ phía dưới
    vẫn gọi createClient(...)
    nhưng sẽ nhận lại sharedClient
    nếu dùng đúng project PickDee.
  */

  window.supabase.createClient =
    function (
      url,
      key,
      options
    ) {

      if (
        url === cfg.SUPABASE_URL
        &&
        key ===
          cfg.SUPABASE_PUBLISHABLE_KEY
      ) {

        return sharedClient;

      }


      return originalCreateClient(
        url,
        key,
        options
      );

    };


  console.log(
    "✓ PickDee Global Supabase singleton ready."
  );

})();
(function () {

  const path =
    window.location.pathname;
const publicCoachPaths = [
  "/coach-profile",
  "/coach-profile.html"
];

if (
  publicCoachPaths.includes(path)
) {
  return;
}
 const coachPrivatePaths = [
  "/coach",
  "/coach.html",

  "/coach-sessions",
  "/coach-sessions.html",

  "/coach-session-requests",
  "/coach-session-requests.html",

  "/coach-cover-requests",
  "/coach-cover-requests.html",

  "/coach-my-work",
  "/coach-my-work.html",

  "/coach-students",
  "/coach-students.html",

  "/coach-session-detail",
  "/coach-session-detail.html",

  "/coach-opportunity",
  "/coach-opportunity.html"
];


const isCoachArea =
  coachPrivatePaths.includes(path);

  if (!isCoachArea) {
    return;
  }

  function loadCoachTelegramGate() {

    if (
      document.querySelector(
        'script[data-pickdee-coach-gate]'
      )
    ) {
      return;
    }

    const script =
      document.createElement("script");

   script.src =
  "/coach-telegram-gate.js?v=20261003-1";

    script.setAttribute(
      "data-pickdee-coach-gate",
      "1"
    );

    document.body.appendChild(
      script
    );

  }

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      loadCoachTelegramGate,
      {
        once: true
      }
    );

  }
  else {

    loadCoachTelegramGate();

  }

})();


/* =========================================================
   PICKDEE - ĐẾM LƯỢT TRUY CẬP (pd-track.js, admin xem ở /admin-traffic)
========================================================= */

(function () {
  try {
    if (document.querySelector('script[data-pd-track="1"]')) return;
    var s = document.createElement("script");
    s.src = "/pd-track.js?v=20261016-1";
    s.async = true;
    s.dataset.pdTrack = "1";
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();

