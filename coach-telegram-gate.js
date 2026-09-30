/* =========================================================
   PICKDEE ACADEMY
   COACH TELEGRAM GROUP REQUIRED GATE

   Coach bắt buộc:
   1. Đã đăng nhập
   2. Đã kết nối Telegram Bot
   3. Đang là thành viên nhóm Coach PickDee

   Dùng chung cho toàn bộ khu vực Coach.
========================================================= */

(async function () {

  if (
    window.PICKDEE_COACH_TELEGRAM_GATE_LOADED
  ) {
    return;
  }

  window.PICKDEE_COACH_TELEGRAM_GATE_LOADED =
    true;


  const cfg =
    window.PICKDEE_CONFIG
    ||
    {};


  let sb =
    window.PICKDEE_SUPABASE
    ||
    window.supabaseClient
    ||
    window.sb
    ||
    null;


  /*
    Một số trang Coach cũ chưa chia sẻ client.
    Nếu chưa có thì tạo client từ config hiện tại.
  */

  if (
    !sb
    &&
    window.supabase
    &&
    cfg.SUPABASE_URL
    &&
    cfg.SUPABASE_PUBLISHABLE_KEY
  ) {

    sb =
      window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_PUBLISHABLE_KEY
      );

  }


  if (!sb) {

    console.error(
      "COACH TELEGRAM GATE: Supabase client chưa sẵn sàng."
    );

    return;

  }


  const GROUP_URL =
    "https://t.me/+BT7RjTZZsMRjMjU1";


  let checking =
    false;


  /* =====================================================
     STYLE
  ===================================================== */

  const style =
    document.createElement(
      "style"
    );


  style.id =
    "pickdeeCoachTelegramGateStyle";


  style.textContent = `

    #pickdeeCoachTelegramGate {
      position: fixed;
      inset: 0;
      z-index: 999999;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 20px;

      background:
        radial-gradient(
          circle at 80% 10%,
          rgba(80,255,190,.12),
          transparent 30%
        ),
        linear-gradient(
          145deg,
          #041733,
          #062456 50%,
          #03142d
        );

      color: #fff;

      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }


    #pickdeeCoachTelegramGate[hidden] {
      display: none !important;
    }


    .pickdee-coach-gate-card {
      width:
        min(
          520px,
          100%
        );

      padding: 28px;

      border-radius: 20px;

      border:
        1px solid rgba(216,255,69,.28);

      background:
        rgba(6,39,88,.96);

      box-shadow:
        0 20px 70px rgba(0,0,0,.36);

      text-align: center;
    }


    .pickdee-coach-gate-icon {
      margin-bottom: 12px;

      font-size: 46px;
    }


    .pickdee-coach-gate-eyebrow {
      margin-bottom: 8px;

      color: #d8ff45;

      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1px;
    }


    .pickdee-coach-gate-title {
      margin:
        0 0 12px;

      color: #fff;

      font-size: 27px;
      font-weight: 900;
    }


    .pickdee-coach-gate-text {
      margin-bottom: 21px;

      color:
        rgba(255,255,255,.72);

      font-size: 14px;
      line-height: 1.65;
    }


    .pickdee-coach-gate-status {
      min-height: 22px;

      margin-bottom: 14px;

      color: #ffd884;

      font-size: 13px;
      font-weight: 800;
      line-height: 1.5;
    }


    .pickdee-coach-gate-actions {
      display: grid;

      gap: 10px;
    }


    .pickdee-coach-gate-btn {
      width: 100%;
      min-height: 50px;

      display: flex;
      align-items: center;
      justify-content: center;

      padding:
        0 16px;

      border-radius: 11px;

      border:
        1px solid rgba(255,255,255,.15);

      background:
        rgba(255,255,255,.07);

      color: #fff;

      text-decoration: none;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      font-size: 14px;
      font-weight: 900;

      cursor: pointer;
    }


    .pickdee-coach-gate-btn.primary {
      border: 0;

      background: #d8ff45;

      color: #172600;
    }


    .pickdee-coach-gate-btn:disabled {
      opacity: .55;

      cursor: wait;
    }


    .pickdee-coach-gate-logout {
      margin-top: 17px;

      padding: 8px;

      border: 0;

      background: transparent;

      color:
        rgba(255,255,255,.48);

      font-size: 12px;
      font-weight: 800;

      cursor: pointer;
    }


    @media(max-width:600px) {

      .pickdee-coach-gate-card {
        padding:
          24px 18px;
      }


      .pickdee-coach-gate-title {
        font-size: 23px;
      }

    }

  `;


  document.head.appendChild(
    style
  );


  /* =====================================================
     TẠO MÀN HÌNH KHÓA
  ===================================================== */

  const gate =
    document.createElement(
      "div"
    );


  gate.id =
    "pickdeeCoachTelegramGate";


  gate.innerHTML = `

    <div class="pickdee-coach-gate-card">

      <div class="pickdee-coach-gate-icon">
        🔒
      </div>

      <div class="pickdee-coach-gate-eyebrow">
        PICKDEE ACADEMY · COACH
      </div>

      <h2 class="pickdee-coach-gate-title">
        Hoàn tất thiết lập Coach
      </h2>

      <div class="pickdee-coach-gate-text">
        Để sử dụng khu vực Coach của PickDee Academy,
        bạn cần kết nối Telegram và tham gia
        nhóm vận hành Coach PickDee.
      </div>

      <div
        id="pickdeeCoachGateStatus"
        class="pickdee-coach-gate-status"
      >
        Đang kiểm tra trạng thái Telegram...
      </div>

      <div
        id="pickdeeCoachGateActions"
        class="pickdee-coach-gate-actions"
      ></div>

      <button
        id="pickdeeCoachGateLogout"
        class="pickdee-coach-gate-logout"
        type="button"
      >
        ĐĂNG XUẤT TÀI KHOẢN
      </button>

    </div>

  `;


  document.body.appendChild(
    gate
  );


  const statusEl =
    document.getElementById(
      "pickdeeCoachGateStatus"
    );


  const actionsEl =
    document.getElementById(
      "pickdeeCoachGateActions"
    );


  const logoutBtn =
    document.getElementById(
      "pickdeeCoachGateLogout"
    );


  const oldBodyOverflow =
    document.body.style.overflow;


  document.body.style.overflow =
    "hidden";


  /* =====================================================
     KHÓA / MỞ
  ===================================================== */

  function lockCoach() {

    gate.hidden =
      false;


    document.body.style.overflow =
      "hidden";

  }


  function unlockCoach() {

    gate.hidden =
      true;


    document.body.style.overflow =
      oldBodyOverflow;

  }


  /* =====================================================
     CHƯA KẾT NỐI TELEGRAM
  ===================================================== */

  function renderConnectTelegram() {

    lockCoach();


    statusEl.textContent =
      "Bạn chưa kết nối tài khoản Telegram với PickDee.";


    actionsEl.innerHTML = `

      <button
        id="pickdeeCoachConnectTelegram"
        class="pickdee-coach-gate-btn primary"
        type="button"
      >
        ✈️ KẾT NỐI TELEGRAM
      </button>

      <button
        id="pickdeeCoachConnectRetry"
        class="pickdee-coach-gate-btn"
        type="button"
      >
        ↻ KIỂM TRA LẠI
      </button>

    `;


    document
      .getElementById(
        "pickdeeCoachConnectTelegram"
      )
      ?.addEventListener(
        "click",
        async function () {

          const button =
            this;


          button.disabled =
            true;


          button.textContent =
            "ĐANG TẠO LIÊN KẾT...";


          try {

            const {
              data: token,
              error
            } =
              await sb.rpc(
                "coach_create_telegram_link_token"
              );


            if (
              error
              ||
              !token
            ) {

              throw (
                error
                ||
                new Error(
                  "Không tạo được liên kết Telegram."
                )
              );

            }


            window.location.href =
              "https://t.me/PickDeeCoachBot?start="
              +
              encodeURIComponent(
                String(token)
              );

          }
          catch (error) {

            console.error(
              "COACH TELEGRAM GATE CONNECT:",
              error
            );


            statusEl.textContent =
              "Không tạo được liên kết Telegram. Vui lòng thử lại.";


            button.disabled =
              false;


            button.textContent =
              "✈️ KẾT NỐI TELEGRAM";

          }

        }
      );


    document
      .getElementById(
        "pickdeeCoachConnectRetry"
      )
      ?.addEventListener(
        "click",
        checkTelegramGate
      );

  }


  /* =====================================================
     ĐÃ KẾT NỐI NHƯNG CHƯA VÀO NHÓM
  ===================================================== */

  function renderJoinGroup() {

    lockCoach();


    statusEl.textContent =
      "Telegram đã kết nối ✅ · Bạn chưa tham gia nhóm Coach PickDee.";


    actionsEl.innerHTML = `

      <a
        class="pickdee-coach-gate-btn primary"
        href="${GROUP_URL}"
        target="_blank"
        rel="noopener noreferrer"
      >
        👥 THAM GIA NHÓM COACH
      </a>

      <button
        id="pickdeeCoachMembershipRetry"
        class="pickdee-coach-gate-btn"
        type="button"
      >
        ✓ TÔI ĐÃ THAM GIA · KIỂM TRA LẠI
      </button>

    `;


    document
      .getElementById(
        "pickdeeCoachMembershipRetry"
      )
      ?.addEventListener(
        "click",
        checkTelegramGate
      );

  }


  /* =====================================================
     LỖI KIỂM TRA
     FAIL CLOSED
  ===================================================== */

  function renderCheckError() {

    lockCoach();


    statusEl.textContent =
      "Chưa xác minh được trạng thái Telegram. Vui lòng kiểm tra lại.";


    actionsEl.innerHTML = `

      <button
        id="pickdeeCoachGateRetry"
        class="pickdee-coach-gate-btn primary"
        type="button"
      >
        ↻ KIỂM TRA LẠI
      </button>

    `;


    document
      .getElementById(
        "pickdeeCoachGateRetry"
      )
      ?.addEventListener(
        "click",
        checkTelegramGate
      );

  }


  /* =====================================================
     KIỂM TRA TELEGRAM
  ===================================================== */

  async function checkTelegramGate() {

    if (checking) {
      return;
    }


    checking =
      true;


    lockCoach();


    statusEl.textContent =
      "Đang kiểm tra trạng thái Telegram...";


    actionsEl.innerHTML =
      "";


    try {

      /* 1. ĐĂNG NHẬP */

      const {
        data: {
          session
        },
        error: sessionError
      } =
        await sb.auth.getSession();


      if (
        sessionError
        ||
        !session
      ) {

        window.location.replace(
          "/login"
        );

        return;

      }


      /* 2. ĐÃ KẾT NỐI TELEGRAM BOT */

      const {
        data: telegramStatus,
        error: telegramError
      } =
        await sb.rpc(
          "coach_get_telegram_status"
        );


      if (telegramError) {

        console.error(
          "COACH TELEGRAM STATUS:",
          telegramError
        );


        renderCheckError();

        return;

      }


      if (
        telegramStatus?.connected
        !==
        true
      ) {

        renderConnectTelegram();

        return;

      }


      /* 3. ĐANG Ở TRONG NHÓM COACH */

      const {
        data: groupStatus,
        error: groupError
      } =
        await sb.functions.invoke(
          "coach-telegram-group-status",
          {
            body: {}
          }
        );


      if (groupError) {

        console.error(
          "COACH TELEGRAM GROUP STATUS:",
          groupError
        );


        renderCheckError();

        return;

      }


      if (
        groupStatus?.connected === true
        &&
        groupStatus?.joined === true
      ) {

        console.log(
          "✓ Coach Telegram group gate PASS."
        );


        unlockCoach();

        return;

      }


      renderJoinGroup();

    }
    catch (error) {

      console.error(
        "COACH TELEGRAM REQUIRED GATE:",
        error
      );


      renderCheckError();

    }
    finally {

      checking =
        false;

    }

  }


  /* =====================================================
     QUAY LẠI TỪ TELEGRAM
  ===================================================== */

  window.addEventListener(
    "focus",
    function () {

      if (
        !gate.hidden
      ) {

        setTimeout(
          checkTelegramGate,
          700
        );

      }

    }
  );


  /* =====================================================
     ĐĂNG XUẤT
  ===================================================== */

  logoutBtn.addEventListener(
    "click",
    async function () {

      try {

        await sb.auth.signOut();

      }
      finally {

        window.location.replace(
          "/login"
        );

      }

    }
  );


  /* =====================================================
     START
  ===================================================== */

  await checkTelegramGate();


})();
