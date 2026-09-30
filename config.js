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
      "/coach-telegram-gate.js?v=20260930-2";

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
