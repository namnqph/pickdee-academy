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
  const BOT_HUMAN = "pickdee_bot_human";
  const BOT_VID = "pickdee_bot_vid";
  const BOT_SUGGEST = [
    "Giá vợt ESS/ON?",
    "Phí ship thế nào?",
    "Học phí các gói học?",
    "Tra cứu đơn hàng"
  ];

  const botBox = document.getElementById("pickdeeSupportBot");
  let botBusy = false;
  let botLastQuestion = "";

  (function botStyle() {
    const st = document.createElement("style");
    st.textContent = `
      #pickdeeSupportBot{min-height:0;flex:1;display:none;flex-direction:column}
      #pdBotMsgs{min-height:0;flex:1;padding:15px 14px;overflow-y:auto;overscroll-behavior:contain}
      #pdBotMsgs a{color:#d8ff45;font-weight:800;word-break:break-all}
      .pd-bot-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 12px}
      .pd-bot-chip{padding:8px 11px;border-radius:999px;border:1px solid rgba(216,255,69,.3);background:rgba(216,255,69,.07);color:#d8ff45;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .pd-bot-typing{opacity:.6;font-style:italic}
      #pdBotHumanBar{padding:0 74px 8px 11px}
      #pdBotHuman{width:100%;min-height:40px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:12px;font-weight:900;cursor:pointer}
      #pdBotHuman.pd-hot{background:#d8ff45;color:#142300;border-color:#d8ff45}
      #pdBotComposer{padding:11px;display:flex;align-items:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,.09);background:rgba(3,17,38,.82)}
      #pdBotInput{min-width:0;flex:1;min-height:44px;max-height:105px;padding:11px 12px;resize:none;outline:none;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-size:16px;line-height:1.4}
      #pdBotInput:focus{border-color:rgba(216,255,69,.48)}
      #pdBotSend{flex:0 0 44px;height:44px;border:0;border-radius:12px;background:#d8ff45;color:#142300;font-size:18px;font-weight:900;cursor:pointer}
      #pdBotSend:disabled{opacity:.5}
    `;
    document.head.appendChild(st);
  })();

  botBox.innerHTML = `
    <div id="pdBotMsgs"></div>
    <div id="pdBotHumanBar"><button id="pdBotHuman" type="button">👩 Gặp nhân viên PickDee</button></div>
    <div id="pdBotComposer">
      <textarea id="pdBotInput" rows="1" maxlength="500" placeholder="Hỏi trợ lý PickDee..."></textarea>
      <button id="pdBotSend" type="button" aria-label="Gửi câu hỏi">➤</button>
    </div>`;

  const botMsgs = document.getElementById("pdBotMsgs");
  const botInput = document.getElementById("pdBotInput");
  const botSend = document.getElementById("pdBotSend");
  const botHumanBtn = document.getElementById("pdBotHuman");

  function botEnabled() {
    try { return !sessionStorage.getItem(BOT_HUMAN); } catch (_) { return true; }
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
    botRow("bot",
      "Chào anh/chị 👋 Em là <b>trợ lý PickDee</b>. Em trả lời nhanh về sản phẩm, giá, phí ship, gói học. " +
      "Câu nào em không chắc, em sẽ mời anh/chị gặp nhân viên ạ.");
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
    let hot = false;
    h.forEach(function (m) {
      botRow(m.role, botHtml(m.text));
      hot = !!m.handoff;
    });
    if (typing) botRow("bot", "Em đang xem thông tin…", "pd-bot-typing");
    botHumanBtn.classList.toggle("pd-hot", hot);
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

    let answer = "Xin lỗi anh/chị, trợ lý đang bận. Anh/chị bấm \"Gặp nhân viên PickDee\" hoặc gọi/Zalo 0926 629 966 nhé.";
    let handoff = true;
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
          page: location.pathname,
          history: prev.slice(-6).map(function (m) { return { role: m.role, text: m.text }; })
        })
      });
      const d = await res.json();
      if (d && d.answer) { answer = d.answer; handoff = !!d.handoff; }
    } catch (e) {
      console.warn("PickDee bot:", e);
    }
    botSave(h.concat([{ role: "bot", text: answer, handoff: handoff }]));
    botBusy = false;
    botSend.disabled = false;
    renderBot(false);
  }

  function showBot() {
    showError("");
    guestBox.style.display = "none";
    chatBox.style.display = "none";
    botBox.style.display = "flex";
    renderBot(false);
  }

  async function goHuman() {
    try { sessionStorage.setItem(BOT_HUMAN, "1"); } catch (_) {}
    botBox.style.display = "none";
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
      KHÁCH MỚI: TRỢ LÝ PICKDEE TRẢ LỜI TRƯỚC
    */

    if (
      botEnabled()
    ) {

      showBot();

      return;

    }


    /*
      GUEST MỚI
    */

    chatBox.style.display =
      "none";


    guestBox.style.display =
      "block";


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
