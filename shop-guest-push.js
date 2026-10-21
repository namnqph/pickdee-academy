/* =========================================================
   PICKDEE SHOP – Khách (không tài khoản) bật thông báo đơn hàng
   Trang chỉ cần đặt <div class="pd-gpush-slot" data-token="..."></div> (token theo dõi đơn).
   Thẻ tự gắn lại khi trang vẽ lại (shop-track tự tải lại 30 giây).
   Đăng ký: RPC shop_guest_push_subscribe; gửi: Edge shop-guest-push (cron).
   iPhone chưa cài: hướng dẫn "Thêm vào MH chính" + manifest riêng mở thẳng đơn này (/m/shop-track).
========================================================= */
(function () {
  if (window.PDGuestPush) return;

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const inApp = /Zalo|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|TikTok|musical_ly|; wv\)/i.test(ua);
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const BELL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  const css = `
  .pd-gpush{display:flex;gap:12px;align-items:flex-start;margin:14px 0;padding:16px;border-radius:16px;text-align:left;
    background:rgba(255,201,52,.07);border:1px solid rgba(255,201,52,.32);color:#fff}
  .pd-gpush-ic{flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;
    background:#ffc934;color:#0f0f0f}
  .pd-gpush-main{flex:1;min-width:0}
  .pd-gpush-t{margin:0 0 4px;font-size:15px;font-weight:800;color:#fff}
  .pd-gpush-d{margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,.72)}
  .pd-gpush-d b{color:#ffc934}
  .pd-gpush-btn{margin-top:10px;min-height:44px;padding:0 18px;border:0;border-radius:12px;background:#ffc934;color:#0f0f0f;
    font:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:transform .12s ease-out}
  .pd-gpush-btn:active{transform:scale(.97)}
  .pd-gpush-btn[disabled]{opacity:.6}
  .pd-gpush-err{margin:8px 0 0;font-size:12px;color:#ff8a80}`;

  function sb() { return window.sb || window.supabaseClient || null; }

  function keyBytes(base64) {
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  function setManifest(token) {
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) { link = document.createElement("link"); link.rel = "manifest"; document.head.appendChild(link); }
    link.href = "/m/shop-track?token=" + encodeURIComponent(token);
  }

  async function save(token, sub) {
    const j = sub.toJSON();
    const client = sb();
    if (!client) throw new Error("Chưa tải xong, anh/chị thử lại.");
    const { data, error } = await client.rpc("shop_guest_push_subscribe", {
      p_token: token, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: ua.slice(0, 300)
    });
    if (error || !data || data.success !== true) throw new Error((data && data.message) || "Không lưu được, anh/chị thử lại.");
    try { localStorage.setItem("pd_gpush_" + token.slice(0, 16), "1"); } catch (_) {}
  }

  async function enable(token) {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Anh/chị chưa cho phép thông báo. Có thể bật lại trong Cài đặt trình duyệt.");
    const vapid = String((window.PICKDEE_CONFIG || {}).VAPID_PUBLIC_KEY || "").trim();
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) });
    await save(token, sub);
  }

  async function current() {
    if (!supported || Notification.permission !== "granted") return null;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? reg.pushManager.getSubscription() : null;
  }

  function card(icon, title, desc, btn) {
    return `<div class="pd-gpush" role="region" aria-label="Thông báo đơn hàng">
      <div class="pd-gpush-ic">${icon}</div>
      <div class="pd-gpush-main"><p class="pd-gpush-t">${title}</p><p class="pd-gpush-d">${desc}</p>${btn || ""}</div></div>`;
  }

  const stateOf = {};

  function render(slot, token, state) {
    stateOf[token] = state;
    const after = slot.getAttribute("data-after") === "1";
    const desc = after
      ? "Nhận tin từ PickDee Shop: <b>hàng mới về</b> và nhắc khi bóng, quấn cán <b>cần thay</b>."
      : "Nhận tin khi đơn <b>được gửi đi</b> và <b>giao tới</b>, không cần mở lại trang này.";
    if (state === "done") {
      slot.innerHTML = card(CHECK, "Đã bật thông báo", after
        ? "PickDee Shop sẽ gửi tin hàng mới và nhắc thay đồ tới máy này."
        : "PickDee Shop sẽ báo khi đơn được gửi đi và giao tới máy này.");
    }
    else if (state === "ios") {
      setManifest(token);
      slot.innerHTML = card(BELL, "Nhận thông báo đơn hàng",
        "Trên iPhone: bấm nút <b>Chia sẻ</b> → <b>Thêm vào MH chính</b>, mở <b>PickDee Shop</b> từ màn hình chính rồi bấm Bật thông báo.");
    }
    else if (state === "inapp") {
      slot.innerHTML = card(BELL, "Nhận thông báo đơn hàng",
        "Mở link này bằng <b>" + (isIOS ? "Safari" : "Chrome") + "</b> để bật thông báo từ PickDee Shop.");
    }
    else if (state === "button") {
      slot.innerHTML = card(BELL, "Nhận thông báo đơn hàng", desc,
        '<button type="button" class="pd-gpush-btn">Bật thông báo</button>');
      const btn = slot.querySelector(".pd-gpush-btn");
      btn.addEventListener("click", async function () {
        btn.disabled = true; btn.textContent = "Đang bật…";
        const old = slot.querySelector(".pd-gpush-err"); if (old) old.remove();
        try { await enable(token); render(slot, token, "done"); }
        catch (e) {
          btn.disabled = false; btn.textContent = "Bật thông báo";
          const p = document.createElement("p"); p.className = "pd-gpush-err";
          p.textContent = (e && e.message) || "Không bật được, anh/chị thử lại.";
          btn.after(p);
        }
      });
    }
    else slot.innerHTML = "";
  }

  async function mount(slot) {
    const token = String(slot.getAttribute("data-token") || "").trim();
    if (token.length < 32) return;
    slot.setAttribute("data-mounted", "1");

    if (!document.getElementById("pd-gpush-style")) {
      const s = document.createElement("style"); s.id = "pd-gpush-style"; s.textContent = css; document.head.appendChild(s);
    }

    if (stateOf[token]) { render(slot, token, stateOf[token]); return; }

    if (!supported) return render(slot, token, isIOS && !standalone && !inApp ? "ios" : inApp ? "inapp" : "hidden");
    if (Notification.permission === "denied") return render(slot, token, "hidden");

    try {
      const sub = await current();
      if (sub) {
        let saved = false;
        try { saved = localStorage.getItem("pd_gpush_" + token.slice(0, 16)) === "1"; } catch (_) {}
        if (!saved) await save(token, sub).catch(() => {});
        return render(slot, token, "done");
      }
    } catch (_) {}

    render(slot, token, "button");
  }

  function scan() {
    document.querySelectorAll(".pd-gpush-slot:not([data-mounted])").forEach(mount);
  }

  window.PDGuestPush = { scan };
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan); else scan();
})();
