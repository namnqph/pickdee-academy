(() => {

  /* =====================================================
     KHÔNG LOAD LẶP
  ====================================================== */

  if (
    window.__PICKDEE_NOTIFICATIONS_LOADED__
  ) {
    return;
  }

  window.__PICKDEE_NOTIFICATIONS_LOADED__ =
    true;


  /* =====================================================
     CONFIG
  ====================================================== */

  const CHECK_INTERVAL =
    30000;


  let client =
    null;


  let currentRole =
    null;


  let panelOpen =
    false;


  let notificationRows =
    [];


  /* =====================================================
     SUPABASE
  ====================================================== */

  function isSupabaseClient(
    value
  ) {

    return Boolean(

      value
      &&
      typeof value.rpc === "function"
      &&
      value.auth
      &&
      typeof value.auth.getUser === "function"

    );

  }



  function getSupabaseClient() {


    /* ================================================
       BIẾN SB CÓ SẴN
    ================================================= */

    try {

      if (
        typeof sb !== "undefined"
        &&
        isSupabaseClient(sb)
      ) {

        return sb;

      }

    }
    catch (_) {}


    /* ================================================
       BIẾN SUPABASECLIENT CÓ SẴN
    ================================================= */

    try {

      if (
        typeof supabaseClient !== "undefined"
        &&
        isSupabaseClient(
          supabaseClient
        )
      ) {

        return supabaseClient;

      }

    }
    catch (_) {}


    /* ================================================
       TÌM CLIENT TRÊN WINDOW
    ================================================= */

    const existingClients = [

      window.sb,

      window.supabaseClient,

      window.PICKDEE_SUPABASE,

      window.__PICKDEE_NOTIFICATION_CLIENT__,

      window.supabase

    ];


    const existing =
      existingClients.find(
        isSupabaseClient
      );


    if (existing) {

      return existing;

    }


    /* ================================================
       TỰ TẠO CLIENT NẾU CẦN
    ================================================= */

    const cfg =
      window.PICKDEE_CONFIG || {};


    if (

      window.supabase
      &&
      typeof window.supabase.createClient
        === "function"
      &&
      cfg.SUPABASE_URL
      &&
      cfg.SUPABASE_PUBLISHABLE_KEY

    ) {


      window.__PICKDEE_NOTIFICATION_CLIENT__ =
        window.supabase.createClient(

          cfg.SUPABASE_URL,

          cfg.SUPABASE_PUBLISHABLE_KEY

        );


      return (
        window.__PICKDEE_NOTIFICATION_CLIENT__
      );

    }


    return null;

  }


  /* =====================================================
     ROLE
  ====================================================== */

  function normalizeRole(
    value
  ) {


    const role =
      String(
        value || ""
      )
        .trim()
        .toLowerCase()
        .replaceAll(
          "-",
          "_"
        )
        .replaceAll(
          " ",
          "_"
        );


    if (
      role === "admin"
      ||
      role === "administrator"
    ) {

      return "admin";

    }


    if (
      role === "coach"
      ||
      role === "trainer"
    ) {

      return "coach";

    }


    if (
      role === "student"
      ||
      role === "hoc_vien"
      ||
      role === "hocvien"
      ||
      role === "học_viên"
    ) {

      return "student";

    }


    return null;

  }



  function detectRoleFromPath() {


    const explicitRole =
      normalizeRole(
        window.PICKDEE_NOTIFICATION_ROLE
      );


    if (explicitRole) {

      return explicitRole;

    }


    const path =
      (
        window.location.pathname
        ||
        ""
      )
        .toLowerCase()
        .replace(
          /\/+$/,
          ""
        );


    if (
      path === "/admin"
      ||
      path.startsWith(
        "/admin-"
      )
    ) {

      return "admin";

    }


    if (
      path === "/coach"
      ||
      path.startsWith(
        "/coach-"
      )
    ) {

      return "coach";

    }


    if (
      path === "/student"
      ||
      path.startsWith(
        "/student-"
      )
    ) {

      return "student";

    }


    /*
      Trang đổi Coach thuộc khu vực Học viên.
    */

    if (
      path === "/change-coach"
    ) {

      return "student";

    }


    return null;

  }



  async function resolveRole() {


    const pathRole =
      detectRoleFromPath();


    if (pathRole) {

      return pathRole;

    }


    if (!client) {

      return null;

    }


    try {


      const {
        data: {
          user
        },
        error: userError
      } =
        await client.auth
          .getUser();


      if (
        userError
        ||
        !user
      ) {

        return null;

      }


      const {
        data,
        error
      } =
        await client
          .from(
            "profiles"
          )
          .select(
            "role"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();


      if (error) {

        console.warn(
          "Notification profile role:",
          error
        );

        return null;

      }


      return normalizeRole(
        data?.role
      );


    }
    catch (error) {


      console.warn(
        "Notification resolve role:",
        error
      );


      return null;

    }

  }


  /* =====================================================
     HELPERS
  ====================================================== */

  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }



  function formatTime(
    value
  ) {


    if (!value) {

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

        day:
          "2-digit",

        month:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit"

      }

    )
      .format(
        date
      );

  }


  /* =====================================================
     STYLE
  ====================================================== */

  function addStyles() {


    if (
      document.getElementById(
        "pickdee-notification-style"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "pickdee-notification-style";


    style.textContent = `

      #pickdeeNotificationRoot {

        position: fixed;

        top: 17px;

        right: 165px;

        z-index: 999999;

        font-family:
          Arial,
          Helvetica,
          sans-serif;

      }


      .pdn-bell {

        position: relative;

        width: 42px;

        height: 42px;

        border-radius: 12px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .20
          );

        background:
          #0b2342;

        color:
          white;

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        cursor:
          pointer;

        box-shadow:
          0 8px 25px
          rgba(
            0,
            0,
            0,
            .30
          );

      }


      .pdn-bell:hover {

        border-color:
          #d8ff45;

      }


      .pdn-badge {

        position:
          absolute;

        top:
          -7px;

        right:
          -7px;

        min-width:
          20px;

        height:
          20px;

        padding:
          0 5px;

        border-radius:
          999px;

        background:
          #ff5263;

        color:
          white;

        display:
          none;

        align-items:
          center;

        justify-content:
          center;

        font-size:
          11px;

        font-weight:
          900;

        border:
          2px solid
          #041733;

      }


      .pdn-badge.show {

        display:
          flex;

      }


      .pdn-panel {

        position:
          absolute;

        top:
          50px;

        right:
          0;

        width:
          380px;

        max-width:
          calc(
            100vw - 24px
          );

        max-height:
          560px;

        overflow:
          hidden;

        background:
          #0d2038;

        border:
          1px solid
          #294362;

        border-radius:
          16px;

        box-shadow:
          0 20px 60px
          rgba(
            0,
            0,
            0,
            .50
          );

        display:
          none;

      }


      .pdn-panel.open {

        display:
          block;

      }


      .pdn-head {

        padding:
          15px 16px;

        border-bottom:
          1px solid
          #294362;

        display:
          flex;

        justify-content:
          space-between;

        align-items:
          center;

        gap:
          10px;

      }


      .pdn-title {

        color:
          white;

        font-size:
          18px;

        font-weight:
          900;

      }


      .pdn-read-all {

        border:
          0;

        background:
          transparent;

        color:
          #d8ff45;

        font-weight:
          800;

        cursor:
          pointer;

        font-size:
          12px;

      }


      .pdn-list {

        max-height:
          480px;

        overflow-y:
          auto;

      }


      .pdn-item {

        padding:
          14px 16px;

        border-bottom:
          1px solid
          rgba(
            255,
            255,
            255,
            .07
          );

        cursor:
          pointer;

      }


      .pdn-item.unread {

        background:
          rgba(
            216,
            255,
            69,
            .08
          );

      }


      .pdn-item:hover {

        background:
          rgba(
            255,
            255,
            255,
            .05
          );

      }


      .pdn-item.task-alert {

        border-left:
          3px solid
          #ff8e8e;

      }


      .pdn-item-title {

        color:
          white;

        font-size:
          14px;

        font-weight:
          900;

      }


      .pdn-item-message {

        color:
          #b7c4d4;

        font-size:
          13px;

        line-height:
          1.45;

        margin-top:
          5px;

      }


      .pdn-item-time {

        color:
          #71839b;

        font-size:
          11px;

        margin-top:
          7px;

      }


      .pdn-task-label {

        margin-top:
          7px;

        color:
          #ffb1b1;

        font-size:
          11px;

        font-weight:
          900;

      }


      .pdn-empty {

        padding:
          30px 16px;

        color:
          #94a4b8;

        text-align:
          center;

        font-size:
          13px;

      }


      @media(
        max-width:
        700px
      ) {

        #pickdeeNotificationRoot {

          top:
            13px;

          right:
            78px;

        }


        .pdn-panel {

          position:
            fixed;

          top:
            65px;

          left:
            12px;

          right:
            12px;

          width:
            auto;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =====================================================
     BELL
  ====================================================== */

  function createBell() {


    /*
      Nếu trang Coach / Student cũ
      đã có chuông riêng,
      không tạo thêm chuông thứ hai.
    */

    if (

      document.getElementById(
        "coachNotificationRoot"
      )

      ||

      document.getElementById(
        "studentNotificationRoot"
      )

    ) {

      return false;

    }


    if (
      document.getElementById(
        "pickdeeNotificationRoot"
      )
    ) {

      return true;

    }


    const root =
      document.createElement(
        "div"
      );


    root.id =
      "pickdeeNotificationRoot";


    root.innerHTML = `

      <button

        id="pickdeeNotificationBell"

        class="pdn-bell"

        type="button"

        title="Thông báo"

        aria-label="Thông báo"

      >

        <svg

          width="21"

          height="21"

          viewBox="0 0 24 24"

          fill="none"

          stroke="currentColor"

          stroke-width="2"

          stroke-linecap="round"

          stroke-linejoin="round"

        >

          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
          ></path>

          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
          ></path>

        </svg>


        <span

          id="pickdeeNotificationBadge"

          class="pdn-badge"

        >
          0
        </span>

      </button>


      <div

        id="pickdeeNotificationPanel"

        class="pdn-panel"

      >


        <div class="pdn-head">


          <div class="pdn-title">

            🔔 Thông báo

          </div>


          <button

            id="pickdeeNotificationReadAll"

            class="pdn-read-all"

            type="button"

          >

            Đánh dấu tất cả đã đọc

          </button>


        </div>


        <div

          id="pickdeeNotificationList"

          class="pdn-list"

        >

          <div class="pdn-empty">

            Đang tải thông báo...

          </div>

        </div>


      </div>

    `;


    document.body.appendChild(
      root
    );


    /* ================================================
       CLICK CHUÔNG
    ================================================= */

    document
      .getElementById(
        "pickdeeNotificationBell"
      )
      ?.addEventListener(

        "click",

        async (
          event
        ) => {


          event.stopPropagation();


          panelOpen =
            !panelOpen;


          document
            .getElementById(
              "pickdeeNotificationPanel"
            )
            ?.classList.toggle(

              "open",

              panelOpen

            );


          if (panelOpen) {

            await loadNotifications();

          }

        }

      );


    /* ================================================
       ĐÁNH DẤU TẤT CẢ
    ================================================= */

    document
      .getElementById(
        "pickdeeNotificationReadAll"
      )
      ?.addEventListener(

        "click",

        async (
          event
        ) => {


          event.stopPropagation();


          await markAllRead();

        }

      );


    /* ================================================
       CLICK RA NGOÀI
    ================================================= */

    document.addEventListener(

      "click",

      (
        event
      ) => {


        const currentRoot =
          document.getElementById(
            "pickdeeNotificationRoot"
          );


        if (!currentRoot) {

          return;

        }


        if (
          !currentRoot.contains(
            event.target
          )
        ) {


          panelOpen =
            false;


          document
            .getElementById(
              "pickdeeNotificationPanel"
            )
            ?.classList.remove(
              "open"
            );

        }

      }

    );


    return true;

  }


  /* =====================================================
     BADGE
  ====================================================== */

  function renderBadge(
    count
  ) {


    const badge =
      document.getElementById(
        "pickdeeNotificationBadge"
      );


    if (!badge) {

      return;

    }


    const number =
      Number(
        count || 0
      );


    if (
      number <= 0
    ) {


      badge.textContent =
        "0";


      badge.classList.remove(
        "show"
      );


      return;

    }


    badge.textContent =
      number > 99
        ?
        "99+"
        :
        String(
          number
        );


    badge.classList.add(
      "show"
    );

  }


  /* =====================================================
     RENDER LIST
  ====================================================== */

  function renderNotifications() {


    const list =
      document.getElementById(
        "pickdeeNotificationList"
      );


    if (!list) {

      return;

    }


    if (
      !notificationRows.length
    ) {


      list.innerHTML = `

        <div class="pdn-empty">

          ✅ Bạn chưa có thông báo nào.

        </div>

      `;


      return;

    }


    list.innerHTML =
      notificationRows
        .map(
          (
            item
          ) => `

            <div

              class="
                pdn-item
                ${
                  item.is_read
                    ?
                    ""
                    :
                    "unread"
                }
                ${
                  item.is_task_alert
                    ?
                    "task-alert"
                    :
                    ""
                }
              "

              data-notification-key="${
                escapeHtml(
                  String(
                    item.id
                  )
                )
              }"

            >


              <div
                class="pdn-item-title"
              >

                ${escapeHtml(
                  item.title
                )}

              </div>


              <div
                class="pdn-item-message"
              >

                ${escapeHtml(
                  item.message
                )}

              </div>


              ${
                item.is_task_alert
                  ?
                  `

                    <div class="pdn-task-label">

                      ⚠️ ĐANG CHỜ ADMIN XỬ LÝ

                    </div>

                  `
                  :
                  ""
              }


              <div
                class="pdn-item-time"
              >

                ${escapeHtml(

                  formatTime(
                    item.created_at
                  )

                )}

              </div>


            </div>

          `
        )
        .join("");


    list
      .querySelectorAll(
        ".pdn-item"
      )
      .forEach(

        (
          element
        ) => {


          element.addEventListener(

            "click",

            async () => {


              const key =
                String(

                  element.dataset
                    .notificationKey

                  ||

                  ""

                );


              const item =
                notificationRows.find(

                  (
                    row
                  ) =>

                    String(
                      row.id
                    )
                    ===
                    key

                );


              if (!item) {

                return;

              }


              /* =======================================
                 TASK ĐỔI COACH

                 KHÔNG ĐÁNH DẤU ĐÃ ĐỌC.

                 CÒN PENDING THÌ CHUÔNG VẪN PHẢI BÁO.
              ======================================== */

              if (
                item.is_task_alert
                ===
                true
              ) {


                if (item.link) {

                  window.location.href =
                    item.link;

                }


                return;

              }


              /* =======================================
                 THÔNG BÁO THƯỜNG
              ======================================== */

              await markRead(
                Number(
                  item.id
                )
              );


              if (item.link) {


                window.location.href =
                  item.link;


              }
              else {


                await loadNotifications();


              }

            }

          );

        }

      );

  }


  /* =====================================================
     LOAD BADGE
  ====================================================== */

  async function loadUnreadCount() {


    if (
      !client
      ||
      !currentRole
    ) {

      return;

    }


    /* ================================================
       THÔNG BÁO CŨ CHƯA ĐỌC
    ================================================= */

    const {
      data,
      error
    } =
      await client.rpc(

        "get_unread_notification_count_for_role",

        {

          p_role:
            currentRole

        }

      );


    if (error) {


      console.warn(
        "Notification count:",
        error
      );


    }


    let total =
      error
        ?
        0
        :
        Number(
          data || 0
        );


    /* ================================================
       ADMIN:
       CỘNG YÊU CẦU ĐỔI COACH PENDING
    ================================================= */

    if (
      currentRole === "admin"
    ) {


      const {
        data: coachChangeRows,
        error: coachChangeError
      } =
        await client
          .from(
            "coach_change_requests"
          )
          .select(
            "id"
          )
          .eq(
            "status",
            "pending"
          );


      if (coachChangeError) {


        console.warn(
          "Coach change notification count:",
          coachChangeError
        );


      }
      else {


        total +=
          (
            coachChangeRows
            ||
            []
          ).length;


      }

    }


    renderBadge(
      total
    );

  }


  /* =====================================================
     LOAD DANH SÁCH THÔNG BÁO
  ====================================================== */

  async function loadNotifications() {


    if (
      !client
      ||
      !currentRole
    ) {

      return;

    }


    const list =
      document.getElementById(
        "pickdeeNotificationList"
      );


    if (list) {


      list.innerHTML = `

        <div class="pdn-empty">

          Đang tải thông báo...

        </div>

      `;


    }


    /* ================================================
       THÔNG BÁO CŨ
    ================================================= */

    const {
      data,
      error
    } =
      await client.rpc(

        "get_notifications_for_role",

        {

          p_role:
            currentRole,

          p_limit:
            30

        }

      );


    if (error) {


      console.warn(
        "Notification list:",
        error
      );


    }


    const normalRows =
      error
        ?
        []
        :
        (
          Array.isArray(
            data
          )
            ?
            data
            :
            []
        );


    let taskRows =
      [];


    /* ================================================
       ADMIN:
       LOAD YÊU CẦU ĐỔI COACH PENDING
    ================================================= */

    if (
      currentRole === "admin"
    ) {


      const {
        data: coachChangeRows,
        error: coachChangeError
      } =
        await client
          .from(
            "coach_change_requests"
          )
          .select(
            `

              id,

              reason,

              created_at,

              student:
                students!coach_change_requests_student_id_fkey (

                  full_name,

                  student_code

                ),

              current_coach:
                coaches!coach_change_requests_current_coach_id_fkey (

                  full_name

                ),

              requested_coach:
                coaches!coach_change_requests_requested_coach_id_fkey (

                  full_name

                )

            `
          )
          .eq(
            "status",
            "pending"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (coachChangeError) {


        console.warn(
          "Coach change notification list:",
          coachChangeError
        );


      }
      else {


        taskRows =
          (
            coachChangeRows
            ||
            []
          )
            .map(

              (
                item
              ) => {


                const studentName =
                  item.student?.full_name
                  ||
                  item.student?.student_code
                  ||
                  "Học viên";


                const oldCoach =
                  item.current_coach?.full_name
                  ||
                  "Coach hiện tại";


                const newCoach =
                  item.requested_coach?.full_name
                  ||
                  "Coach mới";


                return {

                  /*
                    ID DẠNG CHUỖI
                    ĐỂ KHÔNG TRÙNG ID THÔNG BÁO THẬT.
                  */

                  id:
                    "coach-change-"
                    +
                    item.id,


                  title:
                    "🔄 Yêu cầu đổi Coach",


                  message:
                    studentName
                    +
                    ": "
                    +
                    oldCoach
                    +
                    " → "
                    +
                    newCoach,


                  created_at:
                    item.created_at,


                  /*
                    TASK CHƯA XỬ LÝ LUÔN COI LÀ CHƯA ĐỌC.
                  */

                  is_read:
                    false,


                  is_task_alert:
                    true,


                  link:
                    "./admin-coach-change-requests"

                };

              }

            );


      }

    }


    /* ================================================
       TASK ĐƯỢC ĐƯA LÊN TRƯỚC
    ================================================= */

    notificationRows =
      [

        ...taskRows,

        ...normalRows

      ];


    renderNotifications();

  }


  /* =====================================================
     ĐÁNH DẤU 1 THÔNG BÁO ĐÃ ĐỌC
  ====================================================== */

  async function markRead(
    id
  ) {


    if (
      !client
      ||
      !currentRole
    ) {

      return;

    }


    /*
      Chỉ notification thật mới chạy RPC này.
      Task đổi Coach không gọi markRead().
    */

    if (
      !Number.isFinite(
        Number(id)
      )
    ) {

      return;

    }


    const {
      error
    } =
      await client.rpc(

        "mark_notification_read_for_role",

        {

          p_notification_id:
            Number(
              id
            ),

          p_role:
            currentRole

        }

      );


    if (error) {


      console.warn(
        "Mark notification:",
        error
      );


      return;

    }


    const item =
      notificationRows.find(

        (
          row
        ) =>

          !row.is_task_alert

          &&

          Number(
            row.id
          )
          ===
          Number(
            id
          )

      );


    if (item) {

      item.is_read =
        true;

    }


    renderNotifications();


    await loadUnreadCount();

  }


  /* =====================================================
     ĐÁNH DẤU TẤT CẢ THÔNG BÁO THƯỜNG ĐÃ ĐỌC
  ====================================================== */

  async function markAllRead() {


    if (
      !client
      ||
      !currentRole
    ) {

      return;

    }


    const {
      error
    } =
      await client.rpc(

        "mark_all_notifications_read_for_role",

        {

          p_role:
            currentRole

        }

      );


    if (error) {


      console.warn(
        "Mark all notifications:",
        error
      );


      return;

    }


    /*
      QUAN TRỌNG:

      Sau khi đánh dấu notification cũ đã đọc,
      LOAD LẠI.

      Nếu vẫn còn coach_change_requests pending,
      badge vẫn phải còn.
    */

    await loadNotifications();


    await loadUnreadCount();

  }


  /* =====================================================
     INIT
  ====================================================== */

  async function init() {


    /*
      Nếu trang chính Coach / Student
      vẫn đang dùng chuông trực tiếp cũ,
      không tạo chuông mới chồng lên.
    */

    if (

      document.getElementById(
        "coachNotificationRoot"
      )

      ||

      document.getElementById(
        "studentNotificationRoot"
      )

    ) {

      return;

    }


    /* ================================================
       TẠO GIAO DIỆN
    ================================================= */

    addStyles();


    createBell();


    /* ================================================
       CHỜ SUPABASE CLIENT
    ================================================= */

    let attempts =
      0;


    while (

      !client
      &&
      attempts < 40

    ) {


      client =
        getSupabaseClient();


      if (!client) {


        await new Promise(

          (
            resolve
          ) =>

            setTimeout(

              resolve,

              200

            )

        );


      }


      attempts +=
        1;

    }


    if (!client) {


      console.warn(
        "PickDee Notifications: chưa tìm thấy Supabase client."
      );


      const list =
        document.getElementById(
          "pickdeeNotificationList"
        );


      if (list) {


        list.innerHTML = `

          <div class="pdn-empty">

            Không kết nối được hệ thống thông báo.

          </div>

        `;


      }


      return;

    }


    /* ================================================
       XÁC ĐỊNH ROLE
    ================================================= */

    currentRole =
      await resolveRole();


    if (!currentRole) {


      console.warn(
        "PickDee Notifications: không xác định được role."
      );


      document
        .getElementById(
          "pickdeeNotificationRoot"
        )
        ?.remove();


      return;

    }


    console.log(

      "PickDee Notifications ready:",

      currentRole

    );


    /* ================================================
       LOAD LẦN ĐẦU
    ================================================= */

    await loadUnreadCount();


    /* ================================================
       TỰ KIỂM TRA MỖI 30 GIÂY
    ================================================= */

    setInterval(

      async () => {


        await loadUnreadCount();


        if (panelOpen) {

          await loadNotifications();

        }

      },

      CHECK_INTERVAL

    );


    /* ================================================
       QUAY LẠI TAB → UPDATE
    ================================================= */

    window.addEventListener(

      "focus",

      async () => {


        await loadUnreadCount();


        if (panelOpen) {

          await loadNotifications();

        }

      }

    );


    /* ================================================
       CHO CÁC TRANG KHÁC GỌI REFRESH
    ================================================= */

    window.PickDeeNotifications = {


      refresh:
        async () => {


          await loadUnreadCount();


          if (panelOpen) {

            await loadNotifications();

          }

        },


      role:
        () =>
          currentRole

    };

  }


  /* =====================================================
     START
  ====================================================== */

  if (
    document.readyState
    ===
    "loading"
  ) {


    document.addEventListener(

      "DOMContentLoaded",

      init

    );


  }
  else {


    init();


  }

  


})();

/* =========================================================
   PICKDEE WEB PUSH UI
   - Đăng ký thiết bị nhận Push
   - Lưu subscription vào Supabase
   - Không thay đổi hệ thống thông báo cũ
========================================================= */

(function () {

  if (
    window.__PICKDEE_PUSH_UI_LOADED__
  ) {
    return;
  }


  window.__PICKDEE_PUSH_UI_LOADED__ =
    true;



  function sleep(ms) {

    return new Promise(
      function (resolve) {
        setTimeout(
          resolve,
          ms
        );
      }
    );

  }



  function getPushSupabaseClient() {

    return (
      window.PICKDEE_SUPABASE
      ||
      window.PICKDEE_NOTIFICATION_SB
      ||
      window.supabaseClient
      ||
      window.sb
      ||
      null
    );

  }



  function isIOS() {

    return /iphone|ipad|ipod/i
      .test(
        navigator.userAgent
      );

  }



  function isStandalone() {

    return (
      (
        window.matchMedia
        &&
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches
      )
      ||
      window.navigator.standalone
        === true
    );

  }



  function urlBase64ToUint8Array(
    base64String
  ) {

    const padding =
      "=".repeat(
        (
          4
          -
          base64String.length % 4
        )
        %
        4
      );


    const base64 =
      (
        base64String
        +
        padding
      )
        .replace(
          /-/g,
          "+"
        )
        .replace(
          /_/g,
          "/"
        );


    const rawData =
      window.atob(
        base64
      );


    const outputArray =
      new Uint8Array(
        rawData.length
      );


    for (
      let i = 0;
      i < rawData.length;
      i += 1
    ) {

      outputArray[i] =
        rawData.charCodeAt(i);

    }


    return outputArray;

  }



  async function getPushRegistration() {

  if (
    !(
      "serviceWorker"
      in navigator
    )
  ) {

    throw new Error(
      "Thiết bị không hỗ trợ Service Worker."
    );

  }


  /*
    Luôn đăng ký lại đúng /sw.js.

    Nếu thiết bị đang giữ Service Worker cũ,
    trình duyệt sẽ kiểm tra và cập nhật bản mới.
  */

  const registration =
    await navigator
      .serviceWorker
      .register(
        "/sw.js",
        {
          scope: "/",
          updateViaCache: "none"
        }
      );


  /*
    Ép kiểm tra phiên bản Service Worker mới nhất.
  */

  try {

    await registration.update();

  }
  catch (error) {

    console.warn(
      "PickDee SW update:",
      error
    );

  }


  await navigator
    .serviceWorker
    .ready;


  return registration;

} 

  async function savePushSubscription(
    subscription
  ) {

    const client =
      getPushSupabaseClient();


    if (!client) {

      throw new Error(
        "Chưa kết nối được Supabase."
      );

    }


    const {
      data: userData,
      error: userError
    } =
      await client
        .auth
        .getUser();


    if (
      userError
      ||
      !userData?.user
    ) {

      throw new Error(
        "Bạn cần đăng nhập PickDee trước khi bật thông báo."
      );

    }


    const json =
      subscription.toJSON();


    const endpoint =
      json?.endpoint
      ||
      subscription.endpoint
      ||
      "";


    const p256dh =
      json?.keys?.p256dh
      ||
      "";


    const authKey =
      json?.keys?.auth
      ||
      "";


    if (
      !endpoint
      ||
      !p256dh
      ||
      !authKey
    ) {

      throw new Error(
        "Push Subscription không đầy đủ."
      );

    }


    const {
      error
    } =
      await client.rpc(
        "register_push_subscription",
        {
          p_endpoint:
            endpoint,

          p_p256dh:
            p256dh,

          p_auth_key:
            authKey,

          p_user_agent:
            navigator.userAgent
        }
      );


    if (error) {

      throw error;

    }

  }



  async function refreshPushButton(
    button,
    status
  ) {

    if (
      !(
        "Notification"
        in window
      )
      ||
      !(
        "PushManager"
        in window
      )
      ||
      !(
        "serviceWorker"
        in navigator
      )
    ) {

      button.disabled =
        true;

      button.textContent =
        "THIẾT BỊ KHÔNG HỖ TRỢ PUSH";

      status.textContent =
        "Trình duyệt này chưa hỗ trợ Web Push.";

      return;

    }


    if (
      isIOS()
      &&
      !isStandalone()
    ) {

      button.disabled =
        true;

      button.textContent =
        "MỞ PICKDEE TỪ MÀN HÌNH CHÍNH";

      status.textContent =
        "Trên iPhone, hãy mở PickDee bằng icon đã thêm vào Màn hình chính.";

      return;

    }


    if (
      Notification.permission
      ===
      "denied"
    ) {

      button.disabled =
        true;

      button.textContent =
        "THÔNG BÁO ĐANG BỊ CHẶN";

      status.textContent =
        "Hãy bật quyền thông báo cho PickDee trong Cài đặt iPhone.";

      return;

    }


    try {

      const registration =
        await getPushRegistration();


      const subscription =
        await registration
          .pushManager
          .getSubscription();


if (subscription) {

  await savePushSubscription(
    subscription
  );

  button.disabled =
    false;

  button.textContent =
    "✅ THÔNG BÁO ĐÃ BẬT";

  status.textContent =
    "Thiết bị này đã đăng ký nhận thông báo PickDee.";

  return;

}

    }
    catch (error) {

      console.warn(
        "PICKDEE PUSH STATE:",
        error
      );

    }


    button.disabled =
      false;

    button.textContent =
      "📱 BẬT THÔNG BÁO TRÊN ĐIỆN THOẠI";

    status.textContent =
      "Nhận thông báo ngay khi có hoạt động mới.";

  }



  async function enablePushNotifications(
    button,
    status
  ) {

    try {

      button.disabled =
        true;

      status.textContent =
        "Đang bật thông báo...";


      if (
        !(
          "Notification"
          in window
        )
        ||
        !(
          "PushManager"
          in window
        )
      ) {

        throw new Error(
          "Thiết bị chưa hỗ trợ Web Push."
        );

      }


      if (
        isIOS()
        &&
        !isStandalone()
      ) {

        throw new Error(
          "Hãy mở PickDee từ icon ngoài Màn hình chính iPhone rồi bật thông báo."
        );

      }


      /*
        QUAN TRỌNG:
        requestPermission phải được gọi
        từ thao tác bấm trực tiếp của người dùng.
      */

      const permission =
        await Notification
          .requestPermission();


      if (
        permission
        !==
        "granted"
      ) {

        throw new Error(
          "Bạn chưa cho phép PickDee gửi thông báo."
        );

      }


      const vapidPublicKey =
        String(
          window.PICKDEE_CONFIG
            ?.VAPID_PUBLIC_KEY
          ||
          ""
        ).trim();


      if (!vapidPublicKey) {

        throw new Error(
          "Thiếu VAPID Public Key."
        );

      }


      const registration =
        await getPushRegistration();


      let subscription =
        await registration
          .pushManager
          .getSubscription();


      if (!subscription) {

        subscription =
          await registration
            .pushManager
            .subscribe(
              {
                userVisibleOnly:
                  true,

                applicationServerKey:
                  urlBase64ToUint8Array(
                    vapidPublicKey
                  )
              }
            );

      }


      await savePushSubscription(
        subscription
      );


      button.textContent =
        "✅ THÔNG BÁO ĐÃ BẬT";

      status.textContent =
        "Thiết bị này đã được đăng ký nhận thông báo PickDee.";

    }
    catch (error) {

      console.error(
        "PICKDEE ENABLE PUSH:",
        error
      );


      button.disabled =
        false;


      status.textContent =
        error instanceof Error
          ?
          error.message
          :
          String(error);

    }

  }



async function mountPushUi() {

  /*
    Hỗ trợ cả panel thông báo chung
    và panel riêng của Coach.
  */

  let panel = null;


  for (
    let i = 0;
    i < 50;
    i += 1
  ) {

        panel =
      document.getElementById(
        "pickdeeNotificationPanel"
      )
      ||
      document.getElementById(
        "coachNotificationPanel"
      )
      ||
      document.getElementById(
        "studentNotificationPanel"
      );


    if (panel) {
      break;
    }


    await sleep(
      100
    );

  }


  if (!panel) {

    console.warn(
      "PickDee Push: không tìm thấy notification panel."
    );

    return;

  }


  if (
    document.getElementById(
      "pickdeePushBox"
    )
  ) {

    return;

  }


    const list =
    document.getElementById(
      "pickdeeNotificationList"
    )
    ||
    document.getElementById(
      "coachNotificationList"
    )
    ||
    document.getElementById(
      "studentNotificationList"
    );


  const box =
    document.createElement(
      "div"
    );


  box.id =
    "pickdeePushBox";


  box.style.cssText =
    [
      "padding:12px 14px",
      "border-bottom:1px solid rgba(255,255,255,.08)",
      "background:rgba(216,255,69,.04)"
    ].join(";");


  box.innerHTML = `
    <button
      id="pickdeeEnablePushButton"
      type="button"
      style="
        width:100%;
        min-height:44px;
        border:0;
        border-radius:10px;
        padding:0 12px;
        background:#d8ff45;
        color:#071426;
        font-size:12px;
        font-weight:900;
        cursor:pointer;
      "
    >
      📱 BẬT THÔNG BÁO TRÊN ĐIỆN THOẠI
    </button>

    <div
      id="pickdeePushStatus"
      style="
        margin-top:8px;
        color:#94a4b8;
        font-size:11px;
        line-height:1.45;
      "
    >
      Đang kiểm tra trạng thái thông báo...
    </div>
  `;


  if (list) {

    panel.insertBefore(
      box,
      list
    );

  }
  else {

    panel.appendChild(
      box
    );

  }


  const button =
    document.getElementById(
      "pickdeeEnablePushButton"
    );


  const status =
    document.getElementById(
      "pickdeePushStatus"
    );


  button.addEventListener(
    "click",
    async function (event) {

      event.preventDefault();
      event.stopPropagation();


      await enablePushNotifications(
        button,
        status
      );

    }
  );


  await refreshPushButton(
    button,
    status
  );

}


  if (
    document.readyState
    ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      mountPushUi,
      {
        once: true
      }
    );

  }
  else {

    mountPushUi();

  }

})();
/* =========================================================
   PICKDEE SUPPORT
   Dùng chung cho khu vực Học viên + Coach
========================================================= */

(function () {

  const path =
    String(
      window.location.pathname || "/"
    )
      .toLowerCase()
      .replace(
        /\/+$/,
        ""
      );


 const isStudentPage =
  path === "/student"
  ||
  path === "/change-coach"
  ||
  path.startsWith(
    "/student-"
  );


  const isCoachPage =
    path === "/coach"
    ||
    path.startsWith(
      "/coach-"
    );


  /*
    Support nổi chỉ dành cho người dùng Academy.
    Không tự gắn vào Admin từ notifications.js.
  */
  if (
    !isStudentPage
    &&
    !isCoachPage
  ) {

    return;

  }


  let attempts =
    0;


  function loadPickDeeSupport() {

    if (
      document.getElementById(
        "pickdeeSupportRoot"
      )
    ) {

      return;

    }


    if (
      document.querySelector(
        'script[data-pickdee-support-loader="academy"]'
      )
    ) {

      return;

    }


    const cfg =
      window.PICKDEE_CONFIG || {};


    if (
      !window.supabase
      ||
      !cfg.SUPABASE_URL
      ||
      !cfg.SUPABASE_PUBLISHABLE_KEY
    ) {

      attempts +=
        1;


      if (
        attempts < 30
      ) {

        window.setTimeout(
          loadPickDeeSupport,
          300
        );

      }


      return;

    }


    const script =
      document.createElement(
        "script"
      );


    script.src =
      "/support-widget.js?v=20261013-1";


    script.async =
      true;


    script.dataset.pickdeeSupportLoader =
      "academy";


    document.body.appendChild(
      script
    );

  }


  if (
    document.readyState
    ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      loadPickDeeSupport,
      {
        once: true
      }
    );

  }
  else {

    loadPickDeeSupport();

  }

})();
