/* =========================================================
   PICKDEE – Coach phải HOÀN THIỆN HỒ SƠ mới được làm việc
   - /coach: màn "Hoàn tất hồ sơ" che trang (chỉ còn nút đi hoàn tất từng mục)
   - Trang làm việc khác của Coach: chưa đủ → về /coach
   Thiếu gì do server quyết (RPC get_my_coach_readiness → pd_coach_missing).
========================================================= */
(function () {
  if (window.__pdCoachGate) return;
  window.__pdCoachGate = true;

  const onHome = /^\/coach(\.html)?\/?$/.test(location.pathname);
  const ITEMS = {
    avatar: { t: "Ảnh đại diện", a: "profile" },
    phone: { t: "Số điện thoại", a: "profile" },
    bio: { t: "Giới thiệu bản thân (ít nhất 20 ký tự)", a: "profile" },
    specialties: { t: "Chuyên môn giảng dạy", a: "profile" },
    teach_courts: { t: "Nơi dạy + ngày dạy", a: "courts" },
    push: { t: "Bật thông báo trên điện thoại", a: "push" }
  };
  const ORDER = ["teach_courts", "bio", "specialties", "avatar", "phone", "push"];
  let overlay = null, watching = false, gated = false;
  /* Thông báo chỉ bật được ở Safari/Chrome thật; iPhone phải thêm vào MH chính trước */
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const standalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  const inApp = /Zalo|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|TikTok|musical_ly|; wv\)/i.test(ua);
  const needInstall = !inApp && isIOS && !standalone;

  const css = `
  #pdCoachGate{position:fixed;inset:0;z-index:999990;overflow:auto;padding:20px 16px calc(96px + env(safe-area-inset-bottom));
    background:rgba(8,8,8,.94);backdrop-filter:blur(6px);color:#fff;font-family:inherit}
  #pdCoachGate .c{max-width:440px;margin:6vh auto 0;padding:22px 18px;border-radius:22px;background:linear-gradient(160deg,#1e1e1e,#141414);border:1px solid rgba(255,201,52,.35)}
  #pdCoachGate h2{margin:0 0 6px;font-size:20px;color:#ffc934}
  #pdCoachGate p{margin:0 0 14px;font-size:14px;line-height:1.55;color:rgba(255,255,255,.82)}
  #pdCoachGate .it{display:flex;align-items:center;gap:10px;padding:11px 12px;margin-bottom:8px;border-radius:12px;background:rgba(255,255,255,.06);font-size:14px}
  #pdCoachGate .it.ok{opacity:.6}
  #pdCoachGate .ic{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:13px;background:rgba(255,138,138,.2);color:#ff8a8a}
  #pdCoachGate .it.ok .ic{background:#ffc934;color:#0f0f0f}
  #pdCoachGate .it span.t{flex:1}
  #pdCoachGate .go{flex:none;border:0;border-radius:10px;background:#ffc934;color:#0f0f0f;font-weight:900;font-size:13px;padding:9px 12px;cursor:pointer;font-family:inherit}
  #pdCoachGate .hint{margin-top:10px;padding:12px;border-radius:12px;background:rgba(255,201,52,.08);border:1px solid rgba(255,201,52,.25);font-size:13px;line-height:1.55;color:rgba(255,255,255,.85);transition:background .3s,border-color .3s}
  #pdCoachGate .hint b{color:#ffc934}
  #pdCoachGate .hint.flash{background:rgba(255,201,52,.2);border-color:#ffc934}
  #pdCoachGate .hint .row{display:flex;gap:8px;margin-top:10px}
  #pdCoachGate .hint .row>*{flex:1;min-height:40px;border:0;border-radius:10px;background:#ffc934;color:#0f0f0f;font:inherit;font-size:13px;font-weight:900;display:grid;place-items:center;text-decoration:none;cursor:pointer}
  html.pd-gate-edit .pdp-overlay{display:none !important}
  #pdCoachGate .out{display:block;margin-top:14px;text-align:center;color:rgba(255,255,255,.55);font-size:13px}`;

  async function readiness() {
    if (!window.sb) return null;
    const s = await window.sb.auth.getSession();
    if (!s.data || !s.data.session) return null;
    const r = await window.sb.rpc("get_my_coach_readiness");
    return r.error ? null : r.data; // null = không phải Coach
  }

  function render(missing) {
    if (!overlay) {
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      overlay = document.createElement("div"); overlay.id = "pdCoachGate"; document.body.appendChild(overlay);
    }
    gated = true;
    const pushHelp = missing.includes("push") && (inApp || needInstall);
    overlay.style.display = "block";
    overlay.innerHTML = '<div class="c"><h2>Hoàn tất hồ sơ để bắt đầu dạy</h2>'
      + '<p>PickDee chỉ giới thiệu và giao học viên cho Coach có hồ sơ đầy đủ. Bạn hoàn tất các mục còn thiếu bên dưới — xong là dùng được ngay.</p>'
      + ORDER.map(k => {
        const bad = missing.includes(k), it = ITEMS[k];
        return '<div class="it' + (bad ? "" : " ok") + '"><span class="ic">' + (bad ? "!" : "✓") + '</span><span class="t">' + it.t + '</span>'
          + (bad ? '<button class="go" type="button" data-k="' + k + '" data-a="' + it.a + '">' + (it.a === "courts" ? "Khai" : it.a === "push" ? (pushHelp ? "Cách bật" : "Bật") : "Điền") + '</button>' : '') + '</div>';
      }).join("")
      + (pushHelp && inApp ? '<div class="hint" id="pdGateHint"><b>Bạn đang mở trong Zalo/Facebook</b>, ở đây không bật được thông báo. Bấm <b>⋯</b> ở góc màn hình → <b>' + (isIOS ? "Mở trong Safari" : "Mở bằng trình duyệt") + '</b>, đăng nhập rồi bấm <b>Bật</b>.'
          + '<div class="row">' + (isAndroid ? '<a href="intent://' + location.host + '/coach#Intent;scheme=https;package=com.android.chrome;end">Mở bằng Chrome</a>' : '') + '<button type="button" id="pdGateCopy">Sao chép link</button></div></div>' : '')
      + (pushHelp && needInstall ? '<div class="hint" id="pdGateHint"><b>iPhone:</b> bấm nút <b>Chia sẻ ⬆︎</b> ở thanh dưới Safari → <b>Thêm vào MH chính</b> → mở <b>PickDee</b> từ màn hình chính, đăng nhập lại rồi bấm <b>Bật</b>.</div>' : '')
      + '<a class="out" href="#" id="pdGateOut">Đăng xuất</a></div>';
    overlay.querySelectorAll("[data-a]").forEach(b => b.onclick = () => act(b.dataset.a, b, b.dataset.k));
    const cp = overlay.querySelector("#pdGateCopy");
    if (cp) cp.onclick = async () => {
      const url = location.origin + "/coach";
      try { await navigator.clipboard.writeText(url); cp.textContent = "Đã sao chép"; }
      catch (x) { prompt("Sao chép link này, dán vào Safari/Chrome:", url); }
    };
    overlay.querySelector("#pdGateOut").onclick = async e => { e.preventDefault(); try { await window.sb.auth.signOut(); } catch (x) {} location.href = "/login"; };
  }

  const FIELD = { bio: "coachEditBio", specialties: "coachEditSpecialties", phone: "coachEditPhone" };
  function act(a, btn, k) {
    if (a === "courts") { location.href = "/coach-teach-courts"; return; }
    if (a === "profile") {
      overlay.style.display = "none";
      document.documentElement.classList.add("pd-gate-edit"); // màn mời bật thông báo (pd-push-prompt) không che form hồ sơ
      if (location.hash !== "#ho-so") location.hash = "#ho-so";
      setTimeout(() => {
        const b = document.getElementById("editCoachProfileBtn");
        if (b) b.click();
        const f = document.getElementById("coachProfileEditForm");
        const el = document.getElementById(FIELD[k]); // nhảy thẳng tới ô còn thiếu
        if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
        else if (f) f.scrollIntoView({ block: "start" });
        watchForm();
      }, 700); // chờ pd-launcher mở mục "Hồ sơ Coach" (hashchange)
      return;
    }
    if (a === "push") {
      const hint = overlay.querySelector("#pdGateHint");
      if (hint) { // Zalo/FB hoặc iPhone chưa cài: không bật được ở đây → chỉ hướng dẫn
        hint.scrollIntoView({ block: "center", behavior: "smooth" });
        hint.classList.remove("flash"); void hint.offsetWidth; hint.classList.add("flash");
        setTimeout(() => hint.classList.remove("flash"), 1200);
        return;
      }
      const pb = document.getElementById("pickdeeEnablePushButton");
      if (!pb) { btn.textContent = "Mở lại trang"; return; }
      btn.disabled = true; btn.textContent = "Đang bật…";
      pb.click();
      let n = 0;
      const t = setInterval(async () => {
        n++;
        const r = await readiness();
        if (r && !r.missing.includes("push")) { clearInterval(t); check(); }
        else if (n > 15) { clearInterval(t); btn.disabled = false; btn.textContent = "Thử lại"; }
      }, 1000);
    }
  }

  /* Đóng form sửa hồ sơ (lưu/huỷ) → kiểm tra lại, còn thiếu thì hiện lại màn chặn */
  function watchForm() {
    if (watching) return; watching = true;
    let opened = false, n = 0; // form mở chậm (tải danh sách sân) → chờ mở hẳn rồi mới theo dõi lúc đóng
    const t = setInterval(() => {
      const f = document.getElementById("coachProfileEditForm");
      const shown = !!f && getComputedStyle(f).display !== "none";
      if (shown) opened = true;
      if ((opened && !shown) || (!opened && ++n > 15)) { clearInterval(t); watching = false; setTimeout(check, 800); }
    }, 500);
  }

  async function check() {
    const r = await readiness();
    if (!r || r.complete) {
      if (overlay) overlay.style.display = "none";
      document.documentElement.classList.remove("pd-gate-edit");
      // vừa hoàn tất qua màn này → bỏ màn mời bật thông báo cũ còn nằm dưới
      if (r && gated) document.querySelectorAll(".pdp-overlay").forEach(o => { if (/BẬT THÔNG BÁO PICKDEE/.test(o.textContent)) o.remove(); });
      gated = false;
      return;
    }
    const missing = Array.isArray(r.missing) ? r.missing : [];
    if (!onHome) { location.replace("/coach"); return; }
    render(missing);
  }

  window.PDCoachGate = { check };
  const start = () => setTimeout(check, 600);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !watching) check(); });
})();
