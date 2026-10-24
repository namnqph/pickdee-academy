(function () {

  "use strict";


  // Link cộng tác viên ?ref=MÃ → nhớ 30 ngày; trang thanh toán vợt tự điền mã
  try {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && /^[A-Za-z0-9-]{3,20}$/.test(ref)) {
      localStorage.setItem("pickdee_aff_ref", JSON.stringify({ code: ref.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), ts: Date.now() }));
    }
  } catch (_) {}


  /* =====================================================
     PICKDEE SUPPORT WIDGET
  ====================================================== */

  const cfg =
    window.PICKDEE_CONFIG || {};


  if (
    !window.supabase
    ||
    !cfg.SUPABASE_URL
    ||
    !cfg.SUPABASE_PUBLISHABLE_KEY
  ) {

    console.warn(
      "PickDee Support: thiếu cấu hình Supabase."
    );

    return;

  }


  const sb =
    window.PICKDEE_SUPABASE
    ||
    window.supabaseClient
    ||
    window.sb
    ||
    window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_PUBLISHABLE_KEY
    );


  const STORAGE_TOKEN =
    "pickdee_support_public_token";


  const STORAGE_NAME =
    "pickdee_support_guest_name";


  const STORAGE_PHONE =
    "pickdee_support_guest_phone";


  let currentSession =
    null;


  let currentConversation =
    null;


  let pollTimer =
    null;


  let sending =
    false;


  let lastRenderedSignature =
    "";


  /* =====================================================
     HELPERS
  ====================================================== */

  function getSource() {

    const path =
      String(
        window.location.pathname || "/"
      ).toLowerCase();


    if (
      path.startsWith(
        "/shop"
      )
    ) {

      return "shop";

    }


    if (
      path.startsWith(
        "/coach"
      )
    ) {

      return "academy_coach";

    }


   if (
  path.startsWith(
    "/student"
  )
  ||
  path === "/change-coach"
) {

  return "academy_student";

}

if (
  path === "/apply-coach"
) {

  return "academy_coach";

}


if (
  path === "/find-coach"
  ||
  path === "/courts"
  ||
  path === "/court"
  ||
  path === "/court-claim"
  ||
  path === "/add-my-court"
  ||
  path === "/forgot-password"
) {

  return "academy";

}
    if (
      path.startsWith(
        "/admin"
      )
    ) {

      return "academy_admin";

    }


    if (
      path.startsWith(
        "/academy"
      )
    ) {

      return "academy";

    }


    return "homepage";

  }


  function getOrderRef() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return (
      params.get(
        "order_code"
      )
      ||
      params.get(
        "order"
      )
      ||
      ""
    );

  }


  function formatTime(
    value
  ) {

    if (
      !value
    ) {

      return "";

    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    return new Intl.DateTimeFormat(
      "vi-VN",
      {

        hour:
          "2-digit",

        minute:
          "2-digit",

        day:
          "2-digit",

        month:
          "2-digit"

      }
    ).format(
      date
    );

  }


  function scrollMessagesToBottom() {

    const box =
      document.getElementById(
        "pickdeeSupportMessages"
      );


    if (
      !box
    ) {

      return;

    }


    requestAnimationFrame(
      function () {

        box.scrollTop =
          box.scrollHeight;

      }
    );

  }


  function showError(
    text
  ) {

    const el =
      document.getElementById(
        "pickdeeSupportError"
      );


    if (
      !el
    ) {

      return;

    }


    el.textContent =
      text || "";


    el.style.display =
      text
        ?
        "block"
        :
        "none";

  }


  /* =====================================================
     CSS
  ====================================================== */

  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    #pickdeeSupportRoot {
      position: fixed;

      right:
        max(
          16px,
          env(safe-area-inset-right)
        );

      bottom:
        max(
          18px,
          env(safe-area-inset-bottom)
        );

      z-index: 2147483000;

      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }


    #pickdeeSupportButton {
      position: relative;

      min-width: 58px;
      height: 58px;

      padding: 0 18px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 8px;

      border: 0;
      border-radius: 999px;

      background: #ffc934;
      color: #102300;

      box-shadow:
        0 16px 42px
        rgba(0,0,0,.35);

      cursor: pointer;

      font-family: inherit;
      font-size: 13px;
      font-weight: 900;
    }


    #pickdeeSupportButtonIcon {
      font-size: 21px;
      line-height: 1;
    }


    #pickdeeSupportBadge {
      position: absolute;

      top: -5px;
      right: -3px;

      min-width: 21px;
      height: 21px;

      padding: 0 5px;

      display: none;
      align-items: center;
      justify-content: center;

      border-radius: 999px;

      background: #ff5858;
      color: #ffffff;

      border: 2px solid #161616;

      font-size: 10px;
      font-weight: 900;
    }


    #pickdeeSupportPanel {
      position: absolute;

      right: 0;
      bottom: 70px;

      width: min(
        390px,
        calc(100vw - 24px)
      );

      height: min(
        610px,
        calc(100vh - 110px)
      );

      display: none;
      flex-direction: column;

      overflow: hidden;

      border:
        1px solid
        rgba(255,255,255,.14);

      border-radius: 20px;

      background:
        linear-gradient(
          160deg,
          #202020,
          #161616
        );

      color: #ffffff;

      box-shadow:
        0 28px 80px
        rgba(0,0,0,.5);
    }


    #pickdeeSupportPanel.open {
      display: flex;
    }


    .pickdee-support-head {
      min-height: 70px;

      padding:
        14px 15px;

      display: flex;
      align-items: center;

      gap: 11px;

      border-bottom:
        1px solid
        rgba(255,255,255,.10);

      background:
        rgba(21,21,21,.88);
    }


    .pickdee-support-logo {
      width: 42px;
      height: 42px;

      flex: 0 0 auto;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 13px;

      background:
        rgba(255,201,52,.12);

      border:
        1px solid
        rgba(255,201,52,.30);

      font-size: 21px;
    }


    .pickdee-support-head-main {
      min-width: 0;
      flex: 1;
    }


    .pickdee-support-title {
      color: #ffffff;

      font-size: 15px;
      font-weight: 900;
    }


    .pickdee-support-subtitle {
      margin-top: 3px;

      color:
        rgba(255,255,255,.55);

      font-size: 11px;
      line-height: 1.35;
    }


    #pickdeeSupportClose {
      width: 38px;
      height: 38px;

      flex: 0 0 auto;

      display: flex;
      align-items: center;
      justify-content: center;

      border:
        1px solid
        rgba(255,255,255,.11);

      border-radius: 11px;

      background:
        rgba(255,255,255,.05);

      color: #ffffff;

      cursor: pointer;

      font-size: 19px;
    }


    #pickdeeSupportGuest {
      padding: 20px;

      display: none;

      overflow-y: auto;
    }


    .pickdee-support-intro {
      margin-bottom: 17px;

      color:
        rgba(255,255,255,.72);

      font-size: 13px;
      line-height: 1.55;
    }


    .pickdee-support-field {
      display: grid;
      gap: 7px;

      margin-bottom: 13px;
    }


    .pickdee-support-field label {
      color:
        rgba(255,255,255,.55);

      font-size: 11px;
      font-weight: 800;
    }


    .pickdee-support-field input {
      width: 100%;
      min-height: 46px;

      padding:
        0 12px;

      border:
        1px solid
        rgba(255,255,255,.15);

      border-radius: 11px;

      outline: none;

      background:
        rgba(255,255,255,.06);

      color: #ffffff;

      font-family: inherit;
      font-size: 14px;
    }


    .pickdee-support-field input:focus {
      border-color:
        rgba(255,201,52,.55);
    }


    #pickdeeSupportGuestStart {
      width: 100%;
      min-height: 48px;

      margin-top: 5px;

      border: 0;
      border-radius: 11px;

      background: #ffc934;
      color: #102300;

      cursor: pointer;

      font-family: inherit;
      font-size: 12px;
      font-weight: 900;
    }


    #pickdeeSupportChat {
      min-height: 0;
      flex: 1;

      display: none;
      flex-direction: column;
    }


    #pickdeeSupportMessages {
      min-height: 0;
      flex: 1;

      padding:
        17px 14px;

      overflow-y: auto;

      overscroll-behavior:
        contain;
    }


    .pickdee-support-welcome {
      margin:
        5px 0 16px;

      padding:
        13px 14px;

      border-radius: 13px;

      background:
        rgba(255,201,52,.07);

      border:
        1px solid
        rgba(255,201,52,.16);

      color:
        rgba(255,255,255,.72);

      font-size: 12px;
      line-height: 1.5;
    }


    .pickdee-support-message-row {
      display: flex;

      margin:
        0 0 11px;
    }


    .pickdee-support-message-row.user {
      justify-content:
        flex-end;
    }


    .pickdee-support-message-row.support {
      justify-content:
        flex-start;
    }


    .pickdee-support-message {
      max-width: 82%;

      padding:
        10px 12px;

      border-radius: 14px;

      font-size: 13px;
      line-height: 1.45;

      word-break:
        break-word;

      white-space:
        pre-wrap;
    }


    .pickdee-support-message-row.user
    .pickdee-support-message {
      background: #ffc934;
      color: #142300;

      border-bottom-right-radius:
        4px;
    }


    .pickdee-support-message-row.support
    .pickdee-support-message {
      background:
        rgba(255,255,255,.09);

      color: #ffffff;

      border:
        1px solid
        rgba(255,255,255,.08);

      border-bottom-left-radius:
        4px;
    }


    .pickdee-support-time {
      margin-top: 5px;

      opacity: .55;

      font-size: 9px;
      line-height: 1;
    }


    #pickdeeSupportComposer {
      padding:
        11px;

      display: flex;
      align-items: flex-end;

      gap: 8px;

      border-top:
        1px solid
        rgba(255,255,255,.09);

      background:
        rgba(14,14,14,.82);
    }


    #pickdeeSupportInput {
      min-width: 0;
      flex: 1;

      min-height: 44px;
      max-height: 105px;

      padding:
        11px 12px;

      resize: none;

      outline: none;

      border:
        1px solid
        rgba(255,255,255,.14);

      border-radius: 12px;

      background:
        rgba(255,255,255,.06);

      color: #ffffff;

      font-family: inherit;
      font-size: 13px;
      line-height: 1.4;
    }


    #pickdeeSupportInput:focus {
      border-color:
        rgba(255,201,52,.48);
    }


    #pickdeeSupportSend {
      width: 46px;
      height: 44px;

      flex: 0 0 auto;

      display: flex;
      align-items: center;
      justify-content: center;

      border: 0;
      border-radius: 12px;

      background: #ffc934;
      color: #102300;

      cursor: pointer;

      font-size: 18px;
      font-weight: 900;
    }


    #pickdeeSupportSend:disabled,
    #pickdeeSupportGuestStart:disabled {
      opacity: .45;
      cursor: not-allowed;
    }


    #pickdeeSupportError {
      display: none;

      padding:
        8px 13px;

      background:
        rgba(255,75,75,.10);

      border-top:
        1px solid
        rgba(255,100,100,.15);

      color: #ffb5b5;

      font-size: 11px;
      line-height: 1.4;
    }


    @media(max-width:700px) {

      #pickdeeSupportRoot {
        right: 12px;
        bottom:
          max(
            14px,
            env(safe-area-inset-bottom)
          );
      }


      #pickdeeSupportButton {
        min-width: 54px;
        height: 54px;

        padding:
          0 15px;
      }


      #pickdeeSupportButtonText {
        display: none;
      }


      #pickdeeSupportPanel {
        position: fixed;

        left: 10px;
        right: 10px;

        bottom:
          max(
            78px,
            calc(
              env(safe-area-inset-bottom)
              + 68px
            )
          );

        width: auto;

        height:
          min(
            620px,
            calc(
              100dvh
              - 100px
            )
          );
      }

    }
/* =====================================================
   MESSENGER STYLE - PICKDEE SUPPORT
===================================================== */

