/* =========================================================
   PICKDEE — ĐĂNG NHẬP BẰNG FACE ID / TOUCH ID / VÂN TAY (passkey)
   - Trang đăng nhập: nút "Đăng nhập bằng Face ID" (máy đã bật).
   - Vào trang chính (admin / Coach / học viên / shop admin) mà máy chưa bật: hỏi "Bật Face ID?" (1 chạm),
     "Để sau" thì 14 ngày sau mới hỏi lại. Trang đăng nhập KHÔNG hỏi.
   - Trang Bảo mật (đổi mật khẩu): công tắc bật/tắt cho máy này + danh sách thiết bị đã bật.
   Server: Edge pickdee-passkey, bảng pd_passkeys (chỉ khoá công khai).
========================================================= */
(function () {
  const cfg = window.PICKDEE_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) return;

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const FN = cfg.SUPABASE_URL + "/functions/v1/pickdee-passkey";
  const HINT = "pd_faceid";            // máy này đã bật: { cid, uid, name }
  const LATER = "pd_faceid_later";     // { uid: thời điểm bấm "Để sau" }
  const LATER_MS = 14 * 864e5;

  /* ---------- Nhận diện thiết bị ---------- */
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const LABEL = isIOS ? "Face ID"
    : /Macintosh/.test(ua) ? "Touch ID"
    : /Android/.test(ua) ? "vân tay"
    : /Windows/.test(ua) ? "Windows Hello"
    : "Face ID";
  // Trình duyệt nhúng trong app (Telegram, Zalo, Facebook...): passkey thường bị iOS chặn → hướng dẫn mở Safari
  const STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const IN_APP = !STANDALONE && (/Telegram|Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\//i.test(ua) || (isIOS && !/Safari\//.test(ua)));
  function deviceName() {
    const dev = /iPad/.test(ua) || (isIOS && !/iPhone|iPod/.test(ua)) ? "iPad"
      : /iPhone|iPod/.test(ua) ? "iPhone"
      : /Android/.test(ua) ? "Điện thoại Android"
      : /Macintosh/.test(ua) ? "Máy Mac"
      : /Windows/.test(ua) ? "Máy Windows" : "Thiết bị";
    const app = window.matchMedia && matchMedia("(display-mode: standalone)").matches ? "app PickDee"
      : /CriOS|Chrome/.test(ua) && !/Edg/.test(ua) ? "Chrome"
      : /Safari/.test(ua) ? "Safari" : "trình duyệt";
    return dev + " · " + app;
  }

  let supportCache = null;
  function supported() {
    if (supportCache) return supportCache;
    supportCache = (async function () {
      try {
        return !!(window.PublicKeyCredential && window.isSecureContext &&
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch (_) { return false; }
    })();
    return supportCache;
  }

  /* ---------- Bộ nhớ máy ---------- */
  function hint() { try { return JSON.parse(localStorage.getItem(HINT) || "null"); } catch (_) { return null; } }
  function setHint(h) { try { h ? localStorage.setItem(HINT, JSON.stringify(h)) : localStorage.removeItem(HINT); } catch (_) {} }
  function laterFor(uid) {
    try { const m = JSON.parse(localStorage.getItem(LATER) || "{}"); return Date.now() - (m[uid] || 0) < LATER_MS; } catch (_) { return false; }
  }
  function setLater(uid) {
    try { const m = JSON.parse(localStorage.getItem(LATER) || "{}"); m[uid] = Date.now(); localStorage.setItem(LATER, JSON.stringify(m)); } catch (_) {}
  }
  function nameOf(user) {
    const md = user?.user_metadata || {};
    const n = String(md.full_name || md.name || "").trim();
    return n ? n.split(/\s+/).slice(-1)[0] : String(user?.email || "").split("@")[0];
  }

  /* ---------- base64url <-> ArrayBuffer ---------- */
  function b64(buf) {
    const a = new Uint8Array(buf); let s = "";
    for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(str) {
    let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s); const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a.buffer;
  }
  function createOpts(o) {
    return Object.assign({}, o, {
      challenge: unb64(o.challenge),
      user: Object.assign({}, o.user, { id: unb64(o.user.id) }),
      excludeCredentials: (o.excludeCredentials || []).map(function (c) { return Object.assign({}, c, { id: unb64(c.id) }); })
    });
  }
  function getOpts(o) {
    return Object.assign({}, o, {
      challenge: unb64(o.challenge),
      allowCredentials: (o.allowCredentials || []).map(function (c) { return Object.assign({}, c, { id: unb64(c.id) }); })
    });
  }
  function credJSON(c) {
    const r = c.response; const out = {
      id: c.id, rawId: b64(c.rawId), type: c.type,
      clientExtensionResults: c.getClientExtensionResults ? c.getClientExtensionResults() : {},
      authenticatorAttachment: c.authenticatorAttachment || undefined,
      response: { clientDataJSON: b64(r.clientDataJSON) }
    };
    if (r.attestationObject) {
      out.response.attestationObject = b64(r.attestationObject);
      out.response.transports = r.getTransports ? r.getTransports() : [];
    } else {
      out.response.authenticatorData = b64(r.authenticatorData);
      out.response.signature = b64(r.signature);
      if (r.userHandle) out.response.userHandle = b64(r.userHandle);
    }
    return out;
  }

  async function call(action, extra, token) {
    const res = await fetch(FN, {
      method: "POST",
      headers: Object.assign(
        { "Content-Type": "application/json", apikey: cfg.SUPABASE_PUBLISHABLE_KEY },
        token ? { Authorization: "Bearer " + token } : {}
      ),
      body: JSON.stringify(Object.assign({ action: action }, extra || {}))
    });
    const d = await res.json().catch(function () { return {}; });
    if (!d.ok) { const e = new Error(d.error || "server"); e.code = d.error || "server"; throw e; }
    return d;
  }

  function friendly(e) {
    const n = e && (e.name || e.code);
    if (n === "NotAllowedError" || n === "AbortError") return "Đã huỷ " + LABEL + ". Anh/chị bấm lại để thử lần nữa.";
    if (n === "InvalidStateError") return LABEL + " đã được bật trên máy này rồi.";
    if (n === "unknown_credential") return LABEL + " trên máy này đã bị tắt. Đăng nhập bằng mật khẩu rồi bật lại nhé.";
    if (n === "expired") return "Phiên " + LABEL + " hết hạn, anh/chị bấm lại nhé.";
    if (n === "origin") return LABEL + " chỉ dùng được trên pickdee.vn.";
    return "Chưa dùng được " + LABEL + ". Anh/chị đăng nhập bằng mật khẩu nhé.";
  }

  function forgetOnDevice(cid) {
    setHint(null);
    try {
      if (cid && PublicKeyCredential.signalUnknownCredential) {
        PublicKeyCredential.signalUnknownCredential({ rpId: location.hostname, credentialId: cid }).catch(function () {});
      }
    } catch (_) {}
  }

  /* ---------- Bật Face ID (cần đã đăng nhập) ----------
     iOS chỉ cho mở Face ID ngay trong lượt chạm → lấy sẵn options trước khi người dùng bấm. */
  function regPrep(token) {
    let p = call("reg-options", {}, token).then(function (d) { d.at = Date.now(); return d; });
    p.catch(function () {});
    return {
      async run(user) {
        let d = await p;
        if (Date.now() - d.at > 240000) { p = call("reg-options", {}, token); d = await p; }
        let cred;
        try {
          cred = await navigator.credentials.create({ publicKey: createOpts(d.options) });
        } catch (e) {
          if (e && e.name === "InvalidStateError") { // máy đã có passkey PickDee của tài khoản này
            setHint({ cid: (hint() || {}).cid || null, uid: user.id, name: nameOf(user) });
            return true;
          }
          p = call("reg-options", {}, token).then(function (x) { x.at = Date.now(); return x; }); p.catch(function () {});
          throw e;
        }
        const v = await call("reg-verify", { cid: d.cid, response: credJSON(cred), device: deviceName() }, token);
        setHint({ cid: v.credential_id, uid: user.id, name: nameOf(user) });
        return true;
      }
    };
  }

  /* ---------- Đăng nhập bằng Face ID ---------- */
  let authP = null;
  function authPrep() {
    authP = call("auth-options").then(function (d) { d.at = Date.now(); return d; });
    authP.catch(function () {});
  }
  async function login() {
    if (!authP) authPrep();
    let d = await authP;
    if (Date.now() - d.at > 240000) { authPrep(); d = await authP; }
    authPrep(); // thử thách mới cho lần bấm sau (mỗi thử thách dùng 1 lần)
    const cred = await navigator.credentials.get({ publicKey: getOpts(d.options) });
    let v;
    try {
      v = await call("auth-verify", { cid: d.cid, response: credJSON(cred) });
    } catch (e) {
      if (e.code === "unknown_credential") forgetOnDevice(cred.id);
      throw e;
    }
    const { data, error } = await sb.auth.setSession(v.session);
    if (error || !data?.user) throw error || new Error("session");
    setHint({ cid: cred.id, uid: data.user.id, name: nameOf(data.user) });
    return data.user;
  }

  /* ---------- Giao diện ---------- */
  const ICON = '<svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 15V9a5 5 0 0 1 5-5h6M33 4h6a5 5 0 0 1 5 5v6M44 33v6a5 5 0 0 1-5 5h-6M15 44H9a5 5 0 0 1-5-5v-6"/>' +
    '<path d="M16 17v4M32 17v4M24 17v10h-2.5M17.5 33.5c3.8 3 9.2 3 13 0"/></svg>';

  (function css() {
    const st = document.createElement("style");
    st.textContent = `
      .pdf-box{margin:0 0 6px;text-align:center}
      .pdf-hello{margin:0 0 12px;color:#dfe8f2;font-size:15px;font-weight:700}
      .pdf-btn{all:unset;box-sizing:border-box;width:100%;min-height:56px;padding:0 16px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:12px;background:#b9ff18;color:#07101b;font:inherit;font-size:16px;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s}
      .pdf-btn:active{transform:scale(.98)}
      .pdf-btn[disabled]{opacity:.6;cursor:wait}
      .pdf-btn .pdf-ic{width:26px;height:26px;flex:0 0 26px}
      .pdf-ghost{all:unset;box-sizing:border-box;width:100%;min-height:46px;display:flex;align-items:center;justify-content:center;border-radius:12px;color:#aab6c5;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
      .pdf-or{display:flex;align-items:center;gap:10px;margin:18px 0 0;color:#6f8096;font-size:12px;font-weight:700}
      .pdf-or::before,.pdf-or::after{content:"";flex:1;height:1px;background:#26364b}
      .pdf-msg{min-height:18px;margin-top:8px;font-size:13px;line-height:1.4;color:#ffb4b4}
      .pdf-msg.ok{color:#b9ff18}
      .pdf-card .pdf-msg:empty{display:none}
      .pdf-devs[hidden]{display:none!important}
      .pdf-sheet-bg{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(2,8,18,.62);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:pdfFade .18s}
      .pdf-sheet{width:min(440px,100%);margin:0 8px max(8px,env(safe-area-inset-bottom));padding:26px 20px 14px;border-radius:22px;background:#0e1b2d;border:1px solid #26364b;color:#fff;text-align:center;font-family:Inter,system-ui,-apple-system,sans-serif;animation:pdfUp .22s ease-out}
      @media(min-width:701px){.pdf-sheet-bg{align-items:center}}
      .pdf-sheet .pdf-big{width:64px;height:64px;margin:0 auto 14px;color:#b9ff18}
      .pdf-sheet h3{margin:0 0 8px;font-size:20px;line-height:1.3}
      .pdf-sheet p{margin:0 0 18px;color:#aab6c5;font-size:14px;line-height:1.5}
      @keyframes pdfFade{from{opacity:0}}
      @keyframes pdfUp{from{transform:translateY(30px);opacity:0}}
      .pdf-card{margin:14px 0 22px;padding:16px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);text-align:left}
      .pdf-row{display:flex;align-items:center;gap:12px}
      .pdf-row .pdf-ic{width:34px;height:34px;flex:0 0 34px;color:#b9ff18}
      .pdf-tt{flex:1;min-width:0}
      .pdf-tt b{display:block;font-size:15px}
      .pdf-tt small{display:block;margin-top:3px;color:rgba(255,255,255,.62);font-size:12px;line-height:1.4}
      .pdf-sw{all:unset;position:relative;flex:0 0 52px;width:52px;height:32px;border-radius:999px;background:rgba(255,255,255,.2);cursor:pointer;transition:background .2s}
      .pdf-sw::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .2s}
      .pdf-sw[aria-checked="true"]{background:#34c759}
      .pdf-sw[aria-checked="true"]::after{transform:translateX(20px)}
      .pdf-sw[disabled]{opacity:.45;cursor:not-allowed}
      .pdf-sw.pdf-busy{opacity:.6;cursor:wait}
      .pdf-devs{margin:12px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,255,255,.1)}
      .pdf-devs div.pdf-h{margin-bottom:6px;color:rgba(255,255,255,.55);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
      .pdf-dev{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px}
      .pdf-dev span{flex:1;min-width:0}
      .pdf-dev small{color:rgba(255,255,255,.5)}
      .pdf-dev button{all:unset;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,159,159,.4);color:#ff9f9f;font-size:12px;font-weight:800;cursor:pointer}
    `;
    document.head.appendChild(st);
  })();

  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  const esc = function (s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* Trang đăng nhập: passkey nằm trong iCloud Keychain/Google nên hiện cả ở trình duyệt chưa lưu dấu "đã bật"
     (vd mở link từ Telegram); có dấu thì chào tên. */
  async function mountLogin(host, onUser) {
    const h = hint();
    if (!host || !(IN_APP || await supported())) return;
    authPrep();
    const box = el(
      '<div class="pdf-box">' +
        (h ? '<p class="pdf-hello">Chào ' + esc(h.name || "bạn") + ' 👋</p>' : '') +
        '<button type="button" class="pdf-btn" id="pdFaceIdLoginBtn"><span class="pdf-ic">' + ICON + '</span>Đăng nhập bằng ' + LABEL + '</button>' +
        '<div class="pdf-msg" role="status"></div>' +
        '<div class="pdf-or">hoặc dùng mật khẩu</div>' +
      '</div>'
    );
    host.appendChild(box);
    const btn = box.querySelector(".pdf-btn"), msg = box.querySelector(".pdf-msg");
    btn.addEventListener("click", async function () {
      btn.disabled = true; msg.className = "pdf-msg"; msg.textContent = "";
      try {
        const user = await login();
        msg.className = "pdf-msg ok"; msg.textContent = "✓ Xác thực " + LABEL + " thành công. Đang mở tài khoản...";
        await onUser(user);
      } catch (e) {
        console.warn("PickDee Face ID:", e);
        if (IN_APP && !(e && typeof e.code === "string")) { // lỗi trình duyệt (DOMException có code số), không phải lỗi máy chủ
          msg.innerHTML = LABEL + ' không chạy trong trình duyệt của ứng dụng này. ' +
            (isIOS ? '<a href="x-safari-' + esc(location.href) + '" style="color:#b9ff18;font-weight:800">Mở bằng Safari</a> (hoặc bấm biểu tượng la bàn 🧭 ở góc dưới) rồi đăng nhập lại.'
                   : 'Bấm ⋮ → "Mở bằng trình duyệt" rồi đăng nhập lại.');
          btn.disabled = false;
          return;
        }
        msg.textContent = e && e.message && !e.name && !e.code ? e.message : friendly(e);
        if (e && e.code === "unknown_credential") { const hh = box.querySelector(".pdf-hello"); if (hh) hh.remove(); btn.remove(); }
        btn.disabled = false;
      }
    });
  }

  /* Hỏi bật Face ID (Promise xong khi người dùng chọn) */
  async function offer(user, session) {
    try {
      if (IN_APP || !user || !session?.access_token || !(await supported())) return;
      const h = hint();
      if ((h && h.uid === user.id) || laterFor(user.id)) return;
    } catch (_) { return; }
    const prep = regPrep(session.access_token);
    return new Promise(function (done) {
      const bg = el(
        '<div class="pdf-sheet-bg" role="dialog" aria-modal="true" aria-labelledby="pdfSheetT">' +
          '<div class="pdf-sheet">' +
            '<div class="pdf-big">' + ICON + '</div>' +
            '<h3 id="pdfSheetT">Đăng nhập nhanh bằng ' + LABEL + '?</h3>' +
            '<p>Lần sau chỉ cần nhìn vào điện thoại là vào PickDee, không cần gõ mật khẩu. Bật/tắt lúc nào cũng được ở mục <b>Bảo mật</b>.</p>' +
            '<button type="button" class="pdf-btn" data-on><span class="pdf-ic">' + ICON + '</span>Bật ' + LABEL + '</button>' +
            '<div class="pdf-msg" role="status"></div>' +
            '<button type="button" class="pdf-ghost" data-later>Để sau</button>' +
          '</div>' +
        '</div>'
      );
      document.body.appendChild(bg);
      const on = bg.querySelector("[data-on]"), later = bg.querySelector("[data-later]"), msg = bg.querySelector(".pdf-msg");
      const close = function () { bg.remove(); done(); };
      later.addEventListener("click", function () { setLater(user.id); close(); });
      on.addEventListener("click", async function () {
        on.disabled = true; msg.className = "pdf-msg"; msg.textContent = "";
        try {
          await prep.run(user);
          msg.className = "pdf-msg ok"; msg.textContent = "✓ Đã bật " + LABEL + ". Lần sau bấm " + LABEL + " là vào.";
          later.style.visibility = "hidden";
          setTimeout(close, 1200);
        } catch (e) {
          console.warn("PickDee Face ID:", e);
          msg.textContent = friendly(e);
          on.disabled = false;
        }
      });
    });
  }

  /* Trang Bảo mật: công tắc bật/tắt + thiết bị đã bật */
  async function mountSettings(host) {
    if (!host) return;
    const { data: s } = await sb.auth.getSession();
    const user = s?.session?.user;
    if (!user) return;
    const ok = await supported();
    const card = el(
      '<div class="pdf-card">' +
        '<div class="pdf-row">' +
          '<span class="pdf-ic">' + ICON + '</span>' +
          '<div class="pdf-tt"><b>Đăng nhập bằng ' + LABEL + '</b><small></small></div>' +
          '<button type="button" class="pdf-sw" role="switch" aria-checked="false" aria-label="Đăng nhập bằng ' + LABEL + '"></button>' +
        '</div>' +
        '<div class="pdf-msg" role="status"></div>' +
        '<div class="pdf-devs" hidden></div>' +
      '</div>'
    );
    host.appendChild(card);
    const sw = card.querySelector(".pdf-sw"), sub = card.querySelector("small"), msg = card.querySelector(".pdf-msg"), devs = card.querySelector(".pdf-devs");
    let prep = null;

    async function refresh() {
      const { data: rows } = await sb.from("pd_passkeys").select("id, credential_id, device_label, created_at, last_used_at").order("created_at");
      const list = rows || [];
      let h = hint();
      if (h && h.uid === user.id && h.cid && !list.some(function (r) { return r.credential_id === h.cid; })) { setHint(null); h = null; }
      const here = !!(h && h.uid === user.id);
      sw.setAttribute("aria-checked", here ? "true" : "false");
      sub.textContent = !ok
        ? (isIOS ? "Mở pickdee.vn bằng Safari (hoặc app PickDee) để dùng " + LABEL + "." : "Trình duyệt này chưa hỗ trợ " + LABEL + ".")
        : here ? "Đang bật trên máy này. Lần sau bấm " + LABEL + " ở trang đăng nhập là vào."
        : "Mở PickDee bằng khuôn mặt, không cần gõ mật khẩu.";
      sw.disabled = !ok;
      const others = list.filter(function (r) { return !(here && h.cid && r.credential_id === h.cid); });
      devs.hidden = !others.length;
      devs.innerHTML = others.length ? '<div class="pdf-h">' + (here ? "Thiết bị khác đã bật" : "Thiết bị đã bật") + "</div>" + others.map(function (r) {
        const t = r.last_used_at || r.created_at;
        return '<div class="pdf-dev"><span>📱 ' + esc(r.device_label || "Thiết bị") + ' <small>· dùng ' + new Date(t).toLocaleDateString("vi-VN") + '</small></span><button type="button" data-del="' + r.id + '">Gỡ</button></div>';
      }).join("") : "";
      if (ok && !here && !prep) prep = regPrep(s.session.access_token);
    }

    devs.addEventListener("click", async function (ev) {
      const b = ev.target.closest("[data-del]");
      if (!b) return;
      if (!confirm("Gỡ " + LABEL + " khỏi thiết bị này? Thiết bị đó sẽ phải đăng nhập bằng mật khẩu.")) return;
      b.disabled = true;
      await sb.from("pd_passkeys").delete().eq("id", Number(b.dataset.del));
      refresh();
    });

    sw.addEventListener("click", async function () {
      if (sw.disabled || sw.classList.contains("pdf-busy")) return;
      msg.className = "pdf-msg"; msg.textContent = "";
      const on = sw.getAttribute("aria-checked") === "true";
      sw.classList.add("pdf-busy");
      try {
        if (!on) {
          sw.setAttribute("aria-checked", "true"); // phản hồi ngay, lỗi thì trả lại
          await (prep || regPrep(s.session.access_token)).run(user);
          prep = null;
          msg.className = "pdf-msg ok"; msg.textContent = "✓ Đã bật " + LABEL + " cho máy này.";
        } else {
          const h = hint();
          if (h && h.cid) await sb.from("pd_passkeys").delete().eq("credential_id", h.cid);
          forgetOnDevice(h && h.cid);
          prep = null;
          msg.className = "pdf-msg ok"; msg.textContent = "Đã tắt " + LABEL + " trên máy này.";
        }
      } catch (e) {
        console.warn("PickDee Face ID:", e);
        msg.textContent = friendly(e);
        prep = null;
      }
      sw.classList.remove("pdf-busy");
      await refresh();
    });

    await refresh();
  }

  /* Trong app (trang chính): đã đăng nhập, máy hỗ trợ, chưa bật → mời bật, đợi trang hiện xong */
  async function offerInApp(delayMs) {
    await new Promise(function (r) { setTimeout(r, delayMs == null ? 1500 : delayMs); });
    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session, user = session?.user;
      if (!user) return;
      const md = user.user_metadata || {};
      if (md.must_change_password === true || md.must_change_password === "true") return; // đang phải đổi mật khẩu tạm
      if (document.querySelector(".pdf-sheet-bg")) return;
      // Đang hiện màn bật thông báo/cài app (pd-push-prompt.js) → đợi xong mới mời Face ID
      if (window.PDPushPromptDone) await Promise.race([window.PDPushPromptDone, new Promise(function (r) { setTimeout(r, 30000); })]);
      for (let i = 0; i < 600 && document.querySelector(".pdp-overlay"); i++) await new Promise(function (r) { setTimeout(r, 500); });
      if (document.querySelector(".pdp-overlay")) return;
      await offer(user, session);
    } catch (e) { console.warn("PickDee Face ID:", e); }
  }

  window.PDFaceID = { label: LABEL, supported: supported, mountLogin: mountLogin, offer: offer, offerInApp: offerInApp, mountSettings: mountSettings };
})();
