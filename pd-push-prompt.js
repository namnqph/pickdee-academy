/* =========================================================
   PICKDEE – Bắt buộc bật thông báo (dùng chung)
   window.PD_PUSH_PROMPT = { mode: "full" | "ios-install", role: "Học viên" }
   - full:        mời bật thông báo (không có "Để sau") + hướng dẫn iPhone cài vào màn hình chính.
   - ios-install: chỉ hướng dẫn iPhone cài vào màn hình chính (trang đã có hộp bật thông báo riêng).
   - installText: (tuỳ chọn) câu giải thích riêng trong hướng dẫn cài iPhone.
   Đăng ký Push vẫn do notifications.js (#pickdeeEnablePushButton) thực hiện.
========================================================= */
(function () {

  const cfg = window.PD_PUSH_PROMPT || { mode: "full" };
  /* Báo cho pd-faceid.js biết màn bật thông báo đã xử lý xong (để không hiện chồng lên nhau) */
  let promptDone;
  window.PDPushPromptDone = new Promise(r => { promptDone = r; });
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const pushSupported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const isAndroid = /Android/i.test(ua);
  const inApp = /Zalo|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|TikTok|musical_ly|; wv\)/i.test(ua);

  const css = `
  .pdp-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
    padding:18px;background:rgba(3,10,20,.72);backdrop-filter:blur(6px)}
  .pdp-card{width:min(420px,100%);padding:22px 18px 18px;border-radius:22px;text-align:center;
    background:linear-gradient(160deg,#0f2747,#0a1a30);border:1px solid rgba(216,255,69,.35);
    box-shadow:0 30px 80px rgba(0,0,0,.55);color:#fff;font-family:inherit}
  .pdp-icon{font-size:42px;line-height:1}
  .pdp-title{margin:10px 0 6px;font-size:19px;font-weight:900;color:#d8ff45}
  .pdp-text{margin:0 0 14px;font-size:14px;line-height:1.55;color:rgba(255,255,255,.82)}
  .pdp-steps{margin:0 0 16px;padding:0;list-style:none;text-align:left;display:grid;gap:8px}
  .pdp-steps li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;
    background:rgba(255,255,255,.06);font-size:14px;line-height:1.45}
  .pdp-steps b{color:#d8ff45}
  .pdp-num{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:#d8ff45;color:#071523;font-size:12px;font-weight:900}
  .pdp-btn{width:100%;min-height:50px;border:0;border-radius:14px;background:#d8ff45;color:#071523;
    font-size:15px;font-weight:900;cursor:pointer;font-family:inherit}
  .pdp-btn[disabled]{opacity:.6}
  .pdp-note{margin-top:10px;font-size:12px;color:rgba(255,255,255,.6)}
  .pdp-link{margin-top:10px;background:none;border:0;color:rgba(255,255,255,.55);font-size:12px;
    text-decoration:underline;cursor:pointer;font-family:inherit}`;

  function overlay(html) {
    if (!document.getElementById("pdp-style")) {
      const s = document.createElement("style");
      s.id = "pdp-style";
      s.textContent = css;
      document.head.appendChild(s);
    }
    const o = document.createElement("div");
    o.className = "pdp-overlay";
    o.setAttribute("role", "dialog");
    o.setAttribute("aria-modal", "true");
    o.innerHTML = `<div class="pdp-card">${html}</div>`;
    document.body.appendChild(o);
    return o;
  }

  /* ---------- iPhone chưa cài vào màn hình chính ---------- */
  function iosInstallGuide() {
    if (document.querySelector(".pdp-overlay")) return;
    const o = overlay(`
      <div class="pdp-icon">📲</div>
      <div class="pdp-title">CÀI PICKDEE ĐỂ NHẬN THÔNG BÁO</div>
      <p class="pdp-text">${cfg.installText || "Trên iPhone, PickDee chỉ gửi được thông báo lịch học khi đã được thêm vào màn hình chính."}</p>
      <ol class="pdp-steps">
        <li><span class="pdp-num">1</span><span>Bấm nút <b>Chia sẻ</b> <b>⬆︎</b> ở thanh dưới của Safari</span></li>
        <li><span class="pdp-num">2</span><span>Chọn <b>“Thêm vào MH chính”</b> rồi bấm <b>Thêm</b></span></li>
        <li><span class="pdp-num">3</span><span>Mở <b>PickDee</b> từ màn hình chính và bấm <b>Bật thông báo</b></span></li>
      </ol>
      <button type="button" class="pdp-btn">ĐÃ HIỂU</button>
      <div class="pdp-note">Hướng dẫn này sẽ hiện mỗi lần vào trang cho tới khi PickDee được cài.</div>`);
    o.querySelector(".pdp-btn").addEventListener("click", () => o.remove());
  }

  /* Nút trong chuông (notifications.js) đang ghi "KHÔNG HỖ TRỢ PUSH" và bị khoá trên iPhone chưa cài
     → đổi thành nút mở hướng dẫn cài. */
  function patchBellButtonForIOS() {
    document.addEventListener("click", e => {
      const b = e.target.closest("#pickdeeEnablePushButton");
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      iosInstallGuide();
    }, true);
    setInterval(() => {
      const b = document.getElementById("pickdeeEnablePushButton");
      if (b && !/CÀI PICKDEE/.test(b.textContent)) {
        b.disabled = false;
        b.textContent = "📲 CÀI PICKDEE ĐỂ NHẬN THÔNG BÁO";
        const st = document.getElementById("pickdeePushStatus");
        if (st) st.textContent = "iPhone cần thêm PickDee vào màn hình chính để nhận thông báo.";
      }
    }, 800);
  }

  /* ---------- Mở trong Zalo / Facebook / Messenger (không nhận được thông báo) ---------- */
  function inAppGuide() {
    if (document.querySelector(".pdp-overlay")) return;
    const url = location.href;
    const chromeIntent = "intent://" + location.host + location.pathname + location.search + "#Intent;scheme=https;package=com.android.chrome;end";
    const o = overlay(`
      <div class="pdp-icon">🌐</div>
      <div class="pdp-title">MỞ PICKDEE BẰNG ${isIOS ? "SAFARI" : "CHROME"}</div>
      <p class="pdp-text">Bạn đang mở PickDee trong Zalo/Facebook. Trình duyệt này không nhận được thông báo lịch học. Hãy mở bằng ${isIOS ? "Safari" : "Chrome"} để dùng đầy đủ.</p>
      <ol class="pdp-steps">
        <li><span class="pdp-num">1</span><span>Bấm nút <b>⋯</b> hoặc <b>⋮</b> ở góc màn hình</span></li>
        <li><span class="pdp-num">2</span><span>Chọn <b>“Mở bằng trình duyệt”</b>${isIOS ? " / <b>“Mở trong Safari”</b>" : " / <b>“Mở bằng Chrome”</b>"}</span></li>
      </ol>
      ${isAndroid ? `<a class="pdp-btn" href="${chromeIntent}" style="display:flex;align-items:center;justify-content:center;text-decoration:none">🌐 MỞ BẰNG CHROME</a>` : ""}
      <button type="button" class="pdp-btn pdp-copy" style="margin-top:10px">📋 SAO CHÉP LINK</button>
      <button type="button" class="pdp-link">Để sau</button>`);
    o.querySelector(".pdp-copy").addEventListener("click", async e => {
      try { await navigator.clipboard.writeText(url); e.target.textContent = "✓ ĐÃ SAO CHÉP – dán vào trình duyệt"; }
      catch (err) { prompt("Sao chép link này và dán vào trình duyệt:", url); }
    });
    o.querySelector(".pdp-link").addEventListener("click", () => o.remove());
  }

  /* ---------- Android: nút cài app (hộp cài đặt có sẵn của Chrome) ---------- */
  let installEvent = null;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    installEvent = e;
    showInstallChip();
  });
  function showInstallChip() {
    if (standalone || !installEvent || document.getElementById("pdpInstall")) return;
    const b = document.createElement("button");
    b.id = "pdpInstall";
    b.type = "button";
    b.textContent = "📲 Cài app PickDee";
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(86px + env(safe-area-inset-bottom));z-index:9990;" +
      "padding:11px 18px;border-radius:999px;border:0;background:#d8ff45;color:#071523;font:inherit;font-size:14px;font-weight:900;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.45);cursor:pointer";
    b.addEventListener("click", async () => {
      if (!installEvent) return b.remove();
      installEvent.prompt();
      try { await installEvent.userChoice; } catch (e) {}
      installEvent = null;
      b.remove();
    });
    document.body.appendChild(b);
  }
  window.addEventListener("appinstalled", () => document.getElementById("pdpInstall")?.remove());

  /* ---------- Mời bật thông báo (không có "Để sau") ---------- */
  async function waitPushButton() {
    for (let i = 0; i < 100; i++) {
      const b = document.getElementById("pickdeeEnablePushButton");
      if (b) return b;
      await new Promise(r => setTimeout(r, 150));
    }
    return null;
  }

  async function hasSubscription() {
    try {
      if (Notification.permission !== "granted") return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && await reg.pushManager.getSubscription());
    } catch (e) { return false; }
  }

  const enabledText = b => /THÔNG BÁO ĐÃ BẬT/i.test(String(b?.textContent || ""));

  /* Bật xong → gửi 1 thông báo thử cho chính mình để thấy ngay là chạy */
  async function selfTest() {
    try {
      await new Promise(r => setTimeout(r, 1500));
      const sb = window.sb || window.PICKDEE_SUPABASE;
      if (sb?.rpc) await sb.rpc("pd_push_self_test");
    } catch (e) { /* không quan trọng */ }
  }

  async function pushPrompt() {
    if (Notification.permission === "denied") return promptDone(); // đã chặn trong trình duyệt → không làm kẹt người dùng
    const pushButton = await waitPushButton();
    if (!pushButton) return promptDone();
    await new Promise(r => setTimeout(r, 1500)); // để notifications.js kiểm tra trạng thái
    for (let i = 0; i < 60 && pushButton.disabled && !enabledText(pushButton); i++) await new Promise(r => setTimeout(r, 200));
    if (enabledText(pushButton) || await hasSubscription()) return promptDone();

    const o = overlay(`
      <div class="pdp-icon">🔔</div>
      <div class="pdp-title">BẬT THÔNG BÁO PICKDEE</div>
      <p class="pdp-text">${cfg.role === "Học viên"
        ? "Bật thông báo để không lỡ lịch học, nhắc buổi học, xác nhận thanh toán và tin nhắn từ Coach."
        : "PickDee tự giao học viên gần bạn qua thông báo này. Chưa bật thông báo = chưa được mời nhận học viên mới."}</p>
      <button type="button" class="pdp-btn">🔔 BẬT THÔNG BÁO</button>
      <div class="pdp-note">Khi trình duyệt hỏi, hãy chọn <b>Cho phép</b>.</div>`);
    const btn = o.querySelector(".pdp-btn");

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Đang bật thông báo...";
      if (pushButton.disabled) { try { await Notification.requestPermission(); } catch (e) {} pushButton.disabled = false; }
      pushButton.click(); // giữ thao tác bấm của người dùng để trình duyệt cho phép xin quyền
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 250));
        if (enabledText(pushButton) || await hasSubscription()) { o.remove(); promptDone(); selfTest(); return; }
        if (Notification.permission === "denied") break;
      }
      if (Notification.permission === "denied") {
        btn.disabled = false;
        btn.textContent = "ĐÃ HIỂU";
        o.querySelector(".pdp-text").textContent =
          "Trình duyệt đang chặn thông báo của PickDee. Vào Cài đặt trình duyệt → Thông báo → cho phép pickdee.vn để không lỡ lịch học.";
        btn.onclick = () => { o.remove(); promptDone(); };
        return;
      }
      btn.disabled = false;
      btn.textContent = "🔔 THỬ BẬT LẠI";
    });
  }

  function start() {
    if (inApp) { inAppGuide(); return promptDone(); }
    if (isIOS && !standalone) { patchBellButtonForIOS(); iosInstallGuide(); return promptDone(); }
    showInstallChip();
    if (cfg.mode === "ios-install") return promptDone();
    if (!pushSupported) return promptDone();
    pushPrompt().catch(() => promptDone());
  }

  /* Không đợi "load" (trang nặng trên điện thoại có thể rất lâu) */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(start, 600));
  else setTimeout(start, 600);

})();
