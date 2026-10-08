(() => {
  if (window.__PICKDEE_SHOP_NOTIFICATIONS_LOADED__) {
    return;
  }

  window.__PICKDEE_SHOP_NOTIFICATIONS_LOADED__ = true;

  const CHECK_INTERVAL = 30000;

  let client = null;
  let panelOpen = false;
  let notificationRows = [];

  function getSupabaseClient() {
    return window.sb || window.supabaseClient || null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function supportsShopWebPush() {
    return (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }

  function addStyles() {
    if (document.getElementById("pickdee-shop-notification-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pickdee-shop-notification-style";

    style.textContent = `
    #pickdeeShopNotificationRoot {
        position:fixed;
        top:11px;
       right:340px;
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
        border:1px solid rgba(255,255,255,.14);
        border-radius:12px;
        background:#0d1d2f;
        color:#ffffff;
        cursor:pointer;
        box-shadow:0 8px 24px rgba(0,0,0,.22);
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
        border:2px solid #071523;
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
        width:min(390px, calc(100vw - 24px));
        max-height:560px;
        overflow:hidden;
        display:none;
        border:1px solid rgba(255,255,255,.12);
        border-radius:16px;
        background:#0d1d2f;
        box-shadow:0 20px 60px rgba(0,0,0,.48);
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
        border-bottom:1px solid rgba(255,255,255,.08);
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
        border-bottom:1px solid rgba(255,255,255,.07);
        background:transparent;
        cursor:pointer;
      }

      .pdsn-item:hover {
        background:rgba(255,255,255,.035);
      }

      .pdsn-item.unread {
        background:rgba(216,255,69,.07);
      }

      .pdsn-item-title {
        color:#ffffff;
        font-size:13px;
        font-weight:950;
        line-height:1.4;
      }

      .pdsn-item-message {
        margin-top:5px;
        color:rgba(255,255,255,.62);
        font-size:11px;
        line-height:1.5;
      }

      .pdsn-item-time {
        margin-top:7px;
        color:rgba(255,255,255,.35);
        font-size:9px;
      }

      .pdsn-empty {
        padding:30px 18px;
        text-align:center;
        color:rgba(255,255,255,.48);
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

    document.head.appendChild(style);
  }

  function createBell() {
    if (document.getElementById("pickdeeShopNotificationRoot")) {
      return;
    }

    const root = document.createElement("div");
    root.id = "pickdeeShopNotificationRoot";

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
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        <span
          id="pickdeeShopNotificationBadge"
          class="pdsn-badge"
        >0</span>
      </button>

      <div
        id="pickdeeShopNotificationPanel"
        class="pdsn-panel"
      >
        <div class="pdsn-head">
          <div class="pdsn-title">🔔 PickDee Shop</div>

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

    document.body.appendChild(root);

    const bell = document.getElementById("pickdeeShopNotificationBell");
    const panel = document.getElementById("pickdeeShopNotificationPanel");

    bell?.addEventListener("click", async function (event) {
      event.stopPropagation();

      panelOpen = !panelOpen;

      panel?.classList.toggle("open", panelOpen);

      if (panelOpen) {
        await loadNotifications();
      }
    });

    document
      .getElementById("pickdeeShopNotificationReadAll")
      ?.addEventListener("click", async function (event) {
        event.stopPropagation();
        await markAllRead();
      });

    document.addEventListener("click", function (event) {
      const currentRoot = document.getElementById("pickdeeShopNotificationRoot");

      if (!currentRoot) {
        return;
      }

      if (!currentRoot.contains(event.target)) {
        panelOpen = false;
        panel?.classList.remove("open");
      }
    });
  }

  function renderBadge(count) {
    const badge = document.getElementById("pickdeeShopNotificationBadge");

    if (!badge) {
      return;
    }

    const number = Number(count || 0);

    if (number <= 0) {
      badge.textContent = "0";
      badge.classList.remove("show");
      return;
    }

    badge.textContent = number > 99 ? "99+" : String(number);
    badge.classList.add("show");
  }

  function renderNotifications() {
    const list = document.getElementById("pickdeeShopNotificationList");

    if (!list) {
      return;
    }

    if (!notificationRows.length) {
      list.innerHTML = `
        <div class="pdsn-empty">
          ✅ Chưa có thông báo Shop.
        </div>
      `;
      return;
    }

    list.innerHTML = notificationRows
      .map(function (item) {
        return `
          <div
            class="pdsn-item ${item.is_read ? "" : "unread"}"
            data-notification-id="${item.id}"
          >
            <div class="pdsn-item-title">
              ${escapeHtml(item.title)}
            </div>

            <div class="pdsn-item-message">
              ${escapeHtml(item.message)}
            </div>

            <div class="pdsn-item-time">
              ${escapeHtml(formatTime(item.created_at))}
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll(".pdsn-item").forEach(function (element) {
      element.addEventListener("click", async function () {
        const id = Number(element.dataset.notificationId);

        const item = notificationRows.find(
          row => Number(row.id) === id
        );

        if (!item) {
          return;
        }

        await markRead(id);

        if (item.link) {
          window.location.href = item.link;
        }
      });
    });
  }

  async function loadUnreadCount() {
    if (!client) {
      return;
    }

    const { data, error } = await client.rpc(
      "get_shop_unread_notification_count"
    );

    if (error) {
      console.warn("SHOP NOTIFICATION COUNT ERROR:", error);
      renderBadge(0);
      return;
    }

    renderBadge(data || 0);
  }

  async function loadNotifications() {
    if (!client) {
      return;
    }

    const list = document.getElementById("pickdeeShopNotificationList");

    if (list) {
      list.innerHTML = `
        <div class="pdsn-empty">
          Đang tải thông báo...
        </div>
      `;
    }

    const { data, error } = await client.rpc(
      "get_shop_notifications",
      {
        p_limit: 30
      }
    );

    if (error) {
      console.warn("SHOP NOTIFICATION LIST ERROR:", error);

      if (list) {
        list.innerHTML = `
          <div class="pdsn-empty">
            Không tải được thông báo Shop.
          </div>
        `;
      }

      return;
    }

    notificationRows = Array.isArray(data) ? data : [];
    renderNotifications();
  }

  async function markRead(id) {
    if (!client) {
      return;
    }

    const { error } = await client.rpc(
      "mark_shop_notification_read",
      {
        p_notification_id: id
      }
    );

    if (error) {
      console.warn("SHOP NOTIFICATION READ ERROR:", error);
      return;
    }

    const item = notificationRows.find(
      row => Number(row.id) === Number(id)
    );

    if (item) {
      item.is_read = true;
    }

    renderNotifications();
    await loadUnreadCount();
  }

  async function markAllRead() {
    if (!client) {
      return;
    }

    const { error } = await client.rpc(
      "mark_all_shop_notifications_read"
    );

    if (error) {
      console.warn("SHOP NOTIFICATION READ ALL ERROR:", error);
      return;
    }

    notificationRows = notificationRows.map(item => ({
      ...item,
      is_read: true
    }));

    renderNotifications();
    renderBadge(0);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);

    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
      [...rawData].map(char => char.charCodeAt(0))
    );
  }

  async function saveShopPushSubscription(subscription) {
    if (!client || !subscription) {
      return false;
    }

    const json = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = json?.keys?.p256dh || "";
    const authKey = json?.keys?.auth || "";

    if (!endpoint || !p256dh || !authKey) {
      console.warn("PickDee Shop Push: subscription không đầy đủ.");
      return false;
    }

    const { error } = await client.rpc(
      "register_shop_push_subscription",
      {
        p_endpoint: endpoint,
        p_p256dh: p256dh,
        p_auth_key: authKey,
        p_user_agent: navigator.userAgent
      }
    );

    if (error) {
      console.warn("PickDee Shop Push register error:", error);
      return false;
    }

    console.log("PickDee Shop Push: thiết bị đã được đăng ký role shop.");
    return true;
  }

  async function ensureShopPushSubscription(requestPermission = false) {
    try {
      if (!client || !supportsShopWebPush()) {
        return false;
      }

      const { data: sessionData } = await client.auth.getSession();

      if (!sessionData?.session?.user) {
        return false;
      }

      let permission = Notification.permission;

      if (permission === "default" && requestPermission) {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        if (permission === "denied") {
          console.warn("PickDee Shop Push: người dùng đã chặn quyền thông báo.");
        }

        return false;
      }

      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        try {
          registration = await navigator.serviceWorker.ready;
        }
        catch (error) {
          console.warn("PickDee Shop Push: chưa có Service Worker.", error);
          return false;
        }
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey = String(
          window.PICKDEE_CONFIG?.VAPID_PUBLIC_KEY || ""
        ).trim();

        if (!vapidPublicKey) {
          console.warn("PickDee Shop Push: thiếu VAPID_PUBLIC_KEY.");
          return false;
        }

        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
        }
        catch (error) {
          console.warn("PickDee Shop Push: không tạo được Push subscription.", error);
          return false;
        }
      }

      return await saveShopPushSubscription(subscription);
    }
    catch (error) {
      console.warn("PickDee Shop Push sync error:", error);
      return false;
    }
  }

  function bindShopPushPermissionToBell() {
    const panel = document.getElementById("pickdeeShopNotificationPanel");

    if (
      !panel ||
      document.getElementById("pickdeeShopPushBox")
    ) {
      return;
    }

    if (!document.getElementById("pickdee-shop-push-ui-style")) {
      const style = document.createElement("style");
      style.id = "pickdee-shop-push-ui-style";

      style.textContent = `
        .pdsn-push-box {
          padding:12px 15px;
          border-bottom:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.025);
        }

        .pdsn-push-btn {
          width:100%;
          min-height:38px;
          padding:9px 12px;
          border:1px solid #d8ff45;
          border-radius:10px;
          background:#d8ff45;
          color:#071523;
          font-size:10px;
          font-weight:950;
          cursor:pointer;
          transition:.18s ease;
        }

        .pdsn-push-btn:hover {
          transform:translateY(-1px);
        }

        .pdsn-push-btn.is-enabled {
          border-color:rgba(91,226,155,.45);
          background:rgba(91,226,155,.12);
          color:#5be29b;
          cursor:default;
        }

        .pdsn-push-btn.is-telegram {
          border-color:rgba(216,255,69,.36);
          background:rgba(216,255,69,.10);
          color:#d8ff45;
          cursor:default;
        }

        .pdsn-push-btn.is-blocked {
          border-color:rgba(255,255,255,.14);
          background:rgba(255,255,255,.06);
          color:rgba(255,255,255,.72);
          cursor:default;
        }

        .pdsn-push-btn.is-checking {
          border-color:rgba(255,255,255,.12);
          background:rgba(255,255,255,.06);
          color:rgba(255,255,255,.65);
          cursor:wait;
        }

        .pdsn-push-hint {
          margin-top:7px;
          color:rgba(255,255,255,.52);
          font-size:9px;
          line-height:1.45;
          text-align:center;
        }
      `;

      document.head.appendChild(style);
    }

    const box = document.createElement("div");
    box.id = "pickdeeShopPushBox";
    box.className = "pdsn-push-box";

    box.innerHTML = `
      <button
        id="pickdeeShopPushButton"
        class="pdsn-push-btn is-checking"
        type="button"
      >
        ĐANG KIỂM TRA THÔNG BÁO...
      </button>

      <div
        id="pickdeeShopPushHint"
        class="pdsn-push-hint"
      ></div>
    `;

    const list = document.getElementById("pickdeeShopNotificationList");

    if (list) {
      panel.insertBefore(box, list);
    }
    else {
      panel.appendChild(box);
    }

    const button = document.getElementById("pickdeeShopPushButton");
    const hint = document.getElementById("pickdeeShopPushHint");

    function showTelegramFallback(message) {
      if (!button) {
        return;
      }

      button.className = "pdsn-push-btn is-telegram";
      button.textContent = "✓ THÔNG BÁO QUA TELEGRAM";
      button.disabled = true;

      if (hint) {
        hint.textContent =
          message ||
          "Trình duyệt này không hỗ trợ Web Push. Đơn hàng vẫn báo qua nhóm Telegram; chuông này vẫn dùng để xem thông báo trong web.";
      }
    }

    async function refreshPushButton() {
      if (!button) {
        return;
      }

      button.className = "pdsn-push-btn is-checking";
      button.disabled = true;
      button.textContent = "ĐANG KIỂM TRA THÔNG BÁO...";

      if (hint) {
        hint.textContent = "";
      }

      if (!supportsShopWebPush()) {
        showTelegramFallback(
          "Thiết bị hoặc trình duyệt này không hỗ trợ Web Push. Đơn hàng vẫn báo qua nhóm Telegram; chuông này vẫn dùng để xem thông báo trong web."
        );
        return;
      }

      const permission = Notification.permission;

      if (permission === "denied") {
        showTelegramFallback(
          "Web Push đang bị chặn trên thiết bị này. Đơn hàng vẫn báo qua nhóm Telegram; chuông này vẫn dùng để xem thông báo trong web."
        );
        return;
      }

      let registration = null;

      try {
        registration = await navigator.serviceWorker.getRegistration();
      }
      catch (error) {
        console.warn("PickDee Shop Push registration check:", error);
      }

      let subscription = null;

      if (registration) {
        try {
          subscription = await registration.pushManager.getSubscription();
        }
        catch (error) {
          console.warn("PickDee Shop Push subscription check:", error);
        }
      }

      if (permission === "granted" && subscription) {
        button.className = "pdsn-push-btn is-enabled";
        button.textContent = "✓ THÔNG BÁO ĐÃ BẬT";
        button.disabled = true;

        if (hint) {
          hint.textContent = "Thiết bị này đang nhận thông báo PickDee Shop.";
        }

        return;
      }

      button.className = "pdsn-push-btn";
      button.textContent = "BẬT THÔNG BÁO";
      button.disabled = false;

      if (hint) {
        hint.textContent =
          permission === "granted"
            ? "Nhấn để hoàn tất đăng ký Push cho thiết bị này."
            : "Nhấn một lần để nhận thông báo trình duyệt. Đơn hàng vẫn đã báo qua Telegram.";
      }
    }

    button?.addEventListener("click", async function (event) {
      event.stopPropagation();

      if (!supportsShopWebPush()) {
        await refreshPushButton();
        return;
      }

      if (Notification.permission === "denied") {
        await refreshPushButton();
        return;
      }

      button.disabled = true;
      button.className = "pdsn-push-btn is-checking";
      button.textContent = "ĐANG BẬT THÔNG BÁO...";

      if (hint) {
        hint.textContent = "";
      }

      await ensureShopPushSubscription(true);
      await refreshPushButton();
    });

    refreshPushButton();

    setTimeout(refreshPushButton, 800);
    setTimeout(refreshPushButton, 2500);

    window.addEventListener("focus", refreshPushButton);
  }

  async function init() {
    addStyles();
    createBell();

    let attempts = 0;

    while (!client && attempts < 30) {
      client = getSupabaseClient();

      if (!client) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      attempts += 1;
    }

    if (!client) {
      console.warn("PickDee Shop Notifications: chưa tìm thấy Supabase client.");
      return;
    }

    bindShopPushPermissionToBell();

    await ensureShopPushSubscription(false);
    await loadUnreadCount();

    setInterval(function () {
      loadUnreadCount();

      if (panelOpen) {
        loadNotifications();
      }
    }, CHECK_INTERVAL);

    window.addEventListener("focus", function () {
      ensureShopPushSubscription(false);
      loadUnreadCount();
    });

    window.PickDeeShopNotifications = {
      refresh: async function () {
        await ensureShopPushSubscription(false);
        await loadUnreadCount();

        if (panelOpen) {
          await loadNotifications();
        }
      },

      enablePush: async function () {
        return await ensureShopPushSubscription(true);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  }
  else {
    init();
  }
})();
