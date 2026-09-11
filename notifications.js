(() => {
  if (window.__PICKDEE_NOTIFICATIONS_LOADED__) return;
  window.__PICKDEE_NOTIFICATIONS_LOADED__ = true;

  const CHECK_INTERVAL = 30000;

  let client = null;
let panelOpen = false;
let notificationRows = [];
let currentRole = null;

  function getSupabaseClient() {
    try {
      if (typeof sb !== "undefined" && sb) return sb;
    } catch (_) {}

    try {
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        return supabaseClient;
      }
    } catch (_) {}

    return (
      window.sb ||
      window.supabaseClient ||
      window.supabase ||
      null
    );
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
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function addStyles() {
    if (document.getElementById("pickdee-notification-style")) return;

    const style = document.createElement("style");

    style.id = "pickdee-notification-style";

    style.textContent = `
      #pickdeeNotificationRoot {
        position: fixed;
        top: 18px;
        right: 175px;
        z-index: 99999;
        font-family: inherit;
      }

      .pdn-bell {
        position: relative;
        width: 42px;
        height: 42px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 12px;
        background: rgba(10,31,58,.95);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
      }

      .pdn-bell:hover {
        border-color: #b7ff00;
      }

      .pdn-badge {
        position: absolute;
        top: -7px;
        right: -7px;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 999px;
        background: #ff5c69;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid #08172b;
      }

      .pdn-badge.show {
        display: flex;
      }

      .pdn-panel {
        position: absolute;
        top: 50px;
        right: 0;
        width: min(390px, calc(100vw - 24px));
        max-height: 560px;
        overflow: hidden;
        background: #0d2038;
        border: 1px solid #294362;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,.45);
        display: none;
      }

      .pdn-panel.open {
        display: block;
      }

      .pdn-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #294362;
      }

      .pdn-title {
        color: #fff;
        font-size: 18px;
        font-weight: 800;
      }

      .pdn-read-all {
        border: 0;
        background: transparent;
        color: #b7ff00;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .pdn-list {
        overflow-y: auto;
        max-height: 480px;
      }

      .pdn-item {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        cursor: pointer;
        background: transparent;
      }

      .pdn-item:hover {
        background: rgba(255,255,255,.04);
      }

      .pdn-item.unread {
        background: rgba(183,255,0,.07);
      }

      .pdn-item-title {
        color: #fff;
        font-weight: 800;
        font-size: 14px;
        line-height: 1.35;
      }

      .pdn-item-message {
        color: #b7c4d4;
        font-size: 13px;
        line-height: 1.45;
        margin-top: 5px;
      }

      .pdn-item-time {
        color: #71839b;
        font-size: 11px;
        margin-top: 7px;
      }

      .pdn-empty {
        padding: 32px 18px;
        text-align: center;
        color: #94a4b8;
        font-size: 13px;
      }

      @media (max-width: 700px) {
        #pickdeeNotificationRoot {
          top: 14px;
          right: 72px;
        }

        .pdn-panel {
          position: fixed;
          top: 66px;
          right: 12px;
          left: 12px;
          width: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createBell() {
    if (document.getElementById("pickdeeNotificationRoot")) return;

    const root = document.createElement("div");
    root.id = "pickdeeNotificationRoot";

    root.innerHTML = `
      <button
        id="pickdeeNotificationBell"
        class="pdn-bell"
        type="button"
        aria-label="Thông báo"
        title="Thông báo"
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

        <span id="pickdeeNotificationBadge" class="pdn-badge">0</span>
      </button>

      <div id="pickdeeNotificationPanel" class="pdn-panel">
        <div class="pdn-head">
          <div class="pdn-title">🔔 Thông báo</div>

          <button
            id="pickdeeNotificationReadAll"
            class="pdn-read-all"
            type="button"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        <div id="pickdeeNotificationList" class="pdn-list">
          <div class="pdn-empty">Đang tải thông báo...</div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    document
      .getElementById("pickdeeNotificationBell")
      .addEventListener("click", async (event) => {
        event.stopPropagation();

        panelOpen = !panelOpen;

        document
          .getElementById("pickdeeNotificationPanel")
          .classList.toggle("open", panelOpen);

        if (panelOpen) {
          await loadNotifications();
        }
      });

    document
      .getElementById("pickdeeNotificationReadAll")
      .addEventListener("click", async (event) => {
        event.stopPropagation();
        await markAllRead();
      });

    document.addEventListener("click", (event) => {
      const root = document.getElementById(
        "pickdeeNotificationRoot"
      );

      if (!root) return;

      if (!root.contains(event.target)) {
        panelOpen = false;

        document
          .getElementById("pickdeeNotificationPanel")
          ?.classList.remove("open");
      }
    });
  }

  function renderBadge(count) {
    const badge = document.getElementById(
      "pickdeeNotificationBadge"
    );

    if (!badge) return;

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
    const list = document.getElementById(
      "pickdeeNotificationList"
    );

    if (!list) return;

    if (!notificationRows.length) {
      list.innerHTML = `
        <div class="pdn-empty">
          ✅ Bạn chưa có thông báo nào.
        </div>
      `;
      return;
    }

    list.innerHTML = notificationRows
      .map((item) => {
        return `
          <div
            class="pdn-item ${item.is_read ? "" : "unread"}"
            data-notification-id="${item.id}"
          >
            <div class="pdn-item-title">
              ${escapeHtml(item.title)}
            </div>

            <div class="pdn-item-message">
              ${escapeHtml(item.message)}
            </div>

            <div class="pdn-item-time">
              ${escapeHtml(formatTime(item.created_at))}
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll(".pdn-item").forEach((element) => {
      element.addEventListener("click", async () => {
        const id = Number(
          element.dataset.notificationId
        );

        const item = notificationRows.find(
          (row) => Number(row.id) === id
        );

        if (!item) return;

        await markRead(id);

        if (item.link) {
          window.location.href = item.link;
        }
      });
    });
  }
  function detectNotificationRole() {
    const explicitRole = String(
      window.PICKDEE_NOTIFICATION_ROLE || ""
    )
      .trim()
      .toLowerCase();

    if (
      explicitRole === "admin" ||
      explicitRole === "coach" ||
      explicitRole === "student"
    ) {
      return explicitRole;
    }

    const path = window.location.pathname
      .toLowerCase()
      .replace(/\/+$/, "");

    if (
      path === "/coach" ||
      path.startsWith("/coach-")
    ) {
      return "coach";
    }

    if (
      path === "/student" ||
      path.startsWith("/student-home") ||
      path.startsWith("/student-dashboard") ||
      path.startsWith("/student-my")
    ) {
      return "student";
    }

    if (
      path === "/admin" ||
      path.startsWith("/admin-")
    ) {
      return "admin";
    }

    return null;
  }


  async function loadUnreadCount() {
    if (!client || !currentRole) return;

    const { data, error } = await client.rpc(
      "get_unread_notification_count_for_role",
      {
        p_role: currentRole,
      }
    );

    if (error) {
      console.warn(
        "Notification unread count error:",
        error
      );

      renderBadge(0);
      return;
    }

    renderBadge(data || 0);
  }


  async function loadNotifications() {
    if (!client || !currentRole) return;

    const list = document.getElementById(
      "pickdeeNotificationList"
    );

    if (list) {
      list.innerHTML = `
        <div class="pdn-empty">
          Đang tải thông báo...
        </div>
      `;
    }


    const { data, error } = await client.rpc(
      "get_notifications_for_role",
      {
        p_role: currentRole,
        p_limit: 30,
      }
    );


    if (error) {
      console.warn(
        "Notification list error:",
        error
      );

      if (list) {
        list.innerHTML = `
          <div class="pdn-empty">
            Không tải được thông báo.
          </div>
        `;
      }

      return;
    }


    notificationRows = Array.isArray(data)
      ? data
      : [];

    renderNotifications();
  }


  async function markRead(id) {
    if (!client || !currentRole) return;

    const { error } = await client.rpc(
      "mark_notification_read_for_role",
      {
        p_notification_id: id,
        p_role: currentRole,
      }
    );


    if (error) {
      console.warn(
        "Mark notification read error:",
        error
      );

      return;
    }


    const item = notificationRows.find(
      (row) =>
        Number(row.id) === Number(id)
    );

    if (item) {
      item.is_read = true;
    }

    renderNotifications();

    await loadUnreadCount();
  }


  async function markAllRead() {
    if (!client || !currentRole) return;

    const { error } = await client.rpc(
      "mark_all_notifications_read_for_role",
      {
        p_role: currentRole,
      }
    );


    if (error) {
      console.warn(
        "Mark all notifications read error:",
        error
      );

      return;
    }


    notificationRows = notificationRows.map(
      (row) => ({
        ...row,
        is_read: true,
      })
    );

    renderNotifications();
    renderBadge(0);
  }
    renderBadge(0);
  }

  async function init() {
    addStyles();
    createBell();

    let attempts = 0;

    while (!client && attempts < 30) {
      client = getSupabaseClient();

      if (!client) {
        await new Promise((resolve) =>
          setTimeout(resolve, 200)
        );
      }

      attempts += 1;
    }

    if (!client) {
      console.warn(
        "PickDee Notifications: chưa tìm thấy Supabase client."
      );
      return;
    }
    currentRole = detectNotificationRole();

    if (!currentRole) {
      console.warn(
        "PickDee Notifications: không xác định được role của trang hiện tại."
      );

      document
        .getElementById("pickdeeNotificationRoot")
        ?.remove();

      return;
    }

    console.log(
      "PickDee Notifications role:",
      currentRole
    );
    await loadUnreadCount();

    setInterval(() => {
      loadUnreadCount();

      if (panelOpen) {
        loadNotifications();
      }
    }, CHECK_INTERVAL);

    window.addEventListener("focus", () => {
      loadUnreadCount();
    });

    window.PickDeeNotifications = {
      refresh: async () => {
        await loadUnreadCount();

        if (panelOpen) {
          await loadNotifications();
        }
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
