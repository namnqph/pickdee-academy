(() => {

  if (
    window.__PICKDEE_SHOP_NOTIFICATIONS_LOADED__
  ) {
    return;
  }

  window.__PICKDEE_SHOP_NOTIFICATIONS_LOADED__ =
    true;


  const CHECK_INTERVAL =
    30000;


  let client =
    null;

  let panelOpen =
    false;

  let notificationRows =
    [];


  function getSupabaseClient() {

    return (
      window.sb
      ||
      window.supabaseClient
      ||
      null
    );

  }


  function escapeHtml(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function formatTime(value) {

    if (!value) {
      return "";
    }


    const date =
      new Date(value);


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
    ).format(date);

  }


  function addStyles() {

    if (
      document.getElementById(
        "pickdee-shop-notification-style"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "pickdee-shop-notification-style";


    style.textContent = `

      #pickdeeShopNotificationRoot {

        position:fixed;

        top:11px;
        right:190px;

        z-index:99999;

        font-family:inherit;

      }


      .pdsn-bell {

        position:relative;

        width:42px;
        height:42px;

        display:flex;
        align-items:center;
        justify-content:center;

        border:
          1px solid rgba(255,255,255,.14);

        border-radius:12px;

        background:#0d1d2f;

        color:#ffffff;

        cursor:pointer;

        box-shadow:
          0 8px 24px rgba(0,0,0,.22);

      }


      .pdsn-bell:hover {

        border-color:#d8ff45;

      }


      .pdsn-badge {

        position:absolute;

        top:-6px;
        right:-6px;

        min-width:20px;
        height:20px;

        padding:0 5px;

        display:none;

        align-items:center;
        justify-content:center;

        border-radius:999px;

        border:
          2px solid #071523;

        background:#ff5c69;

        color:#ffffff;

        font-size:10px;
        font-weight:950;

      }


      .pdsn-badge.show {

        display:flex;

      }


      .pdsn-panel {

        position:absolute;

        top:50px;
        right:0;

        width:
          min(
            390px,
            calc(100vw - 24px)
          );

        max-height:560px;

        overflow:hidden;

        display:none;

        border:
          1px solid rgba(255,255,255,.12);

        border-radius:16px;

        background:#0d1d2f;

        box-shadow:
          0 20px 60px rgba(0,0,0,.48);

      }


      .pdsn-panel.open {

        display:block;

      }


      .pdsn-head {

        padding:15px;

        display:flex;
        align-items:center;
        justify-content:space-between;

        gap:10px;

        border-bottom:
          1px solid rgba(255,255,255,.08);

      }


      .pdsn-title {

        color:#ffffff;

        font-size:14px;
        font-weight:950;

      }


      .pdsn-read-all {

        padding:0;

        border:0;

        background:transparent;

        color:#d8ff45;

        font-size:10px;
        font-weight:900;

        cursor:pointer;

      }


      .pdsn-list {

        max-height:470px;

        overflow-y:auto;

      }


      .pdsn-item {

        padding:14px 15px;

        border-bottom:
          1px solid rgba(255,255,255,.07);

        background:transparent;

        cursor:pointer;

      }


      .pdsn-item:hover {

        background:
          rgba(255,255,255,.035);

      }


      .pdsn-item.unread {

        background:
          rgba(216,255,69,.07);

      }


      .pdsn-item-title {

        color:#ffffff;

        font-size:13px;
        font-weight:950;

        line-height:1.4;

      }


      .pdsn-item-message {

        margin-top:5px;

        color:
          rgba(255,255,255,.62);

        font-size:11px;

        line-height:1.5;

      }


      .pdsn-item-time {

        margin-top:7px;

        color:
          rgba(255,255,255,.35);

        font-size:9px;

      }


      .pdsn-empty {

        padding:30px 18px;

        text-align:center;

        color:
          rgba(255,255,255,.48);

        font-size:11px;

      }


      @media(max-width:700px) {

        #pickdeeShopNotificationRoot {

          top:11px;
          right:84px;

        }


        .pdsn-panel {

          position:fixed;

          top:66px;

          left:12px;
          right:12px;

          width:auto;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  function createBell() {

    if (
      document.getElementById(
        "pickdeeShopNotificationRoot"
      )
    ) {

      return;

    }


    const root =
      document.createElement(
        "div"
      );


    root.id =
      "pickdeeShopNotificationRoot";


    root.innerHTML = `

      <button
        id="pickdeeShopNotificationBell"
        class="pdsn-bell"
        type="button"
        aria-label="Thông báo PickDee Shop"
        title="Thông báo PickDee Shop"
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
          id="pickdeeShopNotificationBadge"
          class="pdsn-badge"
        >
          0
        </span>

      </button>


      <div
        id="pickdeeShopNotificationPanel"
        class="pdsn-panel"
      >

        <div class="pdsn-head">

          <div class="pdsn-title">
            🔔 PickDee Shop
          </div>


          <button
            id="pickdeeShopNotificationReadAll"
            class="pdsn-read-all"
            type="button"
          >
            ĐÁNH DẤU ĐÃ ĐỌC
          </button>

        </div>


        <div
          id="pickdeeShopNotificationList"
          class="pdsn-list"
        >

          <div class="pdsn-empty">
            Đang tải thông báo...
          </div>

        </div>

      </div>

    `;


    document.body.appendChild(
      root
    );


    const bell =
      document.getElementById(
        "pickdeeShopNotificationBell"
      );


    const panel =
      document.getElementById(
        "pickdeeShopNotificationPanel"
      );


    bell?.addEventListener(
      "click",
      async function (event) {

        event.stopPropagation();


        panelOpen =
          !panelOpen;


        panel?.classList.toggle(
          "open",
          panelOpen
        );


        if (panelOpen) {

          await loadNotifications();

        }

      }
    );


    document
      .getElementById(
        "pickdeeShopNotificationReadAll"
      )
      ?.addEventListener(
        "click",
        async function (event) {

          event.stopPropagation();

          await markAllRead();

        }
      );


    document.addEventListener(
      "click",
      function (event) {

        const currentRoot =
          document.getElementById(
            "pickdeeShopNotificationRoot"
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


          panel?.classList.remove(
            "open"
          );

        }

      }
    );

  }


  function renderBadge(count) {

    const badge =
      document.getElementById(
        "pickdeeShopNotificationBadge"
      );


    if (!badge) {

      return;

    }


    const number =
      Number(
        count || 0
      );


    if (number <= 0) {

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
        String(number);


    badge.classList.add(
      "show"
    );

  }


  function renderNotifications() {

    const list =
      document.getElementById(
        "pickdeeShopNotificationList"
      );


    if (!list) {

      return;

    }


    if (
      !notificationRows.length
    ) {

      list.innerHTML = `

        <div class="pdsn-empty">

          ✅ Chưa có thông báo Shop.

        </div>

      `;

      return;

    }


    list.innerHTML =
      notificationRows
        .map(
          function (item) {

            return `

              <div
                class="pdsn-item ${
                  item.is_read
                  ?
                    ""
                  :
                    "unread"
                }"
                data-notification-id="${item.id}"
              >

                <div class="pdsn-item-title">

                  ${escapeHtml(
                    item.title
                  )}

                </div>


                <div class="pdsn-item-message">

                  ${escapeHtml(
                    item.message
                  )}

                </div>


                <div class="pdsn-item-time">

                  ${escapeHtml(
                    formatTime(
                      item.created_at
                    )
                  )}

                </div>

              </div>

            `;

          }
        )
        .join("");


    list
      .querySelectorAll(
        ".pdsn-item"
      )
      .forEach(
        function (element) {

          element.addEventListener(
            "click",
            async function () {

              const id =
                Number(
                  element.dataset
                    .notificationId
                );


              const item =
                notificationRows.find(
                  row =>
                    Number(row.id)
                    ===
                    id
                );


              if (!item) {

                return;

              }


              await markRead(
                id
              );


              if (item.link) {

                window.location.href =
                  item.link;

              }

            }
          );

        }
      );

  }


  async function loadUnreadCount() {

    if (!client) {

      return;

    }


    const {
      data,
      error
    } =
      await client.rpc(
        "get_shop_unread_notification_count"
      );


    if (error) {

      console.warn(
        "SHOP NOTIFICATION COUNT ERROR:",
        error
      );

      renderBadge(0);

      return;

    }


    renderBadge(
      data || 0
    );

  }


  async function loadNotifications() {

    if (!client) {

      return;

    }


    const list =
      document.getElementById(
        "pickdeeShopNotificationList"
      );


    if (list) {

      list.innerHTML = `

        <div class="pdsn-empty">

          Đang tải thông báo...

        </div>

      `;

    }


    const {
      data,
      error
    } =
      await client.rpc(
        "get_shop_notifications",
        {
          p_limit:
            30
        }
      );


    if (error) {

      console.warn(
        "SHOP NOTIFICATION LIST ERROR:",
        error
      );


      if (list) {

        list.innerHTML = `

          <div class="pdsn-empty">

            Không tải được thông báo Shop.

          </div>

        `;

      }


      return;

    }


    notificationRows =
      Array.isArray(data)
      ?
        data
      :
        [];


    renderNotifications();

  }


  async function markRead(id) {

    if (!client) {

      return;

    }


    const {
      error
    } =
      await client.rpc(
        "mark_shop_notification_read",
        {
          p_notification_id:
            id
        }
      );


    if (error) {

      console.warn(
        "SHOP NOTIFICATION READ ERROR:",
        error
      );

      return;

    }


    const item =
      notificationRows.find(
        row =>
          Number(row.id)
          ===
          Number(id)
      );


    if (item) {

      item.is_read =
        true;

    }


    renderNotifications();

    await loadUnreadCount();

  }


  async function markAllRead() {

    if (!client) {

      return;

    }


    const {
      error
    } =
      await client.rpc(
        "mark_all_shop_notifications_read"
      );


    if (error) {

      console.warn(
        "SHOP NOTIFICATION READ ALL ERROR:",
        error
      );

      return;

    }


    notificationRows =
      notificationRows.map(
        item => ({
          ...item,
          is_read:
            true
        })
      );


    renderNotifications();

    renderBadge(0);

  }


  async function syncExistingShopPushSubscription() {

    try {

      if (
        !client
        ||
        !("serviceWorker" in navigator)
        ||
        !("PushManager" in window)
      ) {

        return;

      }


      const {
        data:
          sessionData
      } =
        await client.auth.getSession();


      if (
        !sessionData?.session?.user
      ) {

        return;

      }


      const registration =
        await navigator
          .serviceWorker
          .ready;


      const subscription =
        await registration
          .pushManager
          .getSubscription();


      if (!subscription) {

        console.warn(
          "PickDee Shop Push: thiết bị này chưa có Push subscription."
        );

        return;

      }


      const json =
        subscription.toJSON();


      const endpoint =
        subscription.endpoint;


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

        console.warn(
          "PickDee Shop Push: subscription không đầy đủ."
        );

        return;

      }


      const {
        error
      } =
        await client.rpc(
          "register_shop_push_subscription",
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

        console.warn(
          "PickDee Shop Push register error:",
          error
        );

        return;

      }


      console.log(
        "PickDee Shop Push: đăng ký thiết bị thành công."
      );

    }
    catch (error) {

      console.warn(
        "PickDee Shop Push sync error:",
        error
      );

    }

  }


  async function init() {

    addStyles();

    createBell();


    let attempts =
      0;


    while (
      !client
      &&
      attempts < 30
    ) {

      client =
        getSupabaseClient();


      if (!client) {

        await new Promise(
          resolve =>
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
        "PickDee Shop Notifications: chưa tìm thấy Supabase client."
      );

      return;

    }


    await syncExistingShopPushSubscription();

    await loadUnreadCount();


    setInterval(
      function () {

        loadUnreadCount();


        if (panelOpen) {

          loadNotifications();

        }

      },
      CHECK_INTERVAL
    );


    window.addEventListener(
      "focus",
      function () {

        syncExistingShopPushSubscription();

        loadUnreadCount();

      }
    );


    window.PickDeeShopNotifications = {

      refresh:
        async function () {

          await syncExistingShopPushSubscription();

          await loadUnreadCount();


          if (panelOpen) {

            await loadNotifications();

          }

        }

    };
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
