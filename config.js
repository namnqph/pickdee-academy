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