#pickdeeSupportPanel {
  width: min(
    360px,
    calc(100vw - 24px)
  );

  height: min(
    520px,
    calc(100vh - 105px)
  );

  bottom: 66px;

  border-radius: 18px;
}


.pickdee-support-head {
  min-height: 58px;

  padding: 9px 11px;

  gap: 9px;
}


.pickdee-support-logo {
  width: 36px;
  height: 36px;

  border-radius: 50%;

  font-size: 17px;
}


.pickdee-support-title {
  font-size: 14px;
}


.pickdee-support-subtitle {
  margin-top: 2px;

  font-size: 10px;
}


#pickdeeSupportClose {
  width: 34px;
  height: 34px;

  border-radius: 50%;

  font-size: 17px;
}


#pickdeeSupportMessages {
  padding: 12px 10px;
}


.pickdee-support-welcome {
  margin:
    2px 0 12px;

  padding:
    9px 11px;

  border-radius: 12px;

  font-size: 11px;
  line-height: 1.4;
}


.pickdee-support-message-row {
  margin-bottom: 7px;
}


.pickdee-support-message {
  width: fit-content;
  max-width: 78%;

  padding: 8px 10px;

  border-radius: 16px;

  font-size: 13px;
  line-height: 1.35;

  white-space: normal;
}


.pickdee-support-message-row.user
.pickdee-support-message {
  border-bottom-right-radius: 5px;
}


.pickdee-support-message-row.support
.pickdee-support-message {
  border-bottom-left-radius: 5px;
}


.pickdee-support-time {
  margin-top: 4px;

  font-size: 8px;
}


#pickdeeSupportComposer {
  padding: 8px;

  gap: 7px;
}


#pickdeeSupportInput {
  min-height: 40px;
  max-height: 88px;

  padding: 9px 11px;

  border-radius: 18px;

  font-size: 13px;
}


#pickdeeSupportSend {
  width: 40px;
  height: 40px;

  border-radius: 50%;

  font-size: 16px;
}


#pickdeeSupportButton {
  min-width: 52px;
  width: 52px;
  height: 52px;

  padding: 0;

  border-radius: 50%;
}


#pickdeeSupportButtonText {
  display: none;
}


#pickdeeSupportButtonIcon {
  font-size: 20px;
}


#pickdeeSupportGuest {
  padding: 16px;
}


@media(max-width:700px) {

  #pickdeeSupportPanel {
    left: 8px;
    right: 8px;

    bottom:
      max(
        72px,
        calc(
          env(safe-area-inset-bottom)
          + 62px
        )
      );

    width: auto;

    height:
      min(
        560px,
        calc(
          100dvh
          - 90px
        )
      );

    border-radius: 18px;
  }


  #pickdeeSupportRoot {
    right: 12px;
  }

}
  `;


  document.head.appendChild(
    style
  );


  /* =====================================================
     HTML
  ====================================================== */

  const root =
    document.createElement(
      "div"
    );


  root.id =
    "pickdeeSupportRoot";


  root.innerHTML = `

    <div id="pickdeeSupportPanel">

      <div class="pickdee-support-head">

        <div class="pickdee-support-logo">
          💬
        </div>

        <div class="pickdee-support-head-main">

          <div class="pickdee-support-title">
            Hỗ trợ PickDee
          </div>

          <div class="pickdee-support-subtitle">
            Nhắn trực tiếp cho PickDee khi bạn cần hỗ trợ
          </div>

        </div>

       <button
  id="pickdeeSupportClose"
  type="button"
  aria-label="Đóng hỗ trợ"
>
  ×
</button>

</div>


<!-- =====================================================
     LIÊN HỆ NHANH PICKDEE
====================================================== -->

<div
  id="pickdeeContactQuick"
  style="
    padding:10px 11px;
    display:grid;
    gap:8px;
    border-bottom:1px solid rgba(255,255,255,.10);
    background:rgba(255,255,255,.025);
  "
>

  <div
    style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    "
  >

    <div>

      <div
        style="
          color:#ffffff;
          font-size:11px;
          font-weight:900;
        "
      >
        Liên hệ PickDee
      </div>

      <div
        style="
          margin-top:3px;
          color:rgba(255,255,255,.55);
          font-size:10px;
          line-height:1.4;
        "
      >
        0926 629 966 · Điện thoại / Zalo
      </div>

    </div>

  </div>


  <div
    style="
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:7px;
    "
  >

    <a
      href="tel:0926629966"
      aria-label="Gọi PickDee"
      style="
        min-height:40px;
        padding:0 8px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);
        color:#ffffff;
        text-decoration:none;
        font-family:inherit;
        font-size:10px;
        font-weight:900;
        text-align:center;
      "
    >
      📞 GỌI
    </a>


    <a
      href="https://zalo.me/0926629966"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Liên hệ PickDee qua Zalo"
      style="
        min-height:40px;
        padding:0 8px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        border-radius:10px;
        border:1px solid rgba(255,201,52,.22);
        background:rgba(255,201,52,.08);
        color:#ffc934;
        text-decoration:none;
        font-family:inherit;
        font-size:10px;
        font-weight:900;
        text-align:center;
      "
    >
      💬 ZALO
    </a>


    <a
      href="https://www.facebook.com/nguyenquocnam268/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Liên hệ PickDee qua Facebook"
      style="
        min-height:40px;
        padding:0 8px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);
        color:#ffffff;
        text-decoration:none;
        font-family:inherit;
        font-size:10px;
        font-weight:900;
        text-align:center;
      "
    >
      🔵 FACEBOOK
    </a>

  </div>

</div>


<div id="pickdeeSupportBot"></div>


