(function () {

  "use strict";


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

      background: #d8ff45;
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

      border: 2px solid #071b38;

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
          #092653,
          #061a38
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
        rgba(5,25,55,.88);
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
        rgba(216,255,69,.12);

      border:
        1px solid
        rgba(216,255,69,.30);

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
        rgba(216,255,69,.55);
    }


    #pickdeeSupportGuestStart {
      width: 100%;
      min-height: 48px;

      margin-top: 5px;

      border: 0;
      border-radius: 11px;

      background: #d8ff45;
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
        rgba(216,255,69,.07);

      border:
        1px solid
        rgba(216,255,69,.16);

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
      background: #d8ff45;
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
        rgba(3,17,38,.82);
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
        rgba(216,255,69,.48);
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

      background: #d8ff45;
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
        border:1px solid rgba(216,255,69,.22);
        background:rgba(216,255,69,.08);
        color:#d8ff45;
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
        ? "Chào anh/chị 👋 Em là <b>chuyên viên tư vấn PickDee</b>. Anh/chị đang xem <b>" + botEsc(name) + "</b>, em tư vấn ngay loại/màu phù hợp, phí ship và thời gian nhận hàng ạ."
        : "Chào anh/chị 👋 Em là <b>chuyên viên tư vấn PickDee</b>. Em tư vấn ngay loại/màu phù hợp, phí ship và thời gian nhận hàng ạ.",
      cart: "Chào anh/chị 👋 Em hỗ trợ anh/chị hoàn tất đơn hàng: phí ship, thanh toán, thời gian giao. Đặt hàng không cần tạo tài khoản ạ.",
      order: "Chào anh/chị 👋 Em hỗ trợ tra cứu và giải đáp mọi thắc mắc về đơn hàng của anh/chị ạ.",
      shop: "Chào anh/chị 👋 Em là <b>chuyên viên tư vấn PickDee Shop</b>. Anh/chị cho em biết trình độ và ngân sách, em gợi ý ngay vợt và phụ kiện phù hợp nhất ạ.",
      academy: "Chào anh/chị 👋 Em là <b>chuyên viên tư vấn PickDee Academy</b>. Anh/chị cho em biết trình độ và muốn học 1 kèm 1 hay nhóm 2 người, em tư vấn gói học phù hợp ạ.",
      all: "Chào anh/chị 👋 Em là <b>chuyên viên tư vấn PickDee</b>. Anh/chị đang cần chọn vợt, phụ kiện hay tìm khoá học Pickleball ạ?"
    }[BOT_PAGE];
  }
  const BOT_SUGGEST = {
    product: ["Mẫu này hợp với tôi không?", "Có những loại/màu nào?", "Phí ship bao nhiêu?", "Bao lâu nhận hàng?"],
    cart: ["Phí ship thế nào?", "Thanh toán thế nào?", "Bao lâu nhận hàng?", "Bảo hành vợt?"],
    order: ["Tra cứu đơn hàng", "Bao lâu nhận hàng?", "Bảo hành vợt?"],
    shop: ["Tư vấn vợt cho người mới", "Vợt cho người chơi lâu năm", "Phí ship thế nào?", "Tra cứu đơn hàng"],
    academy: ["Người mới nên học gói nào?", "Học phí các gói học?", "Học nhóm 2 người?", "Nghỉ / đổi lịch học?"],
    all: ["Tư vấn vợt cho người mới", "Học phí các gói học?", "Phí ship thế nào?", "Tra cứu đơn hàng"]
  }[BOT_PAGE];

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
      #pdBotMsgs a{color:#d8ff45;font-weight:800;word-break:break-all}
      .pd-bot-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 12px}
      .pd-bot-chip{padding:8px 11px;border-radius:999px;border:1px solid rgba(216,255,69,.3);background:rgba(216,255,69,.07);color:#d8ff45;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .pd-bot-typing{opacity:.6;font-style:italic}
      .pd-bot-wait{margin:-4px 0 10px 4px;font-size:12px;font-weight:800;color:#d8ff45;opacity:.85}
      .pd-bot-owner{border:1px solid rgba(216,255,69,.45)!important}
      #pickdeeSupportButton.pd-bot-new::after{content:"";position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#ff3b30;border:2px solid #fff}
      /* Nút "Gặp nhân viên" nằm trên thanh tiêu đề (cạnh nút ×), chỉ hiện khi đang ở trợ lý */
      #pdBotHuman{flex:0 0 auto;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(216,255,69,.35);background:rgba(216,255,69,.08);color:#d8ff45;font:inherit;font-size:12px;font-weight:900;white-space:nowrap;cursor:pointer}
      #pickdeeSupportPanel:not(.pd-bot-mode) #pdBotHuman,#pdBotHuman:not(.pd-show){display:none}
      #pdBotHuman.pd-hot{background:#d8ff45;color:#142300;border-color:#d8ff45}
      #pdBotComposer{padding:11px;display:flex;align-items:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,.09);background:rgba(3,17,38,.82)}
      #pdBotInput{min-width:0;flex:1;min-height:44px;max-height:105px;padding:11px 12px;resize:none;outline:none;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-size:16px;line-height:1.4}
      #pdBotInput:focus{border-color:rgba(216,255,69,.48)}
      #pdBotSend{flex:0 0 44px;height:44px;border:0;border-radius:12px;background:#d8ff45;color:#142300;font-size:18px;font-weight:900;cursor:pointer}
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
    return /^\/(admin|coach|shop-admin|support-admin)/i.test(location.pathname);
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
  }

  function renderBot(typing) {
    const h = botHistory();
    botMsgs.innerHTML = "";
    botRow("bot", botGreeting());
    if (!h.length) {
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
      botMsgs.appendChild(chips);
    }
    const answered = {};
    h.forEach(function (m) { if (m.owner && m.qid) answered[m.qid] = 1; });
    h.forEach(function (m) {
      botRow(m.role, botHtml(m.text), m.owner ? "pd-bot-owner" : "");
      // Câu đã chuyển PickDee mà chưa có trả lời → báo đang chờ (khách vẫn hỏi bot tiếp được)
      if (m.handoff && m.qid && !answered[m.qid] && Date.now() - (m.t || 0) < BOT_WAIT_MS) {
        const w = document.createElement("div");
        w.className = "pd-bot-wait";
        w.textContent = "⏳ Đang chờ PickDee trả lời…";
        botMsgs.appendChild(w);
      }
    });
    if (typing) botRow("bot", "Em đang xem thông tin…", "pd-bot-typing");
    // Nút header chỉ dùng khi nhân viên trả lời trong chat nhân viên (support-admin)
    botHumanBtn.textContent = "💬 Xem trả lời (" + botUnread + ")";
    botHumanBtn.classList.toggle("pd-show", botUnread > 0);
    botHumanBtn.classList.toggle("pd-hot", botUnread > 0);
    botMsgs.scrollTop = botMsgs.scrollHeight;
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
    const plan = {
      product: { wait: 18000, scroll: 0.45, minWait: 7000 },
      shop: { wait: 30000, scroll: 0.6, minWait: 12000 },
      academy: { wait: 25000, scroll: 0.5, minWait: 10000 },
      all: { wait: 40000, scroll: 0, minWait: 0 }
    }[BOT_PAGE];
    // Chỉ trang khách đang chọn mua/chọn khoá (không làm phiền học viên, Coach, trang đăng nhập…)
    const salesPage = /^\/(shop-product|shop|academy|find-coach|index)?(\.html)?\/?$/.test(location.pathname);
    if (!plan || !salesPage || botStaffPage()) return;
    try {
      if (sessionStorage.getItem(SEEN)) return;
      if (Date.now() - Number(localStorage.getItem(OFF) || 0) < 864e5) return;
    } catch (_) { return; }

    const st = document.createElement("style");
    st.textContent = `
      #pdTease{position:absolute;right:0;bottom:66px;width:max-content;max-width:min(270px,calc(100vw - 32px));padding:12px 34px 12px 14px;border-radius:16px 16px 4px 16px;background:#fff;color:#0f1d3a;font-size:14px;line-height:1.4;box-shadow:0 10px 30px rgba(10,20,50,.28);cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}
      #pdTease.pd-on{opacity:1;transform:none}
      #pdTease b{color:#0f1d3a}
      #pdTease .pd-tease-go{display:inline-block;margin-top:6px;font-weight:800;color:#1a7f37}
      #pdTease button{position:absolute;top:4px;right:4px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#667;font-size:16px;cursor:pointer}
      #pickdeeSupportRoot:has(#pickdeeSupportPanel.open) #pdTease{display:none}
    `;
    document.head.appendChild(st);

    let timer = null, done = false;
    const t0 = Date.now();

    function text() {
      const name = botProductName();
      const short = name.length > 42 ? name.slice(0, 40).trim() + "…" : name;
      return {
        product: short
          ? "Anh/chị đang cân nhắc <b>" + botEsc(short) + "</b>? Em tư vấn nhanh loại/màu phù hợp và phí ship ạ."
          : "Anh/chị cần tư vấn sản phẩm này? Em trả lời ngay ạ.",
        shop: "Anh/chị cần chọn vợt hay phụ kiện phù hợp? Cho em biết trình độ và ngân sách, em gợi ý ngay ạ.",
        academy: "Anh/chị muốn học 1 kèm 1 hay nhóm 2 người? Em tư vấn gói học phù hợp trình độ ạ.",
        all: "Anh/chị cần chọn vợt hay tìm khoá học Pickleball? Em tư vấn ngay ạ."
      }[BOT_PAGE];
    }

    function busy() {
      if (panel.classList.contains("open")) return true;
      if (botHistory().length) return true; // đã chat trong phiên → không làm phiền
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
      box.innerHTML = text() + '<br><span class="pd-tease-go">Hỏi ngay →</span><button type="button" aria-label="Đóng">×</button>';
      openBtn.parentNode.insertBefore(box, openBtn);
      requestAnimationFrame(function () { box.classList.add("pd-on"); });
      const hide = function () { box.remove(); };
      box.querySelector("button").addEventListener("click", function (e) {
        e.stopPropagation();
        try { localStorage.setItem(OFF, String(Date.now())); } catch (_) {}
        hide();
      });
      box.addEventListener("click", function () { hide(); openPanel(); });
      openBtn.addEventListener("click", hide, { once: true });
      setTimeout(hide, 25000); // tự ẩn, không che trang lâu
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

    timer = setTimeout(show, plan.wait);
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
