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
  let overlay = null, watching = false;

  const css = `
  #pdCoachGate{position:fixed;inset:0;z-index:999990;overflow:auto;padding:20px 16px calc(24px + env(safe-area-inset-bottom));
    background:rgba(3,10,20,.94);backdrop-filter:blur(6px);color:#fff;font-family:Arial,Helvetica,sans-serif}
  #pdCoachGate .c{max-width:440px;margin:6vh auto 0;padding:22px 18px;border-radius:22px;background:linear-gradient(160deg,#0f2747,#0a1a30);border:1px solid rgba(216,255,69,.35)}
  #pdCoachGate h2{margin:0 0 6px;font-size:20px;color:#d8ff45}
  #pdCoachGate p{margin:0 0 14px;font-size:14px;line-height:1.55;color:rgba(255,255,255,.82)}
  #pdCoachGate .it{display:flex;align-items:center;gap:10px;padding:11px 12px;margin-bottom:8px;border-radius:12px;background:rgba(255,255,255,.06);font-size:14px}
  #pdCoachGate .it.ok{opacity:.6}
  #pdCoachGate .ic{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:13px;background:rgba(255,138,138,.2);color:#ff8a8a}
  #pdCoachGate .it.ok .ic{background:#d8ff45;color:#071523}
  #pdCoachGate .it span.t{flex:1}
  #pdCoachGate .go{flex:none;border:0;border-radius:10px;background:#d8ff45;color:#071523;font-weight:900;font-size:13px;padding:9px 12px;cursor:pointer}
  #pdCoachGate .hint{margin-top:10px;font-size:12px;line-height:1.5;color:rgba(255,255,255,.6)}
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
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
    overlay.style.display = "block";
    overlay.innerHTML = '<div class="c"><h2>🏓 Hoàn tất hồ sơ để bắt đầu dạy</h2>'
      + '<p>PickDee chỉ giới thiệu và giao học viên cho Coach có hồ sơ đầy đủ. Bạn hoàn tất các mục còn thiếu bên dưới — xong là dùng được ngay.</p>'
      + ORDER.map(k => {
        const bad = missing.includes(k), it = ITEMS[k];
        return '<div class="it' + (bad ? "" : " ok") + '"><span class="ic">' + (bad ? "!" : "✓") + '</span><span class="t">' + it.t + '</span>'
          + (bad ? '<button class="go" type="button" data-a="' + it.a + '">' + (it.a === "courts" ? "Khai" : it.a === "push" ? "Bật" : "Điền") + '</button>' : '') + '</div>';
      }).join("")
      + (missing.includes("push") && ios ? '<div class="hint">iPhone: bấm nút Chia sẻ ⬆️ → <b>Thêm vào MH chính</b>, mở PickDee từ màn hình chính rồi bấm <b>Bật</b>.</div>' : '')
      + '<a class="out" href="#" id="pdGateOut">Đăng xuất</a></div>';
    overlay.querySelectorAll("[data-a]").forEach(b => b.onclick = () => act(b.dataset.a, b));
    overlay.querySelector("#pdGateOut").onclick = async e => { e.preventDefault(); try { await window.sb.auth.signOut(); } catch (x) {} location.href = "/login"; };
  }

  function act(a, btn) {
    if (a === "courts") { location.href = "/coach-teach-courts"; return; }
    if (a === "profile") {
      overlay.style.display = "none";
      if (location.hash !== "#ho-so") location.hash = "#ho-so";
      setTimeout(() => {
        const b = document.getElementById("editCoachProfileBtn");
        if (b) b.click();
        const f = document.getElementById("coachProfileEditForm");
        if (f) f.scrollIntoView({ block: "start" });
        watchForm();
      }, 350);
      return;
    }
    if (a === "push") {
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
    if (!r || r.complete) { if (overlay) overlay.style.display = "none"; return; }
    const missing = Array.isArray(r.missing) ? r.missing : [];
    if (!onHome) { location.replace("/coach"); return; }
    render(missing);
  }

  window.PDCoachGate = { check };
  const start = () => setTimeout(check, 600);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !watching) check(); });
})();