<div id="pickdeeSupportGuest">

        <div class="pickdee-support-intro">
          Anh/chị để lại tên và số điện thoại.
          Sau đó có thể nhắn trực tiếp với PickDee ngay tại đây.
        </div>

        <div class="pickdee-support-field">

          <label>
            Họ và tên
          </label>

          <input
            id="pickdeeSupportGuestName"
            type="text"
            maxlength="120"
            autocomplete="name"
            placeholder="Nhập họ và tên"
          >

        </div>

        <div class="pickdee-support-field">

          <label>
            Số điện thoại
          </label>

          <input
            id="pickdeeSupportGuestPhone"
            type="tel"
            maxlength="30"
            autocomplete="tel"
            placeholder="Nhập số điện thoại"
          >

        </div>

        <button
          id="pickdeeSupportGuestStart"
          type="button"
        >
          BẮT ĐẦU CHAT
        </button>

      </div>


      <div id="pickdeeSupportChat">

        <div id="pickdeeSupportMessages"></div>

        <div id="pickdeeSupportError"></div>

        <div id="pickdeeSupportComposer">

          <textarea
            id="pickdeeSupportInput"
            rows="1"
            maxlength="4000"
            placeholder="Nhập tin nhắn..."
          ></textarea>

          <button
            id="pickdeeSupportSend"
            type="button"
            aria-label="Gửi tin nhắn"
          >
            ➤
          </button>

        </div>

      </div>

    </div>


    <button
      id="pickdeeSupportButton"
      type="button"
      aria-label="Hỗ trợ PickDee"
    >

      <span id="pickdeeSupportButtonIcon">
        💬
      </span>

      <span id="pickdeeSupportButtonText">
        HỖ TRỢ
      </span>

      <span id="pickdeeSupportBadge">
        0
      </span>

    </button>

  `;


  document.body.appendChild(
    root
  );


  const panel =
    document.getElementById(
      "pickdeeSupportPanel"
    );


  const openBtn =
    document.getElementById(
      "pickdeeSupportButton"
    );


  const closeBtn =
    document.getElementById(
      "pickdeeSupportClose"
    );


  const guestBox =
    document.getElementById(
      "pickdeeSupportGuest"
    );


  const guestNameInput =
    document.getElementById(
      "pickdeeSupportGuestName"
    );


  const guestPhoneInput =
    document.getElementById(
      "pickdeeSupportGuestPhone"
    );


  const guestStartBtn =
    document.getElementById(
      "pickdeeSupportGuestStart"
    );


  const chatBox =
    document.getElementById(
      "pickdeeSupportChat"
    );


  const messagesBox =
    document.getElementById(
      "pickdeeSupportMessages"
    );


  const messageInput =
    document.getElementById(
      "pickdeeSupportInput"
    );


  const sendBtn =
    document.getElementById(
      "pickdeeSupportSend"
    );


  const badge =
    document.getElementById(
      "pickdeeSupportBadge"
    );


  /* =====================================================
     TRỢ LÝ PICKDEE (BOT) - trả lời trước cho khách mới
     Edge Function pickdee-bot: chỉ dùng dữ liệu thật + tự kiểm tra
     giá/link/SĐT. Không chắc → mời "Gặp nhân viên" (chat thật bên dưới).
  ====================================================== */

  const BOT_URL =
    cfg.SUPABASE_URL + "/functions/v1/pickdee-bot";
  const BOT_HISTORY = "pickdee_bot_history";
  const BOT_VID = "pickdee_bot_vid";
  const BOT_SEEN = "pickdee_bot_seen"; // câu PickDee trả lời đã hiện cho khách: { qid: answered_at }
  const BOT_WAIT_MS = 6 * 3600e3; // hiện "đang chờ PickDee" + hỏi câu trả lời tối đa 6 giờ
  // Kênh theo trang (khớp channelOf ở Edge pickdee-bot): Shop chỉ hỏi Shop, Academy chỉ hỏi Academy
  const BOT_CH = /^\/shop/.test(location.pathname) ? "shop"
    : /^\/(academy|coach|student|find-coach|apply-coach)/.test(location.pathname) ? "academy" : "all";
  // Lời chào + câu gợi ý theo đúng trang khách đang xem (tư vấn như nhân viên bán hàng)
  const BOT_PAGE = /^\/shop-product/.test(location.pathname) ? "product"
    : /^\/shop-(cart|checkout)/.test(location.pathname) ? "cart"
    : /^\/shop-(track|order-lookup|cancel-order)/.test(location.pathname) ? "order"
    : BOT_CH;
  function botEsc(t) {
    return String(t || "").replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; });
  }
  // Tên sản phẩm lấy từ tiêu đề trang ("<tên> | PickDee Shop", shop-product đặt sau khi tải xong)
  function botProductName() {
    const t = String(document.title || "").split("|")[0].trim();
    return BOT_PAGE === "product" && t && !/pickdee/i.test(t) ? t : "";
  }
  function botGreeting() {
    const name = botProductName();
    return {
      product: name
        ? "Dạ chào anh/chị 👋 Anh/chị đang xem <b>" + botEsc(name) + "</b> ạ. Để em tư vấn loại/màu hợp với mình, kèm phí ship và ngày nhận hàng luôn nhé."
        : "Dạ chào anh/chị 👋 Anh/chị cần tư vấn mẫu nào không ạ? Nói nhu cầu, em gợi ý liền.",
      cart: "Chào anh/chị 👋 Anh/chị cần hỏi gì về phí ship, thanh toán hay thời gian giao không ạ? Đặt hàng không cần tạo tài khoản đâu nhé.",
      order: "Chào anh/chị 👋 Anh/chị cho em xin mã đơn với số điện thoại, em tra giúp ạ.",
      shop: "Chào anh/chị 👋 Hôm nay anh/chị tìm vợt hay phụ kiện gì ạ? Chọn bên dưới, em gợi ý ngay.",
      academy: /^\/find-coach/.test(location.pathname)
        ? "Chào anh/chị 👋 Anh/chị đang tìm Coach khu vực nào ạ? Cho em biết trình độ, em gợi ý Coach phù hợp."
        : "Chào anh/chị 👋 Anh/chị muốn học Pickleball hay muốn làm Coach cho PickDee ạ? Em tư vấn đúng phần của mình.",
      all: /^\/add-my-court/.test(location.pathname)
        ? "Chào anh/chị 👋 Anh/chị đang đưa sân lên PickDee ạ. Cần hỗ trợ điền thông tin gì không, em giúp luôn."
        : /^\/court-claim/.test(location.pathname)
        ? "Chào anh/chị 👋 Anh/chị muốn xác minh mình là chủ sân ạ? Em giải thích quy trình ngay."
        : "Chào anh/chị 👋 Anh/chị cần tìm khoá học, Coach, muốn làm Coach, hay đưa sân lên PickDee ạ? Em giúp luôn."
    }[BOT_PAGE];
  }
  const BOT_SUGGEST = {
    product: ["Mẫu này hợp với tôi không?", "Có những loại/màu nào?", "Phí ship bao nhiêu?", "Bao lâu nhận hàng?"],
    cart: ["Phí ship thế nào?", "Thanh toán thế nào?", "Bao lâu nhận hàng?", "Bảo hành vợt?"],
    order: ["Tra cứu đơn hàng", "Bao lâu nhận hàng?", "Bảo hành vợt?"],
    shop: ["Tư vấn vợt cho người mới", "Vợt cho người chơi lâu năm", "Phí ship thế nào?", "Tra cứu đơn hàng"],
    academy: /^\/find-coach/.test(location.pathname)
      ? ["Tìm Coach 1 kèm 1 gần tôi", "Học nhóm 2 người được không?", "Học phí 1 buổi học?", "Đặt lịch học thử thế nào?"]
      : ["Người mới nên học gói nào?", "Học phí các gói học?", "Học nhóm 2 người như thế nào?", "Muốn làm Coach PickDee thì sao?"],
    all: /^\/add-my-court/.test(location.pathname)
      ? ["Đưa sân lên có mất phí không?", "Cần điền những thông tin gì?", "Bao lâu thì sân được duyệt?"]
      : /^\/court-claim/.test(location.pathname)
      ? ["Xác minh chủ sân cần giấy tờ gì?", "Bao lâu thì được xác nhận?", "Sân chưa có trên PickDee thì sao?"]
      : ["Tư vấn khoá học Pickleball cho tôi", "Tìm Coach gần tôi", "Muốn làm Coach PickDee thì sao?", "Tôi muốn đưa sân lên PickDee"]
  }[BOT_PAGE];

  /* =====================================================
     TƯ VẤN BÁN HÀNG THEO HÀNH TRÌNH KHÁCH (Shop, 20/10)
     Khách bấm chọn, không cần gõ: nhu cầu → 1–2 câu hỏi ngắn → gợi ý sản phẩm thật
     (ảnh, giá, lý do) → mua kèm → chính sách → đặt hàng. Giá/ảnh/hết hàng lấy thẳng từ DB,
     không qua AI. Gõ câu hỏi bất kỳ lúc nào → trợ lý AI như cũ (lựa chọn của khách nằm trong lịch sử).
     Chính sách khớp bot_knowledge: Phí giao hàng · Thanh toán · Thời gian giao hàng · Bảo hành vợt · Kiểm hàng.
  ====================================================== */
  const PDJ = BOT_CH === "shop";
  const PDJ_CART = "pickdee_shop_cart";
  let pdjCat = null, pdjCatP = null;

  function pdjVnd(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  }
  function pdjPrice(p) {
    return p.min === p.max ? pdjVnd(p.min) : "từ " + pdjVnd(p.min);
  }

  function pdjLoad() {
    if (pdjCat) return Promise.resolve(pdjCat);
    if (pdjCatP) return pdjCatP;
    pdjCatP = Promise.all([
      sb.from("shop_categories").select("id,name").eq("is_active", true),
      sb.from("shop_products").select("id,category_id,name,short_description,is_featured,sort_order").eq("status", "active").order("sort_order", { ascending: true }),
      sb.from("shop_product_variants").select("id,product_id,variant_name,price,is_sold_out,sort_order").eq("is_active", true),
      sb.from("shop_product_images").select("product_id,storage_path,is_primary,sort_order").order("sort_order", { ascending: true })
    ]).then(function (r) {
      if (r.some(function (x) { return x.error; })) throw new Error("catalog");
      const cats = {}, vs = {}, imgs = {};
      r[0].data.forEach(function (c) { cats[c.id] = c.name; });
      r[2].data.forEach(function (v) { (vs[v.product_id] = vs[v.product_id] || []).push(v); });
      r[3].data.forEach(function (i) {
        const cur = imgs[i.product_id];
        if (i.storage_path && (!cur || (i.is_primary && !cur.is_primary))) imgs[i.product_id] = i;
      });
      pdjCat = r[1].data.map(function (p) {
        const all = (vs[p.id] || []).sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
        const avail = all.filter(function (v) { return !v.is_sold_out && Number(v.price) > 0; });
        const prices = avail.map(function (v) { return Number(v.price); });
        const img = imgs[p.id] ? sb.storage.from("shop-products").getPublicUrl(imgs[p.id].storage_path).data.publicUrl : "";
        return {
          id: p.id, name: String(p.name || "").trim(), lname: String(p.name || "").toLowerCase(),
          cat: cats[p.category_id] || "", desc: String(p.short_description || "").trim(),
          featured: !!p.is_featured, variants: all, avail: avail,
          min: Math.min.apply(null, prices), max: Math.max.apply(null, prices), img: img
        };
      }).filter(function (p) { return p.avail.length; });
      return pdjCat;
    });
    pdjCatP.catch(function () { pdjCatP = null; });
    return pdjCatP;
  }

  // Nhóm sản phẩm theo tên (thêm sản phẩm mới đặt tên đúng là tự vào đúng nhóm)
  const PDJ_T = {
    paddle: function (p) { return /^vợt/.test(p.lname); },
    ball: function (p) { return /^bóng/.test(p.lname); },
    grip: function (p) { return /quấn cán|cốt cán/.test(p.lname); },
    wrap: function (p) { return /quấn cán/.test(p.lname); },
    sweat: function (p) { return /phấn|mồ hôi/.test(p.lname); },
    joint: function (p) { return /gối|khuỷu|khớp/.test(p.lname); },
    warm: function (p) { return /xịt nóng|khởi động/.test(p.lname); },
    cool: function (p) { return /xịt lạnh|giảm đau/.test(p.lname); },
    energy: function (p) { return /điện giải|năng lượng/.test(p.lname); },
    care: function (p) { return /bọc bảo vệ|dán viền|làm sạch mặt vợt|chì độ/.test(p.lname); },
    cover: function (p) { return /bọc bảo vệ mặt vợt/.test(p.lname); },
    bag: function (p) { return /^túi/.test(p.lname); }
  };
  function pdjPick(cat, t) { return cat.filter(PDJ_T[t]); }

  // Lý do ngắn: câu đầu mô tả (hoặc câu có "Tặng") – chỉ dùng chữ có sẵn trong DB
  function pdjWhy(p) {
    const parts = p.desc.replace(/([.!])\s+/g, "$1\n").split("\n").filter(Boolean);
    const gift = parts.find(function (s) { return /tặng/i.test(s); });
    const s = gift || parts[0] || "";
    return s.length > 96 ? s.slice(0, 94).trim() + "…" : s;
  }

  function pdjCard(p, why, star) {
    return {
      id: p.id, name: p.name, price: pdjPrice(p), img: p.img,
      why: why || pdjWhy(p), star: !!star,
      // 1 lựa chọn → thêm thẳng vào giỏ; nhiều màu/loại → mở trang sản phẩm để chọn
      quick: p.avail.length === 1 && p.variants.length === 1
    };
  }

  // Icon quả bóng pickleball (vàng chanh, có lỗ) — không có emoji tương ứng
  const PDJ_BALL = '<svg class="pdj-ball" viewBox="0 0 24 24" width="1.15em" height="1.15em" aria-hidden="true" style="vertical-align:-0.22em;margin-right:5px"><defs><radialGradient id="pdjBallG" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ffdc7a"/><stop offset=".6" stop-color="#e8b52a"/><stop offset="1" stop-color="#bb8e12"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="url(#pdjBallG)" stroke="#7f9a0c" stroke-width=".6"/><g fill="#3f4f06" fill-opacity=".85"><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="6.2" r="1.5"/><circle cx="12" cy="17.8" r="1.5"/><circle cx="6.9" cy="9.1" r="1.45"/><circle cx="17.1" cy="9.1" r="1.45"/><circle cx="6.9" cy="14.9" r="1.45"/><circle cx="17.1" cy="14.9" r="1.45"/><ellipse cx="3.1" cy="12" rx=".6" ry="1.1"/><ellipse cx="20.9" cy="12" rx=".6" ry="1.1"/><ellipse cx="12" cy="2.6" rx="1.1" ry=".55"/><ellipse cx="12" cy="21.4" rx="1.1" ry=".55"/></g></svg>';
  const pdjChipHtml = function (label, act) { return (act === "ball" ? PDJ_BALL : "") + botEsc(label); };
  const PDJ_HOME = [
    ["🏓 Chọn vợt", "paddle"], ["Bóng", "ball"], ["✋ Quấn cán, chống trơn", "grip"],
    ["🦵 Bảo hộ & phục hồi", "body"], ["🛡️ Phụ kiện cho vợt", "care"], ["🎁 Mua làm quà", "gift"],
    ["📦 Tra cứu đơn hàng", "lookup"]
  ];
  const PDJ_CLOSE = [["🛒 Đặt hàng ngay", "checkout"], ["🚚 Giao hàng & thanh toán", "policy"], ["💬 Hỏi thêm", "ask"]];

  function pdjCartItems() {
    try {
      const c = JSON.parse(localStorage.getItem(PDJ_CART) || "[]");
      return Array.isArray(c) ? c.filter(Boolean) : [];
    } catch (_) { return []; }
  }

  const PDJ_LV = { new: "mới chơi", mid: "đã chơi dưới 1 năm", pro: "chơi lâu năm / thi đấu" };
  const PDJ_ST = { control: "thích kiểm soát, đánh chắc", attack: "thích tấn công, tầm với xa", any: "chưa rõ lối đánh" };

  // Trả về { text (cho AI), html (hiển thị), cards, chips } của 1 bước
  function pdjNode(act, cat) {
    const a = act.split(":");
    const none = { html: "Mục này hiện tạm hết hàng ạ. Anh/chị xem nhóm khác, hoặc nhắn em nhu cầu cụ thể nhé.", chips: PDJ_HOME };

    if (act === "home") return { html: "Anh/chị đang tìm gì hôm nay ạ? Chọn bên dưới, em gợi ý đúng sản phẩm trong 30 giây.", chips: PDJ_HOME };

    if (a[0] === "paddle") {
      const pads = pdjPick(cat, "paddle");
      if (!pads.length) return none;
      if (!a[1]) return { html: "Anh/chị chơi Pickleball được bao lâu rồi ạ?", chips: [["🌱 Mới bắt đầu", "paddle:new"], ["📈 Dưới 1 năm", "paddle:mid"], ["🏆 Lâu năm / thi đấu", "paddle:pro"]] };
      if (!a[2]) return { html: "Anh/chị thích lối đánh nào hơn ạ?", chips: [["🎯 Kiểm soát, đánh chắc", "paddle:" + a[1] + ":control"], ["💥 Tấn công, tầm với xa", "paddle:" + a[1] + ":attack"], ["🤔 Chưa rõ, em gợi ý giúp", "paddle:" + a[1] + ":any"]] };
      // Nhiều vợt khác giá → hỏi ngân sách
      const prices = pads.map(function (p) { return p.min; });
      const spread = pads.length > 1 && Math.max.apply(null, prices) > Math.min.apply(null, prices);
      const B = [["Dưới 1.500.000đ", 0, 1500000], ["1.500.000đ – 3.000.000đ", 1500000, 3000000], ["Trên 3.000.000đ", 3000000, 1e12]];
      if (spread && !a[3]) {
        const opts = B.filter(function (b) { return pads.some(function (p) { return p.min >= b[1] && p.min < b[2]; }); });
        if (opts.length > 1) return { html: "Ngân sách cho vợt của anh/chị khoảng bao nhiêu ạ?", chips: opts.map(function (b) { return ["💰 " + b[0], "paddle:" + a[1] + ":" + a[2] + ":" + b[1]]; }) };
      }
      let list = pads.slice();
      if (a[3]) {
        const b = B.find(function (x) { return String(x[1]) === a[3]; });
        const inB = b ? list.filter(function (p) { return p.min >= b[1] && p.min < b[2]; }) : [];
        if (inB.length) list = inB;
      }
      list.sort(function (x, y) { return (y.featured - x.featured) || (x.min - y.min); });
      list = list.slice(0, 2);
      // Dáng vợt (kiến thức chung về dáng, không phải thông số riêng của mẫu)
      const shapes = list[0].variants.map(function (v) { return String(v.variant_name || "").toLowerCase(); }).join(" ");
      const wantLong = a[2] === "attack" || (a[2] === "any" && a[1] === "pro");
      let shape = "";
      if (/elongate/.test(shapes) && /hybrid/.test(shapes)) {
        shape = wantLong
          ? "Nên chọn dáng <b>Elongate</b> (đầu dài): tầm với xa, lực đánh mạnh, hợp lối tấn công; điểm ngọt nhỏ hơn nên cần cú đánh ổn định."
          : "Nên chọn dáng <b>Hybrid</b>: cân bằng giữa tầm với và điểm ngọt, dễ làm quen, đánh chắc tay" + (a[1] === "new" ? " – hợp nhất cho người mới." : ".");
      }
      const who = PDJ_LV[a[1]] + ", " + PDJ_ST[a[2]];
      const cards = list.map(function (p, i) { return pdjCard(p, "", i === 0); });
      return {
        text: "Em gợi ý cho người " + who + ": " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; ") + (shape ? ". " + shape.replace(/<[^>]+>/g, "") : ""),
        html: "Với người <b>" + botEsc(who) + "</b>, em gợi ý:",
        cards: cards,
        after: (shape ? shape + "<br>" : "") + "Vợt được <b>đồng kiểm</b> khi nhận và <b>bảo hành 3 tháng</b> lỗi nhà sản xuất.",
        chips: [["🎨 Chọn màu & đặt vợt", "href:/shop-product?id=" + list[0].id], ["➕ Phụ kiện nên mua kèm", "addons"]].concat(PDJ_CLOSE.slice(1))
      };
    }

    if (act === "addons") {
      const ball = pdjPick(cat, "ball").sort(function (x, y) { return (/thi đấu|ppa/.test(y.lname) - /thi đấu|ppa/.test(x.lname)) || (y.min - x.min); })[0];
      const picks = [[pdjPick(cat, "wrap")[0], "Quấn cán mới giúp cầm chắc tay, không trơn khi ra mồ hôi."], [ball, ""], pdjPick(cat, "cover")[0] ? [pdjPick(cat, "cover")[0], "Che mặt vợt khi mang đi, đỡ trầy xước."] : [pdjPick(cat, "care")[0], ""]]
        .filter(function (x) { return x[0]; });
      if (!picks.length) return none;
      return {
        text: "Phụ kiện mua kèm: " + picks.map(function (x) { return x[0].name + " " + pdjPrice(x[0]); }).join("; "),
        html: "Người chơi thường mua kèm vợt mấy món này ạ:",
        cards: picks.map(function (x) { return pdjCard(x[0], x[1]); }),
        chips: PDJ_CLOSE
      };
    }

    if (a[0] === "ball") {
      const balls = pdjPick(cat, "ball");
      if (!balls.length) return none;
      if (!a[1]) return { html: "Anh/chị cần bóng để làm gì ạ?", chips: [["🏆 Thi đấu, giao lưu", "ball:match"], ["🏃 Tập luyện, tiết kiệm", "ball:train"]] };
      const pro = function (p) { return /thi đấu|ppa/.test(p.lname) ? 1 : 0; };
      balls.sort(a[1] === "match"
        ? function (x, y) { return (pro(y) - pro(x)) || (y.min - x.min); }
        : function (x, y) { return x.min - y.min; });
      const list = balls.slice(0, 3);
      const bag = pdjPick(cat, "bag")[0];
      return {
        text: "Bóng " + (a[1] === "match" ? "thi đấu" : "tập luyện") + ": " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "),
        html: a[1] === "match" ? "Bóng cho thi đấu, giao lưu – em xếp mẫu phù hợp nhất lên đầu:" : "Bóng tập luyện – em xếp giá tốt nhất lên đầu:",
        cards: list.map(function (p, i) { return pdjCard(p, "", i === 0); }),
        chips: [["📦 Mua nhiều có giá tốt hơn không?", "ask:Mua nhiều bóng có giá tốt hơn không?"]].concat(bag ? [["👜 Túi đựng bóng", "bag"]] : []).concat(PDJ_CLOSE.slice(0, 2))
      };
    }

    if (act === "bag") {
      const list = pdjPick(cat, "bag").slice(0, 3);
      if (!list.length) return none;
      return { text: "Túi: " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "), html: "Túi đựng gọn, mang ra sân tiện ạ:", cards: list.map(function (p) { return pdjCard(p); }), chips: PDJ_CLOSE };
    }

    if (a[0] === "grip") {
      if (!pdjPick(cat, "grip").length) return none;
      if (!a[1]) return { html: "Tay anh/chị có hay ra mồ hôi, trơn tay khi chơi không ạ?", chips: [["💧 Có, hay trơn tay", "grip:sweat"], ["👌 Bình thường", "grip:normal"]] };
      const list = a[1] === "sweat"
        ? pdjPick(cat, "wrap").slice(0, 1).concat(pdjPick(cat, "sweat").slice(0, 2))
        : pdjPick(cat, "grip").slice(0, 3);
      return {
        text: "Gợi ý cầm vợt chắc tay: " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "),
        html: a[1] === "sweat" ? "Hay trơn tay thì nên thay quấn cán mới và dùng thêm đồ chống trơn ạ:" : "Quấn cán nên thay khi bị mòn, trơn để luôn cầm chắc tay ạ:",
        cards: list.map(function (p) { return pdjCard(p); }),
        chips: PDJ_CLOSE
      };
    }

    if (a[0] === "body") {
      const opts = [["🦵 Bảo vệ khớp gối, khuỷu tay", "joint"], ["🔥 Khởi động trước khi chơi", "warm"], ["❄️ Giảm đau sau khi chơi", "cool"], ["⚡ Bù điện giải, năng lượng", "energy"]]
        .filter(function (o) { return pdjPick(cat, o[1]).length; });
      if (!opts.length) return none;
      if (!a[1]) return { html: "Anh/chị cần hỗ trợ gì ạ?", chips: opts.map(function (o) { return [o[0], "body:" + o[1]]; }) };
      const list = pdjPick(cat, a[1]).slice(0, 3);
      if (!list.length) return none;
      return {
        text: "Gợi ý bảo hộ/phục hồi: " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "),
        html: "Em gợi ý ạ:",
        cards: list.map(function (p) { return pdjCard(p); }),
        chips: PDJ_CLOSE
      };
    }

    if (act === "care") {
      const list = pdjPick(cat, "care").slice(0, 4);
      if (!list.length) return none;
      return {
        text: "Phụ kiện cho vợt: " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "),
        html: "Phụ kiện giữ vợt bền, đẹp và tuỳ chỉnh độ nặng ạ:",
        cards: list.map(function (p) { return pdjCard(p); }),
        chips: PDJ_CLOSE
      };
    }

    if (a[0] === "gift") {
      const G = [["Dưới 200.000đ", 0, 200000], ["200.000đ – 500.000đ", 200000, 500000], ["Trên 500.000đ", 500000, 1e12]];
      const opts = G.filter(function (g) { return cat.some(function (p) { return p.min >= g[1] && p.min < g[2]; }); });
      if (!a[1]) return { html: "Ngân sách cho món quà khoảng bao nhiêu ạ?", chips: opts.map(function (g) { return ["💰 " + g[0], "gift:" + g[1]]; }) };
      const g = G.find(function (x) { return String(x[1]) === a[1]; }) || G[0];
      const list = cat.filter(function (p) { return p.min >= g[1] && p.min < g[2]; })
        .sort(function (x, y) { return (y.featured - x.featured) || (PDJ_T.paddle(y) - PDJ_T.paddle(x)) || (y.min - x.min); }).slice(0, 4);
      if (!list.length) return none;
      return {
        text: "Gợi ý quà " + g[0] + ": " + list.map(function (p) { return p.name + " " + pdjPrice(p); }).join("; "),
        html: "Quà cho người chơi Pickleball, ngân sách <b>" + g[0] + "</b>:",
        cards: list.map(function (p) { return pdjCard(p); }),
        chips: PDJ_CLOSE
      };
    }

    if (act === "policy") return {
      text: "Chính sách mua hàng: không cần tài khoản; Hà Nội 1–2 ngày, tỉnh 2–3 ngày; đơn dưới 300.000đ phí ship 15.000đ, từ 300.000đ không có bóng freeship; chuyển khoản QR hoặc COD (đơn có vợt chuyển khoản trước); vợt đồng kiểm, bảo hành 3 tháng lỗi nhà sản xuất.",
      html: "Anh/chị yên tâm đặt hàng tại PickDee ạ:<br>" +
        "✓ Đặt hàng <b>không cần tạo tài khoản</b><br>" +
        "✓ Giao toàn quốc qua SPX: Hà Nội khoảng 1–2 ngày, tỉnh khác 2–3 ngày<br>" +
        "✓ Đơn dưới 300.000đ phí ship 15.000đ; đơn từ 300.000đ và không có bóng được <b>freeship</b><br>" +
        "✓ Thanh toán chuyển khoản QR hoặc COD (đơn có vợt chuyển khoản trước)<br>" +
        "✓ Đơn vợt được <b>đồng kiểm</b> khi nhận; vợt bảo hành 3 tháng lỗi nhà sản xuất",
      chips: [["🛒 Đặt hàng ngay", "checkout"], ["📞 Gọi 0926 629 966", "href:tel:0926629966"], ["💬 Zalo tư vấn", "href:https://zalo.me/0926629966"]]
    };

    if (act === "checkout") {
      const items = pdjCartItems();
      if (!items.length) return { html: "Giỏ hàng của anh/chị đang trống ạ. Anh/chị chọn sản phẩm trước, em gợi ý nhé:", chips: PDJ_HOME };
      // Giỏ chỉ có đúng 1 sản phẩm (vừa thêm từ chat) → bỏ bước xem giỏ, vào thẳng thanh toán
      return { go: items.length === 1 ? "/shop-checkout" : "/shop-cart" };
    }

    if (act === "lookup") return {
      text: "Tra cứu đơn tại https://pickdee.vn/shop-order-lookup bằng mã đơn + số điện thoại.",
      html: "Anh/chị tra cứu đơn bằng <b>mã đơn + số điện thoại</b> đặt hàng ạ.",
      chips: [["🔎 Mở trang tra cứu đơn", "href:/shop-order-lookup"], ["💬 Hỏi thêm", "ask"]]
    };
    return null;
  }

  // Khách bấm 1 lựa chọn: ghi câu khách + câu trả lời vào lịch sử (AI đọc được), vẽ lại
  async function pdjStep(act, label) {
    if (botBusy) return;
    if (act.indexOf("href:") === 0) { location.href = act.slice(5); return; }
    if (act.indexOf("ask") === 0) {
      const q = act.slice(4);
      if (q) { botAsk(q); return; }
      botInput.placeholder = "Anh/chị hỏi gì, em trả lời ngay…";
      botInput.focus();
      return;
    }
    const h = botHistory();
    if (label) h.push({ role: "user", text: label.replace(/^[^\wÀ-ỹ]+/, "").trim() });
    botSave(h);
    renderBot(true);
    let n = null;
    try { n = pdjNode(act, await pdjLoad()); } catch (e) { console.warn("PickDee tư vấn:", e); }
    if (n && n.go) { location.href = n.go; return; }
    if (!n) n = { html: "Em chưa tải được danh sách sản phẩm. Anh/chị thử lại, hoặc gọi/Zalo 0926 629 966 nhé.", chips: [["🔄 Thử lại", act]] };
    botSave(botHistory().concat([{
      role: "bot", t: Date.now(), pdj: 1,
      text: n.text || String(n.html || "").replace(/<br>/g, "\n").replace(/<[^>]+>/g, ""),
      html: n.html, after: n.after || "", cards: n.cards || null, chips: n.chips || null
    }]));
    renderBot(false);
  }

  async function pdjAdd(pid, btn) {
    let p = null;
    try { p = (await pdjLoad()).find(function (x) { return x.id === Number(pid); }); } catch (_) {}
    if (!p || p.avail.length !== 1 || p.variants.length !== 1) { location.href = "/shop-product?id=" + encodeURIComponent(pid); return; }
    const v = p.avail[0];
    const cart = pdjCartItems();
    const ex = cart.find(function (i) { return String(i.variant_id) === String(v.id); });
    if (ex) {
      ex.quantity = Number(ex.quantity || 0) + 1;
      ex.price = ex.retail_price = Number(v.price);
      ex.image_url = ex.image_url || p.img;
    } else {
      cart.push({ product_id: p.id, variant_id: v.id, product_name: p.name, variant_name: v.variant_name || "", price: Number(v.price), retail_price: Number(v.price), quantity: 1, image_url: p.img });
    }
    try { localStorage.setItem(PDJ_CART, JSON.stringify(cart)); } catch (_) { location.href = "/shop-product?id=" + p.id; return; }
    // Trang đang mở cập nhật số trên biểu tượng giỏ
    try { window.dispatchEvent(new StorageEvent("storage", { key: PDJ_CART })); } catch (_) {}
    try { window.PickDeeShopNav && window.PickDeeShopNav.refreshCartCount(); } catch (_) {}
    if (btn) { btn.textContent = "✓ Đã thêm"; btn.disabled = true; }
    const qty = cart.reduce(function (s, i) { return s + (Number(i.quantity) || 0); }, 0);
    botSave(botHistory().concat([{
      role: "bot", t: Date.now(), pdj: 1,
      text: "Đã thêm " + p.name + " vào giỏ (giỏ có " + qty + " sản phẩm).",
      html: "✓ Đã thêm <b>" + botEsc(p.name) + "</b> vào giỏ (giỏ có " + qty + " sản phẩm). Đặt hàng không cần tạo tài khoản ạ.",
      chips: [["🛒 Đặt hàng ngay", "checkout"], ["➕ Xem thêm phụ kiện", "home"], ["🚚 Giao hàng & thanh toán", "policy"]]
    }]));
    renderBot(false);
  }

  function pdjCardsEl(cards) {
    const box = document.createElement("div");
    box.className = "pdj-cards";
    box.innerHTML = cards.map(function (c) {
      const link = "/shop-product?id=" + encodeURIComponent(c.id);
      return '<div class="pdj-card' + (c.star ? " pdj-star" : "") + '">' +
        '<a class="pdj-main" href="' + link + '">' +
        (c.img ? '<img src="' + botEsc(c.img) + '" alt="" loading="lazy">' : '<span class="pdj-noimg">🏓</span>') +
        '<span class="pdj-info">' + (c.star ? '<span class="pdj-tag">⭐ Em gợi ý</span>' : "") +
        '<b>' + botEsc(c.name) + '</b><span class="pdj-pr">' + botEsc(c.price) + "</span>" +
        (c.why ? "<small>" + botEsc(c.why) + "</small>" : "") + "</span></a>" +
        (c.quick
          ? '<button type="button" class="pdj-buy" data-pdj-add="' + c.id + '">＋ Thêm vào giỏ</button>'
          : '<a class="pdj-buy" href="' + link + '">Chọn mẫu ›</a>') +
        "</div>";
    }).join("");
    return box;
  }

  function pdjChipsEl(chips) {
    const box = document.createElement("div");
    box.className = "pd-bot-chips";
    chips.forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pd-bot-chip";
      b.innerHTML = pdjChipHtml(c[0], c[1]);
      b.addEventListener("click", function () { pdjStep(c[1], c[0]); });
      box.appendChild(b);
    });
    return box;
  }

  const botBox = document.getElementById("pickdeeSupportBot");
  let botBusy = false;
  let botLastQuestion = "";
  // Chỉ vào chat nhân viên khi khách bấm nút (bot không trả lời được / có trả lời của PickDee). Đóng khung → lần sau lại là trợ lý.
  let botForceHuman = false;
  let botUnread = 0;

  (function botStyle() {
    const st = document.createElement("style");
    st.textContent = `
      #pickdeeSupportBot{min-height:0;flex:1;display:none;flex-direction:column}
      #pdBotMsgs{min-height:0;flex:1;padding:15px 14px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;transform:translateZ(0)}
      #pdBotMsgs a{color:#ffc934;font-weight:800;word-break:break-all}
      .pd-bot-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 12px}
      .pd-bot-chip{padding:8px 11px;border-radius:999px;border:1px solid rgba(255,201,52,.3);background:rgba(255,201,52,.07);color:#ffc934;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .pd-bot-typing{opacity:.6;font-style:italic}
      #pdBotMsgs{position:relative}
      .pdj-cards{display:flex;flex-direction:column;gap:7px;margin:-2px 0 10px}
      .pdj-card{display:flex;align-items:center;gap:8px;padding:7px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05)}
      .pdj-card.pdj-star{border-color:rgba(255,201,52,.5);background:rgba(255,201,52,.07)}
      #pdBotMsgs .pdj-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1;color:#fff;font-weight:400;text-decoration:none;word-break:normal}
      .pdj-main img,.pdj-noimg{flex:0 0 54px;width:54px;height:54px;border-radius:10px;object-fit:cover;background:#fff}
      .pdj-noimg{display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.08)}
      .pdj-info{display:flex;flex-direction:column;gap:2px;min-width:0}
      .pdj-info b{font-size:13px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .pdj-pr{color:#ffc934;font-weight:900;font-size:13px}
      .pdj-info small{font-size:11.5px;line-height:1.35;color:rgba(255,255,255,.66);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .pdj-tag{font-size:10.5px;font-weight:900;color:#ffc934}
      #pdBotMsgs .pdj-buy{flex:0 0 auto;min-height:36px;padding:0 11px;display:inline-flex;align-items:center;border-radius:999px;border:0;background:#ffc934;color:#142300;font:inherit;font-size:12px;font-weight:900;white-space:nowrap;text-decoration:none;word-break:normal;cursor:pointer}
      #pdBotMsgs a.pdj-buy{background:transparent;color:#ffc934;border:1px solid rgba(255,201,52,.45)}
      #pdBotMsgs .pdj-buy:disabled{opacity:.75}
      .pd-bot-wait{margin:-4px 0 10px 4px;font-size:12px;font-weight:800;color:#ffc934;opacity:.85}
      .pd-bot-owner{border:1px solid rgba(255,201,52,.45)!important}
      #pickdeeSupportButton.pd-bot-new::after{content:"";position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#ff3b30;border:2px solid #fff}
      /* Nút "Gặp nhân viên" nằm trên thanh tiêu đề (cạnh nút ×), chỉ hiện khi đang ở trợ lý */
      #pdBotHuman{flex:0 0 auto;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,201,52,.35);background:rgba(255,201,52,.08);color:#ffc934;font:inherit;font-size:12px;font-weight:900;white-space:nowrap;cursor:pointer}
      #pickdeeSupportPanel:not(.pd-bot-mode) #pdBotHuman,#pdBotHuman:not(.pd-show){display:none}
      #pdBotHuman.pd-hot{background:#ffc934;color:#142300;border-color:#ffc934}
      #pdBotComposer{padding:11px;display:flex;align-items:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,.09);background:rgba(14,14,14,.82)}
      #pdBotInput{min-width:0;flex:1;min-height:44px;max-height:105px;padding:11px 12px;resize:none;outline:none;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-size:16px;line-height:1.4}
      #pdBotInput:focus{border-color:rgba(255,201,52,.48)}
      #pdBotSend{flex:0 0 44px;height:44px;border:0;border-radius:12px;background:#ffc934;color:#142300;font-size:18px;font-weight:900;cursor:pointer}
      #pdBotSend:disabled{opacity:.5}
      /* Điện thoại: mọi chế độ (trợ lý, form nhân viên, chat nhân viên) là ngăn kéo gọn từ dưới lên,
         tối đa 50% màn hình, nút tròn ẩn khi đang mở, bàn phím bật thì bám ngay trên bàn phím */
      @media(max-width:700px){
        #pickdeeSupportRoot:has(#pickdeeSupportPanel.open) #pickdeeSupportButton{display:none}
        #pickdeeSupportPanel.open{left:6px;right:6px;bottom:calc(var(--pd-kb,0px) + max(8px,env(safe-area-inset-bottom)));height:auto;max-height:min(50dvh,calc(var(--pd-vvh,100dvh) - 16px));border-radius:18px}
        #pickdeeSupportPanel.open.pd-kb{max-height:calc(var(--pd-vvh,100dvh) - 16px)}
        #pickdeeSupportPanel.pd-kb #pickdeeContactQuick,#pickdeeSupportPanel.pd-kb .pd-bot-chips{display:none!important}
        #pickdeeSupportPanel .pickdee-support-head{min-height:46px;padding:7px 10px;gap:8px}
        #pickdeeSupportPanel .pickdee-support-logo{width:30px;height:30px;font-size:14px}
        #pickdeeSupportPanel .pickdee-support-title{font-size:15px}
        #pickdeeSupportPanel .pickdee-support-subtitle{display:none}
        #pickdeeSupportPanel #pickdeeContactQuick{padding:6px 10px!important;gap:0!important}
        #pickdeeSupportPanel #pickdeeContactQuick>div:first-child{display:none!important}
        #pickdeeSupportPanel #pickdeeContactQuick a{min-height:32px!important;font-size:11px!important}
        /* Trợ lý: cao theo nội dung */
        #pickdeeSupportPanel.pd-bot-mode #pickdeeSupportBot{flex:0 1 auto}
        #pickdeeSupportPanel.pd-bot-mode #pdBotMsgs{flex:0 1 auto;padding:10px 12px}
        #pickdeeSupportPanel.pd-bot-mode .pd-bot-chips{margin:0 0 6px;gap:5px}
        #pickdeeSupportPanel.pd-bot-mode .pd-bot-chip{padding:6px 10px;font-size:12px}
        #pickdeeSupportPanel.pd-bot-mode #pdBotComposer{padding:7px 10px}
        #pickdeeSupportPanel.pd-bot-mode #pdBotInput{min-height:40px;padding:9px 11px}
        #pickdeeSupportPanel.pd-bot-mode #pdBotSend{flex-basis:40px;height:40px}
        /* Form nhân viên (tên + SĐT): gọn, cuộn trong khung nếu màn hình nhỏ */
        #pickdeeSupportPanel #pickdeeSupportGuest{min-height:0;flex:0 1 auto;padding:12px 14px}
        #pickdeeSupportPanel .pickdee-support-intro{margin-bottom:10px;font-size:13px;line-height:1.45}
        #pickdeeSupportPanel .pickdee-support-field{margin-bottom:9px;gap:5px}
        #pickdeeSupportPanel .pickdee-support-field input{min-height:42px;font-size:16px}
        #pickdeeSupportPanel #pickdeeSupportGuestStart{min-height:44px;margin-top:2px}
        /* Chat nhân viên: chiều cao cố định 50% để khung tin nhắn không nhảy khi chờ trả lời */
        #pickdeeSupportPanel.open.pd-staff-chat{height:min(50dvh,calc(var(--pd-vvh,100dvh) - 16px))}
        #pickdeeSupportPanel.open.pd-staff-chat.pd-kb{height:calc(var(--pd-vvh,100dvh) - 16px)}
      }
    `;
    document.head.appendChild(st);
  })();

  botBox.innerHTML = `
    <div id="pdBotMsgs"></div>
    <button id="pdBotHuman" type="button">👩 Gặp nhân viên</button>
    <div id="pdBotComposer">
      <textarea id="pdBotInput" rows="1" maxlength="500" placeholder="Nhập câu hỏi, em tư vấn ngay..."></textarea>
      <button id="pdBotSend" type="button" aria-label="Gửi câu hỏi">➤</button>
    </div>`;

  const botMsgs = document.getElementById("pdBotMsgs");
  const botInput = document.getElementById("pdBotInput");
  const botSend = document.getElementById("pdBotSend");
  const botHumanBtn = document.getElementById("pdBotHuman");
  botMsgs.addEventListener("click", function (e) {
    const b = e.target.closest && e.target.closest("[data-pdj-add]");
    if (!b) return;
    e.preventDefault();
    pdjAdd(b.getAttribute("data-pdj-add"), b);
  });
  // Đưa lên thanh tiêu đề, ngay trước nút đóng
  (function () {
    const x = document.getElementById("pickdeeSupportClose");
    if (x && x.parentNode) x.parentNode.insertBefore(botHumanBtn, x);
  })();

  function botEnabled() {
    return !botForceHuman;
  }

  // Trang nội bộ (admin, Coach, quản trị Shop/Support): vào thẳng chat nhân viên như cũ
  function botStaffPage() {
    return /^\/(admin|shop-admin|support-admin)/i.test(location.pathname);
  }

  // Có tin nhân viên chưa đọc → mở chat nhân viên để khách không bỏ lỡ
  async function botUnreadCount() {
    try {
      const { data, error } = await sb.rpc("support_get_unread_count", {
        p_public_token: localStorage.getItem(STORAGE_TOKEN) || null
      });
      return error ? 0 : Math.max(0, Number(data || 0));
    } catch (_) { return 0; }
  }

  function botVisitor() {
    try {
      let v = localStorage.getItem(BOT_VID);
      if (!v) {
        v = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(BOT_VID, v);
      }
      return v;
    } catch (_) { return "anon"; }
  }

  function botHistory() {
    try { return JSON.parse(sessionStorage.getItem(BOT_HISTORY) || "[]"); } catch (_) { return []; }
  }

  function botSave(h) {
    try { sessionStorage.setItem(BOT_HISTORY, JSON.stringify(h.slice(-20))); } catch (_) {}
  }

  function botHtml(text) {
    const esc = String(text || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return esc.replace(/https:\/\/pickdee\.vn\/[^\s<]*/g, function (u) {
      const clean = u.replace(/[.,;!?)]+$/, "");
      const rest = u.slice(clean.length);
      return '<a href="' + clean + '">' + clean.replace("https://", "") + "</a>" + rest;
    }).replace(/\n/g, "<br>");
  }

  function botRow(role, html, extraClass) {
    const row = document.createElement("div");
    row.className = "pickdee-support-message-row " + (role === "user" ? "user" : "support");
    const msg = document.createElement("div");
    msg.className = "pickdee-support-message" + (extraClass ? " " + extraClass : "");
    msg.innerHTML = html;
    row.appendChild(msg);
    botMsgs.appendChild(row);
    return row;
  }

  function renderBot(typing) {
    const h = botHistory();
    botMsgs.innerHTML = "";
    botRow("bot", botGreeting());
    if (!h.length && PDJ && BOT_PAGE === "shop") {
      botMsgs.appendChild(pdjChipsEl(PDJ_HOME));
    } else if (!h.length) {
      const chips = document.createElement("div");
      chips.className = "pd-bot-chips";
      BOT_SUGGEST.forEach(function (q) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pd-bot-chip";
        b.textContent = q;
        b.addEventListener("click", function () { botAsk(q); });
        chips.appendChild(b);
      });
      // Trang sản phẩm / giỏ: thêm lối vào tư vấn theo nhu cầu + mua kèm
      if (PDJ && (BOT_PAGE === "product" || BOT_PAGE === "cart")) {
        Array.prototype.slice.call(pdjChipsEl([["➕ Phụ kiện nên mua kèm", "addons"], ["🛍️ Tư vấn chọn sản phẩm", "home"]]).children)
          .forEach(function (b) { chips.appendChild(b); });
      }
      botMsgs.appendChild(chips);
    }
    const answered = {};
    h.forEach(function (m) { if (m.owner && m.qid) answered[m.qid] = 1; });
    const rows = [];
    h.forEach(function (m, i) {
      const row = botRow(m.role, m.html ? m.html : botHtml(m.text), m.owner ? "pd-bot-owner" : "");
      rows[i] = row;
      if (m.cards && m.cards.length) botMsgs.appendChild(pdjCardsEl(m.cards));
      if (m.after) botRow("bot", m.after);
      if (i === h.length - 1 && !typing && PDJ) {
        // Câu cuối: lựa chọn tiếp theo (câu AI trả lời xong → mời đặt hàng / gợi ý tiếp)
        if (m.chips && m.chips.length) botMsgs.appendChild(pdjChipsEl(m.chips));
        else if (m.role === "bot" && !m.pdj && !m.handoff) botMsgs.appendChild(pdjChipsEl([["🛒 Đặt hàng ngay", "checkout"], ["🛍️ Gợi ý sản phẩm", "home"]]));
      }
      // Câu đã chuyển PickDee mà chưa có trả lời → báo đang chờ (khách vẫn hỏi bot tiếp được)
      if (m.handoff && m.qid && !answered[m.qid] && Date.now() - (m.t || 0) < BOT_WAIT_MS) {
        const w = document.createElement("div");
        w.className = "pd-bot-wait";
        w.textContent = "⏳ Đang chờ PickDee trả lời…";
        botMsgs.appendChild(w);
      }
    });
    if (typing) botRow("bot", "Em đang xem thông tin…", "pd-bot-typing");
    const last = h[h.length - 1];
    // Nút header chỉ dùng khi nhân viên trả lời trong chat nhân viên (support-admin)
    botHumanBtn.textContent = "💬 Xem trả lời (" + botUnread + ")";
    botHumanBtn.classList.toggle("pd-show", botUnread > 0);
    botHumanBtn.classList.toggle("pd-hot", botUnread > 0);
    // Vừa trả lời xong → cuộn tới đầu câu trả lời (kèm câu khách vừa hỏi/chọn) để đọc từ đầu (khung chỉ cao 50% màn hình)
    const n = h.length;
    const top = !typing && last && last.role === "bot" ? rows[n >= 2 && h[n - 2].role === "user" ? n - 2 : n - 1] : null;
    botMsgs.scrollTop = top ? top.offsetTop - 6 : botMsgs.scrollHeight;
  }

  async function botAsk(text) {
    const q = String(text || "").trim().slice(0, 500);
    if (!q || botBusy) return;
    botBusy = true;
    botSend.disabled = true;
    botLastQuestion = q;
    const prev = botHistory();
    const h = prev.concat([{ role: "user", text: q }]);
    botSave(h);
    botInput.value = "";
    renderBot(true);

    let answer = "Xin lỗi anh/chị, trợ lý đang bận. Anh/chị hỏi lại sau ít phút hoặc gọi/Zalo 0926 629 966 nhé.";
    let handoff = false, qid = null;
    try {
      const res = await fetch(BOT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          message: q,
          visitor_id: botVisitor(),
          page: location.pathname + (BOT_PAGE === "product" ? location.search : ""), // ?id= → bot biết khách đang xem SP nào
          history: prev.slice(-6).map(function (m) { return { role: m.role, text: m.text }; })
        })
      });
      const d = await res.json();
      if (d && d.answer) { answer = d.answer; handoff = !!d.handoff; qid = d.qid || null; }
    } catch (e) {
      console.warn("PickDee bot:", e);
    }
    botSave(h.concat([{ role: "bot", text: answer, handoff: handoff, qid: qid, t: Date.now() }]));
    botBusy = false;
    botSend.disabled = false;
    renderBot(false);
    if (handoff && qid) botWatch();
  }

  /*
    PickDee (anh Nam) trả lời "#Q<id> ..." trên Telegram → bot_logs.owner_answer.
    Widget hỏi RPC pd_bot_owner_replies(visitor) → chèn vào khung chat bot; bot nói chuyện tiếp (câu trả lời nằm trong lịch sử gửi AI).
    Chỉ hỏi định kỳ khi còn câu đang chờ (tối đa BOT_WAIT_MS) và tab đang mở; mở trang thì hỏi 1 lần.
  */
  let botPollTimer = null;

  function botPending() {
    const h = botHistory();
    const answered = {};
    h.forEach(function (m) { if (m.owner && m.qid) answered[m.qid] = 1; });
    return h.some(function (m) { return m.handoff && m.qid && !answered[m.qid] && Date.now() - (m.t || 0) < BOT_WAIT_MS; });
  }

  async function botFetchReplies() {
    let vid = null;
    try { vid = localStorage.getItem(BOT_VID); } catch (_) {}
    if (!vid) return;
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem(BOT_SEEN) || "{}") || {}; } catch (_) {}
    const { data, error } = await sb.rpc("pd_bot_owner_replies", { p_visitor: vid });
    if (error || !Array.isArray(data)) return;
    const fresh = data.filter(function (r) { return seen[r.id] !== r.answered_at; });
    if (!fresh.length) return;
    const h = botHistory();
    fresh.forEach(function (r) {
      h.push({
        role: "bot",
        owner: true,
        qid: r.id,
        text: "💬 PickDee trả lời câu «" + String(r.question || "").slice(0, 80) + "»:\n" + r.answer
      });
      seen[r.id] = r.answered_at;
    });
    botSave(h);
    try { localStorage.setItem(BOT_SEEN, JSON.stringify(seen)); } catch (_) {}
    if (panel.classList.contains("open") && panel.classList.contains("pd-bot-mode")) renderBot(botBusy);
    else openBtn.classList.add("pd-bot-new");
  }

  function botWatch() {
    if (botPollTimer) return;
    botPollTimer = setInterval(function () {
      if (!botPending()) { clearInterval(botPollTimer); botPollTimer = null; return; }
      if (document.visibilityState === "visible") botFetchReplies().catch(function () {});
    }, 12000);
  }

  if (!botStaffPage()) {
    botFetchReplies().catch(function () {});
    if (botPending()) botWatch();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && botPending()) botFetchReplies().catch(function () {});
    });
  }

  // Điện thoại: bám theo vùng nhìn thấy (bàn phím iOS không thu nhỏ layout) → khung luôn nằm ngay trên bàn phím
  (function trackKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return;
    let kbWas = false;
    const sync = function () {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const kbOn = kb > 120;
      panel.style.setProperty("--pd-vvh", vv.height + "px");
      panel.style.setProperty("--pd-kb", kb + "px");
      panel.classList.toggle("pd-kb", kbOn);
      if (kbOn && botMsgs) botMsgs.scrollTop = botMsgs.scrollHeight;
      // iOS: khung đổi cao khi bàn phím bật/tắt nhưng giữ vị trí cuộn cũ → vùng tin nhắn trắng. Cuộn lại câu cuối sau khi vẽ lại.
      if (kbOn !== kbWas && botMsgs) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            botMsgs.scrollTop = 0;
            botMsgs.scrollTop = botMsgs.scrollHeight;
          });
        });
      }
      kbWas = kbOn;
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
  })();

  function showBot() {
    showError("");
    guestBox.style.display = "none";
    chatBox.style.display = "none";
    botBox.style.display = "flex";
    panel.classList.remove("pd-staff-chat");
    panel.classList.add("pd-bot-mode");
    openBtn.classList.remove("pd-bot-new");
    renderBot(false);
    if (PDJ) pdjLoad().catch(function () {});
  }

  async function goHuman() {
    botForceHuman = true;
    botUnread = 0;
    botBox.style.display = "none";
    panel.classList.remove("pd-bot-mode");
    if (botLastQuestion && !messageInput.value) messageInput.value = botLastQuestion;
    await prepareChat();
  }

  botSend.addEventListener("click", function () { botAsk(botInput.value); });
  botInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      botAsk(botInput.value);
    }
  });
  botHumanBtn.addEventListener("click", function () {
    goHuman().catch(function (e) { showError("Không mở được chat: " + (e?.message || e)); });
  });


  /* =====================================================
     SESSION
  ====================================================== */

  async function loadSession() {

    const {
      data,
      error
    } =
      await sb
        .auth
        .getSession();


    if (
      error
    ) {

      console.warn(
        "PickDee Support session:",
        error
      );

    }


    currentSession =
      data?.session
      ||
      null;


    return currentSession;

  }


  /* =====================================================
     OPEN CONVERSATION RPC
  ====================================================== */

  async function openConversation(
    guestName = null,
    guestPhone = null
  ) {

    const storedToken =
      localStorage.getItem(
        STORAGE_TOKEN
      );


    const {
      data,
      error
    } =
      await sb.rpc(
        "support_open_conversation",
        {

          p_public_token:
            currentSession
              ?
              null
              :
              (
                storedToken
                ||
                null
              ),

          p_guest_name:
            guestName
            ||
            null,

          p_guest_phone:
            guestPhone
            ||
            null,

          p_source:
            getSource(),

          p_context_url:
            window.location.href,

          p_order_ref:
            getOrderRef()
            ||
            null

        }
      );


    if (
      error
    ) {

      throw error;

    }


    if (
      !data?.id
    ) {

      throw new Error(
        "Không tạo được cuộc trò chuyện."
      );

    }


    currentConversation =
      data;


    if (
      !currentSession
      &&
      data.public_token
    ) {

      localStorage.setItem(
        STORAGE_TOKEN,
        data.public_token
      );

    }


    return data;

  }


  /* =====================================================
     RENDER MESSAGES
  ====================================================== */

  function renderMessages(
    messages
  ) {

    const rows =
      Array.isArray(
        messages
      )
        ?
        messages
        :
        [];


    const signature =
      rows
        .map(
          function (
            item
          ) {

            return [
              item.id,
              item.sender_type,
              item.created_at,
              item.message
            ].join(
              "|"
            );

          }
        )
        .join(
          "||"
        );


    if (
      signature ===
      lastRenderedSignature
    ) {

      return;

    }


    lastRenderedSignature =
      signature;


    messagesBox.innerHTML =
      "";


    const welcome =
      document.createElement(
        "div"
      );


    welcome.className =
      "pickdee-support-welcome";


    welcome.textContent =
      rows.length
        ?
        "Cuộc trò chuyện hỗ trợ của bạn với PickDee."
        :
        "Xin chào 👋 Bạn cần PickDee hỗ trợ vấn đề gì? Hãy nhắn ngay tại đây.";


    messagesBox.appendChild(
      welcome
    );


    rows.forEach(
      function (
        item
      ) {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "pickdee-support-message-row "
          +
          (
            item.sender_type ===
            "support"
              ?
              "support"
              :
              "user"
          );


        const bubble =
          document.createElement(
            "div"
          );


        bubble.className =
          "pickdee-support-message";


        const text =
          document.createElement(
            "div"
          );


        text.textContent =
          item.message
          ||
          "";


        const time =
          document.createElement(
            "div"
          );


        time.className =
          "pickdee-support-time";


        time.textContent =
          (
            item.sender_type ===
            "support"
              ?
              "PickDee · "
              :
              ""
          )
          +
          formatTime(
            item.created_at
          );


        bubble.appendChild(
          text
        );


        bubble.appendChild(
          time
        );


        row.appendChild(
          bubble
        );


        messagesBox.appendChild(
          row
        );

      }
    );


    scrollMessagesToBottom();

  }


  /* =====================================================
     LOAD MESSAGES
  ====================================================== */

  async function loadMessages() {

    if (
      !currentConversation?.id
    ) {

      return;

    }


    const token =
      currentSession
        ?
        null
        :
        (
          currentConversation
            .public_token
          ||
          localStorage.getItem(
            STORAGE_TOKEN
          )
          ||
          null
        );


    const {
      data,
      error
    } =
      await sb.rpc(
        "support_get_messages",
        {

          p_conversation_id:
            currentConversation.id,

          p_public_token:
            token

        }
      );


    if (
      error
    ) {

      throw error;

    }


    const messages =
      data?.messages
      ||
      [];


    renderMessages(
      messages
    );


    badge.style.display =
      "none";


    badge.textContent =
      "0";

  }


  /* =====================================================
     SHOW CHAT
  ====================================================== */

  async function showChat() {

    showError(
      ""
    );


    guestBox.style.display =
      "none";


    chatBox.style.display =
      "flex";

    panel.classList.add("pd-staff-chat");


    await loadMessages();


    startPolling();


    setTimeout(
      function () {

        messageInput.focus();

      },
      100
    );

  }


  /* =====================================================
     PREPARE CHAT
  ====================================================== */

  async function prepareChat() {

    showError(
      ""
    );


    await loadSession();


    /*
      TRỢ LÝ PICKDEE TRẢ LỜI TRƯỚC (mọi người, kể cả đã đăng nhập / từng chat).
      Chỉ vào chat nhân viên khi khách bấm nút (bot không trả lời được hoặc PickDee đã trả lời).
    */

    if (
      botEnabled()
      &&
      !botStaffPage()
    ) {

      showBot();

      // PickDee đã trả lời mà khách chưa đọc → hiện nút "Xem trả lời" (không tự chuyển)
      botUnreadCount().then(function (n) {
        botUnread = n || 0;
        if (botUnread > 0) renderBot(false);
      });

      return;

    }


    /*
      TÀI KHOẢN ĐÃ ĐĂNG NHẬP
    */

    if (
      currentSession
    ) {

      await openConversation();


      await showChat();


      return;

    }


    /*
      GUEST ĐÃ TỪNG CHAT
    */

    const storedToken =
      localStorage.getItem(
        STORAGE_TOKEN
      );


    const storedName =
      localStorage.getItem(
        STORAGE_NAME
      );


    const storedPhone =
      localStorage.getItem(
        STORAGE_PHONE
      );


    if (
      storedToken
      &&
      storedName
      &&
      storedPhone
    ) {

      try {

        await openConversation(
          storedName,
          storedPhone
        );


        await showChat();


        return;

      }
      catch (
        error
      ) {

        console.warn(
          "PickDee Support old guest:",
          error
        );

      }

    }


    /*
      GUEST MỚI
    */

    chatBox.style.display =
      "none";


    guestBox.style.display =
      "block";

    panel.classList.remove("pd-staff-chat");


    guestNameInput.value =
      storedName
      ||
      "";


    guestPhoneInput.value =
      storedPhone
      ||
      "";


    setTimeout(
      function () {

        guestNameInput.focus();

      },
      100
    );

  }


  /* =====================================================
     START GUEST
  ====================================================== */

  async function startGuestChat() {

    const name =
      guestNameInput
        .value
        .trim();


    const phone =
      guestPhoneInput
        .value
        .trim();


    if (
      !name
    ) {

      showError(
        "Vui lòng nhập họ và tên."
      );


      guestNameInput.focus();


      return;

    }


    const phoneDigits =
      phone.replace(
        /\D/g,
        ""
      );


    if (
      phoneDigits.length < 8
    ) {

      showError(
        "Vui lòng nhập số điện thoại hợp lệ."
      );


      guestPhoneInput.focus();


      return;

    }


    guestStartBtn.disabled =
      true;


    guestStartBtn.textContent =
      "ĐANG MỞ CHAT...";


    showError(
      ""
    );


    try {

      localStorage.setItem(
        STORAGE_NAME,
        name
      );


      localStorage.setItem(
        STORAGE_PHONE,
        phone
      );


      await openConversation(
        name,
        phone
      );


      await showChat();

    }
    catch (
      error
    ) {

      console.error(
        "PickDee Support guest:",
        error
      );


      showError(
        "Không mở được hỗ trợ: "
        +
        (
          error?.message
          ||
          error
        )
      );

    }
    finally {

      guestStartBtn.disabled =
        false;


      guestStartBtn.textContent =
        "BẮT ĐẦU CHAT";

    }

  }


  /* =====================================================
     SEND MESSAGE
  ====================================================== */

  async function sendMessage() {

    if (
      sending
      ||
      !currentConversation?.id
    ) {

      return;

    }


    const message =
      messageInput
        .value
        .trim();


    if (
      !message
    ) {

      return;

    }


    sending =
      true;


    sendBtn.disabled =
      true;


    showError(
      ""
    );


    try {

      const token =
        currentSession
          ?
          null
          :
          (
            currentConversation
              .public_token
            ||
            localStorage.getItem(
              STORAGE_TOKEN
            )
            ||
            null
          );


      const {
        error
      } =
        await sb.rpc(
          "support_send_message",
          {

            p_conversation_id:
              currentConversation.id,

            p_public_token:
              token,

            p_message:
              message

          }
        );


      if (
        error
      ) {

        throw error;

      }


      messageInput.value =
        "";


      messageInput.style.height =
        "auto";


      await loadMessages();

    }
    catch (
      error
    ) {

      console.error(
        "PickDee Support send:",
        error
      );


      showError(
        "Không gửi được tin nhắn: "
        +
        (
          error?.message
          ||
          error
        )
      );

    }
    finally {

      sending =
        false;


      sendBtn.disabled =
        false;


      messageInput.focus();

    }

  }


    /* =====================================================
     UNREAD BADGE + SMART POLLING
  ====================================================== */

  async function refreshUnreadBadge() {

    if (
      panel.classList.contains(
        "open"
      )
    ) {

      badge.style.display =
        "none";


      badge.textContent =
        "0";


      return;

    }


    const token =
      localStorage.getItem(
        STORAGE_TOKEN
      );


    const {
      data,
      error
    } =
      await sb.rpc(
        "support_get_unread_count",
        {
          p_public_token:
            token || null
        }
      );


    if (
      error
    ) {

      console.warn(
        "PickDee Support unread:",
        error
      );


      return;

    }


    const count =
      Math.max(
        0,
        Number(
          data || 0
        )
      );


    badge.textContent =
      count > 99
        ?
        "99+"
        :
        String(
          count
        );


    badge.style.display =
      count > 0
        ?
        "flex"
        :
        "none";

  }


  function stopPolling() {

    if (
      pollTimer
    ) {

      clearInterval(
        pollTimer
      );


      pollTimer =
        null;

    }

  }


  function startPolling() {

    stopPolling();


    const isOpen =
      panel.classList.contains(
        "open"
      );


    const intervalMs =
      isOpen
        ?
        3000
        :
        30000;


    pollTimer =
      setInterval(
        async function () {

          try {

            if (
              panel.classList.contains(
                "open"
              )
            ) {

              await loadMessages();

            }
            else {

              await refreshUnreadBadge();

            }

          }
          catch (
            error
          ) {

            console.warn(
              "PickDee Support polling:",
              error
            );

          }

        },
        intervalMs
      );

  }


  /* =====================================================
     GỢI Ý TƯ VẤN CHỦ ĐỘNG (bong bóng nhỏ cạnh nút, không tự mở khung)
     Hiện 1 lần/phiên khi khách xem đủ lâu / cuộn xuống tìm hiểu; bấm × → ẩn 24 giờ.
     Không hiện ở trang nội bộ, giỏ hàng/thanh toán, khi khách đã chat hoặc đang gõ.
  ====================================================== */
  (function botTeaser() {
    const SEEN = "pickdee_bot_teased", OFF = "pickdee_bot_tease_off";
    const isPortal = /^\/(student|coach|student-register|student-book-session|student-sessions|student-payment-checkout|student-session-requests|apply-coach|coach-sessions|coach-session-detail|add-my-court|court-claim)(\.html)?\b/.test(location.pathname);
    const plan = isPortal
      ? { wait: 1000, minWait: 0 }
      : {
          product: { wait: 18000, scroll: 0.45, minWait: 7000 },
          shop: { wait: 0, scroll: 0, minWait: 0, chime: true, every: true },
          academy: { wait: 0, scroll: 0, minWait: 0, every: true },
          all: { wait: 0, scroll: 0, minWait: 0, every: true }
        }[BOT_PAGE];
    const salesPage = isPortal || /^\/(shop-product|shop|academy|find-coach|index)?(\.html)?\/?$/.test(location.pathname);
    if (!plan || !salesPage || botStaffPage()) return;
    try {
      if (!plan.every && sessionStorage.getItem(SEEN)) return;
      if (Date.now() - Number(localStorage.getItem(OFF) || 0) < 864e5) return;
    } catch (_) { return; }

    const st = document.createElement("style");
    st.textContent = `
      #pdTease{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:80px;width:max-content;max-width:min(290px,calc(100vw - 32px));padding:12px 34px 12px 14px;border-radius:16px 16px 4px 16px;background:#fff;color:#1a1a1a;font-size:14px;line-height:1.4;box-shadow:0 10px 30px rgba(21,21,21,.28);cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;z-index:9970}
      #pdTease.pd-on{opacity:1;transform:none}
      #pdTease b{color:#1a1a1a}
      #pdTease .pd-tease-go{display:inline-block;margin-top:6px;font-weight:800;color:#1a7f37}
      #pdTease .pd-tease-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
      #pdTease .pd-tease-chips span{padding:7px 11px;border-radius:999px;background:#1a1a1a;color:#ffc934;font-size:12.5px;font-weight:800;white-space:nowrap}
      #pdTease .pd-tease-q{display:flex;flex-direction:column;gap:6px;margin-top:10px}
      #pdTease .pd-tease-q span{display:block;padding:9px 12px;border-radius:12px;background:#f2f2f2;color:#1a1a1a;font-size:12.5px;font-weight:700;line-height:1.3}
      #pdTease .pd-tease-q span:active{background:#e6e6e6}
      #pdTease .pd-tease-x{position:absolute;top:4px;right:4px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#667;font-size:16px;cursor:pointer}
      #pickdeeSupportRoot:has(#pickdeeSupportPanel.open) #pdTease{display:none}
    `;
    document.head.appendChild(st);

    let timer = null, done = false;
    const t0 = Date.now();

    // Tiếng "ting" 2 nốt bằng Web Audio (không tải file). Trình duyệt chặn âm thanh khi khách
    // chưa chạm trang → chờ lần chạm/bấm phím đầu tiên rồi kêu (nếu bong bóng còn hiện).
    function chime(box) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      let ac = null;
      const ring = function () {
        try {
          ac = ac || new AC();
          if (ac.state !== "running") return false;
          const t = ac.currentTime;
          [[880, 0], [1320, 0.13]].forEach(function (n) {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = "sine"; o.frequency.value = n[0];
            g.gain.setValueAtTime(0.0001, t + n[1]);
            g.gain.exponentialRampToValueAtTime(0.25, t + n[1] + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.45);
            o.connect(g); g.connect(ac.destination);
            o.start(t + n[1]); o.stop(t + n[1] + 0.5);
          });
          return true;
        } catch (_) { return true; }
      };
      if (ring()) return;
      const evs = ["pointerdown", "touchend", "keydown"];
      const later = function () {
        evs.forEach(function (e) { removeEventListener(e, later, true); });
        if (!box.isConnected) return;
        (ac && ac.resume ? ac.resume() : Promise.resolve()).then(ring, function () {});
      };
      evs.forEach(function (e) { addEventListener(e, later, { capture: true, passive: true }); });
    }

    function text() {
      if (isPortal) {
        const p = location.pathname;
        if (/\/student-register/.test(p)) return "Còn thắc mắc gì về gói học không? Em giải thích ngay ạ.";
        if (/\/student-book-session/.test(p)) return "Cần giúp đặt lịch hay chọn sân? Em hỗ trợ ngay.";
        if (/\/student-payment-checkout/.test(p)) return "Cần hỗ trợ thanh toán hay hỏi về bill? Em ở đây ạ.";
        if (/\/student/.test(p)) return "Cần giúp gì về lịch học, gói học hay Coach? Em hỗ trợ ngay ạ.";
        if (/\/apply-coach/.test(p)) return "Có câu hỏi về hợp đồng hay quy trình Coach không? Em giải thích ngay.";
        if (/\/add-my-court/.test(p)) return "Cần hỗ trợ điền thông tin sân hay có thắc mắc gì không? Em giúp luôn ạ.";
        if (/\/court-claim/.test(p)) return "Cần hỗ trợ xác minh chủ sân không? Em giải thích quy trình ngay ạ.";
        if (/\/coach-session-detail/.test(p)) return "Cần hỗ trợ xử lý buổi học này không? Em ở đây ạ.";
        if (/\/coach/.test(p)) return "Cần hỗ trợ về lịch dạy, công hay học viên? Em ở đây ạ.";
        return "Cần hỗ trợ gì không? Em ở đây ạ.";
      }
      const name = botProductName();
      const short = name.length > 42 ? name.slice(0, 40).trim() + "…" : name;
      return {
        product: short
          ? "Anh/chị đang cân nhắc <b>" + botEsc(short) + "</b>? Em tư vấn nhanh loại/màu phù hợp và phí ship ạ."
          : "Anh/chị cần tư vấn sản phẩm này? Em trả lời ngay ạ.",
        shop: "👋 Anh/chị đang tìm gì hôm nay? Em tư vấn chọn đúng sản phẩm trong 30 giây:",
        academy: /^\/find-coach/.test(location.pathname)
          ? "Anh/chị muốn <b>tìm Coach gần mình</b>? Em gợi ý Coach phù hợp trình độ và khu vực ngay ạ."
          : "Anh/chị muốn học Pickleball hay muốn làm Coach cho PickDee ạ?",
        all: "Anh/chị cần tìm khoá học, Coach, muốn làm Coach, hay đưa sân lên PickDee ạ? Em giúp luôn nè."
      }[BOT_PAGE];
    }

    function busy() {
      if (panel.classList.contains("open")) return true;
      if (!plan.every && botHistory().length) return true;
      const a = document.activeElement;
      return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); // đang gõ/điền form
    }

    function show() {
      if (done) return;
      if (busy()) { clearTimeout(timer); timer = setTimeout(show, 8000); return; }
      done = true;
      cleanup();
      try { sessionStorage.setItem(SEEN, "1"); } catch (_) {}
      const box = document.createElement("div");
      box.id = "pdTease";
      box.setAttribute("role", "status");
      const quick = PDJ && BOT_PAGE === "shop"
        ? '<div class="pd-tease-chips">' + [["🏓 Vợt", "paddle"], ["Bóng", "ball"], ["✋ Quấn cán", "grip"], ["🎁 Quà tặng", "gift"]].map(function (c) {
          return '<span role="button" data-act="' + c[1] + '">' + pdjChipHtml(c[0], c[1]) + "</span>";
        }).join("") + "</div>"
        : BOT_SUGGEST && BOT_SUGGEST.length
          ? '<div class="pd-tease-q">' + BOT_SUGGEST.slice(0, 4).map(function (q) {
            return '<span role="button" data-q="' + botEsc(q) + '">' + botEsc(q) + "</span>";
          }).join("") + "</div>"
          : '<br><span class="pd-tease-go">Hỏi ngay →</span>';
      box.innerHTML = text() + quick + '<button type="button" class="pd-tease-x" aria-label="Đóng">×</button>';
      if (PDJ) pdjLoad().catch(function () {});
      openBtn.parentNode.insertBefore(box, openBtn);
      requestAnimationFrame(function () { box.classList.add("pd-on"); });
      let rang = false;
      try { rang = !!sessionStorage.getItem(SEEN + "_ting"); sessionStorage.setItem(SEEN + "_ting", "1"); } catch (_) {}
      if (plan.chime && !rang) chime(box);
      const hide = function () { box.remove(); };
      box.querySelectorAll("[data-act]").forEach(function (c) {
        c.addEventListener("click", function (e) {
          e.stopPropagation();
          hide();
          openPanel().then(function () { pdjStep(c.getAttribute("data-act"), c.textContent); });
        });
      });
      box.querySelectorAll("[data-q]").forEach(function (c) {
        c.addEventListener("click", function (e) {
          e.stopPropagation();
          const q = c.getAttribute("data-q");
          hide();
          openPanel().then(function () { botAsk(q); });
        });
      });
      box.querySelector(".pd-tease-x").addEventListener("click", function (e) {
        e.stopPropagation();
        try { localStorage.setItem(OFF, String(Date.now())); } catch (_) {}
        hide();
      });
      box.addEventListener("click", function () { hide(); openPanel(); });
      openBtn.addEventListener("click", hide, { once: true });
    }

    function onScroll() {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (plan.scroll && h > 200 && scrollY / h >= plan.scroll) {
        clearTimeout(timer);
        timer = setTimeout(show, Math.max(0, plan.minWait - (Date.now() - t0)));
        removeEventListener("scroll", onScroll);
      }
    }
    function cleanup() { clearTimeout(timer); removeEventListener("scroll", onScroll); }

    if (plan.wait) timer = setTimeout(show, plan.wait); else show();
    if (plan.scroll) addEventListener("scroll", onScroll, { passive: true });
  })();


  /* =====================================================
     OPEN / CLOSE
  ====================================================== */

  async function openPanel() {

    panel.classList.add(
      "open"
    );


    openBtn.setAttribute(
      "aria-expanded",
      "true"
    );


    try {

      await prepareChat();

    }
    catch (
      error
    ) {

      console.error(
        "PickDee Support open:",
        error
      );


      showError(
        "Không mở được hỗ trợ: "
        +
        (
          error?.message
          ||
          error
        )
      );

    }

  }


  function closePanel() {

    botForceHuman = false; // mở lại → trợ lý trước

    panel.classList.remove(
      "open"
    );


    openBtn.setAttribute(
      "aria-expanded",
      "false"
    );


   refreshUnreadBadge()
  .catch(
    function () {}
  );

startPolling();

  }


  openBtn.addEventListener(
    "click",
    function () {

      if (
        panel.classList.contains(
          "open"
        )
      ) {

        closePanel();

      }
      else {

        openPanel();

      }

    }
  );


  closeBtn.addEventListener(
    "click",
    closePanel
  );


  guestStartBtn.addEventListener(
    "click",
    startGuestChat
  );


  sendBtn.addEventListener(
    "click",
    sendMessage
  );


  messageInput.addEventListener(
    "input",
    function () {

      messageInput.style.height =
        "auto";


      messageInput.style.height =
        Math.min(
          messageInput.scrollHeight,
          105
        )
        +
        "px";

    }
  );


  messageInput.addEventListener(
    "keydown",
    function (
      event
    ) {

      if (
        event.key ===
        "Enter"
        &&
        !event.shiftKey
      ) {

        event.preventDefault();


        sendMessage();

      }

    }
  );


  document.addEventListener(
    "keydown",
    function (
      event
    ) {

      if (
        event.key ===
        "Escape"
      ) {

        closePanel();

      }

    }
  );


  /* =====================================================
     INITIAL
  ====================================================== */

  openBtn.setAttribute(
    "aria-expanded",
    "false"
  );
refreshUnreadBadge()
  .catch(
    function () {}
  );


startPolling();


window.addEventListener(
  "focus",
  function () {

    if (
      !panel.classList.contains(
        "open"
      )
    ) {

      refreshUnreadBadge()
        .catch(
          function () {}
        );

    }

  }
);


document.addEventListener(
  "visibilitychange",
  function () {

    if (
      document.visibilityState ===
      "visible"
      &&
      !panel.classList.contains(
        "open"
      )
    ) {

      refreshUnreadBadge()
        .catch(
          function () {}
        );

    }

  }
);

  console.log(
    "✓ PickDee Support widget ready."
  );

})();

