/* shop-bill-amount.js — đọc SỐ TIỀN trên ảnh bill chuyển khoản của đơn Shop.
   Dùng lại bộ đọc chữ student-bill-ocr.js (tesseract.js, tải khi cần).
   Luôn để admin duyệt lại con số: OCR có thể đọc nhầm.

   Dùng:
     const r = await PDBillAmount.read(sb, path, msg => ...);
     // r = { amount: 1750000 | null, text: "..." }
*/
(function (global) {
  "use strict";

  var BUCKET = "shop-payment-proofs";

  /* Gợi ý: dòng nào có mấy chữ này thì nhiều khả năng là số tiền giao dịch */
  var HINTS = [
    "so tien",
    "sotien",
    "số tiền",
    "amount",
    "giao dich",
    "giao dịch",
    "chuyen tien",
    "chuyển tiền",
    "thanh toan",
    "thanh toán"
  ];

  function stripAccents(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function toNumber(raw) {
    return Number(String(raw).replace(/[^0-9]/g, "")) || 0;
  }

  /* Lấy mọi số trông như tiền trong 1 dòng */
  function numbersIn(line) {
    var out = [];
    var re = /\d{1,3}(?:[.,\s]\d{3})+|\d{5,9}/g;
    var m;
    while ((m = re.exec(line)) !== null) {
      var value = toNumber(m[0]);
      if (value >= 10000 && value <= 200000000) {
        out.push(value);
      }
    }
    return out;
  }

  /* Chọn số tiền từ chữ OCR.
     - Ưu tiên dòng có chữ "số tiền / amount / giao dịch"
     - Nếu biết tổng đơn: ưu tiên số không vượt quá tổng đơn
     - Cuối cùng lấy số lớn nhất còn lại */
  function pickAmount(text, orderTotal) {
    var lines = String(text || "").split(/\r?\n/);
    var hinted = [];
    var all = [];

    lines.forEach(function (line) {
      var plain = stripAccents(line);
      var isHint = HINTS.some(function (h) {
        return plain.indexOf(stripAccents(h)) >= 0;
      });
      numbersIn(line).forEach(function (value) {
        all.push(value);
        if (isHint) {
          hinted.push(value);
        }
      });
    });

    if (!all.length) return null;

    var total = Number(orderTotal || 0);

    function fit(list) {
      if (total <= 0) return list;
      return list.filter(function (v) {
        return v <= total;
      });
    }

    /* Thứ tự ưu tiên: dòng có chữ "số tiền" và không vượt tổng đơn → số bất
       kỳ không vượt tổng đơn → dòng có chữ "số tiền" → số lớn nhất.
       (Số lớn hơn tổng đơn thường là số tài khoản / mã GD bị đọc nhầm.) */
    var pool =
      [fit(hinted), fit(all), hinted, all].find(function (list) {
        return list.length > 0;
      }) || all;

    return pool.reduce(function (a, b) {
      return b > a ? b : a;
    }, 0) || null;
  }

  function loadOcr() {
    if (global.PDBillOcr) return Promise.resolve(global.PDBillOcr);
    return new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = "/student-bill-ocr.js?v=20261114-shop1";
      s.onload = function () {
        if (global.PDBillOcr) ok(global.PDBillOcr);
        else fail(new Error("Không tải được bộ đọc bill."));
      };
      s.onerror = function () {
        fail(new Error("Không tải được bộ đọc bill."));
      };
      document.head.appendChild(s);
    });
  }

  /* Tải ảnh bill từ storage rồi đọc số tiền. */
  async function read(sb, path, orderTotal, onProgress) {
    var say = typeof onProgress === "function" ? onProgress : function () {};

    if (!sb || !path) {
      throw new Error("Đơn này chưa có ảnh bill trên web.");
    }

    say("Đang tải ảnh bill...");

    var downloaded = await sb.storage.from(BUCKET).download(path);

    if (downloaded.error || !downloaded.data) {
      throw new Error("Không tải được ảnh bill.");
    }

    var name = String(path).split("/").pop() || "bill";
    var file = new File([downloaded.data], name, {
      type: downloaded.data.type || "image/jpeg"
    });

    var ocr = await loadOcr();

    say("Đang đọc chữ trên bill...");

    var text = await ocr.read(file, say);

    return {
      text: String(text || ""),
      amount: pickAmount(text, orderTotal)
    };
  }

  global.PDBillAmount = {
    read: read,
    pick: pickAmount
  };
})(window);
