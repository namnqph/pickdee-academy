(function () {

  "use strict";


  /* =====================================================
     PICKDEE SHOP - BANNER "ĐƠN CHƯA THANH TOÁN → XEM MÃ QR"

     shop-checkout / shop-track ghi đơn chuyển khoản chưa thanh toán
     vào localStorage. Mỗi lần mở trang Shop hỏi trạng thái thật
     (RPC shop_public_track_order) rồi mới hiện banner.
     Đã thanh toán / đã gửi bill / đã hủy / đã xong → tự quên.
     Máy không có đơn chờ thì không gọi mạng gì thêm.
  ====================================================== */

  const PENDING_PAYMENT_KEY =
    "pickdee_shop_pending_payment";

  const HIDDEN_KEY =
    "pickdee_shop_pending_payment_hidden";

  const MAX_AGE_MS =
    7 * 24 * 60 * 60 * 1000;

  const cfg =
    window.PICKDEE_CONFIG || {};


  let saved =
    null;

  try {

    saved =
      JSON.parse(
        localStorage.getItem(PENDING_PAYMENT_KEY)
        ||
        "null"
      );

  }
  catch (_) {

    return;

  }


  if (
    !saved
    ||
    typeof saved.token !== "string"
    ||
    saved.token.length < 32
  ) {
    return;
  }


  function forget() {

    try {

      localStorage.removeItem(
        PENDING_PAYMENT_KEY
      );

    }
    catch (_) {}

  }


  if (
    !(
      Date.now() - Number(saved.saved_at || 0)
      <
      MAX_AGE_MS
    )
  ) {

    forget();

    return;

  }


  try {

    if (
      sessionStorage.getItem(HIDDEN_KEY)
      ===
      saved.token
    ) {
      return;
    }

  }
  catch (_) {}


  if (
    !cfg.SUPABASE_URL
    ||
    !cfg.SUPABASE_PUBLISHABLE_KEY
    ||
    !window.fetch
  ) {
    return;
  }


  function escapeHtml(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  }


  function money(value) {

    return new Intl.NumberFormat(
      "vi-VN"
    ).format(
      Number(value || 0)
    )
    + "đ";

  }


  function showBanner(data) {

    if (
      document.getElementById(
        "pdPendingPayBanner"
      )
    ) {
      return;
    }


    const style =
      document.createElement("style");

    style.textContent = `

      #pdPendingPayBanner {
        position: relative;

        width:
          min(1180px, calc(100% - 24px));

        margin:
          10px auto 0;

        display: flex;
        align-items: stretch;

        border-radius: 14px;

        border:
          1px solid rgba(255,201,52,.42);

        /* nền đặc: trang /shop nền sáng, trang khác nền tối */
        background:
          linear-gradient(rgba(255,201,52,.08), rgba(255,201,52,.08)),
          #151515;

        box-shadow:
          0 8px 22px rgba(0,0,0,.18);

        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      #pdPendingPayBanner .pd-ppb-link {
        flex: 1 1 auto;
        min-width: 0;

        padding: 10px 12px;

        display: flex;
        align-items: center;
        gap: 10px;

        color: #fff;
        text-decoration: none;

        touch-action: manipulation;
      }

      #pdPendingPayBanner .pd-ppb-icon {
        flex: 0 0 auto;
        font-size: 20px;
      }

      #pdPendingPayBanner .pd-ppb-text {
        flex: 1 1 auto;
        min-width: 0;

        display: grid;
        gap: 2px;

        font-size: 10px;
        line-height: 1.35;

        color: rgba(255,255,255,.62);
      }

      #pdPendingPayBanner .pd-ppb-text strong {
        color: #fff;
        font-size: 12px;
        font-weight: 950;
      }

      #pdPendingPayBanner .pd-ppb-cta {
        flex: 0 0 auto;

        min-height: 36px;
        padding: 0 12px;

        display: inline-flex;
        align-items: center;

        border-radius: 10px;

        background: #ffc934;
        color: #0f0f0f;

        font-size: 10px;
        font-weight: 950;
        white-space: nowrap;
      }

      #pdPendingPayBanner .pd-ppb-close {
        flex: 0 0 auto;

        width: 38px;

        border: 0;
        border-left:
          1px solid rgba(255,201,52,.18);

        background: transparent;
        color: rgba(255,255,255,.55);

        font-size: 18px;
        font-weight: 700;

        cursor: pointer;
        touch-action: manipulation;
      }

      @media (max-width: 700px) {

        #pdPendingPayBanner {
          width: calc(100% - 18px);
          margin-top: 8px;
        }

        #pdPendingPayBanner .pd-ppb-link {
          padding: 9px 10px;
          gap: 8px;
        }

        #pdPendingPayBanner .pd-ppb-cta {
          padding: 0 10px;
        }

      }

    `;

    document.head.appendChild(
      style
    );


    const banner =
      document.createElement("div");

    banner.id =
      "pdPendingPayBanner";

    banner.innerHTML = `
      <a
        class="pd-ppb-link"
        href="./shop-track?token=${encodeURIComponent(saved.token)}"
      >
        <span class="pd-ppb-icon">🏦</span>

        <span class="pd-ppb-text">
          <strong>
            Đơn ${escapeHtml(data.order_code)} chưa thanh toán
          </strong>

          <span>
            ${
              data.payment_review_status === "rejected"
                ? "Cần gửi lại bill chuyển khoản"
                : escapeHtml(money(data.customer_total)) + " • chuyển khoản theo mã QR"
            }
          </span>
        </span>

        <span class="pd-ppb-cta">
          XEM QR →
        </span>
      </a>

      <button
        type="button"
        class="pd-ppb-close"
        aria-label="Ẩn thông báo"
      >
        ×
      </button>
    `;


    banner
      .querySelector(".pd-ppb-close")
      .addEventListener(
        "click",
        function () {

          try {

            sessionStorage.setItem(
              HIDDEN_KEY,
              saved.token
            );

          }
          catch (_) {}

          banner.remove();

        }
      );


    const header =
      document.getElementById("shopPublicHeader")
      ||
      document.querySelector(".shop-header");

    if (header) {

      header.insertAdjacentElement(
        "afterend",
        banner
      );

    }
    else {

      document.body.prepend(
        banner
      );

    }

  }


  fetch(
    cfg.SUPABASE_URL + "/rest/v1/rpc/shop_public_track_order",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        apikey: cfg.SUPABASE_PUBLISHABLE_KEY
      },

      body: JSON.stringify({
        p_token: saved.token
      })
    }
  )
    .then(
      function (response) {
        return response.ok ? response.json() : null;
      }
    )
    .then(
      function (data) {

        if (!data) {
          return;
        }

        // Link không còn đơn nào → quên luôn.
        if (data.success !== true) {

          forget();

          return;

        }

        // RPC chưa trả thông tin thanh toán → chưa làm gì.
        if (!data.payment_status) {
          return;
        }

        const stillUnpaid =
          data.payment_method === "bank_transfer"
          &&
          !["paid", "refunded"].includes(data.payment_status)
          &&
          !["cancelled", "completed"].includes(data.order_status)
          &&
          !["submitted", "verified"].includes(data.payment_review_status);

        if (!stillUnpaid) {

          forget();

          return;

        }

        // Đơn cồng kềnh chờ chốt phí ship: chưa cần chuyển khoản.
        if (data.shipping_pending_confirmation) {
          return;
        }

        showBanner(
          data
        );

      }
    )
    .catch(
      function () {}
    );

})();
