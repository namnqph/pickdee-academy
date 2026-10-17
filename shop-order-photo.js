/* PickDee Shop — Tạo đơn từ ảnh chụp chat (Zalo / TikTok / Facebook)
   1. Điện thoại tự đọc chữ trong ảnh (tesseract.js, tải lần đầu ~3MB rồi trình duyệt nhớ). Ảnh không gửi đi đâu.
   2. Che SĐT thành [SĐT1], [SĐT2]... (SĐT giữ trên máy), gửi chữ cho Edge shop-order-parse (Gemini free) tách đơn.
   3. Trả kết quả + SĐT thật để trang Tạo đơn tự điền.
   Dùng: const r = await PDOrderPhoto.run(files, msg => ...); */
(function () {
  "use strict";

  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const HOTLINE = "0926629966";
  let workerP = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.Tesseract) return ok();
      const s = document.createElement("script");
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error("Không tải được bộ đọc chữ (kiểm tra mạng).")); };
      document.head.appendChild(s);
    });
  }

  async function worker(progress) {
    if (!workerP) {
      workerP = (async function () {
        await loadScript(TESS);
        return window.Tesseract.createWorker("vie", 1, {
          logger: function (m) {
            if (m && m.status === "loading language traineddata" && progress) progress("Đang tải bộ đọc tiếng Việt (lần đầu)…");
          }
        });
      })();
      workerP.catch(function () { workerP = null; });
    }
    return workerP;
  }

  // Thu nhỏ ảnh chụp màn hình (iPhone 1170px+) → đọc nhanh hơn, đủ nét
  function shrink(file) {
    return new Promise(function (ok, fail) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, 1100 / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("Không mở được ảnh.")); };
      img.src = url;
    });
  }

  function maskPhones(text) {
    const phones = [];
    const masked = text.replace(/(?:\+?84|0)(?:[\s.\-]?\d){9}/g, function (m) {
      const p = m.replace(/\D/g, "").replace(/^84/, "0");
      if (p === HOTLINE) return "[SĐT PickDee]";
      let i = phones.indexOf(p);
      if (i < 0) { phones.push(p); i = phones.length - 1; }
      return "[SĐT" + (i + 1) + "]";
    });
    return { masked: masked, phones: phones };
  }

  async function run(files, progress) {
    const list = Array.from(files || []).filter(function (f) { return /^image\//.test(f.type); }).slice(0, 4);
    if (!list.length) throw new Error("Chưa chọn ảnh.");
    const say = progress || function () {};
    say("Đang chuẩn bị bộ đọc chữ…");
    const w = await worker(say);
    const texts = [];
    for (let i = 0; i < list.length; i++) {
      say("Đang đọc chữ ảnh " + (i + 1) + "/" + list.length + "…");
      const canvas = await shrink(list[i]);
      const r = await w.recognize(canvas);
      texts.push((list.length > 1 ? "--- Ảnh " + (i + 1) + " ---\n" : "") + (r.data.text || ""));
    }
    const m = maskPhones(texts.join("\n"));
    say("AI đang tách tên, địa chỉ, sản phẩm…");
    const sess = (await window.sb.auth.getSession()).data.session;
    if (!sess) throw new Error("Phiên đăng nhập hết hạn, đăng nhập lại.");
    const res = await fetch(window.PICKDEE_CONFIG.SUPABASE_URL + "/functions/v1/shop-order-parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: window.PICKDEE_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + sess.access_token
      },
      body: JSON.stringify({ text: m.masked })
    });
    const d = await res.json().catch(function () { return {}; });
    if (!res.ok || !d.ok) throw new Error(d.error || "Không tách được đơn, thử lại.");
    const r = d.result;
    const idx = Number(r.phone_ref) - 1;
    r.phone = m.phones[idx] || (m.phones.length === 1 ? m.phones[0] : "");
    r.phones = m.phones;
    r.ocr_text = texts.join("\n");
    return r;
  }

  window.PDOrderPhoto = { run: run };
})();
