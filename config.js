window.PICKDEE_CONFIG = { REGISTER_URL: "https://docs.google.com/forms/d/e/1FAIpQLSebc9BVOcDdY6RpCP3Lfktr6J-QOdAbxnb-6HqI5vaPxTVSMw/viewform?usp=preview" ,SUPABASE_URL: "https://snxztjsluhdibrklougo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0"
};
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
    Nếu đã tạo rồi thì không tạo lần 2.
  */
  if (
    window.PICKDEE_SUPABASE
    &&
    window.PICKDEE_SUPABASE.__pickdeeSharedClient
  ) {
    return;
  }


  /*
    Giữ lại hàm createClient gốc.
  */
  const originalCreateClient =
    window.supabase.createClient.bind(
      window.supabase
    );


  /*
    DUY NHẤT một Auth client cho toàn website.
  */
  const sharedClient =
    originalCreateClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "pickdee-auth"
        }
      }
    );


  /*
    Đánh dấu client PickDee.
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
    Các tên cũ trong code đều trỏ về cùng 1 client.
  */
  window.PICKDEE_SUPABASE =
    sharedClient;

  window.PICKDEE_NOTIFICATION_SB =
    sharedClient;

  window.supabaseClient =
    sharedClient;


  /*
    Quan trọng:
    Các file cũ vẫn gọi createClient(...)
    nhưng từ giờ sẽ nhận lại client duy nhất này.
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
        key === cfg.SUPABASE_PUBLISHABLE_KEY
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
