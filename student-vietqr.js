/* PickDee Academy — QR chuyển khoản ĐỘNG chuẩn VietQR (NAPAS): quét là app ngân hàng điền sẵn STK, số tiền, nội dung.
   Học viên không phải gõ → hết sai số tiền / quên nội dung (nguồn lỗi lớn nhất khi tự duyệt bill).
   Payload tự tạo (đã đối chiếu từng ký tự với img.vietqr.io), vẽ bằng qrcode-generator. Lỗi → giữ ảnh QR tĩnh cũ.
   Dùng: PDVietQR.render(imgEl, { bankName, accountNumber, amount, content }); */
(function () {
  "use strict";

  const LIB = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
  // Mã BIN NAPAS theo tên ngân hàng trong academy_payment_settings.bank_name
  const BIN = {
    techcombank: "970407", vietcombank: "970436", vietinbank: "970415", bidv: "970418", agribank: "970405",
    mbbank: "970422", mb: "970422", acb: "970416", tpbank: "970423", vpbank: "970432", sacombank: "970403",
    vib: "970441", hdbank: "970437", shb: "970443", msb: "970426", ocb: "970448", seabank: "970440",
    lpbank: "970449", eximbank: "970431", namabank: "970428"
  };

  function key(s) {
    return String(s || "").toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  }
  function tlv(id, v) { return id + String(v.length).padStart(2, "0") + v; }
  function crc16(s) {
    let c = 0xFFFF;
    for (let i = 0; i < s.length; i++) {
      c ^= s.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
    return c.toString(16).toUpperCase().padStart(4, "0");
  }

  function payload(bin, account, amount, content) {
    const info = String(content || "").replace(/[^A-Za-z0-9 ]/g, "").slice(0, 50);
    const s = tlv("00", "01") + tlv("01", "12")
      + tlv("38", tlv("00", "A000000727") + tlv("01", tlv("00", bin) + tlv("01", account)) + tlv("02", "QRIBFTTA"))
      + tlv("53", "704") + tlv("54", String(Math.round(amount))) + tlv("58", "VN")
      + (info ? tlv("62", tlv("08", info)) : "") + "6304";
    return s + crc16(s);
  }

  function loadLib() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (ok, fail) {
      const s = document.createElement("script");
      s.src = LIB;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error("qr lib")); };
      document.head.appendChild(s);
    });
  }

  async function render(img, o) {
    try {
      const bin = BIN[key(o.bankName)];
      const account = String(o.accountNumber || "").replace(/\D/g, "");
      if (!bin || !account || !(Number(o.amount) > 0)) return false;
      await loadLib();
      const qr = window.qrcode(0, "M");
      qr.addData(payload(bin, account, o.amount, o.content));
      qr.make();
      img.src = qr.createDataURL(8, 4);
      return true;
    } catch (e) {
      console.warn("VIETQR:", e);
      return false;
    }
  }

  window.PDVietQR = { render: render, payload: payload };
})();
