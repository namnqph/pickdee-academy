/* Khách hỏi bot Shop (bot_logs) — hiện trong /support-admin cạnh chat với người.
   Đọc trực tiếp bot_logs (RLS bot_logs_admin_read: chỉ admin). Câu chuyển anh mà chưa trả lời → nhãn "Chờ anh". */
(function () {
  "use strict";

  const box = document.getElementById("botInbox");
  if (!box) return;

  const list = box.querySelector(".bot-inbox-list");
  const sub = box.querySelector(".bot-inbox-sub");
  const opened = new Set();
  let firstLoad = true;
  let lastSig = "";
  let showClosed = false;
  let lastRows = [];

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(iso) {
    const d = new Date(iso);
    const p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + " " + p(d.getDate()) + "/" + p(d.getMonth() + 1);
  }

  function isPending(row) {
    return row.handoff && !row.owner_answer;
  }

  function render(rows) {
    const groups = new Map();
    rows.forEach(function (r) {
      const key = r.visitor_id || "?";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });

    const threads = Array.from(groups.entries()).map(function (entry) {
      const items = entry[1].sort(function (a, b) { return a.id - b.id; });
      return {
        visitor: entry[0],
        items: items,
        last: items[items.length - 1],
        pending: items.filter(isPending).length,
        closed: items.every(function (r) { return r.admin_closed_at; })
      };
    }).sort(function (a, b) {
      return a.closed - b.closed || (b.pending > 0) - (a.pending > 0) || b.last.id - a.last.id;
    });

    const openThreads = threads.filter(function (t) { return !t.closed; });
    const closedCount = threads.length - openThreads.length;
    const pendingTotal = openThreads.reduce(function (s, t) { return s + t.pending; }, 0);
    const shown = showClosed ? threads : openThreads;

    sub.innerHTML =
      openThreads.length + " khách đang mở · 30 ngày" +
      (pendingTotal ? ' · <b class="bot-wait">' + pendingTotal + " câu chờ anh</b>" : "");

    const toggle = closedCount
      ? '<button class="bot-toggle" type="button" data-act="toggle">' +
          (showClosed ? "Ẩn chat đã đóng" : "Xem chat đã đóng (" + closedCount + ")") + "</button>"
      : "";

    if (!shown.length) {
      list.innerHTML = '<div class="empty-list">Không có khách nào đang chờ.</div>' + toggle;
      return;
    }

    if (firstLoad) {
      threads.forEach(function (t) { if (t.pending) opened.add(t.visitor); });
      firstLoad = false;
    }

    list.innerHTML = shown.map(function (t) {
      const msgs = t.items.map(function (r) {
        let html =
          '<div class="bot-q"><span>Khách</span>' + esc(r.question) +
          '<em>' + fmt(r.created_at) + (r.page ? " · " + esc(r.page) : "") + "</em></div>" +
          '<div class="bot-a"><span>Bot</span>' + esc(r.answer) + "</div>";
        if (r.owner_answer) {
          html += '<div class="bot-a bot-owner"><span>Anh trả lời</span>' + esc(r.owner_answer) + "</div>";
        } else if (r.handoff) {
          html += '<div class="bot-pending">Chờ anh trả lời — trên Telegram gõ <b>#Q' + r.id + "</b> + câu trả lời (hiện ngay trong khung chat của khách)</div>";
        }
        return html;
      }).join("");

      const v = esc(t.visitor);
      const actions = t.closed
        ? '<button class="status-btn" type="button" data-act="reopen" data-v="' + v + '">Mở lại</button>' +
          '<button class="status-btn bot-del" type="button" data-act="delete" data-v="' + v + '">Xóa</button>'
        : '<button class="status-btn close" type="button" data-act="close" data-v="' + v + '">Đóng chat</button>';

      return (
        '<details class="bot-thread' + (t.closed ? " is-closed" : "") + '" data-v="' + v + '"' + (opened.has(t.visitor) ? " open" : "") + ">" +
          "<summary>" +
            '<div class="bot-top"><b>Khách ' + esc(t.visitor.slice(0, 6)) + "</b>" +
              (t.pending && !t.closed ? '<span class="bot-badge">Chờ anh</span>' : "") +
              (t.closed ? '<span class="bot-closed">Đã đóng</span>' : "") +
              "<i>" + fmt(t.last.created_at) + "</i></div>" +
            '<div class="bot-prev">' + esc(t.last.question) + " · " + t.items.length + " câu</div>" +
          "</summary>" +
          '<div class="bot-msgs">' + msgs + '<div class="bot-actions">' + actions + "</div></div>" +
        "</details>"
      );
    }).join("") + toggle;

    list.querySelectorAll(".bot-thread").forEach(function (el) {
      el.addEventListener("toggle", function () {
        if (el.open) opened.add(el.dataset.v); else opened.delete(el.dataset.v);
      });
    });
  }

  async function load() {
    const sb = window.pdSupportSb;
    if (!sb) return;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data, error } = await sb
      .from("bot_logs")
      .select("id,created_at,visitor_id,page,question,answer,handoff,owner_answer,admin_closed_at")
      .gte("created_at", since)
      .not("visitor_id", "like", "claude-test%")
      .order("id", { ascending: false })
      .limit(300);

    if (error) {
      sub.textContent = "Không tải được: " + error.message;
      return;
    }
    const sig = JSON.stringify(data || []);
    if (sig === lastSig) return;
    lastSig = sig;
    lastRows = data || [];
    render(lastRows);
  }

  list.addEventListener("click", async function (e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === "toggle") {
      showClosed = !showClosed;
      render(lastRows);
      return;
    }

    const v = btn.dataset.v;
    if (act === "delete" && !window.confirm(
      "Xóa vĩnh viễn toàn bộ câu hỏi của khách " + v.slice(0, 6) + "?\n\nKhông thể khôi phục."
    )) return;

    const sb = window.pdSupportSb;
    btn.disabled = true;
    btn.textContent = "Đang xử lý...";
    const res = act === "delete"
      ? await sb.rpc("support_admin_bot_delete", { p_visitor: v })
      : await sb.rpc("support_admin_bot_close", { p_visitor: v, p_closed: act === "close" });

    if (res.error) {
      sub.textContent = "Lỗi: " + res.error.message;
      btn.disabled = false;
      return;
    }
    if (act !== "reopen") opened.delete(v);
    lastSig = "";
    await load();
  });

  function start() {
    if (!window.pdSupportSb) {
      setTimeout(start, 300);
      return;
    }
    load();
    setInterval(function () {
      if (!document.hidden) load();
    }, 30000);
  }

  start();
})();
