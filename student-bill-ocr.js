/* PickDee Academy — đọc chữ trên ảnh bill chuyển khoản ngay trên máy học viên (tesseract.js, tải lần đầu ~3MB).
   Trả về chữ của 2 lượt đọc (vie + eng — eng đọc chữ số chuẩn hơn) để Edge pickdee-payment-submit kiểm 6 điểm.
   Lỗi / PDF / quá lâu → trả "" (bill vẫn gửi, PickDee duyệt tay).
   Dùng: const text = await PDBillOcr.read(file, msg => ...); */
(function () {
  "use strict";

  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const workers = {};

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.Tesseract) return ok();
      const s = document.createElement("script");
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error("Không tải được bộ đọc chữ.")); };
      document.head.appendChild(s);
    });
  }

  function worker(lang) {
    if (!workers[lang]) {
      workers[lang] = loadScript(TESS).then(function () { return window.Tesseract.createWorker(lang, 1); });
      workers[lang].catch(function () { delete workers[lang]; });
    }
    return workers[lang];
  }

  // Ảnh chụp màn hình iPhone 1170px+ → thu về 1100px: đọc nhanh hơn, đủ nét
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

  async function readNow(file, say) {
    say("Đang đọc bill (lần đầu tải bộ đọc chữ, khoảng 10–20 giây)…");
    const canvas = await shrink(file);
    const vie = await (await worker("vie")).recognize(canvas);
    say("Đang kiểm tra số tiền, nội dung chuyển khoản…");
    const eng = await (await worker("eng")).recognize(canvas);
    return String(vie.data.text || "") + "\n--- eng ---\n" + String(eng.data.text || "");
  }

  async function read(file, progress) {
    const say = progress || function () {};
    if (!file || !/^image\//.test(file.type || "")) return "";
    try {
      return await Promise.race([
        readNow(file, say),
        new Promise(function (ok) { setTimeout(function () { ok(""); }, 60000); })
      ]);
    } catch (e) {
      console.warn("BILL OCR:", e);
      return "";
    }
  }

  window.PDBillOcr = { read: read };
})();
